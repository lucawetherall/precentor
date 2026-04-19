import { db } from "@/lib/db";
import { musicSlots, services, hymns } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { GridColumn } from "@/lib/planning/columns";

export interface CellValue {
  refId?: string | null;
  text?: string | null;
}

export interface WriteCellInput {
  serviceId: string;
  serviceType: string;
  column: GridColumn;
  value: CellValue;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function writeCell(
  tx: Tx,
  input: WriteCellInput
): Promise<void> {
  const { serviceId, serviceType, column, value } = input;
  const isEvensong = serviceType === "CHORAL_EVENSONG";

  if (column === "info") {
    await tx.update(services).set({ notes: value.text ?? null }).where(eq(services.id, serviceId));
    return;
  }

  if (column === "hymns") {
    await tx.delete(musicSlots).where(and(eq(musicSlots.serviceId, serviceId), eq(musicSlots.slotType, "HYMN")));
    const raw = (value.text ?? "").trim();
    if (raw.length === 0) return;
    const tokens = raw.includes(",")
      ? raw.split(",").map((t) => t.trim()).filter(Boolean)
      : raw.split(/\s+/).map((t) => t.trim()).filter(Boolean);

    // Resolve numeric tokens to hymnId by number (default book: NEH for v1)
    const numericTokens = tokens
      .map((t, i) => ({ t, i, n: /^\d+$/.test(t) ? parseInt(t, 10) : null }))
      .filter((x): x is { t: string; i: number; n: number } => x.n !== null);

    const lookups = numericTokens.length === 0 ? [] : await tx
      .select({ id: hymns.id, number: hymns.number })
      .from(hymns)
      .where(and(eq(hymns.book, "NEH"), inArray(hymns.number, numericTokens.map((x) => x.n))));

    const idByNumber = new Map(lookups.map((l) => [l.number, l.id]));

    await Promise.all(tokens.map((token, idx) => {
      const n = /^\d+$/.test(token) ? parseInt(token, 10) : null;
      const hymnId = n !== null ? (idByNumber.get(n) ?? null) : null;
      return tx.insert(musicSlots).values({
        serviceId,
        slotType: "HYMN",
        positionOrder: 10 + idx,
        hymnId,
        freeText: hymnId ? null : token,
      });
    }));
    return;
  }

  if (column === "setting") {
    if (isEvensong) {
      for (const slotType of ["CANTICLE_MAGNIFICAT", "CANTICLE_NUNC_DIMITTIS"] as const) {
        await upsertSlot(tx, serviceId, slotType, 20, {
          canticleSettingId: value.refId ?? null,
          freeText: value.refId ? null : value.text ?? null,
        });
      }
    } else {
      await upsertSlot(tx, serviceId, "MASS_SETTING_GLOBAL", 20, {
        massSettingId: value.refId ?? null,
        freeText: value.refId ? null : value.text ?? null,
      });
    }
    return;
  }

  if (column === "psalm") {
    await upsertSlot(tx, serviceId, "PSALM", 30, { freeText: value.text ?? null });
    return;
  }

  if (column === "chant") {
    await upsertSlot(tx, serviceId, "PSALM", 30, { psalmChant: value.text ?? null });
    return;
  }

  if (column === "introit") {
    await upsertSlot(tx, serviceId, "INTROIT", 5, {
      anthemId: value.refId ?? null,
      freeText: value.refId ? null : value.text ?? null,
    });
    return;
  }

  if (column === "anthem") {
    await upsertSlot(tx, serviceId, "ANTHEM", 40, {
      anthemId: value.refId ?? null,
      freeText: value.refId ? null : value.text ?? null,
    });
    return;
  }

  if (column === "voluntary") {
    await upsertSlot(tx, serviceId, "ORGAN_VOLUNTARY_POST", 90, { freeText: value.text ?? null });
    return;
  }

  if (column === "respAccl") {
    if (isEvensong) {
      await upsertSlot(tx, serviceId, "RESPONSES", 50, {
        responsesSettingId: value.refId ?? null,
        freeText: value.refId ? null : value.text ?? null,
      });
    } else {
      await upsertSlot(tx, serviceId, "GOSPEL_ACCLAMATION", 50, { freeText: value.text ?? null });
    }
    return;
  }
}

async function upsertSlot(
  tx: Tx,
  serviceId: string,
  slotType:
    | "INTROIT" | "HYMN" | "PSALM" | "ANTHEM"
    | "MASS_SETTING_GLOBAL" | "CANTICLE_MAGNIFICAT" | "CANTICLE_NUNC_DIMITTIS"
    | "RESPONSES" | "GOSPEL_ACCLAMATION" | "ORGAN_VOLUNTARY_POST",
  defaultPosition: number,
  patch: Partial<typeof musicSlots.$inferInsert>
) {
  const existing = await tx
    .select({ id: musicSlots.id })
    .from(musicSlots)
    .where(and(eq(musicSlots.serviceId, serviceId), eq(musicSlots.slotType, slotType)))
    .limit(1);
  if (existing.length === 0) {
    await tx.insert(musicSlots).values({
      serviceId,
      slotType,
      positionOrder: defaultPosition,
      ...patch,
    });
  } else {
    await tx.update(musicSlots).set(patch).where(eq(musicSlots.id, existing[0].id));
  }
}
