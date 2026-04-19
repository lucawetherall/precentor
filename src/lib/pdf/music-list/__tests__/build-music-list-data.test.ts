import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ db: { select: vi.fn() } }));

import { buildMusicListData } from "../build-music-list-data";
import { db } from "@/lib/db";

// Minimal service row matching what the query returns
const baseServiceRow = {
  serviceId: "svc1",
  serviceType: "SUNG_EUCHARIST",
  time: "10:00",
  choirStatus: "CHOIR_REQUIRED",
  notes: null,
  date: "2026-05-10",
  cwName: "Fifth Sunday of Easter",
  colour: "WHITE",
  season: "EASTER",
  musicListFieldSet: null as string | null,
};

describe("buildMusicListData — musicListFieldSet", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defaults musicListFieldSet to CHORAL when service has no preset", async () => {
    (db.select as any)
      // Query 1: church lookup
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "c1", name: "St Mary's" }]) }) }),
      })
      // Query 2: services in range — no preset (musicListFieldSet null)
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            leftJoin: () => ({
              where: () => ({
                orderBy: () => Promise.resolve([{ ...baseServiceRow, musicListFieldSet: null }]),
              }),
            }),
          }),
        }),
      })
      // Query 3: music slots
      .mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
              leftJoin: () => ({
                leftJoin: () => ({
                  leftJoin: () => ({
                    where: () => ({
                      orderBy: () => Promise.resolve([]),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

    const result = await buildMusicListData("c1", "2026-05-01", "2026-05-31");
    expect(result).not.toBeNull();
    const svc = result!.months[0].services[0];
    expect(svc.musicListFieldSet).toBe("CHORAL");
  });

  it("uses musicListFieldSet from preset when present", async () => {
    (db.select as any)
      // Query 1: church lookup
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "c1", name: "St Mary's" }]) }) }),
      })
      // Query 2: services in range — preset with HYMNS_ONLY
      .mockReturnValueOnce({
        from: () => ({
          innerJoin: () => ({
            leftJoin: () => ({
              where: () => ({
                orderBy: () => Promise.resolve([{ ...baseServiceRow, musicListFieldSet: "HYMNS_ONLY" }]),
              }),
            }),
          }),
        }),
      })
      // Query 3: music slots
      .mockReturnValueOnce({
        from: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
              leftJoin: () => ({
                leftJoin: () => ({
                  leftJoin: () => ({
                    where: () => ({
                      orderBy: () => Promise.resolve([]),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

    const result = await buildMusicListData("c1", "2026-05-01", "2026-05-31");
    expect(result).not.toBeNull();
    const svc = result!.months[0].services[0];
    expect(svc.musicListFieldSet).toBe("HYMNS_ONLY");
  });
});
