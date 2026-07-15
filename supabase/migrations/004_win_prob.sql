-- Store each golfer's implied win probability (averaged across books) so the
-- UI can display actual odds, not just the derived rank.
alter table golf_players add column win_prob real;
