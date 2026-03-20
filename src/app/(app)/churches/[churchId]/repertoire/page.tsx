import { db } from "@/lib/db";
import { performanceLogs, musicSlots, services, liturgicalDays } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function RepertoirePage({ params }: Props) {
  const { churchId } = await params;

  let logs: any[] = [];
  try {
    logs = await db
      .select({
        id: performanceLogs.id,
        date: performanceLogs.date,
        freeText: performanceLogs.freeText,
        createdAt: performanceLogs.createdAt,
      })
      .from(performanceLogs)
      .where(eq(performanceLogs.churchId, churchId))
      .orderBy(desc(performanceLogs.date))
      .limit(100);
  } catch { /* DB not available */ }

  // Group by piece for repeat detection
  const pieceCounts: Record<string, { count: number; lastDate: string }> = {};
  for (const log of logs) {
    const key = log.freeText || "Unknown";
    if (!pieceCounts[key]) {
      pieceCounts[key] = { count: 0, lastDate: log.date };
    }
    pieceCounts[key].count++;
    if (log.date > pieceCounts[key].lastDate) {
      pieceCounts[key].lastDate = log.date;
    }
  }

  const sortedPieces = Object.entries(pieceCounts).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-heading font-semibold mb-6">Repertoire Log</h1>

      {logs.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No performance history yet. Music will be logged automatically after services are marked as archived.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="text-xl font-heading font-semibold mb-4">Most Performed</h2>
            <div className="border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-foreground text-background">
                    <th className="px-3 py-2 text-left font-body font-normal">Piece</th>
                    <th className="px-3 py-2 text-right font-body font-normal">Times</th>
                    <th className="px-3 py-2 text-right font-body font-normal">Last Performed</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPieces.slice(0, 30).map(([piece, data], i) => (
                    <tr key={piece} className={i % 2 === 0 ? "bg-white" : "bg-background"}>
                      <td className="px-3 py-2">{piece}</td>
                      <td className="px-3 py-2 text-right font-mono">{data.count}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{data.lastDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-heading font-semibold mb-4">Recent Performances</h2>
            <div className="space-y-1">
              {logs.slice(0, 30).map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 text-sm border-b border-border py-1">
                  <span className="font-mono text-xs text-muted-foreground w-24">{log.date}</span>
                  <span>{log.freeText || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
