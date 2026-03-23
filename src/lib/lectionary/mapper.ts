/**
 * Lectionary seed utility.
 *
 * Populates liturgical_days and readings from bundled data.
 * No external API calls — everything comes from JSON files.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  liturgicalDays, readings,
  liturgicalSeasonEnum, liturgicalColourEnum,
  lectionaryEnum, readingPositionEnum,
} from "@/lib/db/schema";
import { eq, and, or, ne, isNull } from "drizzle-orm";
import { computeLiturgicalCalendar, getLectionaryYear } from "./calendar";
import { parseBookName } from "./bible-books";
import type { LectionaryData, ServiceReadings } from "./types";
import lectionaryData from "../../data/lectionary-coe.json";
import readingsTextData from "../../data/lectionary-readings-text.json";

const VALID_SEASONS: Set<string> = new Set(liturgicalSeasonEnum.enumValues);
const VALID_COLOURS: Set<string> = new Set(liturgicalColourEnum.enumValues);
const VALID_POSITIONS: Set<string> = new Set(readingPositionEnum.enumValues);

type LectionaryValue = (typeof lectionaryEnum.enumValues)[number];
type PositionValue = (typeof readingPositionEnum.enumValues)[number];

const textLookup = readingsTextData as Record<string, string>;

interface SeedResult {
  imported: number;
  errors: number;
  total: number;
  lectionaryYear: string;
  churchYear: string;
}

/**
 * Build reading rows from a ServiceReadings object,
 * looking up scripture text from bundled JSON.
 */
export function buildReadingRows(
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
        logger.warn("Invalid reading position, skipping", {
          position, reference: reading.reference,
        });
        continue;
      }

      const text = textLookup[reading.reference];
      rows.push({
        liturgicalDayId,
        lectionary,
        position: position as PositionValue,
        reference: reading.reference,
        bookName: parseBookName(reading.reference),
        readingText: text || null,
        bibleVersion: text ? "NRSVAE" : null,
      });
    }
  }

  return rows;
}

/**
 * Seed the lectionary for a given church year from bundled data.
 */
export async function seedLectionaryData(
  churchYear: { startYear: number; endYear: number },
): Promise<SeedResult> {
  const data = lectionaryData as LectionaryData;
  const year = getLectionaryYear(churchYear);

  logger.info("Seeding lectionary", {
    churchYear: `${churchYear.startYear}/${churchYear.endYear}`, year,
  });

  const calendar = computeLiturgicalCalendar(churchYear);
  logger.info("Calendar dates computed", { count: calendar.length });

  let imported = 0;
  let errors = 0;

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

      const readingRows = buildReadingRows(yearReadings, day.id);

      await db.transaction(async (tx) => {
        await tx.delete(readings).where(eq(readings.liturgicalDayId, day.id));
        if (readingRows.length > 0) {
          await tx.insert(readings).values(readingRows);
        }
      });

      imported++;
    } catch (error) {
      logger.error("Failed to import liturgical day", error, {
        date: entry.date, name: entry.name,
      });
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
