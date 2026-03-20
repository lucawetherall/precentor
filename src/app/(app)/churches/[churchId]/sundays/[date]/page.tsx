import { db } from "@/lib/db";
import { liturgicalDays, readings, services, musicSlots, hymns, anthems, massSettings, canticleSettings, responsesSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { SERVICE_TYPE_LABELS, LITURGICAL_COLOURS } from "@/types";
import { ServicePlanner } from "./service-planner";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Props {
  params: Promise<{ churchId: string; date: string }>;
}

export default async function SundayDetailPage({ params }: Props) {
  const { churchId, date } = await params;

  let day: any = null;
  let dayReadings: any[] = [];
  let dayServices: any[] = [];

  try {
    const days = await db.select().from(liturgicalDays).where(eq(liturgicalDays.date, date)).limit(1);
    day = days[0] || null;

    if (day) {
      dayReadings = await db.select().from(readings).where(eq(readings.liturgicalDayId, day.id));

      dayServices = await db
        .select()
        .from(services)
        .where(and(eq(services.churchId, churchId), eq(services.liturgicalDayId, day.id)));
    }
  } catch { /* DB not available */ }

  if (!day) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">No liturgical data for {date}.</p>
        <Link href={`/churches/${churchId}/sundays`} className="text-primary underline text-sm mt-2 inline-block">
          Back to Sundays
        </Link>
      </div>
    );
  }

  const colour = (LITURGICAL_COLOURS as any)[day.colour] || "#4A6741";

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href={`/churches/${churchId}/sundays`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        Back to Sundays
      </Link>

      <div className="flex items-start gap-4 mb-6">
        <span className="w-3 h-12 flex-shrink-0 mt-1" style={{ backgroundColor: colour }} />
        <div>
          <h1 className="text-3xl font-heading font-semibold">{day.cwName}</h1>
          <p className="text-sm text-muted-foreground font-mono">{day.date}</p>
          <p className="text-sm text-muted-foreground">{day.season} — {day.colour}</p>
        </div>
      </div>

      {/* Readings */}
      {dayReadings.length > 0 && (
        <div className="mb-6 border border-border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-heading font-semibold mb-3">Readings</h2>
          <div className="space-y-1">
            {dayReadings.map((r: any) => (
              <div key={r.id} className="flex gap-3 text-sm">
                <span className="text-muted-foreground w-24 flex-shrink-0">{r.position}</span>
                <span>{r.reference}</span>
                <span className="text-xs text-muted-foreground ml-auto">{r.lectionary}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {day.collect && (
        <div className="mb-6 border border-border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-heading font-semibold mb-2">Collect</h2>
          <p className="text-sm italic text-muted-foreground">{day.collect}</p>
        </div>
      )}

      {/* Service Planner */}
      <ServicePlanner
        churchId={churchId}
        liturgicalDayId={day.id}
        date={date}
        existingServices={dayServices}
      />
    </div>
  );
}
