import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader, StatusPill, ToPar } from "@/components/ui";
import { joinPool } from "../actions";

type EntryPick = {
  golf_players: { name: string; to_par: number | null } | null;
};

type Entry = {
  id: string;
  user_id: string;
  profiles: { account_name: string } | null;
  entry_picks: EntryPick[];
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
    .select("id, user_id, profiles(account_name), entry_picks(golf_players(name, to_par))")
    .eq("pool_id", id)
    .returns<Entry[]>();

  if (!pool) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-muted">Pool not found.</p>
      </div>
    );
  }

  const leaderboard = (entries ?? [])
    .map((entry) => {
      const picks = entry.entry_picks
        .map((p) => p.golf_players)
        .filter((g): g is { name: string; to_par: number | null } => !!g);
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

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <div className="card p-6">
            <p className="hint">No entries yet — be the first to join.</p>
          </div>
        ) : (
          <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
            {leaderboard.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 px-4 py-3 ${
                  entry.userId === user?.id ? "bg-[color-mix(in_srgb,var(--accent)_7%,transparent)]" : ""
                }`}
                style={{ borderColor: "var(--border)" }}
              >
                <span className="w-5 flex-none text-center text-sm font-semibold text-muted">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {entry.accountName}
                    {entry.userId === user?.id && (
                      <span className="ml-1.5 text-xs font-normal text-accent">you</span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {entry.picks.length > 0
                      ? entry.picks.map((p) => p.name).join(", ")
                      : "No picks yet"}
                  </div>
                </div>
                <ToPar value={entry.total} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
