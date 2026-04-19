"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { computeGhostRows } from "./ghost-rows";
import type { PatternInput, ExistingServiceRef } from "./ghost-rows";
import type {
  PlanningRow,
  CellDisplay,
  ReadingsDisplay,
} from "./types";

// ─── API response types ───────────────────────────────────────

interface ApiDay {
  id: string;
  date: string;
  cwName: string;
  season: string;
  colour: string;
}

interface ApiService {
  id: string;
  churchId: string;
  liturgicalDayId: string;
  serviceType: string;
  time: string | null;
  notes: string | null;
  updatedAt: string;
}

interface ApiSlot {
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

interface ApiReading {
  id: string;
  liturgicalDayId: string;
  lectionary: string;
  position: string;
  reference: string;
  bookName: string | null;
  readingText: string | null;
}

interface ApiResponse {
  days: ApiDay[];
  services: ApiService[];
  slots: ApiSlot[];
  readings: ApiReading[];
  patterns: PatternInput[];
}

// ─── Display helpers ──────────────────────────────────────────

function emptyCell(): CellDisplay {
  return { displayText: "" };
}

function cellText(text: string): CellDisplay {
  return { displayText: text };
}

function joinParts(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}

function deriveIntroit(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "INTROIT");
  if (!slot) return emptyCell();
  if (slot.anthemTitle) {
    return cellText(joinParts(slot.anthemTitle, slot.anthemComposer));
  }
  if (slot.freeText) return cellText(slot.freeText);
  return emptyCell();
}

function deriveHymns(slots: ApiSlot[]): CellDisplay {
  const hymnSlots = slots
    .filter((s) => s.slotType === "HYMN")
    .sort((a, b) => a.positionOrder - b.positionOrder);
  if (hymnSlots.length === 0) return emptyCell();

  const parts = hymnSlots.map((s) => {
    if (s.hymnNumber != null) return String(s.hymnNumber);
    if (s.freeText) return s.freeText;
    return "";
  }).filter(Boolean);

  return cellText(parts.join(", "));
}

function deriveSetting(slots: ApiSlot[], isEvensong: boolean): CellDisplay {
  if (isEvensong) {
    const magSlot = slots.find((s) => s.slotType === "CANTICLE_MAGNIFICAT");
    if (!magSlot) return emptyCell();
    if (magSlot.canticleSettingName) {
      return cellText(joinParts(magSlot.canticleSettingName, magSlot.canticleSettingComposer));
    }
    if (magSlot.freeText) return cellText(magSlot.freeText);
    return emptyCell();
  }
  // Eucharist
  const globalSlot = slots.find((s) => s.slotType === "MASS_SETTING_GLOBAL");
  if (globalSlot) {
    if (globalSlot.massSettingName) {
      return cellText(joinParts(globalSlot.massSettingName, globalSlot.massSettingComposer));
    }
    if (globalSlot.freeText) return cellText(globalSlot.freeText);
  }
  return emptyCell();
}

function derivePsalm(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "PSALM");
  if (!slot) return emptyCell();
  if (slot.freeText) return cellText(slot.freeText);
  return emptyCell();
}

function deriveChant(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "PSALM");
  if (!slot) return emptyCell();
  if (slot.psalmChant) return cellText(slot.psalmChant);
  return emptyCell();
}

function deriveRespAccl(slots: ApiSlot[], isEvensong: boolean): CellDisplay {
  if (isEvensong) {
    const slot = slots.find((s) => s.slotType === "RESPONSES");
    if (!slot) return emptyCell();
    if (slot.responsesSettingName) {
      return cellText(joinParts(slot.responsesSettingName, slot.responsesSettingComposer));
    }
    if (slot.freeText) return cellText(slot.freeText);
    return emptyCell();
  }
  // Eucharist
  const slot = slots.find((s) => s.slotType === "GOSPEL_ACCLAMATION");
  if (!slot) return emptyCell();
  if (slot.freeText) return cellText(slot.freeText);
  return emptyCell();
}

function deriveAnthem(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "ANTHEM");
  if (!slot) return emptyCell();
  if (slot.anthemTitle) {
    return cellText(joinParts(slot.anthemTitle, slot.anthemComposer));
  }
  if (slot.freeText) return cellText(slot.freeText);
  return emptyCell();
}

function deriveVoluntary(slots: ApiSlot[]): CellDisplay {
  const slot = slots.find((s) => s.slotType === "ORGAN_VOLUNTARY_POST");
  if (!slot) return emptyCell();
  if (slot.freeText) return cellText(slot.freeText);
  return emptyCell();
}

// ─── Service type label ───────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  SUNG_EUCHARIST: "Sung Eucharist",
  CHORAL_EVENSONG: "Choral Evensong",
  SAID_EUCHARIST: "Said Eucharist",
  CHORAL_MATINS: "Choral Matins",
  FAMILY_SERVICE: "Family Service",
  COMPLINE: "Compline",
  CUSTOM: "Service",
};

function serviceLabel(serviceType: string): string {
  return SERVICE_LABELS[serviceType] ?? serviceType;
}

// ─── Row builder ──────────────────────────────────────────────

