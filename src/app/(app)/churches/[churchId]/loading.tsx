export default function OverviewLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="h-7 w-40 bg-muted animate-pulse rounded-md mb-1" />
      <div className="h-4 w-64 bg-muted animate-pulse rounded-md mb-6" />
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex-1 h-28 bg-muted animate-pulse rounded-md" />
        <div className="flex-1 h-28 bg-muted animate-pulse rounded-md" />
      </div>
      <div className="h-5 w-36 bg-muted animate-pulse rounded-md mb-3" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    </div>
  );
}
