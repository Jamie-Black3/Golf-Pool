import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics (é, å, etc.)
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/ð/g, "d")
    .replace(/þ/g, "th")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

// Explicit aliases for golfers the books list under a different given name
// where the surname alone is ambiguous (multiple Kims, etc.). Keyed by
// normalized ESPN name -> normalized odds name.
const NAME_ALIASES: Record<string, string> = {
  "tom kim": "joohyung kim",
};

// Secondary match key: first initial + last name (catches nickname/formal-name
// differences like "Matt Fitzpatrick" vs "Matthew Fitzpatrick"). Returns null
// for single-token names so we never match on those.
function initialLastKey(name: string): string | null {
  const parts = normalizeName(name).split(" ").filter(Boolean);
  if (parts.length < 2) return null;
  return `${parts[0][0]}|${parts[parts.length - 1]}`;
}

// Tertiary key: surname only, used only when unique on both sides (catches
// entirely different given names like "Fifa" vs "Pongsapak" Laopakdee).
function lastNameKey(name: string): string | null {
  const parts = normalizeName(name).split(" ").filter(Boolean);
  if (parts.length < 2) return null;
  return parts[parts.length - 1];
}

// Build a lookup that only keeps keys that are unique on this side, so we never
// mismatch two people who share an initial+surname (e.g. the Højgaard brothers).
function uniqueKeyMap<T>(items: T[], keyFn: (t: T) => string | null): Map<string, T> {
  const counts = new Map<string, number>();
  for (const it of items) {
    const k = keyFn(it);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const map = new Map<string, T>();
  for (const it of items) {
    const k = keyFn(it);
    if (k && counts.get(k) === 1) map.set(k, it);
  }
  return map;
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
    .select("id, name, status")
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

  // Average each golfer's implied probability across books, keyed by full name.
  const probByFullName = new Map<string, number>();
  for (const [name, prices] of outcomePrices) {
    const avgProb =
      prices.reduce((sum, p) => sum + americanOddsToProbability(p), 0) /
      prices.length;
    probByFullName.set(name, avgProb);
  }

  const oddsEntries = [...probByFullName.keys()].map((n) => ({ name: n }));
  const oddsByInitialLast = uniqueKeyMap(oddsEntries, (e) => initialLastKey(e.name));
  const oddsByLastName = uniqueKeyMap(oddsEntries, (e) => lastNameKey(e.name));

  const { data: players } = await supabase
    .from("golf_players")
    .select("id, name")
    .eq("tournament_id", tournament.id);

  // Guard each fuzzy pass against our own duplicate keys too.
  const playerInitialLastUnique = uniqueKeyMap(players ?? [], (p) => initialLastKey(p.name));
  const playerLastNameUnique = uniqueKeyMap(players ?? [], (p) => lastNameKey(p.name));

  function probFor(playerName: string): number | undefined {
    const full = normalizeName(playerName);
    // 1. exact full name (or explicit alias)
    const aliased = NAME_ALIASES[full] ?? full;
    if (probByFullName.has(aliased)) return probByFullName.get(aliased);
    // 2. first initial + surname, unique on both sides
    const ilk = initialLastKey(playerName);
    if (ilk && playerInitialLastUnique.has(ilk) && oddsByInitialLast.has(ilk)) {
      return probByFullName.get(oddsByInitialLast.get(ilk)!.name);
    }
    // 3. surname only, unique on both sides
    const lnk = lastNameKey(playerName);
    if (lnk && playerLastNameUnique.has(lnk) && oddsByLastName.has(lnk)) {
      return probByFullName.get(oddsByLastName.get(lnk)!.name);
    }
    return undefined;
  }

  const withProb = (players ?? []).map((p) => ({ ...p, probability: probFor(p.name) }));

  const matched = withProb
    .filter((p) => p.probability !== undefined)
    .sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));

  // Unmatched golfers get ranks after all matched ones, ordered by name, so the
  // odds_rank column stays a clean 1..N with no collisions.
  const unmatched = withProb
    .filter((p) => p.probability === undefined)
    .sort((a, b) => a.name.localeCompare(b.name));

  const ordered = [...matched, ...unmatched];

  await Promise.all(
    ordered.map((p, i) =>
      supabase
        .from("golf_players")
        .update({ odds_rank: i + 1, win_prob: p.probability ?? null })
        .eq("id", p.id)
    )
  );

  // Re-seed tier assignments for pools on this tournament so odds changes
  // actually reach existing pools. Only for tournaments that haven't started —
  // once play begins we freeze tiers (and any manual admin moves) so live
  // scoring is stable.
  let poolsReseeded = 0;
  if (tournament.status === "upcoming") {
    const orderedIds = ordered.map((p) => p.id);
    const { data: pools } = await supabase
      .from("pools")
      .select("id")
      .eq("tournament_id", tournament.id);

    for (const pool of pools ?? []) {
      const { data: tiers } = await supabase
        .from("pool_tiers")
        .select("tier_number, tier_size")
        .eq("pool_id", pool.id)
        .order("tier_number");

      const rows: { pool_id: string; golf_player_id: string; tier_number: number }[] = [];
      let cursor = 0;
      for (const t of tiers ?? []) {
        for (const gid of orderedIds.slice(cursor, cursor + t.tier_size)) {
          rows.push({ pool_id: pool.id, golf_player_id: gid, tier_number: t.tier_number });
        }
        cursor += t.tier_size;
      }

      await supabase.from("pool_tier_assignments").delete().eq("pool_id", pool.id);
      if (rows.length > 0) {
        await supabase.from("pool_tier_assignments").insert(rows);
      }
      poolsReseeded++;
    }
  }

  return NextResponse.json({
    tournament: tournament.name,
    oddsMarket: match.description,
    matched: matched.length,
    unmatchedCount: unmatched.length,
    unmatched: unmatched.map((p) => p.name),
    poolsReseeded,
  });
}
