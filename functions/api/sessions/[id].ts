import type { Env } from '../../types';
import { arrayBufferToBase64 } from '../../types';

// GET session data (for resume or results)
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const sessionId = context.params.id as string;
  const db = context.env.read_the_text_db;
  const storage = context.env.read_the_text_storage;

  const session = await db.prepare(
    'SELECT * FROM sessions WHERE id = ?'
  ).bind(sessionId).first();

  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  const passageResults = await db.prepare(
    'SELECT * FROM passage_results WHERE session_id = ? ORDER BY passage_index'
  ).bind(sessionId).all();

  const attempts = await db.prepare(
    'SELECT * FROM passage_attempts WHERE session_id = ? ORDER BY passage_index, attempt_number'
  ).bind(sessionId).all();

  // Get screenshots and cursor history from R2 for passage results
  const resultsWithScreenshots = await Promise.all(
    passageResults.results.map(async (result: any) => {
      let screenshot = null;
      let cursor_history = null;

      // Fetch screenshot
      if (result.screenshot_r2_key) {
        try {
          const obj = await storage.get(result.screenshot_r2_key);
          if (obj) {
            const buffer = await obj.arrayBuffer();
            screenshot = `data:image/jpeg;base64,${arrayBufferToBase64(buffer)}`;
          }
        } catch (err) {
          console.error('R2 get error (screenshot):', err);
        }
      }

      // Fetch cursor history
      if (result.cursor_history_r2_key) {
        try {
          const obj = await storage.get(result.cursor_history_r2_key);
          if (obj) {
            cursor_history = await obj.json();
          }
        } catch (err) {
          console.error('R2 get error (cursor):', err);
        }
      }

      return { ...result, screenshot, cursor_history };
    })
  );

  // Get screenshots from R2 for attempts
  const attemptsWithScreenshots = await Promise.all(
    attempts.results.map(async (attempt: any) => {
      let screenshot = null;
      if (attempt.screenshot_r2_key) {
        try {
          const obj = await storage.get(attempt.screenshot_r2_key);
          if (obj) {
            const buffer = await obj.arrayBuffer();
            screenshot = `data:image/jpeg;base64,${arrayBufferToBase64(buffer)}`;
          }
        } catch (err) {
          console.error('R2 get error for attempt screenshot:', err);
        }
      }
      return { ...attempt, screenshot };
    })
  );

  // Fetch questionnaire response if exists
  const questionnaireResponse = await db.prepare(
    'SELECT * FROM questionnaire_responses WHERE session_id = ?'
  ).bind(sessionId).first();

  return Response.json({
    session: {
      ...session,
      passageOrder: JSON.parse(session.passage_order as string)
    },
    passageResults: resultsWithScreenshots,
    attempts: attemptsWithScreenshots,
    questionnaireResponse: questionnaireResponse || undefined
  });
};

// DELETE session
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const sessionId = context.params.id as string;
  const db = context.env.read_the_text_db;
  const storage = context.env.read_the_text_storage;

  // Get all R2 keys from passage_results
  const results = await db.prepare(
    'SELECT screenshot_r2_key, cursor_history_r2_key FROM passage_results WHERE session_id = ?'
  ).bind(sessionId).all();

  // Get all R2 keys from passage_attempts
  const attempts = await db.prepare(
    'SELECT screenshot_r2_key FROM passage_attempts WHERE session_id = ?'
  ).bind(sessionId).all();

  // Delete from R2
  for (const result of results.results as any[]) {
    if (result.screenshot_r2_key) {
      await storage.delete(result.screenshot_r2_key);
    }
    if (result.cursor_history_r2_key) {
      await storage.delete(result.cursor_history_r2_key);
    }
  }

  // Delete attempt screenshots from R2
  for (const attempt of attempts.results as any[]) {
    if (attempt.screenshot_r2_key) {
      await storage.delete(attempt.screenshot_r2_key);
    }
  }

  // Delete from D1
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();

  return Response.json({ success: true });
};
