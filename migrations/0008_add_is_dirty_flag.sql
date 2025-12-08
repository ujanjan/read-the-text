-- Add is_dirty flag to sessions table
ALTER TABLE sessions ADD COLUMN is_dirty INTEGER DEFAULT 0;

-- Index for filtering
CREATE INDEX idx_sessions_is_dirty ON sessions(is_dirty);
