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

  // Get screenshots from R2
  const resultsWithScreenshots = await Promise.all(
    passageResults.results.map(async (result: any) => {
      let screenshot = null;
      if (result.screenshot_r2_key) {
        console.log('Fetching screenshot:', result.screenshot_r2_key);
        try {
          const obj = await storage.get(result.screenshot_r2_key);
          console.log('R2 get result:', obj ? 'found' : 'null');
          if (obj) {
            const buffer = await obj.arrayBuffer();
            screenshot = `data:image/jpeg;base64,${arrayBufferToBase64(buffer)}`;
            console.log('Screenshot loaded, size:', buffer.byteLength);
          }
        } catch (err) {
          console.error('R2 get error:', err);
        }
      }
      return { ...result, screenshot };
    })
  );

  return Response.json({
    session: {
      ...session,
      passageOrder: JSON.parse(session.passage_order as string)
    },
    passageResults: resultsWithScreenshots,
    attempts: attempts.results
  });
};

// DELETE session
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const sessionId = context.params.id as string;
  const db = context.env.read_the_text_db;
  const storage = context.env.read_the_text_storage;

  // Get all R2 keys
  const results = await db.prepare(
    'SELECT screenshot_r2_key, cursor_history_r2_key FROM passage_results WHERE session_id = ?'
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

  // Delete from D1
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();

  return Response.json({ success: true });
};
