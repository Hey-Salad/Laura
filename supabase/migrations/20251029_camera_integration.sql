-- ESP32-S3 AI Camera Integration Schema
-- Run this in Supabase SQL Editor

-- Cameras table
create table if not exists cameras (
  id uuid primary key default uuid_generate_v4(),
  camera_id text unique not null, -- Hardware device ID
  camera_name text not null,
  device_type text not null default 'esp32-s3-ai',
  firmware_version text,
  assigned_to text, -- Driver name or location
  status text not null check (status in ('online', 'offline', 'busy', 'error')) default 'offline',
  battery_level integer check (battery_level >= 0 and battery_level <= 100),
  wifi_signal integer, -- RSSI
  last_seen timestamptz,
  location_lat double precision,
  location_lon double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

-- Camera photos table
create table if not exists camera_photos (
  id uuid primary key default uuid_generate_v4(),
  camera_id uuid references cameras(id) on delete cascade not null,
  photo_url text not null, -- Supabase Storage URL
  thumbnail_url text,
  taken_at timestamptz not null default now(),
  command_id text, -- Reference to command that triggered photo
  metadata jsonb default '{}'::jsonb, -- Location, AI detections, etc.
  created_at timestamptz not null default now()
);

-- Camera commands table (for logging)
create table if not exists camera_commands (
  id uuid primary key default uuid_generate_v4(),
  camera_id uuid references cameras(id) on delete cascade not null,
  command_type text not null, -- 'take_photo', 'start_video', 'get_status', etc.
  command_payload jsonb default '{}'::jsonb,
  status text not null check (status in ('pending', 'sent', 'completed', 'failed', 'timeout')) default 'pending',
  sent_at timestamptz,
  completed_at timestamptz,
  response jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_cameras_status on cameras(status);
create index if not exists idx_cameras_last_seen on cameras(last_seen desc);
create index if not exists idx_camera_photos_camera_id on camera_photos(camera_id);
create index if not exists idx_camera_photos_taken_at on camera_photos(taken_at desc);
create index if not exists idx_camera_commands_camera_id on camera_commands(camera_id);
create index if not exists idx_camera_commands_status on camera_commands(status);

-- RLS Policies
alter table cameras enable row level security;
alter table camera_photos enable row level security;
alter table camera_commands enable row level security;

create policy "Service role manage cameras" on cameras
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role manage photos" on camera_photos
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role manage commands" on camera_commands
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Supabase Storage bucket for photos
-- Create this via Supabase Dashboard → Storage → New Bucket
-- Bucket name: camera-photos
-- Public: true (or false with signed URLs)

-- Insert a sample camera for testing
insert into cameras (camera_id, camera_name, device_type, status, assigned_to)
values ('CAM001', 'HeySalad Camera 1', 'esp32-s3-ai', 'offline', 'Driver 1')
on conflict (camera_id) do nothing;
