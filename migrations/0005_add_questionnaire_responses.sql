-- Migration 0005: Add Questionnaire Responses
-- Adds table to store post-quiz questionnaire feedback
-- Created: 2025-11-27
-- Purpose: Collect user feedback about interface, AI feedback, and general experience

-- Create questionnaire_responses table
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  question_1_response TEXT,
  question_2_response TEXT,
  question_3_response TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Create index for efficient lookups by session
CREATE INDEX idx_questionnaire_session ON questionnaire_responses(session_id);

-- Create index for submitted_at for chronological queries
CREATE INDEX idx_questionnaire_submitted_at ON questionnaire_responses(submitted_at);
