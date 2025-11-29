import { GoogleGenerativeAI } from '@google/generative-ai';
import { Env } from '../../types';
import { generateReportPrompt } from '../../utils/reportGenerator';
import { SessionData } from '../../types/session';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const sessionId = context.params.id as string;
    const db = context.env.read_the_text_db;
    const apiKey = context.env.VITE_GEMINI_API_KEY || context.env.GEMINI_API_KEY; // Support both env var names

    if (!apiKey) {
        console.error('Gemini API key is missing. Checked VITE_GEMINI_API_KEY and GEMINI_API_KEY.');
        return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // 1. Check if report already exists
    const session = await db.prepare(
        'SELECT * FROM sessions WHERE id = ?'
    ).bind(sessionId).first();

    if (!session) {
        return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.reading_report) {
        return Response.json({ report: session.reading_report, cached: true });
    }

    // 2. Fetch full session data
    const passageResults = await db.prepare(
        'SELECT * FROM passage_results WHERE session_id = ? ORDER BY passage_index'
    ).bind(sessionId).all();

    const attempts = await db.prepare(
        'SELECT * FROM passage_attempts WHERE session_id = ? ORDER BY passage_index, attempt_number'
    ).bind(sessionId).all();

    const questionnaireResponse = await db.prepare(
        'SELECT * FROM questionnaire_responses WHERE session_id = ?'
    ).bind(sessionId).first();

    const sessionData: SessionData = {
        session: {
            ...session,
            passageOrder: JSON.parse(session.passage_order as string)
        } as any,
        passageResults: passageResults.results as any[],
        attempts: attempts.results as any[],
        questionnaireResponse: (questionnaireResponse as any) || undefined
    };

    // 3. Generate Prompt
    const prompt = generateReportPrompt(sessionData);

    // 4. Call Gemini
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const reportMarkdown = response.text();

        // 5. Save Report
        await db.prepare(
            'UPDATE sessions SET reading_report = ? WHERE id = ?'
        ).bind(reportMarkdown, sessionId).run();

        return Response.json({ report: reportMarkdown, cached: false });

    } catch (error: any) {
        console.error('Gemini API error:', error);
        return Response.json({ error: 'Failed to generate report', details: error.message }, { status: 500 });
    }
};
