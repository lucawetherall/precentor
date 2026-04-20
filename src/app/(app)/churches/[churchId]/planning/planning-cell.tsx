"use client";

import { useState, useEffect, useRef } from "react";
import type { CellDisplay, GridColumn } from "./types";
import { CellAutocomplete } from "./cell-autocomplete";
import type { ColumnSearch } from "./column-search";

interface Props {
  column: GridColumn;
  value: CellDisplay;
  focused: boolean;
  editing: boolean;
  serviceType: string;
  churchId: string;
  search: ColumnSearch | null;
  onFocus: () => void;
  onEnterEdit: () => void;
  onCancelEdit: () => void;
  onCommit: (next: CellDisplay) => void;
}

export function PlanningCell({
  column, value, focused, editing, serviceType, churchId, search,
  onFocus, onEnterEdit, onCancelEdit, onCommit,
}: Props) {
  const [draft, setDraft] = useState(value.displayText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setTimeout(() => setDraft(value.displayText), 0);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing, value.displayText]);

  function commit() {
    if (draft === value.displayText) { onCancelEdit(); return; }
    onCommit({ displayText: draft, refId: null, isUnmatched: draft.length > 0 });
  }

  if (editing) {
    if (search) {
      return (
        <td className="px-1 py-0 border-r border-t align-top min-w-[120px]">
          <CellAutocomplete
            value={value.displayText}
            searchUrl={(q) => search.searchUrl(churchId, q)}
            mapResponse={search.mapResponse}
            onCommit={({ text, refId }) => onCommit({ displayText: text, refId, isUnmatched: !refId && text.length > 0 })}
            onCancel={onCancelEdit}
          />
        </td>
      );
    }

    return (
      <td className="px-1 py-0 border-r border-t align-top min-w-[120px]">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") { e.preventDefault(); onCancelEdit(); }
            else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); commit(); }
          }}
          className="w-full px-2 py-2 bg-accent outline-none text-sm"
        />
      </td>
    );
  }

  return (
    <td
      className={`px-3 py-2 border-r border-t align-top cursor-text min-w-[120px] ${focused ? "ring-2 ring-inset ring-primary bg-accent/30" : ""}`}
      onClick={onFocus}
      onDoubleClick={onEnterEdit}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); onEnterEdit(); }
      }}
    >
      {column === "setting" && (
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
          {serviceType === "CHORAL_EVENSONG" ? "Mag & Nunc" : "Mass"}
        </div>
      )}
      {column === "respAccl" && (
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
          {serviceType === "CHORAL_EVENSONG" ? "Responses" : "Acclamation"}
        </div>
      )}
      {value.displayText || <span className="text-muted-foreground">—</span>}
      {value.isUnmatched && (
        <span className="ml-1 text-amber-500" title="Unmatched — will display as typed">●</span>
      )}
    </td>
  );
}
