-- Admin flag, restricted to specific accounts (set manually, not self-service)
alter table profiles add column is_admin boolean not null default false;

-- Materialize tier assignments so they can be hand-edited instead of always
-- being recomputed from odds_rank + tier_size.
create table pool_tier_assignments (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  golf_player_id uuid not null references golf_players(id) on delete cascade,
  tier_number int not null,
  unique (pool_id, golf_player_id)
);

alter table pool_tier_assignments enable row level security;

create policy "tier assignments are viewable by everyone" on pool_tier_assignments
  for select using (true);

create policy "pool owner or admin can manage tier assignments" on pool_tier_assignments
  for all using (
    exists (select 1 from pools where pools.id = pool_tier_assignments.pool_id and pools.owner_id = auth.uid())
    or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin)
  );

-- Let admins manage any pool/tier config, not just their own
create policy "admin can update any pool" on pools for update using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin)
);
create policy "admin can delete any pool" on pools for delete using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin)
);
create policy "admin can manage any pool tiers" on pool_tiers for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin)
);
