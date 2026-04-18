import { describe, it, expect } from "vitest";
import {
  serviceUpdateSchema,
  memberInviteSchema,
  churchUpdateSchema,
  uuidSchema,
  emailSchema,
  httpsUrlSchema,
  sheetMusicLinkSchema,
} from "../schemas";

describe("uuidSchema", () => {
  it("accepts valid UUID", () => {
    expect(uuidSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
  });

  it("rejects non-UUID string", () => {
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(uuidSchema.safeParse("").success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("accepts valid email", () => {
    expect(emailSchema.safeParse("user@example.com").success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});

describe("serviceUpdateSchema", () => {
  it("accepts valid partial update", () => {
    const result = serviceUpdateSchema.safeParse({ status: "PUBLISHED" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no fields to update)", () => {
    const result = serviceUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid service type", () => {
    const result = serviceUpdateSchema.safeParse({ serviceType: "INVALID_TYPE" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = serviceUpdateSchema.safeParse({ status: "UNKNOWN" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid choir status", () => {
    const result = serviceUpdateSchema.safeParse({ choirStatus: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("accepts null for nullable fields", () => {
    const result = serviceUpdateSchema.safeParse({
      eucharisticPrayer: null,
      eucharisticPrayerId: null,
      collectId: null,
      collectOverride: null,
      notes: null,
      time: null,
      defaultMassSettingId: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown fields (strict mode)", () => {
    const result = serviceUpdateSchema.safeParse({ unknownField: "value" });
    expect(result.success).toBe(false);
  });

  it("accepts valid UUID for eucharisticPrayerId", () => {
    const result = serviceUpdateSchema.safeParse({
      eucharisticPrayerId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID string for eucharisticPrayerId", () => {
    const result = serviceUpdateSchema.safeParse({
      eucharisticPrayerId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts liturgicalOverrides as record of strings", () => {
    const result = serviceUpdateSchema.safeParse({
      liturgicalOverrides: { "section-1": "Override text" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid service types", () => {
    const types = [
      "SUNG_EUCHARIST", "CHORAL_EVENSONG", "SAID_EUCHARIST",
      "CHORAL_MATINS", "FAMILY_SERVICE", "COMPLINE", "CUSTOM",
    ];
    for (const t of types) {
      const result = serviceUpdateSchema.safeParse({ serviceType: t });
      expect(result.success).toBe(true);
    }
  });
});

describe("memberInviteSchema", () => {
  it("accepts valid invite with all fields", () => {
    const result = memberInviteSchema.safeParse({
      email: "user@example.com",
      role: "EDITOR",
      sendEmail: true,
    });
    expect(result.success).toBe(true);
  });

  it("defaults role to MEMBER when omitted", () => {
    const result = memberInviteSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("MEMBER");
    }
  });

  it("defaults sendEmail to true when omitted", () => {
    const result = memberInviteSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sendEmail).toBe(true);
    }
  });

  it("rejects missing email", () => {
    const result = memberInviteSchema.safeParse({ role: "MEMBER" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = memberInviteSchema.safeParse({ email: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = memberInviteSchema.safeParse({ email: "user@example.com", role: "SUPERADMIN" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid roles", () => {
    for (const role of ["ADMIN", "EDITOR", "MEMBER"]) {
      const result = memberInviteSchema.safeParse({ email: "user@example.com", role });
      expect(result.success).toBe(true);
    }
  });
});

describe("churchUpdateSchema", () => {
  it("accepts valid partial update", () => {
    const result = churchUpdateSchema.safeParse({ name: "St Paul's" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = churchUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects name that is too long (>200 chars)", () => {
    const result = churchUpdateSchema.safeParse({ name: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = churchUpdateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts null for nullable fields", () => {
    const result = churchUpdateSchema.safeParse({
      address: null,
      diocese: null,
      ccliNumber: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown fields (strict mode)", () => {
    const result = churchUpdateSchema.safeParse({ unknownField: "value" });
    expect(result.success).toBe(false);
  });

  it("rejects address > 500 chars", () => {
    const result = churchUpdateSchema.safeParse({ address: "x".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("rejects ccliNumber > 50 chars", () => {
    const result = churchUpdateSchema.safeParse({ ccliNumber: "x".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("accepts a valid sheetMusicLink", () => {
    const result = churchUpdateSchema.safeParse({
      sheetMusicLink: { url: "https://example.com/folder", label: "Choir library" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts null sheetMusicLink (to clear it)", () => {
    const result = churchUpdateSchema.safeParse({ sheetMusicLink: null });
    expect(result.success).toBe(true);
  });

  it("rejects sheetMusicLink with non-https URL", () => {
    const result = churchUpdateSchema.safeParse({
      sheetMusicLink: { url: "http://example.com" },
    });
    expect(result.success).toBe(false);
  });
});

describe("httpsUrlSchema", () => {
  it("accepts an ordinary https URL", () => {
    expect(httpsUrlSchema.safeParse("https://example.com/folder").success).toBe(true);
  });

  it("accepts a Dropbox-shaped URL", () => {
    expect(
      httpsUrlSchema.safeParse("https://www.dropbox.com/scl/fo/abc123/h?rlkey=xyz&dl=0").success,
    ).toBe(true);
  });

  it("rejects http://", () => {
    expect(httpsUrlSchema.safeParse("http://example.com").success).toBe(false);
  });

  it("rejects javascript: URLs", () => {
    expect(httpsUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });

  it("rejects data: URLs", () => {
    expect(
      httpsUrlSchema.safeParse("data:text/html,<script>alert(1)</script>").success,
    ).toBe(false);
  });

  it("rejects file:// URLs", () => {
    expect(httpsUrlSchema.safeParse("file:///etc/passwd").success).toBe(false);
  });

  it("rejects mailto: URLs", () => {
    expect(httpsUrlSchema.safeParse("mailto:user@example.com").success).toBe(false);
  });

  it("rejects garbage", () => {
    expect(httpsUrlSchema.safeParse("not a url").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(httpsUrlSchema.safeParse("").success).toBe(false);
  });

  it("rejects URL longer than 2048 chars", () => {
    const long = "https://example.com/" + "x".repeat(2048);
    expect(httpsUrlSchema.safeParse(long).success).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    const result = httpsUrlSchema.safeParse("  https://example.com  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("https://example.com");
    }
  });
});

describe("sheetMusicLinkSchema", () => {
  it("accepts url only", () => {
    const result = sheetMusicLinkSchema.safeParse({ url: "https://example.com" });
    expect(result.success).toBe(true);
  });

  it("accepts url + label", () => {
    const result = sheetMusicLinkSchema.safeParse({
      url: "https://example.com",
      label: "Dropbox folder",
    });
    expect(result.success).toBe(true);
  });

  it("rejects label > 60 chars", () => {
    const result = sheetMusicLinkSchema.safeParse({
      url: "https://example.com",
      label: "x".repeat(61),
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    const result = sheetMusicLinkSchema.safeParse({
      url: "https://example.com",
      extra: "nope",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing url", () => {
    const result = sheetMusicLinkSchema.safeParse({ label: "Choir library" });
    expect(result.success).toBe(false);
  });
});
