"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useServiceEditor } from "./service-editor-context";
import { VerseStepper } from "./verse-stepper";
import { useToast } from "@/components/ui/toast";
import { AiSuggestButton, type MusicSuggestion } from "./ai-suggest-button";

interface HymnResult {
  id: string;
  book: string;
  number: number;
  firstLine: string;
  tuneName: string | null;
  author: string | null;
  totalVerses?: number;
}

interface HymnPickerProps {
  slotId: string;
  churchId: string;
}

function formatHymn(hymn: { book: string; number: number; firstLine: string }) {
  return `${hymn.book} ${hymn.number} \u2014 ${hymn.firstLine}`;
}

export function HymnPicker({ slotId, churchId }: HymnPickerProps) {
  const { musicSlots, updateSlot, serviceId } = useServiceEditor();
  const { addToast } = useToast();
  const slot = musicSlots.get(slotId);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HymnResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentHymn, setCurrentHymn] = useState<HymnResult | null>(null);
  const [loadingHymn, setLoadingHymn] = useState(false);
  const [totalVerses, setTotalVerses] = useState<number | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const hymnId = slot?.hymnId ?? null;

  // Clear hymn state when hymnId is removed
  const [prevHymnId, setPrevHymnId] = useState(hymnId);
  if (hymnId !== prevHymnId) {
    setPrevHymnId(hymnId);
    if (!hymnId) {
      setCurrentHymn(null);
      setTotalVerses(null);
    }
  }

  // Load current hymn details when slot has a hymnId
  useEffect(() => {
    if (!hymnId) return;
    if (currentHymn && currentHymn.id === hymnId) return;
    let cancelled = false;
    async function loadHymn() {
      setLoadingHymn(true);
      try {
        const res = await fetch(`/api/hymns/${hymnId}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setCurrentHymn(data);
          setTotalVerses(data.totalVerses ?? data.verseCount ?? null);
        }
      } catch {
        addToast("Failed to load hymn details", "error");
      }
      if (!cancelled) setLoadingHymn(false);
    }
    loadHymn();
    return () => { cancelled = true; };
  }, [hymnId, currentHymn, addToast]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    clearTimeout(searchTimeoutRef.current);

    if (q.length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/search/hymns?q=${encodeURIComponent(q)}`
        );
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.results ?? [];
          setResults(items);
          setShowDropdown(true);
        }
      } catch {
        addToast("Hymn search failed", "error");
      }
      setSearching(false);
    }, 300);
  }, [addToast]);

  const handleSelect = async (hymn: HymnResult) => {
    setShowDropdown(false);
    setQuery("");
    setResults([]);
    setCurrentHymn(hymn);
    // Use totalVerses from search result directly — no second fetch needed
    setTotalVerses(hymn.totalVerses ?? null);
    await updateSlot(slotId, { hymnId: hymn.id });
  };

  const handleClear = async () => {
    setCurrentHymn(null);
    setTotalVerses(null);
    await updateSlot(slotId, { hymnId: null });
  };

  // Apply an AI suggestion by resolving it against the church's hymn books.
  // The suggestion id is a hint like "NEH-30" / "AM 142"; resolve by book+number
  // first, then by title, and apply the best match. If nothing matches, drop the
  // title into the search box so the user can choose manually.
  const applySuggestion = async (s: MusicSuggestion) => {
    const ref = s.id.match(/\b(NEH|AM|A&M|AMNS)\s*[-–]?\s*(\d+)\b/i);
    let candidates: HymnResult[] = [];
    try {
      if (ref) {
        const book = ref[1].toUpperCase().startsWith("A") ? "AM" : "NEH";
        const number = Number(ref[2]);
        const res = await fetch(
          `/api/search/hymns?q=${encodeURIComponent(String(number))}&book=${book}`,
        );
        if (res.ok) {
          const data = await res.json();
          const items: HymnResult[] = Array.isArray(data) ? data : data.results ?? [];
          candidates = items.filter((h) => h.number === number);
        }
      }
      if (candidates.length === 0) {
        const res = await fetch(`/api/search/hymns?q=${encodeURIComponent(s.title)}`);
        if (res.ok) {
          const data = await res.json();
          candidates = Array.isArray(data) ? data : data.results ?? [];
        }
      }
    } catch {
      addToast("Couldn't load that suggestion — try searching manually.", "error");
      return;
    }

    if (candidates.length > 0) {
      await handleSelect(candidates[0]);
      addToast(`Added ${formatHymn(candidates[0])}`, "success");
    } else {
      handleSearch(s.title);
      addToast("That piece isn't in your hymn books — showing a search instead.", "info");
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loadingHymn) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {/* Current hymn display */}
      {currentHymn ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-body truncate max-w-[200px]">
            {formatHymn(currentHymn)}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Clear hymn"
            title="Clear"
          >
            <X className="h-3 w-3" strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">Not assigned</span>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="flex items-center gap-1">
          <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
            placeholder="Search hymns..."
            className="text-xs border border-input bg-transparent px-2 py-1 w-44 rounded-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label={`Search hymns for ${churchId}`}
          />
          {searching && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" strokeWidth={1.5} />
          )}
          <span className="text-border" aria-hidden="true">·</span>
          <AiSuggestButton
            serviceId={serviceId}
            slotType="HYMN"
            pieceLabel="hymn"
            onApply={applySuggestion}
          />
        </div>

        {/* Results dropdown */}
        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 top-full left-0 mt-1 w-72 max-h-48 overflow-y-auto bg-popover border border-border rounded-sm shadow-md">
            {results.map((hymn) => (
              <button
                key={hymn.id}
                type="button"
                onClick={() => handleSelect(hymn)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors border-b border-border last:border-b-0"
              >
                <span className="font-semibold">
                  {hymn.book} {hymn.number}
                </span>
                {" \u2014 "}
                <span>{hymn.firstLine}</span>
                {hymn.tuneName && (
                  <span className="text-muted-foreground ml-1">
                    ({hymn.tuneName})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {showDropdown && query.length >= 1 && results.length === 0 && !searching && (
          <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-popover border border-border rounded-sm shadow-md p-3">
            <p className="text-xs text-muted-foreground">No hymns found.</p>
          </div>
        )}
      </div>

      {/* Verse stepper (when hymn is selected and has verses) */}
      {currentHymn && totalVerses && totalVerses > 0 && (
        <VerseStepper slotId={slotId} totalVerses={totalVerses} />
      )}
    </div>
  );
}
