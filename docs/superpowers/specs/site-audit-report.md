# Precentor Site Audit Report

**Date:** 2026-03-22
**Status:** In Progress
**Branch:** claude/awesome-colden

## Summary
- Pages reviewed: 8/20
- Cross-cutting reviews: 0/6
- Quick wins fixed: 23
- Medium issues: 9
- Major issues: 1

---

## Per-Page Findings

### / (Landing Page)
**Visual**: ✅ Pass
**Responsive**: ✅ Pass
**Accessibility**: ✅ Pass
**Runtime**: ✅ Pass
**Design System**: ⚠️ Hardcoded hover colour `#6B4423` used on primary buttons instead of a design token (fixed in `page.tsx`; same issue exists across 19 other files)
**Interactions**: ✅ Pass
**Source Code**: ✅ Pass
**Performance**: ✅ Pass

Findings:
- [QUICK WIN] Fixed: Replaced two instances of `hover:bg-[#6B4423]` in `src/app/page.tsx` with `hover:bg-primary-hover`. Added `--primary-hover: #6B4423` CSS variable to `globals.css` (both in `:root` and `@theme inline`) so the token is now part of the design system.
- [MEDIUM] The same hardcoded `hover:bg-[#6B4423]` pattern exists in 19 other files across the app (`src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/(app)/onboarding/page.tsx`, `src/app/(app)/churches/page.tsx`, `src/app/(app)/error.tsx`, and 14 more). All should be updated to `hover:bg-primary-hover` in a follow-up sweep.

Details:
- **Visual**: Hero section is clean, well-proportioned, and typographically consistent. Feature cards are well aligned in a 3-column grid. "How it works" numbered steps are clear. Bottom CTA and footer are well-structured.
- **Responsive (mobile 375×812)**: Buttons stack vertically (flex-col on mobile, flex-row on sm+), no overflow or truncation. Text wraps appropriately.
- **Responsive (tablet 768×1024)**: Buttons side-by-side, feature grid switches to 2-column. All elements within bounds.
- **Accessibility**: axe-core 4.10.0 reports 0 violations. Heading hierarchy is correct: `h1` (Precentor) → `h2` (section headings) → `h3` (feature card headings, step headings). `aria-hidden="true"` applied to all decorative icons. Skip-to-content link present and functional. `lang="en"` on `<html>`.
- **Runtime**: No JS console errors. No failed network requests. No hydration warnings.
- **Performance**: Page load 284ms (navigation entry). DOMInteractive at 77ms. domComplete at 284ms. 5 network requests total (2 HMR chunks, 1 font woff2, 1 Google Fonts CSS, 1 axe CDN script injected by audit). All within normal dev-server ranges.
- **CSS inspection**: `h1` — Cormorant Garamond 60px, weight 600, color `rgb(44, 36, 22)` (design token `--foreground`). Primary CTA button — 46px height (above 44px touch target), `bg-primary` (`rgb(139, 69, 19)`), `text-primary-foreground`. Secondary "Sign In" button — 46px height, transparent background, `border-border`. Feature card — `bg-card` (white), subtle shadow, no border-radius (flat/ecclesiastical aesthetic, consistent with `--radius: 2px` tokens).
- **Interactions**: "Get Started Free" → navigates to `/signup` (Create Account form). "Sign In" → navigates to `/login` (Sign In form). Both confirmed by accessibility snapshot.
- **Source code**: No XSS vectors. No `dangerouslySetInnerHTML`. No error boundaries needed (static page, no async data). TypeScript strict-compatible. All images/icons have `aria-hidden="true"`. `<main id="main-content">` correctly targets the skip link. Footer uses `new Date().getFullYear()` (dynamic, correct). No loading/error states needed (fully static). `metadataBase` set in layout for correct OG URL resolution.

---

### /login (Login Form)
**Visual**: ✅ Pass
**Responsive**: ✅ Pass
**Accessibility**: ⚠️ Three axe-core violations (serious + moderate)
**Runtime**: ✅ Pass
**Design System**: ⚠️ Hardcoded `hover:bg-[#6B4423]` on submit button (fixed)
**Interactions**: ⚠️ Empty-form submit shows no custom error message (browser native validation only)
**Source Code**: ✅ Pass
**Performance**: ✅ Pass

