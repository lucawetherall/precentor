"use client";

import { useRouter, usePathname } from "next/navigation";
import { format, addWeeks } from "date-fns";
import { Button } from "@/components/ui/button";

interface Props { from: string; to: string; }

export function DateRangeControls({ from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function push(newFrom: string, newTo: string) {
    router.push(`${pathname}?from=${newFrom}&to=${newTo}`);
  }

  function nextNWeeks(weeks: number) {
    const today = format(new Date(), "yyyy-MM-dd");
    const end = format(addWeeks(new Date(), weeks), "yyyy-MM-dd");
    push(today, end);
  }

  return (
    <div className="flex items-center gap-2">
      <input type="date" value={from} onChange={(e) => push(e.target.value, to)}
        className="h-9 px-2 border rounded text-sm" />
      <span className="text-muted-foreground">→</span>
      <input type="date" value={to} onChange={(e) => push(from, e.target.value)}
        className="h-9 px-2 border rounded text-sm" />
      <Button size="sm" variant="outline" onClick={() => nextNWeeks(4)}>4 weeks</Button>
      <Button size="sm" variant="outline" onClick={() => nextNWeeks(12)}>Term</Button>
    </div>
  );
}
