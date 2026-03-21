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
import { liturgicalDays, readings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

  console.log(`Syncing lectionary for ${churchYear.startYear}/${churchYear.endYear} (Year ${year})`);

  // 1. Compute the calendar
  const calendar = await computeLiturgicalCalendar(churchYear);
  console.log(`Calendar: ${calendar.length} dates`);

  let imported = 0;
  let errors = 0;

  // 2. For each date, look up readings and upsert
  for (const entry of calendar) {
    try {
      const sundayData = data.sundays[entry.sundayKey];
      if (!sundayData) {
        console.warn(`No lectionary data for key: ${entry.sundayKey}`);
        continue;
      }

      const yearReadings = sundayData.years[year];
      if (!yearReadings) {
        console.warn(`No Year ${year} readings for: ${entry.name}`);
        continue;
      }

      // Upsert the liturgical day
      const [day] = await db
        .insert(liturgicalDays)
        .values({
          date: entry.date,
          season: entry.season as any,
          colour: entry.colour as any,
          cwName: sundayData.name || entry.name,
          icalUid: entry.sundayKey, // Repurposed: stores the JSON key
          lectionaryYear: year,
          collect: sundayData.collect ?? null,
          postCommunion: sundayData.postCommunion ?? null,
        })
        .onConflictDoUpdate({
          target: liturgicalDays.date,
          set: {
            cwName: sundayData.name || entry.name,
            season: entry.season as any,
            colour: entry.colour as any,
            icalUid: entry.sundayKey,
            lectionaryYear: year,
            collect: sundayData.collect ?? null,
            postCommunion: sundayData.postCommunion ?? null,
          },
        })
        .returning();

      // Delete existing readings and re-insert
      await db.delete(readings).where(eq(readings.liturgicalDayId, day.id));

      // Build reading rows from all three services
      const readingRows = buildReadingRows(yearReadings, day.id, fetchText, bibleVersion);

      if (readingRows.length > 0) {
        // If fetching text, do it now
        if (fetchText) {
          for (let i = 0; i < readingRows.length; i++) {
            if (i > 0) await sleep(200); // Rate limit Oremus API
            const text = await fetchReadingText(readingRows[i].reference, bibleVersion);
            readingRows[i].readingText = text || null;
            readingRows[i].bibleVersion = bibleVersion;
          }
        }

        await db.insert(readings).values(readingRows);
      }

      imported++;
    } catch (error) {
      console.error(`Failed to import ${entry.date} (${entry.name}):`, error);
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
function buildReadingRows(
  yearReadings: ServiceReadings,
  liturgicalDayId: string,
  _fetchText: boolean,
  _bibleVersion: string,
) {
  const rows: Array<{
    liturgicalDayId: string;
    lectionary: "PRINCIPAL" | "SECOND" | "THIRD";
    position: any;
    reference: string;
    bookName: string | null;
    readingText: string | null;
    bibleVersion: string | null;
  }> = [];

  const services: Array<[string, typeof yearReadings.principal]> = [
    ["PRINCIPAL", yearReadings.principal],
    ["SECOND", yearReadings.second],
    ["THIRD", yearReadings.third],
  ];

  for (const [lectionary, serviceReadings] of services) {
    for (const reading of serviceReadings) {
      rows.push({
        liturgicalDayId,
        lectionary: lectionary as any,
        position: reading.position as any,
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
