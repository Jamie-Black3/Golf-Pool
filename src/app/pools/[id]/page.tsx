import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, name, tournaments(name, status)")
    .eq("id", id)
    .single<{
      id: string;
      name: string;
      tournaments: { name: string; status: string } | null;
    }>();

  const { data: entries } = await supabase
    .from("pool_entries")
    .select("id, user_id, profiles(account_name), entry_picks(golf_players(name, to_par))")
    .eq("pool_id", id)
    .returns<Entry[]>();

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
  const joinPoolWithId = joinPool.bind(null, id);

  if (!pool) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-zinc-500">Pool not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          {pool.name}
        </h1>
        <p className="text-sm text-zinc-500">
          {pool.tournaments?.name} &middot; {pool.tournaments?.status}
        </p>
      </div>

      {user ? (
        myEntry ? (
          <Link
            href={`/pools/${id}/pick`}
            className="w-fit rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Edit my picks
          </Link>
        ) : (
          <form action={joinPoolWithId}>
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Join pool &amp; pick golfers
            </button>
          </form>
        )
      ) : (
        <Link href="/login" className="text-sm underline">
          Sign in to join
        </Link>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-zinc-500">
          Leaderboard
        </h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-zinc-500">No entries yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                <th className="py-2">#</th>
                <th className="py-2">Account</th>
                <th className="py-2">Picks</th>
                <th className="py-2 text-right">To Par</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <tr
                  key={entry.id}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2">{entry.accountName}</td>
                  <td className="py-2 text-zinc-500">
                    {entry.picks.map((p) => p.name).join(", ")}
                  </td>
                  <td className="py-2 text-right font-medium">
                    {entry.total > 0 ? `+${entry.total}` : entry.total === 0 ? "E" : entry.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
