import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-lg">⛳</div>
          <h1 className="text-lg font-semibold text-foreground">Golf Pool</h1>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}

        <form className="flex flex-col gap-4">
          <div>
            <label className="label">Account name</label>
            <input
              name="accountName"
              type="text"
              placeholder="Shown on leaderboards (sign up only)"
              className="input"
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input" />
          </div>

          <div>
            <label className="label">Password</label>
            <input name="password" type="password" required minLength={6} className="input" />
          </div>

          <div className="mt-2 flex gap-3">
            <button formAction={signIn} className="btn btn-primary flex-1">
              Sign in
            </button>
            <button formAction={signUp} className="btn btn-secondary flex-1">
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
