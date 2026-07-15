import Link from "next/link";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      {children}
    </Link>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ToPar({ value }: { value: number }) {
  const label = value > 0 ? `+${value}` : value === 0 ? "E" : `${value}`;
  const tone =
    value < 0
      ? "text-red-600 dark:text-red-400"
      : value === 0
        ? "text-foreground"
        : "text-foreground";
  return <span className={`font-mono font-medium tabular-nums ${tone}`}>{label}</span>;
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    live: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    upcoming: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    complete: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };
  const cls = map[status] ?? map.complete;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status === "live" && (
        <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
      )}
      {status}
    </span>
  );
}
