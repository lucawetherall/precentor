#!/usr/bin/env tsx
/**
 * Scrapes the Church of England lectionary page and outputs
 * a structured JSON file at src/data/lectionary-coe.json.
 *
 * The C of E page contains all reading references for every Sunday
 * in the 3-year lectionary cycle (Years A, B, C), organized by
 * liturgical season.
 *
 * Usage: npx tsx scripts/scrape-lectionary.ts
 */

import * as cheerio from "cheerio";
import { writeFileSync, renameSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { classifyReading } from "../src/lib/lectionary/bible-books";
import type {
  LectionaryData,
  LectionaryReading,
  LectionarySunday,
  ServiceReadings,
} from "../src/lib/lectionary/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LECTIONARY_URL =
  "https://www.churchofengland.org/prayer-and-worship/worship-texts-and-resources/common-worship/churchs-year/lectionary";

// Map sections to liturgical seasons and colours
const SECTION_SEASON_MAP: Record<string, { season: string; colour: string }> = {
  Advent: { season: "ADVENT", colour: "PURPLE" },
  Christmas: { season: "CHRISTMAS", colour: "WHITE" },
  Epiphany: { season: "EPIPHANY", colour: "WHITE" },
  "Ordinary Time": { season: "ORDINARY", colour: "GREEN" },
  Lent: { season: "LENT", colour: "PURPLE" },
  Easter: { season: "EASTER", colour: "WHITE" },
  Festivals: { season: "ORDINARY", colour: "WHITE" },
  "Special Occasion": { season: "ORDINARY", colour: "GREEN" },
};

/** Normalise a Sunday name into a stable key */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Split a string containing concatenated scripture references */
function splitByBookNames(text: string): string[] {
  const bookPattern =
    /(?:(?:[123]\s+)?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Ecclesiasticus|Song of (?:Solomon|Songs)|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Baruch|Tobit|Judith|Wisdom(?: of Solomon)?|Sirach|Maccabees|Esdras|Susanna|Bel and the Dragon|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)|Canticle:?\s)/gi;

  const matches: { index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = bookPattern.exec(text)) !== null) {
    matches.push({ index: m.index });
  }

  if (matches.length <= 1) return [text.trim()];

  const refs: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const ref = text.slice(start, end).trim();
    if (ref) refs.push(ref);
  }
  return refs;
}

/** Clean a reading reference string */
function cleanRef(ref: string): string {
  return ref
    .replace(/\s+/g, " ")
    .replace(/\s*\*\s*$/, "") // trailing asterisks
    .replace(/^\(or\)\s*/i, "")
    .replace(/^or\s+/i, "")
    .trim();
}

/**
 * Parse readings from an HTML cell.
 * The C of E page separates readings with <br> tags.
 */
function parseReadingsFromCell(
  cellHtml: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _$: cheerio.CheerioAPI,
): LectionaryReading[] {
  if (!cellHtml) return [];

  // Replace <br> with newlines for splitting
  const html = cellHtml.replace(/<br\s*\/?>/gi, "\n");
  const temp = cheerio.load(`<div>${html}</div>`);
  const text = temp("div")
    .text()
    .replace(/\u00a0/g, " ")
    .trim();

  if (!text) return [];

  // Split on newlines
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const allRefs: string[] = [];
  for (const line of lines) {
    // Skip instructional/label text
    if (/^(?:Any of the following|A minimum of|The reading from|Readings\s+for|if it has not)/i.test(line)) continue;

    // Handle "Gospel at Holy Communion:" prefix
    if (/^Gospel at Holy Communion\s*:/i.test(line)) {
      const afterColon = line.replace(/^Gospel at Holy Communion\s*:\s*/i, "");
      if (afterColon) allRefs.push(afterColon);
      continue;
    }

    // Handle "Evening Psalm(s)" / "Morning Psalm(s)" labels
    if (/^(?:Evening|Morning)\s+Psalms?\s*$/i.test(line)) continue;

    // Split concatenated references within a line
    const parts = splitByBookNames(line);
    allRefs.push(...parts);
  }

  return allRefs
    .map((ref) => cleanRef(ref))
    .filter((ref) => ref.length > 2)
    .filter((ref) => !/^(?:Evening|Morning)\s+Psalms?\s*$/i.test(ref))
    .map((ref) => ({
      reference: ref,
      position: classifyReading(ref),
    }));
}

