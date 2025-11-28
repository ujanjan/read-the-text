import type { Env } from '../../types';
import { shuffleArray, generateUUID } from '../../types';

interface CreateSessionRequest {
  email: string;
  age?: number;
  hasAttendedUniversity?: 'yes' | 'no' | 'currently_attending';
  englishFluency?: 'native' | 'c1_c2' | 'b2' | 'b1' | 'a1_a2';
  completedSwesat?: 'yes' | 'no';
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const requestData = await context.request.json() as CreateSessionRequest;
  const {
    email,
    age,
    hasAttendedUniversity,
    englishFluency,
    completedSwesat
  } = requestData;

  const db = context.env.read_the_text_db;

  // Validate demographics if provided
  if (age !== undefined) {
    if (typeof age !== 'number' || age < 18 || age > 99) {
      return Response.json(
        { error: 'Age must be between 18 and 99' },
        { status: 400 }
      );
    }
  }

  if (hasAttendedUniversity !== undefined) {
    if (!['yes', 'no', 'currently_attending'].includes(hasAttendedUniversity)) {
      return Response.json(
        { error: 'Invalid university status' },
        { status: 400 }
      );
    }
  }

  if (englishFluency !== undefined) {
    if (!['native', 'c1_c2', 'b2', 'b1', 'a1_a2'].includes(englishFluency)) {
      return Response.json(
        { error: 'Invalid English fluency level' },
        { status: 400 }
      );
    }
  }


  if (completedSwesat !== undefined) {
    if (!['yes', 'no'].includes(completedSwesat)) {
      return Response.json(
        { error: 'Invalid SWESAT status' },
        { status: 400 }
      );
    }
  }

  const sessionId = generateUUID();
  const passageOrder = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  // Insert session with demographics
  await db.prepare(`
    INSERT INTO sessions (
      id,
      email,
      passage_order,
      total_passages,
      age,
      has_attended_university,
      english_fluency,
      completed_swesat
    )
    VALUES (?, ?, ?, 10, ?, ?, ?, ?)
  `).bind(
    sessionId,
    email,
    JSON.stringify(passageOrder),
    age || null,
    hasAttendedUniversity || null,
    englishFluency || null,
    completedSwesat || null
  ).run();

  return Response.json({
    sessionId,
    passageOrder,
    resultUrl: `/results/${sessionId}`
  });
};
