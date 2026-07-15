"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
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

  return supabase;
}

export async function renamePool(formData: FormData) {
  const supabase = await requireAdmin();
  const poolId = formData.get("poolId") as string;
  const name = formData.get("name") as string;

  await supabase.from("pools").update({ name }).eq("id", poolId);

  redirect(`/admin/pools/${poolId}`);
}

export async function deletePool(formData: FormData) {
  const supabase = await requireAdmin();
  const poolId = formData.get("poolId") as string;

  await supabase.from("pools").delete().eq("id", poolId);

  redirect("/admin");
}

export async function reassignTiers(formData: FormData) {
  const supabase = await requireAdmin();
  const poolId = formData.get("poolId") as string;

  const keys = [...formData.keys()].filter((k) => k.startsWith("golfer-"));
  for (const key of keys) {
    const golferId = key.replace("golfer-", "");
    const tierNumber = parseInt(formData.get(key) as string, 10);
    await supabase
      .from("pool_tier_assignments")
      .update({ tier_number: tierNumber })
      .eq("pool_id", poolId)
      .eq("golf_player_id", golferId);
  }

  redirect(`/admin/pools/${poolId}`);
}
