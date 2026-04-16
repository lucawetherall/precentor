export default function ServicesLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="h-9 w-56 animate-pulse rounded-sm bg-muted" />
        <div className="h-9 w-40 animate-pulse rounded-sm bg-muted hidden md:block" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex border border-border bg-card overflow-hidden">
            <div className="w-20 flex-shrink-0 flex flex-col items-center justify-center py-4 bg-muted/30 border-r border-border">
              <div className="h-8 w-8 animate-pulse rounded-sm bg-muted" />
              <div className="h-3 w-8 animate-pulse rounded-sm bg-muted mt-1" />
            </div>
            <div className="flex-1 p-4 space-y-2">
              <div className="h-5 w-48 animate-pulse rounded-sm bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded-sm bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded-sm bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
