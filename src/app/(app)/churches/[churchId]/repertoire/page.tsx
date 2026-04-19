import { db } from "@/lib/db";
import { performanceLogs, churches } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { RepertoireList } from "./repertoire-list";
import { readSheetMusicLink } from "@/lib/churches/settings";
import { SheetMusicLinkButton } from "./sheet-music-link-button";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function RepertoirePage({ params }: Props) {
  const { churchId } = await params;

  interface PerformanceLogRow { id: string; date: string; freeText: string | null; createdAt: Date; }
  let logs: PerformanceLogRow[] = [];
  let churchSettings: Record<string, unknown> | null = null;
  try {
    [logs, churchSettings] = await Promise.all([
      db
        .select({
          id: performanceLogs.id,
          date: performanceLogs.date,
          freeText: performanceLogs.freeText,
          createdAt: performanceLogs.createdAt,
        })
        .from(performanceLogs)
        .where(eq(performanceLogs.churchId, churchId))
        .orderBy(desc(performanceLogs.date))
        .limit(200),
      db
        .select({ settings: churches.settings })
        .from(churches)
        .where(eq(churches.id, churchId))
        .limit(1)
        .then((rows) => rows[0]?.settings ?? null),
    ]);
  } catch (err) { console.error("Failed to load data:", err); }

  const sheetMusicLink = readSheetMusicLink(churchSettings);

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
      {sheetMusicLink && <SheetMusicLinkButton link={sheetMusicLink} />}
      <RepertoireList pieces={pieces} logs={logEntries} />
    </div>
  );
}
