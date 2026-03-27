import { db } from "@/lib/db";
import { liturgicalDays, services, serviceSections } from "@/lib/db/schema";
import { gte, asc, eq, inArray, and } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { LITURGICAL_COLOURS } from "@/types";
import type { LiturgicalColour } from "@/types";
import { calculateCompleteness } from "@/lib/services/completeness";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function ServicesPage({ params }: Props) {
  const { churchId } = await params;
  const today = format(new Date(), "yyyy-MM-dd");

  let upcomingDays: InferSelectModel<typeof liturgicalDays>[] = [];
  let servicesByDay: Map<string, InferSelectModel<typeof services>[]> = new Map();
  let sectionsByService: Map<string, InferSelectModel<typeof serviceSections>[]> = new Map();

  try {
    upcomingDays = await db
      .select()
      .from(liturgicalDays)
      .where(gte(liturgicalDays.date, today))
      .orderBy(asc(liturgicalDays.date))
      .limit(20);

    if (upcomingDays.length > 0) {
      const dayIds = upcomingDays.map((d) => d.id);

      // Fetch services for these days that belong to this church
      const churchServices = await db
        .select()
        .from(services)
        .where(
          and(
            eq(services.churchId, churchId),
            inArray(services.liturgicalDayId, dayIds)
          )
        );

      for (const service of churchServices) {
        const dayId = service.liturgicalDayId;
        if (!servicesByDay.has(dayId)) {
          servicesByDay.set(dayId, []);
        }
        servicesByDay.get(dayId)!.push(service);
      }

      // Fetch sections for all those services
      if (churchServices.length > 0) {
        const serviceIds = churchServices.map((s) => s.id);
        const allSections = await db
          .select()
          .from(serviceSections)
          .where(inArray(serviceSections.serviceId, serviceIds));

        for (const section of allSections) {
          if (!sectionsByService.has(section.serviceId)) {
            sectionsByService.set(section.serviceId, []);
          }
          sectionsByService.get(section.serviceId)!.push(section);
        }
      }
    }
  } catch { /* DB not available */ }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-heading font-semibold mb-6">Upcoming Services</h1>

      {upcomingDays.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No liturgical calendar data available. Run the database seed to populate the calendar.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingDays.map((day) => {
            const dayServices = servicesByDay.get(day.id) ?? [];

            return (
              <Link
                key={day.id}
                href={`/churches/${churchId}/services/${day.date}`}
                className="flex items-center gap-4 border border-border bg-card p-4 shadow-sm hover:border-primary transition-colors"
              >
                <span
                  aria-hidden="true"
                  className="w-2 h-8 flex-shrink-0"
                  style={{
                    backgroundColor: LITURGICAL_COLOURS[day.colour as LiturgicalColour] ?? "#4A6741",
                  }}
                />
                <div className="flex-1">
                  <p className="font-mono text-xs text-muted-foreground">{format(parseISO(day.date), "EEE d MMM yyyy")}</p>
                  <p className="font-heading text-lg">{day.cwName}</p>
                </div>

                {/* Completeness dots for each service on this day */}
                {dayServices.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {dayServices.map((service) => {
                      const sections = sectionsByService.get(service.id) ?? [];
                      const status = calculateCompleteness(
                        sections.map((s) => ({
                          // serviceSections does not store musicSlotType; use null
                          musicSlotType: null,
                          musicSlotId: s.musicSlotId ?? null,
                          placeholderType: s.placeholderType ?? null,
                          placeholderValue: s.placeholderValue ?? null,
                          visible: s.visible,
                        }))
                      );

                      const statusColor =
                        status === "complete"
                          ? "bg-secondary"
                          : status === "partial"
                          ? "bg-warning"
                          : "bg-muted-foreground";

                      const statusLabel =
                        status === "complete"
                          ? "Service complete"
                          : status === "partial"
                          ? "Service partially complete"
                          : "Service empty";

                      return (
                        <span
                          key={service.id}
                          className={`inline-block w-2 h-2 rounded-full ${statusColor}`}
                          title={statusLabel}
                        />
                      );
                    })}
                  </div>
                )}

                <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {day.season.replace(/_/g, " ")}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
