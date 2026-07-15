import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateTiers } from "../../actions";

export default async function TiersPage({
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
    .select("id, name, owner_id, tournament_id, tournaments(name)")
    .eq("id", poolId)
    .single<{
      id: string;
      name: string;
      owner_id: string;
      tournament_id: string;
      tournaments: { name: string } | null;
    }>();

  if (!pool) redirect("/");
  if (pool.owner_id !== user.id) redirect(`/pools/${poolId}`);

  const { count: fieldSize } = await supabase
    .from("golf_players")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", pool.tournament_id);

  const { data: tiers } = await supabase
    .from("pool_tiers")
    .select("tier_number, tier_size")
    .eq("pool_id", poolId)
    .order("tier_number")
    .returns<{ tier_number: number; tier_size: number }[]>();

  const total = fieldSize ?? 0;
  const assigned = (tiers ?? []).reduce((sum, t) => sum + t.tier_size, 0);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Set up tiers
        </h1>
        <p className="text-sm text-zinc-500">
          {pool.name} &middot; {pool.tournaments?.name} &middot; {total} golfers in field
        </p>
      </div>

      <p className="text-sm text-zinc-500">
        Tier 1 gets the golfers with the best odds to win, working down from
        there. Adjust how many golfers fall in each tier (must add up to{" "}
        {total}).
      </p>

      <form action={updateTiers} className="flex flex-col gap-3">
        <input type="hidden" name="poolId" value={poolId} />
        {(tiers ?? []).map((tier) => (
          <div key={tier.tier_number} className="flex items-center gap-3">
            <label className="w-16 text-sm text-zinc-700 dark:text-zinc-300">
              Tier {tier.tier_number}
            </label>
            <input
              name={`size-${tier.tier_number}`}
              type="number"
              min={0}
              defaultValue={tier.tier_size}
              className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-sm text-zinc-500">golfers</span>
          </div>
        ))}

        <p
          className={`text-sm ${
            assigned === total ? "text-zinc-500" : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {assigned} / {total} golfers assigned
        </p>

        <button
          type="submit"
          className="mt-2 w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Save tiers &amp; open pool
        </button>
      </form>
    </div>
  );
}
