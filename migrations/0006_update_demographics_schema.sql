-- Migration 0006: Update Demographics Schema
-- Updates English fluency to CEFR levels, removes first_language, and removes 'unsure' from SWESAT
-- Created: 2025-11-28
-- Purpose: Align database schema with updated form requirements

-- Note: SQLite doesn't support modifying CHECK constraints directly
-- We need to recreate the columns with new constraints

-- Step 1: Drop the index on english_fluency first
DROP INDEX IF EXISTS idx_sessions_english_fluency;

-- Step 2: Create temporary columns with new constraints
ALTER TABLE sessions ADD COLUMN english_fluency_new TEXT CHECK(english_fluency_new IN ('native', 'c1_c2', 'b2', 'b1', 'a1_a2'));
ALTER TABLE sessions ADD COLUMN completed_swesat_new TEXT CHECK(completed_swesat_new IN ('yes', 'no'));

-- Step 3: Copy data from old columns to new columns (this will be NULL for existing data since we changed the values)
-- For existing data, we'll just leave it as NULL since the old values don't map cleanly to CEFR levels

-- Step 4: Drop old columns
-- Note: SQLite doesn't support DROP COLUMN in older versions, but Cloudflare D1 supports it
ALTER TABLE sessions DROP COLUMN english_fluency;
ALTER TABLE sessions DROP COLUMN first_language;
ALTER TABLE sessions DROP COLUMN completed_swesat;

-- Step 5: Rename new columns to original names
ALTER TABLE sessions RENAME COLUMN english_fluency_new TO english_fluency;
ALTER TABLE sessions RENAME COLUMN completed_swesat_new TO completed_swesat;

-- Step 6: Recreate index for english_fluency
CREATE INDEX idx_sessions_english_fluency ON sessions(english_fluency);
