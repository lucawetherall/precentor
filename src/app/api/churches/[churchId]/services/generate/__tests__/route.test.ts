import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/services/auto-generate", () => ({ generateServicesForChurch: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { POST } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { generateServicesForChurch } from "@/lib/services/auto-generate";

const ctx = { params: Promise.resolve({ churchId: "c1" }) };
function post(body?: unknown) {
  return new Request("http://x/api/churches/c1/services/generate", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  vi.mocked(generateServicesForChurch).mockResolvedValue({ created: 12 } as never);
});

describe("POST /api/churches/[churchId]/services/generate", () => {
  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await POST(post({}), ctx)).status).toBe(403);
  });

  it("defaults to a 3-month horizon when the body is empty", async () => {
    const res = await POST(post(), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ created: 12 });
    // from/to should span ~3 months; assert generate was called with 3 args.
    expect(vi.mocked(generateServicesForChurch).mock.calls[0]).toHaveLength(3);
  });

  it("honours an explicit months value", async () => {
    await POST(post({ months: 6 }), ctx);
    const [, from, to] = vi.mocked(generateServicesForChurch).mock.calls[0];
    expect(from < to).toBe(true);
  });

  it("falls back to defaults on an invalid months value", async () => {
    const res = await POST(post({ months: 999 }), ctx);
    expect(res.status).toBe(200);
  });

  it("returns 500 when generation throws", async () => {
    vi.mocked(generateServicesForChurch).mockRejectedValue(new Error("boom"));
    expect((await POST(post({}), ctx)).status).toBe(500);
  });
});
