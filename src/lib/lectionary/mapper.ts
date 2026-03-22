/**
 * Lectionary sync pipeline.
 *
 * Orchestrates the full sync process:
 * 1. Compute the liturgical calendar for a church year
 * 2. Look up readings from the scraped C of E lectionary JSON
 * 3. Optionally fetch reading text from the Oremus Bible API
 * 4. Upsert into liturgicalDays and readings tables
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { liturgicalDays, readings, liturgicalSeasonEnum, liturgicalColourEnum, lectionaryEnum, readingPositionEnum } from "@/lib/db/schema";
// lectionaryEnum used for type extraction below
import { eq, and, or, ne, isNull } from "drizzle-orm";

const VALID_SEASONS: Set<string> = new Set(liturgicalSeasonEnum.enumValues);
const VALID_COLOURS: Set<string> = new Set(liturgicalColourEnum.enumValues);
const VALID_POSITIONS: Set<string> = new Set(readingPositionEnum.enumValues);
import {
  computeLiturgicalCalendar,
  getChurchYear,
  getLectionaryYear,
} from "./calendar";
import { fetchReadingText } from "./oremus-api";
import { parseBookName } from "./bible-books";
import type { LectionaryData, ServiceReadings } from "./types";
import lectionaryData from "../../data/lectionary-coe.json";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface SyncOptions {
  /** Fetch reading text from Oremus Bible API (default: false) */
  fetchText?: boolean;
  /** Bible version for Oremus API (default: env BIBLE_VERSION or "NRSVAE") */
  bibleVersion?: string;
}

interface SyncResult {
  imported: number;
  errors: number;
  total: number;
  lectionaryYear: string;
  churchYear: string;
}

/**
 * Sync the lectionary for a given church year.
 */
export async function syncLectionaryForYear(
  churchYear: { startYear: number; endYear: number },
  options?: SyncOptions,
): Promise<SyncResult> {
  const data = lectionaryData as LectionaryData;
  const year = getLectionaryYear(churchYear);
  const fetchText = options?.fetchText ?? false;
  const bibleVersion = options?.bibleVersion ?? process.env.BIBLE_VERSION ?? "NRSVAE";

  logger.info("Syncing lectionary", { churchYear: `${churchYear.startYear}/${churchYear.endYear}`, year });

  // 1. Compute the calendar
  const calendar = await computeLiturgicalCalendar(churchYear);
  logger.info("Calendar dates computed", { count: calendar.length });

  let imported = 0;
  let errors = 0;

  // 2. For each date, look up readings and upsert
  for (const entry of calendar) {
    try {
      const sundayData = data.sundays[entry.sundayKey];
      if (!sundayData) {
        logger.warn("No lectionary data for key", { sundayKey: entry.sundayKey });
        continue;
      }

      const yearReadings = sundayData.years[year];
      if (!yearReadings) {
        logger.warn("No readings for year", { year, name: entry.name });
        continue;
      }

      // Validate enum values before inserting
      if (!VALID_SEASONS.has(entry.season)) {
        logger.warn("Invalid season, skipping", { season: entry.season, date: entry.date });
        continue;
      }
      if (!VALID_COLOURS.has(entry.colour)) {
        logger.warn("Invalid colour, skipping", { colour: entry.colour, date: entry.date });
        continue;
      }

      const season = entry.season as (typeof liturgicalSeasonEnum.enumValues)[number];
      const colour = entry.colour as (typeof liturgicalColourEnum.enumValues)[number];

      // Upsert the liturgical day.
      // The table has two unique constraints (date + ical_uid) but ON CONFLICT
      // can only target one. Pre-delete any row with a matching date but
      // mismatched ical_uid to prevent a constraint violation on date.
      const [day] = await db.transaction(async (tx) => {
        await tx.delete(liturgicalDays).where(
          and(
            eq(liturgicalDays.date, entry.date),
            or(
              ne(liturgicalDays.icalUid, entry.sundayKey),
              isNull(liturgicalDays.icalUid),
            ),
          ),
        );

        return tx
          .insert(liturgicalDays)
          .values({
            date: entry.date,
            season,
            colour,
            cwName: sundayData.name || entry.name,
            icalUid: entry.sundayKey,
            lectionaryYear: year,
            collect: sundayData.collect ?? null,
            postCommunion: sundayData.postCommunion ?? null,
          })
          .onConflictDoUpdate({
            target: liturgicalDays.icalUid,
            set: {
              date: entry.date,
              cwName: sundayData.name || entry.name,
              season,
              colour,
              lectionaryYear: year,
              collect: sundayData.collect ?? null,
              postCommunion: sundayData.postCommunion ?? null,
            },
          })
          .returning();
      });

      // Build reading rows from all three services
      const readingRows = buildReadingRows(yearReadings, day.id);

      // If fetching text, do it before the transaction to avoid holding it open
      if (fetchText && readingRows.length > 0) {
        for (let i = 0; i < readingRows.length; i++) {
          if (i > 0) await sleep(200); // Rate limit Oremus API
          const text = await fetchReadingText(readingRows[i].reference, bibleVersion);
          readingRows[i].readingText = text || null;
          readingRows[i].bibleVersion = bibleVersion;
        }
      }

      // Delete and re-insert readings in a transaction to avoid data loss on partial failure
      await db.transaction(async (tx) => {
        await tx.delete(readings).where(eq(readings.liturgicalDayId, day.id));
        if (readingRows.length > 0) {
          await tx.insert(readings).values(readingRows);
        }
      });

      imported++;
    } catch (error) {
      logger.error("Failed to import liturgical day", error, { date: entry.date, name: entry.name });
      errors++;
    }
  }

  return {
    imported,
    errors,
    total: calendar.length,
    lectionaryYear: year,
    churchYear: `${churchYear.startYear}/${churchYear.endYear}`,
  };
}

/**
 * Build reading rows from a ServiceReadings object.
 */
type LectionaryValue = (typeof lectionaryEnum.enumValues)[number];
type PositionValue = (typeof readingPositionEnum.enumValues)[number];

function buildReadingRows(
  yearReadings: ServiceReadings,
  liturgicalDayId: string,
) {
  const rows: Array<{
    liturgicalDayId: string;
    lectionary: LectionaryValue;
    position: PositionValue;
    reference: string;
    bookName: string | null;
    readingText: string | null;
    bibleVersion: string | null;
  }> = [];

  const services: Array<[LectionaryValue, typeof yearReadings.principal]> = [
    ["PRINCIPAL", yearReadings.principal],
    ["SECOND", yearReadings.second],
    ["THIRD", yearReadings.third],
  ];

  for (const [lectionary, serviceReadings] of services) {
    for (const reading of serviceReadings) {
      const position = reading.position as string;
      if (!VALID_POSITIONS.has(position)) {
        logger.warn("Invalid reading position, skipping", { position, reference: reading.reference });
        continue;
      }
      rows.push({
        liturgicalDayId,
        lectionary,
        position: position as PositionValue,
        reference: reading.reference,
        bookName: parseBookName(reading.reference),
        readingText: null,
        bibleVersion: null,
      });
    }
  }

  return rows;
}

/**
 * Convenience: sync the current church year.
 */
export async function syncCurrentYear(options?: SyncOptions): Promise<SyncResult> {
  const churchYear = getChurchYear(new Date());
  return syncLectionaryForYear(churchYear, options);
}