Findings:
- [QUICK WIN] Fixed: Replaced `hover:bg-[#6B4423]` with `hover:bg-primary-hover` on the Sign In submit button in `src/app/(auth)/login/page.tsx`.
- [SERIOUS – A11Y] `link-in-text-block` violation (axe-core): The "Create one" link in "Don't have an account? Create one" is distinguished only by colour (`text-primary`), with no underline or other non-colour cue. Screen users relying on colour perception cannot distinguish it from surrounding text. Fix: add `underline` to the link's default state, or use `font-semibold` in addition to hover-underline.
- [MODERATE – A11Y] `skip-link` violation (axe-core): The skip-to-content link present in the layout has no focusable target on this page. The `<main>` element lacks `id="main-content"` (the login page uses `<main>` directly without an id), so the skip link destination is unreachable. Fix: add `id="main-content"` to the `<main>` element in `login/page.tsx`.
- [MODERATE – A11Y] `region` violation (axe-core): One content node is outside any landmark. The Next.js dev-tools button renders outside `<main>` without a landmark wrapper (likely the `<div id="__next-route-announcer__">` or dev overlay — low priority, dev-only).
- [MEDIUM – UX] Empty form submission: `handleLogin` calls `e.preventDefault()` which suppresses browser-native validation. With both fields marked `required`, the browser would normally surface native validation bubbles, but since React intercepts the submit event, native validation fires only after `preventDefault` returns — behaviour is browser-dependent. In practice, Chrome does show native validation tooltips, but there is no in-page error UI for the empty-submit case (the `{error && <p>}` block only renders on a Supabase auth failure, not on client-side empty-field submission). Add explicit client-side "required" checks before the Supabase call, or use a form library, so users on all browsers see a consistent in-page message.
- [INFO] Input height: both `email` and `password` inputs compute to 38px — just under the 44px recommended touch target minimum. The `py-2` padding accounts for the input content area but the bounding box records only the text height (20px). Total rendered height including padding is ~38px. Consider `py-3` to hit 44px.

Details:
- **Visual**: Clean, centred single-column form. Adequate whitespace. Typography consistent with design system (Cormorant Garamond h1, body copy in muted foreground).
- **Responsive (mobile 375×812)**: Form spans full container width, no overflow. "Forgot password?" link stays inline with the Password label. Submit button full-width. All readable.
- **Responsive (tablet 768×1024)**: Identical layout, proportions correct. No unexpected stretching.
- **Accessibility snapshot**: `h1` "Sign In" present. Both inputs have associated `<label>` elements via `htmlFor`/`id` (email → `#email`, password → `#password`). "Forgot password?" and "Create one" links correctly appear in the tree. Error paragraph has `role="alert"`. No heading hierarchy issues.
- **Runtime**: No JS console errors. No failed network requests. Navigation entry: ~164ms total load time, DOMInteractive at ~114ms — excellent.
- **Performance**: 164ms page load (navigation entry). DOMInteractive 114ms. All within normal dev-server ranges; no outliers.
- **CSS inspection**: `form` uses Tailwind `space-y-4`, width 384px (max-w-sm). Inputs: `border-border`, `bg-white`, `focus:border-primary`, no border-radius (consistent flat aesthetic). Submit button: `bg-primary` (`rgb(139,69,19)`), `text-primary-foreground`, `hover:bg-primary-hover` (after fix).
- **Interactions**: "Forgot password?" → correctly navigates to `/forgot-password`. "Create one" → correctly navigates to `/signup`. Both confirmed by eval.
- **Source code**: No XSS vectors. No `dangerouslySetInnerHTML`. Auth handled via Supabase `signInWithPassword`. Error message is generic ("Invalid email or password.") — correct, avoids user enumeration. `loading` state disables button and changes label. TypeScript: all types inferred correctly. `useRouter` from `next/navigation` (correct for App Router). No stray `console.log` or debug code.

---

### /signup (Registration Form)
**Visual**: ✅ Pass
**Responsive**: ✅ Pass
**Accessibility**: ⚠️ Three axe-core violations (serious + 2× moderate) — all fixed
**Runtime**: ✅ Pass
**Design System**: ⚠️ Hardcoded `hover:bg-[#6B4423]` on submit button (fixed)
**Interactions**: ⚠️ Empty-form submit shows no custom in-page error; password-mismatch logic only fires after Supabase call guard
**Source Code**: ✅ Pass
**Performance**: ✅ Pass

