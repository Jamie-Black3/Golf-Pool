"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 120_000; // 2 minutes

export function LiveRefresh({ live }: { live: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      // Throttled server-side: pulls from ESPN at most once per window even if
      // many viewers ping it. Then re-render the server component with fresh data.
      await fetch("/api/sync-tournament", { cache: "no-store" });
      router.refresh();
    } catch {
      // ignore transient failures; next tick will retry
    } finally {
      setBusy(false);
    }
  }, [router]);

  useEffect(() => {
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return; // skip hidden tabs
      refresh();
    };
    const id = setInterval(tick, INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-red-500" : "bg-amber-500"}`} />
        {live ? "Live · auto-updates every 2 min" : "Waiting for tee-off · checking every 2 min"}
      </span>
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        className="underline transition-colors hover:text-foreground disabled:opacity-50"
      >
        {busy ? "Updating…" : "Refresh now"}
      </button>
    </div>
  );
}
