import type { Env } from '../../../types';
import { arrayBufferToBase64 } from '../../../types';

// Passage data for titles and correct answers
const PASSAGES = [
    { id: 'the-great-lakes', title: 'The Great Lakes', correctAnswer: 3 },
    { id: 'american-folk-music', title: 'American Folk Music', correctAnswer: 0 },
    { id: 'new-scotland-yard', title: 'New Scotland Yard', correctAnswer: 1 },
    { id: 'animal-life', title: 'Animal Life', correctAnswer: 2 },
    { id: 'saying-it-with-flowers', title: 'Saying it with Flowers', correctAnswer: 0 },
    { id: 'tryggve-lie', title: 'Tryggve Lie', correctAnswer: 1 },
    { id: 'men-and-women', title: 'Men and Women', correctAnswer: 1 },
    { id: 'the-mayas', title: 'The Mayas', correctAnswer: 2 },
    { id: 'rock-posters', title: 'Rock Posters', correctAnswer: 2 },
    { id: 'therapy', title: 'Therapy', correctAnswer: 3 }
];

const ANSWER_CHOICES = ['A', 'B', 'C', 'D'];

interface SentenceStats {
    index: number;
    text: string;
    avgDwellMs: number;
    avgVisits: number;
    avgReadingOrder: number | null;
    timesRead: number; // how many participants read this sentence
}

interface ParticipantData {
    sessionId: string;
    email: string;
    timeSpentMs: number;
    wrongAttempts: number;
    isCorrect: boolean;
    latestAttemptScreenshot: string | null;
    latestGeminiResponse: string | null;
}

interface AnswerDistribution {
    choice: string;
    count: number;
    percentage: number;
    isCorrect: boolean;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    // Check for authorization token
    const authHeader = context.request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = atob(token);
        const [prefix, timestamp] = decoded.split(':');
        if (prefix !== 'admin') throw new Error('Invalid token');

