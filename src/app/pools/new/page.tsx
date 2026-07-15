import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-6 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Create a pool
        </h1>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}

        {!tournaments || tournaments.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No tournaments synced yet.
          </p>
        ) : (
          <form action={createPool} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
                Pool name
              </label>
              <input
                name="name"
                type="text"
                required
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
                Tournament
              </label>
              <select
                name="tournamentId"
                required
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="mt-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Create pool
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