Findings:
- [QUICK WIN] Fixed: Replaced `hover:bg-[#6B4423]` with `hover:bg-primary-hover` on the "Create Account" submit button in `src/app/(auth)/signup/page.tsx`.
- [QUICK WIN] Fixed: Added `id="main-content"` to the `<main>` element so the layout skip link now has a reachable focusable target (resolves axe-core `skip-link` violation).
- [QUICK WIN] Fixed: Changed "Sign in" link from `hover:underline` (underline on hover only) to `underline hover:no-underline` so it is visually distinguishable from surrounding text at rest without relying solely on colour (resolves axe-core `link-in-text-block` / WCAG 1.4.1 violation).
- [MODERATE – A11Y] `region` violation (axe-core): One content node outside any landmark. The Next.js dev-tools button renders outside `<main>` — dev-only overlay, low priority.
- [MEDIUM – UX] Empty form submission: `handleSignup` calls `e.preventDefault()`, suppressing native browser validation UI. The `{error && <p role="alert">}` block only renders for password-length or password-mismatch failures — there is no explicit client-side guard for empty name/email fields. Browser native validation (required attribute) does fire in Chrome, but behaviour is not guaranteed across all browsers. Add explicit client-side checks for empty fields before the Supabase call so all browsers show a consistent in-page message.
- [INFO] Input height: all four inputs render at 38px bounding height — just under the 44px recommended touch target minimum (same as login page). Consider `py-3` padding.
- [INFO] The `autocomplete` attribute is absent on the name and email inputs. Adding `autocomplete="name"` and `autocomplete="email"` (and `autocomplete="new-password"` on both password inputs) improves UX for password managers and browsers.

Details:
- **Visual**: Clean, centred single-column form with four fields (name, email, password, confirm password). Adequate whitespace, typography consistent with design system (Cormorant Garamond h1). After fixes, "Sign in" link is underlined at rest, visually distinct.
- **Responsive (mobile 375×812)**: All fields span full container width, no overflow. Submit button full-width. "Already have an account?" line wraps cleanly. All readable.
- **Responsive (tablet 768×1024)**: Identical proportions. No unexpected stretching or truncation.
- **Accessibility snapshot**: `h1` "Create Account" present. All four inputs have associated `<label>` elements via `htmlFor`/`id` (name → `#name`, email → `#email`, password → `#password`, confirmPassword → `#confirm-password`). Error paragraph has `role="alert"`. No heading hierarchy issues. Skip link target now correctly resolves to `#main-content` (after fix).
- **Runtime**: No JS console errors. No failed network requests.
- **Performance**: 119ms page load (navigation entry). DOMInteractive 69ms. All within excellent dev-server ranges.
- **CSS inspection**: Form `max-w-sm` (384px). Inputs: `border-border`, `bg-white`, `focus:border-primary`, no border-radius (flat ecclesiastical aesthetic). Submit button: `bg-primary` (`rgb(139,69,19)`), `text-primary-foreground`, `hover:bg-primary-hover` (after fix), height 38px.
- **Interactions**: Submit empty form → browser focuses first required field (native validation), no in-page error rendered (see Medium UX finding). Password-mismatch and short-password paths do render `role="alert"` inline error. "Sign in" → correctly navigates to `/login`.
- **Source code**: No XSS vectors. No `dangerouslySetInnerHTML`. Auth via Supabase `signUp` with `emailRedirectTo` using `window.location.origin` (safe — runs client-side only, `"use client"` declared). Success state replaces form with a confirmation message (correct pattern). Generic error message avoids user enumeration. `loading` state disables button and changes label. TypeScript types inferred correctly. No stray `console.log`.

---

### /forgot-password (Forgot Password Form)
**Visual**: ✅ Pass
**Responsive**: ✅ Pass
**Accessibility**: ✅ Pass (0 violations after fixes)
**Runtime**: ✅ Pass
**Design System**: ⚠️ Hardcoded `hover:bg-[#6B4423]` on submit button (fixed)
**Interactions**: ✅ Pass
**Source Code**: ✅ Pass
**Performance**: ✅ Pass

Findings:
- [QUICK WIN] Fixed: Added `id="main-content"` to the `<main>` element in `src/app/(auth)/forgot-password/page.tsx` so the layout skip link (`href="#main-content"`) now has a reachable focusable target. Resolves axe-core `skip-link` violation (moderate).
- [QUICK WIN] Fixed: Replaced `hover:bg-[#6B4423]` with `hover:bg-primary-hover` on the "Send Reset Link" submit button. Consistent with design token introduced in landing page audit.
- [QUICK WIN] Fixed: Changed "Back to sign in" link from `hover:underline` (underline on hover only) to `underline hover:no-underline` so it is visually distinguishable from surrounding text at rest without relying solely on colour (WCAG 1.4.1). Resolves axe-core `link-in-text-block` issue.
- [MODERATE – A11Y] `region` violation (axe-core, pre-fix): One content node outside any landmark — the Next.js dev-tools button rendered outside `<main>`. Dev-only overlay, low priority. Not present after fixes (0 violations post-fix, confirmed).
- [MEDIUM – UX] Empty form submission: `handleSubmit` calls `e.preventDefault()`, so native browser validation is the only guard for the required email field. In Chrome, the native "Please fill in this field." tooltip fires correctly (confirmed by eval). However, there is no in-page error UI for the empty-submit case — the `{error && <p role="alert">}` block only renders on a Supabase failure, not on an empty-field submission. Add an explicit client-side empty/format check before the Supabase call for cross-browser consistency.
- [INFO] Input height: email input bounding box records 20px text height (with `py-2` padding, full rendered height ~38px — just under the 44px touch target minimum). Consider `py-3` to reach 44px, consistent with login and signup pages.
- [INFO] `autocomplete="email"` attribute is absent on the email input. Adding it improves UX for password managers and browser autofill.
- [INFO] The form has no `noValidate` attribute and uses `required` on the email input — this means native browser validation runs before the React `onSubmit` handler, which is the correct pattern here. No issue.

