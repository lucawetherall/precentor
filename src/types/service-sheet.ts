// Service sheet data types for PDF/DOCX generation

import type { MusicSlotType, ServiceType, LiturgicalColour } from "@/types";
import type { LiturgicalSection, ServiceTemplate, LiturgicalTextBlock } from "@/data/liturgy/types";

// ─── Template Layout (per-church customisation) ─────────────────

export interface TemplateLayout {
  paperSize: "A4" | "A5";
  fontFamily: "times" | "garamond";
  accentColourOverride?: string;
  showLogo: boolean;
  logoPosition: "top-center" | "top-left";
  hymnDisplay: "number-title-tune" | "full-lyrics";
  ccliNotice: boolean;
  headerStyle: "centered" | "left-aligned";
  pageNumbering: boolean;
  borderStyle: "stripe" | "full-border" | "none";
}

export const DEFAULT_TEMPLATE_LAYOUT: TemplateLayout = {
  paperSize: "A5",
  fontFamily: "times",
  showLogo: false,
  logoPosition: "top-center",
  hymnDisplay: "number-title-tune",
  ccliNotice: false,
  headerStyle: "centered",
  pageNumbering: true,
  borderStyle: "stripe",
};

// ─── Sheet Mode ─────────────────────────────────────────────────

export type SheetMode = "booklet" | "summary";

// ─── DB-driven section (resolved from service_sections table) ───

/** A section resolved from the service_sections DB table, ready for PDF rendering */
export interface ResolvedDbSection {
  /** DB id of the service_section row */
  id: string;
  sectionKey: string;
  title: string;
  majorSection?: string | null;
  positionOrder: number;
  /** Resolved text blocks (from textOverride, liturgicalTexts, or placeholder resolution) */
  blocks: LiturgicalTextBlock[];
  /** Reading data if this is a reading placeholder section */
  reading?: ReadingEntry;
  /** Music slot data if this section has a musicSlotId */
  musicSlot?: MusicSlotEntry;
  /** The placeholder type for this section, if any */
  placeholderType?: string | null;
}

// ─── Music Slot Entry (resolved with joined data) ───────────────

export interface HymnEntry {
  book: string;
  number: number;
  firstLine: string;
  tuneName: string | null;
}

export interface MusicSlotEntry {
  slotType: MusicSlotType;
  positionOrder: number;
  label: string;
  value: string;
  notes?: string;
  hymn?: HymnEntry;
  anthem?: { title: string; composer: string; voicing?: string };
  massSetting?: { name: string; composer: string };
  canticleSetting?: { name: string; composer: string; canticle: string };
  responsesSetting?: { name: string; composer: string };
}

// ─── Reading Entry ──────────────────────────────────────────────

export interface ReadingEntry {
  position: string;
  reference: string;
  text?: string;
  bibleVersion?: string;
}

// ─── Booklet Data ───────────────────────────────────────────────

export interface BookletServiceSheetData {
  mode: "booklet";
  // Church
  churchName: string;
  churchAddress?: string;
  ccliNumber?: string;
  logoUrl?: string;
  // Service
  serviceType: ServiceType;
  date: string;
  time?: string;
  liturgicalName: string;
  season: string;
  colour: LiturgicalColour;
  // Liturgical content
  template: ServiceTemplate;
  eucharisticPrayer?: LiturgicalSection;
  liturgicalOverrides: Record<string, string>;
  collect?: string;
  postCommunion?: string;
  // Readings
  readings: ReadingEntry[];
  includeReadingText: boolean;
  // Music
  musicSlots: MusicSlotEntry[];
  // Styling
  templateLayout: TemplateLayout;
  // DB-driven sections (if null, renderer falls back to template-based approach)
  resolvedDbSections?: ResolvedDbSection[] | null;
}

// ─── Summary Data ───────────────────────────────────────────────

export interface SummaryServiceSheetData {
  mode: "summary";
  churchName: string;
  logoUrl?: string;
  serviceType: ServiceType;
  date: string;
  time?: string;
  liturgicalName: string;
  season: string;
  colour: LiturgicalColour;
  collect?: string;
  postCommunion?: string;
  readings: ReadingEntry[];
  musicSlots: MusicSlotEntry[];
  templateLayout: TemplateLayout;
}

// ─── Union ──────────────────────────────────────────────────────

export type ServiceSheetData = BookletServiceSheetData | SummaryServiceSheetData;
