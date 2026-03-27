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
  serviceSections,
  liturgicalTexts,
  eucharisticPrayers,
  hymnVerses,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import type {
  BookletServiceSheetData,
  SummaryServiceSheetData,
  MusicSlotEntry,
  ReadingEntry,
  TemplateLayout,
  SheetMode,
  ResolvedDbSection,
} from "@/types/service-sheet";
import { DEFAULT_TEMPLATE_LAYOUT } from "@/types/service-sheet";
import type { ServiceType, LiturgicalColour } from "@/types";
import { MUSIC_SLOT_LABELS } from "@/types";
import { CW_EUCHARIST_ORDER_ONE } from "@/data/liturgy/cw-eucharist-order-one";
import { BCP_EVENSONG } from "@/data/liturgy/bcp-evensong";
import { EUCHARISTIC_PRAYERS } from "@/data/liturgy/eucharistic-prayers";
import type { ServiceTemplate, LiturgicalSection, LiturgicalTextBlock } from "@/data/liturgy/types";
import { resolveCollectText } from "@/lib/services/collect-resolution";
import { selectVerses } from "@/lib/services/verse-selection";

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

// ─── DB section resolver ──────────────────────────────────────────

async function resolveDbSections(
  serviceId: string,
  service: typeof services.$inferSelect,
  day: typeof liturgicalDays.$inferSelect,
  dayReadings: ReadingEntry[],
  resolvedSlots: MusicSlotEntry[],
): Promise<ResolvedDbSection[] | null> {
  // Query service_sections with liturgical_texts join
  const rawSections = await db
    .select({
      section: serviceSections,
      liturgicalText: liturgicalTexts,
    })
    .from(serviceSections)
    .leftJoin(liturgicalTexts, eq(serviceSections.liturgicalTextId, liturgicalTexts.id))
    .where(eq(serviceSections.serviceId, serviceId))
    .orderBy(asc(serviceSections.positionOrder));

  // If no sections exist, signal fallback to template-based approach
  if (rawSections.length === 0) return null;

  // Build a map of music slots by id for quick lookup
  const slotById = new Map<string, MusicSlotEntry>();
  // We need raw slot rows with their ids — fetch them separately
  const rawSlotRows = await db
    .select({ slot: musicSlots })
    .from(musicSlots)
    .where(eq(musicSlots.serviceId, serviceId));
  for (const row of rawSlotRows) {
    // Find the already-resolved MusicSlotEntry by positionOrder
    const resolved = resolvedSlots.find((s) => s.positionOrder === row.slot.positionOrder);
    if (resolved) slotById.set(row.slot.id, resolved);
  }

  // Resolve eucharistic prayer from DB if eucharisticPrayerId is set
  let epBlocks: LiturgicalTextBlock[] | null = null;
  if (service.eucharisticPrayerId) {
    const epRows = await db
      .select()
      .from(eucharisticPrayers)
      .where(eq(eucharisticPrayers.id, service.eucharisticPrayerId))
      .limit(1);
    if (epRows.length > 0) {
      epBlocks = epRows[0].blocks as LiturgicalTextBlock[];
    }
  }
  // Fallback to legacy string key resolution
  if (!epBlocks && service.eucharisticPrayer) {
    const legacyEp = resolveEucharisticPrayer(service.eucharisticPrayer);
    if (legacyEp) epBlocks = legacyEp.blocks;
  }

  // Resolve collect text
  const collectText = resolveCollectText(
    service.collectOverride ?? null,
    null, // collectId join not done here; liturgical day collect is the fallback
    day.collect ?? null,
  );

  const READING_POSITION_MAP: Record<string, string> = {
    "reading-ot": "OLD_TESTAMENT",
    "reading-epistle": "EPISTLE",
    "reading-gospel": "GOSPEL",
    "reading-psalm": "PSALM",
  };

  const result: ResolvedDbSection[] = [];

  for (const { section, liturgicalText } of rawSections) {
    // Skip hidden sections
    if (!section.visible) continue;

    let blocks: LiturgicalTextBlock[] = [];
    let reading: ReadingEntry | undefined;
    let musicSlot: MusicSlotEntry | undefined;

    // 1. Text override takes highest priority
    if (section.textOverride && section.textOverride.length > 0) {
      blocks = section.textOverride as LiturgicalTextBlock[];
    } else if (liturgicalText) {
      // 2. Joined liturgical text
      blocks = liturgicalText.blocks as LiturgicalTextBlock[];
    }

    // 3. Resolve placeholders
    const pt = section.placeholderType;
    if (pt) {
      if (pt === "collect" && collectText) {
        blocks = [...blocks, { speaker: "president" as const, text: collectText }];
      } else if (pt === "post-communion" && day.postCommunion) {
        blocks = [...blocks, { speaker: "president" as const, text: day.postCommunion }];
      } else if (pt === "eucharistic-prayer" && epBlocks) {
        blocks = epBlocks;
      } else if (READING_POSITION_MAP[pt]) {
        const position = READING_POSITION_MAP[pt];
        reading = dayReadings.find((r) => r.position === position);
      }
      // "sermon" — just a placeholder, no blocks needed
    }

    // 4. Resolve music slot
    if (section.musicSlotId) {
      musicSlot = slotById.get(section.musicSlotId);

      // If hymn and we have verse selection data, resolve verse text
      if (musicSlot?.hymn) {
        const hymnId = rawSlotRows.find(
          (r) => slotById.get(r.slot.id) === musicSlot
        )?.slot?.hymnId;
        const verseCount = rawSlotRows.find(
          (r) => slotById.get(r.slot.id) === musicSlot
        )?.slot?.verseCount;
        const selectedVerses = rawSlotRows.find(
          (r) => slotById.get(r.slot.id) === musicSlot
        )?.slot?.selectedVerses;

        if (hymnId && (verseCount || selectedVerses?.length)) {
          const allVerses = await db
            .select()
            .from(hymnVerses)
            .where(eq(hymnVerses.hymnId, hymnId))
            .orderBy(asc(hymnVerses.verseNumber));

          if (allVerses.length > 0) {
            const chosen = selectVerses(
              allVerses.length,
              verseCount ?? allVerses.length,
              selectedVerses ?? null,
            );
            const chosenSet = new Set(chosen);
            const verseBlocks: LiturgicalTextBlock[] = allVerses
              .filter((v) => chosenSet.has(v.verseNumber))
              .map((v) => ({ speaker: "all" as const, text: v.text }));
            if (verseBlocks.length > 0) blocks = verseBlocks;
          }
        }
      }
    }

    result.push({
      id: section.id,
      sectionKey: section.sectionKey,
      title: section.title,
      majorSection: section.majorSection,
      positionOrder: section.positionOrder,
      blocks,
      reading,
      musicSlot,
      placeholderType: section.placeholderType,
    });
  }

  return result;
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

  // Try the DB-driven sections path first
  const dbSections = await resolveDbSections(serviceId, service, day, dayReadings, resolvedSlots);

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
    // DB-driven sections (null = fall back to template in renderer)
    resolvedDbSections: dbSections,
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
