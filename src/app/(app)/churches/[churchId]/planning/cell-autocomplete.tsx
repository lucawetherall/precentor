"use client";

import { useEffect, useState, useRef } from "react";

export interface AutocompleteOption {
  id: string;
  label: string;
  meta?: string;
}

interface Props {
  value: string;
  searchUrl: (q: string) => string;
  mapResponse: (data: unknown) => AutocompleteOption[];
  onCommit: (result: { text: string; refId: string | null }) => void;
  onCancel: () => void;
  allowFreeText?: boolean;
}

export function CellAutocomplete({ value, searchUrl, mapResponse, onCommit, onCancel, allowFreeText = true }: Props) {
  const [draft, setDraft] = useState(value);
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Track the latest request so an out-of-order response can't overwrite a
    // newer one and show stale suggestions.
    let cancelled = false;
    if (draft.trim().length === 0) {
      // Defer the clear so it doesn't run synchronously in the effect — keeps
      // react-hooks/set-state-in-effect happy and ensures the state update is
      // coalesced with any in-flight render work.
      debounceRef.current = setTimeout(() => {
        if (!cancelled) setOptions([]);
      }, 0);
    } else {
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(searchUrl(draft));
          if (!res.ok || cancelled) return;
          const data = await res.json() as unknown;
          setOptions(mapResponse(data).slice(0, 8));
          setHighlight(0);
        } catch { /* ignore */ }
      }, 200);
    }
    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, searchUrl, mapResponse]);

  function commitSelection(forcedIndex?: number) {
    const idx = forcedIndex ?? highlight;
    const picked = options[idx];
    if (picked) {
      onCommit({ text: picked.label, refId: picked.id });
    } else if (allowFreeText) {
      onCommit({ text: draft, refId: null });
    } else {
      onCancel();
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setTimeout(() => commitSelection(), 120)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
          else if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(options.length - 1, h + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(0, h - 1)); }
          else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); commitSelection(); }
        }}
        className="w-full px-2 py-2 bg-accent outline-none text-sm"
      />
      {options.length > 0 && (
        <ul className="absolute z-20 top-full left-0 min-w-[240px] bg-background border shadow-lg rounded text-sm">
          {options.map((o, i) => (
            <li
              key={o.id}
              className={`px-2 py-1.5 cursor-pointer ${i === highlight ? "bg-accent" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); commitSelection(i); }}
            >
              <div>{o.label}</div>
              {o.meta && <div className="text-xs text-muted-foreground">{o.meta}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
