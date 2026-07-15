-- Track when a tournament's scores were last pulled from ESPN, so on-view
-- refreshes can be throttled (many viewers => at most one ESPN pull per window).
alter table tournaments add column last_synced_at timestamptz;
