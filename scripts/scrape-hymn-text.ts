#!/usr/bin/env tsx
/**
 * Scrapes hymn lyrics from hymnary.org for all hymns in the `hymns` table
 * and inserts them verse-by-verse into the `hymnVerses` table.
 *
 * Usage: npm run db:scrape-hymns
 *
 * Rate-limited to 300ms between requests. Idempotent — re-running updates
 * existing rows via upsert. Logs any hymns where text could not be parsed.
 *
 * HTML structure on hymnary.org:
 *   <div id="text">
 *     <p>1 First line of verse one,<br />second line...<br /></p>
 *     <p>Refrain:<br />Refrain line one,<br />...<br /></p>
 *     <p>2 First line of verse two,<br />...<br /></p>
 *     <p>Chorus:<br />Chorus line one,<br />...<br /></p>
 *   </div>
 *
 * Stanzas start with a digit (the verse number).
 * Refrains/choruses start with "Refrain:" or "Chorus:".
 * Inline back-references like "[Refrain]" are stripped from stanza text.
 */

import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { hymns, hymnVerses } from "@/lib/db/schema";

// ─── Constants ────────────────────────────────────────────────────

const HYMNARY_BASE = "https://hymnary.org/hymn";
const RATE_LIMIT_MS = 300;
const PROGRESS_INTERVAL = 25;

// Matches stanza openers: optional asterisk, then one or more digits, then
// whitespace or end-of-line (e.g. "1 ", "2\n", "*3 ").
const VERSE_NUMBER_RE = /^\*?(\d+)\s/;

// Labels that indicate a refrain or chorus paragraph.
const CHORUS_LABEL_RE = /^(Refrain|Chorus)\s*:/i;

// Inline back-references to a refrain that appear inside stanza text.
const INLINE_REF_RE = /\s*\[Refrain\]|\s*\[Chorus\]/gi;

// ─── Types ─────────────────────────────────────────────────────────

interface ParsedVerse {
  verseNumber: number;
  text: string;
  isChorus: boolean;
}

// ─── Hymnal URL builder ────────────────────────────────────────────

function hymnaryUrl(book: string, number: number): string {
  // NEH → NEH1985, AM → AM2013
  const hymnalId = book === "NEH" ? "NEH1985" : "AM2013";
  return `${HYMNARY_BASE}/${hymnalId}/${number}`;
}

// ─── HTML Parsing ──────────────────────────────────────────────────

/**
 * Parse the hymn text from a hymnary.org HTML page.
 *
 * Returns an array of verses in document order with assigned verse numbers.
 * Chorus/refrain paragraphs are numbered consecutively after the preceding
 * verse (e.g. verse 1 followed by a refrain → verse 1 = 1, refrain = 2,
 * verse 2 = 3, …) so that the UNIQUE(hymnId, verseNumber) constraint is
 * satisfied and ordering is preserved.
 *
 * Returns null if the `<div id="text">` section is absent.
 * Returns an empty array if the section is present but contains no usable
 * stanzas (e.g. the text is behind a licence wall).
 */
