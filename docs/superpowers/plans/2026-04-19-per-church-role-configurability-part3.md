# Per-Church Role Configurability — Implementation Plan (Part 3 of 3)

> Continues from `2026-04-19-per-church-role-configurability-part2.md` (Milestones 2–4). Same conventions.

Covers **Milestones 5, 6, 7, 8**.

---

## Milestone 5 — Presets admin UI + institution metadata UI + members page rework

**Outcome:** admins can see, create, edit, archive presets; manage preset role slots; assign institutional appointees; assign multi-role memberships. All behind a feature flag (`USE_ROLE_SLOTS_MODEL=true`). Existing UI unchanged when flag is off.

### Task 5.0: Environment variable documentation

**Files:**
- Modify: `.env.example` (or create if absent)

- [ ] **Step 1: Check if `.env.example` exists**

Run: `ls -la .env.example`
If missing, create an empty one.

- [ ] **Step 2: Append**

```
# Role-slots feature flag — set to "true" to enable the new role/preset model
# during migration cutover. Default false; see docs/superpowers/specs/2026-04-18-*.md.
USE_ROLE_SLOTS_MODEL=false

# Comma-separated list of super-admin emails permitted to access
# /api/admin/migration-log. Example: "admin@example.com,ops@example.com".
SUPER_ADMIN_EMAILS=
```

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore(env): document USE_ROLE_SLOTS_MODEL and SUPER_ADMIN_EMAILS"
```

### Task 5.1: Feature flag helper

**Files:**
- Create: `src/lib/feature-flags.ts`
- Create: `src/lib/__tests__/feature-flags.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useRoleSlotsModel } from "../feature-flags";

describe("useRoleSlotsModel", () => {
  const orig = process.env.USE_ROLE_SLOTS_MODEL;
  beforeEach(() => { process.env.USE_ROLE_SLOTS_MODEL = orig; });

  it("returns false by default", () => {
    delete process.env.USE_ROLE_SLOTS_MODEL;
    expect(useRoleSlotsModel()).toBe(false);
  });
  it("returns true when env var is 'true'", () => {
    process.env.USE_ROLE_SLOTS_MODEL = "true";
    expect(useRoleSlotsModel()).toBe(true);
  });
  it("returns false for any other value", () => {
    process.env.USE_ROLE_SLOTS_MODEL = "yes";
    expect(useRoleSlotsModel()).toBe(false);
  });
});
```

- [ ] **Step 2: Implement**

```ts
export function useRoleSlotsModel(): boolean {
  return process.env.USE_ROLE_SLOTS_MODEL === "true";
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/feature-flags.ts src/lib/__tests__/feature-flags.test.ts
git commit -m "feat: feature flag helper for role-slots model rollout"
```

### Task 5.2: Presets list page

**Files:**
- Create: `src/app/(app)/churches/[churchId]/settings/service-presets/page.tsx`
- Create: `src/app/(app)/churches/[churchId]/settings/service-presets/presets-client.tsx`
- Create: tests

- [ ] **Step 1: Scaffold server-component page**

```tsx
// page.tsx
import { requireChurchRole } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { churchServicePresets } from "@/lib/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { PresetsClient } from "./presets-client";

export default async function PresetsPage({ params }: { params: Promise<{ churchId: string }> }) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) redirect(`/churches/${churchId}`);

  const presets = await db.select().from(churchServicePresets)
    .where(and(eq(churchServicePresets.churchId, churchId), isNull(churchServicePresets.archivedAt)))
    .orderBy(asc(churchServicePresets.name));

  return <PresetsClient churchId={churchId} presets={presets} />;
}
```

- [ ] **Step 2: Client component** — list of presets with Edit/Archive/Duplicate actions, a "Create preset" CTA. Reuse existing Button/Input components from `src/components/ui`.

`presets-client.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";

interface Preset { id: string; name: string; serviceType: string; defaultTime: string | null; choirRequirement: string; musicListFieldSet: string; archivedAt: Date | null; }

