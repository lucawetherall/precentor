// Builds typed service sheet data from database records

import { db } from "@/lib/db";
import {
  services,
  liturgicalDays,
  readings,
  musicSlots,
  churches,
  hymns,
  anthems,
  massSettings,
  canticleSettings,
  responsesSettings,
  serviceSheetTemplates,
  serviceSections,
  liturgicalTexts,
  eucharisticPrayers,
  hymnVerses,
  collects,
} from "@/lib/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
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
import { resolveLectionaryTrack, filterReadingsByTrack } from "@/lib/lectionary/track";
import { lectionaryForServiceType } from "@/lib/lectionary/for-service";
import { readLectionaryTrack } from "@/lib/churches/settings";
import { CW_EUCHARIST_ORDER_ONE } from "@/data/liturgy/cw-eucharist-order-one";
import { BCP_EVENSONG } from "@/data/liturgy/bcp-evensong";
import { EUCHARISTIC_PRAYERS } from "@/data/liturgy/eucharistic-prayers";
import type { ServiceTemplate, LiturgicalSection, LiturgicalTextBlock } from "@/data/liturgy/types";
import { resolveCollectText } from "@/lib/services/collect-resolution";
import { selectVerses } from "@/lib/services/verse-selection";
import {
  resolveEffectiveServiceIdentity,
  synthesizeSpecialReadings,
} from "@/lib/services/effective-service-identity";

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
  rawSlots: (typeof musicSlots.$inferSelect)[],
  slotEntryById: Map<string, MusicSlotEntry>,
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

  // Raw slot rows by id (already fetched alongside the resolved entries).
  const rawSlotById = new Map<string, (typeof rawSlots)[number]>();
  for (const slot of rawSlots) {
    rawSlotById.set(slot.id, slot);
  }

  // Collect all hymnIds that need verses (upfront) and batch-fetch
  const hymnIdsNeedingVerses = new Set<string>();
  for (const slot of rawSlots) {
    const { hymnId, verseCount, selectedVerses } = slot;
    if (hymnId && (verseCount || (selectedVerses as unknown[] | null)?.length)) {
      hymnIdsNeedingVerses.add(hymnId);
    }
  }

  const versesByHymnId = new Map<string, (typeof hymnVerses.$inferSelect)[]>();
  if (hymnIdsNeedingVerses.size > 0) {
    const allVerseRows = await db
      .select()
      .from(hymnVerses)
      .where(inArray(hymnVerses.hymnId, [...hymnIdsNeedingVerses]))
      .orderBy(asc(hymnVerses.verseNumber));
    for (const verse of allVerseRows) {
      const list = versesByHymnId.get(verse.hymnId) ?? [];
      list.push(verse);
      versesByHymnId.set(verse.hymnId, list);
    }
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

  // Resolve collect text — look up collectId if set
  let collectFromDb: string | null = null;
  if (service.collectId) {
    const [collectRow] = await db
      .select({ text: collects.text })
      .from(collects)
      .where(eq(collects.id, service.collectId))
      .limit(1);
    collectFromDb = collectRow?.text ?? null;
  }

  const collectText = resolveCollectText(
    service.collectOverride ?? null,
    collectFromDb,
    day.collect ?? null,
  );

  const READING_POSITION_MAP: Record<string, string> = {
    "reading-ot": "OLD_TESTAMENT",
    "reading-nt": "NEW_TESTAMENT",
    "reading-epistle": "NEW_TESTAMENT", // backward compat
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
      musicSlot = slotEntryById.get(section.musicSlotId);
      const rawSlot = rawSlotById.get(section.musicSlotId);

      if (musicSlot?.hymn && rawSlot?.hymnId) {
        const { hymnId, verseCount, selectedVerses } = rawSlot;
        if (verseCount || selectedVerses?.length) {
          const verses = versesByHymnId.get(hymnId) ?? [];
          if (verses.length > 0) {
            const chosen = selectVerses(
              verses.length, verseCount ?? verses.length, selectedVerses ?? null);
            const chosenSet = new Set(chosen);
            const verseBlocks: LiturgicalTextBlock[] = verses
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
  /** Raw music_slots rows (with ids) for section → slot resolution. */
  rawSlots: (typeof musicSlots.$inferSelect)[];
  /** Resolved entries keyed by slot id (positionOrder is not unique). */
  slotEntryById: Map<string, MusicSlotEntry>;
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
    .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
    .limit(1);

  if (serviceResult.length === 0) return null;

  const { service, day: rawDay, church } = serviceResult[0];

  // A service may keep a transferred Festival: its title, colour, collect and
  // readings then come from the chokepoint instead of the shared day.
  const identity = resolveEffectiveServiceIdentity({
    day: {
      cwName: rawDay.cwName,
      colour: rawDay.colour,
      season: rawDay.season,
      collect: rawDay.collect ?? null,
      postCommunion: rawDay.postCommunion ?? null,
    },
    specialFeastKey: service.specialFeastKey,
  });
  const day = {
    ...rawDay,
    cwName: identity.title,
    colour: identity.colour as typeof rawDay.colour,
    season: identity.season as typeof rawDay.season,
    collect: identity.collect,
    postCommunion: identity.postCommunion,
  };

  // Fetch the readings for the lectionary this service type follows (Evensong
  // reads the Second Service lectionary; everything else the Principal), then
  // collapse the Ordinary Time psalm to this service's track (per-service
  // override → church default). Without the lectionary filter the sheet
  // prints every lesson for the day — three lectionaries' worth.
  const wantedLectionary = lectionaryForServiceType(service.serviceType);
  const specialReadings = synthesizeSpecialReadings({
    specialFeastKey: service.specialFeastKey,
    lectionaryYear: rawDay.lectionaryYear,
    liturgicalDayId: rawDay.id,
  });
  const allReadings: (typeof readings.$inferSelect)[] = specialReadings
    ? specialReadings.filter((r) => r.lectionary === wantedLectionary)
    : await db
        .select()
        .from(readings)
        .where(
          and(
            eq(readings.liturgicalDayId, rawDay.id),
            eq(readings.lectionary, wantedLectionary),
          ),
        );
  const track = resolveLectionaryTrack(service.lectionaryTrack, readLectionaryTrack(church.settings));
  const dayReadings = filterReadingsByTrack(allReadings, track);

  // Fetch music slots with full joins — every library a slot can reference,
  // not just hymns, so chosen anthems / settings don't print as "TBC".
  const slotsRaw = await db
    .select({
      slot: musicSlots,
      hymn: {
        book: hymns.book,
        number: hymns.number,
        firstLine: hymns.firstLine,
        tuneName: hymns.tuneName,
      },
      anthem: {
        title: anthems.title,
        composer: anthems.composer,
        voicing: anthems.voicing,
      },
      massSetting: {
        name: massSettings.name,
        composer: massSettings.composer,
      },
      canticleSetting: {
        name: canticleSettings.name,
        composer: canticleSettings.composer,
        canticle: canticleSettings.canticle,
      },
      responsesSetting: {
        name: responsesSettings.name,
        composer: responsesSettings.composer,
      },
    })
    .from(musicSlots)
    .leftJoin(hymns, eq(musicSlots.hymnId, hymns.id))
    .leftJoin(anthems, eq(musicSlots.anthemId, anthems.id))
    .leftJoin(massSettings, eq(musicSlots.massSettingId, massSettings.id))
    .leftJoin(canticleSettings, eq(musicSlots.canticleSettingId, canticleSettings.id))
    .leftJoin(responsesSettings, eq(musicSlots.responsesSettingId, responsesSettings.id))
    .where(eq(musicSlots.serviceId, serviceId))
    .orderBy(musicSlots.positionOrder);

  // Build MusicSlotEntry array, keyed by slot id so sections can resolve their
  // own slot exactly (positionOrder is not unique — Evensong canticles share it).
  const slotEntryById = new Map<string, MusicSlotEntry>();
  const resolvedSlots: MusicSlotEntry[] = slotsRaw.map((s) => {
    const entry: MusicSlotEntry = {
      slotType: s.slot.slotType as MusicSlotEntry["slotType"],
      positionOrder: s.slot.positionOrder,
      label:
        (MUSIC_SLOT_LABELS as Record<string, string>)[s.slot.slotType] ||
        s.slot.slotType,
      value:
        s.hymn?.firstLine ||
        (s.anthem ? `${s.anthem.title} — ${s.anthem.composer}` : null) ||
        (s.massSetting ? `${s.massSetting.name} — ${s.massSetting.composer}` : null) ||
        (s.canticleSetting
          ? `${s.canticleSetting.name ?? s.canticleSetting.canticle} — ${s.canticleSetting.composer}`
          : null) ||
        (s.responsesSetting ? `${s.responsesSetting.name} — ${s.responsesSetting.composer}` : null) ||
        s.slot.freeText ||
        "TBC",
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
    if (s.anthem) {
      entry.anthem = {
        title: s.anthem.title,
        composer: s.anthem.composer,
        voicing: s.anthem.voicing ?? undefined,
      };
    }
    if (s.massSetting) {
      entry.massSetting = {
        name: s.massSetting.name,
        composer: s.massSetting.composer,
      };
    }
    if (s.canticleSetting) {
      entry.canticleSetting = {
        name: s.canticleSetting.name ?? s.canticleSetting.canticle,
        composer: s.canticleSetting.composer,
        canticle: s.canticleSetting.canticle,
      };
    }
    if (s.responsesSetting) {
      entry.responsesSetting = {
        name: s.responsesSetting.name,
        composer: s.responsesSetting.composer,
      };
    }
    slotEntryById.set(s.slot.id, entry);
    return entry;
  });
  const rawSlots = slotsRaw.map((s) => s.slot);

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
    rawSlots,
    slotEntryById,
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

  const { service, day, church, dayReadings, resolvedSlots, rawSlots, slotEntryById, templateLayout, logoUrl } = fetched;
  const layout = layoutOverride
    ? { ...templateLayout, ...layoutOverride }
    : templateLayout;

  const overrides = (service.liturgicalOverrides as Record<string, string>) ?? {};

  // Try the DB-driven sections path first
  const dbSections = await resolveDbSections(serviceId, service, day, dayReadings, rawSlots, slotEntryById);

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
