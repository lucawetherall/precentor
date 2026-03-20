"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Lightweight command palette / search input
function Command({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col border border-border bg-popover text-popover-foreground", className)}>
      {children}
    </div>
  );
}

function CommandInput({ placeholder, className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className={cn(
        "flex h-10 w-full bg-transparent px-3 py-2 text-sm outline-none border-b border-border placeholder:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function CommandList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("max-h-[300px] overflow-y-auto", className)}>{children}</div>
  );
}

function CommandEmpty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function CommandGroup({ children, heading, className }: { children: React.ReactNode; heading?: string; className?: string }) {
  return (
    <div className={cn("p-1", className)}>
      {heading && (
        <p className="px-2 py-1.5 text-xs font-heading font-semibold text-muted-foreground">{heading}</p>
      )}
      {children}
    </div>
  );
}

function CommandItem({
  children,
  className,
  onSelect,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  onSelect?: () => void;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="option"
      aria-selected={false}
      className={cn(
        "relative flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={onSelect}
      {...props}
    >
      {children}
    </div>
  );
}

function CommandSeparator({ className }: { className?: string }) {
  return <hr className={cn("border-border", className)} />;
}

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
};
