import type { Env } from '../../../../types';
import { generateUUID, base64ToArrayBuffer } from '../../../../types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const sessionId = context.params.sessionId as string;
  const passageIndex = parseInt(context.params.passageIndex as string);
  const db = context.env.read_the_text_db;
  const storage = context.env.read_the_text_storage;

  const { selectedAnswer, isCorrect, geminiResponse, screenshot, readingSummary } = await context.request.json() as {
    selectedAnswer: string;
    isCorrect: boolean;
    geminiResponse: string;
    screenshot?: string;
    readingSummary?: string;
  };

  // Get current attempt number
  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM passage_attempts
    WHERE session_id = ? AND passage_index = ?
  `).bind(sessionId, passageIndex).first();

  const attemptNumber = ((countResult?.count as number) || 0) + 1;

  // Upload screenshot to R2 if provided
  let screenshotKey: string | null = null;
  if (screenshot) {
    screenshotKey = `sessions/${sessionId}/passage_${passageIndex}_attempt_${attemptNumber}_screenshot.jpg`;
    const screenshotData = base64ToArrayBuffer(screenshot.split(',')[1]);
    await storage.put(screenshotKey, screenshotData, {
      httpMetadata: { contentType: 'image/jpeg' }
    });
  }

  await db.prepare(`
    INSERT INTO passage_attempts (
      id, session_id, passage_index, attempt_number,
      selected_answer, is_correct, gemini_response, screenshot_r2_key, reading_summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    generateUUID(), sessionId, passageIndex, attemptNumber,
    selectedAnswer, isCorrect ? 1 : 0, geminiResponse, screenshotKey, readingSummary || null
  ).run();

  // Update passage_results to track progress even for incomplete passages
  // This allows the overview page to show attempt counts and time spent
  if (!isCorrect) {
    // Fetch the session to get the passage_id from passage_order
    const session = await db.prepare(`
      SELECT passage_order FROM sessions WHERE id = ?
    `).bind(sessionId).first();

    if (session) {
      const passageOrder = JSON.parse(session.passage_order as string);
      const passageId = passageOrder[passageIndex];

      // Extract time from reading_summary if available
      let timeSpentMs = 0;
      if (readingSummary) {
        try {
          const summary = JSON.parse(readingSummary);
          timeSpentMs = summary.total_time_ms || 0;
        } catch (e) {
          console.error('Failed to parse reading_summary:', e);
        }
      }

      // For wrong attempts, upsert passage_results with current wrong attempt count and time
      await db.prepare(`
        INSERT INTO passage_results (
          id, session_id, passage_index, passage_id,
          is_complete, wrong_attempts, time_spent_ms
        ) VALUES (?, ?, ?, ?, 0, ?, ?)
        ON CONFLICT(session_id, passage_index) DO UPDATE SET
          wrong_attempts = excluded.wrong_attempts,
          time_spent_ms = excluded.time_spent_ms,
          updated_at = datetime('now')
      `).bind(
        generateUUID(), sessionId, passageIndex, passageId, attemptNumber, timeSpentMs
      ).run();
    }
  }

  return Response.json({ success: true, attemptNumber });
};
