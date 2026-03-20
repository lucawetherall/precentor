import { db } from "@/lib/db";
import { services, liturgicalDays, musicSlots } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { SERVICE_TYPE_LABELS } from "@/types";
import { ServiceSheetActions } from "./actions-client";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function ServiceSheetsPage({ params }: Props) {
  const { churchId } = await params;

  let recentServices: any[] = [];
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
      })
      .from(services)
      .innerJoin(liturgicalDays, eq(services.liturgicalDayId, liturgicalDays.id))
      .where(eq(services.churchId, churchId))
      .orderBy(desc(liturgicalDays.date))
      .limit(20);
  } catch { /* DB not available */ }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-heading font-semibold mb-6">Service Sheets</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Generate PDF or Word service sheets for any planned service.
      </p>

      {recentServices.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No services found. Plan music for a Sunday first.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentServices.map((s: any) => (
            <div
              key={s.serviceId}
              className="flex items-center gap-4 border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex-1">
                <p className="font-heading text-lg">{s.cwName}</p>
                <p className="text-sm text-muted-foreground">
                  {(SERVICE_TYPE_LABELS as any)[s.serviceType] || s.serviceType}
                  {s.time && ` — ${s.time}`}
                </p>
                <p className="text-xs text-muted-foreground font-mono">{s.date}</p>
              </div>
              <ServiceSheetActions serviceId={s.serviceId} churchId={churchId} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
