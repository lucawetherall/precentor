/**
 * Classification of Bible books by reading position.
 * Used to infer the liturgical position of a reading reference
 * since the C of E lectionary page doesn't label them explicitly.
 */

export type ReadingPosition =
  | "OLD_TESTAMENT"
  | "PSALM"
  | "EPISTLE"
  | "GOSPEL"
  | "CANTICLE";

const OT_BOOKS = new Set([
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Song of Songs",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  // Deuterocanonical / Apocrypha (used in C of E lectionary)
  "Baruch",
  "Tobit",
  "Judith",
  "Wisdom",
  "Wisdom of Solomon",
  "Ecclesiasticus",
  "Sirach",
  "1 Maccabees",
  "2 Maccabees",
  "1 Esdras",
  "2 Esdras",
  "Susanna",
  "Bel and the Dragon",
]);

const GOSPEL_BOOKS = new Set(["Matthew", "Mark", "Luke", "John"]);

const EPISTLE_BOOKS = new Set([
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
]);

/**
 * Known canticle names used in the C of E lectionary.
 * These appear as alternatives to Psalms (e.g., "Canticle: Magnificat").
 */
const CANTICLE_NAMES = new Set([
  "Magnificat",
  "Benedictus",
  "Nunc Dimittis",
  "Te Deum",
  "Venite",
  "Jubilate",
]);

/**
 * Parse a book name from a scripture reference string.
 * Handles formats like "1 Corinthians 1.3-9", "Isaiah 2.1-5", "Psalm 122".
 */
export function parseBookName(reference: string): string {
  const trimmed = reference.trim();

  // Handle "Canticle: ..." references
  if (/^canticle/i.test(trimmed)) {
    return trimmed;
  }

  // Handle "Song of Solomon/Songs" specially
  if (/^song\s+of/i.test(trimmed)) {
    const match = trimmed.match(/^(Song\s+of\s+\w+)/i);
    return match ? match[1] : trimmed;
  }

  // Handle "Bel and the Dragon" specially
  if (/^bel\s+and/i.test(trimmed)) {
    return "Bel and the Dragon";
  }

  // Handle "Wisdom of Solomon" specially
  if (/^wisdom\s+of/i.test(trimmed)) {
    return "Wisdom of Solomon";
  }

  // Standard pattern: optional number prefix + book name
  // e.g., "1 Corinthians 1.3-9" -> "1 Corinthians"
  // e.g., "Isaiah 2.1-5" -> "Isaiah"
  // e.g., "Psalm 122" -> "Psalm"
  const match = trimmed.match(/^(\d?\s?[A-Z][a-z]+(?:\s+[a-z]+)?)/);
  if (match) {
    return match[1].trim();
  }

  return trimmed;
}

/**
 * Classify a scripture reference into its liturgical reading position.
 */
export function classifyReading(reference: string): ReadingPosition {
  const trimmed = reference.trim();

  // Canticle references
  if (/^canticle/i.test(trimmed)) {
    return "CANTICLE";
  }

  // Check for canticle names (e.g., "Magnificat", "Benedictus")
  for (const canticle of CANTICLE_NAMES) {
    if (trimmed.toLowerCase().includes(canticle.toLowerCase())) {
      return "CANTICLE";
    }
  }

  // Psalms
  if (/^psalms?\s/i.test(trimmed)) {
    return "PSALM";
  }

  const bookName = parseBookName(trimmed);

  // Normalize number prefixes for set lookup
  const normalized = bookName.replace(/^(\d)\s*/, "$1 ");

  if (GOSPEL_BOOKS.has(normalized)) return "GOSPEL";
  if (EPISTLE_BOOKS.has(normalized)) return "EPISTLE";
  if (OT_BOOKS.has(normalized)) return "OLD_TESTAMENT";

  // Fallback: if it looks like a psalm reference
  if (/psalm/i.test(trimmed)) return "PSALM";

  // Default to OLD_TESTAMENT for unknown references
  return "OLD_TESTAMENT";
}
