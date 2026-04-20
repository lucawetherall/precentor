"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

interface MigrationIssues {
  counts: { INFO: number; WARN: number; ERROR: number };
}

export function MigrationBanner({ churchId }: { churchId: string }) {
  const [issues, setIssues] = useState<MigrationIssues | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(`migration-banner-dismissed-${churchId}`);
  });

  useEffect(() => {
    fetch(`/api/churches/${churchId}/migration-issues`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setIssues(data));
  }, [churchId]);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem(`migration-banner-dismissed-${churchId}`, "1");
  }

  if (dismissed || !issues) return null;
  if (issues.counts.INFO === 0 && issues.counts.WARN === 0 && issues.counts.ERROR === 0) return null;

  const hasError = issues.counts.ERROR > 0;
  const hasWarn = issues.counts.WARN > 0;
  const bgClass = hasError
    ? "bg-destructive/15 border-destructive/30 text-destructive"
    : hasWarn
    ? "bg-warning/15 border-warning/30 text-foreground"
    : "bg-muted border-border text-muted-foreground";
  const label = hasError
    ? "Migration errors require attention"
    : hasWarn
    ? "Migration warnings need review"
    : "Migration in progress";

  return (
    <div role="alert" className={`flex items-center justify-between border rounded-md px-4 py-3 text-sm mx-4 mt-4 ${bgClass}`}>
      <span>
        {label} —{" "}
        <Link href={`/churches/${churchId}/settings/migration-issues`} className="underline hover:no-underline">
          View details
        </Link>
      </span>
      <button onClick={dismiss} aria-label="Dismiss" className="ml-4 opacity-60 hover:opacity-100">×</button>
    </div>
  );
}
