"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-4 sm:p-8 max-w-lg mx-auto mt-12 sm:mt-20 border border-destructive bg-card">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" strokeWidth={1.5} aria-hidden="true" />
        <h2 className="text-xl font-heading font-semibold text-destructive">Something went wrong</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={reset}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground border border-primary hover:bg-primary-hover transition-colors"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="px-4 py-2 text-sm border border-border hover:bg-muted transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
