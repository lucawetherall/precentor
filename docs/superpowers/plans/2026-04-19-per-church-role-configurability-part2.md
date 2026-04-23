# Per-Church Role Configurability — Implementation Plan (Part 2 of 3)

> Continues from `2026-04-19-per-church-role-configurability.md` (Milestone 1). Conventions identical.

Covers **Milestones 2, 3, 4**.

---

## Milestone 2 — Catalog + member roles backend (read/write APIs)

**Outcome:** role catalog is queryable via API; admins can assign/revoke multi-role memberships. Old `voicePart` column is untouched. Fully testable without any UI changes.

### Task 2.0: Extend `ErrorCodes` with new codes

**Files:**
- Modify: `src/lib/api-helpers.ts`

- [ ] **Step 1: Extend the `ErrorCodes` object**

Replace the existing `ErrorCodes` constant with:

```ts
export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INVALID_INPUT: "INVALID_INPUT",
  RATE_LIMITED: "RATE_LIMITED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  INTERNAL: "INTERNAL",
  UPSTREAM: "UPSTREAM",
  // Role-slots model error codes:
  ROLE_NOT_ROTA_ELIGIBLE: "ROLE_NOT_ROTA_ELIGIBLE",
  VOICE_PART_CANNOT_BE_EXCLUSIVE: "VOICE_PART_CANNOT_BE_EXCLUSIVE",
  USER_LACKS_ROLE: "USER_LACKS_ROLE",
  SLOT_NOT_ON_SERVICE: "SLOT_NOT_ON_SERVICE",
  SLOT_ALREADY_FILLED: "SLOT_ALREADY_FILLED",
  SLOT_AT_CAPACITY: "SLOT_AT_CAPACITY",
  NO_ELIGIBLE_ROLE: "NO_ELIGIBLE_ROLE",
  DUAL_ROLE: "DUAL_ROLE",
  INVALID_SLOT_CARDINALITY: "INVALID_SLOT_CARDINALITY",
  // Migration codes used in audit log + banners:
  MEMBER_NO_VOICE_PART: "MEMBER_NO_VOICE_PART",
  PRESET_TIME_AMBIGUOUS: "PRESET_TIME_AMBIGUOUS",
  ROTA_ENTRY_UNCLASSIFIED: "ROTA_ENTRY_UNCLASSIFIED",
} as const;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS — existing usages still resolve because the enum only grew.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api-helpers.ts
git commit -m "feat(api): extend ErrorCodes with role-slots + migration codes"
```

**NOTE:** Subsequent tasks in this plan reference these codes by `ErrorCodes.XXX`. Earlier drafts used `code: "XXX" as never` — after this task, replace every `as never` with the proper `ErrorCodes.XXX` reference. The agent executing later tasks should use `ErrorCodes.ROLE_NOT_ROTA_ELIGIBLE` (etc.) not inline string literals.

### Task 2.1: Zod schemas for role assignment

**Files:**
- Modify: `src/lib/validation/schemas.ts`

- [ ] **Step 1: Append to the file**

```ts
export const memberRoleAssignmentSchema = z.object({
  catalogRoleId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
}).strict();

export const memberRoleUpdateSchema = z.object({
  isPrimary: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
}).strict();
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validation/schemas.ts
git commit -m "feat(validation): add member role assignment schemas"
```

### Task 2.2: GET /api/role-catalog endpoint

**Files:**
- Create: `src/app/api/role-catalog/route.ts`
- Create: `src/app/api/role-catalog/__tests__/route.test.ts`

- [ ] **Step 1: Write failing test**

`src/app/api/role-catalog/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({
  requireAuth: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}));

import { GET } from "../route";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

describe("GET /api/role-catalog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    (requireAuth as any).mockResolvedValue({
      user: null,
      error: new Response("Unauthorized", { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the catalog ordered by displayOrder when authenticated", async () => {
    (requireAuth as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    const mockRows = [
      { id: "r1", key: "SOPRANO", defaultName: "Soprano", category: "VOICE", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 1, defaultMaxCount: null, displayOrder: 100, createdAt: new Date() },
    ];
    (db.select as any).mockReturnValue({
      from: () => ({ orderBy: () => Promise.resolve(mockRows) }),
    });
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual(mockRows);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npm test -- src/app/api/role-catalog`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/app/api/role-catalog/route.ts`:

```ts
import { requireAuth } from "@/lib/auth/permissions";
import { apiSuccess } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { roleCatalog } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  const rows = await db.select().from(roleCatalog).orderBy(asc(roleCatalog.displayOrder));
  return apiSuccess(rows);
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npm test -- src/app/api/role-catalog`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/role-catalog
git commit -m "feat(api): GET /api/role-catalog returns seeded catalog"
```

### Task 2.3: GET /api/churches/[churchId]/roles endpoint (with member counts)

**Files:**
- Create: `src/app/api/churches/[churchId]/roles/route.ts`
- Create: `src/app/api/churches/[churchId]/roles/__tests__/route.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({
  requireChurchRole: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: { select: vi.fn() },
}));

import { GET } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

describe("GET /api/churches/[churchId]/roles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when not a member", async () => {
    (requireChurchRole as any).mockResolvedValue({
      error: new Response("Forbidden", { status: 403 }),
    });
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1" }) });
    expect(res.status).toBe(403);
  });

  it("returns catalog with memberCount joined per role", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    const mockRows = [
      { id: "r1", key: "SOPRANO", defaultName: "Soprano", category: "VOICE", rotaEligible: true, institutional: false, defaultExclusive: false, defaultMinCount: 1, defaultMaxCount: null, displayOrder: 100, memberCount: 3 },
    ];
    (db.select as any).mockReturnValue({
      from: () => ({ leftJoin: () => ({ groupBy: () => ({ orderBy: () => Promise.resolve(mockRows) }) }) }),
    });
    const res = await GET(new Request("http://x"), { params: Promise.resolve({ churchId: "c1" }) });
    const json = await res.json();
    expect(json[0].memberCount).toBe(3);
  });
});
```

- [ ] **Step 2: Run, verify it fails, implement**

`src/app/api/churches/[churchId]/roles/route.ts`:

```ts
import { requireChurchRole } from "@/lib/auth/permissions";
import { apiSuccess } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { roleCatalog, churchMemberRoles } from "@/lib/db/schema";
import { asc, eq, and, sql } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  const rows = await db
    .select({
      id: roleCatalog.id,
      key: roleCatalog.key,
      defaultName: roleCatalog.defaultName,
      category: roleCatalog.category,
      rotaEligible: roleCatalog.rotaEligible,
      institutional: roleCatalog.institutional,
      defaultExclusive: roleCatalog.defaultExclusive,
      defaultMinCount: roleCatalog.defaultMinCount,
      defaultMaxCount: roleCatalog.defaultMaxCount,
      displayOrder: roleCatalog.displayOrder,
      memberCount: sql<number>`count(${churchMemberRoles.id})::int`,
    })
    .from(roleCatalog)
    .leftJoin(
      churchMemberRoles,
      and(
        eq(churchMemberRoles.catalogRoleId, roleCatalog.id),
        eq(churchMemberRoles.churchId, churchId),
      ),
    )
    .groupBy(roleCatalog.id)
    .orderBy(asc(roleCatalog.displayOrder));

  return apiSuccess(rows);
}
```

- [ ] **Step 3: Run test — PASS. Commit.**

```bash
git add src/app/api/churches/[churchId]/roles
git commit -m "feat(api): GET /api/churches/[churchId]/roles with member counts"
```

