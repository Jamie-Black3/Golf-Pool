-- Move from a single global tier-per-golfer to pool-specific tier configuration,
-- and from arbitrary field order to an odds-based rank.

alter table golf_players drop column tier;
alter table golf_players add column odds_rank int;

alter table pools add column tier_count int not null default 4;
-- picks_per_entry already exists; now represents "how many tiers the entrant
-- drafts from" and is enforced <= tier_count at the application layer.

create table pool_tiers (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  tier_number int not null,
  tier_size int not null,
  unique (pool_id, tier_number)
);

alter table pool_tiers enable row level security;

create policy "pool tiers are viewable by everyone" on pool_tiers for select using (true);
create policy "pool owner can manage tiers" on pool_tiers for all using (
  exists (select 1 from pools where pools.id = pool_tiers.pool_id and pools.owner_id = auth.uid())
);
