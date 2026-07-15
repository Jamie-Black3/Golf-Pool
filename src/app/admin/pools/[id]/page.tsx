import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { renamePool, deletePool, reassignTiers } from "../../actions";

type Assignment = {
  tier_number: number;
  golf_players: { id: string; name: string; odds_rank: number | null } | null;
};

export default async function AdminPoolPage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single<{ is_admin: boolean }>();
  if (!profile?.is_admin) redirect("/");

  const { data: pool } = await supabase
    .from("pools")
    .select("id, name, tier_count, tournaments(name)")
    .eq("id", poolId)
    .single<{
      id: string;
      name: string;
      tier_count: number;
      tournaments: { name: string } | null;
    }>();

  if (!pool) redirect("/admin");

  const { data: assignments } = await supabase
    .from("pool_tier_assignments")
    .select("tier_number, golf_players(id, name, odds_rank)")
    .eq("pool_id", poolId)
    .returns<Assignment[]>();

  const rows = (assignments ?? [])
    .filter((a) => a.golf_players)
    .map((a) => ({
      tierNumber: a.tier_number,
      golfer: a.golf_players!,
    }))
    .sort((a, b) => {
      if (a.tierNumber !== b.tierNumber) return a.tierNumber - b.tierNumber;
      return (a.golfer.odds_rank ?? 999) - (b.golfer.odds_rank ?? 999);
    });

  const tierOptions = Array.from({ length: pool.tier_count }, (_, i) => i + 1);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          {pool.name}
        </h1>
        <p className="text-sm text-zinc-500">{pool.tournaments?.name}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-500">Rename pool</h2>
        <form action={renamePool} className="flex gap-2">
          <input type="hidden" name="poolId" value={poolId} />
          <input
            name="name"
            defaultValue={pool.name}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Save
          </button>
        </form>

        <form action={deletePool}>
          <input type="hidden" name="poolId" value={poolId} />
          <button type="submit" className="text-sm text-red-600 underline dark:text-red-400">
            Delete this pool
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-500">
          Hand-shift golfers between tiers
        </h2>
        <form action={reassignTiers} className="flex flex-col gap-2">
          <input type="hidden" name="poolId" value={poolId} />
          <div className="flex flex-col divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
            {rows.map(({ tierNumber, golfer }) => (
              <div
                key={golfer.id}
                className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                <span>{golfer.name}</span>
                <select
                  name={`golfer-${golfer.id}`}
                  defaultValue={tierNumber}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {tierOptions.map((t) => (
                    <option key={t} value={t}>
                      Tier {t}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            type="submit"
            className="mt-2 w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Save tier assignments
          </button>
        </form>
      </div>
    </div>
  );
}
