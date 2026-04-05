import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "test-id" }));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: mockSend } };
  }),
}));

import { sendInvitation } from "../send";

describe("sendInvitation", () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it("sends email with the invite URL, not a login link", async () => {
    await sendInvitation(
      "singer@parish.org.uk",
      "St John's",
      "Rev Smith",
      "https://precentor.app/invite/abc123"
    );

    expect(mockSend).toHaveBeenCalledOnce();
    const call = mockSend.mock.calls[0][0];
    expect(call.to).toBe("singer@parish.org.uk");
    expect(call.subject).toContain("St John");
    expect(call.html).toContain("https://precentor.app/invite/abc123");
    expect(call.html).not.toContain("/login");
  });

  it("throws when inviteUrl uses a non-http scheme", async () => {
    await expect(
      sendInvitation("a@b.com", "X", "Y", "javascript:alert(1)")
    ).rejects.toThrow("inviteUrl must use http:// or https:// scheme");

    await expect(
      sendInvitation("a@b.com", "X", "Y", "data:text/html,<h1>hi</h1>")
    ).rejects.toThrow("inviteUrl must use http:// or https:// scheme");

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("escapes HTML in church name and inviter name", async () => {
    await sendInvitation(
      "test@test.com",
      '<script>alert("xss")</script>',
      '<img onerror="hack">',
      "https://precentor.app/invite/token123"
    );

    const call = mockSend.mock.calls[0][0];
    expect(call.html).not.toContain("<script>");
    expect(call.html).not.toContain("<img");
    expect(call.html).toContain("&lt;script&gt;");
  });
});
