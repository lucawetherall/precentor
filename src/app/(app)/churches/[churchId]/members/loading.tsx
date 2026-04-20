export default function MembersLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="h-9 w-32 animate-pulse rounded-sm bg-muted" />
        <div className="h-9 w-28 animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="border border-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-b-0">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded-sm bg-muted" />
              <div className="h-3 w-48 animate-pulse rounded-sm bg-muted" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-sm bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