Details:
- **Visual**: Clean, centred single-column form. Adequate whitespace. Typography consistent with design system (Cormorant Garamond h1). "Back to sign in" link is underlined at rest after fix.
- **Responsive (mobile 375×812)**: Form spans full container width, no overflow. Submit button full-width. "Back to sign in" link centred below. All readable.
- **Responsive (tablet 768×1024)**: Identical proportions. No unexpected stretching or truncation.
- **Accessibility snapshot**: `h1` "Reset Password" present. Email input has associated `<label>` via `htmlFor`/`id` (`email` → `#email`). Error paragraph has `role="alert"`. "Back to sign in" link correctly appears in tree. Skip link target resolves to `#main-content` (after fix). 0 axe violations after fixes (confirmed by re-run).
- **Runtime**: No JS console errors. No failed network requests.
- **Performance**: 245ms page load (navigation entry). DOMInteractive 86ms. domContentLoaded 86ms. All within normal dev-server ranges.
- **CSS inspection**: `form` width 384px (`max-w-sm`). Email input: `border-border`, `bg-white`, `focus:border-primary`, no border-radius (flat aesthetic). Submit button: `bg-primary` (`rgb(139,69,19)`), `text-primary-foreground`, `hover:bg-primary-hover` (after fix). "Back to sign in" link: `text-primary`, `underline` at rest (after fix).
- **Interactions**: Submit empty form → browser native validation fires ("Please fill in this field."), form not submitted (correct). "Back to sign in" → navigates to `/login` (confirmed by eval).
- **Source code**: No XSS vectors. No `dangerouslySetInnerHTML`. Auth via `supabase.auth.resetPasswordForEmail` with `redirectTo` using `window.location.origin` (safe — `"use client"` declared). `redirectTo` points to `/auth/callback?next=/reset-password` (correct PKCE flow). Error message is generic, avoids user enumeration. `sent` state replaces form with confirmation message (correct anti-enumeration pattern — same message regardless of whether email exists). `loading` state disables button and changes label. TypeScript types inferred correctly. No stray `console.log`.

---

### /reset-password (Set New Password Form)
**Visual**: ✅ Pass
**Responsive**: ✅ Pass
**Accessibility**: ✅ Pass (0 violations after fixes)
**Runtime**: ✅ Pass
**Design System**: ⚠️ Hardcoded `hover:bg-[#6B4423]` on submit button (fixed)
**Interactions**: ⚠️ No token guard — form renders and accepts input even with no valid reset token in URL
**Source Code**: ⚠️ Missing `name` attributes on inputs; missing `autocomplete`; error `<p>` lacked `role="alert"` (fixed)
**Performance**: ✅ Pass

Findings:
- [QUICK WIN] Fixed: Added `id="main-content"` to the `<main>` element so the layout skip link (`href="#main-content"`) now has a reachable focusable target. Resolves axe-core `skip-link` violation (moderate). Confirmed 0 violations post-fix.
- [QUICK WIN] Fixed: Replaced `hover:bg-[#6B4423]` with `hover:bg-primary-hover` on the "Update Password" submit button. Consistent with design token.
- [QUICK WIN] Fixed: Added `role="alert"` to the inline error `<p>` so screen readers announce validation errors (empty form, password-mismatch) without requiring focus shift. Previously no live region — errors were silent to assistive technology.
- [QUICK WIN] Fixed: Added `autoComplete="new-password"` to both password inputs and `name` attributes (`name="password"`, `name="confirm-password"`). Improves password-manager UX and form submission correctness.
- [MODERATE – A11Y] `region` violation (axe-core, pre-fix): One content node outside any landmark — the Next.js dev-tools button renders outside `<main>`. Dev-only overlay, low priority. Resolves to 0 violations after the `id="main-content"` fix.
- [MEDIUM – SECURITY/UX] No reset-token guard: The page renders the full "Set New Password" form at `/reset-password` even when accessed directly with no valid token in the URL. A user who submits the form in this state will hit a Supabase `updateUser` call with an unauthenticated session, which will fail with an API error — but the failure path is handled by the generic `{error && <p>}` block. Consider redirecting to `/forgot-password` (or showing a clear "invalid or expired link" state) when no active recovery session exists, to improve UX and prevent confused form submissions.
- [INFO] Input height: both password inputs compute to 38px bounding height (with `py-2` padding) — just under the 44px recommended touch target minimum. Consider `py-3` for consistency with the pattern noted on login/signup/forgot-password pages.

