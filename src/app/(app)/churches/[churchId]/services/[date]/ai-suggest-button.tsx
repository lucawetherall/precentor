"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export interface MusicSuggestion {
  id: string;
  title: string;
  reason: string;
}

interface AiSuggestButtonProps {
  serviceId: string;
  /** Music slot type the AI should suggest for, e.g. "HYMN", "ANTHEM". */
  slotType: string;
  /** Apply a chosen suggestion. Return false to keep the panel open (e.g. the
   *  suggestion couldn't be resolved and the caller handled it another way). */
  onApply: (suggestion: MusicSuggestion) => void | Promise<void>;
  /** Short label for the kind of piece, used in copy. Defaults to "music". */
  pieceLabel?: string;
}

/**
 * "Suggest with AI" affordance. POSTs to /api/ai/suggest-music for the given
 * service + slot type, shows the returned pieces with the AI's reasoning, and
 * lets the user apply one. Handles the quota (429) and unavailable (5xx) cases
 * with clear toasts so the headline AI feature degrades gracefully.
 */
export function AiSuggestButton({
  serviceId,
  slotType,
  onApply,
  pieceLabel = "music",
}: AiSuggestButtonProps) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<MusicSuggestion[] | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function fetchSuggestions() {
    setOpen(true);
    setLoading(true);
    setSuggestions(null);
    try {
      const res = await fetch(`/api/ai/suggest-music`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, slotType }),
      });

      if (res.ok) {
        const data = (await res.json()) as { suggestions?: MusicSuggestion[] };
        const items = data.suggestions ?? [];
        setSuggestions(items);
        if (items.length === 0) {
          addToast("No AI suggestions for this service yet.", "info");
        }
      } else if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        addToast(
          (data as { error?: string }).error ??
            "Daily AI suggestion limit reached. Try again tomorrow.",
          "warning",
        );
        setOpen(false);
      } else if (res.status === 401 || res.status === 403) {
        addToast("You don't have permission to use AI suggestions here.", "error");
        setOpen(false);
      } else {
        addToast("AI suggestions are unavailable right now.", "error");
        setOpen(false);
      }
    } catch {
      addToast("AI suggestions are unavailable right now.", "error");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(s: MusicSuggestion) {
    setApplyingId(s.id);
    try {
      await onApply(s);
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : fetchSuggestions())}
        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`Suggest ${pieceLabel} with AI`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
        ) : (
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
        )}
        Suggest
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`AI ${pieceLabel} suggestions`}
          className="absolute z-50 top-full left-0 mt-1 w-80 max-h-80 overflow-y-auto bg-popover border border-border rounded-md shadow-lg"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border sticky top-0 bg-popover">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
              AI suggestions
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close suggestions"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
              Asking the AI based on this Sunday&apos;s readings…
            </div>
          )}

          {!loading && suggestions && suggestions.length > 0 && (
            <ul className="divide-y divide-border">
              {suggestions.map((s) => (
                <li key={s.id} className="px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-snug">{s.title}</p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                        {s.reason}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApply(s)}
                      disabled={applyingId !== null}
                      className="flex-shrink-0 text-xs text-primary hover:text-primary-hover font-medium disabled:opacity-50"
                    >
                      {applyingId === s.id ? "Adding…" : "Add"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!loading && suggestions && suggestions.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              No suggestions returned. Try again or search manually.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
