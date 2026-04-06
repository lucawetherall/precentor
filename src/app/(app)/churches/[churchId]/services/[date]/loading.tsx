export default function ServiceDetailLoading() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="h-4 w-32 bg-muted animate-pulse rounded-md mb-4" />
      <div className="h-10 w-96 bg-muted animate-pulse rounded-md mb-2" />
      <div className="h-4 w-48 bg-muted animate-pulse rounded-md mb-6" />
      <div className="h-32 bg-muted animate-pulse rounded-md mb-6" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    </div>
  );
}
