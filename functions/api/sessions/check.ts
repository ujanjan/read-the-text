import type { Env } from '../../types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { nickname } = await context.request.json() as { nickname: string };
  const db = context.env.read_the_text_db;

  const session = await db.prepare(
    'SELECT id, status, current_passage_index, passage_order, total_passages FROM sessions WHERE nickname = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(nickname).first();

  if (!session) {
    return Response.json({ exists: false });
  }

  // Check actual completion status by counting completed passages
  let status = session.status as string;
  if (status !== 'completed') {
    const completedCount = await db.prepare(
      'SELECT COUNT(*) as count FROM passage_results WHERE session_id = ? AND is_complete = 1'
    ).bind(session.id).first<{ count: number }>();

    if (completedCount && completedCount.count >= (session.total_passages as number)) {
      // All passages are complete - update status and return completed
      await db.prepare(
        "UPDATE sessions SET status = 'completed', completed_at = datetime('now') WHERE id = ?"
      ).bind(session.id).run();
      status = 'completed';
    }
  }

  return Response.json({
    exists: true,
    sessionId: session.id,
    status,
    currentPassageIndex: session.current_passage_index,
    passageOrder: JSON.parse(session.passage_order as string)
  });
};
