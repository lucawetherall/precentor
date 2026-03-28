#!/usr/bin/env tsx
/**
 * Scrapes Common Worship collects from the Church of England website using
 * Playwright (the site is JS-rendered so plain fetch does not work).
 *
 * Each seasonal page on the CofE site lists Sundays as <h5 class="B2">
 * headings, followed by paragraph blocks for the Collect and Post Communion.
 * This script:
 *   1. Loads each seasonal page with Playwright/Chromium.
 *   2. Extracts the first Collect paragraph block for each Sunday heading.
 *   3. Matches the Sunday name to the CW name used in liturgical_days.cw_name.
 *   4. Writes the results to src/data/collects-cw.json.
 *
 * Usage: npm run db:scrape-collects
 *
 * Requires Playwright chromium:
 *   npx playwright install chromium
 */

import "dotenv/config";
import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

// ─── Output path ───────────────────────────────────────────────────

const OUTPUT_PATH = path.join(process.cwd(), "src/data/collects-cw.json");

// ─── CofE collect pages ────────────────────────────────────────────
// The actual collect texts live on per-season pages under /common-material/.
// The numeric suffix after "collects-and-post-" is the node ID on the CofE
// Drupal site.

const SEASON_PAGES: Array<{ url: string; season: string }> = [
  {
    url: "https://www.churchofengland.org/prayer-and-worship/worship-texts-and-resources/common-worship/common-material/collects-and-post-19",
    season: "Advent",
  },
  {
    url: "https://www.churchofengland.org/prayer-and-worship/worship-texts-and-resources/common-worship/common-material/collects-and-post-20",
    season: "Christmas",
  },
  {
    url: "https://www.churchofengland.org/prayer-and-worship/worship-texts-and-resources/common-worship/common-material/collects-and-post-21",
    season: "Epiphany",
  },
  {
    url: "https://www.churchofengland.org/prayer-and-worship/worship-texts-and-resources/common-worship/common-material/collects-and-post-22",
    season: "Ordinary Time (Before Lent)",
  },
  {
    url: "https://www.churchofengland.org/prayer-and-worship/worship-texts-and-resources/common-worship/common-material/collects-and-post-25",
    season: "Lent",
  },
  {
    url: "https://www.churchofengland.org/prayer-and-worship/worship-texts-and-resources/common-worship/common-material/collects-and-post-23",
    season: "Easter",
  },
  {
    url: "https://www.churchofengland.org/prayer-and-worship/worship-texts-and-resources/common-worship/common-material/collects-and-post-24",
    season: "Ordinary Time (After Pentecost)",
  },
  {
    // Festivals (Main Volume) — contains The Naming and Circumcision of Jesus
    url: "https://www.churchofengland.org/prayer-and-worship/worship-texts-and-resources/common-worship/common-material/collects-and-post-12",
    season: "Festivals",
  },
];

