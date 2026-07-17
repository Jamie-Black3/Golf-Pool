import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusPill, ToPar } from "@/components/ui";
import { scoreEntry } from "@/lib/scoring";

type MyEntry = {
  pool_id: string;
  pools: {
    id: string;
    name: string;
    counting_picks: number | null;
    tournaments: { name: string; status: string } | null;
  } | null;
};

type PoolEntry = {
  pool_id: string;
  user_id: string;
  entry_picks: { golf_players: { to_par: number | null; status: string | null } | null }[];
};

export default async function Home() {
  const supabase = await createClient();

  // User and the all-pools list are independent — fetch together.
  const [{ data: userData }, { data: pools }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("pools")
      .select("id, name, tournaments(name, status)")
      .order("created_at", { ascending: false })
      .returns<
        { id: string; name: string; tournaments: { name: string; status: string } | null }[]
      >(),
  ]);
  const user = userData.user;

  // "My Pools" — pools the signed-in user has an entry in, with rank + score.
  let myPools: {
    id: string;
    name: string;
    tournament: string;
    status: string;
    started: boolean;
    rank: number;
    total: number;
    entrants: number;
  }[] = [];

  if (user) {
    const { data: mine } = await supabase
      .from("pool_entries")
      .select("pool_id, pools(id, name, counting_picks, tournaments(name, status))")
      .eq("user_id", user.id)
      .returns<MyEntry[]>();

    const poolIds = (mine ?? []).map((m) => m.pool_id);

    if (poolIds.length > 0) {
      const { data: allEntries } = await supabase
        .from("pool_entries")
        .select("pool_id, user_id, entry_picks(golf_players(to_par, status))")
        .in("pool_id", poolIds)
        .returns<PoolEntry[]>();

      myPools = (mine ?? [])
        .filter((m) => m.pools)
        .map((m) => {
          const pool = m.pools!;
          const entries = (allEntries ?? []).filter((e) => e.pool_id === m.pool_id);
          const standings = entries
            .map((e) => {
              const picks = e.entry_picks
                .map((p) => p.golf_players)
                .filter((g): g is { to_par: number | null; status: string | null } => !!g);
              return {
                userId: e.user_id,
                total: scoreEntry(picks, pool.counting_picks).total,
              };
            })
            .sort((a, b) => a.total - b.total);
          const rank = standings.findIndex((s) => s.userId === user.id) + 1;
          const me = standings.find((s) => s.userId === user.id);
          return {
            id: pool.id,
            name: pool.name,
            tournament: pool.tournaments?.name ?? "",
            status: pool.tournaments?.status ?? "upcoming",
            started: pool.tournaments?.status !== "upcoming",
            rank,
            total: me?.total ?? 0,
            entrants: standings.length,
          };
        });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12">
      <div className="flex flex-col items-start gap-4 rounded-2xl border bg-surface p-8" style={{ borderColor: "var(--border)" }}>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-xl">⛳</div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Golf Pool</h1>
          <p className="mt-1 max-w-md text-muted">
            Draft golfers by tier, track live tournament scores, and see who&apos;s
            leading — lowest combined score to par wins.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={user ? "/pools/new" : "/login"} className="btn btn-primary">
            {user ? "Create a pool" : "Sign in to start"}
          </Link>
          <Link href="/leaderboard" className="btn btn-secondary">
            Leaderboard
          </Link>
        </div>
      </div>

      {myPools.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">My pools</h2>
          <ul className="flex flex-col gap-2.5">
            {myPools.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/pools/${p.id}`}
                  className="card flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:border-accent"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{p.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-sm text-muted">
                      <span className="truncate">{p.tournament}</span>
                      <StatusPill status={p.status} />
                    </div>
                  </div>
                  <div className="flex flex-none flex-col items-end">
                    <span className="text-sm font-semibold text-foreground">
                      {p.started ? <ToPar value={p.total} /> : <span className="text-muted">—</span>}
                    </span>
                    <span className="text-xs text-muted">
                      {p.rank > 0 ? `${ordinal(p.rank)} / ${p.entrants}` : `${p.entrants} entrants`}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">All pools</h2>
        {!pools || pools.length === 0 ? (
          <div className="card p-6">
            <p className="hint">No pools yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {pools.map((pool) => (
              <li key={pool.id}>
                <Link
                  href={`/pools/${pool.id}`}
                  className="card flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:border-accent"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{pool.name}</div>
                    <div className="truncate text-sm text-muted">{pool.tournaments?.name}</div>
                  </div>
                  <div className="flex flex-none items-center gap-3">
                    {pool.tournaments && <StatusPill status={pool.tournaments.status} />}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
