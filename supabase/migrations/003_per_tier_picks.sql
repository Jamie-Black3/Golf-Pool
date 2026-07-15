-- Per-tier pick counts: how many golfers an entrant drafts FROM each tier.
-- Total picks per entry = sum(picks_allowed) across the pool's tiers (capped
-- at 15 in the app). Default 1 preserves the old "one pick per tier" behavior
-- for any existing pools.
alter table pool_tiers add column picks_allowed int not null default 1;
