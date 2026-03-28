"use client";

import { Loader2, Check, AlertCircle } from "lucide-react";
import { useServiceEditor } from "./service-editor-context";

export function SaveStatusIndicator() {
  const { saveStatus } = useServiceEditor();

  if (saveStatus === "idle") return null;

  if (saveStatus === "saving") {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
        Saving…
      </span>
    );
  }

  if (saveStatus === "saved") {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <Check className="h-3 w-3" strokeWidth={2} />
        Saved
      </span>
    );
  }

  if (saveStatus === "error") {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" strokeWidth={1.5} />
        Error saving
      </span>
    );
  }

  return null;
}