export function PresetsClient({ churchId, presets }: { churchId: string; presets: Preset[] }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [showArchived, setShowArchived] = useState(false);

  async function archive(id: string) {
    const res = await fetch(`/api/churches/${churchId}/presets/${id}/archive`, { method: "POST" });
    if (!res.ok) return addToast("Failed to archive", "error");
    addToast("Archived", "success");
    router.refresh();
  }

  return (
    <div className="p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl">Service presets</h1>
        <a href={`/churches/${churchId}/settings/service-presets/new`} className="btn btn-primary">Create preset</a>
      </header>
      <label className="flex items-center gap-2 mt-2">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Show archived
      </label>
      <ul className="mt-4 divide-y">
        {presets.map((p) => (
          <li key={p.id} className="py-3 flex justify-between">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-muted-foreground">{p.serviceType} · {p.defaultTime ?? "no default time"} · {p.choirRequirement}</div>
            </div>
            <div className="flex gap-2">
              <a href={`/churches/${churchId}/settings/service-presets/${p.id}`} className="btn">Edit</a>
              <button onClick={() => archive(p.id)} className="btn">Archive</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Test** — unit test the client component renders the list and archive button fires the API call.

```ts
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PresetsClient } from "../presets-client";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ addToast: vi.fn() }) }));
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("PresetsClient", () => {
  beforeEach(() => mockFetch.mockReset());
  it("renders presets", () => {
    render(<PresetsClient churchId="c1" presets={[{ id: "p1", name: "Default Choral", serviceType: "SUNG_EUCHARIST", defaultTime: "10:00", choirRequirement: "FULL_CHOIR", musicListFieldSet: "CHORAL", archivedAt: null }]} />);
    expect(screen.getByText("Default Choral")).toBeInTheDocument();
  });
  it("fires archive endpoint on click", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    render(<PresetsClient churchId="c1" presets={[{ id: "p1", name: "x", serviceType: "SUNG_EUCHARIST", defaultTime: null, choirRequirement: "FULL_CHOIR", musicListFieldSet: "CHORAL", archivedAt: null }]} />);
    fireEvent.click(screen.getByText("Archive"));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/churches/c1/presets/p1/archive", { method: "POST" }));
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/churches/[churchId]/settings/service-presets
git commit -m "feat(ui): presets list page with archive action"
```

### Task 5.3: Preset create page

**Files:**
- Create: `src/app/(app)/churches/[churchId]/settings/service-presets/new/page.tsx`
- Create: tests

- [ ] **Step 1: Implement** — a form with name, serviceType, defaultTime, choirRequirement, musicListFieldSet. On submit, POST `/api/churches/[churchId]/presets`, then redirect to the detail page.

Scaffold client component mirroring the existing settings-form pattern (native form state via `useState`, POST via fetch).

- [ ] **Step 2: Failing test** verifying the form POSTs the payload and navigates on success.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(ui): preset create form"
```

### Task 5.4: Preset detail page — basic, slots, advanced sections

**Files:**
- Create: `src/app/(app)/churches/[churchId]/settings/service-presets/[presetId]/page.tsx`
- Create: `src/app/(app)/churches/[churchId]/settings/service-presets/[presetId]/preset-detail-client.tsx`
- Create: tests

- [ ] **Step 1: Server page** fetches preset + slots + catalog.

```tsx
import { requireChurchRole } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { churchServicePresets, presetRoleSlots, roleCatalog } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { PresetDetailClient } from "./preset-detail-client";

export default async function PresetDetail({ params }: { params: Promise<{ churchId: string; presetId: string }> }) {
  const { churchId, presetId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) redirect(`/churches/${churchId}`);

  const [preset] = await db.select().from(churchServicePresets)
    .where(and(eq(churchServicePresets.id, presetId), eq(churchServicePresets.churchId, churchId))).limit(1);
  if (!preset) redirect(`/churches/${churchId}/settings/service-presets`);

  const slots = await db.select().from(presetRoleSlots)
    .where(eq(presetRoleSlots.presetId, presetId))
    .orderBy(asc(presetRoleSlots.displayOrder));

  const catalog = await db.select().from(roleCatalog).where(eq(roleCatalog.rotaEligible, true))
    .orderBy(asc(roleCatalog.displayOrder));

  return <PresetDetailClient churchId={churchId} preset={preset} slots={slots} catalog={catalog} />;
}
```

- [ ] **Step 2: Client component** — three sections (Basic, Role slots, Advanced). Basic is a PATCH form. Role slots is a table with inline min/max/exclusive editing; "Add slot" opens a role-picker modal; voice-part roles cannot have `exclusive=true` (toggle disabled).

Scaffold in ~120 LOC with the three sections. Use the existing input/button patterns. For add/edit/remove slot actions, fire the `POST/PATCH/DELETE /api/churches/[churchId]/presets/[presetId]/slots[/slotId]` endpoints.

- [ ] **Step 3: Failing tests** covering:
  - Renders slot rows.
  - Add-slot modal appears and POSTs.
  - Voice-part role's exclusive toggle is disabled.
  - Save-basic PATCH fires.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(ui): preset detail page with Basic + Slots + Advanced sections"
```

### Task 5.5: Institution page

**Files:**
- Create: `src/app/(app)/churches/[churchId]/settings/institution/page.tsx`
- Create: `src/app/(app)/churches/[churchId]/settings/institution/institution-client.tsx`
- Create: tests

- [ ] **Step 1: Server page** fetches institutional catalog roles + current appointees (`church_member_roles` rows for `institutional=true` roles with user names joined).

- [ ] **Step 2: Client component** layout per spec §9.1 — category groups collapsible, Clergy-Cathedral collapsed by default, chip-style appointee rows. Each row calls POST/DELETE on `/api/churches/[churchId]/members/[memberId]/roles` when admin edits.

Key UX details:
- "Add appointee" opens a member-picker.
- Multiple appointees per role permitted (tag chips, each removable).
- Mobile-responsive (stacked).

- [ ] **Step 3: Tests** cover rendering, add-appointee flow, remove-appointee flow.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(ui): institution page for institutional appointments"
```

### Task 5.6a: Members page — role-chip UI scaffold (read-only)

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/members/members-table.tsx`
- Modify: `src/app/(app)/churches/[churchId]/members/page.tsx` (data fetch) — join `churchMemberRoles` + `roleCatalog` for each member
- Modify: tests

- [ ] **Step 1: Read existing `members-table.tsx`** to understand the current per-row layout.

- [ ] **Step 2: Failing test** — under `USE_ROLE_SLOTS_MODEL=true`, each member row renders a chip for each of their catalog roles, with the primary role labelled "primary". Under flag-off, the existing voice-part dropdown renders unchanged.

- [ ] **Step 3: Implement read-only chip UI**

Add to `page.tsx` data fetch (flag-on only): join `churchMemberRoles` × `roleCatalog` and pass `roles: { id, catalogRoleId, name, isPrimary }[]` per member.

In `members-table.tsx`:
```tsx
import { useRoleSlotsModel } from "@/lib/feature-flags";
const roleSlotsOn = useRoleSlotsModel();  // OR a prop passed from server
// ...
{roleSlotsOn ? (
  <div className="flex flex-wrap gap-1">
    {member.roles.map((r) => (
      <span key={r.id} className="chip">
        {r.name}{r.isPrimary ? " · primary" : ""}
      </span>
    ))}
  </div>
) : (
  <select>{/* existing voice-part dropdown */}</select>
)}
```

`useRoleSlotsModel` in a client component must be imported carefully. Easiest: server-component passes the boolean as a prop.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(ui): members page role-chip read-only scaffold"
```

### Task 5.6b: Members page — add-role + remove + set-primary actions

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/members/members-table.tsx`
- Modify: tests

- [ ] **Step 1: Failing test** — clicking "Add role" opens a picker modal; selecting a role fires `POST /api/churches/[churchId]/members/[memberId]/roles` and the new chip appears. Clicking × on a chip fires `DELETE`. Toggling primary fires `PATCH` with `isPrimary: true`.

- [ ] **Step 2: Implement**

Add an "Add role" button next to the chip list that opens a `<Dialog>` with a category-grouped list of available catalog roles (fetched via `/api/role-catalog`, filtered to roles the member doesn't already have).

On action dispatch:
```tsx
async function addRole(memberId: string, catalogRoleId: string) {
  const res = await fetch(`/api/churches/${churchId}/members/${memberId}/roles`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ catalogRoleId }),
  });
  if (!res.ok) addToast("Failed to add role", "error");
  else router.refresh();
}

async function removeRole(memberId: string, assignmentId: string) { /* DELETE */ }
async function setPrimary(memberId: string, assignmentId: string) { /* PATCH { isPrimary: true } */ }
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(ui): members page role add/remove/primary-toggle"
```

### Task 5.7: Add "Service presets" and "Institution" links to church settings nav

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/settings/page.tsx` (or the settings shell / nav component)

- [ ] **Step 1: Read the file; find where "Service patterns" link currently lives; add siblings.**

- [ ] **Step 2: Add two new navigation items**, visible only when `useRoleSlotsModel()` returns true (server-component — read env directly).

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(ui): settings navigation — service presets + institution links"
```

### Milestone 5 exit criteria

- All four new pages render without errors (local smoke test).
- `npm test` + `npm run typecheck` clean.
- With flag off, the app is visually identical to pre-refactor.

---

## Milestone 6 — Rota grid + availability cutover (behind feature flag)

**Outcome:** the rota grid reads/writes the new model when the flag is on. Availability widget honours eligibility filter. `POST /api/rota` and `POST /api/availability` enforce new validation.

### Task 6.1: Availability widget — add `eligible` prop + em-dash rendering

**Files:**
- Modify: `src/components/availability-widget.tsx`
- Modify: `src/components/__tests__/availability-widget.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
it("renders em-dash with tooltip when not eligible", () => {
  render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus={null} size="md" eligible={false} eligibleReason="SAID" />);
  expect(screen.queryByRole("button", { name: "Available" })).not.toBeInTheDocument();
  expect(screen.getByText("—")).toBeInTheDocument();
  expect(screen.getByText("—").closest("[title]")).toHaveAttribute("title", "Not required for this service");
});

it("renders the three buttons when eligible", () => {
  render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus={null} size="md" eligible={true} />);
  expect(screen.getByRole("button", { name: "Available" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement**

Add `eligible?: boolean` and `eligibleReason?: "SAID" | "NO_ROLE"` props. When `eligible === false`, render:

```tsx
const tooltip = eligibleReason === "NO_ROLE"
  ? "You don't have a role required for this service"
  : "Not required for this service";
return <span title={tooltip} className="text-muted-foreground">—</span>;
```

Place this at the top of the component's return (before the existing button group).

- [ ] **Step 3: Commit**

```bash
git add src/components/availability-widget.tsx src/components/__tests__/availability-widget.test.tsx
git commit -m "feat(ui): availability widget renders em-dash when user is not eligible"
```

### Feature-flag behaviour contract (applies to all of Milestone 6)

For **every** endpoint modified in this milestone, the legacy flag-off path MUST preserve byte-for-byte the existing request/response contract. The new behaviour is added as an `if (useRoleSlotsModel()) { ... return ... }` branch at the top of the handler that short-circuits before the legacy path. Tests cover both paths:
- Flag-off tests: existing behaviour unchanged (regression protection).
- Flag-on tests: new validation active.

Flag-off paths do NOT emit `warnings` or `catalogRoleId`. Flag-on paths use the response shape documented in each task.

### Task 6.2: Availability endpoint — enforce eligibility

**Files:**
- Modify: `src/app/api/churches/[churchId]/availability/route.ts`
- Modify: its tests

- [ ] **Step 1: Failing test**

New test case: when `USE_ROLE_SLOTS_MODEL=true`, POST to a service with no `service_role_slots` rows returns 403 `NO_ELIGIBLE_ROLE`. POST to a service with slots for roles the user doesn't hold returns 403. POST to a service with a slot for a role the user holds returns 200.

- [ ] **Step 2: Implement**

Before the existing upsert, add:

```ts
import { useRoleSlotsModel } from "@/lib/feature-flags";
import { serviceRoleSlots, churchMemberRoles } from "@/lib/db/schema";
import { ErrorCodes } from "@/lib/api-helpers";

if (useRoleSlotsModel()) {
  const eligible = await db
    .select({ id: serviceRoleSlots.id })
    .from(serviceRoleSlots)
    .innerJoin(churchMemberRoles, and(
      eq(churchMemberRoles.catalogRoleId, serviceRoleSlots.catalogRoleId),
      eq(churchMemberRoles.userId, targetUserId),
      eq(churchMemberRoles.churchId, churchId),
    ))
    .where(eq(serviceRoleSlots.serviceId, serviceId))
    .limit(1);
  if (eligible.length === 0) {
    return apiError("No eligible role for this service", 403, { code: ErrorCodes.NO_ELIGIBLE_ROLE });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(api): availability endpoint enforces role eligibility under feature flag"
```

### Task 6.3: Rota endpoint — accept `catalogRoleId` + enforce validation

**Files:**
- Modify: `src/app/api/churches/[churchId]/rota/route.ts`
- Modify: its tests

- [ ] **Step 1: Failing tests** for:
  - 400 without `catalogRoleId` when flag on.
  - 403 USER_LACKS_ROLE when target user has no matching `church_member_roles` row.
  - 404 SLOT_NOT_ON_SERVICE when service has no matching `service_role_slots` row.
  - 409 SLOT_ALREADY_FILLED when exclusive slot already has an entry.
  - 409 SLOT_AT_CAPACITY when `maxCount` reached.
  - 201 with `warnings: [{code: "DUAL_ROLE", ...}]` in `details` when user already has another slot on this service.
  - 201 without warnings when it's the user's first slot on this service.

- [ ] **Step 2: Implement** — wrap the current behaviour in a feature-flag branch. Under flag-on, require `catalogRoleId`, run all the validation checks, insert with `catalogRoleId`, compute dual-role warnings post-insert:

```ts
if (useRoleSlotsModel()) {
  const { catalogRoleId } = body;
  if (!catalogRoleId) return apiError("catalogRoleId is required", 400, { code: ErrorCodes.INVALID_INPUT });

  // USER_LACKS_ROLE
  const [memberRole] = await db.select().from(churchMemberRoles)
    .where(and(eq(churchMemberRoles.userId, userId), eq(churchMemberRoles.churchId, churchId), eq(churchMemberRoles.catalogRoleId, catalogRoleId))).limit(1);
  if (!memberRole) return apiError("User does not hold this role", 403, { code: ErrorCodes.USER_LACKS_ROLE });

  // SLOT_NOT_ON_SERVICE
  const [slot] = await db.select().from(serviceRoleSlots)
    .where(and(eq(serviceRoleSlots.serviceId, serviceId), eq(serviceRoleSlots.catalogRoleId, catalogRoleId))).limit(1);
  if (!slot) return apiError("Slot not on service", 404, { code: ErrorCodes.SLOT_NOT_ON_SERVICE });

  // SLOT_ALREADY_FILLED + SLOT_AT_CAPACITY
  const existing = await db.select().from(rotaEntries)
    .where(and(
      eq(rotaEntries.serviceId, serviceId),
      eq(rotaEntries.catalogRoleId, catalogRoleId),
      isNull(rotaEntries.quarantinedAt),
    ));
  if (slot.exclusive && existing.length > 0) {
    return apiError("Slot already filled", 409, { code: ErrorCodes.SLOT_ALREADY_FILLED });
  }
  if (slot.maxCount != null && existing.length >= slot.maxCount) {
    return apiError("Slot at capacity", 409, { code: ErrorCodes.SLOT_AT_CAPACITY });
  }

  // Insert
  await db.insert(rotaEntries).values({ userId, serviceId, confirmed: true, catalogRoleId });

  // Dual-role detection
  const allSlots = await db.select().from(rotaEntries)
    .where(and(eq(rotaEntries.serviceId, serviceId), eq(rotaEntries.userId, userId), isNull(rotaEntries.quarantinedAt)));
  const warnings = allSlots.length > 1
    ? [{ code: "DUAL_ROLE", userId, serviceId, allHeldSlots: allSlots.map((e) => ({ catalogRoleId: e.catalogRoleId })) }]
    : [];
  return apiSuccess({ success: true, warnings }, 201);
}
```

Reminder: under flag-off, the existing behaviour is preserved unchanged.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(api): rota endpoint enforces slot-based validation under feature flag"
```

### Task 6.4: Rota grid — default view (one row per member, role pills) behind flag

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/rota/page.tsx` (data fetch)
- Modify: `src/app/(app)/churches/[churchId]/rota/rota-grid.tsx`
- Create: `src/app/(app)/churches/[churchId]/rota/__tests__/rota-grid-new.test.tsx`

- [ ] **Step 1: Extend page.tsx** to fetch, when flag-on, each member's role assignments and each service's `service_role_slots`. Pass this data to the grid component.

- [ ] **Step 2: Failing test** — under flag-on, grid renders one row per member regardless of number of roles; each row shows pills for the member's roles; clicking a pill filters active-role for that row.

- [ ] **Step 3: Implement** — add a new `RotaGridV2` component (new file, alongside the current grid) that:
  - Takes `members` with `roles: { id, catalogRoleKey, catalogRoleName, isPrimary }[]`.
  - Takes `services` with `slots: { catalogRoleId, catalogRoleKey }[]`.
  - Renders one row per member.
  - Renders role pills on each member-name cell.
  - For each (member, service) cell, renders an `AvailabilityWidget` with `eligible` computed as "member has at least one role that is in this service's slots."
  - Rota toggle requires a role selection — if member has only one rota-eligible role for this service, toggling uses that role; if multiple, opens a mini popup to pick.

The page chooses `RotaGrid` (legacy) or `RotaGridV2` based on `useRoleSlotsModel()`.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(ui): role-aware rota grid behind feature flag"
```

### Task 6.5: Rota grid — role-grouped view toggle

**Files:**
- Modify: `src/app/(app)/churches/[churchId]/rota/rota-grid-v2.tsx`

- [ ] **Step 1: Failing test** — toggle "View by role" re-renders the grid grouped by role section.

- [ ] **Step 2: Implement** the toggle; in grouped mode, a member with multiple roles appears in each relevant section with a small "also [otherRole]" badge.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(ui): rota grid role-grouped view toggle"
```

### Task 6.6: Service creation form — preset dropdown

**Files:**
- Modify: the existing service-create form (`src/app/(app)/churches/[churchId]/services/...`)

- [ ] **Step 1: Find the existing form** (it's behind `/services` in the app).

- [ ] **Step 2: Failing test** — under flag-on, the form renders a preset dropdown; submitting fires POST with `presetId`.

- [ ] **Step 3: Implement**: fetch active presets from `/api/churches/[churchId]/presets`; render as a `<select>`; when a preset is selected, `serviceType`, `defaultTime`, and `choirRequirement` become read-only preview text.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(ui): service creation form adds preset dropdown under feature flag"
```

### Task 6.7: Music list PDF — honour `musicListFieldSet`

**Files:**
- Modify: `src/lib/pdf/music-list/build-music-list-data.ts`
- Modify: `src/lib/pdf/music-list/components/service-entry.tsx`
- Modify: tests under `src/lib/pdf/music-list/__tests__/`

- [ ] **Step 1: Failing tests** — three scenarios:
  - Service with preset `musicListFieldSet=CHORAL` renders full music section.
  - `HYMNS_ONLY` renders only hymns and organ voluntaries; no anthems/canticles/mass settings.
  - `READINGS_ONLY` renders no music; surfaces collect/readings.

- [ ] **Step 2: Implement**

In `build-music-list-data.ts`, join `services` → `churchServicePresets` to get `musicListFieldSet`. Add that field to each service's data shape.

In `service-entry.tsx`:

```tsx
{service.musicListFieldSet === "READINGS_ONLY" ? (
  <ReadingsBlock service={service} />
) : service.musicListFieldSet === "HYMNS_ONLY" ? (
  service.items.filter((i) => i.slotType === "HYMN" || i.slotType.startsWith("ORGAN_VOLUNTARY"))
    .map((item, i) => <MusicItemRow key={i} item={item} styles={styles} />)
) : (
  service.items.map((item, i) => <MusicItemRow key={i} item={item} styles={styles} />)
)}
```

Add `ReadingsBlock` rendering collect + readings references.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(pdf): music list honours preset musicListFieldSet"
```

### Milestone 6 exit criteria

- With `USE_ROLE_SLOTS_MODEL=true` locally, rota grid and availability widgets work correctly against the new model.
- With flag off, all existing E2E tests pass.
- Unit test suite green.

---

## Milestone 7 — Migration UX + E2E tests

### Task 7.1: Migration banner component

**Files:**
- Create: `src/components/migration-banner.tsx`
- Create: `src/components/__tests__/migration-banner.test.tsx`

- [ ] **Step 1: Failing test** — renders blue info banner when no warn/error logs; amber warn banner when any unresolved WARN; red error banner when any ERROR. Dismiss button hides locally.

- [ ] **Step 2: Implement** a client component that fetches `/api/churches/[churchId]/migration-issues` (next task) and renders one banner variant based on severity counts. Persists dismissal in `localStorage` per-church.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(ui): migration banner component"
```

### Task 7.2: Per-church migration issues endpoint + page

**Files:**
- Create: `src/app/api/churches/[churchId]/migration-issues/route.ts`
- Create: `src/app/(app)/churches/[churchId]/settings/migration-issues/page.tsx`

- [ ] **Step 1: Endpoint** returns `{ counts: { INFO, WARN, ERROR }, entries: [...] }` for the current church (ADMIN-gated). Reads `migrationAuditLog` filtered by `churchId` and `dismissedAt IS NULL`.

- [ ] **Step 2: Page** lists entries with plain-English explanations and remediation links per spec §9.4.

- [ ] **Step 3: Tests** for both.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(ui): per-church migration issues endpoint + page"
```

### Task 7.3: Mount the banner in the app shell

**Files:**
- Modify: the `(app)` layout or the per-church layout

- [ ] **Step 1: Find** the existing layout component that wraps authenticated church pages.

- [ ] **Step 2: Mount** `<MigrationBanner churchId={churchId} />` at the top of the main region. Only render when `useRoleSlotsModel()` is true AND the current church has any unresolved audit log rows.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(ui): mount migration banner in church layout"
```

### Task 7.4: Playwright E2E for the role-configurability flows

**Files:**
- Create: `e2e/role-configurability.spec.ts`

- [ ] **Step 1: Scenarios**

```ts
import { test, expect } from "@playwright/test";

test.describe("role configurability", () => {
  test.skip(!process.env.USE_ROLE_SLOTS_MODEL, "requires feature flag");

  test("admin creates preset, edits slots, and a new service snapshots those slots", async ({ page }) => { /* ... */ });
  test("singer without Organist role sees em-dash on ORGANIST_ONLY service", async ({ page }) => { /* ... */ });
  test("member with multiple roles sees one row with role pills", async ({ page }) => { /* ... */ });
  test("admin edits a preset post-facto; past service slots unchanged", async ({ page }) => { /* ... */ });
  test("admin removes a slot from a single service; existing rota entries are quarantined", async ({ page }) => { /* ... */ });
  test("migration banner appears for an existing church with issues", async ({ page }) => { /* ... */ });
});
```

Use the existing `global-setup.ts` pattern to seed a fixture DB with the scenarios.

- [ ] **Step 2: Implement each scenario.**

- [ ] **Step 3: Commit**

```bash
git commit -am "test(e2e): role configurability scenarios"
```

### Task 7.5: Enable flag in CI for the new E2E spec

**Files:**
- Modify: `playwright.config.ts` (or a new dedicated config)
- Modify: CI workflow if present

- [ ] **Step 1:** Set `USE_ROLE_SLOTS_MODEL=true` when running the new spec. Either a separate Playwright project, or env in the test's `beforeAll`.

- [ ] **Step 2: Commit**

```bash
git commit -am "ci: enable USE_ROLE_SLOTS_MODEL for role configurability E2E"
```

### Milestone 7 exit criteria

- `USE_ROLE_SLOTS_MODEL=true npm run test:e2e -- e2e/role-configurability.spec.ts` passes.
- With flag off, nothing is visually changed.
- Migration banner correctly surfaces WARN/INFO for a fixture church.

---

## Milestone 8 — Constraint tightening and legacy column drop (Phase D)

**Outcome:** `voicePart`, `choirStatus`, `churchServicePatterns.serviceType/time` dropped. Constraints added. This is the point of no return.

### Task 8.1: Pre-flight check script

**Files:**
- Create: `scripts/phase-d-preflight.ts`

- [ ] **Step 1: Implement** a script that:
  - Confirms `migrationPhaseState` has a 'B' row.
  - Confirms `USE_ROLE_SLOTS_MODEL=true` has been in production for ≥ 7 days (audit log entry required).
  - Confirms there are zero untriaged `WARN` / `ERROR` rows in `migrationAuditLog`.
  - Confirms zero `rota_entries` with `catalogRoleId IS NULL`.
  - Confirms every non-ARCHIVED service has `presetId NOT NULL`.
  - Exits 0 if all checks pass, 1 otherwise.

- [ ] **Step 2: Add `package.json` script**:

```json
"db:phase-d-preflight": "tsx scripts/phase-d-preflight.ts",
```

- [ ] **Step 3: Commit**

```bash
git commit -am "chore(migration): Phase D pre-flight check script"
```

### Task 8.2: Schema edits for Phase D constraints

**Files:**
- Modify: `src/lib/db/schema-base.ts`

- [ ] **Step 1: Make `services.presetId` conditionally NOT NULL**

First, update the imports at the top of `src/lib/db/schema-base.ts` to include `check`:

```ts
import { pgTable, pgEnum, uuid, text, integer, boolean, timestamp, date, json, jsonb, uniqueIndex, index, check } from "drizzle-orm/pg-core";
```

Then add the CHECK constraint in the `services` table definition:

```ts
}, (t) => [
  // ... existing indexes ...
  check("services_preset_required_when_active", sql`status = 'ARCHIVED' OR preset_id IS NOT NULL`),
]);
```

- [ ] **Step 2: Make `rota_entries.catalogRoleId` NOT NULL**

Edit the column to `.notNull()`.

- [ ] **Step 3: Change the unique constraint on `rota_entries`**

Replace `uniqueIndex("rota_unique").on(t.serviceId, t.userId)` with `uniqueIndex("rota_unique").on(t.serviceId, t.userId, t.catalogRoleId).where(sql\`quarantined_at IS NULL\`)`.

- [ ] **Step 4: Make `church_service_patterns.presetId` NOT NULL**

Add `.notNull()`.

- [ ] **Step 5: Drop legacy columns** — `churchMemberships.voicePart`, `services.choirStatus`, `services.serviceType` no-op (stays for now as it's informational), `church_service_patterns.serviceType`, `church_service_patterns.time`, `voicePartEnum`, `choirStatusEnum`.

Actually do NOT drop `voicePart` or `choirStatus` in the same PR — do a staged drop:

- **8.2a:** first PR, just the NOT-NULL tightening. `drizzle-kit push` — prompts to add NOT NULL, will fail if any violating rows exist. Use this as a safety check.

- **8.2b:** second PR, drop the legacy columns. Once deployed, app can no longer read them.

- [ ] **Step 6: Commit 8.2a**

```bash
git commit -am "feat(db): Phase D step 1 — tighten NOT NULL constraints"
```

### Task 8.3: Drop legacy columns (8.2b)

**Files:**
- Modify: `src/lib/db/schema-base.ts`

- [ ] **Step 1: Remove the columns**

Delete:
- `voicePart: voicePartEnum("voice_part"),` from `churchMemberships`
- `choirStatus: choirStatusEnum("choir_status")...` from `services`
- `serviceType: serviceTypeEnum("service_type").notNull(),` and `time: text("time"),` from `churchServicePatterns`

Delete unused enums: `voicePartEnum`, `choirStatusEnum`.

- [ ] **Step 2: Grep for references**

Run: `grep -r "voicePart\|choirStatus" src/` — must be zero results that rely on the column still existing. Any leftover references need updating before this PR lands.

- [ ] **Step 3: Run `npm run typecheck` and fix any callers**

- [ ] **Step 4: `npx drizzle-kit push`** — confirm ALTER TABLE DROP COLUMN prompts.

- [ ] **Step 5: Mark Phase D complete**

Add to the migration script (or a one-off script):
```ts
await db.insert(migrationPhaseState).values({ phase: "D" }).onConflictDoNothing();
```

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(db): Phase D step 2 — drop legacy voicePart/choirStatus/pattern-time columns"
```

### Task 8.4: Remove feature-flag branches

**Files:**
- Grep for `useRoleSlotsModel` across the codebase

- [ ] **Step 1: Grep**: `grep -r "useRoleSlotsModel" src/`

- [ ] **Step 2: In each location, remove the flag check** and keep only the new behaviour. Delete `src/lib/feature-flags.ts` and its test.

- [ ] **Step 3: `npm run typecheck` + `npm test` clean.**

- [ ] **Step 4: Commit**

```bash
git commit -am "chore: remove USE_ROLE_SLOTS_MODEL feature flag after Phase D"
```

### Task 8.5: Final cleanup — remove dual-read paths, legacy rota-grid component

**Files:**
- Delete: `src/app/(app)/churches/[churchId]/rota/rota-grid.tsx` (legacy)
- Rename: `rota-grid-v2.tsx` → `rota-grid.tsx`

- [ ] **Step 1: Delete the old file, rename the new one.**

- [ ] **Step 2: Update imports in `page.tsx`.**

- [ ] **Step 3: Commit**

```bash
git commit -am "chore(ui): remove legacy rota grid; new grid is now the default"
```

### Milestone 8 exit criteria

- `npm run typecheck` clean.
- `npm test` clean.
- `npm run test:e2e` clean.
- Schema has no remaining voicePart/choirStatus/pattern-time columns.
- No feature flag references in the code.
- `migrationPhaseState` has both 'B' and 'D' rows.

---

## Final cross-milestone sanity

Run these in order at the end:

```bash
npm run typecheck
npm run lint
npm test
USE_ROLE_SLOTS_MODEL=true npm run test:e2e
```

All green → merge.

---

## Spec coverage traceback

| Spec section | Covered by |
|---|---|
| §5 role catalog | M1 Tasks 1.6, 1.7 |
| §6.1–6.2 role_catalog | M1 Task 1.2 |
| §6.3 church_member_roles | M1 Task 1.3 |
| §6.4–6.6 presets + enums | M1 Tasks 1.1, 1.3 |
| §6.7 preset_role_slots | M1 Task 1.3 |
| §6.8 service_role_slots | M1 Task 1.3 |
| §6.9 patterns modification | M1 Task 1.4; M8 Task 8.3 |
| §6.10 services modification | M1 Task 1.4; M8 Task 8.3 |
| §6.11 rota_entries modification | M1 Task 1.4; M8 Tasks 8.2, 8.3 |
| §6.12 availability (no schema change) | M6 Task 6.2 |
| §7 Phase A | M1 Tasks 1.1–1.5 |
| §7 Phase B (migration script) | M4 Tasks 4.1–4.10 |
| §7 Phase C (code cutover) | M5, M6, M7 (feature-flagged) |
| §7 Phase D (constraints + drops) | M8 Tasks 8.2–8.5 |
| §8.1 new API endpoints | M2 Tasks 2.2–2.6, M3 Tasks 3.2–3.5, 3.7 |
| §8.2 modified endpoints | M3 Task 3.6, M6 Tasks 6.2, 6.3 |
| §8.3 validation rules + error codes | M2 + M3 tests, M6 Task 6.3 |
| §9.1 new pages | M5 Tasks 5.2–5.5 |
| §9.2 modified pages | M5 Task 5.6, M6 Tasks 6.1, 6.4, 6.5, 6.6, 6.7 |
| §9.3 onboarding | Implicit (migration creates three presets per Task 4.5) |
| §9.4 migration UX | M7 Tasks 7.1–7.3 |
| §10 availability filtering | M6 Tasks 6.1, 6.2 |
| §11.1 per-entry validation | M6 Task 6.3 |
| §11.2 service-level validation | Add as part of M7 Task 7.2 page (surface slot fill states) |
| §11.3 publish gate | Soft warning only — surfaces on publish dialog (part of M6 Task 6.6 dialog change) |
| §11.4 per-service quarantine | M3 Task 3.5 (DELETE slot), M6 Task 6.3 |
| §12 testing strategy | Tests are written TDD-first throughout every milestone |
| §14a secondary items coverage | A + B done in M1 catalog seed; I done in M6 Task 6.7; J stored but UI deferred (acknowledged in spec §14a) |
| §15 acceptance criteria | Verified end-to-end in M7 Task 7.4 |
| §16 risks and mitigations | Not code; captured in spec |
| §17 monitoring | Audit log queries implemented in M3 Task 3.7 |
| §18 security | Every endpoint uses `requireChurchRole` / `requireSuperAdmin` |
| §19 performance | Indexes defined in M1 Task 1.3; composite indexes exist |
| §20 alternatives considered | Not code; captured in spec |
