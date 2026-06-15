"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useServiceEditor } from "./service-editor-context";
import { useToast } from "@/components/ui/toast";
import { AiSuggestButton, type MusicSuggestion } from "./ai-suggest-button";

interface AnthemResult {
  id: string;
  title: string;
  composer: string;
  voicing: string | null;
}

interface AnthemControlProps {
  slotId: string;
  churchId: string;
}

export function AnthemControl({ slotId, churchId }: AnthemControlProps) {
  const { musicSlots, updateSlot, serviceId } = useServiceEditor();
  const { addToast } = useToast();
  const slot = musicSlots.get(slotId);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnthemResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [current, setCurrent] = useState<AnthemResult | null>(null);
  const [loading, setLoading] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const anthemId = slot?.anthemId ?? null;

  // Clear local state when the slot's anthem is removed.
  const [prevAnthemId, setPrevAnthemId] = useState(anthemId);
  if (anthemId !== prevAnthemId) {
    setPrevAnthemId(anthemId);
    if (!anthemId) setCurrent(null);
  }

  // Load the saved anthem's details for display.
  useEffect(() => {
    if (!anthemId) return;
    if (current && current.id === anthemId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/anthems/${encodeURIComponent(anthemId!)}`);
        if (res.ok && !cancelled) setCurrent(await res.json());
      } catch {
        if (!cancelled) addToast("Failed to load anthem details", "error");
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [anthemId, current, addToast]);

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
          `/api/search/anthems?q=${encodeURIComponent(q)}&churchId=${encodeURIComponent(churchId)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : data.results ?? []);
          setShowDropdown(true);
        }
      } catch {
        addToast("Anthem search failed", "error");
      }
      setSearching(false);
    }, 300);
  }, [churchId, addToast]);

  const handleSelect = async (anthem: AnthemResult) => {
    setShowDropdown(false);
    setQuery("");
    setResults([]);
    setCurrent(anthem);
    await updateSlot(slotId, { anthemId: anthem.id });
  };

  const handleClear = async () => {
    setCurrent(null);
    await updateSlot(slotId, { anthemId: null });
  };

  // Apply an AI suggestion: resolve the suggested title against the church's
  // anthem library and apply the best match, else drop it into the search box.
  const applySuggestion = async (s: MusicSuggestion) => {
    try {
      const res = await fetch(
        `/api/search/anthems?q=${encodeURIComponent(s.title)}&churchId=${encodeURIComponent(churchId)}`,
      );
      const data = res.ok ? await res.json() : [];
      const candidates: AnthemResult[] = Array.isArray(data) ? data : data.results ?? [];
      if (candidates.length > 0) {
        await handleSelect(candidates[0]);
        addToast(`Added ${candidates[0].title}`, "success");
      } else {
        handleSearch(s.title);
        addToast("That anthem isn't in your library — showing a search instead.", "info");
      }
    } catch {
      addToast("Couldn't load that suggestion — try searching manually.", "error");
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {current ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-body truncate max-w-[220px]">
            {current.title}
            <span className="text-muted-foreground ml-1">({current.composer})</span>
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Clear anthem"
            title="Clear"
          >
            <X className="h-3 w-3" strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">Not assigned</span>
      )}

      <div className="relative">
        <div className="flex items-center gap-1">
          <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
            placeholder="Search anthems…"
            className="text-xs border border-input bg-transparent px-2 py-1 w-44 rounded-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Search anthems"
          />
          {searching && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" strokeWidth={1.5} />
          )}
          <span className="text-border" aria-hidden="true">·</span>
          <AiSuggestButton
            serviceId={serviceId}
            slotType="ANTHEM"
            pieceLabel="anthem"
            onApply={applySuggestion}
          />
        </div>

        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 top-full left-0 mt-1 w-72 max-h-48 overflow-y-auto bg-popover border border-border rounded-sm shadow-md">
            {results.map((anthem) => (
              <button
                key={anthem.id}
                type="button"
                onClick={() => handleSelect(anthem)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors border-b border-border last:border-b-0"
              >
                <span className="font-semibold">{anthem.title}</span>
                <span className="text-muted-foreground ml-1">({anthem.composer})</span>
                {anthem.voicing && (
                  <span className="text-muted-foreground ml-1">· {anthem.voicing}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {showDropdown && query.length >= 1 && results.length === 0 && !searching && (
          <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-popover border border-border rounded-sm shadow-md p-3">
            <p className="text-xs text-muted-foreground">No anthems found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
