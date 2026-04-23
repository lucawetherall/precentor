import type { LiturgicalColour, LiturgicalSeason } from "@/types";

export type MusicItemSegment =
  | { kind: "plain"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "linebreak" };

export type MusicItemLabel =
  | "Psalm"
  | "Setting"
  | "Anthem"
  | "Anthems"
  | "Canticles"
  | "Responses"
  | "Introit"
  | "Hymns"
  | "Voluntary"
  | "Voluntary (after)"
  | "Offertory"
  | "Other";

export interface MusicItemRow {
  label: MusicItemLabel;
  segments: MusicItemSegment[];
  sub?: string; // italic sub-text (psalm chant composer, "(transferred)")
}

export type MusicListFieldSet = "CHORAL" | "HYMNS_ONLY" | "READINGS_ONLY";

export interface MusicListService {
  id: string;
  date: string; // YYYY-MM-DD
  time: string | null; // free-form "10.30am"
  feastName: string;
  feastSub?: string; // reserved; MVP returns undefined
  serviceTypeLabel: string;
  isSaid: boolean;
  saidNote?: string;
  items: MusicItemRow[]; // empty when isSaid
  colour: LiturgicalColour;
  season: LiturgicalSeason;
  musicListFieldSet: MusicListFieldSet;
}

export interface MusicListMonth {
  monthName: string; // "May"
  year: number; // 2026
  services: MusicListService[];
}

export interface MusicListData {
  churchName: string;
  periodSubtitle: string; // "May & June 2026"
  months: MusicListMonth[];
}
