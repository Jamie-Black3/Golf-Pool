// Shared scoring rules for a pool entry.

// Penalty (strokes) added to a golfer who misses the cut, representing the two
// weekend rounds they don't play.
export const CUT_PENALTY = 16;

export function isCut(status: string | null | undefined): boolean {
  return !!status && /\b(cut|mc|withdraw|wd|dq|disq)/i.test(status);
}

// A golfer's contribution: their to-par, plus the cut penalty if they missed it.
export function effectiveScore(
  toPar: number | null | undefined,
  status: string | null | undefined
): number {
  return (toPar ?? 0) + (isCut(status) ? CUT_PENALTY : 0);
}

export type ScoredPick<T> = T & {
  effective: number;
  cut: boolean;
  counts: boolean;
};

// Score an entry: keep only the best `countBest` picks (lowest effective
// scores); the rest are dropped. `countBest` null/<=0 means all picks count.
// Returns the total and each pick flagged with whether it counts.
export function scoreEntry<T extends { to_par: number | null; status: string | null }>(
  picks: T[],
  countBest: number | null | undefined
): { total: number; picks: ScoredPick<T>[]; countedOf: number } {
  const scored = picks.map((p) => ({
    ...p,
    effective: effectiveScore(p.to_par, p.status),
    cut: isCut(p.status),
    counts: false,
  })) as ScoredPick<T>[];

  const n =
    countBest && countBest > 0 ? Math.min(countBest, scored.length) : scored.length;

  // Indices of the n best (lowest effective) picks.
  const order = scored
    .map((p, i) => ({ i, e: p.effective }))
    .sort((a, b) => a.e - b.e)
    .slice(0, n)
    .map((x) => x.i);

  let total = 0;
  for (const i of order) {
    scored[i].counts = true;
    total += scored[i].effective;
  }

  return { total, picks: scored, countedOf: n };
}