function buildRealRow(
  svc: ApiService,
  day: ApiDay,
  slotsByService: Map<string, ApiSlot[]>,
  readingsByDay: Map<string, ApiReading[]>,
): PlanningRow {
  const slots = slotsByService.get(svc.id) ?? [];
  const isEvensong = svc.serviceType === "CHORAL_EVENSONG";
  const dayReadings = readingsByDay.get(svc.liturgicalDayId) ?? [];

  const readings: ReadingsDisplay[] = dayReadings
    .filter((r) => r.lectionary === "PRINCIPAL")
    .map((r) => ({
      ref: r.reference,
      text: r.bookName ?? null,
    }));

  return {
    kind: "real",
    serviceId: svc.id,
    date: day.date,
    serviceType: svc.serviceType,
    time: svc.time,
    liturgicalDayId: svc.liturgicalDayId,
    updatedAt: svc.updatedAt,
    cells: {
      introit: deriveIntroit(slots),
      hymns: deriveHymns(slots),
      setting: deriveSetting(slots, isEvensong),
      psalm: derivePsalm(slots),
      chant: deriveChant(slots),
      respAccl: deriveRespAccl(slots, isEvensong),
      anthem: deriveAnthem(slots),
      voluntary: deriveVoluntary(slots),
      info: cellText(svc.notes ?? ""),
    },
    readings,
  };
}

// ─── Sorting ──────────────────────────────────────────────────

function rowSortKey(row: PlanningRow): string {
  const time = row.time ?? "00:00";
  return `${row.date}T${time}`;
}

// ─── Component ───────────────────────────────────────────────

interface Props {
  churchId: string;
  from: string;
  to: string;
}

const COLUMNS = [
  { key: "introit", label: "Introit" },
  { key: "hymns", label: "Hymns" },
  { key: "setting", label: "Setting" },
  { key: "psalm", label: "Psalm" },
  { key: "chant", label: "Chant" },
  { key: "respAccl", label: "Resp/Accl" },
  { key: "anthem", label: "Anthem" },
  { key: "voluntary", label: "Voluntary" },
  { key: "info", label: "Info" },
] as const;

export function PlanningGrid({ churchId, from, to }: Props) {
  const [rows, setRows] = useState<PlanningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);

    fetch(`/api/churches/${churchId}/planning?from=${from}&to=${to}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ApiResponse>;
      })
      .then((data) => {
        // Index days by id
        const daysById = new Map<string, ApiDay>(data.days.map((d) => [d.id, d]));

        // Index slots by serviceId
        const slotsByService = new Map<string, ApiSlot[]>();
        for (const slot of data.slots) {
          const existing = slotsByService.get(slot.serviceId) ?? [];
          existing.push(slot);
          slotsByService.set(slot.serviceId, existing);
        }

        // Index readings by liturgicalDayId
        const readingsByDay = new Map<string, ApiReading[]>();
        for (const reading of data.readings) {
          const existing = readingsByDay.get(reading.liturgicalDayId) ?? [];
          existing.push(reading);
          readingsByDay.set(reading.liturgicalDayId, existing);
        }

        // Build real rows
        const realRows: PlanningRow[] = [];
        for (const svc of data.services) {
          const day = daysById.get(svc.liturgicalDayId);
          if (!day) continue;
          realRows.push(buildRealRow(svc, day, slotsByService, readingsByDay));
        }

        // Build ghost rows
        const existingRefs: ExistingServiceRef[] = data.services.map((s) => {
          const day = daysById.get(s.liturgicalDayId);
          return {
            date: day?.date ?? "",
            serviceType: s.serviceType as ExistingServiceRef["serviceType"],
          };
        }).filter((r) => r.date !== "");

        const ghosts = computeGhostRows({
          from,
          to,
          patterns: data.patterns,
          existingServices: existingRefs,
        });

        const ghostRows: PlanningRow[] = ghosts.map((g) => ({
          kind: "ghost",
          ghostId: g.ghostId,
          date: g.date,
          serviceType: g.serviceType,
          time: g.time,
          cells: {
            introit: emptyCell(),
            hymns: emptyCell(),
            setting: emptyCell(),
            psalm: emptyCell(),
            chant: emptyCell(),
            respAccl: emptyCell(),
            anthem: emptyCell(),
            voluntary: emptyCell(),
            info: emptyCell(),
          },
          readings: [],
        }));

        // Merge and sort
        const allRows = [...realRows, ...ghostRows].sort((a, b) =>
          rowSortKey(a).localeCompare(rowSortKey(b))
        );

        setRows(allRows);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });
  }, [churchId, from, to]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading grid…</p>;
  }

  if (fetchError) {
    return <p className="text-sm text-destructive">Error: {fetchError}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No services found for this period.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-2 font-medium min-w-[140px]">
              Date / Service
            </th>
            {COLUMNS.map((col) => (
              <th key={col.key} className="text-left p-2 font-medium whitespace-nowrap">
                {col.label}
              </th>
            ))}
            <th className="text-left p-2 font-medium whitespace-nowrap">
              Readings
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowKey = row.kind === "real" ? row.serviceId! : row.ghostId!;
            const isGhost = row.kind === "ghost";
            let dateLabel = row.date;
            try {
              dateLabel = format(parseISO(row.date), "EEE d MMM");
            } catch {
              // keep raw
            }
            const readingsText = row.readings
              .map((r) => (r.text ? `${r.ref} (${r.text})` : r.ref))
              .join("; ");

            return (
              <tr
                key={rowKey}
                className={`border-b border-border hover:bg-muted/40 transition-colors ${
                  isGhost ? "opacity-60" : ""
                }`}
              >
                <td className="p-2 min-w-[140px] align-top">
                  <span className="block font-medium">{dateLabel}</span>
                  <span className="block text-xs text-muted-foreground">
                    {serviceLabel(row.serviceType)}
                    {row.time ? ` · ${row.time}` : ""}
                  </span>
                </td>
                {COLUMNS.map((col) => (
                  <td key={col.key} className="p-2 align-top max-w-[200px]">
                    <span className="block truncate">
                      {row.cells[col.key].displayText}
                    </span>
                  </td>
                ))}
                <td className="p-2 align-top max-w-[200px]">
                  <span className="block truncate text-xs text-muted-foreground">
                    {readingsText}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
