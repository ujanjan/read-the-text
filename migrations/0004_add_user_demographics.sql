-- Migration 0004: Add User Demographics
-- Adds demographic data collection fields to sessions table
-- Created: 2025-11-24
-- Purpose: Collect age, university status, English fluency, first language, and SWESAT experience

-- Add demographic fields to sessions table
ALTER TABLE sessions ADD COLUMN age INTEGER;
ALTER TABLE sessions ADD COLUMN has_attended_university TEXT CHECK(has_attended_university IN ('yes', 'no', 'currently_attending'));
ALTER TABLE sessions ADD COLUMN english_fluency TEXT CHECK(english_fluency IN ('not_at_all', 'young_age', 'high_school', 'university', 'first_language'));
ALTER TABLE sessions ADD COLUMN first_language TEXT;
ALTER TABLE sessions ADD COLUMN completed_swesat TEXT CHECK(completed_swesat IN ('yes', 'no', 'unsure'));

-- Create indexes for demographic queries (useful for filtering in admin)
CREATE INDEX idx_sessions_age ON sessions(age);
CREATE INDEX idx_sessions_english_fluency ON sessions(english_fluency);
CREATE INDEX idx_sessions_university ON sessions(has_attended_university);
