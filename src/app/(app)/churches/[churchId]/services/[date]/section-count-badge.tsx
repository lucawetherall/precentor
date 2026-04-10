"use client";

import { useServiceEditor } from "./service-editor-context";

export function SectionCountBadge() {
  const { sections } = useServiceEditor();
  return (
    <span className="font-tabular text-xs text-muted-foreground ml-0.5">
      ({sections.length})
    </span>
  );
}
