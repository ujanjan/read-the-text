-- Migration to rename nickname column to email
-- Note: SQLite doesn't support direct column rename before 3.25.0
-- This migration creates a new table with the correct schema and migrates data

-- Create new sessions table with email column
CREATE TABLE sessions_new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed')),
  current_passage_index INTEGER DEFAULT 0,
  passage_order TEXT NOT NULL,
  total_passages INTEGER NOT NULL DEFAULT 10,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  total_time_ms INTEGER DEFAULT 0
);

-- Copy data from old table to new table
INSERT INTO sessions_new (id, email, status, current_passage_index, passage_order, total_passages, created_at, completed_at, total_time_ms)
SELECT id, nickname, status, current_passage_index, passage_order, total_passages, created_at, completed_at, total_time_ms
FROM sessions;

-- Drop old table
DROP TABLE sessions;

-- Rename new table to sessions
ALTER TABLE sessions_new RENAME TO sessions;

-- Recreate indexes
DROP INDEX IF EXISTS idx_sessions_nickname;
CREATE INDEX idx_sessions_email ON sessions(email);
CREATE INDEX idx_sessions_status ON sessions(status);
