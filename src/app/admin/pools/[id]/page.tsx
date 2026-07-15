import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui";
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
    .map((a) => ({ tierNumber: a.tier_number, golfer: a.golf_players! }))
    .sort((a, b) => {
      if (a.tierNumber !== b.tierNumber) return a.tierNumber - b.tierNumber;
      return (a.golfer.odds_rank ?? 999) - (b.golfer.odds_rank ?? 999);
    });

  const tierOptions = Array.from({ length: pool.tier_count }, (_, i) => i + 1);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <BackLink href="/admin">Back to admin</BackLink>
      <PageHeader title={pool.name} subtitle={pool.tournaments?.name} />

      <div className="card flex flex-col gap-4 p-5">
        <h2 className="text-sm font-semibold text-foreground">Pool settings</h2>
        <form action={renamePool} className="flex gap-2">
          <input type="hidden" name="poolId" value={poolId} />
          <input name="name" defaultValue={pool.name} className="input flex-1" />
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </form>
        <form action={deletePool}>
          <input type="hidden" name="poolId" value={poolId} />
          <button type="submit" className="text-sm text-red-600 transition-colors hover:text-red-700 dark:text-red-400">
            Delete this pool
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Hand-move golfers between tiers</h2>
          <p className="hint">Overrides the odds-based default assignment.</p>
        </div>
        <form action={reassignTiers} className="flex flex-col gap-3">
          <input type="hidden" name="poolId" value={poolId} />
          <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
            {rows.map(({ tierNumber, golfer }) => (
              <div
                key={golfer.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="truncate text-foreground">{golfer.name}</span>
                <select
                  name={`golfer-${golfer.id}`}
                  defaultValue={tierNumber}
                  className="input max-w-32 py-1.5"
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
          <button type="submit" className="btn btn-primary w-fit">
            Save tier assignments
          </button>
        </form>
      </div>
    </div>
  );
}
