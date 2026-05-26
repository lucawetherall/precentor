import Link from "next/link";
import { format, parseISO } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { LITURGICAL_COLOURS, SERVICE_TYPE_LABELS } from "@/types";
import type { LiturgicalColour, ServiceType } from "@/types";
import { formatLiturgicalDayName } from "@/lib/liturgical-display";
import { Ornament } from "@/components/ui/ornament";

const VOICE_PARTS = ["SOPRANO", "ALTO", "TENOR", "BASS"] as const;

interface ServiceCard {
  serviceId: string;
  serviceType: string;
  time: string | null;
}

interface RotaSummary {
  total: number;
  byPart: Record<string, number>;
}

interface AttentionItem {
  id: string;
  date: string;
  cwName: string;
  colour: string;
  reason: string;
}

export function DomThisSunday({
  churchId,
  day,
  services,
  rotaSummaries,
}: {
  churchId: string;
  day: { date: string; cwName: string; colour: string; season: string };
  services: ServiceCard[];
  rotaSummaries: Map<string, RotaSummary>;
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row gap-3">
        {services.map((s) => {
          const summary = rotaSummaries.get(s.serviceId);
          const missingParts = VOICE_PARTS.filter(
            (p) => !summary?.byPart[p]
          );

          return (
            <Link
              key={s.serviceId}
              href={`/churches/${churchId}/services/${day.date}`}
              className="flex-1 h-full rounded-md border border-border border-t-2 border-t-primary bg-card p-4 shadow-sm transition-all hover:border-primary hover:shadow-md"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-heading text-base font-semibold inline-flex items-center gap-2">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-primary inline-block" />
                  {SERVICE_TYPE_LABELS[s.serviceType as ServiceType] || s.serviceType}
                </span>
                {s.time && (
                  <span className="text-xs text-muted-foreground">{s.time}</span>
                )}
              </div>
              {summary && (
                <p className="text-xs text-muted-foreground">
                  {summary.total} on rota
                  {missingParts.length > 0 && (
                    <span className="text-destructive">
                      {" "}· no {missingParts.map((p) => p.toLowerCase()).join(", ")}
                    </span>
                  )}
                </p>
              )}
              {!summary && (
                <p className="text-xs text-muted-foreground">No rota data</p>
              )}
            </Link>
          );
        })}
      </div>

      {services.length === 0 && (
        <div className="rounded-md border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No services created for this Sunday.{" "}
            <Link
              href={`/churches/${churchId}/services/${day.date}`}
              className="text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
            >
              Plan services
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

export function NeedsAttention({
  churchId,
  items,
}: {
  churchId: string;
  items: AttentionItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="font-heading text-lg font-semibold mb-1">Needs attention</h2>
      <Ornament variant="rule" className="my-0 mb-3 text-primary/40" />
      <div className="rounded-md border border-border bg-card divide-y divide-border">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/churches/${churchId}/services/${item.date}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <span
              role="img"
              aria-label={`liturgical colour ${item.colour.toLowerCase()}`}
              className="w-1 h-6 flex-shrink-0 rounded-sm"
              style={{
                backgroundColor:
                  LITURGICAL_COLOURS[item.colour as LiturgicalColour] ?? "#4A6741",
              }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm">
                {format(parseISO(item.date), "d MMM")} — {formatLiturgicalDayName(item.cwName, item.date)}
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs text-destructive flex-shrink-0">
              <AlertTriangle className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
              {item.reason}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
