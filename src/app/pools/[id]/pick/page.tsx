import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitPicks } from "../../actions";

type Golfer = { id: string; name: string; tier: number };

export default async function PickPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: poolId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pool } = await supabase
    .from("pools")
    .select("id, name, tournament_id, tournaments(name)")
    .eq("id", poolId)
    .single<{
      id: string;
      name: string;
      tournament_id: string;
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

  const { data: golfers } = await supabase
    .from("golf_players")
    .select("id, name, tier")
    .eq("tournament_id", pool.tournament_id)
    .order("name")
    .returns<Golfer[]>();

  const { data: existingPicks } = await supabase
    .from("entry_picks")
    .select("golf_player_id")
    .eq("entry_id", entry.id)
    .returns<{ golf_player_id: string }[]>();

  const selectedIds = new Set((existingPicks ?? []).map((p) => p.golf_player_id));

  const tiers = Array.from(
    new Set((golfers ?? []).map((g) => g.tier))
  ).sort((a, b) => a - b);

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
          Pick one golfer from each tier.
        </p>
      </div>

      <form action={submitPicks} className="flex flex-col gap-6">
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="poolId" value={poolId} />

        {tiers.map((tier) => (
          <div key={tier}>
            <h2 className="mb-2 text-sm font-medium text-zinc-500">
              Tier {tier}
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(golfers ?? [])
                .filter((g) => g.tier === tier)
                .map((golfer) => (
                  <label
                    key={golfer.id}
                    className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm has-checked:border-zinc-900 has-checked:bg-zinc-50 dark:border-zinc-800 dark:has-checked:border-zinc-50 dark:has-checked:bg-zinc-900"
                  >
                    <input
                      type="radio"
                      name={`tier-${tier}`}
                      value={golfer.id}
                      defaultChecked={selectedIds.has(golfer.id)}
                      required
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
