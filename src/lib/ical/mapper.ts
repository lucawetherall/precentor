import { db } from "@/lib/db";
import { liturgicalDays, readings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ParsedDay } from "./parser";
import {
  isValidEnum,
  VALID_SEASONS,
  VALID_COLOURS,
  VALID_LECTIONARIES,
  VALID_READING_POSITIONS,
} from "@/lib/auth/membership";

export async function upsertLiturgicalDay(data: ParsedDay) {
  if (!isValidEnum(data.season, VALID_SEASONS)) {
    throw new Error(`Invalid season: ${data.season}`);
  }
  if (!isValidEnum(data.colour, VALID_COLOURS)) {
    throw new Error(`Invalid colour: ${data.colour}`);
  }

  // Upsert the liturgical day
  const [day] = await db
    .insert(liturgicalDays)
    .values({
      date: data.date,
      season: data.season,
      colour: data.colour,
      cwName: data.name,
      icalUid: data.uid,
      rawDescription: data.description,
      collect: data.collect,
      postCommunion: data.postCommunion,
    })
    .onConflictDoUpdate({
      target: liturgicalDays.date,
      set: {
        cwName: data.name,
        season: data.season,
        colour: data.colour,
        rawDescription: data.description,
        icalUid: data.uid,
        collect: data.collect,
        postCommunion: data.postCommunion,
      },
    })
    .returning();

  // Delete existing readings for this day and re-insert
  await db.delete(readings).where(eq(readings.liturgicalDayId, day.id));

  if (data.readings.length > 0) {
    // Validate each reading
    for (const r of data.readings) {
      if (!isValidEnum(r.lectionary, VALID_LECTIONARIES)) {
        throw new Error(`Invalid lectionary: ${r.lectionary}`);
      }
      if (!isValidEnum(r.position, VALID_READING_POSITIONS)) {
        throw new Error(`Invalid reading position: ${r.position}`);
      }
    }

    await db.insert(readings).values(
      data.readings.map((r) => ({
        liturgicalDayId: day.id,
        lectionary: r.lectionary,
        position: r.position,
        reference: r.reference,
        bookName: r.bookName,
      }))
    );
  }

  return day;
}

export async function importICalFeed(parsedDays: ParsedDay[]) {
  let imported = 0;
  let errors = 0;

  for (const day of parsedDays) {
    try {
      await upsertLiturgicalDay(day);
      imported++;
    } catch (error) {
      console.error(`Failed to import ${day.date} (${day.name}):`, error);
      errors++;
    }
  }

  return { imported, errors, total: parsedDays.length };
}
