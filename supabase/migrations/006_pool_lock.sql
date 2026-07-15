-- Lets a pool's tiers be frozen so odds-driven re-seeding can't reshuffle them.
-- A pool is also treated as frozen automatically once any entry has picks.
alter table pools add column if not exists locked_at timestamptz;
