import type { Env } from '../../types';

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

  const db = context.env.read_the_text_db;
  const url = new URL(context.request.url);
  const status = url.searchParams.get('status');

  let query = `
    SELECT
      s.id, s.email, s.status, s.current_passage_index,
      s.total_passages, s.created_at, s.completed_at, s.total_time_ms,
      (SELECT COUNT(*) FROM passage_results pr WHERE pr.session_id = s.id AND pr.is_complete = 1) as completed_passages
    FROM sessions s
  `;

  if (status) {
    query += ` WHERE s.status = ?`;
  }

  query += ' ORDER BY s.created_at DESC';

  const sessions = status
    ? await db.prepare(query).bind(status).all()
    : await db.prepare(query).all();

  return Response.json({ sessions: sessions.results });
};
