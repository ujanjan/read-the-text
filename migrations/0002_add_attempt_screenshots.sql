-- Add screenshot storage to passage_attempts
ALTER TABLE passage_attempts ADD COLUMN screenshot_r2_key TEXT;

-- Create index for efficient cleanup
CREATE INDEX idx_passage_attempts_screenshot ON passage_attempts(screenshot_r2_key) WHERE screenshot_r2_key IS NOT NULL;
