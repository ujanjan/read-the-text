import type { Env } from '../../../types';
import { arrayBufferToBase64 } from '../../../types';

// Passage data for titles and correct answers with choices
const PASSAGES = [
    {
        id: 'the-great-lakes', title: 'The Great Lakes', correctAnswer: 3, choices: [
            "Measures against environmental destruction tend to be taken when it is already too late.",
            "Environmental damage caused by chemical waste is usually very difficult to repair.",
            "The chemical industry is unlikely to take responsibility for effects on the environment.",
            "Predicting the consequences of actions to protect the environment can be difficult."
        ]
    },
    {
        id: 'american-folk-music', title: 'American Folk Music', correctAnswer: 0, choices: [
            "The British melodies were retained but the lyrics were replaced.",
            "The British folk songs developed beyond recognition.",
            "American folk music gradually lost touch with its British roots.",
            "American folk singers combined British lyrics with new music."
        ]
    },
    {
        id: 'new-scotland-yard', title: 'New Scotland Yard', correctAnswer: 1, choices: [
            "The Metropolitan Police are working hard to cut down on greenhouse gases.",
            "New Scotland Yard need to reassess their consumption of electricity.",
            "The Metropolitan Police have never been a guiding light for people in London.",
            "New Scotland Yard have lost the confidence of the British people."
        ]
    },
    {
        id: 'animal-life', title: 'Animal Life', correctAnswer: 2, choices: [
            "Historically, many animals have early global warming to thank for their existence.",
            "The extensive spread of animals across our globe millions of years ago led to global warming.",
            "The original spread of animal life throughout the planet was probably helped by melting ice.",
            "Millions of years ago, melting ice almost put an end to animal life on earth."
        ]
    },
    {
        id: 'saying-it-with-flowers', title: 'Saying it with Flowers', correctAnswer: 0, choices: [
            "The traces of flowers in the ancient graves are the results of human activity",
            "The burial ceremonies in Scotland during the Bronze Age were performed according to a strict ritual",
            "The people buried in the excavated graves had a high and respected position in society",
            "Pollen is a natural ingredient in the soil found at the excavated sites"
        ]
    },
    {
        id: 'tryggve-lie', title: 'Tryggve Lie', correctAnswer: 1, choices: [
            "He was unable to cooperate with his staff",
            "He was a very outspoken person",
            "He was governed more by reason than by passion",
            "He was a dishonest and self-centred leader"
        ]
    },
    {
        id: 'men-and-women', title: 'Men and Women', correctAnswer: 1, choices: [
            "The loss of a spouse is a greater blow to a woman than to a man",
            "Among single elderly people women are in the majority",
            "Married people live longer than those who are unmarried",
            "The death of your partner will shorten your life"
        ]
    },
    {
        id: 'the-mayas', title: 'The Mayas', correctAnswer: 2, choices: [
            "The Maya civilization gradually changed from a peaceful society into a more warlike one",
            "Thanks to the epigraphers it was possible to show that the archaeologists' theories had been correct",
            "The Maya civilization has much more in common with ours than was originally believed",
            "Despite recent discoveries the Mayas will always remain a mystery to us"
        ]
    },
    {
        id: 'rock-posters', title: 'Rock Posters', correctAnswer: 2, choices: [
            "They hardly demonstrated any clear artistic awareness",
            "They appealed to both the younger and the older generation",
            "They can not be said to have been particularly easy to read",
            "They were intended to be commercial rather than artistic"
        ]
    },
    {
        id: 'therapy', title: 'Therapy', correctAnswer: 3, choices: [
            "The result of the study is unlikely to have any practical relevance for depressed individuals",
            "It is hardly possible to adjust treatment to individual patients' needs",
            "The two types of therapy studied turned out to be equally effective for most individuals",
            "Future care may be determined on a more individual basis than earlier"
        ]
    }
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

    const results = resultsQuery.results as any[];

    // Get session_id -> passage_index mapping from results
    // This tells us which passage_index corresponds to this passage for each session
    const sessionPassageMap = new Map<string, number>();
    for (const r of results) {
        sessionPassageMap.set(r.session_id, r.passage_index);
    }

    // Get all attempts for the sessions that have this passage
    // We'll filter by passage_index per session after fetching
    let attempts: any[] = [];
    if (results.length > 0) {
        const sessionIds = results.map(r => r.session_id);
        const placeholders = sessionIds.map(() => '?').join(',');

        const attemptsQuery = await db.prepare(`
            SELECT pa.*, s.email
            FROM passage_attempts pa
            INNER JOIN sessions s ON pa.session_id = s.id
            WHERE pa.session_id IN (${placeholders})
            ORDER BY pa.session_id, pa.attempt_number
        `).bind(...sessionIds).all();

        // Filter to only include attempts that match the correct passage_index for each session
        attempts = (attemptsQuery.results as any[]).filter(a => {
            const expectedPassageIndex = sessionPassageMap.get(a.session_id);
            return a.passage_index === expectedPassageIndex;
        });
    }

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
    // Note: selected_answer is stored as full text, need to map to A/B/C/D
    const answerCounts = new Map<string, number>();
    let totalFirstAttempts = 0;

    // Build a map from answer text to index for this passage
    const textToIndex = new Map<string, number>();
    passage.choices.forEach((text, idx) => {
        textToIndex.set(text, idx);
    });

    for (const attempt of attempts) {
        if (attempt.attempt_number === 1) {
            const answerText = attempt.selected_answer || '';
            // Map the full text answer to its index (0-3)
            const answerIndex = textToIndex.get(answerText);
            if (answerIndex !== undefined) {
                const answerLetter = ANSWER_CHOICES[answerIndex];
                answerCounts.set(answerLetter, (answerCounts.get(answerLetter) || 0) + 1);
            }
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
