"use client";
import { useEffect, useState } from "react";

interface MigrationIssues {
  counts: { INFO: number; WARN: number; ERROR: number };
}

export function MigrationBanner({ churchId }: { churchId: string }) {
  const [issues, setIssues] = useState<MigrationIssues | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const key = `migration-banner-dismissed-${churchId}`;
    if (localStorage.getItem(key)) { setDismissed(true); return; }
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
  const bgClass = hasError ? "bg-destructive/15 border-destructive/30" : hasWarn ? "bg-yellow-50 border-yellow-300" : "bg-blue-50 border-blue-300";
  const label = hasError ? "Migration errors require attention" : hasWarn ? "Migration warnings need review" : "Migration in progress";

  return (
    <div role="alert" className={`flex items-center justify-between border rounded-md px-4 py-3 text-sm ${bgClass}`}>
      <span>{label} — <a href={`/churches/${churchId}/settings/migration-issues`} className="underline">View details</a></span>
      <button onClick={dismiss} aria-label="Dismiss" className="ml-4 text-muted-foreground hover:text-foreground">×</button>
    </div>
  );
}
