import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader, StatusPill } from "@/components/ui";
import { createPool } from "../actions";

export default async function NewPoolPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, status")
    .order("start_date", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <BackLink href="/">Back home</BackLink>
      <PageHeader title="Create a pool" subtitle="You'll set tier sizes and picks next." />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!tournaments || tournaments.length === 0 ? (
        <div className="card p-6">
          <p className="hint">No tournaments synced yet.</p>
        </div>
      ) : (
        <form action={createPool} className="card flex flex-col gap-5 p-6">
          <div>
            <label className="label">Pool name</label>
            <input name="name" type="text" required placeholder="Office Open Pool" className="input" />
          </div>

          <div>
            <label className="label">Tournament</label>
            <select name="tournamentId" required className="input">
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.status})
                </option>
              ))}
            </select>
            {tournaments[0] && (
              <div className="mt-2">
                <StatusPill status={tournaments[0].status} />
              </div>
            )}
          </div>

          <div>
            <label className="label">Number of tiers</label>
            <input name="tierCount" type="number" min={1} max={15} defaultValue={4} required className="input max-w-28" />
            <p className="hint mt-1.5">
              Golfers split into this many odds-ranked tiers. You&apos;ll fine-tune
              sizes and per-tier picks on the next screen (max 15 picks total).
            </p>
          </div>

          <button type="submit" className="btn btn-primary w-fit">
            Continue
          </button>
        </form>
      )}
    </div>
  );
}
