import type { Env } from '../../../types';
import { arrayBufferToBase64 } from '../../../types';

// Passage data with text, question, and choices
const PASSAGES = [
    {
        id: 'the-great-lakes', title: 'The Great Lakes', correctAnswer: 3,
        text: 'The Great Lakes are undergoing "an ecological catastrophe unlike any this continent has seen," according to Pulitzer Prize finalist Dan Egan. Humans have dramatically altered the lakes\' fauna since invasive species first snuck up through the man-made Saint Lawrence Seaway. Blunders sometimes stemmed from well-meaning policies. Researchers imported Asian carp to kill river nuisances without chemicals, and now some worry the fish has silently invaded Lake Michigan\'s floor via the Chicago Sanitary and Ship Canal. And the lakes\' imported problems are quickly becoming national disasters, such as the tiny and quick-spawning quagga mussel that has infested regions as far away as Lake Mead and Lake Powell on the Colorado River.',
        question: "What is implied here?",
        choices: [
            "Measures against environmental destruction tend to be taken when it is already too late.",
            "Environmental damage caused by chemical waste is usually very difficult to repair.",
            "The chemical industry is unlikely to take responsibility for effects on the environment.",
            "Predicting the consequences of actions to protect the environment can be difficult."
        ]
    },
    {
        id: 'american-folk-music', title: 'American Folk Music', correctAnswer: 0,
        text: "The national treasure that is American folk and country music came over on boats from the British Isles in the 17th century, especially the Scots-Irish borderlands. It traveled down the Appalachian – via fiddle, banjo and guitar – in ballads and hymns, the words changing into new songs but the music immutable. For example, it was the first music that the great American songwriter Woody Guthrie ever heard: his mother singing Anglo-Celtic ballads in a high nasal country twang at their home outside Okemah, Oklahoma",
        question: "What is said here about the relationship between British and American folk songs?",
        choices: [
            "The British melodies were retained but the lyrics were replaced.",
            "The British folk songs developed beyond recognition.",
            "American folk music gradually lost touch with its British roots.",
            "American folk singers combined British lyrics with new music."
        ]
    },
    {
        id: 'new-scotland-yard', title: 'New Scotland Yard', correctAnswer: 1,
        text: "New Scotland Yard may be a beacon of law and order in the heart of London, but the sight of its lights burning through the night has taken on a different meaning. Staff at the HQ of the Metropolitan Police use so much lighting, heating, cooling and electricity that the tower pumps out 13,491 tonnes of carbon dioxide a year – equivalent to about 2,200 households. It makes it the most polluting police station in England and Wales and one of the biggest contributors to greenhouse gases of any public building in Britain.",
        question: "What is implied here?",
        choices: [
            "The Metropolitan Police are working hard to cut down on greenhouse gases.",
            "New Scotland Yard need to reassess their consumption of electricity.",
            "The Metropolitan Police have never been a guiding light for people in London.",
            "New Scotland Yard have lost the confidence of the British people."
        ]
    },
    {
        id: 'animal-life', title: 'Animal Life', correctAnswer: 2,
        text: "It took a mere 85 million years – the geologic blink of an eye – for animals to evolve and radiate out over much of the world's land and oceans. Although fossil records and molecular biology have provided much information on the spread of animal life, scientists have not been able to figure out exactly what sparked this massive diversification. New research shows that nutrient-rich runoff from massive melting glaciers may have provided the extra energy needed to fuel this dramatic evolution.",
        question: "What is said about evolution in this text?",
        choices: [
            "Historically, many animals have early global warming to thank for their existence.",
            "The extensive spread of animals across our globe millions of years ago led to global warming.",
            "The original spread of animal life throughout the planet was probably helped by melting ice.",
            "Millions of years ago, melting ice almost put an end to animal life on earth."
        ]
    },
    {
        id: 'saying-it-with-flowers', title: 'Saying it with Flowers', correctAnswer: 0,
        text: "Bronze Age burials containing pollen from an aromatic plant suggest that floral tribute was an ancient custom in Scotland. Recent excavation of five burial sites has corroborated data from two earlier excavations showing that plants were deposited by people, not by natural processes. The discovery of Filipendula pollen, probably from the plant meadowsweet, has led Scottish archaeologist Richard Tipping to speculate that the plant may have been used in graveside offerings — in bread, as a flavoring in honey or mead, or as a bouquet or floral covering. Meadowsweet is described in herbal literature as having a pleasant scent. Whether it was used in ancient times to raise the spirit of mourners or to counteract the smell of rotten flesh has remained unclear.",
        question: "What conclusion has been drawn from the findings described in the text?",
        choices: [
            "The traces of flowers in the ancient graves are the results of human activity",
            "The burial ceremonies in Scotland during the Bronze Age were performed according to a strict ritual",
            "The people buried in the excavated graves had a high and respected position in society",
            "Pollen is a natural ingredient in the soil found at the excavated sites"
        ]
    },
    {
        id: 'tryggve-lie', title: 'Tryggve Lie', correctAnswer: 1,
        text: "The first Secretary-General of the United Nations was Tryggve Lie. His strength reflected the high hopes for the new organization in the aftermath of a devastating war. But Lie's readiness to wade in with his own opinions on any and every world issue had mixed results. In supporting, in vain, Communist China's right to take its seat at the UN after the 1949 Revolution, he was admirably clear-sighted and prepared to stand up to the US. But ultimately his passionate advocacy of the US/UN position in the Korean War won him the enmity of the Soviet Union, which refused to take part in UN activities when he was present, forcing him to resign.",
        question: "What was Tryggve Lie like, according to the text?",
        choices: [
            "He was unable to cooperate with his staff",
            "He was a very outspoken person",
            "He was governed more by reason than by passion",
            "He was a dishonest and self-centred leader"
        ]
    },
    {
        id: 'men-and-women', title: 'Men and Women', correctAnswer: 1,
        text: "Biologically speaking, the male is the weaker sex in most respects. One important consequence is that women are more likely than men to experience the death of their spouse and that the marriage market for widows is more restricted than that for widowers.",
        question: "What does the writer suggest?",
        choices: [
            "The loss of a spouse is a greater blow to a woman than to a man",
            "Among single elderly people women are in the majority",
            "Married people live longer than those who are unmarried",
            "The death of your partner will shorten your life"
        ]
    },
    {
        id: 'the-mayas', title: 'The Mayas', correctAnswer: 2,
        text: "As recently as 30 years ago, many archaeologists imagined the Mayas as peaceful mystics, their lives focused on stately ceremonial centers where astronomer-priests interpreted the stars. However, that picture faded in the 1960s and 1970s as a breed of anthropologists known as epigraphers cracked the complex hieroglyphic system of Maya writing. The glyphs told a lively story of politics and warfare, and the ceremonial centers became quarrelsome citystates. Now, with a new reading of texts from sites throughout the Maya heartland in Mexico, Guatemala, and Belize, the Mayas have taken another step toward modernity. It seems as if most of the individual city-states were tied in two large, durable alliances. Like NATO and the Warsaw Pact, each alliance was led by a dominant power.",
        question: "What is the writer's main idea?",
        choices: [
            "The Maya civilization gradually changed from a peaceful society into a more warlike one",
            "Thanks to the epigraphers it was possible to show that the archaeologists' theories had been correct",
            "The Maya civilization has much more in common with ours than was originally believed",
            "Despite recent discoveries the Mayas will always remain a mystery to us"
        ]
    },
    {
        id: 'rock-posters', title: 'Rock Posters', correctAnswer: 2,
        text: "The vibrating colors and illegible typographic lettering of psychedelic concert posters in the late 60's gave us a universal graphic language for the hippie sex, drugs and rock'n'roll era. Posters were designed to advertise bands, appeal to aficionados and off end everyone else. Hip-capitalist entrepreneurs, however, quickly reduced real psychedelia to a youth-culture style that sold everything from tie-dyed neckties to Volkswagen vans. What came next, in the 70's, was punk music – and an anarchic graphic sensibility typifi ed by D.I.Y. (Do It Yourself ), a deliberately clumsy hodgepodge of images that were cut and pasted and frequently stolen and photocopied. Punk was known for its ransom-note aesthetic; it broke the tenets of legibility but telegraphed clear-coded messages to its audience.",
        question: "Which of the following statements is true of both psychedelic and punk posters, according to the text?",
        choices: [
            "They hardly demonstrated any clear artistic awareness",
            "They appealed to both the younger and the older generation",
            "They can not be said to have been particularly easy to read",
            "They were intended to be commercial rather than artistic"
        ]
    },
    {
        id: 'therapy', title: 'Therapy', correctAnswer: 3,
        text: "The brains of depressed people respond differently to cognitive therapy than to drug therapy, according to a University of Toronto study. Neither treatment appears to work better than the other, researchers found, but the difference should help doctors understand why one treatment works for some but not for others.",
        question: "What can be concluded from this text?",
        choices: [
            "The result of the study is unlikely to have any practical relevance for depressed individuals",
            "It is hardly possible to adjust treatment to individual patients’ needs",
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
    totalAttempts: number; // Total attempts = wrongAttempts + 1
    isCorrect: boolean;
    latestAttemptScreenshot: string | null;
    latestGeminiResponse: string | null;
    passageIndex: number; // The passage_index for this user (for generating detail link)
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
    // Use a Map to de-duplicate in case there are multiple results per session
    const sessionPassageMap = new Map<string, number>();
    for (const r of results) {
        sessionPassageMap.set(r.session_id, r.passage_index);
    }

    // Get unique session IDs only
    const uniqueSessionIds = Array.from(sessionPassageMap.keys());

    // Get all attempts for the sessions that have this passage
    // We'll filter by passage_index per session after fetching
    let attempts: any[] = [];
    if (uniqueSessionIds.length > 0) {
        const placeholders = uniqueSessionIds.map(() => '?').join(',');

        const attemptsQuery = await db.prepare(`
            SELECT pa.*, s.email
            FROM passage_attempts pa
            INNER JOIN sessions s ON pa.session_id = s.id
            WHERE pa.session_id IN (${placeholders})
            ORDER BY pa.session_id, pa.attempt_number
        `).bind(...uniqueSessionIds).all();

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
        const correctAttempt = sessionAttempts.find(a => a.is_correct === 1);
        const latestAttempt = sessionAttempts[sessionAttempts.length - 1];

        // Prioritize screenshot from passage_results (final state), then correct attempt, then latest
        // passage_results has screenshot_r2_key directly on the result object
        const resultScreenshotKey = result.screenshot_r2_key;
        const attemptScreenshotKey = (correctAttempt || latestAttempt)?.screenshot_r2_key;

        const screenshotKey = resultScreenshotKey || attemptScreenshotKey;
        const isCorrect = !!correctAttempt;

        let latestScreenshot = null;
        if (screenshotKey) {
            const obj = await storage.get(screenshotKey);
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
            totalAttempts: sessionAttempts.length || 1, // Actual count of attempts
            isCorrect,
            latestAttemptScreenshot: latestScreenshot,
            latestGeminiResponse: latestAttempt?.gemini_response || null,
            passageIndex: result.passage_index
        });
    }

    const participants = Array.from(participantMap.values());

    // Calculate sentence-level statistics from reading summaries
    // Only count ONE reading summary per participant (the latest attempt)
    const sentenceStatsMap = new Map<number, {
        dwellTotal: number;
        visitsTotal: number;
        readingOrderTotal: number;
        readingOrderCount: number;
        participantCount: number;  // Count unique participants, not attempts
        participantSet: Set<string>;  // Track which sessions have contributed
        text: string;
    }>();

    // Group attempts by session, pick the latest one per session for sentence stats
    const latestAttemptPerSession = new Map<string, any>();
    for (const attempt of attempts) {
        if (!attempt.reading_summary) continue;
        const existing = latestAttemptPerSession.get(attempt.session_id);
        if (!existing || attempt.attempt_number > existing.attempt_number) {
            latestAttemptPerSession.set(attempt.session_id, attempt);
        }
    }

    // Now process only the latest attempt per session
    for (const [sessionId, attempt] of latestAttemptPerSession) {
        try {
            const summary = JSON.parse(attempt.reading_summary);
            if (!summary.sentences) continue;

            for (const sentence of summary.sentences) {
                const existing = sentenceStatsMap.get(sentence.index) || {
                    dwellTotal: 0,
                    visitsTotal: 0,
                    readingOrderTotal: 0,
                    readingOrderCount: 0,
                    participantCount: 0,
                    participantSet: new Set<string>(),
                    text: sentence.text
                };

                existing.dwellTotal += sentence.dwell_ms || 0;
                existing.visitsTotal += sentence.visits || 0;
                if (sentence.first_visit_order !== null && sentence.first_visit_order !== undefined) {
                    existing.readingOrderTotal += sentence.first_visit_order;
                    existing.readingOrderCount++;
                }

                // Only count unique participants
                if (!existing.participantSet.has(sessionId)) {
                    existing.participantSet.add(sessionId);
                    existing.participantCount++;
                }
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
            avgDwellMs: stats.participantCount > 0 ? Math.round(stats.dwellTotal / stats.participantCount) : 0,
            avgVisits: stats.participantCount > 0 ? Math.round((stats.visitsTotal / stats.participantCount) * 10) / 10 : 0,
            avgReadingOrder: stats.readingOrderCount > 0
                ? Math.round((stats.readingOrderTotal / stats.readingOrderCount) * 10) / 10
                : null,
            timesRead: stats.participantCount  // Now shows unique participants
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
            const answerText = (attempt.selected_answer || '').trim();
            // Map the full text answer to its index (0-3)
            const answerIndex = textToIndex.get(answerText);

            if (answerIndex !== undefined) {
                const answerLetter = ANSWER_CHOICES[answerIndex];
                answerCounts.set(answerLetter, (answerCounts.get(answerLetter) || 0) + 1);
            } else if (answerText) {
                // Counts as an attempt but didn't match A/B/C/D (e.g. slight mismatch)
                // We'll group these as 'Unknown' so the total adds up correclty
                answerCounts.set('Unknown', (answerCounts.get('Unknown') || 0) + 1);
            }
            totalFirstAttempts++;
        }
    }

    // Include Unknown in the distribution only if there are any
    const displayChoices = [...ANSWER_CHOICES];
    if (answerCounts.get('Unknown')) {
        displayChoices.push('Unknown');
    }

    const answerDistribution: AnswerDistribution[] = displayChoices.map((choice, idx) => ({
        choice,
        count: answerCounts.get(choice) || 0,
        percentage: totalFirstAttempts > 0
            ? Math.round(((answerCounts.get(choice) || 0) / totalFirstAttempts) * 100)
            : 0,
        isCorrect: choice === 'Unknown' ? false : idx === passage.correctAnswer
    }));

    // Find most common wrong answer (only if someone actually selected it)
    const wrongAnswers = answerDistribution.filter(a => !a.isCorrect);
    const trapAnswer = wrongAnswers.some(a => a.count > 0)
        ? wrongAnswers.reduce((max, curr) => curr.count > max.count ? curr : max, wrongAnswers[0])
        : null;

    // Get sample AI feedback - separate correct and wrong (latest 5 of each)
    const correctFeedbackSamples: { response: string }[] = [];
    const wrongFeedbackSamples: { response: string }[] = [];
    const seenCorrectFeedback = new Set<string>();
    const seenWrongFeedback = new Set<string>();

    // Iterate through attempts in order (they're already sorted by created_at DESC from the query)
    for (const attempt of attempts) {
        if (!attempt.gemini_response) continue;

        if (attempt.is_correct === 1) {
            // Add to correct feedback if not seen and under limit
            if (!seenCorrectFeedback.has(attempt.gemini_response) && correctFeedbackSamples.length < 5) {
                seenCorrectFeedback.add(attempt.gemini_response);
                correctFeedbackSamples.push({ response: attempt.gemini_response });
            }
        } else {
            // Add to wrong feedback if not seen and under limit
            if (!seenWrongFeedback.has(attempt.gemini_response) && wrongFeedbackSamples.length < 5) {
                seenWrongFeedback.add(attempt.gemini_response);
                wrongFeedbackSamples.push({ response: attempt.gemini_response });
            }
        }

        // Stop if we have enough of both
        if (correctFeedbackSamples.length >= 5 && wrongFeedbackSamples.length >= 5) break;
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
            index: passageIndex,
            text: passage.text,
            question: passage.question,
            choices: passage.choices,
            correctAnswer: passage.correctAnswer
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
        correctFeedbackSamples,
        wrongFeedbackSamples
    });
};