/**
 * Map a section + Sunday name to season and colour.
 */
function mapSectionToSeasonColour(
  section: string,
  sundayName: string,
): { season: string; colour: string } {
  const n = sundayName.toLowerCase();

  if (n.includes("ash wednesday")) return { season: "LENT", colour: "PURPLE" };
  if (n.includes("palm sunday")) return { season: "HOLY_WEEK", colour: "RED" };
  if (n.includes("good friday")) return { season: "HOLY_WEEK", colour: "RED" };
  if (n.includes("maundy")) return { season: "HOLY_WEEK", colour: "WHITE" };
  if (n.includes("holy week") || n.includes("monday of holy week"))
    return { season: "HOLY_WEEK", colour: "RED" };
  if (n.includes("easter vigil")) return { season: "EASTER", colour: "WHITE" };
  if (n.includes("easter day")) return { season: "EASTER", colour: "WHITE" };
  if (n.includes("ascension")) return { season: "ASCENSION", colour: "WHITE" };
  if (n.includes("pentecost") && !n.includes("after"))
    return { season: "PENTECOST", colour: "RED" };
  if (n.includes("trinity sunday")) return { season: "TRINITY", colour: "WHITE" };
  if (n.includes("christ the king")) return { season: "KINGDOM", colour: "WHITE" };
  if (n.includes("all saints")) return { season: "ORDINARY", colour: "WHITE" };

  return SECTION_SEASON_MAP[section] ?? { season: "ORDINARY", colour: "GREEN" };
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching C of E lectionary page...");
  const res = await fetch(LECTIONARY_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const html = await res.text();
  console.log(`Fetched ${(html.length / 1024).toFixed(0)} KB`);

  const $ = cheerio.load(html);

  // ─── 1. Extract year mapping table ───
  const yearMap: Record<string, "A" | "B" | "C"> = {};
  const cwBlocks = $("div.cw");
  const firstBlock = cwBlocks.first();
  firstBlock.find("table").first().find("tr").each((_i, tr) => {
    const cells = $(tr).find("td");
    if (cells.length >= 2) {
      const yearText = $(cells[0]).text().replace(/\u00a0/g, " ").replace(/\s/g, "").trim();
      const yearLetter = $(cells[1]).text().replace(/\u00a0/g, " ").trim();
      if (/^\d{4}\/\d{4}$/.test(yearText) && /^[ABC]$/i.test(yearLetter)) {
        yearMap[yearText] = yearLetter.toUpperCase() as "A" | "B" | "C";
      }
    }
  });
  console.log(`Extracted ${Object.keys(yearMap).length} year mappings`);

  // ─── 2. Parse each section's reading tables ───
  const sundays: Record<string, LectionarySunday> = {};

  // Walk each CW block (skip first 2: year table and rules)
  cwBlocks.each((blockIdx, block) => {
    if (blockIdx < 2) return;

    const blockEl = $(block);
    const blockText = blockEl.text().replace(/\u00a0/g, " ");

    // Section name from the h2 heading
    const headingMatch = blockText.match(
      /¶\s*(Advent|Christmas|Epiphany|Ordinary Time|Lent|Easter|Festivals|Special Occasion)/i,
    );
    const section = headingMatch ? headingMatch[1].trim() : `Section ${blockIdx}`;
    console.log(`\nProcessing section: ${section}`);

    // Sequential walk: iterate through ALL child elements of the CW block
    // collecting the current Sunday name and parsing tables when we find them
    let currentName = "";
    let currentProper = "";
    let pYear: "A" | "B" | "C" | null = null;
    const pReadings = { A: [] as LectionaryReading[], B: [] as LectionaryReading[], C: [] as LectionaryReading[] };

    const state: WalkState = {
      get name() { return currentName; },
      set name(v) { currentName = v; },
      get proper() { return currentProper; },
      set proper(v) { currentProper = v; },
      get pYear() { return pYear; },
      set pYear(v) { pYear = v; },
      pReadings,
    };

    blockEl.children().each((_i, child) => {
      walkNode($, child, section, sundays, state);
    });

    // Flush any remaining paragraph-based readings
    flushParagraphReadings(state, section, sundays);
  });

  // ─── 3. Validate and write output ───
  const data: LectionaryData = { yearMap, sundays };

  const sundayCount = Object.keys(sundays).length;
  if (sundayCount < 50) {
    throw new Error(`Validation failed: only ${sundayCount} entries scraped (expected 50+). Aborting to preserve existing data.`);
  }
  if (Object.keys(yearMap).length < 10) {
    throw new Error(`Validation failed: only ${Object.keys(yearMap).length} year mappings (expected 10+). Aborting.`);
  }

  const outPath = resolve(__dirname, "../src/data/lectionary-coe.json");
  const tmpPath = `${outPath}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  renameSync(tmpPath, outPath);

  console.log(`\nWrote ${sundayCount} entries to ${outPath}`);
  let totalReadings = 0;
  for (const s of Object.values(sundays)) {
    for (const y of Object.values(s.years)) {
      if (y) totalReadings += y.principal.length + y.second.length + y.third.length;
    }
  }
  console.log(`Total readings: ${totalReadings}`);
}

interface WalkState {
  name: string;
  proper: string;
  /** Current year being parsed from paragraph-based readings (A/B/C or null) */
  pYear: "A" | "B" | "C" | null;
  /** Accumulated paragraph-based readings per year */
  pReadings: {
    A: LectionaryReading[];
    B: LectionaryReading[];
    C: LectionaryReading[];
  };
}

/**
 * Recursively walk DOM nodes to extract Sunday names and tables.
 * The C of E page uses:
 *   <h5 class="B2"><strong>Sunday Name</strong></h5>  — Sunday name
 *   <p class="attrib">Proper N</p>                    — Proper number
 *   <table>...</table>                                 — Reading table
 *   <i>rubric text</i>                                 — Notes (skip)
 */
function walkNode(
  $: cheerio.CheerioAPI,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any,
  section: string,
  sundays: Record<string, LectionarySunday>,
  state: WalkState,
) {
  const el = $(node);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tagName = (node as any).tagName?.toLowerCase();

  // h5 tags contain Sunday/feast names (class B2, C1, or no class)
  // h3/h4 can also contain names in some sections
  if (
    tagName === "h5" ||
    ((tagName === "h4" || tagName === "h3") && !el.hasClass("A2"))
  ) {
    const strong = el.find("strong").first();
    let name = (strong.length ? strong.text() : el.text())
      .replace(/\u00a0/g, " ")
      .trim();

    // Filter out liturgical rank labels — these are NOT names
    const RANK_LABELS = [
      "principal feast",
      "principal holy day",
      "festival",
      "lesser festival",
      "commemoration",
    ];
    if (RANK_LABELS.some((r) => name.toLowerCase() === r)) return;

    // Skip short date-only entries (e.g., "1 January", "25 March")
    if (/^\d{1,2}\s+\w+$/.test(name)) return;

    // Skip rubric/note entries (e.g., "or,Peter,where celebrated alone")
    if (/^or\s*,/i.test(name)) return;
    if (/^where\s+/i.test(name)) return;

    // Skip service labels and non-Sunday headings
    const SKIP_LABELS = [
      "evening prayer on the eve",
      "evening prayer",
      "morning prayer",
      "principal service",
      "second service",
      "third service",
      "alternative psalmody",
      "for the principal",
      "for the second",
    ];
    if (SKIP_LABELS.some((l) => name.toLowerCase().startsWith(l))) return;

    // Skip section headings prefixed with ¶
    if (name.startsWith("¶")) return;

    // Strip trailing rank labels
    name = name
      .replace(/\s*(?:Principal Feast|Principal Holy Day|Festival|Lesser Festival)\s*$/i, "")
      .trim();

    // Strip trailing dates from festival names (e.g., "George23 April" → "George")
    // Pattern: name followed by a date like "25 January" or "6 August"
    name = name
      .replace(/(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December))\s*$/i, "")
      .trim();

    // Also handle dates concatenated without space: "George23 April"
    name = name
      .replace(/\d{1,2}\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s*$/i, "")
      .trim();

    // Clean up trailing punctuation
    name = name.replace(/[,;:]+$/, "").trim();

    // Strip "If date not known..." rubric from Dedication Festival
    name = name.replace(/If date not known.*$/i, "").trim();

    if (name && name.length > 2) {
      // Flush any accumulated paragraph readings before changing name
      flushParagraphReadings(state, section, sundays);
      state.name = name;
      state.proper = ""; // Reset proper for new Sunday
    }
    return;
  }

  // p.attrib contains the Proper number
  if (tagName === "p" && el.hasClass("attrib")) {
    const text = el.text().replace(/\u00a0/g, " ").trim();
    if (/^Proper\s+\d+/i.test(text)) {
      state.proper = text;
    }
    return;
  }

  // p.txt paragraphs can contain "Year A/B/C" headers or reading references
  // (used in Special Occasions like Harvest Thanksgiving)
  if (tagName === "p") {
    const text = el.text().replace(/\u00a0/g, " ").trim();

    // Check for "Year A/B/C" header
    const yearMatch = text.match(/^Year\s+([ABC])$/i);
    if (yearMatch) {
      state.pYear = yearMatch[1].toUpperCase() as "A" | "B" | "C";
      return;
    }

    // If we're inside a year section, treat non-empty text as a reading
    if (state.pYear && text && !/^Alternative\s/i.test(text) && !/^for\s+the/i.test(text)) {
      // Split "or" alternatives into separate refs
      const parts = text.split(/\s+or\s+/i);
      for (const part of parts) {
        const cleaned = cleanRef(part);
        if (cleaned.length > 2) {
          state.pReadings[state.pYear].push({
            reference: cleaned,
            position: classifyReading(cleaned),
          });
        }
      }
    }
    return;
  }

  // Table: flush any paragraph readings, then parse the table
  if (tagName === "table") {
    flushParagraphReadings(state, section, sundays);

    if (!state.name) return;

    const fullName = state.proper
      ? `${state.name} (${state.proper})`
      : state.name;

    parseTable($, el, fullName, section, sundays);
    return;
  }

  // For other nodes, recurse into children
  // (but skip <i> italic nodes which are rubric/notes)
  if (tagName === "i" || tagName === "em") return;

  el.children().each((_i, child) => {
    walkNode($, child, section, sundays, state);
  });
}

/**
 * Flush accumulated paragraph-based readings into the sundays map.
 * Used for entries like Harvest Thanksgiving that use <p> tags instead of tables.
 */
function flushParagraphReadings(
  state: WalkState,
  section: string,
  sundays: Record<string, LectionarySunday>,
) {
  const { pReadings } = state;
  const hasAny = pReadings.A.length > 0 || pReadings.B.length > 0 || pReadings.C.length > 0;
  if (!hasAny || !state.name) return;

  const fullName = state.proper ? `${state.name} (${state.proper})` : state.name;
  const key = slugify(fullName);
  const { season, colour } = mapSectionToSeasonColour(section, fullName);

  sundays[key] = {
    section,
    name: fullName,
    colour,
    season,
    years: {
      A: { principal: [...pReadings.A], second: [], third: [] },
      B: { principal: [...pReadings.B], second: [], third: [] },
      C: { principal: [...pReadings.C], second: [], third: [] },
    },
  };

  console.log(
    `  [PAR] ${fullName}: A=${pReadings.A.length} B=${pReadings.B.length} C=${pReadings.C.length}`,
  );

  // Reset
  pReadings.A = [];
  pReadings.B = [];
  pReadings.C = [];
  state.pYear = null;
}

/**
 * Parse a single reading table and add to the sundays map.
 * Detects the table format automatically.
 */
function parseTable(
  $: cheerio.CheerioAPI,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tableEl: cheerio.Cheerio<any>,
  sundayName: string,
  section: string,
  sundays: Record<string, LectionarySunday>,
) {
  const rows = tableEl.find("tr");
  if (rows.length === 0) return;

  // Detect format from header row
  const allCellTexts: string[] = [];
  rows.each((_i, tr) => {
    $(tr).find("td").each((_j, td) => {
      allCellTexts.push($(td).text().replace(/\u00a0/g, " ").trim());
    });
  });
  const tableText = allCellTexts.join(" ");

  const hasYearABC =
    tableText.includes("Year A") && tableText.includes("Year B") && tableText.includes("Year C");
  const hasServiceCols =
    allCellTexts.some((t) => t === "Principal Service") &&
    allCellTexts.some((t) => t === "Second Service");
  const hasSets =
    allCellTexts.some((t) => /^\s*I\s*$/.test(t)) &&
    allCellTexts.some((t) => /^\s*II\s*$/.test(t));
  const hasAllYears = /Years?\s*A\s*,?\s*B\s*,?\s*C/i.test(tableText);

  const emptyService = (): ServiceReadings => ({
    principal: [],
    second: [],
    third: [],
  });

  if (hasYearABC) {
    const yearA = emptyService();
    const yearB = emptyService();
    const yearC = emptyService();

    rows.each((_i, tr) => {
      const cells = $(tr).find("td");
      if (cells.length < 2) return;

      const label = $(cells[0]).text().replace(/\u00a0/g, " ").trim().toLowerCase();
      if (!label || /year [abc]/i.test(label)) return; // header

      const getHtml = (idx: number) => cells.length > idx ? ($(cells[idx]).html() || "") : "";

      if (/principal\s*service/i.test(label)) {
        yearA.principal = parseReadingsFromCell(getHtml(1), $);
        yearB.principal = parseReadingsFromCell(getHtml(2), $);
        yearC.principal = parseReadingsFromCell(getHtml(3), $);
      } else if (/second\s*service/i.test(label)) {
        yearA.second = parseReadingsFromCell(getHtml(1), $);
        yearB.second = parseReadingsFromCell(getHtml(2), $);
        yearC.second = parseReadingsFromCell(getHtml(3), $);
      } else if (/third\s*service/i.test(label)) {
        yearA.third = parseReadingsFromCell(getHtml(1), $);
        yearB.third = parseReadingsFromCell(getHtml(2), $);
        yearC.third = parseReadingsFromCell(getHtml(3), $);
      } else if (/evening\s*prayer/i.test(label)) {
        // Evening Prayer on the Eve -> add to second service
        yearA.second.push(...parseReadingsFromCell(getHtml(1), $));
        yearB.second.push(...parseReadingsFromCell(getHtml(2), $));
        yearC.second.push(...parseReadingsFromCell(getHtml(3), $));
      }
    });

    const hasAny = yearA.principal.length > 0 || yearB.principal.length > 0 || yearC.principal.length > 0;
    if (!hasAny) return;

    const key = slugify(sundayName);
    const { season, colour } = mapSectionToSeasonColour(section, sundayName);

    sundays[key] = {
      section,
      name: sundayName,
      colour,
      season,
      years: { A: yearA, B: yearB, C: yearC },
    };

    console.log(
      `  [ABC] ${sundayName}: A=${yearA.principal.length} B=${yearB.principal.length} C=${yearC.principal.length}`,
    );
  } else if (hasServiceCols) {
    // Festival format: columns are services, not years
    const service = emptyService();

    rows.each((_i, tr) => {
      const cells = $(tr).find("td");
      if (cells.length < 2) return;

      const label = $(cells[0]).text().replace(/\u00a0/g, " ").trim();
      if (/Principal Service/i.test(label)) return; // header
      if (!label || /^\s*$/.test(label)) {
        if ($(cells[1]).text().trim() === "Principal Service") return; // header row
      }

      const getHtml = (idx: number) => cells.length > idx ? ($(cells[idx]).html() || "") : "";

      if (/evening\s*prayer/i.test(label)) {
        service.second.push(...parseReadingsFromCell(getHtml(1), $));
      } else {
        // Data row
        service.principal.push(...parseReadingsFromCell(getHtml(1), $));
        service.second.push(...parseReadingsFromCell(getHtml(2), $));
        service.third.push(...parseReadingsFromCell(getHtml(3), $));
      }
    });

    if (service.principal.length === 0) return;

    const key = slugify(sundayName);
    const { season, colour } = mapSectionToSeasonColour(section, sundayName);

    sundays[key] = {
      section,
      name: sundayName,
      colour,
      season,
      years: {
        A: { ...service },
        B: { ...service },
        C: { ...service },
      },
    };

    console.log(`  [FES] ${sundayName}: ${service.principal.length} readings`);
  } else if (hasSets) {
    // Sets I/II/III format (Christmas Day)
    const service = emptyService();

    rows.each((_i, tr) => {
      const cells = $(tr).find("td");
      if (cells.length < 4) return;

      const label = $(cells[0]).text().replace(/\u00a0/g, " ").trim().toLowerCase();
      if (/^\s*$/.test(label) || /^i+$/.test(label.trim())) return;

      const getHtml = (idx: number) => cells.length > idx ? ($(cells[idx]).html() || "") : "";

      if (/principal\s*service/i.test(label)) {
        // Set III -> principal (recommended by rubric)
        service.principal = parseReadingsFromCell(getHtml(3), $);
        service.second = parseReadingsFromCell(getHtml(1), $); // Set I
        service.third = parseReadingsFromCell(getHtml(2), $); // Set II
      } else if (/second\s*service/i.test(label)) {
        service.second.push(...parseReadingsFromCell(getHtml(1), $));
      } else if (/third\s*service/i.test(label)) {
        service.third.push(...parseReadingsFromCell(getHtml(1), $));
      }
    });

    if (service.principal.length === 0) return;

    const key = slugify(sundayName);
    const { season, colour } = mapSectionToSeasonColour(section, sundayName);

    sundays[key] = {
      section,
      name: sundayName,
      colour,
      season,
      years: {
        A: { ...service },
        B: { ...service },
        C: { ...service },
      },
    };

    console.log(`  [SET] ${sundayName}: ${service.principal.length} readings`);
  } else if (hasAllYears) {
    // "Years A,B,C" combined format
    const service = emptyService();

    rows.each((_i, tr) => {
      const cells = $(tr).find("td");
      if (cells.length < 1) return;

      const label = $(cells[0]).text().replace(/\u00a0/g, " ").trim().toLowerCase();
      const getHtml = (idx: number) => cells.length > idx ? ($(cells[idx]).html() || "") : "";

      // For all-years, readings are in the first data cell (index 1, or 0 if single column)
      const readingIdx = cells.length > 1 ? 1 : 0;

      if (/principal\s*service/i.test(label)) {
        service.principal = parseReadingsFromCell(getHtml(readingIdx), $);
      } else if (/second\s*service/i.test(label)) {
        service.second = parseReadingsFromCell(getHtml(readingIdx), $);
      } else if (/third\s*service/i.test(label)) {
        service.third = parseReadingsFromCell(getHtml(readingIdx), $);
      } else if (/evening\s*prayer/i.test(label)) {
        service.second.push(...parseReadingsFromCell(getHtml(readingIdx), $));
      }
    });

    if (service.principal.length === 0) return;

    const key = slugify(sundayName);
    const { season, colour } = mapSectionToSeasonColour(section, sundayName);

    sundays[key] = {
      section,
      name: sundayName,
      colour,
      season,
      years: {
        A: { ...service },
        B: { ...service },
        C: { ...service },
      },
    };

    console.log(`  [ALL] ${sundayName}: ${service.principal.length} readings`);
  }
}

main().catch((err) => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
