"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  redirect(`/pools/${pool.id}/tiers`);
}

export async function updateTiers(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const poolId = formData.get("poolId") as string;

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
