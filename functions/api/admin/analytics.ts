import type { Env } from '../../types';

// Passage data for titles
const PASSAGES = [
    { id: 'the-great-lakes', title: 'The Great Lakes' },
    { id: 'american-folk-music', title: 'American Folk Music' },
    { id: 'new-scotland-yard', title: 'New Scotland Yard' },
    { id: 'animal-life', title: 'Animal Life' },
    { id: 'saying-it-with-flowers', title: 'Saying it with Flowers' },
    { id: 'tryggve-lie', title: 'Tryggve Lie' },
    { id: 'men-and-women', title: 'Men and Women' },
    { id: 'the-mayas', title: 'The Mayas' },
    { id: 'rock-posters', title: 'Rock Posters' },
    { id: 'therapy', title: 'Therapy' }
];

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

    const db = context.env.read_the_text_db;

    // Get all attempts from clean sessions, joined with passage_results to get the actual passage_id
    // Note: passage_index is the randomized order, passage_id is the actual passage (0-9 matching PASSAGES array)
    const attemptsResult = await db.prepare(`
        SELECT 
            pa.passage_index,
            pa.session_id,
            pa.attempt_number,
            pa.is_correct,
            pr.passage_id
        FROM passage_attempts pa
        INNER JOIN sessions s ON pa.session_id = s.id
        INNER JOIN passage_results pr ON pa.session_id = pr.session_id AND pa.passage_index = pr.passage_index
        WHERE s.is_dirty = 0 OR s.is_dirty IS NULL
    `).all();

    // Get passage results for average time (from clean sessions)
    const resultsData = await db.prepare(`
        SELECT 
            pr.passage_id,
            pr.time_spent_ms
        FROM passage_results pr
        INNER JOIN sessions s ON pr.session_id = s.id
        WHERE (s.is_dirty = 0 OR s.is_dirty IS NULL) AND pr.is_complete = 1
    `).all();

    // Build stats per passage
    const passageStats = PASSAGES.map((passage, index) => {
        // Filter by passage_id (the actual passage), not passage_index (the randomized order)
        const passageAttempts = (attemptsResult.results as any[]).filter(
            a => a.passage_id === index
        );

        const totalAttempts = passageAttempts.length;

        // First try correct: attempts where attempt_number = 1 AND is_correct = 1
        const firstTryAttempts = passageAttempts.filter(a => a.attempt_number === 1);
        const firstTryCorrect = firstTryAttempts.filter(a => a.is_correct === 1).length;
        const firstTryCorrectPct = firstTryAttempts.length > 0
            ? Math.round((firstTryCorrect / firstTryAttempts.length) * 100)
            : 0;

        // Eventually correct: sessions that have at least one correct attempt
        const sessionIds = [...new Set(passageAttempts.map(a => a.session_id))];
        const sessionsWithCorrect = sessionIds.filter(sessionId =>
            passageAttempts.some(a => a.session_id === sessionId && a.is_correct === 1)
        );
        const eventuallyCorrectPct = sessionIds.length > 0
            ? Math.round((sessionsWithCorrect.length / sessionIds.length) * 100)
            : 0;

        // Average time spent
        const passageResults = (resultsData.results as any[]).filter(
            r => r.passage_id === index
        );
        const avgTimeMs = passageResults.length > 0
            ? Math.round(passageResults.reduce((sum, r) => sum + r.time_spent_ms, 0) / passageResults.length)
            : 0;

        return {
            passageId: passage.id,
            title: passage.title,
            uniqueParticipants: sessionIds.length,
            totalAttempts,
            firstTryCorrectPct,
            eventuallyCorrectPct,
            avgTimeMs
        };
    });

    return Response.json({ passages: passageStats });
};
