// Builds typed service sheet data from database records

import { db } from "@/lib/db";
import {
  services,
  liturgicalDays,
  readings,
  musicSlots,
  churches,
  hymns,
  serviceSheetTemplates,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type {
  BookletServiceSheetData,
  SummaryServiceSheetData,
  MusicSlotEntry,
  ReadingEntry,
  TemplateLayout,
  SheetMode,
} from "@/types/service-sheet";
import { DEFAULT_TEMPLATE_LAYOUT } from "@/types/service-sheet";
import type { ServiceType, LiturgicalColour } from "@/types";
import { MUSIC_SLOT_LABELS } from "@/types";
import { CW_EUCHARIST_ORDER_ONE } from "@/data/liturgy/cw-eucharist-order-one";
import { BCP_EVENSONG } from "@/data/liturgy/bcp-evensong";
import { EUCHARISTIC_PRAYERS } from "@/data/liturgy/eucharistic-prayers";
import type { ServiceTemplate, LiturgicalSection } from "@/data/liturgy/types";

// ─── Template resolution ─────────────────────────────────────────

const SERVICE_TYPE_TO_TEMPLATE: Partial<Record<ServiceType, ServiceTemplate>> = {
  SUNG_EUCHARIST: CW_EUCHARIST_ORDER_ONE,
  SAID_EUCHARIST: CW_EUCHARIST_ORDER_ONE,
  CHORAL_EVENSONG: BCP_EVENSONG,
};

export function resolveServiceTemplate(serviceType: ServiceType): ServiceTemplate {
  return SERVICE_TYPE_TO_TEMPLATE[serviceType] ?? CW_EUCHARIST_ORDER_ONE;
}

export function resolveEucharisticPrayer(key: string | null): LiturgicalSection | undefined {
  if (!key) return undefined;
  // Support both "A" and "eucharistic-prayer-a" formats
  const normalised = key.toUpperCase().replace("EUCHARISTIC-PRAYER-", "");
  return EUCHARISTIC_PRAYERS[normalised];
}

// ─── Data fetching ───────────────────────────────────────────────

interface FetchedServiceData {
  service: typeof services.$inferSelect;
  day: typeof liturgicalDays.$inferSelect;
  church: typeof churches.$inferSelect;
  dayReadings: ReadingEntry[];
  resolvedSlots: MusicSlotEntry[];
  templateLayout: TemplateLayout;
  logoUrl?: string;
}

async function fetchServiceData(
  serviceId: string,
  churchId: string
): Promise<FetchedServiceData | null> {
  const serviceResult = await db
    .select({
      service: services,
      day: liturgicalDays,
      church: churches,
    })
    .from(services)
    .innerJoin(liturgicalDays, eq(services.liturgicalDayId, liturgicalDays.id))
    .innerJoin(churches, eq(services.churchId, churches.id))
    .where(eq(services.id, serviceId))
    .limit(1);

  if (serviceResult.length === 0) return null;

  const { service, day, church } = serviceResult[0];

  // Fetch readings (with text for booklet mode)
  const dayReadings = await db
    .select()
    .from(readings)
    .where(eq(readings.liturgicalDayId, day.id));

  // Fetch music slots with full joins
  const slotsRaw = await db
    .select({
      slot: musicSlots,
      hymn: {
        book: hymns.book,
        number: hymns.number,
        firstLine: hymns.firstLine,
        tuneName: hymns.tuneName,
      },
    })
    .from(musicSlots)
    .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
    .where(eq(musicSlots.serviceId, serviceId))
    .orderBy(musicSlots.positionOrder);

  // Build MusicSlotEntry array
  const resolvedSlots: MusicSlotEntry[] = slotsRaw.map((s) => {
    const entry: MusicSlotEntry = {
      slotType: s.slot.slotType as MusicSlotEntry["slotType"],
      positionOrder: s.slot.positionOrder,
      label:
        (MUSIC_SLOT_LABELS as Record<string, string>)[s.slot.slotType] ||
        s.slot.slotType,
      value: s.hymn?.firstLine || s.slot.freeText || "TBC",
      notes: s.slot.notes || undefined,
    };
    if (s.hymn) {
      entry.hymn = {
        book: s.hymn.book,
        number: s.hymn.number,
        firstLine: s.hymn.firstLine,
        tuneName: s.hymn.tuneName,
      };
    }
    return entry;
  });

  // Fetch church template layout and logo
  let templateLayout: TemplateLayout = { ...DEFAULT_TEMPLATE_LAYOUT };
  let logoUrl: string | undefined;
  const templates = await db
    .select()
    .from(serviceSheetTemplates)
    .where(eq(serviceSheetTemplates.churchId, churchId))
    .limit(1);

  if (templates.length > 0) {
    if (templates[0].layout) {
      templateLayout = {
        ...DEFAULT_TEMPLATE_LAYOUT,
        ...(templates[0].layout as Partial<TemplateLayout>),
      };
    }
    logoUrl = templates[0].logoUrl || undefined;
  }

  const readingEntries: ReadingEntry[] = dayReadings.map((r) => ({
    position: r.position,
    reference: r.reference,
    text: r.readingText || undefined,
    bibleVersion: r.bibleVersion || undefined,
  }));

  return {
    service,
    day,
    church,
    dayReadings: readingEntries,
    resolvedSlots,
    templateLayout,
    logoUrl,
  };
}

// ─── Public API ──────────────────────────────────────────────────

export async function buildBookletData(
  serviceId: string,
  churchId: string,
  layoutOverride?: Partial<TemplateLayout>
): Promise<BookletServiceSheetData | null> {
  const fetched = await fetchServiceData(serviceId, churchId);
  if (!fetched) return null;

  const { service, day, church, dayReadings, resolvedSlots, templateLayout, logoUrl } = fetched;
  const layout = layoutOverride
    ? { ...templateLayout, ...layoutOverride }
    : templateLayout;

  const overrides = (service.liturgicalOverrides as Record<string, string>) ?? {};

  return {
    mode: "booklet",
    churchName: church.name,
    churchAddress: church.address || undefined,
    ccliNumber: church.ccliNumber || undefined,
    logoUrl,
    serviceType: service.serviceType as ServiceType,
    date: day.date,
    time: service.time || undefined,
    liturgicalName: day.cwName,
    season: day.season,
    colour: day.colour as LiturgicalColour,
    template: resolveServiceTemplate(service.serviceType as ServiceType),
    eucharisticPrayer: resolveEucharisticPrayer(service.eucharisticPrayer),
    liturgicalOverrides: overrides,
    collect: day.collect || undefined,
    postCommunion: day.postCommunion || undefined,
    readings: dayReadings,
    includeReadingText: service.includeReadingText ?? true,
    musicSlots: resolvedSlots,
    templateLayout: layout,
  };
}

export async function buildSummaryData(
  serviceId: string,
  churchId: string,
  layoutOverride?: Partial<TemplateLayout>
): Promise<SummaryServiceSheetData | null> {
  const fetched = await fetchServiceData(serviceId, churchId);
  if (!fetched) return null;

  const { service, day, church, dayReadings, resolvedSlots, templateLayout, logoUrl } = fetched;
  const layout = layoutOverride
    ? { ...templateLayout, ...layoutOverride }
    : templateLayout;

  return {
    mode: "summary",
    churchName: church.name,
    logoUrl,
    serviceType: service.serviceType as ServiceType,
    date: day.date,
    time: service.time || undefined,
    liturgicalName: day.cwName,
    season: day.season,
    colour: day.colour as LiturgicalColour,
    collect: day.collect || undefined,
    postCommunion: day.postCommunion || undefined,
    readings: dayReadings,
    musicSlots: resolvedSlots,
    templateLayout: layout,
  };
}

/** Determine sheet mode from service record or query param override */
export function resolveSheetMode(
  serviceSheetMode: string | null,
  queryOverride: string | null
): SheetMode {
  if (queryOverride === "booklet" || queryOverride === "summary") {
    return queryOverride;
  }
  if (serviceSheetMode === "booklet") return "booklet";
  return "summary";
}
