"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, RotateCcw } from "lucide-react";
import { useServiceEditor } from "./service-editor-context";

interface MassSettingResult {
  id: string;
  name: string;
  composer: string;
  movements: string[] | null;
}

interface MassSettingControlProps {
  slotId: string;
  churchId: string;
  musicSlotType: string;
}

export function MassSettingControl({
  slotId,
  churchId,
  musicSlotType,
}: MassSettingControlProps) {
  const { musicSlots, updateSlot } = useServiceEditor();
  const slot = musicSlots.get(slotId);

  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MassSettingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentSetting, setCurrentSetting] = useState<MassSettingResult | null>(null);
  const [loadingSetting, setLoadingSetting] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const massSettingId = slot?.massSettingId ?? null;

  // Extract the movement name from the slot type (e.g., MASS_SETTING_KYRIE -> Kyrie)
  const movementLabel = musicSlotType
    .replace("MASS_SETTING_", "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Load current mass setting details
  useEffect(() => {
    if (!massSettingId) {
      setCurrentSetting(null);
      return;
    }
    let cancelled = false;
    async function loadSetting() {
      setLoadingSetting(true);
      try {
        // Use search endpoint with empty query to find by id, or fetch directly
        const res = await fetch(
          `/api/search/mass-settings?q=&churchId=${encodeURIComponent(churchId)}`
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          const items: MassSettingResult[] = Array.isArray(data) ? data : data.results ?? [];
          const found = items.find((s) => s.id === massSettingId);
          if (found) setCurrentSetting(found);
        }
      } catch {
        // silent
      }
      if (!cancelled) setLoadingSetting(false);
    }
    loadSetting();
    return () => { cancelled = true; };
  }, [massSettingId, churchId]);

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
          `/api/search/mass-settings?q=${encodeURIComponent(q)}&churchId=${encodeURIComponent(churchId)}`
        );
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.results ?? [];
          setResults(items);
          setShowDropdown(true);
        }
      } catch {
        // silent
      }
      setSearching(false);
    }, 300);
  }, [churchId]);

  const handleSelect = async (setting: MassSettingResult) => {
    setShowDropdown(false);
    setShowSearch(false);
    setQuery("");
    setResults([]);
    setCurrentSetting(setting);
    await updateSlot(slotId, { massSettingId: setting.id });
  };

  const handleReset = async () => {
    setCurrentSetting(null);
    await updateSlot(slotId, { massSettingId: null });
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loadingSetting) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {/* Current state */}
      {currentSetting ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-body truncate max-w-[200px]">
            {currentSetting.name}
            <span className="text-muted-foreground ml-1">
              ({currentSetting.composer})
            </span>
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
            aria-label="Reset to default"
            title="Reset to service default"
          >
            <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground italic">
            Using service default
          </span>
          {!showSearch && (
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
            >
              Change for this {movementLabel.toLowerCase()}
            </button>
          )}
        </div>
      )}

      {/* Search (shown when override requested or already has override) */}
      {(showSearch || currentSetting) && (
        <div className="relative">
          <div className="flex items-center gap-1">
            <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
              placeholder="Search mass settings..."
              className="text-xs border border-input bg-transparent px-2 py-1 w-44 rounded-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Search mass settings"
            />
            {searching && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" strokeWidth={1.5} />
            )}
            {showSearch && !currentSetting && (
              <button
                type="button"
                onClick={() => { setShowSearch(false); setQuery(""); setResults([]); setShowDropdown(false); }}
                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cancel"
              >
                <X className="h-3 w-3" strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {showDropdown && results.length > 0 && (
            <div className="absolute z-50 top-full left-0 mt-1 w-72 max-h-48 overflow-y-auto bg-popover border border-border rounded-sm shadow-md">
              {results.map((setting) => (
                <button
                  key={setting.id}
                  type="button"
                  onClick={() => handleSelect(setting)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors border-b border-border last:border-b-0"
                >
                  <span className="font-semibold">{setting.name}</span>
                  <span className="text-muted-foreground ml-1">
                    ({setting.composer})
                  </span>
                </button>
              ))}
            </div>
          )}

          {showDropdown && query.length >= 1 && results.length === 0 && !searching && (
            <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-popover border border-border rounded-sm shadow-md p-3">
              <p className="text-xs text-muted-foreground">No mass settings found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
