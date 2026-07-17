"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 120_000; // 2 minutes

export function LiveRefresh() {
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
    <button
      type="button"
      onClick={refresh}
      disabled={busy}
      className="btn btn-secondary w-fit px-3 py-1.5 text-sm"
    >
      {busy ? "Refreshing…" : "Refresh now"}
    </button>
  );
}
