create extension if not exists "uuid-ossp";

create table if not exists drivers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null,
  total_deliveries integer not null default 0,
  rating numeric(3, 2) not null default 5.00,
  created_at timestamptz not null default now()
);

create table if not exists baskets (
  id uuid primary key default uuid_generate_v4(),
  lat double precision not null,
  lon double precision not null,
  temperature numeric(5, 2),
  driver_id uuid references drivers(id) on delete set null,
  status text not null check (status in ('active', 'delivered', 'delayed')) default 'active',
  cost numeric(8, 2),
  time_estimate interval,
  updated_at timestamptz not null default now()
);

alter table baskets enable row level security;
alter table drivers enable row level security;

create policy "public read baskets" on baskets
  for select using (true);

create policy "public read drivers" on drivers
  for select using (true);

create policy "service role update baskets" on baskets
  for update using (auth.role() = 'service_role');

create policy "service role insert baskets" on baskets
  for insert with check (auth.role() = 'service_role');

create table if not exists driver_rewards (
  id uuid primary key default uuid_generate_v4(),
  driver_id uuid references drivers(id) on delete cascade,
  basket_id uuid references baskets(id) on delete set null,
  minutes_under_eta integer not null,
  created_at timestamptz not null default now()
);

alter table driver_rewards enable row level security;

create policy "service role manage driver rewards" on driver_rewards
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  customer text not null,
  status text not null,
  basket_id uuid references baskets(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table orders enable row level security;

create policy "public read orders" on orders
  for select using (true);
