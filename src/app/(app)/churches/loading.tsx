export default function ChurchesLoading() {
  return (
    <main id="main-content" className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
      </div>
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    </main>
  );
}
