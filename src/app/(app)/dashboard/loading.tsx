export default function DashboardLoading() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="h-8 w-48 animate-pulse rounded bg-muted mb-8" />
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border p-6 space-y-4">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-4 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
