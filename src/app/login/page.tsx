import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-6 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Golf Pool
        </h1>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}

        <form className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
              Account name
            </label>
            <input
              name="accountName"
              type="text"
              placeholder="Used on leaderboards (sign up only)"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="mt-2 flex gap-3">
            <button
              formAction={signIn}
              className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Sign in
            </button>
            <button
              formAction={signUp}
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