### Task 2.4: POST /api/churches/[churchId]/members/[memberId]/roles (assign role)

**Files:**
- Create: `src/app/api/churches/[churchId]/members/[memberId]/roles/route.ts`
- Create: `src/app/api/churches/[churchId]/members/[memberId]/roles/__tests__/route.test.ts`

- [ ] **Step 1: Failing test (covers three cases: 403 non-admin, 400 invalid body, 201 success with atomic primary-flip)**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({
  requireChurchRole: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    transaction: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

import { POST } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

function makeReq(body: unknown) {
  return new Request("http://x", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
}

describe("POST /api/churches/[churchId]/members/[memberId]/roles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when caller is not ADMIN", async () => {
    (requireChurchRole as any).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await POST(makeReq({ catalogRoleId: "00000000-0000-0000-0000-000000000001" }), {
      params: Promise.resolve({ churchId: "c1", memberId: "m1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid body", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    const res = await POST(makeReq({ catalogRoleId: "not-a-uuid" }), {
      params: Promise.resolve({ churchId: "c1", memberId: "m1" }),
    });
    expect(res.status).toBe(400);
  });

  it("inserts the assignment and returns 201 with id", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    const inserted = { id: "new-id", userId: "m1", churchId: "c1", catalogRoleId: "00000000-0000-0000-0000-000000000001", isPrimary: false, displayOrder: 0 };
    (db.transaction as any).mockImplementation(async (fn: any) => fn({
      select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ userId: "m1" }]) }) }) }),
      update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
      insert: () => ({ values: () => ({ onConflictDoNothing: () => ({ returning: () => Promise.resolve([inserted]) }) }) }),
    }));
    const res = await POST(makeReq({ catalogRoleId: "00000000-0000-0000-0000-000000000001", isPrimary: true }), {
      params: Promise.resolve({ churchId: "c1", memberId: "m1" }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("new-id");
  });
});
```

- [ ] **Step 2: Run test — verify it fails.**

- [ ] **Step 3: Implement**

`src/app/api/churches/[churchId]/members/[memberId]/roles/route.ts`:

```ts
import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { churchMemberRoles, churchMemberships } from "@/lib/db/schema";
import { memberRoleAssignmentSchema } from "@/lib/validation/schemas";
import { and, eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string; memberId: string }> },
) {
  const { churchId, memberId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON", 400, { code: ErrorCodes.INVALID_INPUT });
  }
  const parsed = memberRoleAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: ErrorCodes.INVALID_INPUT, details: parsed.error.issues });
  }
  const { catalogRoleId, isPrimary } = parsed.data;

  const inserted = await db.transaction(async (tx) => {
    const membership = await tx
      .select({ userId: churchMemberships.userId })
      .from(churchMemberships)
      .where(and(eq(churchMemberships.userId, memberId), eq(churchMemberships.churchId, churchId)))
      .limit(1);
    if (membership.length === 0) return null;
    if (isPrimary) {
      await tx
        .update(churchMemberRoles)
        .set({ isPrimary: false })
        .where(and(eq(churchMemberRoles.userId, memberId), eq(churchMemberRoles.churchId, churchId)));
    }
    const rows = await tx
      .insert(churchMemberRoles)
      .values({ userId: memberId, churchId, catalogRoleId, isPrimary: !!isPrimary })
      .onConflictDoNothing()
      .returning();
    return rows[0] ?? null;
  });

  if (inserted === null) {
    return apiError("Member not in church or role already assigned", 404, { code: ErrorCodes.NOT_FOUND });
  }
  return apiSuccess(inserted, 201);
}
```

- [ ] **Step 4: Run — PASS. Commit.**

```bash
git add src/app/api/churches/[churchId]/members/[memberId]/roles
git commit -m "feat(api): POST member role assignment with atomic primary flip"
```

### Task 2.5: DELETE /api/churches/[churchId]/members/[memberId]/roles/[id]

**Files:**
- Create: `src/app/api/churches/[churchId]/members/[memberId]/roles/[id]/route.ts`
- Create: `src/app/api/churches/[churchId]/members/[memberId]/roles/[id]/__tests__/route.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/permissions", () => ({ requireChurchRole: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { delete: vi.fn() } }));

