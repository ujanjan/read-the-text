export interface Session {
  id: string;
  nickname: string;
  status: 'in_progress' | 'completed';
  current_passage_index: number;
  passageOrder: number[];
  total_passages: number;
  created_at: string;
  completed_at?: string;
  total_time_ms: number;
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
}

export interface PassageAttempt {
  id: string;
  session_id: string;
  passage_index: number;
  attempt_number: number;
  selected_answer: string;
  is_correct: number;
  gemini_response?: string;
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

export interface SessionData {
  session: Session;
  passageResults: PassageResult[];
  attempts: PassageAttempt[];
}

export interface AdminSession {
  id: string;
  nickname: string;
  status: 'in_progress' | 'completed';
  current_passage_index: number;
  total_passages: number;
  created_at: string;
  completed_at?: string;
  total_time_ms: number;
  completed_passages: number;
}
