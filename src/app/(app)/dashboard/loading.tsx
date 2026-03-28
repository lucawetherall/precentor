export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl animate-pulse" role="status" aria-busy="true" aria-label="Loading dashboard">
      <span className="sr-only">Loading dashboard...</span>
      <div className="h-8 w-56 bg-muted rounded-md mb-6" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-muted rounded-md" />
        ))}
      </div>
    </div>
  );
}
