-- Add camera authentication tokens
-- Generated: 2025-11-07

-- Add api_token column to cameras table for secure API access
ALTER TABLE cameras
ADD COLUMN IF NOT EXISTS api_token TEXT UNIQUE;

-- Create index on api_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_cameras_api_token ON cameras(api_token);

-- Function to generate a secure random token
CREATE OR REPLACE FUNCTION generate_camera_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Generate tokens for existing cameras
UPDATE cameras
SET api_token = generate_camera_token()
WHERE api_token IS NULL;

-- Add comment
COMMENT ON COLUMN cameras.api_token IS 'Secure API token for camera authentication';
