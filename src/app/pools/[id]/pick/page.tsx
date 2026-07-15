import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitPicks } from "../../actions";

type Golfer = { id: string; name: string; odds_rank: number | null };

export default async function PickPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: poolId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pool } = await supabase
    .from("pools")
    .select("id, name, tournament_id, picks_per_entry, tournaments(name)")
    .eq("id", poolId)
    .single<{
      id: string;
      name: string;
      tournament_id: string;
      picks_per_entry: number;
      tournaments: { name: string } | null;
    }>();

  if (!pool) redirect("/");

  const { data: entry } = await supabase
    .from("pool_entries")
    .select("id")
    .eq("pool_id", poolId)
    .eq("user_id", user.id)
    .single<{ id: string }>();

  if (!entry) redirect(`/pools/${poolId}`);

  const { data: poolTiers } = await supabase
    .from("pool_tiers")
    .select("tier_number, tier_size")
    .eq("pool_id", poolId)
    .order("tier_number")
    .returns<{ tier_number: number; tier_size: number }[]>();

  const { data: golfers } = await supabase
    .from("golf_players")
    .select("id, name, odds_rank")
    .eq("tournament_id", pool.tournament_id)
    .order("odds_rank", { ascending: true, nullsFirst: false })
    .returns<Golfer[]>();

  const { data: existingPicks } = await supabase
    .from("entry_picks")
    .select("golf_player_id")
    .eq("entry_id", entry.id)
    .returns<{ golf_player_id: string }[]>();

  const selectedIds = new Set((existingPicks ?? []).map((p) => p.golf_player_id));

  const tierGroups: { tierNumber: number; golfers: Golfer[] }[] = [];
  let cursor = 0;
  for (const t of poolTiers ?? []) {
    tierGroups.push({
      tierNumber: t.tier_number,
      golfers: (golfers ?? []).slice(cursor, cursor + t.tier_size),
    });
    cursor += t.tier_size;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Pick your golfers
        </h1>
        <p className="text-sm text-zinc-500">
          {pool.name} &middot; {pool.tournaments?.name}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Pick {pool.picks_per_entry} golfer(s), one per tier, from any{" "}
          {pool.picks_per_entry} tiers you choose.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <form action={submitPicks} className="flex flex-col gap-6">
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="poolId" value={poolId} />

        {tierGroups.map(({ tierNumber, golfers: tierGolfers }) => (
          <div key={tierNumber}>
            <h2 className="mb-2 text-sm font-medium text-zinc-500">
              Tier {tierNumber}
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-400 has-checked:border-zinc-900 has-checked:text-zinc-900 dark:border-zinc-700 dark:has-checked:border-zinc-50 dark:has-checked:text-zinc-50">
                <input
                  type="radio"
                  name={`tier-${tierNumber}`}
                  value=""
                  defaultChecked={
                    !tierGolfers.some((g) => selectedIds.has(g.id))
                  }
                />
                No pick from this tier
              </label>
              {tierGolfers.map((golfer) => (
                <label
                  key={golfer.id}
                  className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm has-checked:border-zinc-900 has-checked:bg-zinc-50 dark:border-zinc-800 dark:has-checked:border-zinc-50 dark:has-checked:bg-zinc-900"
                >
                  <input
                    type="radio"
                    name={`tier-${tierNumber}`}
                    value={golfer.id}
                    defaultChecked={selectedIds.has(golfer.id)}
                  />
                  {golfer.name}
                </label>
              ))}
            </div>
          </div>
        ))}

        <button
          type="submit"
          className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Save picks
        </button>
      </form>
    </div>
  );
}
