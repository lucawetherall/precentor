// Liturgical text data types for service booklet generation

import type { MusicSlotType, ServiceType } from "@/types";

/** Who speaks a given text block */
export type Speaker = "president" | "all" | "reader" | "deacon" | "rubric";

/**
 * A single block of liturgical text with speaker attribution.
 * Rendering rules:
 *   "president" → regular weight with "President" label
 *   "all"       → bold weight with "All" label (congregational response)
 *   "reader"    → regular weight with "Reader" label
 *   "deacon"    → regular weight with "Deacon" label
 *   "rubric"    → italic, smaller size (liturgical direction, not spoken)
 */
export interface LiturgicalTextBlock {
  speaker: Speaker;
  text: string;
}

/**
 * A section within a service template (e.g. "The Greeting", "The Collect").
 * Sections may contain static text blocks, link to a music slot,
 * or act as placeholders for dynamic content (readings, prayers).
 */
export interface LiturgicalSection {
  /** Unique identifier, e.g. "gathering.greeting" */
  id: string;
  /** Display title, e.g. "The Greeting" — rendered in small caps */
  title: string;
  /** Major section heading, e.g. "THE GATHERING" — rendered as full-width divider.
   *  Only set on the first section of each major division. */
  majorSection?: string;
  /** Static liturgical text blocks for this section */
  blocks: LiturgicalTextBlock[];
  /** If set, this section corresponds to a music slot of this type */
  musicSlotType?: MusicSlotType;
  /** If set, the renderer should inject dynamic data here */
  placeholder?:
    | "collect"
    | "post-communion"
    | "reading-ot"
    | "reading-nt"
    | "reading-gospel"
    | "reading-psalm"
    | "eucharistic-prayer"
    | "sermon";
  /** Whether this section can be omitted (e.g. sermon) */
  optional?: boolean;
  /** Whether the priest can override the default text */
  allowOverride?: boolean;
}

/**
 * A complete service template defining the liturgical structure.
 */
export interface ServiceTemplate {
  serviceType: ServiceType;
  /** The rite name, e.g. "Common Worship Order One" or "BCP Evening Prayer" */
  rite: string;
  /** Ordered list of sections making up the service */
  sections: LiturgicalSection[];
}
