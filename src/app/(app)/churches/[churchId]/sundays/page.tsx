import { db } from "@/lib/db";
import { liturgicalDays } from "@/lib/db/schema";
import { gte, asc } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { LITURGICAL_COLOURS } from "@/types";
import type { LiturgicalColour } from "@/types";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function SundaysPage({ params }: Props) {
  const { churchId } = await params;
  const today = format(new Date(), "yyyy-MM-dd");

  let upcomingDays: InferSelectModel<typeof liturgicalDays>[] = [];
  try {
    upcomingDays = await db
      .select()
      .from(liturgicalDays)
      .where(gte(liturgicalDays.date, today))
      .orderBy(asc(liturgicalDays.date))
      .limit(20);
  } catch { /* DB not available */ }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-heading font-semibold mb-6">Upcoming Sundays</h1>

      {upcomingDays.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No liturgical calendar data. Sync the lectionary from the{" "}
            <Link href="/dashboard/lectionary" className="text-primary underline">
              Lectionary page
            </Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingDays.map((day) => (
            <Link
              key={day.id}
              href={`/churches/${churchId}/sundays/${day.date}`}
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
              <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                {day.season.replace(/_/g, " ")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
