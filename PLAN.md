# Auth Flow Improvement Plan

## Overview

Replace magic-link-only auth with email+password login, a dedicated admin signup/onboarding flow, invite-based member onboarding, role enforcement, and longer sessions.

---

## Phase 1: Supabase Configuration & Schema Changes

### 1a. Supabase Dashboard Settings
- Set JWT expiry / session duration to **30 days** in Supabase dashboard (Authentication > Settings > JWT Expiry)
- Enable email+password sign-up in Supabase (Authentication > Providers > Email)
- Disable magic link / OTP if desired (can be done after password auth is working)
- Configure password strength requirements (min 8 chars)

### 1b. Database Schema Changes

**New `invites` table:**
```
- id (UUID, PK)
- churchId (FK → churches)
- email (text, not null)
- role (member_role enum, default MEMBER)
- token (text, unique, not null) — random secure token
- invitedBy (FK → users)
- expiresAt (timestamp, not null) — 7 days from creation
- acceptedAt (timestamp, nullable)
- createdAt (timestamp)
```

**Add `passwordHash` considerations:** Not needed — Supabase Auth handles password storage. Our `users` table stays as-is.

---

## Phase 2: Admin Signup & Onboarding (New Users)

### 2a. New `/signup` page
- Dedicated signup form: **email, full name, password, confirm password**
- Client-side validation (password min 8 chars, match confirmation)
- Calls `supabase.auth.signUp({ email, password, options: { data: { name } } })`
- Supabase sends a **confirmation email** (built-in)
- On success: show "Check your email to confirm your account" message
- After email confirmation → user lands on `/auth/callback` → redirected to `/onboarding`

### 2b. New `/onboarding` page (church setup wizard)
- Only shown to authenticated users who have **zero church memberships**
- Simple form: church name, diocese (optional), address (optional), CCLI number (optional)
- On submit: creates church + sets user as ADMIN (same as current `/api/churches` POST logic)
- Redirect to `/churches/[churchId]/sundays`
- If user already has a church membership, redirect to `/dashboard`

### 2c. Update auth callback (`/auth/callback/route.ts`)
- After exchanging code for session and upserting user record:
  - Check if user has any church memberships
  - If **no memberships** → redirect to `/onboarding`
  - If **has memberships** → redirect to `/dashboard`

---

## Phase 3: Login Flow (Returning Users)

### 3a. Replace `/login` page
- Replace magic link form with **email + password** form
- Call `supabase.auth.signInWithPassword({ email, password })`
- Show clear error messages for wrong credentials
- Add "Forgot password?" link
- Remove all magic link / OTP code

### 3b. Forgot Password flow
- **Use Supabase built-in** (`supabase.auth.resetPasswordForEmail()`) — simpler, more secure, battle-tested
- New `/forgot-password` page: email input → calls resetPasswordForEmail → shows "check your email"
- New `/reset-password` page: new password + confirm password form
  - Supabase redirects here after clicking reset link (configure redirect URL in Supabase dashboard)
  - Calls `supabase.auth.updateUser({ password })` to set new password

### 3c. Logout
- Add explicit sign-out: `supabase.auth.signOut()`
- Add sign-out button to the app sidebar/header
- Redirect to `/login` after sign-out

---

## Phase 4: Invite Flow (Member Onboarding)

### 4a. Invite Creation (Admin side)
- Update `/api/churches/[churchId]/members` POST route:
  - Instead of creating a placeholder user, create an **invite record** with a secure random token
  - Send invite email via **Resend** (already configured) with link: `/invite/[token]`
  - Also support generating a **shareable link** (same `/invite/[token]` URL) that admin can copy and send manually
- Update the invite form UI to show both options: "Send email invite" button + "Copy invite link" button

