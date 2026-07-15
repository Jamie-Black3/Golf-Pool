import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pools } = await supabase
    .from("pools")
    .select("id, name, tournaments(name, status)")
    .order("created_at", { ascending: false })
    .returns<
      { id: string; name: string; tournaments: { name: string; status: string } | null }[]
    >();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
          Golf Pool
        </h1>
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          Draft golfers, track live scores, and see who&apos;s leading the pool.
        </p>
        {user ? (
          <Link
            href="/pools/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Create a pool
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Sign in / Sign up
          </Link>
        )}
      </div>

      <div className="w-full text-left">
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Pools</h2>
        {!pools || pools.length === 0 ? (
          <p className="text-sm text-zinc-500">No pools yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pools.map((pool) => (
              <li key={pool.id}>
                <Link
                  href={`/pools/${pool.id}`}
                  className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span className="font-medium text-zinc-950 dark:text-zinc-50">
                    {pool.name}
                  </span>
                  <span className="text-zinc-500">
                    {pool.tournaments?.name} &middot; {pool.tournaments?.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
