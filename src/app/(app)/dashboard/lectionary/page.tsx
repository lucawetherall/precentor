import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { liturgicalDays } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { LectionarySync } from "./sync-form";

export default async function LectionaryPage() {
  let days: (typeof liturgicalDays.$inferSelect)[] = [];
  try {
    days = await db
      .select()
      .from(liturgicalDays)
      .orderBy(desc(liturgicalDays.date))
      .limit(60); // ~1 church year of Sundays + feasts
  } catch (err) {
    logger.warn("Failed to load liturgical days", { error: String(err) });
  }

  return (
    <main className="p-8 max-w-4xl">
      <h1 className="text-3xl font-heading font-semibold mb-2">Lectionary Calendar</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Syncs the Church of England Common Worship Lectionary. Readings are sourced
        from the C of E website with scripture text from the Oremus Bible Browser.
      </p>

      <LectionarySync />

      <div className="mt-8">
        <h2 className="text-xl font-heading font-semibold mb-4">
          Imported Days ({days.length})
        </h2>

        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No data imported yet. Use the sync button above to populate the lectionary.
          </p>
        ) : (
          <div className="border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-foreground text-background">
                  <th className="px-3 py-2 text-left font-body font-normal">Date</th>
                  <th className="px-3 py-2 text-left font-body font-normal">Name</th>
                  <th className="px-3 py-2 text-left font-body font-normal">Season</th>
                  <th className="px-3 py-2 text-left font-body font-normal">Year</th>
                  <th className="px-3 py-2 text-left font-body font-normal">Colour</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day, i) => (
                  <tr
                    key={day.id}
                    className={i % 2 === 0 ? "bg-white" : "bg-background"}
                  >
                    <td className="px-3 py-2 font-mono text-xs">{day.date}</td>
                    <td className="px-3 py-2">{day.cwName}</td>
                    <td className="px-3 py-2 text-xs">{day.season}</td>
                    <td className="px-3 py-2 text-xs font-mono">{day.lectionaryYear || "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
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
                      <span className="ml-2 text-xs">{day.colour}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