        const tokenTime = parseInt(timestamp, 10);
        const now = Date.now();
        const fourHours = 4 * 60 * 60 * 1000;
        if (isNaN(tokenTime) || now - tokenTime > fourHours) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
    } catch (e) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const passageId = context.params.passageId as string;
    const passageIndex = PASSAGES.findIndex(p => p.id === passageId);

    if (passageIndex === -1) {
        return Response.json({ error: 'Passage not found' }, { status: 404 });
    }

    const passage = PASSAGES[passageIndex];
    const db = context.env.read_the_text_db;
    const storage = context.env.read_the_text_storage;

    // Get all passage results for this passage from clean sessions
    // Note: passage_id in passage_results is the actual passage (0-9 matching PASSAGES array)
    // while passage_index is the order the user saw it (can be any order due to randomization)
    const resultsQuery = await db.prepare(`
        SELECT pr.*, s.email, s.id as session_id
        FROM passage_results pr
        INNER JOIN sessions s ON pr.session_id = s.id
        WHERE pr.passage_id = ? AND (s.is_dirty = 0 OR s.is_dirty IS NULL)
        ORDER BY pr.created_at DESC
    `).bind(passageIndex).all();

    // Get all attempts for this passage from clean sessions
    // Join with passage_results to get the correct passage_index for each session
    // since passage_index varies per session (randomized order)
    const attemptsQuery = await db.prepare(`
        SELECT pa.*, s.email
        FROM passage_attempts pa
        INNER JOIN sessions s ON pa.session_id = s.id
        INNER JOIN passage_results pr ON pa.session_id = pr.session_id AND pa.passage_index = pr.passage_index
        WHERE pr.passage_id = ? AND (s.is_dirty = 0 OR s.is_dirty IS NULL)
        ORDER BY pa.session_id, pa.attempt_number
    `).bind(passageIndex).all();

    const results = resultsQuery.results as any[];
    const attempts = attemptsQuery.results as any[];

    // Build participant data with latest attempt screenshots
    const participantMap = new Map<string, ParticipantData>();

    for (const result of results) {
        const sessionAttempts = attempts.filter(a => a.session_id === result.session_id);
        const latestAttempt = sessionAttempts[sessionAttempts.length - 1];
        const isCorrect = sessionAttempts.some(a => a.is_correct === 1);

        let latestScreenshot = null;
        if (latestAttempt?.screenshot_r2_key) {
            const obj = await storage.get(latestAttempt.screenshot_r2_key);
            if (obj) {
                const buffer = await obj.arrayBuffer();
                latestScreenshot = `data:image/jpeg;base64,${arrayBufferToBase64(buffer)}`;
            }
        }

        participantMap.set(result.session_id, {
            sessionId: result.session_id,
            email: result.email,
            timeSpentMs: result.time_spent_ms || 0,
            wrongAttempts: result.wrong_attempts || 0,
            isCorrect,
            latestAttemptScreenshot: latestScreenshot,
            latestGeminiResponse: latestAttempt?.gemini_response || null
        });
    }

    const participants = Array.from(participantMap.values());

    // Calculate sentence-level statistics from reading summaries
    const sentenceStatsMap = new Map<number, {
        dwellTotal: number;
        visitsTotal: number;
        readingOrderTotal: number;
        readingOrderCount: number;
        count: number;
        text: string;
    }>();

    for (const attempt of attempts) {
        if (!attempt.reading_summary) continue;

        try {
            const summary = JSON.parse(attempt.reading_summary);
            if (!summary.sentences) continue;

            for (const sentence of summary.sentences) {
                const existing = sentenceStatsMap.get(sentence.index) || {
                    dwellTotal: 0,
                    visitsTotal: 0,
                    readingOrderTotal: 0,
                    readingOrderCount: 0,
                    count: 0,
                    text: sentence.text
                };

                existing.dwellTotal += sentence.dwell_ms || 0;
                existing.visitsTotal += sentence.visits || 0;
                if (sentence.first_visit_order !== null && sentence.first_visit_order !== undefined) {
                    existing.readingOrderTotal += sentence.first_visit_order;
                    existing.readingOrderCount++;
                }
                existing.count++;
                existing.text = sentence.text;

                sentenceStatsMap.set(sentence.index, existing);
            }
        } catch (e) {
            // Skip malformed reading summaries
        }
    }

    const sentenceStats: SentenceStats[] = Array.from(sentenceStatsMap.entries())
        .map(([index, stats]) => ({
            index,
            text: stats.text,
            avgDwellMs: stats.count > 0 ? Math.round(stats.dwellTotal / stats.count) : 0,
            avgVisits: stats.count > 0 ? Math.round((stats.visitsTotal / stats.count) * 10) / 10 : 0,
            avgReadingOrder: stats.readingOrderCount > 0
                ? Math.round((stats.readingOrderTotal / stats.readingOrderCount) * 10) / 10
                : null,
            timesRead: stats.count
        }))
        .sort((a, b) => a.index - b.index);

    // Calculate answer distribution
    const answerCounts = new Map<string, number>();
    let totalFirstAttempts = 0;

    for (const attempt of attempts) {
        if (attempt.attempt_number === 1) {
            const answer = attempt.selected_answer || '';
            answerCounts.set(answer, (answerCounts.get(answer) || 0) + 1);
            totalFirstAttempts++;
        }
    }

    const answerDistribution: AnswerDistribution[] = ANSWER_CHOICES.map((choice, idx) => ({
        choice,
        count: answerCounts.get(choice) || 0,
        percentage: totalFirstAttempts > 0
            ? Math.round(((answerCounts.get(choice) || 0) / totalFirstAttempts) * 100)
            : 0,
        isCorrect: idx === passage.correctAnswer
    }));

    // Find most common wrong answer
    const wrongAnswers = answerDistribution.filter(a => !a.isCorrect);
    const trapAnswer = wrongAnswers.reduce((max, curr) =>
        curr.count > max.count ? curr : max, wrongAnswers[0] || null);

    // Get sample AI feedback (up to 5 unique ones)
    const aiFeedbackSamples: { response: string; wasCorrect: boolean }[] = [];
    const seenFeedback = new Set<string>();

    for (const attempt of attempts) {
        if (attempt.gemini_response && !seenFeedback.has(attempt.gemini_response)) {
            seenFeedback.add(attempt.gemini_response);
            aiFeedbackSamples.push({
                response: attempt.gemini_response,
                wasCorrect: attempt.is_correct === 1
            });
            if (aiFeedbackSamples.length >= 5) break;
        }
    }

    // Overview stats
    const totalParticipants = participants.length;
    const avgTimeMs = participants.length > 0
        ? Math.round(participants.reduce((sum, p) => sum + p.timeSpentMs, 0) / participants.length)
        : 0;
    const firstTryCorrect = attempts.filter(a => a.attempt_number === 1 && a.is_correct === 1).length;
    const firstTryRate = totalFirstAttempts > 0
        ? Math.round((firstTryCorrect / totalFirstAttempts) * 100)
        : 0;

    return Response.json({
        passage: {
            id: passage.id,
            title: passage.title,
            index: passageIndex
        },
        overview: {
            totalParticipants,
            avgTimeMs,
            firstTryRate,
            totalAttempts: attempts.length
        },
        participants,
        sentenceStats,
        answerDistribution,
        trapAnswer,
        aiFeedbackSamples
    });
};
