import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/template-resolution", () => ({ resolveTemplateSections: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), transaction: vi.fn() },
}));

import { generateServicesForChurch } from "../auto-generate";
import { db } from "@/lib/db";
import { resolveTemplateSections } from "@/lib/services/template-resolution";

// 2026-06-07 is a Sunday (dayOfWeek 0); 2026-06-08 is a Monday.
const SUNDAY = "2026-06-07";
const MONDAY = "2026-06-08";

function mockPatternsThenDays(
  patterns: unknown[],
  days: unknown[],
) {
  vi.mocked(db.select)
    .mockReturnValueOnce({
      from: () => ({ innerJoin: () => ({ where: () => Promise.resolve(patterns) }) }),
    } as unknown as ReturnType<typeof db.select>)
    .mockReturnValueOnce({
      from: () => ({ where: () => Promise.resolve(days) }),
    } as unknown as ReturnType<typeof db.select>);
}

describe("generateServicesForChurch — batched inserts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns created:0 without inserting when there are no patterns", async () => {
    vi.mocked(db.select).mockReturnValueOnce({
      from: () => ({ innerJoin: () => ({ where: () => Promise.resolve([]) }) }),
    } as unknown as ReturnType<typeof db.select>);
    const res = await generateServicesForChurch("c1", SUNDAY, MONDAY);
    expect(res).toEqual({ created: 0 });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("inserts all candidate services in a single batched statement and reports the created count", async () => {
    mockPatternsThenDays(
      [{ id: "pat1", churchId: "c1", dayOfWeek: 0, presetId: "p1", enabled: true, serviceType: "SUNG_EUCHARIST", time: "10:00" }],
      [
        { id: "day-sun", date: SUNDAY, season: "ORDINARY" },
        { id: "day-mon", date: MONDAY, season: "ORDINARY" },
      ],
    );
    // Template with one music section and one non-music section.
    vi.mocked(resolveTemplateSections).mockResolvedValue([
      { sectionKey: "music.hymn", title: "Hymn", positionOrder: 0, musicSlotType: "HYMN" },
      { sectionKey: "liturgy.collect", title: "Collect", positionOrder: 1, musicSlotType: null },
    ] as unknown as Awaited<ReturnType<typeof resolveTemplateSections>>);

    const valuesSpy = vi.fn((_rows: unknown) => ({
      onConflictDoNothing: () => ({
        returning: () => Promise.resolve([
          { id: "svc-1", liturgicalDayId: "day-sun", serviceType: "SUNG_EUCHARIST" },
        ]),
      }),
    }));
    vi.mocked(db.insert).mockReturnValue({ values: valuesSpy } as unknown as ReturnType<typeof db.insert>);

    const slotValues = vi.fn().mockResolvedValue(undefined);
    const sectionValues = vi.fn().mockResolvedValue(undefined);
    const tx = {
      insert: vi.fn()
        .mockReturnValueOnce({ values: slotValues })
        .mockReturnValueOnce({ values: sectionValues }),
    };
    vi.mocked(db.transaction).mockImplementation(
      (async (cb: (t: typeof tx) => unknown) => cb(tx)) as unknown as typeof db.transaction,
    );

    const res = await generateServicesForChurch("c1", SUNDAY, MONDAY);

    expect(res).toEqual({ created: 1 });
    // Exactly one batched services insert (not one per pattern/day).
    expect(db.insert).toHaveBeenCalledTimes(1);
    // Only the Sunday matches dayOfWeek 0 — the Monday is filtered out.
    expect(valuesSpy).toHaveBeenCalledTimes(1);
    const candidateRows = valuesSpy.mock.calls[0][0] as unknown[];
    expect(candidateRows).toHaveLength(1);

    // One batched slots insert and one batched sections insert inside one tx.
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(slotValues).toHaveBeenCalledTimes(1);
    expect(sectionValues).toHaveBeenCalledTimes(1);

    const slotsInserted = slotValues.mock.calls[0][0] as { id: string; slotType: string }[];
    const sectionsInserted = sectionValues.mock.calls[0][0] as { musicSlotId: string | null }[];
    expect(slotsInserted).toHaveLength(1);
    expect(slotsInserted[0].slotType).toBe("HYMN");
    // The music section references the generated slot id; the other section is null.
    expect(sectionsInserted).toHaveLength(2);
    expect(sectionsInserted.map((s) => s.musicSlotId)).toContain(slotsInserted[0].id);
    expect(sectionsInserted.filter((s) => s.musicSlotId === null)).toHaveLength(1);
  });

  it("dedupes candidates on (day, serviceType) so a batched insert never self-conflicts", async () => {
    // Two enabled Sunday patterns with the same serviceType — the old loop let
    // the first win via ON CONFLICT; the batched path must dedupe up front.
    mockPatternsThenDays(
      [
        { id: "pat1", churchId: "c1", dayOfWeek: 0, presetId: "p1", enabled: true, serviceType: "SUNG_EUCHARIST", time: "08:00" },
        { id: "pat2", churchId: "c1", dayOfWeek: 0, presetId: "p2", enabled: true, serviceType: "SUNG_EUCHARIST", time: "10:00" },
      ],
      [{ id: "day-sun", date: SUNDAY, season: "ORDINARY" }],
    );
    vi.mocked(resolveTemplateSections).mockResolvedValue([] as unknown as Awaited<ReturnType<typeof resolveTemplateSections>>);

    const valuesSpy = vi.fn((_rows: unknown) => ({
      onConflictDoNothing: () => ({ returning: () => Promise.resolve([]) }),
    }));
    vi.mocked(db.insert).mockReturnValue({ values: valuesSpy } as unknown as ReturnType<typeof db.insert>);

    await generateServicesForChurch("c1", SUNDAY, SUNDAY);

    const candidateRows = valuesSpy.mock.calls[0][0] as { presetId: string }[];
    // Deduped to a single row, keeping the first pattern (08:00 / p1).
    expect(candidateRows).toHaveLength(1);
    expect(candidateRows[0].presetId).toBe("p1");
  });
});
