import { ToPar, OddsLabel } from "@/components/ui";
import { isCut } from "@/lib/scoring";

export type GolferRow = {
  id: string;
  name: string;
  to_par: number | null;
  status: string | null;
  thru: number | null;
  round: number | null;
  win_prob: number | null;
  tier?: number;
};

function thruLabel(g: GolferRow, started: boolean): string {
  if (isCut(g.status)) return "CUT";
  if (!started) return "—";
  if (g.thru === 18) return "F";
  if (g.thru && g.thru > 0) return String(g.thru);
  return "—";
}

export function GolfLeaderboard({
  golfers,
  started,
  showTier = false,
}: {
  golfers: GolferRow[];
  started: boolean;
  showTier?: boolean;
}) {
  // Sort by score (best first); not-started after; cut/withdrawn to the bottom.
  const rows = [...golfers].sort((a, b) => {
    const aCut = isCut(a.status) ? 1 : 0;
    const bCut = isCut(b.status) ? 1 : 0;
    if (aCut !== bCut) return aCut - bCut;
    const at = a.to_par ?? 999;
    const bt = b.to_par ?? 999;
    if (at !== bt) return at - bt;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="card overflow-hidden">
      <div
        className="flex items-center gap-3 border-b px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="w-6 flex-none text-center">#</span>
        <span className="flex-1">Player</span>
        <span className="w-12 flex-none text-right">Score</span>
        <span className="w-10 flex-none text-right">Thru</span>
        <span className="w-14 flex-none text-right">Odds</span>
        {showTier && <span className="w-10 flex-none text-right">Tier</span>}
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {rows.map((g, i) => {
          const cut = isCut(g.status);
          return (
            <div
              key={g.id}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm ${cut ? "opacity-55" : ""}`}
              style={{ borderColor: "var(--border)" }}
            >
              <span className="w-6 flex-none text-center text-xs font-semibold text-muted">
                {cut ? "—" : i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground">{g.name}</span>
              <span className="w-12 flex-none text-right">
                {started ? <ToPar value={g.to_par ?? 0} /> : <span className="text-muted">—</span>}
              </span>
              <span className="w-10 flex-none text-right text-xs text-muted tabular-nums">
                {thruLabel(g, started)}
              </span>
              <span className="w-14 flex-none text-right">
                <OddsLabel prob={g.win_prob} />
              </span>
              {showTier && (
                <span className="w-10 flex-none text-right text-xs font-medium text-muted">
                  {g.tier ? `T${g.tier}` : "—"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
