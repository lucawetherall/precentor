import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { select: vi.fn(), insert: vi.fn() } }));

import { GET, POST } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

function makeReq(body: unknown) {
  return new Request("http://x/api/churches/c1/presets", {
    method: "POST", body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/churches/[churchId]/presets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-members", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await GET(new Request("http://x/api/churches/c1/presets"), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(403);
  });

  it("returns empty array when no presets", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null });
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => Promise.resolve([]) }),
    } as unknown as ReturnType<typeof db.select>);
    const res = await GET(new Request("http://x/api/churches/c1/presets"), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("POST /api/churches/[churchId]/presets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await POST(makeReq({ name: "Test", serviceType: "SUNG_EUCHARIST", choirRequirement: "FULL_CHOIR", musicListFieldSet: "CHORAL" }), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid body", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null });
    const res = await POST(makeReq({ name: "" }), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(400);
  });

  it("creates preset and returns 201", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ user: { id: "u1" }, error: null });
    const created = { id: "p1", name: "Default Choral", churchId: "c1" };
    vi.mocked(db.insert).mockReturnValue({
      values: () => ({ returning: () => Promise.resolve([created]) }),
    } as unknown as ReturnType<typeof db.insert>);
    const res = await POST(makeReq({ name: "Default Choral", serviceType: "SUNG_EUCHARIST", choirRequirement: "FULL_CHOIR", musicListFieldSet: "CHORAL" }), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBe("p1");
  });
});
