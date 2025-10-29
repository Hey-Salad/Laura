-- Set CAM001 location to HeySalad Berlin Alexanderplatz
-- Run this in Supabase SQL Editor

UPDATE cameras
SET
  assigned_to = 'HeySalad Berlin Alexanderplatz',
  location_lat = 52.5219,  -- Berlin Alexanderplatz coordinates
  location_lon = 13.4132,
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{location_name}',
    '"HeySalad Berlin Alexanderplatz"'
  ),
  updated_at = now()
WHERE camera_id = 'CAM001';

-- Verify update
SELECT
  camera_id,
  camera_name,
  assigned_to,
  location_lat,
  location_lon,
  metadata->>'location_name' as location_name
FROM cameras
WHERE camera_id = 'CAM001';
