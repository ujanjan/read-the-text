export interface Session {
  id: string;
  email: string;
  status: 'in_progress' | 'completed';
  current_passage_index: number;
  passageOrder: number[];
  total_passages: number;
  created_at: string;
  completed_at?: string;
  total_time_ms: number;
  // Demographics
  age?: number;
  has_attended_university?: 'yes' | 'no' | 'currently_attending';
  english_fluency?: 'native' | 'c1_c2' | 'b2' | 'b1' | 'a1_a2';
  completed_swesat?: 'yes' | 'no';
  first_language?: string;
}

export interface PassageResult {
  id: string;
  session_id: string;
  passage_index: number;
  passage_id: number;
  screenshot_r2_key?: string;
  cursor_history_r2_key?: string;
  is_complete: number;
  wrong_attempts: number;
  time_spent_ms: number;
  final_selected_answer?: string;
  screenshot?: string; // base64 when fetched
  cursor_history?: any[]; // Loaded from R2
}

export interface PassageAttempt {
  id: string;
  session_id: string;
  passage_index: number;
  attempt_number: number;
  selected_answer: string;
  is_correct: number;
  gemini_response?: string;
  screenshot_r2_key?: string;
  screenshot?: string; // base64 when fetched
  reading_summary?: string; // JSON string of sentence-level reading analytics
  created_at: string;
}

export interface SessionCheckResponse {
  exists: boolean;
  sessionId?: string;
  status?: 'in_progress' | 'completed';
  currentPassageIndex?: number;
  passageOrder?: number[];
}

export interface SessionCreateResponse {
  sessionId: string;
  passageOrder: number[];
  resultUrl: string;
}

export interface QuestionnaireResponse {
  id: string;
  session_id: string;
  question_1_response?: string;
  question_2_response?: string;
  question_3_response?: string;
  submitted_at: string;
}

export interface SessionData {
  session: Session;
  passageResults: PassageResult[];
  attempts: PassageAttempt[];
  questionnaireResponse?: QuestionnaireResponse;
}

export interface AdminSession {
  id: string;
  email: string;
  status: 'in_progress' | 'completed';
  current_passage_index: number;
  total_passages: number;
  created_at: string;
  completed_at?: string;
  total_time_ms: number;
  completed_passages: number;
  is_dirty?: boolean;
}

// User demographics form data
export interface UserDemographics {
  age: number;
  hasAttendedUniversity: 'yes' | 'no' | 'currently_attending';
  englishFluency: 'native' | 'c1_c2' | 'b2' | 'b1' | 'a1_a2';
  completedSwesat: 'yes' | 'no';
}
