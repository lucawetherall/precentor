import { db } from "@/lib/db";
import { liturgicalDays } from "@/lib/db/schema";
import { gte, asc } from "drizzle-orm";
import { format } from "date-fns";
import Link from "next/link";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function SundaysPage({ params }: Props) {
  const { churchId } = await params;
  const today = format(new Date(), "yyyy-MM-dd");

  let upcomingDays: any[] = [];
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
            No liturgical calendar data. Import the Oremus iCal feed from the{" "}
            <Link href="/dashboard/lectionary" className="text-primary underline">
              Lectionary page
            </Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingDays.map((day: any) => (
            <Link
              key={day.id}
              href={`/churches/${churchId}/sundays/${day.date}`}
              className="flex items-center gap-4 border border-border bg-card p-4 shadow-sm hover:border-primary transition-colors"
            >
              <span
                className="w-2 h-8 flex-shrink-0"
                style={{
                  backgroundColor:
                    day.colour === "PURPLE" ? "#5B2C6F" :
                    day.colour === "GOLD" ? "#D4AF37" :
                    day.colour === "RED" ? "#8B2500" :
                    day.colour === "WHITE" ? "#F5F0E8" :
                    day.colour === "ROSE" ? "#C48A9F" :
                    "#4A6741",
                }}
              />
              <div className="flex-1">
                <p className="font-mono text-xs text-muted-foreground">{day.date}</p>
                <p className="font-heading text-lg">{day.cwName}</p>
              </div>
              <span className="text-xs text-muted-foreground">{day.season}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
