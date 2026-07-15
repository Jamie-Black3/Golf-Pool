import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard";

const TIER_COUNT = 4;

function parseToPar(score: string | undefined): number | null {
  if (!score) return null;
  if (score === "E") return 0;
  if (/^[+-]?\d+$/.test(score)) return parseInt(score, 10);
  return null;
}

function mapStatus(state: string): string {
  if (state === "pre") return "upcoming";
  if (state === "in") return "live";
  if (state === "post") return "complete";
  return "upcoming";
}

export async function GET() {
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

  const supabase = createAdminClient();

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .upsert(
      {
        espn_event_id: event.id,
        name: event.name,
        start_date: event.date?.slice(0, 10),
        end_date: event.endDate?.slice(0, 10),
        status: mapStatus(event.status?.type?.state),
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
  const tierSize = Math.ceil(sorted.length / TIER_COUNT);

  const players = sorted.map((c, i) => ({
    tournament_id: tournament.id,
    espn_athlete_id: c.id,
    name: c.athlete?.displayName ?? "Unknown",
    tier: Math.min(TIER_COUNT, Math.floor(i / tierSize) + 1),
    to_par: parseToPar(c.score),
    status: c.status?.type?.description ?? "active",
    updated_at: new Date().toISOString(),
  }));

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