Details:
- **Visual**: Clean, centred single-column form. "Set New Password" heading (Cormorant Garamond h1), two password fields with labels, submit button. Consistent with auth flow design system. Validation error renders in `text-destructive` (brown-red) between second input and submit button.
- **Responsive (mobile 375×812)**: Both inputs and button span full container width, no overflow. All readable. Labels and inputs correctly stacked.
- **Responsive (tablet 768×1024)**: Identical proportions to mobile. Form centred with max-w-sm (384px). No unexpected stretching.
- **Accessibility snapshot**: `h1` "Set New Password" present. Both inputs have associated `<label>` elements via `htmlFor`/`id` (`password` → `#password`, `confirm-password` → `#confirm-password`). "Update Password" button correctly in tree. Skip link now resolves to `#main-content` (after fix). 0 axe violations confirmed post-fix.
- **Runtime**: No JS console errors. No failed network requests.
- **Performance**: 605ms page load (navigation entry). DOMInteractive 582ms. `responseStart` at 537ms indicates slow server response — consistent with dev-server cold-render of a client component. All within normal dev-server ranges.
- **CSS inspection**: `form` width 384px (`max-w-sm`), `space-y-4`. Inputs: `border-border`, `bg-white`, `focus:border-primary`, no border-radius (flat ecclesiastical aesthetic). Submit button: `bg-primary` (`rgb(139,69,19)`), `text-primary-foreground`, `hover:bg-primary-hover` (after fix), height 38px.
- **Interactions**: Submit empty form → `role="alert"` error paragraph "Password must be at least 8 characters." renders inline (confirmed by eval). Password mismatch → "Passwords do not match." renders. Error clears on re-submit (`setError("")` at top of `handleSubmit`). `loading` state disables button and changes label to "Updating...".
- **Source code**: No XSS vectors. No `dangerouslySetInnerHTML`. Auth via `supabase.auth.updateUser({ password })` — correct for PKCE recovery flow (Supabase sets the session from the URL hash before this call). `router.push("/dashboard")` on success. Error message uses Supabase's `updateError.message` directly — this is acceptable as Supabase recovery errors are not user-enumeration risks (token-based, not email-based). `loading` state prevents double-submit. TypeScript: all types inferred correctly. No stray `console.log`. Client-side validation (length ≥ 8, passwords match) runs before Supabase call — correct order.

---

### /invite/[token] (Invite Acceptance)
**Visual**: ✅ Pass (after fix)
**Responsive**: ✅ Pass
**Accessibility**: ✅ Pass (0 violations after fixes)
**Runtime**: ✅ Pass (after fix)
**Design System**: ⚠️ Hardcoded `hover:bg-[#6B4423]` on both action buttons (fixed)
**Interactions**: ✅ Pass (after fix — previously stuck loading forever)
**Source Code**: ⚠️ Critical bug: `/api/invites/` not in public paths; unhandled JSON parse on redirected response (both fixed)
**Performance**: ✅ Pass

