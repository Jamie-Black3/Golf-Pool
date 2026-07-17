import { createClient } from "@/lib/supabase/server";
import { BackLink, PageHeader, StatusPill } from "@/components/ui";
import { GolfLeaderboard, type GolferRow } from "@/components/GolfLeaderboard";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name, status")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; name: string; status: string }>();

  if (!tournament) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        <BackLink href="/">Back home</BackLink>
        <p className="text-muted">No tournament synced yet.</p>
      </div>
    );
  }

  const { data: golfers } = await supabase
    .from("golf_players")
    .select("id, name, to_par, status, thru, round, win_prob")
    .eq("tournament_id", tournament.id)
    .returns<GolferRow[]>();

  const started = tournament.status !== "upcoming";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <BackLink href="/">Back home</BackLink>
      <PageHeader
        title="Leaderboard"
        subtitle={
          <span className="inline-flex items-center gap-2">
            {tournament.name}
            <StatusPill status={tournament.status} />
          </span>
        }
      />
      <GolfLeaderboard golfers={golfers ?? []} started={started} />
    </div>
  );
}
