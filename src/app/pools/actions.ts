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

  const { data: pool, error } = await supabase
    .from("pools")
    .insert({
      tournament_id: tournamentId,
      name,
      owner_id: user.id,
      picks_per_entry: 1,
    })
    .select()
    .single();

  if (error || !pool) {
    redirect(`/pools/new?error=${encodeURIComponent(error?.message ?? "Failed to create pool")}`);
  }

  redirect(`/pools/${pool.id}`);
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

  const tierKeys = [...formData.keys()].filter((k) => k.startsWith("tier-"));
  const golferIds = tierKeys
    .map((k) => formData.get(k) as string)
    .filter(Boolean);

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
