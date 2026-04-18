"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { AdjacentDayLinks } from "@/types/service-views";

interface ServiceNavProps {
  churchId: string;
  adjacent: AdjacentDayLinks;
  /**
   * When true, the Prev/Next hrefs include `?mode=edit` so the editor stays
   * in edit mode across navigation.
   */
  preserveEditMode?: boolean;
  /**
   * Override for the left-hand Back link. Defaults to the services list.
   * Callers in edit mode should pass the current date's view-mode URL so the
   * back action is a single hop out of edit mode, not all the way to the list.
   */
  back?: { href: string; label: string };
}

function buildHref(
  churchId: string,
  date: string,
  preserveEditMode: boolean,
): string {
  const base = `/churches/${churchId}/services/${date}`;
  return preserveEditMode ? `${base}?mode=edit` : base;
}

const navButtonClass = cn(
  buttonVariants({ variant: "ghost", size: "sm" }),
);

const disabledNavClass = cn(
  navButtonClass,
  "opacity-40 pointer-events-none select-none",
);

export function ServiceNav({
  churchId,
  adjacent,
  preserveEditMode = false,
  back,
}: ServiceNavProps) {
  const { prev, next } = adjacent;
  const backHref = back?.href ?? `/churches/${churchId}/services`;
  const backLabel = back?.label ?? "Back to Services";

  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <Link
        href={backHref}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        {backLabel}
      </Link>

      <div className="flex items-center gap-1">
        {prev !== null ? (
          <Link
            href={buildHref(churchId, prev, preserveEditMode)}
            className={navButtonClass}
            aria-label="Previous service"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            Prev
          </Link>
        ) : (
          <span
            aria-disabled="true"
            aria-label="Previous service (none)"
            className={disabledNavClass}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            Prev
          </span>
        )}

        {next !== null ? (
          <Link
            href={buildHref(churchId, next, preserveEditMode)}
            className={navButtonClass}
            aria-label="Next service"
          >
            Next
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            aria-label="Next service (none)"
            className={disabledNavClass}
          >
            Next
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </span>
        )}
      </div>
    </div>
  );
}
