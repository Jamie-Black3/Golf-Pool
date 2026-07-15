import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function americanOddsToProbability(price: number): number {
  return price < 0 ? -price / (-price + 100) : 100 / (price + 100);
}

export async function GET() {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ODDS_API_KEY not set" }, { status: 500 });
  }

  const supabase = createAdminClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name")
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  if (!tournament) {
    return NextResponse.json({ error: "No tournament found" }, { status: 404 });
  }

  const sportsRes = await fetch(
    `https://api.the-odds-api.com/v4/sports?apiKey=${apiKey}`
  );
  if (!sportsRes.ok) {
    return NextResponse.json(
      { error: "Failed to fetch sports list from odds API" },
      { status: 502 }
    );
  }
  const sports: { key: string; title: string; description: string }[] =
    await sportsRes.json();

  const tournamentWords = normalizeName(tournament.name).split(" ");
  const golfSports = sports.filter((s) => s.key.startsWith("golf_"));
  const match = golfSports.find((s) => {
    const desc = normalizeName(s.description + " " + s.title);
    return tournamentWords.some((w) => w.length > 3 && desc.includes(w));
  });

  if (!match) {
    return NextResponse.json(
      {
        error: "No matching odds market found for this tournament",
        tournament: tournament.name,
        availableGolfMarkets: golfSports.map((s) => s.description),
      },
      { status: 404 }
    );
  }

  const oddsRes = await fetch(
    `https://api.the-odds-api.com/v4/sports/${match.key}/odds?apiKey=${apiKey}&regions=us&markets=outrights&oddsFormat=american`
  );
  if (!oddsRes.ok) {
    return NextResponse.json(
      { error: "Failed to fetch odds" },
      { status: 502 }
    );
  }
  const oddsData = await oddsRes.json();

  const outcomePrices = new Map<string, number[]>();
  for (const event of oddsData) {
    for (const bookmaker of event.bookmakers ?? []) {
      for (const market of bookmaker.markets ?? []) {
        if (market.key !== "outrights") continue;
        for (const outcome of market.outcomes ?? []) {
          const key = normalizeName(outcome.name);
          const arr = outcomePrices.get(key) ?? [];
          arr.push(outcome.price);
          outcomePrices.set(key, arr);
        }
      }
    }
  }

  const golferProbabilities = new Map<string, number>();
  for (const [name, prices] of outcomePrices) {
    const avgProb =
      prices.reduce((sum, p) => sum + americanOddsToProbability(p), 0) /
      prices.length;
    golferProbabilities.set(name, avgProb);
  }

  const { data: players } = await supabase
    .from("golf_players")
    .select("id, name")
    .eq("tournament_id", tournament.id);

  const matched: { id: string; odds_rank: number }[] = [];
  const unmatched: string[] = [];

  const ranked = (players ?? [])
    .map((p) => ({
      ...p,
      probability: golferProbabilities.get(normalizeName(p.name)),
    }))
    .filter((p) => p.probability !== undefined)
    .sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));

  ranked.forEach((p, i) => matched.push({ id: p.id, odds_rank: i + 1 }));

  for (const p of players ?? []) {
    if (!golferProbabilities.has(normalizeName(p.name))) unmatched.push(p.name);
  }

  await Promise.all(
    matched.map((m) =>
      supabase.from("golf_players").update({ odds_rank: m.odds_rank }).eq("id", m.id)
    )
  );

  return NextResponse.json({
    tournament: tournament.name,
    oddsMarket: match.description,
    matched: matched.length,
    unmatched,
  });
}
