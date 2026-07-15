"use client";

import { useState } from "react";
import { submitPicks } from "../../actions";

type Golfer = { id: string; name: string; odds_rank: number | null };
type Tier = { tierNumber: number; picksAllowed: number; golfers: Golfer[] };

export function PickForm({
  poolId,
  entryId,
  tiers,
  initialSelected,
}: {
  poolId: string;
  entryId: string;
  tiers: Tier[];
  initialSelected: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));

  function countInTier(tier: Tier) {
    return tier.golfers.filter((g) => selected.has(g.id)).length;
  }

  function toggle(tier: Tier, golferId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(golferId)) {
        next.delete(golferId);
      } else if (countInTier(tier) < tier.picksAllowed) {
        next.add(golferId);
      }
      return next;
    });
  }

  const activeTiers = tiers.filter((t) => t.picksAllowed > 0);
  const allComplete = activeTiers.every((t) => countInTier(t) === t.picksAllowed);

  return (
    <form action={submitPicks} className="flex flex-col gap-7">
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="poolId" value={poolId} />
      {[...selected].map((id) => {
        const tier = tiers.find((t) => t.golfers.some((g) => g.id === id));
        return tier ? (
          <input key={id} type="hidden" name={`tier-${tier.tierNumber}`} value={id} />
        ) : null;
      })}

      {activeTiers.map((tier) => {
        const count = countInTier(tier);
        const full = count === tier.picksAllowed;
        return (
          <div key={tier.tierNumber}>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Tier {tier.tierNumber}
                <span className="ml-2 font-normal text-muted">pick {tier.picksAllowed}</span>
              </h2>
              <span
                className={`text-xs font-medium ${full ? "text-accent" : "text-muted"}`}
              >
                {count}/{tier.picksAllowed} selected
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {tier.golfers.map((golfer) => {
                const isChecked = selected.has(golfer.id);
                const disabled = !isChecked && full;
                return (
                  <button
                    type="button"
                    key={golfer.id}
                    onClick={() => toggle(tier, golfer.id)}
                    disabled={disabled}
                    aria-pressed={isChecked}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-40 ${
                      isChecked
                        ? "border-accent bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                        : "hover:bg-background"
                    }`}
                    style={{ borderColor: isChecked ? "var(--accent)" : "var(--border)" }}
                  >
                    <span
                      className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border ${
                        isChecked ? "border-accent bg-accent text-white" : ""
                      }`}
                      style={{ borderColor: isChecked ? "var(--accent)" : "var(--border)" }}
                    >
                      {isChecked && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">{golfer.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <button type="submit" disabled={!allComplete} className="btn btn-primary w-fit">
        Save picks
      </button>
      {!allComplete && (
        <p className="hint -mt-3">Fill every tier to the required number of picks to save.</p>
      )}
    </form>
  );
}
