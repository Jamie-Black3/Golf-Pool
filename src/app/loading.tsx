export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-10">
      <div className="h-7 w-40 animate-pulse rounded-md bg-[color:var(--border)]" />
      <div className="h-4 w-56 animate-pulse rounded-md bg-[color:var(--border)]" />
      <div className="mt-2 flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-xl bg-[color:var(--border)]"
            style={{ opacity: 1 - i * 0.12 }}
          />
        ))}
      </div>
    </div>
  );
}
