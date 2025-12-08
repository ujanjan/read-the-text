import type { Env } from '../../../types';
import { arrayBufferToBase64 } from '../../../types';

// GET session details
export const onRequestGet: PagesFunction<Env> = async (context) => {
  // Check for authorization token
  const authHeader = context.request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = atob(token);
    const [prefix, timestamp] = decoded.split(':');

    if (prefix !== 'admin') {
      throw new Error('Invalid token');
    }

    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    const fourHours = 4 * 60 * 60 * 1000;

    if (isNaN(tokenTime) || now - tokenTime > fourHours) {
      return Response.json(
        { error: 'Unauthorized' }, // Token expired
        { status: 401 }
      );
    }
  } catch (e) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

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

  // Fetch questionnaire response if exists
  const questionnaireResponse = await db.prepare(
    'SELECT * FROM questionnaire_responses WHERE session_id = ?'
  ).bind(sessionId).first();

  const resultsWithScreenshots = await Promise.all(
    passageResults.results.map(async (result: any) => {
      let screenshot = null;
      if (result.screenshot_r2_key) {
        const obj = await storage.get(result.screenshot_r2_key);
        if (obj) {
          const buffer = await obj.arrayBuffer();
          screenshot = `data:image/jpeg;base64,${arrayBufferToBase64(buffer)}`;
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
    attempts: attempts.results,
    questionnaireResponse: questionnaireResponse || undefined
  });
};

// DELETE session
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  // Check for authorization token
  const authHeader = context.request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = atob(token);
    const [prefix, timestamp] = decoded.split(':');

    if (prefix !== 'admin') {
      throw new Error('Invalid token');
    }

    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    const fourHours = 4 * 60 * 60 * 1000;

    if (isNaN(tokenTime) || now - tokenTime > fourHours) {
      return Response.json(
        { error: 'Unauthorized' }, // Token expired
        { status: 401 }
      );
    }
  } catch (e) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const sessionId = context.params.id as string;
  const db = context.env.read_the_text_db;
  const storage = context.env.read_the_text_storage;

  const results = await db.prepare(
    'SELECT screenshot_r2_key, cursor_history_r2_key FROM passage_results WHERE session_id = ?'
  ).bind(sessionId).all();

  for (const result of results.results as any[]) {
    if (result.screenshot_r2_key) {
      await storage.delete(result.screenshot_r2_key);
    }
    if (result.cursor_history_r2_key) {
      await storage.delete(result.cursor_history_r2_key);
    }
  }

  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();

  return Response.json({ success: true });
};

// PATCH session - toggle is_dirty flag
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  // Check for authorization token
  const authHeader = context.request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = atob(token);
    const [prefix, timestamp] = decoded.split(':');

    if (prefix !== 'admin') {
      throw new Error('Invalid token');
    }

    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    const fourHours = 4 * 60 * 60 * 1000;

    if (isNaN(tokenTime) || now - tokenTime > fourHours) {
      return Response.json(
        { error: 'Unauthorized' }, // Token expired
        { status: 401 }
      );
    }
  } catch (e) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const sessionId = context.params.id as string;
  const db = context.env.read_the_text_db;

  const body = await context.request.json() as { is_dirty: boolean };
  const isDirty = body.is_dirty ? 1 : 0;

  await db.prepare('UPDATE sessions SET is_dirty = ? WHERE id = ?')
    .bind(isDirty, sessionId)
    .run();

  return Response.json({ success: true, is_dirty: isDirty === 1 });
};
