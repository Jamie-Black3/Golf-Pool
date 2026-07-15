import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-32 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
        Golf Pool
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Draft golfers, track live scores, and see who&apos;s leading the pool.
      </p>
      {user ? (
        <p className="text-sm text-zinc-500">Pools coming soon.</p>
      ) : (
        <Link
          href="/login"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Sign in / Sign up
        </Link>
      )}
    </div>
  );
}