import { DELETE } from "../route";
import { requireChurchRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

describe("DELETE /api/churches/[churchId]/members/[memberId]/roles/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when non-admin", async () => {
    (requireChurchRole as any).mockResolvedValue({ error: new Response("Forbidden", { status: 403 }) });
    const res = await DELETE(new Request("http://x"), {
      params: Promise.resolve({ churchId: "c1", memberId: "m1", id: "r1" }),
    });
    expect(res.status).toBe(403);
  });

  it("deletes and returns 200", async () => {
    (requireChurchRole as any).mockResolvedValue({ user: { id: "u1" }, error: null });
    (db.delete as any).mockReturnValue({
      where: () => ({ returning: () => Promise.resolve([{ id: "r1" }]) }),
    });
    const res = await DELETE(new Request("http://x"), {
      params: Promise.resolve({ churchId: "c1", memberId: "m1", id: "r1" }),
    });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Implement**

`src/app/api/churches/[churchId]/members/[memberId]/roles/[id]/route.ts`:

```ts
import { requireChurchRole } from "@/lib/auth/permissions";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { churchMemberRoles } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; memberId: string; id: string }> },
) {
  const { churchId, memberId, id } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const deleted = await db
    .delete(churchMemberRoles)
    .where(
      and(
        eq(churchMemberRoles.id, id),
        eq(churchMemberRoles.userId, memberId),
        eq(churchMemberRoles.churchId, churchId),
      ),
    )
    .returning();

  if (deleted.length === 0) {
    return apiError("Role assignment not found", 404, { code: ErrorCodes.NOT_FOUND });
  }
  return apiSuccess({ deleted: true });
}
```

- [ ] **Step 3: Run — PASS. Commit.**

```bash
git add src/app/api/churches/[churchId]/members/[memberId]/roles/[id]
git commit -m "feat(api): DELETE member role assignment"
```

### Task 2.6: PATCH /api/churches/[churchId]/members/[memberId]/roles/[id] (update isPrimary/displayOrder)

**Files:**
- Modify: `src/app/api/churches/[churchId]/members/[memberId]/roles/[id]/route.ts`
- Modify: `src/app/api/churches/[churchId]/members/[memberId]/roles/[id]/__tests__/route.test.ts`

- [ ] **Step 1: Add failing test case**

Append to the existing test file:

```ts
describe("PATCH /api/churches/[churchId]/members/[memberId]/roles/[id]", () => {
  it("updates isPrimary atomically (clears other primaries)", async () => {
    // Similar mock pattern to POST test — assert transaction fires and returns updated row.
    // Keep shape terse; detailed shape matches POST.
  });
});
```

Flesh out with full mock (mirror the POST test pattern using `db.transaction`).

- [ ] **Step 2: Implement PATCH**

Append to `route.ts`:

```ts
import { memberRoleUpdateSchema } from "@/lib/validation/schemas";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; memberId: string; id: string }> },
) {
  const { churchId, memberId, id } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return apiError("Invalid JSON", 400, { code: ErrorCodes.INVALID_INPUT });
  }
  const parsed = memberRoleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: ErrorCodes.INVALID_INPUT, details: parsed.error.issues });
  }

  const updated = await db.transaction(async (tx) => {
    if (parsed.data.isPrimary === true) {
      await tx
        .update(churchMemberRoles)
        .set({ isPrimary: false })
        .where(and(eq(churchMemberRoles.userId, memberId), eq(churchMemberRoles.churchId, churchId)));
    }
    const rows = await tx
      .update(churchMemberRoles)
      .set(parsed.data)
      .where(and(eq(churchMemberRoles.id, id), eq(churchMemberRoles.userId, memberId), eq(churchMemberRoles.churchId, churchId)))
      .returning();
    return rows[0] ?? null;
  });

  if (!updated) return apiError("Role assignment not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess(updated);
}
```

- [ ] **Step 3: Run test — PASS. Commit.**

```bash
git add src/app/api/churches/[churchId]/members/[memberId]/roles/[id]
git commit -m "feat(api): PATCH member role assignment (isPrimary, displayOrder)"
```

### Milestone 2 exit criteria

- `npm test` green; no existing tests regressed.
- `npm run typecheck` clean.
- Manual smoke: `curl` against local dev server can list catalog, assign/revoke roles.

---

## Milestone 3 — Presets + service-role-slots backend

### Task 3.1: Zod schemas for preset + slot CRUD

**Files:**
- Modify: `src/lib/validation/schemas.ts`

- [ ] **Step 1: Append**

```ts
export const presetCreateSchema = z.object({
  name: z.string().min(1).max(200),
  serviceType: z.enum(["SUNG_EUCHARIST","CHORAL_EVENSONG","SAID_EUCHARIST","CHORAL_MATINS","FAMILY_SERVICE","COMPLINE","CUSTOM"]),
  defaultTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  choirRequirement: z.enum(["FULL_CHOIR","ORGANIST_ONLY","SAID"]),
  musicListFieldSet: z.enum(["CHORAL","HYMNS_ONLY","READINGS_ONLY"]),
  liturgicalTemplateId: z.string().uuid().nullable().optional(),
  liturgicalSeasonTags: z.array(z.enum([
    "ADVENT","CHRISTMAS","EPIPHANY","LENT","HOLY_WEEK","EASTER",
    "ASCENSION","PENTECOST","TRINITY","ORDINARY","KINGDOM",
  ])).optional(),
}).strict();

export const presetUpdateSchema = presetCreateSchema.partial().strict();

export const presetSlotCreateSchema = z.object({
  catalogRoleId: z.string().uuid(),
  minCount: z.number().int().min(0),
  maxCount: z.number().int().min(1).nullable().optional(),
  exclusive: z.boolean(),
  displayOrder: z.number().int().min(0),
}).strict().refine(
  (s) => !s.exclusive || (s.minCount <= 1 && (s.maxCount == null || s.maxCount === 1)),
  { message: "Exclusive slots must have minCount ≤ 1 and maxCount ≤ 1" },
).refine(
  (s) => s.maxCount == null || s.maxCount >= s.minCount,
  { message: "maxCount must be >= minCount" },
);

export const presetSlotUpdateSchema = z.object({
  minCount: z.number().int().min(0).optional(),
  maxCount: z.number().int().min(1).nullable().optional(),
  exclusive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
}).strict();
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validation/schemas.ts
git commit -m "feat(validation): preset + slot CRUD schemas"
```

### Task 3.2: GET/POST /api/churches/[churchId]/presets

**Files:**
- Create: `src/app/api/churches/[churchId]/presets/route.ts`
- Create: `src/app/api/churches/[churchId]/presets/__tests__/route.test.ts`

- [ ] **Step 1: Failing test** — mirrors the pattern of Task 2.4 (403, 400, 201 success). Cover:
  - GET returns empty array, then list of presets filtered by `?includeArchived=false` (default).
  - POST 403 non-admin, 400 invalid body, 201 success.
  - POST fails on duplicate `name` within church (409).

- [ ] **Step 2: Implement**

`src/app/api/churches/[churchId]/presets/route.ts`:

```ts
import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { churchServicePresets } from "@/lib/db/schema";
import { presetCreateSchema } from "@/lib/validation/schemas";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  const url = new URL(request.url);
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  const whereClause = includeArchived
    ? eq(churchServicePresets.churchId, churchId)
    : and(eq(churchServicePresets.churchId, churchId), isNull(churchServicePresets.archivedAt));
  const rows = await db.select().from(churchServicePresets).where(whereClause);
  return apiSuccess(rows);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string }> },
) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return apiError("Invalid JSON", 400, { code: ErrorCodes.INVALID_INPUT });
  }
  const parsed = presetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: ErrorCodes.INVALID_INPUT, details: parsed.error.issues });
  }

  try {
    const [created] = await db
      .insert(churchServicePresets)
      .values({ ...parsed.data, churchId })
      .returning();
    return apiSuccess(created, 201);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.toLowerCase().includes("unique")) {
      return apiError("Preset name already exists in this church", 409, { code: ErrorCodes.CONFLICT });
    }
    throw e;
  }
}
```

- [ ] **Step 3: Run, commit**

```bash
git add src/app/api/churches/[churchId]/presets
git commit -m "feat(api): GET/POST presets"
```

### Task 3.3: GET/PATCH/DELETE /api/churches/[churchId]/presets/[presetId] + archive endpoint

**Files:**
- Create: `src/app/api/churches/[churchId]/presets/[presetId]/route.ts`
- Create: `src/app/api/churches/[churchId]/presets/[presetId]/archive/route.ts`
- Create: `src/app/api/churches/[churchId]/presets/[presetId]/__tests__/route.test.ts`
- Create: `src/app/api/churches/[churchId]/presets/[presetId]/archive/__tests__/route.test.ts`

- [ ] **Step 1: Failing tests** for each endpoint covering:
  - GET 200 with slots joined; 404 when not found.
  - PATCH 200 with updated row; 400 on invalid body.
  - DELETE 409 when referenced by a service or pattern; 200 otherwise.
  - POST .../archive sets `archivedAt`; idempotent.

- [ ] **Step 2: Implement**

`src/app/api/churches/[churchId]/presets/[presetId]/route.ts`:

```ts
import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { churchServicePresets, presetRoleSlots, churchServicePatterns, services } from "@/lib/db/schema";
import { presetUpdateSchema } from "@/lib/validation/schemas";
import { and, eq, sql } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string }> },
) {
  const { churchId, presetId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  const [preset] = await db
    .select()
    .from(churchServicePresets)
    .where(and(eq(churchServicePresets.id, presetId), eq(churchServicePresets.churchId, churchId)))
    .limit(1);
  if (!preset) return apiError("Preset not found", 404, { code: ErrorCodes.NOT_FOUND });

  const slots = await db.select().from(presetRoleSlots).where(eq(presetRoleSlots.presetId, presetId));
  return apiSuccess({ ...preset, slots });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string }> },
) {
  const { churchId, presetId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return apiError("Invalid JSON", 400, { code: ErrorCodes.INVALID_INPUT });
  }
  const parsed = presetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: ErrorCodes.INVALID_INPUT, details: parsed.error.issues });
  }

  const [updated] = await db
    .update(churchServicePresets)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(churchServicePresets.id, presetId), eq(churchServicePresets.churchId, churchId)))
    .returning();
  if (!updated) return apiError("Preset not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string }> },
) {
  const { churchId, presetId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const [patternRef] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(churchServicePatterns)
    .where(eq(churchServicePatterns.presetId, presetId));
  const [serviceRef] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(services)
    .where(eq(services.presetId, presetId));
  if ((patternRef?.count ?? 0) > 0 || (serviceRef?.count ?? 0) > 0) {
    return apiError("Preset is referenced; archive instead", 409, { code: ErrorCodes.CONFLICT });
  }

  const deleted = await db
    .delete(churchServicePresets)
    .where(and(eq(churchServicePresets.id, presetId), eq(churchServicePresets.churchId, churchId)))
    .returning();
  if (deleted.length === 0) return apiError("Preset not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess({ deleted: true });
}
```

`src/app/api/churches/[churchId]/presets/[presetId]/archive/route.ts`:

```ts
import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { churchServicePresets } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string }> },
) {
  const { churchId, presetId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const [updated] = await db
    .update(churchServicePresets)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(churchServicePresets.id, presetId), eq(churchServicePresets.churchId, churchId)))
    .returning();
  if (!updated) return apiError("Preset not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess(updated);
}
```

- [ ] **Step 3: Run, commit**

```bash
git add src/app/api/churches/[churchId]/presets/[presetId]
git commit -m "feat(api): preset detail CRUD + archive"
```

### Task 3.4: Preset slots endpoints (POST/PATCH/DELETE)

**Files:**
- Create: `src/app/api/churches/[churchId]/presets/[presetId]/slots/route.ts`
- Create: `src/app/api/churches/[churchId]/presets/[presetId]/slots/[slotId]/route.ts`
- Create: test files mirroring the endpoints

- [ ] **Step 1: Failing tests** — cover:
  - POST 201 on valid slot add.
  - POST 400 when catalog role has `rotaEligible=false` (`code: "ROLE_NOT_ROTA_ELIGIBLE"`).
  - POST 400 when voice-part role with `exclusive=true` (`code: "VOICE_PART_CANNOT_BE_EXCLUSIVE"`).
  - PATCH updates.
  - DELETE removes.

- [ ] **Step 2: Implement POST slot**

`src/app/api/churches/[churchId]/presets/[presetId]/slots/route.ts`:

```ts
import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { presetRoleSlots, roleCatalog, churchServicePresets } from "@/lib/db/schema";
import { presetSlotCreateSchema } from "@/lib/validation/schemas";
import { and, eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string }> },
) {
  const { churchId, presetId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return apiError("Invalid JSON", 400, { code: ErrorCodes.INVALID_INPUT });
  }
  const parsed = presetSlotCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: ErrorCodes.INVALID_INPUT, details: parsed.error.issues });
  }

  // Preset belongs to this church
  const [preset] = await db
    .select({ id: churchServicePresets.id })
    .from(churchServicePresets)
    .where(and(eq(churchServicePresets.id, presetId), eq(churchServicePresets.churchId, churchId)))
    .limit(1);
  if (!preset) return apiError("Preset not found", 404, { code: ErrorCodes.NOT_FOUND });

  // Role must be rota-eligible
  const [role] = await db
    .select({ rotaEligible: roleCatalog.rotaEligible, category: roleCatalog.category })
    .from(roleCatalog)
    .where(eq(roleCatalog.id, parsed.data.catalogRoleId))
    .limit(1);
  if (!role) return apiError("Catalog role not found", 404, { code: ErrorCodes.NOT_FOUND });
  if (!role.rotaEligible) {
    return apiError("Role is not rota-eligible", 400, { code: ErrorCodes.ROLE_NOT_ROTA_ELIGIBLE });
  }
  if (role.category === "VOICE" && parsed.data.exclusive) {
    return apiError("Voice-part slots cannot be exclusive", 400, { code: ErrorCodes.VOICE_PART_CANNOT_BE_EXCLUSIVE });
  }

  try {
    const [created] = await db
      .insert(presetRoleSlots)
      .values({ ...parsed.data, presetId })
      .returning();
    return apiSuccess(created, 201);
  } catch (e) {
    if (e instanceof Error && e.message.toLowerCase().includes("unique")) {
      return apiError("Slot already exists for this role", 409, { code: ErrorCodes.CONFLICT });
    }
    throw e;
  }
}
```

- [ ] **Step 3: Implement PATCH and DELETE**

`src/app/api/churches/[churchId]/presets/[presetId]/slots/[slotId]/route.ts`:

```ts
import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { presetRoleSlots, churchServicePresets } from "@/lib/db/schema";
import { presetSlotUpdateSchema } from "@/lib/validation/schemas";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string; slotId: string }> },
) {
  const { churchId, presetId, slotId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return apiError("Invalid JSON", 400, { code: ErrorCodes.INVALID_INPUT });
  }
  const parsed = presetSlotUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: ErrorCodes.INVALID_INPUT, details: parsed.error.issues });
  }

  // Confirm the slot belongs to a preset in this church
  const [slot] = await db
    .select({ id: presetRoleSlots.id })
    .from(presetRoleSlots)
    .innerJoin(churchServicePresets, eq(churchServicePresets.id, presetRoleSlots.presetId))
    .where(and(eq(presetRoleSlots.id, slotId), eq(churchServicePresets.churchId, churchId)))
    .limit(1);
  if (!slot) return apiError("Slot not found", 404, { code: ErrorCodes.NOT_FOUND });

  const [updated] = await db
    .update(presetRoleSlots)
    .set(parsed.data)
    .where(and(eq(presetRoleSlots.id, slotId), eq(presetRoleSlots.presetId, presetId)))
    .returning();
  return apiSuccess(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; presetId: string; slotId: string }> },
) {
  const { churchId, presetId, slotId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) return error;

  const deleted = await db
    .delete(presetRoleSlots)
    .where(and(eq(presetRoleSlots.id, slotId), eq(presetRoleSlots.presetId, presetId)))
    .returning();
  if (deleted.length === 0) return apiError("Slot not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess({ deleted: true });
}
```

- [ ] **Step 4: Run tests, commit**

```bash
git add src/app/api/churches/[churchId]/presets/[presetId]/slots
git commit -m "feat(api): preset slot CRUD with rota-eligibility checks"
```

### Task 3.5: Service role slots endpoints (GET + per-service override: POST/PATCH/DELETE + restore)

**Files:**
- Create: `src/app/api/churches/[churchId]/services/[serviceId]/slots/route.ts`
- Create: `src/app/api/churches/[churchId]/services/[serviceId]/slots/[slotId]/route.ts`
- Create: `src/app/api/churches/[churchId]/services/[serviceId]/slots/restore/route.ts`
- Create: tests for each

- [ ] **Step 1: Failing tests** cover:
  - GET returns `service_role_slots` for a given service.
  - POST (EDITOR) adds a new slot override.
  - DELETE moves existing rota entries for that slot to `quarantinedAt = now()`.
  - POST /restore: replaces `service_role_slots` with a fresh snapshot from the preset; keeps `quarantinedAt` rota entries.

- [ ] **Step 2: Implement GET/POST/PATCH/DELETE**

`src/app/api/churches/[churchId]/services/[serviceId]/slots/route.ts`:

```ts
import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { serviceRoleSlots, services, roleCatalog } from "@/lib/db/schema";
import { presetSlotCreateSchema } from "@/lib/validation/schemas";
import { and, eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> },
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "MEMBER");
  if (error) return error;

  const [svc] = await db.select({ id: services.id }).from(services)
    .where(and(eq(services.id, serviceId), eq(services.churchId, churchId))).limit(1);
  if (!svc) return apiError("Service not found", 404, { code: ErrorCodes.NOT_FOUND });

  const rows = await db.select().from(serviceRoleSlots).where(eq(serviceRoleSlots.serviceId, serviceId));
  return apiSuccess(rows);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> },
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return apiError("Invalid JSON", 400, { code: ErrorCodes.INVALID_INPUT });
  }
  const parsed = presetSlotCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: ErrorCodes.INVALID_INPUT, details: parsed.error.issues });
  }

  // Confirm service belongs to church and catalog role is rota-eligible
  const [svc] = await db.select({ id: services.id }).from(services)
    .where(and(eq(services.id, serviceId), eq(services.churchId, churchId))).limit(1);
  if (!svc) return apiError("Service not found", 404, { code: ErrorCodes.NOT_FOUND });
  const [role] = await db.select({ rotaEligible: roleCatalog.rotaEligible, category: roleCatalog.category })
    .from(roleCatalog).where(eq(roleCatalog.id, parsed.data.catalogRoleId)).limit(1);
  if (!role?.rotaEligible) {
    return apiError("Role is not rota-eligible", 400, { code: ErrorCodes.ROLE_NOT_ROTA_ELIGIBLE });
  }
  if (role.category === "VOICE" && parsed.data.exclusive) {
    return apiError("Voice-part slots cannot be exclusive", 400, { code: ErrorCodes.VOICE_PART_CANNOT_BE_EXCLUSIVE });
  }

  try {
    const [created] = await db.insert(serviceRoleSlots).values({ ...parsed.data, serviceId }).returning();
    return apiSuccess(created, 201);
  } catch (e) {
    if (e instanceof Error && e.message.toLowerCase().includes("unique")) {
      return apiError("Slot already exists for this service+role", 409, { code: ErrorCodes.CONFLICT });
    }
    throw e;
  }
}
```

`src/app/api/churches/[churchId]/services/[serviceId]/slots/[slotId]/route.ts`:

```ts
import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { serviceRoleSlots, services, rotaEntries } from "@/lib/db/schema";
import { presetSlotUpdateSchema } from "@/lib/validation/schemas";
import { and, eq, isNull } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string; slotId: string }> },
) {
  const { churchId, serviceId, slotId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return apiError("Invalid JSON", 400, { code: ErrorCodes.INVALID_INPUT });
  }
  const parsed = presetSlotUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid body", 400, { code: ErrorCodes.INVALID_INPUT, details: parsed.error.issues });
  }

  const [updated] = await db
    .update(serviceRoleSlots)
    .set(parsed.data)
    .where(and(eq(serviceRoleSlots.id, slotId), eq(serviceRoleSlots.serviceId, serviceId)))
    .returning();
  if (!updated) return apiError("Slot not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string; slotId: string }> },
) {
  const { churchId, serviceId, slotId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  await db.transaction(async (tx) => {
    const [slot] = await tx.select({ catalogRoleId: serviceRoleSlots.catalogRoleId })
      .from(serviceRoleSlots)
      .where(and(eq(serviceRoleSlots.id, slotId), eq(serviceRoleSlots.serviceId, serviceId)))
      .limit(1);
    if (!slot) return;
    await tx.update(rotaEntries)
      .set({ quarantinedAt: new Date() })
      .where(and(
        eq(rotaEntries.serviceId, serviceId),
        eq(rotaEntries.catalogRoleId, slot.catalogRoleId),
        isNull(rotaEntries.quarantinedAt),
      ));
    await tx.delete(serviceRoleSlots).where(eq(serviceRoleSlots.id, slotId));
  });

  return apiSuccess({ deleted: true });
}
```

`src/app/api/churches/[churchId]/services/[serviceId]/slots/restore/route.ts`:

```ts
import { requireChurchRole } from "@/lib/auth/permissions";
import { apiError, apiSuccess, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { serviceRoleSlots, services, presetRoleSlots } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ churchId: string; serviceId: string }> },
) {
  const { churchId, serviceId } = await params;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) return error;

  const [svc] = await db.select().from(services)
    .where(and(eq(services.id, serviceId), eq(services.churchId, churchId))).limit(1);
  if (!svc) return apiError("Service not found", 404, { code: ErrorCodes.NOT_FOUND });
  if (!svc.presetId) return apiError("Service has no preset to restore from", 409, { code: ErrorCodes.CONFLICT });

  await db.transaction(async (tx) => {
    await tx.delete(serviceRoleSlots).where(eq(serviceRoleSlots.serviceId, serviceId));
    const slots = await tx.select().from(presetRoleSlots).where(eq(presetRoleSlots.presetId, svc.presetId!));
    if (slots.length > 0) {
      await tx.insert(serviceRoleSlots).values(slots.map((s) => ({
        serviceId,
        catalogRoleId: s.catalogRoleId,
        minCount: s.minCount,
        maxCount: s.maxCount,
        exclusive: s.exclusive,
        displayOrder: s.displayOrder,
      })));
    }
  });

  return apiSuccess({ restored: true });
}
```

- [ ] **Step 4: Run tests, commit**

```bash
git add src/app/api/churches/[churchId]/services/[serviceId]/slots
git commit -m "feat(api): per-service role slot overrides with quarantine + restore"
```

### Task 3.6: Extend `POST /api/churches/[churchId]/services` to snapshot preset slots

**Files:**
- Modify: `src/app/api/churches/[churchId]/services/route.ts`
- Modify: its tests

- [ ] **Step 1: Read existing implementation.**

- [ ] **Step 2: Failing test** that calls POST with `presetId`, asserts a service is created AND `service_role_slots` rows are inserted matching the preset's `preset_role_slots`.

- [ ] **Step 3: Implement:** accept optional `presetId`; in a transaction, insert the service row then select and copy slots.

Add after the service insert:
```ts
if (body.presetId) {
  const slots = await tx.select().from(presetRoleSlots).where(eq(presetRoleSlots.presetId, body.presetId));
  if (slots.length > 0) {
    await tx.insert(serviceRoleSlots).values(slots.map((s) => ({
      serviceId: created.id,
      catalogRoleId: s.catalogRoleId,
      minCount: s.minCount,
      maxCount: s.maxCount,
      exclusive: s.exclusive,
      displayOrder: s.displayOrder,
    })));
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/churches/[churchId]/services
git commit -m "feat(api): POST services snapshots preset slots into service_role_slots"
```

### Task 3.7: Migration-audit-log + phase-state endpoints (super-admin-gated via env allowlist)

**Files:**
- Create: `src/lib/auth/super-admin.ts`
- Create: `src/app/api/admin/migration-log/route.ts`
- Create: `src/app/api/admin/migration-log/[id]/dismiss/route.ts`
- Create: tests

- [ ] **Step 1: super-admin helper**

`src/lib/auth/super-admin.ts`:

```ts
import { requireAuth } from "./permissions";
import { apiError, ErrorCodes } from "@/lib/api-helpers";

export async function requireSuperAdmin() {
  const { user, error } = await requireAuth();
  if (error) return { user: null, error };
  const allowlist = (process.env.SUPER_ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!user || !allowlist.includes(user.email)) {
    return { user: null, error: apiError("Super-admin only", 403, { code: ErrorCodes.FORBIDDEN }) };
  }
  return { user, error: null };
}
```

- [ ] **Step 2: GET list endpoint**

`src/app/api/admin/migration-log/route.ts`:

```ts
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { apiSuccess } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { migrationAuditLog } from "@/lib/db/schema";
import { and, eq, desc, isNull } from "drizzle-orm";

export async function GET(request: Request) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const phase = url.searchParams.get("phase");
  const churchId = url.searchParams.get("churchId");
  const severity = url.searchParams.get("severity");
  const code = url.searchParams.get("code");
  const includeDismissed = url.searchParams.get("includeDismissed") === "true";

  const clauses = [];
  if (phase) clauses.push(eq(migrationAuditLog.phase, phase));
  if (churchId) clauses.push(eq(migrationAuditLog.churchId, churchId));
  if (severity) clauses.push(eq(migrationAuditLog.severity, severity as "INFO" | "WARN" | "ERROR"));
  if (code) clauses.push(eq(migrationAuditLog.code, code));
  if (!includeDismissed) clauses.push(isNull(migrationAuditLog.dismissedAt));

  const rows = await db.select().from(migrationAuditLog)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(migrationAuditLog.createdAt));

  return apiSuccess(rows);
}
```

- [ ] **Step 3: POST dismiss endpoint**

`src/app/api/admin/migration-log/[id]/dismiss/route.ts`:

```ts
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { migrationAuditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const [updated] = await db.update(migrationAuditLog)
    .set({ dismissedAt: new Date() })
    .where(eq(migrationAuditLog.id, id))
    .returning();
  if (!updated) return apiError("Log entry not found", 404, { code: ErrorCodes.NOT_FOUND });
  return apiSuccess(updated);
}
```

- [ ] **Step 4: Tests for each endpoint (403 without env allowlist, 200 with).**

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/super-admin.ts src/app/api/admin/migration-log
git commit -m "feat(api): migration audit log admin endpoints (super-admin only)"
```

### Milestone 3 exit criteria

- All new endpoints green under `npm test`.
- `npm run typecheck` clean.
- No modification to existing rota or availability endpoints yet.

---

## Milestone 4 — Migration script (Phases A + B combined, runnable end-to-end)

**Outcome:** a single `tsx` script that, run once in production, creates default presets for every church, backfills member roles, maps patterns/services/rota entries, quarantines orphans, and writes the audit log. Schema from Milestone 1 is already live (that's Phase A).

### Task 4.1: Pure helper: pattern/service → preset mapping

**Files:**
- Create: `src/lib/migration/preset-mapping.ts`
- Create: `src/lib/migration/__tests__/preset-mapping.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { mapServiceTypeAndChoirStatusToPresetKey } from "../preset-mapping";

describe("mapServiceTypeAndChoirStatusToPresetKey", () => {
  it.each([
    ["SUNG_EUCHARIST", "CHOIR_REQUIRED", "DEFAULT_CHORAL"],
    ["CHORAL_EVENSONG", "CHOIR_REQUIRED", "DEFAULT_CHORAL"],
    ["CHORAL_MATINS", "CHOIR_REQUIRED", "DEFAULT_CHORAL"],
    ["COMPLINE", "CHOIR_REQUIRED", "DEFAULT_CHORAL"],
    ["FAMILY_SERVICE", "CHOIR_REQUIRED", "DEFAULT_CHORAL"],
    ["CUSTOM", "CHOIR_REQUIRED", "DEFAULT_CHORAL"],
    ["SAID_EUCHARIST", "CHOIR_REQUIRED", "SAID_EUCHARIST"],
    ["SUNG_EUCHARIST", "NO_CHOIR_NEEDED", "ORGANIST_ONLY_EUCHARIST"],
    ["SUNG_EUCHARIST", "SAID_SERVICE_ONLY", "SAID_EUCHARIST"],
  ])("maps %s/%s to %s", (st, cs, expected) => {
    expect(mapServiceTypeAndChoirStatusToPresetKey(st as any, cs as any)).toBe(expected);
  });
});
```

- [ ] **Step 2: Implement**

`src/lib/migration/preset-mapping.ts`:

```ts
export type ServiceTypeKey = "SUNG_EUCHARIST" | "CHORAL_EVENSONG" | "SAID_EUCHARIST" | "CHORAL_MATINS" | "FAMILY_SERVICE" | "COMPLINE" | "CUSTOM";
export type ChoirStatusKey = "CHOIR_REQUIRED" | "NO_CHOIR_NEEDED" | "SAID_SERVICE_ONLY" | "NO_SERVICE";
export type PresetKey = "DEFAULT_CHORAL" | "ORGANIST_ONLY_EUCHARIST" | "SAID_EUCHARIST";

export function mapServiceTypeAndChoirStatusToPresetKey(
  serviceType: ServiceTypeKey,
  choirStatus: ChoirStatusKey,
): PresetKey {
  if (choirStatus === "SAID_SERVICE_ONLY") return "SAID_EUCHARIST";
  if (choirStatus === "NO_CHOIR_NEEDED") return "ORGANIST_ONLY_EUCHARIST";
  if (serviceType === "SAID_EUCHARIST") return "SAID_EUCHARIST";
  return "DEFAULT_CHORAL";
}
```

- [ ] **Step 3: Pass, commit**

```bash
git add src/lib/migration
git commit -m "feat(migration): pure mapper from serviceType+choirStatus to preset key"
```

### Task 4.2: Pure helper: resolve `defaultTime` from a set of pattern times

**Files:**
- Modify: `src/lib/migration/preset-mapping.ts`
- Modify: test

- [ ] **Step 1: Failing test**

```ts
describe("resolveDefaultTime", () => {
  it("returns the time when all inputs agree", () => {
    expect(resolveDefaultTime(["10:00", "10:00"])).toEqual({ time: "10:00", ambiguous: false });
  });
  it("returns ambiguous when times disagree", () => {
    expect(resolveDefaultTime(["10:00", "11:00"])).toEqual({ time: null, ambiguous: true });
  });
  it("returns null when no times provided", () => {
    expect(resolveDefaultTime([])).toEqual({ time: null, ambiguous: false });
  });
  it("ignores nulls", () => {
    expect(resolveDefaultTime(["10:00", null])).toEqual({ time: "10:00", ambiguous: false });
  });
});
```

- [ ] **Step 2: Implement**

```ts
export function resolveDefaultTime(times: Array<string | null>): { time: string | null; ambiguous: boolean } {
  const distinct = new Set(times.filter((t): t is string => !!t));
  if (distinct.size === 0) return { time: null, ambiguous: false };
  if (distinct.size === 1) return { time: distinct.values().next().value!, ambiguous: false };
  return { time: null, ambiguous: true };
}
```

- [ ] **Step 3: Pass, commit**

```bash
git add src/lib/migration/preset-mapping.ts src/lib/migration/__tests__
git commit -m "feat(migration): pure defaultTime resolver"
```

### Task 4.3: Migration script — structure + logging

**Files:**
- Create: `scripts/migrate-to-role-slots.ts`

- [ ] **Step 1: Scaffold the script with placeholder steps**

```ts
import "dotenv/config";
import { db } from "../src/lib/db";
import {
  churches, churchMemberships, services, rotaEntries, churchServicePatterns,
  roleCatalog, churchMemberRoles, churchServicePresets, presetRoleSlots,
  serviceRoleSlots, migrationPhaseState, migrationAuditLog, quarantinedRotaEntries,
} from "../src/lib/db/schema";
import { eq, and, isNotNull, inArray, isNull, sql } from "drizzle-orm";
import { mapServiceTypeAndChoirStatusToPresetKey, resolveDefaultTime } from "../src/lib/migration/preset-mapping";

// Note: `sql` is imported above for any raw-SQL escape hatches in step
// functions (none currently needed but left available for future use).

async function runPhaseB() {
  console.log("[Phase B] starting");
  const [existing] = await db.select().from(migrationPhaseState).where(eq(migrationPhaseState.phase, "B")).limit(1);
  if (existing) {
    console.log("[Phase B] already completed at", existing.completedAt);
    return;
  }

  await db.transaction(async (tx) => {
    const catalog = await tx.select().from(roleCatalog);
    const catalogByKey = new Map(catalog.map((r) => [r.key, r]));

    // Step 1: backfill church_member_roles from voicePart
    await step1_backfillMemberRoles(tx, catalogByKey);
    // Step 2: generate default presets per church
    const presetsByChurch = await step2_generatePresets(tx, catalogByKey);
    // Step 3: populate preset_role_slots for defaults
    await step3_populateDefaultSlots(tx, presetsByChurch, catalogByKey);
    // Step 4: map patterns to presets and resolve defaultTime
    await step4_mapPatterns(tx, presetsByChurch);
    // Step 5: map services to presets
    await step5_mapServices(tx, presetsByChurch);
    // Step 6: create service_role_slots from presets
    await step6_snapshotServiceSlots(tx);
    // Step 7: backfill rota_entries.catalogRoleId from voice part
    await step7_backfillRotaEntries(tx, catalogByKey);
    // Step 8: archive NO_SERVICE rows
    await step8_archiveNoService(tx);
    // Step 9: quarantine orphaned rota entries
    await step9_quarantineOrphans(tx);

    await tx.insert(migrationPhaseState).values({ phase: "B" });
  });

  console.log("[Phase B] complete");
}

// ... step functions below

runPhaseB().catch((e) => {
  console.error("[Phase B] FAILED", e);
  process.exit(1);
});
```

- [ ] **Step 2: Add the `package.json` script**

```json
"db:migrate-roles": "tsx scripts/migrate-to-role-slots.ts",
```

- [ ] **Step 3: Commit scaffold**

```bash
git add scripts/migrate-to-role-slots.ts package.json
git commit -m "feat(migration): Phase B scaffold for role-slots migration"
```

### Task 4.4: Implement Phase B step 1 — backfill member roles

**Files:**
- Modify: `scripts/migrate-to-role-slots.ts`
- Create: `scripts/__tests__/migration-phase-b.test.ts` (integration test against a test DB — see Task 4.10)

- [ ] **Step 1: Write the step function**

Append to the script:

```ts
async function step1_backfillMemberRoles(tx: typeof db, catalogByKey: Map<string, any>) {
  const memberships = await tx.select().from(churchMemberships).where(isNotNull(churchMemberships.voicePart));
  for (const m of memberships) {
    const role = catalogByKey.get(m.voicePart!);
    if (!role) continue;
    await tx.insert(churchMemberRoles).values({
      userId: m.userId,
      churchId: m.churchId,
      catalogRoleId: role.id,
      isPrimary: true,
      displayOrder: 0,
    }).onConflictDoNothing({ target: [churchMemberRoles.userId, churchMemberRoles.churchId, churchMemberRoles.catalogRoleId] });
  }
  const withoutVoice = await tx.select().from(churchMemberships).where(isNull(churchMemberships.voicePart));
  for (const m of withoutVoice) {
    await tx.insert(migrationAuditLog).values({
      phase: "B", churchId: m.churchId, severity: "INFO", code: "MEMBER_NO_VOICE_PART",
      details: { userId: m.userId },
    });
  }
}
```

- [ ] **Step 2: Run the script against a throwaway dev DB, observe logs.**

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(migration): Phase B step 1 — backfill member roles from voicePart"
```

### Task 4.5: Phase B step 2 — generate default presets

- [ ] **Step 1: Implement**

```ts
async function step2_generatePresets(tx: typeof db, catalogByKey: Map<string, any>) {
  const allChurches = await tx.select({ id: churches.id }).from(churches);
  const presetsByChurch = new Map<string, { DEFAULT_CHORAL: string; ORGANIST_ONLY_EUCHARIST: string; SAID_EUCHARIST: string }>();
  for (const c of allChurches) {
    const created: Record<string, string> = {};
    for (const p of [
      { key: "DEFAULT_CHORAL", name: "Default Choral", serviceType: "SUNG_EUCHARIST", choirRequirement: "FULL_CHOIR", musicListFieldSet: "CHORAL" },
      { key: "ORGANIST_ONLY_EUCHARIST", name: "Organist-only Eucharist", serviceType: "SAID_EUCHARIST", choirRequirement: "ORGANIST_ONLY", musicListFieldSet: "HYMNS_ONLY" },
      { key: "SAID_EUCHARIST", name: "Said Eucharist", serviceType: "SAID_EUCHARIST", choirRequirement: "SAID", musicListFieldSet: "READINGS_ONLY" },
    ] as const) {
      const [existing] = await tx.select({ id: churchServicePresets.id })
        .from(churchServicePresets)
        .where(and(eq(churchServicePresets.churchId, c.id), eq(churchServicePresets.name, p.name), isNull(churchServicePresets.archivedAt)))
        .limit(1);
      if (existing) { created[p.key] = existing.id; continue; }
      const [row] = await tx.insert(churchServicePresets).values({
        churchId: c.id, name: p.name, serviceType: p.serviceType,
        choirRequirement: p.choirRequirement, musicListFieldSet: p.musicListFieldSet,
        defaultTime: null, liturgicalSeasonTags: [],
      }).returning({ id: churchServicePresets.id });
      created[p.key] = row.id;
    }
    presetsByChurch.set(c.id, created as any);
  }
  return presetsByChurch;
}
```

- [ ] **Step 2: Commit**

```bash
git commit -am "feat(migration): Phase B step 2 — default presets per church"
```

### Task 4.6: Phase B step 3 — populate default `preset_role_slots`

- [ ] **Step 1: Implement**

```ts
async function step3_populateDefaultSlots(
  tx: typeof db,
  presetsByChurch: Map<string, any>,
  catalogByKey: Map<string, any>,
) {
  const voice = ["SOPRANO","ALTO","TENOR","BASS"].map((k) => catalogByKey.get(k)!);
  const org = catalogByKey.get("ORGANIST")!;
  const dir = catalogByKey.get("DIRECTOR")!;

  for (const [, pKeys] of presetsByChurch) {
    const choralId = pKeys.DEFAULT_CHORAL;
    const organistOnlyId = pKeys.ORGANIST_ONLY_EUCHARIST;
    // Skip said preset (no slots).

    const choralRows = [
      ...voice.map((v, i) => ({ presetId: choralId, catalogRoleId: v.id, minCount: 1, maxCount: null, exclusive: false, displayOrder: (i + 1) * 10 })),
      { presetId: choralId, catalogRoleId: org.id, minCount: 1, maxCount: 1, exclusive: true, displayOrder: 50 },
      { presetId: choralId, catalogRoleId: dir.id, minCount: 1, maxCount: 1, exclusive: true, displayOrder: 60 },
    ];
    for (const r of choralRows) {
      await tx.insert(presetRoleSlots).values(r)
        .onConflictDoNothing({ target: [presetRoleSlots.presetId, presetRoleSlots.catalogRoleId] });
    }
    await tx.insert(presetRoleSlots).values({
      presetId: organistOnlyId, catalogRoleId: org.id, minCount: 1, maxCount: 1, exclusive: true, displayOrder: 10,
    }).onConflictDoNothing({ target: [presetRoleSlots.presetId, presetRoleSlots.catalogRoleId] });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git commit -am "feat(migration): Phase B step 3 — seed slots on default presets"
```

### Task 4.7: Phase B steps 4–5 — map patterns and services

- [ ] **Step 1: Implement step 4**

```ts
async function step4_mapPatterns(tx: typeof db, presetsByChurch: Map<string, any>) {
  const patterns = await tx.select().from(churchServicePatterns);
  const timesByPreset = new Map<string, Array<string | null>>();

  for (const p of patterns) {
    const pKeys = presetsByChurch.get(p.churchId); if (!pKeys) continue;
    const targetKey = mapServiceTypeAndChoirStatusToPresetKey(p.serviceType, "CHOIR_REQUIRED" /* patterns don't carry choirStatus */);
    const presetId = pKeys[targetKey];
    await tx.update(churchServicePatterns).set({ presetId }).where(eq(churchServicePatterns.id, p.id));
    const bucket = timesByPreset.get(presetId) ?? [];
    bucket.push(p.time ?? null);
    timesByPreset.set(presetId, bucket);
  }

  for (const [presetId, times] of timesByPreset) {
    const { time, ambiguous } = resolveDefaultTime(times);
    await tx.update(churchServicePresets).set({ defaultTime: time }).where(eq(churchServicePresets.id, presetId));
    if (ambiguous) {
      const [preset] = await tx.select({ churchId: churchServicePresets.churchId })
        .from(churchServicePresets).where(eq(churchServicePresets.id, presetId)).limit(1);
      await tx.insert(migrationAuditLog).values({
        phase: "B", churchId: preset.churchId, severity: "WARN", code: "PRESET_TIME_AMBIGUOUS",
        details: { presetId, observedTimes: Array.from(new Set(times)) },
      });
    }
  }
}
```

- [ ] **Step 2: Implement step 5**

```ts
async function step5_mapServices(tx: typeof db, presetsByChurch: Map<string, any>) {
  const all = await tx.select().from(services);
  for (const s of all) {
    const pKeys = presetsByChurch.get(s.churchId); if (!pKeys) continue;
    const targetKey = mapServiceTypeAndChoirStatusToPresetKey(s.serviceType, s.choirStatus);
    await tx.update(services).set({ presetId: pKeys[targetKey] }).where(eq(services.id, s.id));
  }
}
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(migration): Phase B steps 4-5 — map patterns/services to presets"
```

### Task 4.8: Phase B step 6 — snapshot `service_role_slots`

```ts
async function step6_snapshotServiceSlots(tx: typeof db) {
  const all = await tx.select({ id: services.id, presetId: services.presetId, choirStatus: services.choirStatus })
    .from(services).where(isNotNull(services.presetId));
  for (const s of all) {
    // Said and NO_SERVICE services get no slots.
    if (s.choirStatus === "SAID_SERVICE_ONLY" || s.choirStatus === "NO_SERVICE") continue;
    const slots = await tx.select().from(presetRoleSlots).where(eq(presetRoleSlots.presetId, s.presetId!));
    for (const sl of slots) {
      await tx.insert(serviceRoleSlots).values({
        serviceId: s.id, catalogRoleId: sl.catalogRoleId,
        minCount: sl.minCount, maxCount: sl.maxCount,
        exclusive: sl.exclusive, displayOrder: sl.displayOrder,
      }).onConflictDoNothing({ target: [serviceRoleSlots.serviceId, serviceRoleSlots.catalogRoleId] });
    }
  }
}
```

Commit: `feat(migration): Phase B step 6 — snapshot service slots from preset`

### Task 4.9: Phase B steps 7–9 — rota backfill, archive, quarantine

```ts
async function step7_backfillRotaEntries(tx: typeof db, catalogByKey: Map<string, any>) {
  const rows = await tx.select({
    entryId: rotaEntries.id,
    userId: rotaEntries.userId,
    serviceId: rotaEntries.serviceId,
    churchId: services.churchId,
    voicePart: churchMemberships.voicePart,
  })
    .from(rotaEntries)
    .innerJoin(services, eq(services.id, rotaEntries.serviceId))
    .leftJoin(churchMemberships, and(
      eq(churchMemberships.userId, rotaEntries.userId),
      eq(churchMemberships.churchId, services.churchId),
    ))
    .where(isNull(rotaEntries.catalogRoleId));

  for (const r of rows) {
    if (!r.voicePart) continue;
    const role = catalogByKey.get(r.voicePart);
    if (!role) continue;
    await tx.update(rotaEntries).set({ catalogRoleId: role.id }).where(eq(rotaEntries.id, r.entryId));
  }

  const remaining = await tx.select().from(rotaEntries).where(isNull(rotaEntries.catalogRoleId));
  for (const r of remaining) {
    const [svc] = await tx.select({ churchId: services.churchId }).from(services).where(eq(services.id, r.serviceId)).limit(1);
    await tx.insert(migrationAuditLog).values({
      phase: "B", churchId: svc?.churchId ?? null, severity: "WARN", code: "ROTA_ENTRY_UNCLASSIFIED",
      details: { rotaEntryId: r.id, userId: r.userId, serviceId: r.serviceId },
    });
  }
}

async function step8_archiveNoService(tx: typeof db) {
  await tx.update(services).set({ status: "ARCHIVED" }).where(eq(services.choirStatus, "NO_SERVICE"));
}

async function step9_quarantineOrphans(tx: typeof db) {
  const orphans = await tx.select().from(rotaEntries).where(isNull(rotaEntries.catalogRoleId));
  for (const o of orphans) {
    await tx.insert(quarantinedRotaEntries).values({
      originalEntryId: o.id, serviceId: o.serviceId, userId: o.userId, confirmed: o.confirmed,
      quarantineReason: "ROTA_ENTRY_UNCLASSIFIED",
    });
    await tx.delete(rotaEntries).where(eq(rotaEntries.id, o.id));
  }
}
```

Commit: `feat(migration): Phase B steps 7-9 — rota backfill, archive, quarantine`

### Task 4.10: Integration test for the full migration

**Files:**
- Create: `scripts/__tests__/migration-phase-b.test.ts`

- [ ] **Step 1: Failing integration test**

Set up a vitest integration suite that seeds a fixture DB (use a separate TEST_DATABASE_URL) with a miniature scenario, runs `runPhaseB`, and asserts expected rows. Use the `@databases/pg` test pattern OR call the real exported `runPhaseB` function (split out from the script).

```ts
// Rough shape; actual DB setup is project-specific.
describe("migration Phase B", () => {
  it("creates three presets and migrates a simple church", async () => {
    // Seed: 1 church, 2 members with voice parts, 1 pattern SUNG_EUCHARIST @10:00,
    //       1 service CHOIR_REQUIRED, 1 rota entry.
    // Run runPhaseB.
    // Assert: 3 presets exist; DEFAULT_CHORAL has 6 slots; service has 6 slots;
    //         both members have church_member_roles rows; rota entry has catalogRoleId set.
  });

  it("handles NO_CHOIR_NEEDED by mapping to Organist-only preset", async () => { /* ... */ });
  it("archives NO_SERVICE", async () => { /* ... */ });
  it("quarantines orphan rota entries", async () => { /* ... */ });
  it("is idempotent — running twice does not duplicate", async () => { /* ... */ });
  it("writes PRESET_TIME_AMBIGUOUS when patterns disagree on time", async () => { /* ... */ });
});
```

- [ ] **Step 2: Make it pass, commit**

Refactor `scripts/migrate-to-role-slots.ts` to export `runPhaseB` as a function for test consumption.

```bash
git commit -am "test(migration): integration tests for Phase B end-to-end"
```

### Milestone 4 exit criteria

- Running `npm run db:migrate-roles` against a seeded dev DB produces the expected state.
- Running it twice produces no duplicates and no errors.
- Integration test passes.
- `migration_audit_log` correctly captures ambiguous times, unclassified rotas, missing voice parts.

---

**Continues in Part 3** (`2026-04-19-per-church-role-configurability-part3.md`) covering Milestones 5, 6, 7, 8.