// ─── The canonical CW names we need collects for ───────────────────
// These match liturgical_days.cw_name exactly.
const CW_NAMES = [
  "The First Sunday of Advent",
  "The Second Sunday of Advent",
  "The Third Sunday of Advent",
  "The Fourth Sunday of Advent",
  "Christmas Day",
  "The First Sunday of Christmas",
  "The Naming and Circumcision of Jesus",
  "The Second Sunday of Christmas",
  "The Epiphany",
  "The Baptism of Christ",
  "The Second Sunday of Epiphany",
  "The Third Sunday of Epiphany",
  "The Fourth Sunday of Epiphany",
  "The Second Sunday before Lent",
  "The Sunday next before Lent",
  "Ash Wednesday",
  "The First Sunday of Lent",
  "The Second Sunday of Lent",
  "The Third Sunday of Lent",
  "The Fourth Sunday of Lent",
  "The Fifth Sunday of Lent",
  "Palm Sunday",
  "Maundy Thursday",
  "Good Friday",
  "Easter Eve",
  "Easter Day",
  "The Second Sunday of Easter",
  "The Third Sunday of Easter",
  "The Fourth Sunday of Easter",
  "The Fifth Sunday of Easter",
  "The Sixth Sunday of Easter",
  "Ascension Day",
  "Sunday after Ascension Day",
  "Day of Pentecost (Whit Sunday)",
  "Trinity Sunday",
  "Sunday between 5 and 11 June inclusive",
  "Sunday between 12 and 18 June inclusive",
  "Sunday between 19 and 25 June inclusive",
  "Sunday between 26 June and 2 July inclusive",
  "Sunday between 3 and 9 July inclusive",
  "Sunday between 10 and 16 July inclusive",
  "Sunday between 17 and 23 July inclusive",
  "Sunday between 24 and 30 July inclusive",
  "Sunday between 31 July and 6 August inclusive",
  "Sunday between 7 and 13 August inclusive",
  "Sunday between 14 and 20 August inclusive",
  "Sunday between 21 and 27 August inclusive",
  "Sunday between 28 August and 3 September inclusive",
  "Sunday between 4 and 10 September inclusive",
  "Sunday between 11 and 17 September inclusive",
  "Sunday between 18 and 24 September inclusive",
  "Sunday between 25 September and 1 October inclusive",
  "Sunday between 2 and 8 October inclusive",
  "Sunday between 9 and 15 October inclusive",
  "Sunday between 16 and 22 October inclusive",
  "Sunday between 23 and 29 October inclusive",
  "The Fourth Sunday before Advent",
  "The Third Sunday before Advent",
  "The Second Sunday before Advent",
  "Christ the King",
];

// ─── Name normalisation ─────────────────────────────────────────────

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Attempt to match a page heading to a canonical CW name.
 * First tries exact (case-insensitive) match, then a set of aliases for
 * known differences between the CofE page text and the DB cw_name values.
 */
