import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui";
import { PickForm } from "./PickForm";

type Assignment = {
  tier_number: number;
  golf_players: { id: string; name: string; odds_rank: number | null } | null;
};

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
    .select("id, name, picks_per_entry, tournaments(name)")
    .eq("id", poolId)
    .single<{
      id: string;
      name: string;
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

  const { data: tierRows } = await supabase
    .from("pool_tiers")
    .select("tier_number, picks_allowed")
    .eq("pool_id", poolId)
    .order("tier_number")
    .returns<{ tier_number: number; picks_allowed: number }[]>();

  const { data: assignments } = await supabase
    .from("pool_tier_assignments")
    .select("tier_number, golf_players(id, name, odds_rank)")
    .eq("pool_id", poolId)
    .returns<Assignment[]>();

  const { data: existingPicks } = await supabase
    .from("entry_picks")
    .select("golf_player_id")
    .eq("entry_id", entry.id)
    .returns<{ golf_player_id: string }[]>();

  const byTier = new Map<number, { id: string; name: string; odds_rank: number | null }[]>();
  for (const a of assignments ?? []) {
    if (!a.golf_players) continue;
    const list = byTier.get(a.tier_number) ?? [];
    list.push(a.golf_players);
    byTier.set(a.tier_number, list);
  }
  for (const list of byTier.values()) {
    list.sort((a, b) => (a.odds_rank ?? 999) - (b.odds_rank ?? 999));
  }

  const tiers = (tierRows ?? []).map((t) => ({
    tierNumber: t.tier_number,
    picksAllowed: t.picks_allowed,
    golfers: byTier.get(t.tier_number) ?? [],
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <BackLink href={`/pools/${poolId}`}>Back to pool</BackLink>
      <PageHeader
        title="Make your picks"
        subtitle={`${pool.name} · ${pool.tournaments?.name} · ${pool.picks_per_entry} picks total`}
      />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <PickForm
        poolId={poolId}
        entryId={entry.id}
        tiers={tiers}
        initialSelected={(existingPicks ?? []).map((p) => p.golf_player_id)}
      />
    </div>
  );
}
