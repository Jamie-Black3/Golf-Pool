-- Live play progress from ESPN: holes completed in the current round, and which
-- round it is. Used for the "Thru" column on the golf leaderboard.
alter table golf_players add column if not exists thru int;
alter table golf_players add column if not exists round int;
