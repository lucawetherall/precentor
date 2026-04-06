"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <Button onClick={reset}>
          Try again
        </Button>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
