#!/usr/bin/env tsx
/**
 * Scrapes all NRSVAE scripture text from the Oremus Bible Browser for every
 * reading reference in the bundled C of E lectionary data.
 *
 * Usage: npx tsx scripts/scrape-readings-text.ts
 * Output: src/data/lectionary-readings-text.json
 *
 * NOTE: This is a standalone build-time script. It does NOT use @/ path aliases,
 * app imports, or any Next.js infrastructure.
 *
 * Expected runtime: 10-30 minutes (rate-limited to 200ms between requests).
 */

import * as cheerio from "cheerio";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OREMUS_BASE = "https://bible.oremus.org/?version=NRSVAE&passage=";
const RATE_LIMIT_MS = 200;
const PROGRESS_INTERVAL = 50;

// ─── Types ────────────────────────────────────────────────────────

interface LectionaryReading {
  reference: string;
  position: string;
}

interface ServiceReadings {
  principal: LectionaryReading[];
  second: LectionaryReading[];
  third: LectionaryReading[];
}

interface LectionarySunday {
  section: string;
  name: string;
  colour: string;
  season: string;
  years: {
    A?: ServiceReadings;
    B?: ServiceReadings;
    C?: ServiceReadings;
  };
}

interface LectionaryData {
  yearMap: Record<string, "A" | "B" | "C">;
  sundays: Record<string, LectionarySunday>;
}

// ─── HTML Parsing (inline copy from oremus-api.ts) ───────────────

function extractScriptureText(html: string): string {
  const $ = cheerio.load(html);
  const bibleText = $("div.bibletext");
  if (!bibleText.length) return "";
  bibleText.find("h2, h3, h4, .wk").remove();
  bibleText.find("br").replaceWith("\n");
  let text = bibleText
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, " - ")
    .replace(/\u0091/g, "'")
    .replace(/\u0092/g, "'")
    .replace(/\u0093/g, '"')
    .replace(/\u0094/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  text = text.replace(/^\d+\s*/, "");
  return text;
}

// ─── Reference Collection ─────────────────────────────────────────

function collectUniqueReferences(data: LectionaryData): string[] {
  const seen = new Set<string>();

  for (const sunday of Object.values(data.sundays)) {
    for (const year of ["A", "B", "C"] as const) {
      const yearReadings = sunday.years[year];
      if (!yearReadings) continue;

      for (const service of ["principal", "second", "third"] as const) {
        for (const reading of yearReadings[service]) {
          if (reading.reference) {
            seen.add(reading.reference);
          }
        }
      }
    }
  }

  return Array.from(seen).sort();
}

// ─── Fetching ─────────────────────────────────────────────────────

async function fetchReading(reference: string): Promise<string> {
  const url = `${OREMUS_BASE}${encodeURIComponent(reference)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for reference "${reference}": ${res.statusText}`);
  }
  const html = await res.text();
  return extractScriptureText(html);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const dataPath = resolve(__dirname, "../src/data/lectionary-coe.json");
  console.log(`Reading lectionary data from ${dataPath}`);

  const raw = readFileSync(dataPath, "utf-8");
  const data: LectionaryData = JSON.parse(raw);

  const allSundays = Object.keys(data.sundays).length;
  console.log(`Loaded ${allSundays} sundays`);

  const references = collectUniqueReferences(data);
  console.log(`Found ${references.length} unique reading references`);
  console.log(`Estimated time: ~${Math.ceil((references.length * RATE_LIMIT_MS) / 60000)} minutes`);
  console.log("");

  const output: Record<string, string> = {};
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < references.length; i++) {
    const reference = references[i];

    if (i > 0 && i % PROGRESS_INTERVAL === 0) {
      const pct = ((i / references.length) * 100).toFixed(1);
      console.log(
        `Progress: ${i}/${references.length} (${pct}%) — ${succeeded} ok, ${failed} failed`,
      );
    }

    try {
      const text = await fetchReading(reference);
      output[reference] = text;
      succeeded++;
    } catch (err) {
      console.error(`  FAILED [${i + 1}/${references.length}]: "${reference}" — ${err}`);
      output[reference] = "";
      failed++;
    }

    // Rate limit between requests (skip delay after the last one)
    if (i < references.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  console.log("");
  console.log(`Completed: ${succeeded} succeeded, ${failed} failed`);

  const outPath = resolve(__dirname, "../src/data/lectionary-readings-text.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${Object.keys(output).length} entries to ${outPath}`);

  if (failed > 0) {
    console.warn(`WARNING: ${failed} references failed to fetch. Re-run the script to retry.`);
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
