-- Meshtastic IoT Device Management Tables
-- This schema supports device provisioning, tracking, and monitoring

-- Devices table - tracks all Meshtastic devices
create table if not exists devices (
  id uuid primary key default uuid_generate_v4(),
  device_id text unique not null, -- Meshtastic device ID / hardware ID
  device_name text not null,
  device_type text not null default 'meshtastic',
  firmware_version text,
  hardware_model text,
  mac_address text,
  basket_id uuid references baskets(id) on delete set null,
  status text not null check (status in ('active', 'inactive', 'provisioning', 'maintenance', 'decommissioned')) default 'provisioning',
  battery_level integer check (battery_level >= 0 and battery_level <= 100),
  signal_strength integer,
  last_seen timestamptz,
  location_lat double precision,
  location_lon double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

-- Device telemetry table - stores time-series telemetry data
create table if not exists device_telemetry (
  id uuid primary key default uuid_generate_v4(),
  device_id uuid references devices(id) on delete cascade not null,
  timestamp timestamptz not null default now(),
  battery_level integer,
  signal_strength integer,
  temperature numeric(5, 2),
  location_lat double precision,
  location_lon double precision,
  speed numeric(5, 2),
  altitude numeric(8, 2),
  satellites integer,
  voltage numeric(5, 2),
  current numeric(5, 2),
  rssi integer,
  snr numeric(5, 2),
  raw_data jsonb default '{}'::jsonb
);

-- Device provisioning table - tracks provisioning workflow
create table if not exists device_provisioning (
  id uuid primary key default uuid_generate_v4(),
  device_id uuid references devices(id) on delete cascade not null,
  provisioning_status text not null check (provisioning_status in ('pending', 'in_progress', 'completed', 'failed')) default 'pending',
  provisioning_step text,
  provisioning_data jsonb default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Device alerts table - tracks anomalies and alerts
create table if not exists device_alerts (
  id uuid primary key default uuid_generate_v4(),
  device_id uuid references devices(id) on delete cascade not null,
  alert_type text not null check (alert_type in ('low_battery', 'offline', 'temperature', 'signal_loss', 'geofence', 'custom')),
  severity text not null check (severity in ('info', 'warning', 'critical')) default 'warning',
  message text not null,
  is_resolved boolean default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

-- Device commands table - for sending commands to devices
create table if not exists device_commands (
  id uuid primary key default uuid_generate_v4(),
  device_id uuid references devices(id) on delete cascade not null,
  command_type text not null,
  command_payload jsonb not null default '{}'::jsonb,
  status text not null check (status in ('pending', 'sent', 'acknowledged', 'failed', 'timeout')) default 'pending',
  sent_at timestamptz,
  acknowledged_at timestamptz,
  response jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

-- Create indexes for performance
create index if not exists idx_devices_basket_id on devices(basket_id);
create index if not exists idx_devices_status on devices(status);
create index if not exists idx_devices_last_seen on devices(last_seen desc);
create index if not exists idx_device_telemetry_device_id on device_telemetry(device_id);
create index if not exists idx_device_telemetry_timestamp on device_telemetry(timestamp desc);
create index if not exists idx_device_alerts_device_id on device_alerts(device_id);
create index if not exists idx_device_alerts_resolved on device_alerts(is_resolved);
create index if not exists idx_device_commands_device_id on device_commands(device_id);
create index if not exists idx_device_commands_status on device_commands(status);

-- Enable Row Level Security
alter table devices enable row level security;
alter table device_telemetry enable row level security;
alter table device_provisioning enable row level security;
alter table device_alerts enable row level security;
alter table device_commands enable row level security;

-- RLS Policies - allow public read for devices (for dashboard)
create policy "public read devices" on devices
  for select using (true);

create policy "service role manage devices" on devices
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "public read telemetry" on device_telemetry
  for select using (true);

create policy "service role manage telemetry" on device_telemetry
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "public read provisioning" on device_provisioning
  for select using (true);

create policy "service role manage provisioning" on device_provisioning
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "public read alerts" on device_alerts
  for select using (true);

create policy "service role manage alerts" on device_alerts
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "public read commands" on device_commands
  for select using (true);

create policy "service role manage commands" on device_commands
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger update_devices_updated_at
  before update on devices
  for each row execute procedure update_updated_at_column();
