import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/api/parse-body", () => ({ parseJsonBody: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: vi.fn(async () => Buffer.from("PDF")) }));
vi.mock("@/lib/pdf/booklet-document", () => ({ MultiBookletDocument: () => null }));
vi.mock("@/lib/pdf/summary-document", () => ({ MultiSummaryDocument: () => null }));
vi.mock("@/lib/pdf/build-sheet-data", () => ({ buildBookletData: vi.fn(), buildSummaryData: vi.fn() }));
vi.mock("@/lib/pdf/service-sheet-docx", () => ({ generateMultiBookletDocx: vi.fn(async () => Buffer.from("DOCX")), generateMultiSummaryDocx: vi.fn(async () => Buffer.from("DOCX")) }));

import { POST } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { parseJsonBody } from "@/lib/api/parse-body";
import { buildBookletData, buildSummaryData } from "@/lib/pdf/build-sheet-data";
import { generateMultiSummaryDocx } from "@/lib/pdf/service-sheet-docx";

const ctx = { params: Promise.resolve({ churchId: "c1" }) };
function post(body: Record<string, unknown>) {
  vi.mocked(parseJsonBody).mockResolvedValue({
    data: { serviceIds: ["s1"], format: "pdf", size: "A4", mode: "summary", ...body },
    error: null,
  } as never);
  return new NextRequest("http://x/api/churches/c1/sheets", { method: "POST" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireChurchRole).mockResolvedValue({ error: null } as never);
  vi.mocked(buildSummaryData).mockResolvedValue({ date: "2026-01-01" } as never);
  vi.mocked(buildBookletData).mockResolvedValue({ date: "2026-01-01" } as never);
});

describe("POST /api/churches/[churchId]/sheets", () => {
  it("returns 403 for non-admins", async () => {
    vi.mocked(requireChurchRole).mockResolvedValue({ error: new Response("no", { status: 403 }) } as never);
    expect((await POST(post({}), ctx)).status).toBe(403);
  });

  it("propagates a body validation error", async () => {
    vi.mocked(parseJsonBody).mockResolvedValue({ data: null, error: new Response("bad", { status: 400 }) } as never);
    expect((await POST(new NextRequest("http://x", { method: "POST" }), ctx)).status).toBe(400);
  });

  it("returns 404 when no services resolve in summary mode", async () => {
    vi.mocked(buildSummaryData).mockResolvedValue(null as never);
    expect((await POST(post({ mode: "summary" }), ctx)).status).toBe(404);
  });

  it("streams a summary PDF", async () => {
    const res = await POST(post({ mode: "summary", format: "pdf" }), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("streams a summary DOCX", async () => {
    const res = await POST(post({ mode: "summary", format: "docx" }), ctx);
    expect(res.headers.get("Content-Type")).toContain("wordprocessingml");
    expect(generateMultiSummaryDocx).toHaveBeenCalled();
  });

  it("streams a booklet PDF", async () => {
    const res = await POST(post({ mode: "booklet", format: "pdf" }), ctx);
    expect(res.status).toBe(200);
    expect(buildBookletData).toHaveBeenCalled();
  });

  it("returns 500 when generation throws", async () => {
    vi.mocked(buildSummaryData).mockRejectedValue(new Error("boom"));
    expect((await POST(post({ mode: "summary" }), ctx)).status).toBe(500);
  });
});
