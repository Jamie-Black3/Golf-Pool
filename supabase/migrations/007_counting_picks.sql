-- How many of an entrant's best picks count toward their score (best N of M).
-- Null means all picks count.
alter table pools add column if not exists counting_picks int;
