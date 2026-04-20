import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendInvitation = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/email/send", () => ({
  sendInvitation: mockSendInvitation,
}));

vi.mock("@/lib/auth/permissions", () => ({
  requireChurchRole: vi.fn().mockResolvedValue({
    user: { id: "user-1", name: "Rev Smith" },
    membership: { role: "ADMIN" },
    error: null,
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockReturnValue(null),
}));

const mockInsertReturning = vi.fn().mockResolvedValue([{
  id: "invite-1",
  token: "mock-token",
}]);

const mockSelectLimit = vi.fn().mockResolvedValue([{ name: "St John's" }]);

const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: mockInsertReturning,
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: mockSelectLimit,
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: mockUpdateWhere,
      }),
    }),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  invites: { churchId: {}, email: {}, role: {}, token: {}, invitedBy: {}, expiresAt: {} },
  churches: { id: {}, name: {} },
}));

vi.mock("@/lib/validation/schemas", () => ({
  memberInviteSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { email: "singer@parish.org.uk", role: "MEMBER", sendEmail: true },
    }),
  },
}));

vi.mock("@/lib/api-helpers", () => ({
  apiError: vi.fn(),
}));

describe("POST /api/churches/[churchId]/members", () => {
  beforeEach(() => {
    mockSendInvitation.mockClear();
    process.env.NEXT_PUBLIC_APP_URL = "https://precentor.app";
  });

  it("calls sendInvitation with church name and invite URL", async () => {
    const { POST } = await import("../route");

    const request = new Request("http://localhost/api/churches/church-1/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "singer@parish.org.uk", role: "MEMBER", sendEmail: true }),
    });

    const response = await POST(request, { params: Promise.resolve({ churchId: "church-1" }) });
    expect(response.status).toBe(201);

    expect(mockSendInvitation).toHaveBeenCalledOnce();
    const [to, churchName, inviterName, inviteUrl] = mockSendInvitation.mock.calls[0];
    expect(to).toBe("singer@parish.org.uk");
    expect(churchName).toBe("St John's");
    expect(inviterName).toBe("Rev Smith");
    expect(inviteUrl).toContain("/invite/");
  });
});