### 4b. Invite Acceptance (Member side)
- **Token-based** (better than Supabase invite — gives us full control over the UX, no magic link dependency):
- New `/invite/[token]` page:
  1. Validate token (exists, not expired, not already accepted)
  2. Show church name and role they're being invited as
  3. If user is **not authenticated**: show signup form (name, password) — creates Supabase account + DB user
  4. If user is **already authenticated**: show "Accept invite" button — just creates the membership
  5. On accept: create `churchMembership`, mark invite as accepted, redirect to church dashboard

### 4c. Clean up old invite system
- Remove the `pending-{timestamp}` placeholder user pattern from the members API
- Migrate any existing pending users to invite records (migration script)

---

## Phase 5: Role-Based Access Control (RBAC)

### 5a. Auth helper utilities
Create `src/lib/auth/permissions.ts`:
```typescript
// Helper to get current user + their role in a specific church
async function requireAuth(): Promise<User>
async function requireChurchRole(churchId: string, minRole: 'MEMBER' | 'EDITOR' | 'ADMIN'): Promise<{ user, membership }>
```

Role hierarchy: **ADMIN > EDITOR > MEMBER**

### 5b. API Route Enforcement

| Action | Minimum Role |
|--------|-------------|
| View church content (services, rota, repertoire) | MEMBER |
| Edit services, music slots, rota entries | EDITOR |
| Manage members (invite, remove, change role) | ADMIN |
| Edit church settings | ADMIN |
| Delete church | ADMIN |

Apply `requireChurchRole()` to every API route under `/api/churches/[churchId]/*`.

### 5c. UI Visibility
- Pass user's role through church layout to child pages
- Conditionally render:
  - **Settings tab**: ADMIN only
  - **Members management (invite/remove)**: ADMIN only
  - **Edit buttons on services/music**: EDITOR+ only
  - **Rota management**: EDITOR+ only
  - Members see read-only views + can manage their own availability

---

## Phase 6: Middleware & Route Protection Updates

### 6a. Update middleware (`src/middleware.ts`)
- Allow unauthenticated access to: `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/invite/[token]`, `/auth/*`
- All other routes require authentication
- Redirect authenticated users away from `/login` and `/signup` to `/dashboard`

### 6b. Update app layout (`src/app/(app)/layout.tsx`)
- Keep server-side auth check
- Add redirect to `/onboarding` for users with no church memberships

---

## File Changes Summary

### New files:
- `src/app/(auth)/signup/page.tsx` — Admin signup form
- `src/app/(auth)/forgot-password/page.tsx` — Forgot password page
- `src/app/(auth)/reset-password/page.tsx` — Reset password page
- `src/app/(app)/onboarding/page.tsx` — Church setup wizard (post-signup)
- `src/app/(auth)/invite/[token]/page.tsx` — Invite acceptance page
- `src/lib/auth/permissions.ts` — RBAC helpers
- `src/lib/db/schema.ts` — Add `invites` table (edit existing)
- New Drizzle migration for `invites` table

### Modified files:
- `src/app/(auth)/login/page.tsx` — Replace magic link with email+password
- `src/app/auth/callback/route.ts` — Add onboarding redirect logic
- `src/middleware.ts` — Update allowed routes
- `src/app/(app)/layout.tsx` — Add onboarding redirect
- `src/app/(app)/churches/[churchId]/members/invite-form.tsx` — Update invite UI
- `src/app/api/churches/[churchId]/members/route.ts` — Replace placeholder users with invite system
- All API routes under `/api/churches/[churchId]/*` — Add role checks
- `src/app/(app)/churches/[churchId]/layout.tsx` — Pass role to children, role-based nav

### Removed:
- Magic link / OTP code from login page
- Placeholder user creation pattern from members API

---

## Implementation Order

1. **Phase 1** — Schema + Supabase config (foundation)
2. **Phase 2** — Signup + onboarding (admin can create account)
3. **Phase 3** — Login + forgot password + logout (returning users can sign in)
4. **Phase 4** — Invite flow (members can join)
5. **Phase 5** — RBAC (enforce permissions)
6. **Phase 6** — Middleware cleanup (final polish)

Each phase is independently deployable and builds on the previous one.
