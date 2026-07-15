import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui";
import { TierConfigForm } from "./TierConfigForm";

export default async function TiersPage({
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
    .select("id, name, owner_id, tournament_id, counting_picks, tournaments(name)")
    .eq("id", poolId)
    .single<{
      id: string;
      name: string;
      owner_id: string;
      tournament_id: string;
      counting_picks: number | null;
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
    .select("tier_number, tier_size, picks_allowed")
    .eq("pool_id", poolId)
    .order("tier_number")
    .returns<{ tier_number: number; tier_size: number; picks_allowed: number }[]>();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
      <BackLink href={`/pools/${poolId}`}>Back to pool</BackLink>
      <PageHeader
        title="Set up tiers"
        subtitle={`${pool.name} · ${pool.tournaments?.name}`}
      />

      <p className="hint">
        Golfers are ordered by betting odds — Tier 1 holds the favorites. Set how
        many golfers land in each tier and how many an entrant drafts from it. You
        can hand-move individual golfers later from the admin page.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <TierConfigForm
        poolId={poolId}
        fieldSize={fieldSize ?? 0}
        initialTiers={tiers ?? []}
        initialCountingPicks={pool.counting_picks}
      />
    </div>
  );
}
