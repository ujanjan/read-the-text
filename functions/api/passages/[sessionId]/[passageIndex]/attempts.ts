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

  return Response.json({ success: true, attemptNumber });
};
