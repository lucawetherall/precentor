"use client";

import * as React from "react";

// Calendar placeholder - will be implemented with a full date picker
function Calendar({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground">Calendar component</p>
    </div>
  );
}

export { Calendar };