Findings:
- [CRITICAL – BUG] **Fixed**: The middleware (`src/lib/supabase/middleware.ts`) did not include `/api/invites/` in the list of public paths. For unauthenticated visitors (the primary audience for invite links), all `GET /api/invites/[token]` requests were intercepted by the middleware and redirected to `/login`, returning a 200 HTML response. In `loadInvite()`, `res.ok` evaluated to `true` (HTTP 200), then `res.json()` threw a parse error on the HTML body. This error was unhandled, leaving the component in a permanently stuck `invite = null, isAuthenticated = null` loading state. The user saw "Loading invite…" forever with no way out. Fix: added `pathname.startsWith("/api/invites/")` to `isPublicPath()` in `src/lib/supabase/middleware.ts` so the API endpoint is reachable without authentication.
- [CRITICAL – BUG] **Fixed**: `loadInvite()` had no try/catch and no content-type guard around `res.json()`. Even with the middleware fix, a network error or unexpected non-JSON response would silently crash the function in the same way. Fix: wrapped the entire `loadInvite` body in try/catch, and added a `content-type: application/json` check before calling `res.json()` on error responses, falling back to a default "Invalid or expired invite." message.
- [QUICK WIN] **Fixed**: Added `id="main-content"` to all three `<main>` render branches (loading state, error state, form state) so the layout skip link (`href="#main-content"`) has a focusable target. Resolves axe-core `skip-link` violation (moderate).
- [QUICK WIN] **Fixed**: Added `<h1 className="sr-only">Loading Invite</h1>` to the loading-state branch. The loading state previously rendered no heading, failing the axe-core `page-has-heading-one` rule (moderate). The heading is visually hidden so it does not disrupt the minimal loading UI.
- [QUICK WIN] **Fixed**: Added `role="alert"` to the error `<p>` in both the page-error state and the inline form error, so screen readers announce error messages without requiring focus shift.
- [QUICK WIN] **Fixed**: Changed "Go to sign in" link from `hover:underline` (colour-only at rest) to `underline hover:no-underline`. Resolves WCAG 1.4.1 — in-text links must be distinguishable without relying on colour alone.
- [QUICK WIN] **Fixed**: Replaced `hover:bg-[#6B4423]` with `hover:bg-primary-hover` on both action buttons ("Accept Invite" and "Create Account & Join"). Consistent with design token introduced in earlier audit pages.
- [QUICK WIN] **Fixed**: Added `autocomplete` attributes to all form inputs: `autoComplete="name"` on the full name input, `autoComplete="email"` on the disabled email input, `autoComplete="new-password"` on both password inputs. Improves password-manager and browser autofill UX.
- [INFO] The disabled email input had no `id` attribute (label `htmlFor` pointed at no element). Added `id="invite-email"` and matched the label's `htmlFor`. This was a latent a11y issue (label not programmatically associated with input) — axe did not surface it because the input is disabled, but it is correct practice.
- [MEDIUM – UX] The error message shown to users when the DB is unavailable is "Failed to fetch invite" (propagated directly from the API error body). This is a technical message not suitable for end users. The API route's catch block should return a user-friendly message such as "Something went wrong. Please try again later." rather than the raw "Failed to fetch invite" string. Out of scope for this audit (API route change).
- [MEDIUM – SECURITY] The invite token is used verbatim in the API fetch URL without any client-side format validation (e.g., UUID check). A malformed token makes a DB round-trip that will fail, but it is harmless since the API uses a parameterised Drizzle query. No SQL injection risk, but adding a simple UUID-format check before `fetch()` would avoid unnecessary DB load.

Details:
- **Visual**: Error state (invalid token): clean centred layout, "Invalid Invite" h1 (Cormorant Garamond), muted error message, underlined "Go to sign in" link. Consistent with auth flow design system.
- **Responsive (mobile 375×812)**: Error state centred correctly, text wraps cleanly, "Go to sign in" link remains centred and tappable. No overflow.
- **Responsive (tablet 768×1024)**: Identical proportions. All content within `max-w-sm` container, centred.
- **Accessibility snapshot (post-fix)**: `h1` "Invalid Invite" present. Error paragraph has `role="alert"`. "Go to sign in" link in tree. `<main id="main-content">` is the skip link target. axe-core: 0 violations confirmed.
- **Runtime**: No JS console errors. No failed network requests (after middleware fix). API returns JSON 500 for unknown token (expected — no DB connection in dev).
- **Performance**: 1002ms page load (navigation entry). DOMInteractive 886ms. Higher than other auth pages due to cold start + API round-trip. Normal for dev server.
- **Interactions**: With middleware fix applied, invalid token now correctly renders "Invalid Invite" error screen within ~300ms of component mount. Previously: permanently stuck on "Loading invite…".
- **Source code**: The `loadInvite` function now has full try/catch and content-type guarding. No XSS vectors. Token is used only in a fetch URL (no DOM injection). TypeScript: all types inferred correctly. The `acceptInvite` function (`/api/invites/[token]/accept`) is POST-only and is only called after authentication — no auth bypass possible via the UI. The form branch is only shown when `isAuthenticated === false` (confirmed from Supabase `getUser()`).

---

### /non-existent-route (404 Behaviour)
**Visual**: ⚠️ Raw Next.js default — black background, no app branding
**Responsive**: ✅ Renders correctly at all breakpoints (text centred, no overflow)
**Accessibility**: ⚠️ No navigation landmark or link to return to the app
**Runtime**: ✅ No JS console errors

