import { db } from "@/lib/db";
import { services, liturgicalDays } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { format, parseISO } from "date-fns";
import { SERVICE_TYPE_LABELS } from "@/types";
import type { ServiceType } from "@/types";
import { ServiceSheetActions, BatchDownloadActions } from "./actions-client";
import { BookOpen } from "lucide-react";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function ServiceSheetsPage({ params }: Props) {
  const { churchId } = await params;

  interface ServiceSheetRow {
    serviceId: string;
    serviceType: string;
    time: string | null;
    status: string;
    date: string;
    cwName: string;
    colour: string;
    sheetMode: string | null;
    eucharisticPrayer: string | null;
  }
  let recentServices: ServiceSheetRow[] = [];
  try {
    recentServices = await db
      .select({
        serviceId: services.id,
        serviceType: services.serviceType,
        time: services.time,
        status: services.status,
        date: liturgicalDays.date,
        cwName: liturgicalDays.cwName,
        colour: liturgicalDays.colour,
        sheetMode: services.sheetMode,
        eucharisticPrayer: services.eucharisticPrayer,
      })
      .from(services)
      .innerJoin(liturgicalDays, eq(services.liturgicalDayId, liturgicalDays.id))
      .where(eq(services.churchId, churchId))
      .orderBy(desc(liturgicalDays.date))
      .limit(20);
  } catch { /* DB not available */ }

  const serviceIds = recentServices.map((s) => s.serviceId);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-heading font-semibold mb-6">Service Sheets</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Generate PDF or Word service sheets for any planned service.
        Choose <strong>Summary</strong> for a music and readings overview, or{" "}
        <strong>Booklet</strong> for a full liturgical order with congregational responses.
      </p>

      {recentServices.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No services found. Plan music for a Sunday first.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <BatchDownloadActions serviceIds={serviceIds} churchId={churchId} />

          {recentServices.map((s: ServiceSheetRow) => {
            const isBookletReady =
              s.sheetMode === "booklet" && s.eucharisticPrayer;

            return (
              <div
                key={s.serviceId}
                className="flex items-center gap-4 border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-heading text-lg">{s.cwName}</p>
                    {s.sheetMode === "booklet" && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded ${
                          isBookletReady
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                        title={
                          isBookletReady
                            ? "Booklet data complete"
                            : "Booklet missing eucharistic prayer"
                        }
                      >
                        <BookOpen className="h-2.5 w-2.5" strokeWidth={2} aria-hidden="true" />
                        {isBookletReady ? "Booklet ready" : "Booklet incomplete"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {SERVICE_TYPE_LABELS[s.serviceType as ServiceType] || s.serviceType}
                    {s.time && ` — ${s.time}`}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {format(parseISO(s.date), "d MMM yyyy")}
                  </p>
                </div>
                <ServiceSheetActions
                  serviceId={s.serviceId}
                  churchId={churchId}
                  defaultMode={
                    (s.sheetMode as "summary" | "booklet") ?? "summary"
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
