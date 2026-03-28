"use client";

import { useServiceEditor } from "./service-editor-context";

export function SectionCountBadge() {
  const { sections } = useServiceEditor();
  return (
    <span className="font-mono text-[10px] text-muted-foreground ml-0.5">
      ({sections.length})
    </span>
  );
}
