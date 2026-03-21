/**
 * Oremus Bible API client.
 *
 * Fetches actual scripture text for reading references.
 * API: http://bible.oremus.org/?version=NRSVAE&passage=Isaiah+2.1-5
 *
 * Available versions:
 *   NRSVAE - New Revised Standard Version Anglicized Edition (default)
 *   NRSV   - New Revised Standard Version
 *   AV     - Authorized (King James) Version
 *   BCP    - Psalms from the Book of Common Prayer
 *   CW     - Psalms from Common Worship
 */

import * as cheerio from "cheerio";

const OREMUS_API = "https://bible.oremus.org/";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch the text of a scripture reading from the Oremus Bible Browser.
 *
 * @param reference - Scripture reference (e.g., "Isaiah 2.1-5")
 * @param version - Bible version (default: NRSVAE)
 * @returns The scripture text, or empty string on failure
 */
export async function fetchReadingText(
  reference: string,
  version?: string,
): Promise<string> {
  const ver = version ?? process.env.BIBLE_VERSION ?? "NRSVAE";

  try {
    const url = `${OREMUS_API}?version=${encodeURIComponent(ver)}&passage=${encodeURIComponent(reference)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!res.ok) {
      console.warn(`Oremus API error ${res.status} for "${reference}"`);
      return "";
    }

    const html = await res.text();
    return extractScriptureText(html);
  } catch (err) {
    console.warn(`Oremus API fetch failed for "${reference}":`, err);
    return "";
  }
}

/**
 * Fetch texts for multiple readings with rate limiting.
 *
 * @param references - Array of { reference, version? }
 * @param delayMs - Delay between requests (default: 200ms)
 * @returns Map of reference -> text
 */
export async function fetchMultipleReadings(
  references: Array<{ reference: string; version?: string }>,
  delayMs = 200,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (let i = 0; i < references.length; i++) {
    const { reference, version } = references[i];

    if (i > 0) await sleep(delayMs);

    const text = await fetchReadingText(reference, version);
    results.set(reference, text);

    if ((i + 1) % 10 === 0) {
      console.log(`  Fetched ${i + 1}/${references.length} readings...`);
    }
  }

  return results;
}

/**
 * Extract clean scripture text from the Oremus Bible Browser HTML response.
 */
function extractScriptureText(html: string): string {
  const $ = cheerio.load(html);

  // The scripture text is in <div class="bibletext">
  const bibleText = $("div.bibletext");
  if (!bibleText.length) return "";

  // Remove heading/section titles (they appear as bold text before verses)
  bibleText.find("h2, h3, h4, .wk").remove();

  // Replace <br> with newlines
  bibleText.find("br").replaceWith("\n");

  // Get text content
  let text = bibleText
    .text()
    .replace(/\u00a0/g, " ") // non-breaking spaces
    .replace(/[\u2018\u2019]/g, "'") // smart quotes
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2013/g, "-") // en dash
    .replace(/\u2014/g, " - ") // em dash
    .replace(/\u0091/g, "'") // windows smart quotes
    .replace(/\u0092/g, "'")
    .replace(/\u0093/g, '"')
    .replace(/\u0094/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  // Remove verse numbers that appear at the start of lines
  // They look like "2 " at the start or embedded within text
  text = text.replace(/^\d+\s*/, "");

  return text;
}
