import type { Env } from '../../types';
import { shuffleArray, generateUUID } from '../../types';

interface CreateSessionRequest {
  email: string;
  age?: number;
  hasAttendedUniversity?: 'yes' | 'no' | 'currently_attending';
  englishFluency?: 'not_at_all' | 'young_age' | 'high_school' | 'university' | 'first_language';
  firstLanguage?: string;
  completedSwesat?: 'yes' | 'no' | 'unsure';
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const requestData = await context.request.json() as CreateSessionRequest;
  const {
    email,
    age,
    hasAttendedUniversity,
    englishFluency,
    firstLanguage,
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
    if (!['not_at_all', 'young_age', 'high_school', 'university', 'first_language'].includes(englishFluency)) {
      return Response.json(
        { error: 'Invalid English fluency level' },
        { status: 400 }
      );
    }
  }

  if (firstLanguage !== undefined && firstLanguage.length > 100) {
    return Response.json(
      { error: 'First language must be 100 characters or less' },
      { status: 400 }
    );
  }

  if (completedSwesat !== undefined) {
    if (!['yes', 'no', 'unsure'].includes(completedSwesat)) {
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
      first_language,
      completed_swesat
    )
    VALUES (?, ?, ?, 10, ?, ?, ?, ?, ?)
  `).bind(
    sessionId,
    email,
    JSON.stringify(passageOrder),
    age || null,
    hasAttendedUniversity || null,
    englishFluency || null,
    firstLanguage || null,
    completedSwesat || null
  ).run();

  return Response.json({
    sessionId,
    passageOrder,
    resultUrl: `/results/${sessionId}`
  });
};
