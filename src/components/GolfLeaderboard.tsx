"use client";

import { useState } from "react";
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
  const [showOdds, setShowOdds] = useState(false);

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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowOdds((v) => !v)}
          aria-pressed={showOdds}
          className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
        >
          <span>{showOdds ? "Hide odds" : "Show odds"}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showOdds ? "rotate-180" : ""}`} aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {showOdds && (
        <p className="hint text-xs">
          Odds are each golfer&apos;s betting odds <strong>at the start of the
          tournament</strong> (not live) — a guide to how the tiers were seeded.
        </p>
      )}

      <div className="card overflow-hidden">
        <div
          className="flex items-center gap-3 border-b px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="w-6 flex-none text-center">#</span>
          <span className="flex-1">Player</span>
          <span className="w-12 flex-none text-right">Score</span>
          <span className="w-10 flex-none text-right">Thru</span>
          {showOdds && <span className="w-14 flex-none text-right">Odds</span>}
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
                {showOdds && (
                  <span className="w-14 flex-none text-right">
                    <OddsLabel prob={g.win_prob} />
                  </span>
                )}
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
    </div>
  );
}
