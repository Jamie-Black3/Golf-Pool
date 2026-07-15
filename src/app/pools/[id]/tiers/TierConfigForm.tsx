"use client";

import { useState } from "react";
import { updateTiers } from "../../actions";

const MAX_PICKS = 15;

type Tier = { tier_number: number; tier_size: number; picks_allowed: number };

export function TierConfigForm({
  poolId,
  fieldSize,
  initialTiers,
  initialCountingPicks,
}: {
  poolId: string;
  fieldSize: number;
  initialTiers: Tier[];
  initialCountingPicks: number | null;
}) {
  const [tiers, setTiers] = useState<Tier[]>(initialTiers);
  const [countingPicks, setCountingPicks] = useState<string>(
    initialCountingPicks ? String(initialCountingPicks) : ""
  );

  const totalAssigned = tiers.reduce((s, t) => s + t.tier_size, 0);
  const totalPicks = tiers.reduce((s, t) => s + Math.min(t.picks_allowed, t.tier_size), 0);

  const sizesOk = totalAssigned === fieldSize;
  const picksOk = totalPicks > 0 && totalPicks <= MAX_PICKS;

  const countingNum = parseInt(countingPicks, 10);
  const countingOk =
    countingPicks === "" || (countingNum > 0 && countingNum <= totalPicks);

  function update(idx: number, key: "tier_size" | "picks_allowed", value: number) {
    setTiers((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [key]: Math.max(0, value) } : t))
    );
  }

  return (
    <form action={updateTiers} className="flex flex-col gap-5">
      <input type="hidden" name="poolId" value={poolId} />

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-3 border-b px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted" style={{ borderColor: "var(--border)" }}>
          <span>Tier</span>
          <span>Golfers in tier</span>
          <span>Picks from tier</span>
        </div>
        {tiers.map((tier, idx) => (
          <div
            key={tier.tier_number}
            className="grid grid-cols-[auto_1fr_1fr] items-center gap-3 border-b px-4 py-3 last:border-b-0"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background text-sm font-semibold">
              {tier.tier_number}
            </span>
            <input
              type="number"
              name={`size-${tier.tier_number}`}
              min={0}
              value={tier.tier_size}
              onChange={(e) => update(idx, "tier_size", parseInt(e.target.value) || 0)}
              className="input max-w-28"
            />
            <input
              type="number"
              name={`picks-${tier.tier_number}`}
              min={0}
              max={tier.tier_size}
              value={tier.picks_allowed}
              onChange={(e) => update(idx, "picks_allowed", parseInt(e.target.value) || 0)}
              className="input max-w-28"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className={sizesOk ? "text-muted" : "text-amber-600 dark:text-amber-400"}>
          {totalAssigned} / {fieldSize} golfers assigned
        </span>
        <span className={picksOk ? "text-muted" : "text-amber-600 dark:text-amber-400"}>
          {totalPicks} / {MAX_PICKS} total picks per entry
        </span>
      </div>

      <div className="card flex flex-col gap-2 p-4">
        <label className="label">Scoring — best picks that count</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            name="countingPicks"
            min={1}
            max={totalPicks}
            value={countingPicks}
            onChange={(e) => setCountingPicks(e.target.value)}
            placeholder="all"
            className="input max-w-24"
          />
          <span className="hint">of {totalPicks} picks count toward the score</span>
        </div>
        <p className="hint">
          Only each entrant&apos;s best {countingPicks || "N"} golfers count; the
          rest are dropped. Leave blank to count all. A golfer who misses the cut
          gets +8 added (for the two weekend rounds), which usually drops them.
        </p>
      </div>

      <button
        type="submit"
        disabled={!sizesOk || !picksOk || !countingOk}
        className="btn btn-primary w-fit"
      >
        Save &amp; open pool
      </button>
      {!sizesOk && (
        <p className="hint -mt-2">Tier sizes must add up to the full {fieldSize}-golfer field.</p>
      )}
      {!picksOk && (
        <p className="hint -mt-2">Total picks must be between 1 and {MAX_PICKS}.</p>
      )}
      {!countingOk && (
        <p className="hint -mt-2">Counting picks must be between 1 and {totalPicks}.</p>
      )}
    </form>
  );
}
