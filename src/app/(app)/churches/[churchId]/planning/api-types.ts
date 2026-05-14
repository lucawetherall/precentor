import type { PatternInput } from "./ghost-rows";

export interface ApiDay {
  id: string;
  date: string;
  cwName: string;
  season: string;
  colour: string;
  sundayKey: string | null;
  section: string | null;
}

export interface ApiService {
  id: string;
  churchId: string;
  liturgicalDayId: string;
  serviceType: string;
  time: string | null;
  notes: string | null;
  updatedAt: string | Date;
}

export interface ApiSlot {
  id: string;
  serviceId: string;
  slotType: string;
  positionOrder: number;
  hymnId: string | null;
  anthemId: string | null;
  massSettingId: string | null;
  canticleSettingId: string | null;
  responsesSettingId: string | null;
  freeText: string | null;
  psalmChant: string | null;
  hymnBook: string | null;
  hymnNumber: number | null;
  hymnFirstLine: string | null;
  anthemTitle: string | null;
  anthemComposer: string | null;
  massSettingName: string | null;
  massSettingComposer: string | null;
  canticleSettingName: string | null;
  canticleSettingComposer: string | null;
  responsesSettingName: string | null;
  responsesSettingComposer: string | null;
}

export interface ApiReading {
  id: string;
  liturgicalDayId: string;
  lectionary: string;
  position: string;
  reference: string;
  bookName: string | null;
  readingText: string | null;
}

export interface ApiResponse {
  days: ApiDay[];
  services: ApiService[];
  slots: ApiSlot[];
  readings: ApiReading[];
  patterns: PatternInput[];
}
