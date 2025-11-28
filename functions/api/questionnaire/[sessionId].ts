import type { Env } from '../../types';

interface QuestionnaireRequest {
    question1: string;
    question2: string;
    question3: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { sessionId } = context.params as { sessionId: string };
    const requestData = await context.request.json() as QuestionnaireRequest;
    const { question1, question2, question3 } = requestData;

    const db = context.env.read_the_text_db;

    // Verify session exists
    const session = await db.prepare('SELECT id FROM sessions WHERE id = ?')
        .bind(sessionId)
        .first();

    if (!session) {
        return Response.json(
            { error: 'Session not found' },
            { status: 404 }
        );
    }

    // Insert questionnaire responses
    await db.prepare(`
    INSERT INTO questionnaire_responses (
      session_id,
      question_1_response,
      question_2_response,
      question_3_response
    )
    VALUES (?, ?, ?, ?)
  `).bind(
        sessionId,
        question1 || null,
        question2 || null,
        question3 || null
    ).run();

    return Response.json({ success: true });
};
