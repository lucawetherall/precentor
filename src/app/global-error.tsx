"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground font-body">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-muted-foreground">
            An unexpected error occurred.
          </p>
          <button
            onClick={reset}
            className="mt-6 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
