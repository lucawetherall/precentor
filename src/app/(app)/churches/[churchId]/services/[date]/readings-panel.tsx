import { BookMarked } from "lucide-react";
import { POSITION_LABELS } from "@/types";

export interface Reading {
  id: string;
  position: string;
  lectionary: string;
  reference: string;
  readingText: string | null;
}

const LECTIONARY_LABELS: Record<string, string> = {
  PRINCIPAL: "Principal Service",
  SECOND: "Second Service",
};

export function lectionaryForServiceType(serviceType: string): string {
  // Choral Evensong is the only service that uses the Second Service
  // lectionary; everything else (Eucharist, Matins, Family) reads from
  // Principal Service.
  return serviceType === "CHORAL_EVENSONG" ? "SECOND" : "PRINCIPAL";
}

interface Props {
  readings: Reading[];
  serviceType: string;
}

export function ReadingsPanel({ readings, serviceType }: Props) {
  const lectionary = lectionaryForServiceType(serviceType);
  const filtered = readings.filter((r) => r.lectionary === lectionary);
  if (filtered.length === 0) return null;

  return (
    <div className="border border-border bg-card mb-4">
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
        <BookMarked className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
        <h3 className="small-caps text-xs text-muted-foreground">
          Readings — {LECTIONARY_LABELS[lectionary] ?? lectionary}
        </h3>
      </div>
      <div className="divide-y divide-border">
        {filtered.map((r) => (
          <div key={r.id} className="flex gap-3 px-4 py-3 text-sm">
            <span className="small-caps text-xs text-muted-foreground w-28 flex-shrink-0 pt-0.5">
              {POSITION_LABELS[r.position] ?? r.position.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
            <span className="font-heading">{r.reference}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
