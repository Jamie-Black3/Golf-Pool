import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader, StatusPill, ToPar, OddsLabel } from "@/components/ui";
import { joinPool } from "../actions";
import { Leaderboard } from "./Leaderboard";
import { PoolTabs } from "./PoolTabs";

type EntryPick = {
  golf_players: { name: string; to_par: number | null; status: string | null } | null;
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
  } | null;
};

export default async function PoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pool } = await supabase
    .from("pools")
    .select("id, name, owner_id, picks_per_entry, tournaments(name, status)")
    .eq("id", id)
    .single<{
      id: string;
      name: string;
      owner_id: string;
      picks_per_entry: number;
      tournaments: { name: string; status: string } | null;
    }>();

  const { data: entries } = await supabase
    .from("pool_entries")
    .select("id, user_id, profiles(account_name), entry_picks(golf_players(name, to_par, status))")
    .eq("pool_id", id)
    .returns<Entry[]>();

  const { data: fieldRows } = await supabase
    .from("pool_tier_assignments")
    .select("tier_number, golf_players(id, name, odds_rank, win_prob, to_par, status)")
    .eq("pool_id", id)
    .returns<FieldRow[]>();

  if (!pool) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-muted">Pool not found.</p>
      </div>
    );
  }

  const started = pool.tournaments?.status !== "upcoming";

  const leaderboard = (entries ?? [])
    .map((entry) => {
      const picks = entry.entry_picks
        .map((p) => p.golf_players)
        .filter((g): g is { name: string; to_par: number | null; status: string | null } => !!g);
      const total = picks.reduce((sum, g) => sum + (g.to_par ?? 0), 0);
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

  const field = (fieldRows ?? [])
    .filter((r) => r.golf_players)
    .map((r) => ({ tier: r.tier_number, ...r.golf_players! }))
    .sort((a, b) => (a.odds_rank ?? 9999) - (b.odds_rank ?? 9999));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <BackLink href="/">Back home</BackLink>
      <PageHeader
        title={pool.name}
        subtitle={
          <span className="inline-flex items-center gap-2">
            {pool.tournaments?.name}
            {pool.tournaments && <StatusPill status={pool.tournaments.status} />}
            <span className="text-muted">· {pool.picks_per_entry} picks</span>
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

      <PoolTabs
        standings={
          <div className="flex flex-col gap-2">
            {!started && (
              <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--accent) 6%, transparent)" }}>
                <span className="font-medium text-foreground">Not started yet.</span>{" "}
                <span className="text-muted">
                  Scores appear once {pool.tournaments?.name} tees off. Standings sort
                  by lowest combined score to par.
                </span>
              </div>
            )}
            {leaderboard.length === 0 ? (
              <div className="card p-6">
                <p className="hint">No entries yet — be the first to join.</p>
              </div>
            ) : (
              <>
                <span className="text-xs text-muted">Tap a row to see golfer scores.</span>
                <Leaderboard entries={leaderboard} currentUserId={user?.id} started={started} />
              </>
            )}
          </div>
        }
        field={
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted">
              Full field ranked by betting odds · {field.length} golfers
            </span>
            <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
              {field.map((g) => {
                const cut = g.status && /cut|withdraw|wd|dq/i.test(g.status);
                return (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span className="w-6 flex-none text-center text-xs font-semibold text-muted">
                      {g.odds_rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {g.name}
                      {cut && (
                        <span className="ml-2 text-xs font-medium text-red-600 dark:text-red-400">
                          {g.status}
                        </span>
                      )}
                    </span>
                    <span className="w-14 flex-none text-right">
                      <OddsLabel prob={g.win_prob} />
                    </span>
                    <span className="flex-none rounded-full border px-2 py-0.5 text-xs font-medium text-muted" style={{ borderColor: "var(--border)" }}>
                      T{g.tier}
                    </span>
                    <span className="w-10 flex-none text-right">
                      {started ? <ToPar value={g.to_par ?? 0} /> : <span className="text-muted">—</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        }
      />
    </div>
  );
}
