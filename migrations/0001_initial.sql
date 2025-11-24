-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed')),
  current_passage_index INTEGER DEFAULT 0,
  passage_order TEXT NOT NULL,
  total_passages INTEGER NOT NULL DEFAULT 10,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  total_time_ms INTEGER DEFAULT 0
);

-- Passage results
CREATE TABLE passage_results (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  passage_index INTEGER NOT NULL,
  passage_id INTEGER NOT NULL,
  screenshot_r2_key TEXT,
  cursor_history_r2_key TEXT,
  is_complete INTEGER DEFAULT 0,
  wrong_attempts INTEGER DEFAULT 0,
  time_spent_ms INTEGER DEFAULT 0,
  final_selected_answer TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, passage_index)
);

-- Passage attempts (all Gemini responses)
CREATE TABLE passage_attempts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  passage_index INTEGER NOT NULL,
  attempt_number INTEGER NOT NULL,
  selected_answer TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  gemini_response TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_sessions_nickname ON sessions(nickname);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_passage_results_session ON passage_results(session_id);
CREATE INDEX idx_passage_attempts_session ON passage_attempts(session_id);
CREATE INDEX idx_passage_attempts_passage ON passage_attempts(session_id, passage_index);