function matchCwName(heading: string): string | null {
  const h = normalise(heading).toLowerCase();

  // Exact match (case-insensitive)
  for (const name of CW_NAMES) {
    if (h === name.toLowerCase()) return name;
  }

  // Alias / partial match table
  // Entries that should NOT match (headings to explicitly skip)
  const SKIP_PATTERNS = [
    "weekdays after",
  ];
  for (const skip of SKIP_PATTERNS) {
    if (h.includes(skip)) return null;
  }

  const ALIASES: Array<[string, string]> = [
    ["first sunday of advent", "The First Sunday of Advent"],
    ["second sunday of advent", "The Second Sunday of Advent"],
    ["third sunday of advent", "The Third Sunday of Advent"],
    ["fourth sunday of advent", "The Fourth Sunday of Advent"],
    ["christmas day", "Christmas Day"],
    ["first sunday of christmas", "The First Sunday of Christmas"],
    ["naming and circumcision of jesus", "The Naming and Circumcision of Jesus"],
    ["naming and circumcision", "The Naming and Circumcision of Jesus"],
    ["second sunday of christmas", "The Second Sunday of Christmas"],
    ["the epiphany", "The Epiphany"],
    // "The Epiphany" should take precedence over any partial match below,
    // so keep the "Baptism" entry after
    ["baptism of christ", "The Baptism of Christ"],
    ["second sunday of epiphany", "The Second Sunday of Epiphany"],
    ["third sunday of epiphany", "The Third Sunday of Epiphany"],
    ["fourth sunday of epiphany", "The Fourth Sunday of Epiphany"],
    ["second sunday before lent", "The Second Sunday before Lent"],
    ["sunday next before lent", "The Sunday next before Lent"],
    ["ash wednesday", "Ash Wednesday"],
    ["first sunday of lent", "The First Sunday of Lent"],
    ["second sunday of lent", "The Second Sunday of Lent"],
    ["third sunday of lent", "The Third Sunday of Lent"],
    ["fourth sunday of lent", "The Fourth Sunday of Lent"],
    ["fifth sunday of lent", "The Fifth Sunday of Lent"],
    ["palm sunday", "Palm Sunday"],
    ["maundy thursday", "Maundy Thursday"],
    ["good friday", "Good Friday"],
    ["easter eve", "Easter Eve"],
    ["easter day", "Easter Day"],
    ["second sunday of easter", "The Second Sunday of Easter"],
    ["third sunday of easter", "The Third Sunday of Easter"],
    ["fourth sunday of easter", "The Fourth Sunday of Easter"],
    ["fifth sunday of easter", "The Fifth Sunday of Easter"],
    ["sixth sunday of easter", "The Sixth Sunday of Easter"],
    ["ascension day", "Ascension Day"],
    ["sunday after ascension day", "Sunday after Ascension Day"],
    ["sunday after ascension", "Sunday after Ascension Day"],
    ["day of pentecost", "Day of Pentecost (Whit Sunday)"],
    ["whit sunday", "Day of Pentecost (Whit Sunday)"],
    ["trinity sunday", "Trinity Sunday"],
    // Proper 4 … 24 → "Sunday between X and Y inclusive" mapping
    ["proper 4", "Sunday between 5 and 11 June inclusive"],
    ["proper 5", "Sunday between 12 and 18 June inclusive"],
    ["proper 6", "Sunday between 19 and 25 June inclusive"],
    ["proper 7", "Sunday between 26 June and 2 July inclusive"],
    ["proper 8", "Sunday between 3 and 9 July inclusive"],
    ["proper 9", "Sunday between 10 and 16 July inclusive"],
    ["proper 10", "Sunday between 17 and 23 July inclusive"],
    ["proper 11", "Sunday between 24 and 30 July inclusive"],
    ["proper 12", "Sunday between 31 July and 6 August inclusive"],
    ["proper 13", "Sunday between 7 and 13 August inclusive"],
    ["proper 14", "Sunday between 14 and 20 August inclusive"],
    ["proper 15", "Sunday between 21 and 27 August inclusive"],
    ["proper 16", "Sunday between 28 August and 3 September inclusive"],
    ["proper 17", "Sunday between 4 and 10 September inclusive"],
    ["proper 18", "Sunday between 11 and 17 September inclusive"],
    ["proper 19", "Sunday between 18 and 24 September inclusive"],
    ["proper 20", "Sunday between 25 September and 1 October inclusive"],
    ["proper 21", "Sunday between 2 and 8 October inclusive"],
    ["proper 22", "Sunday between 9 and 15 October inclusive"],
    ["proper 23", "Sunday between 16 and 22 October inclusive"],
    ["proper 24", "Sunday between 23 and 29 October inclusive"],
    // "Nth Sunday after Trinity" → Ordinary Time "Sunday between X and Y inclusive"
    // The CofE site labels Ordinary Time Sundays as "1st–21st Sunday after Trinity"
    // which map 1:1 to Proper 4–24 in CW.
    ["the first sunday after trinity", "Sunday between 5 and 11 June inclusive"],
    ["the second sunday after trinity", "Sunday between 12 and 18 June inclusive"],
    ["the third sunday after trinity", "Sunday between 19 and 25 June inclusive"],
    ["the fourth sunday after trinity", "Sunday between 26 June and 2 July inclusive"],
    ["the fifth sunday after trinity", "Sunday between 3 and 9 July inclusive"],
    ["the sixth sunday after trinity", "Sunday between 10 and 16 July inclusive"],
    ["the seventh sunday after trinity", "Sunday between 17 and 23 July inclusive"],
    ["the eighth sunday after trinity", "Sunday between 24 and 30 July inclusive"],
    ["the ninth sunday after trinity", "Sunday between 31 July and 6 August inclusive"],
    ["the tenth sunday after trinity", "Sunday between 7 and 13 August inclusive"],
    ["the eleventh sunday after trinity", "Sunday between 14 and 20 August inclusive"],
    ["the twelfth sunday after trinity", "Sunday between 21 and 27 August inclusive"],
    ["the thirteenth sunday after trinity", "Sunday between 28 August and 3 September inclusive"],
    ["the fourteenth sunday after trinity", "Sunday between 4 and 10 September inclusive"],
    ["the fifteenth sunday after trinity", "Sunday between 11 and 17 September inclusive"],
    ["the sixteenth sunday after trinity", "Sunday between 18 and 24 September inclusive"],
    ["the seventeenth sunday after trinity", "Sunday between 25 September and 1 October inclusive"],
    ["the eighteenth sunday after trinity", "Sunday between 2 and 8 October inclusive"],
    ["the nineteenth sunday after trinity", "Sunday between 9 and 15 October inclusive"],
    ["the twentieth sunday after trinity", "Sunday between 16 and 22 October inclusive"],
    ["the twenty-first sunday after trinity", "Sunday between 23 and 29 October inclusive"],
    // "The Seventh Sunday of Easter" = "Sunday after Ascension Day" in CW naming
    ["the seventh sunday of easter", "Sunday after Ascension Day"],
    ["fourth sunday before advent", "The Fourth Sunday before Advent"],
    ["third sunday before advent", "The Third Sunday before Advent"],
    ["second sunday before advent", "The Second Sunday before Advent"],
    ["christ the king", "Christ the King"],
    ["sunday between 5 and 11 june", "Sunday between 5 and 11 June inclusive"],
    ["sunday between 12 and 18 june", "Sunday between 12 and 18 June inclusive"],
    ["sunday between 19 and 25 june", "Sunday between 19 and 25 June inclusive"],
    ["sunday between 26 june", "Sunday between 26 June and 2 July inclusive"],
    ["sunday between 3 and 9 july", "Sunday between 3 and 9 July inclusive"],
    ["sunday between 10 and 16 july", "Sunday between 10 and 16 July inclusive"],
    ["sunday between 17 and 23 july", "Sunday between 17 and 23 July inclusive"],
    ["sunday between 24 and 30 july", "Sunday between 24 and 30 July inclusive"],
    ["sunday between 31 july", "Sunday between 31 July and 6 August inclusive"],
    ["sunday between 7 and 13 august", "Sunday between 7 and 13 August inclusive"],
    ["sunday between 14 and 20 august", "Sunday between 14 and 20 August inclusive"],
    ["sunday between 21 and 27 august", "Sunday between 21 and 27 August inclusive"],
    ["sunday between 28 august", "Sunday between 28 August and 3 September inclusive"],
    ["sunday between 4 and 10 september", "Sunday between 4 and 10 September inclusive"],
    ["sunday between 11 and 17 september", "Sunday between 11 and 17 September inclusive"],
    ["sunday between 18 and 24 september", "Sunday between 18 and 24 September inclusive"],
    ["sunday between 25 september", "Sunday between 25 September and 1 October inclusive"],
    ["sunday between 2 and 8 october", "Sunday between 2 and 8 October inclusive"],
    ["sunday between 9 and 15 october", "Sunday between 9 and 15 October inclusive"],
    ["sunday between 16 and 22 october", "Sunday between 16 and 22 October inclusive"],
    ["sunday between 23 and 29 october", "Sunday between 23 and 29 October inclusive"],
  ];

  for (const [alias, cwName] of ALIASES) {
    if (h.includes(alias)) return cwName;
  }

  return null;
}

