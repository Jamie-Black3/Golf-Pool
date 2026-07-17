"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSync() {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "tournament" | "odds">(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(kind: "tournament" | "odds") {
    setBusy(kind);
    setMsg(null);
    try {
      const url =
        kind === "tournament" ? "/api/sync-tournament?force=1" : "/api/sync-odds";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (kind === "tournament") {
        setMsg(
          data.tournament
            ? `Loaded ${data.tournament} (${data.status}) · ${data.playersSynced} players.`
            : `Done: ${JSON.stringify(data)}`
        );
      } else {
        setMsg(
          `Odds synced · ${data.matched}/${(data.matched ?? 0) + (data.unmatchedCount ?? 0)} matched · ${data.poolsReseeded ?? 0} pools reseeded${
            data.poolsFrozen ? `, ${data.poolsFrozen} frozen` : ""
          }.`
        );
      }
      router.refresh();
    } catch {
      setMsg("Something went wrong — try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card flex flex-col gap-3 p-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Tournament</h2>
        <p className="hint">
          Load or update the current ESPN tournament, then seed tiers by odds.
          Run both to start a new tournament.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => run("tournament")}
          disabled={busy !== null}
          className="btn btn-primary"
        >
          {busy === "tournament" ? "Loading…" : "Load / update tournament"}
        </button>
        <button
          type="button"
          onClick={() => run("odds")}
          disabled={busy !== null}
          className="btn btn-secondary"
        >
          {busy === "odds" ? "Syncing odds…" : "Sync odds & seed tiers"}
        </button>
      </div>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
