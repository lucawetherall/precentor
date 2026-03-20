export default function ServiceSheetsLoading() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="h-8 w-48 bg-muted animate-pulse mb-6" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
