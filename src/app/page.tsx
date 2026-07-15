import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusPill } from "@/components/ui";

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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12">
      <div className="flex flex-col items-start gap-4 rounded-2xl border bg-surface p-8" style={{ borderColor: "var(--border)" }}>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-xl">
          ⛳
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Golf Pool</h1>
          <p className="mt-1 max-w-md text-muted">
            Draft golfers by tier, track live tournament scores, and see who&apos;s
            leading — lowest combined score to par wins.
          </p>
        </div>
        <Link href={user ? "/pools/new" : "/login"} className="btn btn-primary">
          {user ? "Create a pool" : "Sign in to start"}
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Pools</h2>
        {!pools || pools.length === 0 ? (
          <div className="card p-6">
            <p className="hint">No pools yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {pools.map((pool) => (
              <li key={pool.id}>
                <Link
                  href={`/pools/${pool.id}`}
                  className="card flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:border-accent"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{pool.name}</div>
                    <div className="truncate text-sm text-muted">{pool.tournaments?.name}</div>
                  </div>
                  <div className="flex flex-none items-center gap-3">
                    {pool.tournaments && <StatusPill status={pool.tournaments.status} />}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
