export default function SettingsLoading() {
  return (
    <div className="p-8 max-w-lg">
      <div className="h-8 w-48 bg-muted animate-pulse rounded-md mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    </div>
  );
}
