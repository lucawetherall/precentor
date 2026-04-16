export default function ServiceDetailLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <div className="h-4 w-32 bg-muted animate-pulse rounded-sm mb-4" />
      <div className="flex items-start gap-4 mb-6">
        <div className="w-4 h-14 flex-shrink-0 rounded-sm bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 bg-muted animate-pulse rounded-sm" />
          <div className="h-8 w-64 bg-muted animate-pulse rounded-sm" />
          <div className="h-3 w-48 bg-muted animate-pulse rounded-sm" />
        </div>
      </div>
      <div className="h-20 bg-muted animate-pulse rounded-sm border border-border mb-6" />
      <div className="space-y-4">
        <div className="border border-border">
          <div className="h-10 bg-muted/30 border-b border-border" />
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-5 bg-muted animate-pulse rounded-sm" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
