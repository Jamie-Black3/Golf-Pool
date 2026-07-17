"use client";

import { useState } from "react";

export function PoolTabs({
  standings,
  field,
}: {
  standings: React.ReactNode;
  field: React.ReactNode;
}) {
  const [tab, setTab] = useState<"standings" | "field">("standings");

  return (
    <div className="flex flex-col gap-3">
      <div
        className="inline-flex w-fit gap-1 rounded-lg border p-1"
        style={{ borderColor: "var(--border)" }}
        role="tablist"
      >
        {(["standings", "field"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t ? "text-[color:var(--accent-fg)]" : "text-muted hover:text-foreground"
            }`}
            style={tab === t ? { background: "var(--accent)" } : undefined}
          >
            {t === "standings" ? "Pool standings" : "Leaderboard"}
          </button>
        ))}
      </div>

      <div className={tab === "standings" ? "" : "hidden"}>{standings}</div>
      <div className={tab === "field" ? "" : "hidden"}>{field}</div>
    </div>
  );
}
