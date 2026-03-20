import { db } from "@/lib/db";
import { liturgicalDays, readings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ParsedDay } from "./parser";

export async function upsertLiturgicalDay(data: ParsedDay) {
  // Upsert the liturgical day
  const [day] = await db
    .insert(liturgicalDays)
    .values({
      date: data.date,
      season: data.season as any,
      colour: data.colour as any,
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
        season: data.season as any,
        colour: data.colour as any,
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
    await db.insert(readings).values(
      data.readings.map((r) => ({
        liturgicalDayId: day.id,
        lectionary: r.lectionary as any,
        position: r.position as any,
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
