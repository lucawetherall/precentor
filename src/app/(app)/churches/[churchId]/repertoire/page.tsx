import { db } from "@/lib/db";
import { performanceLogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { RepertoireList } from "./repertoire-list";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function RepertoirePage({ params }: Props) {
  const { churchId } = await params;

  interface PerformanceLogRow { id: string; date: string; freeText: string | null; createdAt: Date; }
  let logs: PerformanceLogRow[] = [];
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
      .limit(200);
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

  const pieces = Object.entries(pieceCounts).map(([name, data]) => ({
    name,
    count: data.count,
    lastDate: data.lastDate,
  }));

  const logEntries = logs.map((l) => ({
    id: l.id,
    date: l.date,
    freeText: l.freeText,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <h1 className="text-3xl font-heading font-semibold mb-6">Repertoire Log</h1>
      <RepertoireList pieces={pieces} logs={logEntries} />
    </div>
  );
}
