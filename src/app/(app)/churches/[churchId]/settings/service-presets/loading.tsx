export default function ServicePresetsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl" role="status" aria-busy="true" aria-label="Loading">
      <span className="sr-only">Loading...</span>
      <div className="h-8 w-48 bg-muted animate-pulse rounded-md mb-6" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    </div>
  );
}
