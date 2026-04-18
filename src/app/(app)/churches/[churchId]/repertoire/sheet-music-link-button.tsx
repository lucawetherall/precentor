import { ExternalLink } from "lucide-react";
import type { SheetMusicLink } from "@/lib/churches/settings";

interface Props {
  link: SheetMusicLink;
}

/**
 * Renders the admin-configured external sheet-music-library link as an
 * external-link button.
 *
 * Safeguarding / GDPR notes:
 * - `target="_blank"` opens in a new tab so the member doesn't lose their
 *   place in Precentor.
 * - `rel="noopener noreferrer"` prevents the destination from accessing
 *   `window.opener` and suppresses the `Referer` header.
 * - `referrerPolicy="no-referrer"` is belt-and-braces: some browsers still
 *   send a referrer even with `noreferrer` for same-origin preloads.
 * - The visible icon + caption warn the member that the link leaves
 *   Precentor, matching WCAG success criterion 3.2.5 (change on request).
 */
export function SheetMusicLinkButton({ link }: Props) {
  const label = link.label?.trim() || "Open sheet music library";
  return (
    <div className="mb-6">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
        className="inline-flex items-center gap-2 rounded-md border border-input bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
        <span>{label}</span>
        <span className="sr-only"> (opens in a new tab on an external site)</span>
      </a>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Opens in a new tab on an external site not controlled by Precentor.
      </p>
    </div>
  );
}
