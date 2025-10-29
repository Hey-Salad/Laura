-- Passwordless Authentication Schema
-- Magic link authentication system

-- Users table (simplified for magic link auth)
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text,
  role text not null default 'user',
  is_admin boolean default false,
  last_sign_in timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Magic links table - for passwordless authentication
create table if not exists public.magic_links (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  token text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Activity logs table - audit trail
create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  action text not null,
  resource text,
  details jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Add foreign key constraints after tables exist
alter table public.activity_logs
  add constraint fk_activity_logs_user_id
  foreign key (user_id) references public.users(id) on delete set null;

-- Create indexes
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_magic_links_token on public.magic_links(token);
create index if not exists idx_magic_links_email on public.magic_links(email);
create index if not exists idx_magic_links_expires_at on public.magic_links(expires_at);
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);

-- Enable RLS
alter table public.users enable row level security;
alter table public.magic_links enable row level security;
alter table public.activity_logs enable row level security;

-- RLS Policies for users table
create policy "Public can read users" on public.users
  for select using (true);

create policy "Service role manage users" on public.users
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- RLS Policies for magic_links table
create policy "Service role manage magic links" on public.magic_links
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- RLS Policies for activity_logs table
create policy "Public can read activity logs" on public.activity_logs
  for select using (true);

create policy "Service role manage activity logs" on public.activity_logs
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Trigger to auto-update updated_at on users
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at
  before update on public.users
  for each row execute procedure update_updated_at_column();

-- Function to clean up expired magic links (run periodically)
create or replace function cleanup_expired_magic_links()
returns void as $$
begin
  delete from public.magic_links
  where expires_at < now() - interval '1 day';
end;
$$ language plpgsql security definer;
