import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader, StatusPill } from "@/components/ui";
import { GolfLeaderboard } from "@/components/GolfLeaderboard";
import { joinPool, setPoolLock } from "../actions";
import { scoreEntry, computePositions } from "@/lib/scoring";
import { Leaderboard } from "./Leaderboard";
import { PoolTabs } from "./PoolTabs";
import { LiveRefresh } from "./LiveRefresh";

type EntryPick = {
  golf_players: {
    id: string;
    name: string;
    to_par: number | null;
    status: string | null;
    thru: number | null;
  } | null;
};

type Entry = {
  id: string;
  user_id: string;
  profiles: { account_name: string } | null;
  entry_picks: EntryPick[];
};

type FieldRow = {
  tier_number: number;
  golf_players: {
    id: string;
    name: string;
    odds_rank: number | null;
    win_prob: number | null;
    to_par: number | null;
    status: string | null;
    thru: number | null;
    round: number | null;
  } | null;
};

export default async function PoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // These four don't depend on each other — run them in parallel.
  const [{ data: userData }, { data: pool }, { data: entries }, { data: fieldRows }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("pools")
        .select("id, name, owner_id, picks_per_entry, counting_picks, locked_at, tournaments(name, status, start_date, end_date)")
        .eq("id", id)
        .single<{
          id: string;
          name: string;
          owner_id: string;
          picks_per_entry: number;
          counting_picks: number | null;
          locked_at: string | null;
          tournaments: { name: string; status: string; start_date: string | null; end_date: string | null } | null;
        }>(),
      supabase
        .from("pool_entries")
        .select("id, user_id, profiles(account_name), entry_picks(golf_players(id, name, to_par, status, thru))")
        .eq("pool_id", id)
        .returns<Entry[]>(),
      supabase
        .from("pool_tier_assignments")
        .select("tier_number, golf_players(id, name, odds_rank, win_prob, to_par, status, thru, round)")
        .eq("pool_id", id)
        .returns<FieldRow[]>(),
    ]);
  const user = userData.user;

  if (!pool) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-muted">Pool not found.</p>
      </div>
    );
  }

  const started = pool.tournaments?.status !== "upcoming";
  const isLive = pool.tournaments?.status === "live";

  // Auto-refresh during the tournament's date window (also catches the
  // upcoming -> live flip on day one), but never once it's complete.
  const today = new Date().toISOString().slice(0, 10);
  const t = pool.tournaments;
  const inWindow =
    !!t?.start_date && !!t?.end_date && t.start_date <= today && today <= t.end_date;
  const showLiveRefresh = t?.status !== "complete" && (isLive || inWindow);

  const leaderboard = (entries ?? [])
    .map((entry) => {
      const rawPicks = entry.entry_picks
        .map((p) => p.golf_players)
        .filter(
          (g): g is { id: string; name: string; to_par: number | null; status: string | null; thru: number | null } => !!g
        );
      const { total, picks } = scoreEntry(rawPicks, pool.counting_picks);
      return {
        id: entry.id,
        userId: entry.user_id,
        accountName: entry.profiles?.account_name ?? "Unknown",
        picks,
        total,
      };
    })
    .sort((a, b) => a.total - b.total);

  const myEntry = leaderboard.find((e) => e.userId === user?.id);
  const isOwner = user?.id === pool.owner_id;
  const joinPoolWithId = joinPool.bind(null, id);

  // Tiers freeze once anyone has committed picks, or when the owner locks the
  // pool — after that, odds updates won't reshuffle which tier a golfer is in.
  const poolHasPicks = leaderboard.some((e) => e.picks.length > 0);
  const frozen = !!pool.locked_at || poolHasPicks;
  const canToggleLock = isOwner && pool.tournaments?.status === "upcoming";
  const lockPool = setPoolLock.bind(null, id, true);
  const unlockPool = setPoolLock.bind(null, id, false);

  const field = (fieldRows ?? [])
    .filter((r) => r.golf_players)
    .map((r) => ({ tier: r.tier_number, ...r.golf_players! }));

  // Golf leaderboard position (with ties) for each golfer, to show on picks.
  const positions = computePositions(field);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <BackLink href="/">Back home</BackLink>
      <PageHeader
        title={pool.name}
        subtitle={
          <span className="inline-flex items-center gap-2">
            {pool.tournaments?.name}
            {pool.tournaments && <StatusPill status={pool.tournaments.status} />}
            <span className="text-muted">
              ·{" "}
              {pool.counting_picks && pool.counting_picks < pool.picks_per_entry
                ? `best ${pool.counting_picks} of ${pool.picks_per_entry} count`
                : `${pool.picks_per_entry} picks`}
            </span>
          </span>
        }
        action={
          isOwner ? (
            <Link href={`/pools/${id}/tiers`} className="btn btn-secondary">
              Edit tiers
            </Link>
          ) : undefined
        }
      />

      {user ? (
        myEntry ? (
          <Link href={`/pools/${id}/pick`} className="btn btn-secondary w-fit">
            Edit my picks
          </Link>
        ) : (
          <form action={joinPoolWithId}>
            <button type="submit" className="btn btn-primary w-fit">
              Join pool &amp; pick golfers
            </button>
          </form>
        )
      ) : (
        <Link href="/login" className="btn btn-primary w-fit">
          Sign in to join
        </Link>
      )}

      {/* Freeze status + owner lock control */}
      {!started && (frozen || canToggleLock) && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={frozen ? "text-accent" : "text-muted"} aria-hidden>
              {frozen ? (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </>
              ) : (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </>
              )}
            </svg>
            <span className="text-foreground">
              {frozen
                ? poolHasPicks && !pool.locked_at
                  ? "Tiers frozen — picks have been made"
                  : "Tiers locked by owner"
                : "Tiers still update with odds"}
            </span>
          </div>
          {canToggleLock && (
            <form action={pool.locked_at ? unlockPool : lockPool}>
              <button type="submit" className="btn btn-secondary px-3 py-1.5">
                {pool.locked_at ? "Unlock tiers" : "Lock tiers now"}
              </button>
            </form>
          )}
        </div>
      )}

      <PoolTabs
        standings={
          <div className="flex flex-col gap-3">
            {showLiveRefresh && <LiveRefresh />}
            {!started && (
              <p className="text-sm text-muted">
                Not started — scores appear once play begins.
              </p>
            )}
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted">No entries yet.</p>
            ) : (
              <Leaderboard
                entries={leaderboard}
                currentUserId={user?.id}
                started={started}
                countingPicks={pool.counting_picks}
                positions={Object.fromEntries(positions)}
              />
            )}
          </div>
        }
        field={
          <div className="flex flex-col gap-3">
            <span className="text-sm text-muted">{field.length} player field</span>
            <GolfLeaderboard golfers={field} started={started} showTier />
          </div>
        }
      />
    </div>
  );
}
