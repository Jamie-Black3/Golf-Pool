import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard";

// Don't pull from ESPN more than once per this window, no matter how many
// viewers trigger an on-view refresh. Pass ?force=1 to bypass (manual/admin).
const THROTTLE_SECONDS = 90;

function parseToPar(score: string | undefined): number | null {
  if (!score) return null;
  if (score === "E") return 0;
  if (/^[+-]?\d+$/.test(score)) return parseInt(score, 10);
  return null;
}

// From ESPN per-round linescores, figure out which round the golfer is on and
// how many holes they've completed in it. ESPN's per-hole array only contains
// holes actually played, so its length is "thru".
function parseProgress(linescores: unknown): { round: number | null; thru: number | null } {
  if (!Array.isArray(linescores) || linescores.length === 0) {
    return { round: null, thru: null };
  }
  const latest = linescores[linescores.length - 1] as {
    period?: number;
    linescores?: { value?: number | null }[];
  };
  const holes = Array.isArray(latest?.linescores)
    ? latest.linescores.filter((h) => h.value !== null && h.value !== undefined).length
    : null;
  return { round: latest?.period ?? linescores.length, thru: holes };
}

function mapStatus(state: string): string {
  if (state === "pre") return "upcoming";
  if (state === "in") return "live";
  if (state === "post") return "complete";
  return "upcoming";
}

export async function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("force") === "1";
  const supabase = createAdminClient();

  // Throttle: if the most recent tournament was synced within the window, skip
  // the ESPN pull entirely (shared across all viewers).
  if (!force) {
    const { data: latest } = await supabase
      .from("tournaments")
      .select("last_synced_at")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest?.last_synced_at) {
      const ageSeconds = (Date.now() - new Date(latest.last_synced_at).getTime()) / 1000;
      if (ageSeconds < THROTTLE_SECONDS) {
        return NextResponse.json({ skipped: true, ageSeconds: Math.round(ageSeconds) });
      }
    }
  }

  const espnRes = await fetch(ESPN_SCOREBOARD_URL, { cache: "no-store" });
  if (!espnRes.ok) {
    return NextResponse.json(
      { error: "Failed to fetch ESPN scoreboard" },
      { status: 502 }
    );
  }

  const espnData = await espnRes.json();
  const event = espnData.events?.[0];
  if (!event) {
    return NextResponse.json({ error: "No events found" }, { status: 404 });
  }

  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .upsert(
      {
        espn_event_id: event.id,
        name: event.name,
        start_date: event.date?.slice(0, 10),
        end_date: event.endDate?.slice(0, 10),
        status: mapStatus(event.status?.type?.state),
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "espn_event_id" }
    )
    .select()
    .single();

  if (tournamentError || !tournament) {
    return NextResponse.json(
      { error: tournamentError?.message ?? "Failed to upsert tournament" },
      { status: 500 }
    );
  }

  const sorted = [...competitors].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  const { data: existing } = await supabase
    .from("golf_players")
    .select("espn_athlete_id, odds_rank")
    .eq("tournament_id", tournament.id);

  const existingRanks = new Map(
    (existing ?? []).map((p) => [p.espn_athlete_id, p.odds_rank])
  );

  const players = sorted.map((c, i) => {
    const { round, thru } = parseProgress(c.linescores);
    return {
      tournament_id: tournament.id,
      espn_athlete_id: c.id,
      name: c.athlete?.displayName ?? "Unknown",
      // Field order as a placeholder rank until /api/sync-odds sets a real one.
      odds_rank: existingRanks.get(c.id) ?? i + 1,
      to_par: parseToPar(c.score),
      status: c.status?.type?.description ?? "active",
      round,
      thru,
      updated_at: new Date().toISOString(),
    };
  });

  const { error: playersError } = await supabase
    .from("golf_players")
    .upsert(players, { onConflict: "tournament_id,espn_athlete_id" });

  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 });
  }

  return NextResponse.json({
    tournament: tournament.name,
    status: tournament.status,
    playersSynced: players.length,
  });
}
