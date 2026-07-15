import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deletePool } from "./actions";

type Pool = {
  id: string;
  name: string;
  tournaments: { name: string } | null;
  profiles: { account_name: string } | null;
};

export default async function AdminPage() {
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

  const { data: pools } = await supabase
    .from("pools")
    .select("id, name, tournaments(name), profiles(account_name)")
    .order("created_at", { ascending: false })
    .returns<Pool[]>();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Admin &middot; Pools
      </h1>

      {!pools || pools.length === 0 ? (
        <p className="text-sm text-zinc-500">No pools yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pools.map((pool) => (
            <li
              key={pool.id}
              className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
            >
              <div>
                <div className="font-medium text-zinc-950 dark:text-zinc-50">
                  {pool.name}
                </div>
                <div className="text-zinc-500">
                  {pool.tournaments?.name} &middot; owner:{" "}
                  {pool.profiles?.account_name}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/pools/${pool.id}`}
                  className="text-zinc-900 underline dark:text-zinc-50"
                >
                  Edit
                </Link>
                <form action={deletePool}>
                  <input type="hidden" name="poolId" value={pool.id} />
                  <button type="submit" className="text-red-600 underline dark:text-red-400">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
