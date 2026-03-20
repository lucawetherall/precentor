export default function SundaysLoading() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="h-8 w-64 bg-muted animate-pulse mb-6" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
