"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

async function regenerateAssignments(
  supabase: SupabaseClient,
  poolId: string,
  tournamentId: string
) {
  const { data: tiers } = await supabase
    .from("pool_tiers")
    .select("tier_number, tier_size")
    .eq("pool_id", poolId)
    .order("tier_number")
    .returns<{ tier_number: number; tier_size: number }[]>();

  const { data: golfers } = await supabase
    .from("golf_players")
    .select("id")
    .eq("tournament_id", tournamentId)
    .order("odds_rank", { ascending: true, nullsFirst: false })
    .returns<{ id: string }[]>();

  const assignments: { pool_id: string; golf_player_id: string; tier_number: number }[] = [];
  let cursor = 0;
  for (const t of tiers ?? []) {
    for (const g of (golfers ?? []).slice(cursor, cursor + t.tier_size)) {
      assignments.push({ pool_id: poolId, golf_player_id: g.id, tier_number: t.tier_number });
    }
    cursor += t.tier_size;
  }

  await supabase.from("pool_tier_assignments").delete().eq("pool_id", poolId);
  if (assignments.length > 0) {
    await supabase.from("pool_tier_assignments").insert(assignments);
  }
}

export async function createPool(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tournamentId = formData.get("tournamentId") as string;
  const name = formData.get("name") as string;
  const tierCount = Math.max(1, parseInt(formData.get("tierCount") as string, 10) || 4);
  const picksPerEntry = Math.min(
    tierCount,
    Math.max(1, parseInt(formData.get("picksPerEntry") as string, 10) || tierCount)
  );

  const { count: fieldSize } = await supabase
    .from("golf_players")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  const total = fieldSize ?? 0;

  const { data: pool, error } = await supabase
    .from("pools")
    .insert({
      tournament_id: tournamentId,
      name,
      owner_id: user.id,
      tier_count: tierCount,
      picks_per_entry: picksPerEntry,
    })
    .select()
    .single();

  if (error || !pool) {
    redirect(
      `/pools/new?error=${encodeURIComponent(error?.message ?? "Failed to create pool")}`
    );
  }

  // Default to an even split; the owner can rebalance sizes on the tiers page.
  const baseSize = Math.floor(total / tierCount);
  const remainder = total % tierCount;
  const tierRows = Array.from({ length: tierCount }, (_, i) => ({
    pool_id: pool.id,
    tier_number: i + 1,
    tier_size: baseSize + (i < remainder ? 1 : 0),
  }));

  await supabase.from("pool_tiers").insert(tierRows);
  await regenerateAssignments(supabase, pool.id, tournamentId);

  redirect(`/pools/${pool.id}/tiers`);
}

export async function updateTiers(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const poolId = formData.get("poolId") as string;

  const { data: pool } = await supabase
    .from("pools")
    .select("tournament_id")
    .eq("id", poolId)
    .single<{ tournament_id: string }>();
  if (!pool) redirect("/");

  const tierKeys = [...formData.keys()].filter((k) => k.startsWith("size-"));
  for (const key of tierKeys) {
    const tierNumber = parseInt(key.replace("size-", ""), 10);
    const tierSize = Math.max(0, parseInt(formData.get(key) as string, 10) || 0);
    await supabase
      .from("pool_tiers")
      .update({ tier_size: tierSize })
      .eq("pool_id", poolId)
      .eq("tier_number", tierNumber);
  }

  await regenerateAssignments(supabase, poolId, pool.tournament_id);

  redirect(`/pools/${poolId}`);
}

export async function joinPool(poolId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("pool_entries")
    .upsert(
      { pool_id: poolId, user_id: user.id },
      { onConflict: "pool_id,user_id", ignoreDuplicates: true }
    );

  redirect(`/pools/${poolId}/pick`);
}

export async function submitPicks(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const entryId = formData.get("entryId") as string;
  const poolId = formData.get("poolId") as string;

  const { data: pool } = await supabase
    .from("pools")
    .select("picks_per_entry")
    .eq("id", poolId)
    .single();

  const tierKeys = [...formData.keys()].filter((k) => k.startsWith("tier-"));
  const golferIds = tierKeys
    .map((k) => formData.get(k) as string)
    .filter(Boolean);

  if (pool && golferIds.length !== pool.picks_per_entry) {
    redirect(
      `/pools/${poolId}/pick?error=${encodeURIComponent(
        `Pick exactly ${pool.picks_per_entry} golfer(s), one per tier.`
      )}`
    );
  }

  await supabase.from("entry_picks").delete().eq("entry_id", entryId);

  if (golferIds.length > 0) {
    await supabase.from("entry_picks").insert(
      golferIds.map((golfPlayerId) => ({
        entry_id: entryId,
        golf_player_id: golfPlayerId,
      }))
    );
  }

  redirect(`/pools/${poolId}`);
}
