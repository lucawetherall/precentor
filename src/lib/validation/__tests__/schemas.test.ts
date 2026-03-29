import { describe, it, expect } from "vitest";
import {
  serviceUpdateSchema,
  memberInviteSchema,
  churchUpdateSchema,
  uuidSchema,
  emailSchema,
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
});
