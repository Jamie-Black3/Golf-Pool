"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_PICKS = 15;

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
  const name = ((formData.get("name") as string) || "").trim();
  const tierCount = Math.min(15, Math.max(1, parseInt(formData.get("tierCount") as string, 10) || 4));

  if (!name || !tournamentId) {
    redirect(`/pools/new?error=${encodeURIComponent("Pool name and tournament are required")}`);
  }

  const { count: fieldSize } = await supabase
    .from("golf_players")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  const total = fieldSize ?? 0;

  // Default one pick per tier, but never exceed the total pick cap.
  const defaultPicks = Math.min(tierCount, MAX_PICKS);

  const { data: pool, error } = await supabase
    .from("pools")
    .insert({
      tournament_id: tournamentId,
      name,
      owner_id: user.id,
      tier_count: tierCount,
      picks_per_entry: defaultPicks,
    })
    .select()
    .single();

  if (error || !pool) {
    redirect(
      `/pools/new?error=${encodeURIComponent(error?.message ?? "Failed to create pool")}`
    );
  }

  // Even odds-ordered split by default; one pick per tier (up to the cap).
  const baseSize = Math.floor(total / tierCount);
  const remainder = total % tierCount;
  const tierRows = Array.from({ length: tierCount }, (_, i) => ({
    pool_id: pool.id,
    tier_number: i + 1,
    tier_size: baseSize + (i < remainder ? 1 : 0),
    picks_allowed: i < defaultPicks ? 1 : 0,
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
    .select("tournament_id, owner_id")
    .eq("id", poolId)
    .single<{ tournament_id: string; owner_id: string }>();
  if (!pool) redirect("/");

  const { data: tiers } = await supabase
    .from("pool_tiers")
    .select("tier_number")
    .eq("pool_id", poolId)
    .order("tier_number")
    .returns<{ tier_number: number }[]>();

  let totalPicks = 0;
  const updates: { tier_number: number; tier_size: number; picks_allowed: number }[] = [];
  for (const t of tiers ?? []) {
    const size = Math.max(0, parseInt(formData.get(`size-${t.tier_number}`) as string, 10) || 0);
    const picks = Math.max(0, parseInt(formData.get(`picks-${t.tier_number}`) as string, 10) || 0);
    // Can't pick more golfers than the tier holds.
    const clampedPicks = Math.min(picks, size);
    totalPicks += clampedPicks;
    updates.push({ tier_number: t.tier_number, tier_size: size, picks_allowed: clampedPicks });
  }

  if (totalPicks > MAX_PICKS) {
    redirect(
      `/pools/${poolId}/tiers?error=${encodeURIComponent(
        `Total picks (${totalPicks}) exceeds the ${MAX_PICKS}-golfer limit.`
      )}`
    );
  }

  for (const u of updates) {
    await supabase
      .from("pool_tiers")
      .update({ tier_size: u.tier_size, picks_allowed: u.picks_allowed })
      .eq("pool_id", poolId)
      .eq("tier_number", u.tier_number);
  }

  await supabase.from("pools").update({ picks_per_entry: totalPicks }).eq("id", poolId);
  await regenerateAssignments(supabase, poolId, pool.tournament_id);

  redirect(`/pools/${poolId}`);
}

export async function setPoolLock(poolId: string, lock: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pool } = await supabase
    .from("pools")
    .select("owner_id")
    .eq("id", poolId)
    .single<{ owner_id: string }>();
  if (!pool || pool.owner_id !== user.id) redirect(`/pools/${poolId}`);

  await supabase
    .from("pools")
    .update({ locked_at: lock ? new Date().toISOString() : null })
    .eq("id", poolId);

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

  const { data: tiers } = await supabase
    .from("pool_tiers")
    .select("tier_number, picks_allowed")
    .eq("pool_id", poolId)
    .returns<{ tier_number: number; picks_allowed: number }[]>();

  const allPicks: string[] = [];
  for (const t of tiers ?? []) {
    const selected = formData.getAll(`tier-${t.tier_number}`).filter(Boolean) as string[];
    if (selected.length !== t.picks_allowed) {
      redirect(
        `/pools/${poolId}/pick?error=${encodeURIComponent(
          `Tier ${t.tier_number}: pick exactly ${t.picks_allowed} golfer(s).`
        )}`
      );
    }
    allPicks.push(...selected);
  }

  await supabase.from("entry_picks").delete().eq("entry_id", entryId);

  if (allPicks.length > 0) {
    await supabase.from("entry_picks").insert(
      allPicks.map((golfPlayerId) => ({
        entry_id: entryId,
        golf_player_id: golfPlayerId,
      }))
    );
  }

  redirect(`/pools/${poolId}`);
}