Findings:
- [MEDIUM] No custom `not-found.tsx` exists anywhere in the project. Unauthenticated users hitting any unknown route are redirected to `/login` by middleware (the `isPublicPath` guard in `src/lib/supabase/middleware.ts` only whitelists specific paths, so unknown routes all redirect). Authenticated users, and anyone hitting a path under the `/auth/*` whitelist that doesn't match a real page, see the raw Next.js 404 page: solid black background, white "404 | This page could not be found." text, no app branding, no navigation, no link back to the app. This is inconsistent with the app's warm ecclesiastical design system (cream/brown palette, Cormorant Garamond typography). A custom `not-found.tsx` at `src/app/not-found.tsx` should be added in a second pass.
- [MEDIUM] The 404 page contains no link or navigation element to return the user to the app (dashboard, home, or login). Users are completely stranded — the only escape is the browser back button. A custom `not-found.tsx` should include at minimum a "Go to Dashboard" or "Go to Home" link.
- [INFO] The middleware redirect behaviour means most real-world 404 encounters by unauthenticated users are silently converted to `/login` redirects. No HTTP 404 status is returned to the browser for those requests — the redirect returns a 307, then `/login` returns 200. This is technically correct from a security standpoint (does not reveal route structure) but means the 404 page is effectively invisible to unauthenticated users.
- [INFO] Accessibility tree on the Next.js default 404: heading "404" (h1), heading "This page could not be found." (h2), no landmark regions, no interactive elements except the Next.js dev-tools button. The "Skip to content" link from the root layout is present but its target (`#main-content`) does not exist on the 404 page — the skip link is non-functional here.