function parseHymnText(html: string): ParsedVerse[] | null {
  const $ = cheerio.load(html);
  const textDiv = $("#text");

  if (!textDiv.length) {
    return null;
  }

  const verses: ParsedVerse[] = [];
  let nextVerseNumber = 1;

  textDiv.find("p").each((_i, el) => {
    // Replace <br> with newlines before extracting text
    $(el).find("br").replaceWith("\n");

    const raw = $(el).text();

    // Normalise whitespace: collapse runs of spaces/tabs but preserve newlines
    const lines = raw
      .split("\n")
      .map((l) => l.replace(/[ \t]+/g, " ").trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const firstLine = lines[0];

    // ── Refrain / Chorus paragraph ──
    if (CHORUS_LABEL_RE.test(firstLine)) {
      // Strip the "Refrain:" / "Chorus:" label line and join remaining lines
      const bodyLines = lines.slice(1);
      if (bodyLines.length === 0) return; // label only, nothing to store

      const text = bodyLines.join("\n");
      verses.push({ verseNumber: nextVerseNumber, text, isChorus: true });
      nextVerseNumber++;
      return;
    }

    // ── Numbered stanza ──
    const numMatch = VERSE_NUMBER_RE.exec(firstLine);
    if (numMatch) {
      // Remove the leading number (and optional asterisk) from the first line
      const firstLineBody = firstLine.slice(numMatch[0].length).trim();
      const bodyLines = firstLineBody ? [firstLineBody, ...lines.slice(1)] : lines.slice(1);

      // Strip inline back-references like "[Refrain]" from all lines
      const cleanedLines = bodyLines.map((l) => l.replace(INLINE_REF_RE, "").trim()).filter((l) => l.length > 0);

      if (cleanedLines.length === 0) return;

      const text = cleanedLines.join("\n");
      verses.push({ verseNumber: nextVerseNumber, text, isChorus: false });
      nextVerseNumber++;
      return;
    }

    // ── Unrecognised paragraph: skip silently ──
    // This covers things like blank paragraphs or copyright notices that
    // sometimes appear inside the text div.
  });

  return verses;
}

// ─── Utilities ─────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Fetching ──────────────────────────────────────────────────────

async function fetchHymnPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      // Identify as a bot doing research; hymnary.org does not block scrapers
      "User-Agent": "precentor-hymn-scraper/1.0 (build-time data pipeline)",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return res.text();
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching all hymns from database...");
  const allHymns = await db.select().from(hymns);
  console.log(`Found ${allHymns.length} hymns to process`);
  console.log(`Estimated time: ~${Math.ceil((allHymns.length * RATE_LIMIT_MS) / 60000)} minutes\n`);

  let totalVerses = 0;
  let hymnsOk = 0;
  let hymnsEmpty = 0;
  let hymnsFailed = 0;

  const failedHymns: { book: string; number: number; reason: string }[] = [];

  for (let i = 0; i < allHymns.length; i++) {
    const hymn = allHymns[i];
    const url = hymnaryUrl(hymn.book, hymn.number);

    if (i > 0 && i % PROGRESS_INTERVAL === 0) {
      const pct = ((i / allHymns.length) * 100).toFixed(1);
      console.log(
        `Progress: ${i}/${allHymns.length} (${pct}%) — ` +
          `${hymnsOk} ok, ${hymnsEmpty} empty, ${hymnsFailed} failed, ${totalVerses} verses inserted`,
      );
    }

    try {
      const html = await fetchHymnPage(url);
      const verses = parseHymnText(html);

      if (verses === null) {
        console.warn(`  [${i + 1}] ${hymn.book} ${hymn.number} — no #text div found (${url})`);
        failedHymns.push({ book: hymn.book, number: hymn.number, reason: "no #text div" });
        hymnsFailed++;
      } else if (verses.length === 0) {
        console.warn(`  [${i + 1}] ${hymn.book} ${hymn.number} — text section found but no parseable stanzas (licence wall?) (${url})`);
        failedHymns.push({ book: hymn.book, number: hymn.number, reason: "no parseable stanzas" });
        hymnsEmpty++;
      } else {
        // Upsert all verses for this hymn
        for (const verse of verses) {
          await db
            .insert(hymnVerses)
            .values({
              hymnId: hymn.id,
              verseNumber: verse.verseNumber,
              text: verse.text,
              isChorus: verse.isChorus,
            })
            .onConflictDoUpdate({
              target: [hymnVerses.hymnId, hymnVerses.verseNumber],
              set: {
                text: verse.text,
                isChorus: verse.isChorus,
              },
            });
        }

        totalVerses += verses.length;
        hymnsOk++;
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`  [${i + 1}] ${hymn.book} ${hymn.number} — FETCH ERROR: ${reason}`);
      failedHymns.push({ book: hymn.book, number: hymn.number, reason });
      hymnsFailed++;
    }

    // Rate-limit between requests (skip after the last hymn)
    if (i < allHymns.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  console.log("\n─── Summary ───────────────────────────────────────");
  console.log(`Hymns processed: ${allHymns.length}`);
  console.log(`  OK (verses inserted/updated): ${hymnsOk}`);
  console.log(`  Empty (licence wall / no stanzas): ${hymnsEmpty}`);
  console.log(`  Failed (fetch/parse error): ${hymnsFailed}`);
  console.log(`Total verses upserted: ${totalVerses}`);

  if (failedHymns.length > 0) {
    console.warn("\nHymns where text could not be retrieved:");
    for (const h of failedHymns) {
      console.warn(`  ${h.book} ${h.number} — ${h.reason}`);
    }
    console.warn("\nRe-run the script to retry failed hymns.");
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
