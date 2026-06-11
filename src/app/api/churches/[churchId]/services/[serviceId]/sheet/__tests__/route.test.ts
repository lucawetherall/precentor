import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/db/schema", () => ({ services: { id: {}, churchId: {}, sheetMode: {} } }));
vi.mock("drizzle-orm", () => ({ and: vi.fn(), eq: vi.fn() }));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: vi.fn(async () => Buffer.from("PDF")) }));
vi.mock("@/lib/pdf/booklet-document", () => ({ BookletDocument: () => null }));
vi.mock("@/lib/pdf/summary-document", () => ({ SummaryDocument: () => null }));
vi.mock("@/lib/pdf/service-sheet-docx", () => ({ generateBookletDocx: vi.fn(async () => Buffer.from("DOCX")), generateSummaryDocx: vi.fn(async () => Buffer.from("DOCX")) }));
vi.mock("@/lib/pdf/service-sheet", () => ({ SERVICE_TYPE_DISPLAY: { SUNG_EUCHARIST: "Sung Eucharist" } }));
vi.mock("@/lib/pdf/build-sheet-data", () => ({
  buildBookletData: vi.fn(),
  buildSummaryData: vi.fn(),
  resolveSheetMode: vi.fn((mode, override) => override || "summary"),
}));

const { state } = vi.hoisted(() => ({ state: { service: [] as unknown[] } }));
vi.mock("@/lib/db", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where"]) chain[m] = () => chain;
  chain.limit = () => Promise.resolve(state.service);
  return { db: { select: () => chain } };
});

import { GET } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { buildSummaryData, buildBookletData } from "@/lib/pdf/build-sheet-data";

const ctx = { params: Promise.resolve({ churchId: "c1", serviceId: "s1" }) };
const url = (qs = "") => new NextRequest(`http://x/api/churches/c1/services/s1/sheet?${qs}`);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  state.service = [{ sheetMode: "SUMMARY" }];
  vi.mocked(buildSummaryData).mockResolvedValue({ serviceType: "SUNG_EUCHARIST", date: "2026-01-01" } as never);
  vi.mocked(buildBookletData).mockResolvedValue({ serviceType: "SUNG_EUCHARIST", date: "2026-01-01" } as never);
});

describe("GET /api/churches/[churchId]/services/[serviceId]/sheet", () => {
  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await GET(url(), ctx)).status).toBe(403);
  });

  it("returns 404 when the service record is missing", async () => {
    state.service = [];
    expect((await GET(url(), ctx)).status).toBe(404);
  });

  it("returns JSON data for the preview format", async () => {
    const res = await GET(url("format=json"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ serviceType: "SUNG_EUCHARIST" });
  });

  it("streams a summary PDF by default", async () => {
    const res = await GET(url(), ctx);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("sung-eucharist-2026-01-01.pdf");
  });

  it("streams a summary DOCX when requested", async () => {
    const res = await GET(url("format=docx"), ctx);
    expect(res.headers.get("Content-Type")).toContain("wordprocessingml");
  });

  it("returns 404 when the sheet data cannot be built", async () => {
    vi.mocked(buildSummaryData).mockResolvedValue(null as never);
    expect((await GET(url(), ctx)).status).toBe(404);
  });

  it("returns 500 when generation throws", async () => {
    vi.mocked(buildSummaryData).mockRejectedValue(new Error("boom"));
    expect((await GET(url(), ctx)).status).toBe(500);
  });
});