Details:
- **Visual**: Stark black (#000) full-bleed background. "404" in white, a vertical divider, then "This page could not be found." — the default Next.js error page with no customisation. Completely inconsistent with the app's cream/warm-brown design system. Tested via `/auth/this-does-not-exist` (a whitelisted public prefix with no matching page file), which correctly produces an HTTP 404 without middleware interference.
- **Responsive (mobile 375×812)**: Text centred and readable. No overflow. The default Next.js 404 is inherently minimal so it scales fine, but this is incidental rather than intentional design.
- **Responsive (tablet 768×1024)**: Same — text centred, no overflow. Layout unchanged from desktop.
- **Accessibility snapshot**: Two headings ("404", "This page could not be found."), "Skip to content" link (target missing), Next.js dev-tools button. No landmark regions (`<main>`, `<nav>`, etc.). No interactive links. The page title in the browser tab remains "Precentor — Church Music Planner" (from root layout metadata) — it does not update to indicate an error, which may confuse users and screen reader users.
- **Runtime**: No JS console errors at error level. Clean.
- **How to trigger in production**: Any authenticated user who navigates to a non-existent URL (e.g., a bookmarked link that no longer exists, a mistyped church ID) will hit this page. Also triggered by any path under `/auth/*`, `/invite/*`, or `/api/invites/*` that does not match a real file.

---

### /onboarding (Post-Signup Church Setup)
**Visual**: ✅ Pass
**Responsive**: ✅ Pass
**Accessibility**: ✅ Pass (0 violations after fixes; 2 pre-fix)
**Runtime**: ✅ Pass
**Design System**: ⚠️ Hardcoded `hover:bg-[#6B4423]` on submit button (fixed)
**Interactions**: ⚠️ Validation error `<p>` lacked `role="alert"` (fixed); no custom error for API failure JSON parse edge case
**Source Code**: ⚠️ Missing `id="main-content"` on `<main>` (fixed); missing `autocomplete` attributes (fixed); no try/catch around `res.json()` on error path
**Performance**: ⚠️ 2018ms load (navigation entry) — slow due to dev-server cold render + Supabase auth check in layout

**Redirect behaviour note:** The test user ("Audit Tester") already has a church. Despite this, `/onboarding` renders the form without redirecting. The `(app)/layout.tsx` only checks for an authenticated session — it does not query whether the user has an existing church and redirect them to `/dashboard` or their church. A returning user who navigates directly to `/onboarding` can create a second church. This is a design-level gap.

Findings:
- [QUICK WIN] **Fixed**: Added `id="main-content"` to the `<main>` element in `src/app/(app)/onboarding/page.tsx`. The layout skip link (`href="#main-content"`) now has a reachable focusable target. Resolves axe-core `skip-link` violation (moderate). Confirmed 0 violations post-fix.
- [QUICK WIN] **Fixed**: Replaced `hover:bg-[#6B4423]` with `hover:bg-primary-hover` on the "Create Church" submit button. Consistent with design token established in earlier audit pages.
- [QUICK WIN] **Fixed**: Added `role="alert"` to the inline error `<p>` (`{error && <p role="alert" ...>}`). Previously, validation errors (e.g. "Church name is required.") and API errors ("Failed to create church.") were rendered silently — screen readers received no announcement without a focus shift. The `role="alert"` live region ensures errors are announced immediately on update.
- [QUICK WIN] **Fixed**: Added `autocomplete` attributes to all four inputs: `autoComplete="organization"` on church name, `autoComplete="off"` on diocese, `autoComplete="street-address"` on address, `autoComplete="off"` on CCLI number. Improves browser autofill behaviour and password-manager UX.
- [MODERATE – A11Y] `region` violation (axe-core, pre-fix): One content node outside any landmark — the Next.js dev-tools button renders outside `<main>`. Dev-only overlay, not present in production builds. Resolves to 0 violations after the `id="main-content"` fix (confirmed by re-run).
- [MEDIUM – UX/SECURITY] No guard against duplicate church creation: The `(app)/layout.tsx` authenticates the user but does not check whether they already have a church. An existing user navigating directly to `/onboarding` sees the full form and can submit a second church creation. The `/api/churches` POST handler should either enforce a one-church-per-user limit at the DB/API level (preferred), or the onboarding page should redirect users who already have a church (e.g., to `/dashboard`).
- [MEDIUM – RESILIENCE] No try/catch in the error branch of `handleSubmit`: `const data = await res.json()` on the `else` branch (API error path) has no error handling. If the API returns a non-JSON error response (e.g., a 500 HTML page from the server during a crash), `res.json()` will throw an unhandled promise rejection, crashing the component silently — the user sees no error message and the loading spinner may never resolve. Fix: wrap the `else` branch in try/catch and fall back to `data.error || "Failed to create church."` with a plain string default.
- [INFO] Input height: all four inputs render at 38px bounding height (with `py-2` padding, full rendered height ~38px) — just under the 44px recommended touch target minimum. Consider `py-3` to reach 44px, consistent with the pattern noted across auth pages.
- [INFO] The `(app)/layout.tsx` checks auth via `supabase.auth.getUser()` (server-side, correct — uses the secure cookie-based session). The layout wraps children in `<ErrorBoundary>` for runtime crash isolation. No other middleware-level logic applies to `/onboarding` beyond the `isPublicPath` check (onboarding is not in the public list, so auth is required — correct).
- [INFO] Performance: 2018ms load time. The elevated time (vs. ~164–245ms for auth pages) reflects the Supabase `getUser()` call in the server-side `(app)/layout.tsx` adding a round-trip before the page is streamed. Expected behaviour in dev; would be faster in production with edge middleware.

Details:
- **Visual**: Clean single-column centred form with four fields. "Set Up Your Church" h1 in Cormorant Garamond. Muted subtitle text. Required asterisk on church name rendered in `text-destructive` (correct). Submit button full-width, consistent `bg-primary` style. No decorative elements — appropriate for a focused setup flow.
- **Responsive (mobile 375×812)**: All fields span full container width, no overflow. Submit button full-width and tappable. All labels and placeholders readable. No truncation.
- **Responsive (tablet 768×1024)**: Identical proportions within `max-w-md` container. Submit button is cut off at the bottom of the initial viewport (below the fold), but reachable by scrolling — acceptable behaviour for a form of this length.
- **Accessibility snapshot**: `h1` "Set Up Your Church" present. All four inputs have associated `<label>` elements via `htmlFor`/`id` (`church-name`, `diocese`, `address`, `ccli`). "Create Church" button in tree. `<main id="main-content">` is the skip link target (after fix). Error `<p>` has `role="alert"` (after fix). 0 axe violations confirmed post-fix.
- **Runtime**: No JS console errors. One failed network request: `GET http://localhost:3000/ [FAILED: net::ERR_ABORTED]` — this is a pre-navigation abort from the initial page load before the redirect to `/onboarding`, not a runtime error. No issues.
- **Performance**: 2018ms load (navigation entry). DOMInteractive 1977ms. responseStart 1969ms — the slow response start reflects the Supabase `getUser()` server round-trip in the layout. All metrics within expected dev-server ranges for a server-rendered layout with an auth check.
- **CSS inspection**: Submit button: `bg-primary` (`rgb(139, 69, 19)`), `text-primary-foreground` (`rgb(250, 246, 241)`), height 38px (bounding box 20px text; full height 38px with `py-2`). `hover:bg-primary-hover` after fix. Form `max-w-md` (448px — slightly wider than auth pages' `max-w-sm`). No border-radius on inputs (consistent flat ecclesiastical aesthetic).
- **Interactions**: Empty submit (dispatched form event) → "Church name is required." error renders with `role="alert"`. The `required` attribute on the church-name input means native browser validation fires for the HTML5 `submit` event path, but `handleSubmit` also has an explicit `if (!name.trim())` guard — dual protection is correct.
- **Source code**: No XSS vectors. No `dangerouslySetInnerHTML`. Form data sent as JSON to `/api/churches` (POST). Church name trimmed before submission (`name.trim()`) — correct. `loading` state disables button and changes label to "Creating..." to prevent double-submit. `useRouter` from `next/navigation` (correct for App Router). TypeScript: all types correctly inferred. No stray `console.log`. Error state cleared at start of each submit attempt (`setError("")` before Supabase call) — correct.
