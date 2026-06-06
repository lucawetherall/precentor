import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { performanceLogs, churches } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireChurchRole } from "@/lib/auth/permissions";
import { RepertoireList } from "./repertoire-list";
import { readSheetMusicLink } from "@/lib/churches/settings";
import { SheetMusicLinkButton } from "./sheet-music-link-button";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function RepertoirePage({ params }: Props) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) redirect("/churches");

  interface PerformanceLogRow { id: string; date: string; freeText: string | null; createdAt: Date; }
  let logs: PerformanceLogRow[] = [];
  let pieces: { name: string; count: number; lastDate: string }[] = [];
  let churchSettings: Record<string, unknown> | null = null;
  // Normalise null/empty free text to "Unknown" once, reused for the GROUP BY key.
  const pieceName = sql<string>`coalesce(nullif(${performanceLogs.freeText}, ''), 'Unknown')`;
  try {
    [logs, pieces, churchSettings] = await Promise.all([
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
      // Aggregate repeat counts in SQL across the church's *whole* history. The
      // old in-JS grouping only saw the 200 most-recent rows, so a frequently
      // sung piece could be undercounted.
      db
        .select({
          name: pieceName,
          count: sql<number>`count(*)::int`,
          lastDate: sql<string>`max(${performanceLogs.date})`,
        })
        .from(performanceLogs)
        .where(eq(performanceLogs.churchId, churchId))
        .groupBy(pieceName),
      db
        .select({ settings: churches.settings })
        .from(churches)
        .where(eq(churches.id, churchId))
        .limit(1)
        .then((rows) => rows[0]?.settings ?? null),
    ]);
  } catch (err) { logger.error("[repertoire/page] Failed to load logs/settings", err); }

  const sheetMusicLink = readSheetMusicLink(churchSettings);

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
