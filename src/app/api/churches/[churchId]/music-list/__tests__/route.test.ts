import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: vi.fn(async () => Buffer.from("PDF")) }));
vi.mock("@/lib/pdf/music-list/music-list-document", () => ({ MusicListDocument: () => null }));
vi.mock("@/lib/pdf/music-list/build-music-list-data", () => ({ buildMusicListData: vi.fn() }));

import { GET } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { buildMusicListData } from "@/lib/pdf/music-list/build-music-list-data";

const ctx = { params: Promise.resolve({ churchId: "c1" }) };
const url = (qs: string) => new NextRequest(`http://x/api/churches/c1/music-list?${qs}`);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  vi.mocked(buildMusicListData).mockResolvedValue({ months: [{ name: "January" }] } as never);
});

describe("GET /api/churches/[churchId]/music-list", () => {
  it("returns 403 for non-editors", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await GET(url("from=2026-01-01&to=2026-02-01"), ctx)).status).toBe(403);
  });

  it("returns 400 when from/to are missing or malformed", async () => {
    expect((await GET(url("from=2026-01-01"), ctx)).status).toBe(400);
    expect((await GET(url("from=nope&to=2026-02-01"), ctx)).status).toBe(400);
  });

  it("returns 400 for an impossible calendar date", async () => {
    expect((await GET(url("from=2026-13-45&to=2026-02-01"), ctx)).status).toBe(400);
  });

  it("returns 400 when from is after to", async () => {
    expect((await GET(url("from=2026-03-01&to=2026-02-01"), ctx)).status).toBe(400);
  });

  it("returns 400 when the range exceeds 366 days", async () => {
    expect((await GET(url("from=2026-01-01&to=2027-06-01"), ctx)).status).toBe(400);
  });

  it("returns 400 for an unsupported format", async () => {
    expect((await GET(url("from=2026-01-01&to=2026-02-01&format=csv"), ctx)).status).toBe(400);
  });

  it("returns 404 when the church is not found", async () => {
    vi.mocked(buildMusicListData).mockResolvedValue(null as never);
    expect((await GET(url("from=2026-01-01&to=2026-02-01"), ctx)).status).toBe(404);
  });

  it("returns 404 when no services fall in the range", async () => {
    vi.mocked(buildMusicListData).mockResolvedValue({ months: [] } as never);
    expect((await GET(url("from=2026-01-01&to=2026-02-01"), ctx)).status).toBe(404);
  });

  it("streams a PDF on the happy path", async () => {
    const res = await GET(url("from=2026-01-01&to=2026-02-01"), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("music-list-2026-01-01-to-2026-02-01.pdf");
  });

  it("returns 500 when PDF generation throws", async () => {
    vi.mocked(buildMusicListData).mockRejectedValue(new Error("boom"));
    expect((await GET(url("from=2026-01-01&to=2026-02-01"), ctx)).status).toBe(500);
  });
});
