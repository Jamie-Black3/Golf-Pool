"use client";

import { useState } from "react";
import { ToPar } from "@/components/ui";
import { CUT_PENALTY, type ScoredPick } from "@/lib/scoring";

type Pick = ScoredPick<{ name: string; to_par: number | null; status: string | null }>;
type Entry = {
  id: string;
  userId: string;
  accountName: string;
  picks: Pick[];
  total: number;
};

export function Leaderboard({
  entries,
  currentUserId,
  started,
  countingPicks,
}: {
  entries: Entry[];
  currentUserId?: string;
  started: boolean;
  countingPicks: number | null;
}) {
  const [open, setOpen] = useState<Set<string>>(
    new Set(entries.filter((e) => e.userId === currentUserId).map((e) => e.id))
  );

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
      {entries.map((entry, i) => {
        const isYou = entry.userId === currentUserId;
        const isOpen = open.has(entry.id);
        // Show counting picks first (best), then dropped ones.
        const ordered = [...entry.picks].sort(
          (a, b) => Number(b.counts) - Number(a.counts) || a.effective - b.effective
        );
        return (
          <div key={entry.id} style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={() => toggle(entry.id)}
              className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-background ${
                isYou ? "bg-[color-mix(in_srgb,var(--accent)_7%,transparent)]" : ""
              }`}
            >
              <span className="w-5 flex-none text-center text-sm font-semibold text-muted">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">
                  {entry.accountName}
                  {isYou && <span className="ml-1.5 text-xs font-normal text-accent">you</span>}
                </div>
                <div className="truncate text-xs text-muted">
                  {countingPicks && countingPicks < entry.picks.length
                    ? `best ${countingPicks} of ${entry.picks.length} count`
                    : `${entry.picks.length} golfer${entry.picks.length === 1 ? "" : "s"}`}
                </div>
              </div>
              {started ? <ToPar value={entry.total} /> : <span className="text-muted">—</span>}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`flex-none text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {isOpen && (
              <div className="border-t px-4 py-2" style={{ borderColor: "var(--border)" }}>
                {ordered.length === 0 ? (
                  <p className="py-1 text-xs text-muted">No picks made.</p>
                ) : (
                  <ul className="flex flex-col">
                    {ordered.map((p, idx) => (
                      <li
                        key={idx}
                        className={`flex items-center justify-between gap-3 py-1.5 text-sm ${
                          p.counts ? "" : "opacity-45"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2 truncate">
                          <span className="truncate text-foreground">{p.name}</span>
                          {p.cut && (
                            <span className="flex-none text-xs font-medium text-red-600 dark:text-red-400">
                              CUT +{CUT_PENALTY}
                            </span>
                          )}
                          {!p.counts && (
                            <span className="flex-none text-xs text-muted">dropped</span>
                          )}
                        </span>
                        {started ? (
                          <ToPar value={p.effective} />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
