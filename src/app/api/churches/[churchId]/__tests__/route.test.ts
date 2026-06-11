import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/validation/schemas", () => ({ churchUpdateSchema: {} }));
vi.mock("@/lib/db/schema", () => ({ churches: { id: {}, settings: {} } }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
vi.mock("@/lib/churches/settings", () => ({
  writeSheetMusicLink: vi.fn((s, v) => ({ ...s, sheetMusicLink: v })),
  writeLectionaryTrack: vi.fn((s, v) => ({ ...s, lectionaryTrack: v })),
}));

const { dbState } = vi.hoisted(() => ({ dbState: { selectRows: [] as unknown[], updated: [] as unknown[], throwUpdate: false } }));
vi.mock("@/lib/db", () => {
  const selectChain: Record<string, unknown> = {};
  for (const m of ["from", "where"]) selectChain[m] = () => selectChain;
  selectChain.limit = () => Promise.resolve(dbState.selectRows);
  const updateChain: Record<string, unknown> = {};
  updateChain.set = () => updateChain;
  updateChain.where = () => updateChain;
  updateChain.returning = () => (dbState.throwUpdate ? Promise.reject(new Error("db down")) : Promise.resolve(dbState.updated));
  return { db: { select: () => selectChain, update: () => updateChain } };
});

import { PATCH } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { parseJsonBody } from "@/lib/api/parse-body";
import { writeSheetMusicLink } from "@/lib/churches/settings";

const ctx = { params: Promise.resolve({ churchId: "c1" }) };
function patch(fields: Record<string, unknown>) {
  vi.mocked(parseJsonBody).mockResolvedValue({ data: fields, error: null } as never);
  return new Request("http://x", { method: "PATCH" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  dbState.selectRows = [{ settings: {} }];
  dbState.updated = [{ id: "c1", name: "Updated" }];
  dbState.throwUpdate = false;
});

describe("PATCH /api/churches/[churchId]", () => {
  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await PATCH(patch({ name: "X" }), ctx)).status).toBe(403);
  });

  it("propagates a body validation error", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: null, error: new Response("bad", { status: 400 }) } as never);
    expect((await PATCH(new Request("http://x", { method: "PATCH" }), ctx)).status).toBe(400);
  });

  it("updates plain fields and returns the row", async () => {
    const res = await PATCH(patch({ name: "Updated", diocese: "" }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "c1", name: "Updated" });
    // No settings field touched, so the settings writer is not invoked.
    expect(writeSheetMusicLink).not.toHaveBeenCalled();
  });

  it("merges settings-backed fields without clobbering the blob", async () => {
    dbState.selectRows = [{ settings: { existing: "keep" } }];
    await PATCH(patch({ sheetMusicLink: "https://drive/x" }), ctx);
    expect(writeSheetMusicLink).toHaveBeenCalledWith({ existing: "keep" }, "https://drive/x");
  });

  it("returns 500 when the update throws", async () => {
    dbState.throwUpdate = true;
    expect((await PATCH(patch({ name: "X" }), ctx)).status).toBe(500);
  });
});
