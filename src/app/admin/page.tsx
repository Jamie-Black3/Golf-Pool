import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader } from "@/components/ui";
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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <BackLink href="/">Back home</BackLink>
      <PageHeader title="Admin" subtitle="Manage every pool on the site." />

      {!pools || pools.length === 0 ? (
        <div className="card p-6">
          <p className="hint">No pools yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {pools.map((pool) => (
            <li
              key={pool.id}
              className="card flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{pool.name}</div>
                <div className="truncate text-sm text-muted">
                  {pool.tournaments?.name} · owner: {pool.profiles?.account_name}
                </div>
              </div>
              <div className="flex flex-none items-center gap-3 text-sm">
                <Link href={`/admin/pools/${pool.id}`} className="btn btn-secondary px-3 py-1.5">
                  Edit
                </Link>
                <form action={deletePool}>
                  <input type="hidden" name="poolId" value={pool.id} />
                  <button type="submit" className="text-red-600 transition-colors hover:text-red-700 dark:text-red-400">
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
