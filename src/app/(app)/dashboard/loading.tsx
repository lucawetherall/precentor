export default function DashboardLoading() {
  return (
    <main id="main-content" className="p-4 sm:p-6 lg:p-8 max-w-4xl animate-pulse">
      <div className="h-8 w-56 bg-muted mb-1" />
      <div className="h-4 w-72 bg-muted mb-8" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="h-16 bg-muted" />
        <div className="h-16 bg-muted" />
        <div className="h-16 bg-muted" />
      </div>

      <div className="h-6 w-40 bg-muted mb-4" />
      <div className="space-y-2">
        <div className="h-20 bg-muted" />
        <div className="h-20 bg-muted" />
        <div className="h-20 bg-muted" />
      </div>
    </main>
  );
}
