-- Profiles: one row per user, holds the display name used on leaderboards
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_name text not null,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, account_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'account_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Tournaments pulled from ESPN
create table tournaments (
  id uuid primary key default gen_random_uuid(),
  espn_event_id text not null unique,
  name text not null,
  start_date date,
  end_date date,
  status text not null default 'upcoming', -- upcoming | live | complete
  created_at timestamptz not null default now()
);

-- Golfers in a tournament's field, with a tier for the draft
create table golf_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  espn_athlete_id text not null,
  name text not null,
  tier int not null, -- 1 = top tier, 2 = next tier, etc.
  to_par int, -- refreshed from ESPN on each fetch
  status text, -- e.g. active, cut, withdrawn
  updated_at timestamptz not null default now(),
  unique (tournament_id, espn_athlete_id)
);

-- A pool is one "contest" tied to a tournament
create table pools (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  owner_id uuid not null references profiles(id) on delete cascade,
  picks_per_entry int not null default 1, -- how many golfers picked per tier
  created_at timestamptz not null default now()
);

-- One entry per user per pool
create table pool_entries (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (pool_id, user_id)
);

-- The golfers a given entry picked
create table entry_picks (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references pool_entries(id) on delete cascade,
  golf_player_id uuid not null references golf_players(id) on delete cascade,
  unique (entry_id, golf_player_id)
);

-- Row Level Security
alter table profiles enable row level security;
alter table tournaments enable row level security;
alter table golf_players enable row level security;
alter table pools enable row level security;
alter table pool_entries enable row level security;
alter table entry_picks enable row level security;

-- Everyone (logged in) can read all of these; writes are scoped to the owning user
create policy "profiles are viewable by everyone" on profiles for select using (true);
create policy "users can update own profile" on profiles for update using (auth.uid() = id);

create policy "tournaments are viewable by everyone" on tournaments for select using (true);
create policy "golf players are viewable by everyone" on golf_players for select using (true);

create policy "pools are viewable by everyone" on pools for select using (true);
create policy "authenticated users can create pools" on pools for insert with check (auth.uid() = owner_id);

create policy "entries are viewable by everyone" on pool_entries for select using (true);
create policy "users can create their own entry" on pool_entries for insert with check (auth.uid() = user_id);
create policy "users can delete their own entry" on pool_entries for delete using (auth.uid() = user_id);

create policy "picks are viewable by everyone" on entry_picks for select using (true);
create policy "users can manage picks on their own entry" on entry_picks for all using (
  exists (select 1 from pool_entries where pool_entries.id = entry_picks.entry_id and pool_entries.user_id = auth.uid())
);
