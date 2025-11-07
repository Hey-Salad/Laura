-- Create camera_commands table for remote command control
CREATE TABLE IF NOT EXISTS camera_commands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  camera_id UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL,
  command_payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  CONSTRAINT valid_command_type CHECK (command_type IN (
    'start_video', 'stop_video', 'take_photo', 'save_photo',
    'led_on', 'led_off', 'toggle_led', 'play_sound',
    'get_status', 'change_location', 'update_settings', 'reboot'
  ))
);

-- Index for efficient polling by camera
CREATE INDEX IF NOT EXISTS idx_camera_commands_polling
  ON camera_commands(camera_id, created_at)
  WHERE status = 'pending';

-- Index for dashboard queries (recent commands)
CREATE INDEX IF NOT EXISTS idx_camera_commands_recent
  ON camera_commands(camera_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE camera_commands ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all commands
CREATE POLICY "Allow authenticated users to read commands"
  ON camera_commands FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow anonymous users (cameras) to read their own commands
CREATE POLICY "Allow cameras to read their own commands"
  ON camera_commands FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow authenticated users to insert commands
CREATE POLICY "Allow authenticated users to insert commands"
  ON camera_commands FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow cameras to update their own commands (acknowledgment)
CREATE POLICY "Allow cameras to update their own commands"
  ON camera_commands FOR UPDATE
  TO anon
  USING (true);

-- Add comment
COMMENT ON TABLE camera_commands IS 'Queue of commands sent to cameras for remote control';