// ─── Utilities ─────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Scrape a single season page ──────────────────────────────────

/**
 * Returns a map of { cwName → collectText } for all collects found on the
 * given CofE season page.
 *
 * Page structure (simplified):
 *   <div class="cw">
 *     <h5 class="B2"><strong>The First Sunday of Advent</strong></h5>
 *     <h5 class="B3"><em>Purple</em></h5>
 *     <h5 class="B3"><em>Collect</em></h5>
 *     <p class="ve1">Almighty God,</p>
 *     <p class="ve1">...</p>
 *     <p class="ve1 linespace2">one God, now and for ever.</p>
 *     ... (optional "or" alternative, then Post Communion)
 *     <h5 class="B2"><strong>The Second Sunday of Advent</strong></h5>
 *     ...
 *   </div>
 *
 * Strategy:
 *   Walk all elements in .cw, tracking the current Sunday (B2 heading).
 *   When we see a B3 "Collect" label, start accumulating ve1 paragraphs
 *   until we hit a Post Communion label, an "(or)" marker, or the next B2.
 *   The first such block is the primary collect.
 */
async function scrapeSeason(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
  url: string,
  season: string
): Promise<Record<string, string>> {
  console.log(`  Fetching ${season}...`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await sleep(2000);

  // We pass the extraction logic as a string to avoid tsx __name helpers.
  const JS_EXTRACT = `(function() {
    var results = {};
    var cwDiv = document.querySelector('.cw');
    if (!cwDiv) return results;

    var els = Array.from(cwDiv.querySelectorAll('h5, p'));
    var currentHeading = null;
    // inCollect: true once we've seen a "Collect" B3 label OR after a B2 heading
    // on pages that don't have the label (e.g. Festivals page).
    // collectDone: true once we stop collecting (or, post communion, next heading)
    var inCollect = false;
    var sawCollectLabel = false;  // page uses explicit "Collect" labels
    var collectLines = [];
    var collectDone = false;

    function isB2(el) {
      return el.tagName === 'H5' && el.classList.contains('B2');
    }
    function isB3(el) {
      return el.tagName === 'H5' && el.classList.contains('B3');
    }
    function isVe1(el) {
      return el.tagName === 'P' && el.classList.contains('ve1');
    }

    function flush() {
      if (currentHeading && collectLines.length > 0) {
        var text = collectLines.map(function(l) { return l.trim(); })
                               .filter(function(l) { return l.length > 0; })
                               .join('\\n');
        if (text.length > 10) results[currentHeading] = text;
      }
      collectLines = [];
      inCollect = false;
      collectDone = false;
    }

    for (var i = 0; i < els.length; i++) {
      var el = els[i];

      if (isB2(el)) {
        // New Sunday/Festival heading — flush any pending collect, start fresh
        flush();
        currentHeading = (el.textContent || '').trim();
        // On pages without explicit "Collect" labels, start collecting immediately
        if (!sawCollectLabel) {
          inCollect = true;
        }
        continue;
      }

      if (!currentHeading) continue;

      if (isB3(el)) {
        var label = (el.textContent || '').trim().toLowerCase();
        if (label === 'collect') {
          // Explicit collect label — start collecting
          sawCollectLabel = true;
          inCollect = true;
          collectDone = false;
        } else if (label === 'post communion' || label === 'post-communion') {
          // Stop — we only want the Collect, not Post Communion
          inCollect = false;
          collectDone = true;
        }
        continue;
      }

      if (isVe1(el)) {
        if (inCollect && !collectDone) {
          collectLines.push((el.textContent || '').trim());
        }
        continue;
      }

      // Any other paragraph type while collecting
      if (el.tagName === 'P' && inCollect && !collectDone) {
        var txt = (el.textContent || '').trim().toLowerCase();
        // "(or)" marks end of primary collect, alternative begins
        if (txt === '(or)' || txt === '** (or)' || txt === '(or) **') {
          inCollect = false;
          collectDone = true;
        }
      }
    }

    // Flush the last heading
    flush();

    return results;
  })()`;

  const raw: Record<string, string> = await page.evaluate(JS_EXTRACT);

  // Match each extracted heading to a canonical CW name
  const matched: Record<string, string> = {};
  for (const [heading, text] of Object.entries(raw)) {
    const cwName = matchCwName(heading);
    if (cwName && !matched[cwName]) {
      matched[cwName] = text;
      console.log(`    Matched: "${heading}" → "${cwName}"`);
    } else if (!cwName) {
      console.log(`    Unmatched heading: "${heading}"`);
    }
  }

  return matched;
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log("Launching Chromium...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const allCollects: Record<string, string> = {};

  try {
    for (const { url, season } of SEASON_PAGES) {
      const seasonCollects = await scrapeSeason(page, url, season);
      Object.assign(allCollects, seasonCollects);
      console.log(`  ${season}: found ${Object.keys(seasonCollects).length} collects\n`);
      await sleep(1500);
    }
  } finally {
    await browser.close();
  }

  // Coverage report
  const found = CW_NAMES.filter((n) => allCollects[n]);
  const missing = CW_NAMES.filter((n) => !allCollects[n]);

  console.log(`Total collects matched: ${found.length} / ${CW_NAMES.length}`);
  if (missing.length > 0) {
    console.warn("Missing collects for:");
    for (const name of missing) {
      console.warn(`  - ${name}`);
    }
  }

  // Write output
  const outDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allCollects, null, 2) + "\n", "utf-8");
  console.log(`\nWritten ${found.length} collects to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Scrape failed:", err);
  process.exit(1);
});
