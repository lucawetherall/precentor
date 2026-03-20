import ICAL from "ical.js";

export interface ParsedDay {
  uid: string;
  date: string; // YYYY-MM-DD
  name: string;
  description: string;
  season: string;
  colour: string;
  collect?: string;
  postCommunion?: string;
  readings: ParsedReading[];
}

export interface ParsedReading {
  lectionary: "PRINCIPAL" | "SECOND" | "THIRD";
  position: "OLD_TESTAMENT" | "PSALM" | "EPISTLE" | "GOSPEL" | "CANTICLE";
  reference: string;
  bookName?: string;
}

// Map colour names from iCal to our enum values
function mapColour(raw: string): "PURPLE" | "WHITE" | "GOLD" | "GREEN" | "RED" | "ROSE" {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("purple") || lower.includes("violet")) return "PURPLE";
  if (lower.includes("gold")) return "GOLD";
  if (lower.includes("red")) return "RED";
  if (lower.includes("rose") || lower.includes("pink")) return "ROSE";
  if (lower.includes("white")) return "WHITE";
  return "GREEN"; // default for Ordinary Time
}

// Map season names to our enum
function mapSeason(name: string, colour: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("advent")) return "ADVENT";
  if (lower.includes("christmas")) return "CHRISTMAS";
  if (lower.includes("epiphany")) return "EPIPHANY";
  if (lower.includes("lent")) return "LENT";
  if (lower.includes("holy week") || lower.includes("palm sunday") || lower.includes("good friday") || lower.includes("maundy")) return "HOLY_WEEK";
  if (lower.includes("easter")) return "EASTER";
  if (lower.includes("ascension")) return "ASCENSION";
  if (lower.includes("pentecost") || lower.includes("whitsun")) return "PENTECOST";
  if (lower.includes("trinity sunday")) return "TRINITY";
  if (lower.includes("christ the king") || lower.includes("kingdom")) return "KINGDOM";
  return "ORDINARY";
}

// Extract scripture references from description text
function extractReadings(description: string): ParsedReading[] {
  const readings: ParsedReading[] = [];
  if (!description) return readings;

  const lines = description.split(/\n|\r\n?/);
  let currentLectionary: "PRINCIPAL" | "SECOND" | "THIRD" = "PRINCIPAL";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect lectionary section headers
    if (/principal\s+service/i.test(trimmed)) {
      currentLectionary = "PRINCIPAL";
      continue;
    }
    if (/second\s+service/i.test(trimmed)) {
      currentLectionary = "SECOND";
      continue;
    }
    if (/third\s+service/i.test(trimmed)) {
      currentLectionary = "THIRD";
      continue;
    }

    // Try to match reading patterns like "OT: Genesis 1:1-5" or "Psalm 23" or "Gospel: John 1:1-14"
    const readingMatch = trimmed.match(/^(OT|Old Testament|Psalm|Epistle|NT|Gospel|Canticle)[:\s]+(.+)/i);
    if (readingMatch) {
      const posRaw = readingMatch[1].toLowerCase();
      let position: ParsedReading["position"] = "OLD_TESTAMENT";
      if (posRaw.includes("psalm")) position = "PSALM";
      else if (posRaw.includes("epistle") || posRaw === "nt") position = "EPISTLE";
      else if (posRaw.includes("gospel")) position = "GOSPEL";
      else if (posRaw.includes("canticle")) position = "CANTICLE";

      readings.push({
        lectionary: currentLectionary,
        position,
        reference: readingMatch[2].trim(),
      });
      continue;
    }

    // Fallback: try to match bare scripture references (e.g. "Genesis 1:1-5")
    const scriptureRef = trimmed.match(/^(\d?\s?[A-Z][a-z]+\.?\s+\d+[:\.\d\-,\s]*)/);
    if (scriptureRef) {
      readings.push({
        lectionary: currentLectionary,
        position: "OLD_TESTAMENT", // default, will be refined
        reference: scriptureRef[1].trim(),
      });
    }
  }

  return readings;
}

export function parseICalFeed(icsContent: string): ParsedDay[] {
  const jcalData = ICAL.parse(icsContent);
  const comp = new ICAL.Component(jcalData);
  const events = comp.getAllSubcomponents("vevent");

  const days: ParsedDay[] = [];

  for (const event of events) {
    const vevent = new ICAL.Event(event);
    const uid = vevent.uid || "";
    const summary = vevent.summary || "";
    const description = vevent.description || "";
    const dtstart = vevent.startDate;

    if (!dtstart) continue;

    const dateStr = `${dtstart.year}-${String(dtstart.month).padStart(2, "0")}-${String(dtstart.day).padStart(2, "0")}`;

    // Extract colour from description or summary
    const colourMatch = description.match(/colour[:\s]*(purple|violet|white|gold|green|red|rose|pink)/i)
      || summary.match(/(purple|violet|white|gold|green|red|rose|pink)/i);
    const colour = colourMatch ? mapColour(colourMatch[1]) : "GREEN";

    const season = mapSeason(summary, colour);
    const readings = extractReadings(description);

    // Try to extract collect and post-communion from description
    const collectMatch = description.match(/Collect[:\s]*(.+?)(?=Post[- ]?Communion|$)/is);
    const pcMatch = description.match(/Post[- ]?Communion[:\s]*(.+?)$/is);

    days.push({
      uid,
      date: dateStr,
      name: summary,
      description,
      season,
      colour,
      collect: collectMatch ? collectMatch[1].trim() : undefined,
      postCommunion: pcMatch ? pcMatch[1].trim() : undefined,
      readings,
    });
  }

  return days;
}
