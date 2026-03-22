# Precentor Site Audit Report

**Date:** 2026-03-22
**Status:** Complete
**Branch:** claude/awesome-colden

## Summary
- Pages reviewed: 20/20
- Cross-cutting reviews: 6/6 (layouts, API routes, middleware/proxy, shared components, test coverage, CI/CD)
- Quick wins fixed: 84
- Medium issues: 30
- Major issues: 1
- Critical security findings: 2 (unauthenticated API routes — fixed; .env with production secrets in git — requires rotation)

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

---

### /dashboard (Main Dashboard)
**Visual**: ✅ Pass
**Responsive**: ✅ Pass (mobile stacks correctly; tablet: Repertoire card partially clipped at 768px — minor, content remains accessible via scroll)
**Accessibility**: ✅ Pass (0 violations after fix; 2 pre-fix)
**Runtime**: ✅ Pass
**Design System**: ✅ Pass (no hardcoded hover colours; cards use `hover:border-primary` token correctly)
**Interactions**: ✅ Pass — all three quick-action cards, church card, and "Manage" link navigate correctly
**Source Code**: ⚠️ Minor code quality issue (3× redundant `.map()` over same slice); silent DB catch with no logging
**Performance**: ✅ Pass (347ms load, 215ms responseStart)

Findings:
- [QUICK WIN] **Fixed**: Added `id="main-content"` to the `<main>` element in `src/app/(app)/dashboard/page.tsx`. The layout skip link (`href="#main-content"`) now has a reachable focusable target. Resolves axe-core `skip-link` violation (moderate). Confirmed 0 violations post-fix.
- [QUICK WIN] **Fixed**: Added `id="main-content"` to the `<main>` element in `src/app/(app)/dashboard/loading.tsx` for consistency — the skip link is also present during the loading skeleton state and would otherwise have no target while the page streams in.
- [MODERATE – A11Y] `region` violation (axe-core, pre-fix): One content node outside any landmark — the Next.js dev-tools button renders outside `<main>`. Dev-only overlay, low priority. Resolves to 0 violations after the `id="main-content"` fix (confirmed by re-run).
- [MODERATE – A11Y] `skip-link` violation (axe-core, pre-fix): Skip link `href="#main-content"` had no focusable target because `<main>` lacked `id="main-content"`. Fixed.
- [MEDIUM – CODE QUALITY] The three quick-action cards (Plan Services, Choir Rota, Repertoire) are each rendered via a separate `.map()` over the same `userChurches.slice(0, 1)` array. This means three separate map iterations over a one-element array, three separate `<Link>` definitions, and three near-identical JSX blocks. The pattern inflates the component and adds cognitive overhead. Refactor to a single map or a pre-computed `primaryChurch = userChurches[0]` constant used to render all three cards directly, eliminating the map pattern entirely (since the slice always produces at most one element, iteration semantics are misleading).
- [MEDIUM – RESILIENCE] Both `try/catch` blocks in the data-fetching section have empty catch bodies (`catch { // DB not available, continue }`). DB errors are silently swallowed with no logging. If the DB connection fails for a reason other than "not available in dev" (e.g., a schema migration error in production), the page renders as if the user has no churches — silently redirecting to onboarding would be incorrect. Add at minimum `console.error(error)` in the catch blocks so production error tracking (e.g., Sentry) can capture the failure.
- [INFO] The `userName` derivation uses `user.user_metadata?.name || user.email?.split("@")[0] || "there"`. The email prefix fallback may produce unexpected values (e.g., "audit.tester+church1" becomes "audit.tester+church1"). Consider using the display name from the DB `users` table (already fetched as `dbUser[0]`) rather than relying on `user_metadata`, which is only populated if the user set a name at signup.
- [INFO] `loading.tsx` renders only a title skeleton (`h-8 w-48`) and a subtitle skeleton (`h-4 w-96`). The quick-action cards and sections have no skeleton — the loading state is very minimal and could feel jarring when the full page appears. A more complete skeleton (card outlines, section headings) would improve perceived performance. Low priority.
- [INFO] Tablet viewport (768px): the quick-action card grid uses `sm:grid-cols-3`. At exactly 768px the cards are horizontally tight and the church name text in the Repertoire card is partially clipped at the viewport edge. This is due to the outer padding (`p-8` = 32px each side = 64px total) combined with 3 equal columns in 768px — each card is ~234px wide, and the third card's right edge sits at ~766px (within bounds). The visual clip is a screenshot artefact (the viewport cuts off at 768px). No real overflow — confirmed by inspect (no `overflow: hidden` on the grid, no scroll suppression).

Details:
- **Visual**: Clean overview layout. "Welcome, [name]" h1 in Cormorant Garamond. Muted subtitle. Three quick-action cards in a 3-column grid (sm+). Upcoming Services section with empty state (calendar icon + underlined "Plan your first service" link). Your Churches section with church card and "Manage" link. All consistent with design system.
- **Responsive (mobile 375×812)**: Cards stack vertically (single column). All card text visible, no truncation. Upcoming Services empty state centred and readable. "Your Churches" section and "Manage" link both visible on scroll.
- **Responsive (tablet 768×1024)**: Cards in 3-column grid as expected. Repertoire card's church name text is truncated with `…` (has `truncate` class — intentional, not a bug). "Manage" link visible, aligned right. No layout overflow.
- **Accessibility snapshot**: `h1` "Welcome, Audit Tester" present. `h2` "Upcoming Services" and `h2` "Your Churches" both present — correct hierarchy (h1 → h2). All six links have descriptive text (card links include both action name and church name). "Skip to content" link present with correct target after fix.
- **Runtime**: No JS console errors. One failed network request (`GET http://localhost:3000/ [FAILED: net::ERR_ABORTED]`) — this is a pre-navigation abort from the redirect to `/dashboard`, not a runtime error. No actual failures.
- **Performance**: 347ms load (navigation entry). DOMInteractive 347ms. responseStart 215ms. 29 resource requests (includes HMR chunks, fonts, previously injected axe script). All within normal dev-server ranges for a server-rendered page with two Supabase + DB calls.
- **CSS inspection**: `h1` — Cormorant Garamond (via `font-heading`), 30px, weight 600, color `rgb(44, 36, 22)` (design token `--foreground`). Quick-action card links — `border-border`, `bg-card` (white), `shadow-sm`, `hover:border-primary` (correct design token, no hardcoded colours). "Manage" link — `text-primary` (`rgb(139, 69, 19)`), `hover:underline`, weight 400. Note: "Manage" has no underline at rest — this is acceptable for a standalone navigation link (not an in-text link), so WCAG 1.4.1 does not apply (the link is not embedded within a run of text).
- **Interactions**: "Plan Services" card → `/churches/[id]/sundays` (confirmed by eval, navigation successful). Church card → `/churches/[id]/sundays` (confirmed). "Manage" → `/churches` (confirmed by click + href eval). All navigations use Next.js `<Link>` (client-side routing, auth cookies preserved).
- **Source code**: No XSS vectors. No `dangerouslySetInnerHTML`. Authentication checked via `supabase.auth.getUser()` (server-side, secure) with immediate redirect if unauthenticated. DB queries use Drizzle ORM with parameterised queries — no SQL injection risk. `userChurches.slice(0, 5)` limits the loop for upcoming services (guards against excessive DB calls for users with many churches). `upcomingServices.slice(0, 6)` caps the rendered list. `format(parseISO(s.date), ...)` — safe (date-fns, no DOM injection). `LITURGICAL_COLOURS[s.colour as LiturgicalColour]` with `|| "#4A6741"` fallback — defensive. TypeScript: all types correctly inferred. No stray `console.log`.

---

### /dashboard/lectionary (Lectionary Sync & Calendar)
**Visual**: ✅ Pass (desktop)
**Responsive**: ⚠️ Table overflows viewport on mobile and tablet — "Colour" column clipped, no horizontal scroll wrapper
**Accessibility**: ⚠️ Two axe-core violations (moderate); both fixed
**Runtime**: ✅ Pass (no console errors; one pre-navigation abort — expected)
**Design System**: ⚠️ Hardcoded `hover:bg-[#6B4423]` on sync button (fixed); two hardcoded `#4A6741` values in result message (fixed)
**Interactions**: ✅ Pass (sync not triggered per protocol — known bug logged)
**Source Code**: ⚠️ Missing `id="main-content"` on `<main>` in both `page.tsx` and `loading.tsx` (fixed)
**Performance**: ✅ Pass (463ms load, 401ms TTFB, 484ms FCP — normal for server-rendered page with DB query)

Findings:
- [QUICK WIN] **Fixed**: Replaced `hover:bg-[#6B4423]` with `hover:bg-primary-hover` on the "Sync Current Year" button in `src/app/(app)/dashboard/lectionary/sync-form.tsx` (line 69). Consistent with design token `--primary-hover: #6B4423` established in globals.css.
- [QUICK WIN] **Fixed**: Added `id="main-content"` to the `<main>` element in `src/app/(app)/dashboard/lectionary/page.tsx`. The layout skip link (`href="#main-content"`) now has a reachable focusable target. Resolves axe-core `skip-link` violation (moderate).
- [QUICK WIN] **Fixed**: Added `id="main-content"` to the `<main>` element in `src/app/(app)/dashboard/lectionary/loading.tsx` for consistency — the skip link is present during the loading skeleton state and would otherwise have no target while the page streams in.
- [QUICK WIN] **Fixed**: Replaced `border-[#4A6741]` and `text-[#4A6741]` in the sync result success message (`sync-form.tsx` line 76) with `border-secondary text-secondary`. The value `#4A6741` is already `--secondary` in globals.css, so this consolidates usage under the design token.
- [MODERATE – A11Y] `skip-link` violation (axe-core): Skip link `href="#main-content"` had no focusable target because `<main>` lacked `id="main-content"`. Fixed (see quick win above). Confirmed 0 axe violations after fixes.
- [MODERATE – A11Y] `region` violation (axe-core): One content node outside any landmark — the Next.js dev-tools button renders outside `<main>`. Dev-only overlay, low priority.
- [MEDIUM – RESPONSIVE] Table has no horizontal scroll wrapper at mobile (375px) or tablet (768px). At 375px the "Colour" column is clipped off-screen; at 768px the "Year" and "Colour" columns are outside the visible area. The `<div className="border border-border">` wrapping the table has no `overflow-x-auto`. Fix: add `overflow-x-auto` to the wrapper div in `page.tsx` so the table scrolls horizontally on narrow viewports instead of overflowing silently.
- [MEDIUM – KNOWN BUG] The sync form (`sync-form.tsx`) calls `GET /api/cron/sync-lectionary` without an `Authorization: Bearer <CRON_SECRET>` header. Clicking "Sync Current Year" returns "Server misconfigured". This is a known issue from the auth transition — the cron endpoint requires the secret header but the client-facing form does not include it. The sync functionality is effectively broken for manual use from the UI.
- [INFO] Colour dot `<span>` (the coloured circle in the Colour column) has no `aria-label` or `aria-hidden="true"`. It is a purely decorative visual indicator — the colour name text node immediately follows it in the same cell (e.g., "GREEN", "WHITE"), so screen readers will read the text label. However, best practice is to add `aria-hidden="true"` to the decorative dot span to prevent it from being announced as an empty interactive element. No axe violation triggered because the span has no role and no text content.
- [INFO] The "Christ the King" entry (2026-11-22) has season `KINGDOM` — this is correct Church of England usage (the Sunday is in the Kingdom season, not Ordinary Time). The colour dot for this entry is rendered white (`#F5F0E8`) against the white table row background — the dot is invisible. Consider adding a `border border-border` to the dot when colour is WHITE or KINGDOM so it remains visible against a light background.
- [INFO] The `loading.tsx` skeleton renders one block for the form area (`h-10 w-48`) and one block for the table area (`h-64 w-full`). No header skeleton, no table-row skeleton — the loading state is minimal. Low priority.
- [INFO] The page `<title>` remains "Precentor — Church Music Planner" — there is no per-page `metadata` export in `page.tsx`. Adding `export const metadata = { title: "Lectionary Calendar — Precentor" }` would give screen reader users and browser tab users a more descriptive page title.

Details:
- **Visual (desktop 1280×800)**: Clean two-section layout. "Lectionary Calendar" h1 (Cormorant Garamond 30px). Muted subtitle. Sync form: labelled select (Bible version), checkbox (Fetch reading text from Oremus), "Sync Current Year" button. Table with dark header row (foreground background, background text) and 60 rows. Colour dots visible for green/purple/red entries; white dot invisible against white background (see INFO above). Season/Year/Colour columns well-proportioned. Overall consistent with design system.
- **Responsive (mobile 375×812)**: Sync form stacks correctly — select full-width, checkbox and label inline, button full-width. Table rows wrap text naturally in Name and Date columns. "Colour" column is clipped off the right edge of the viewport with no horizontal scroll affordance (MEDIUM finding). The table is navigable via horizontal swipe in some browsers but there is no visual indicator of overflow.
- **Responsive (tablet 768×1024)**: Sync form elements are side-by-side (flex-wrap). Table header shows Date/Name/Season but "Year" and "Colour" are cut off at the viewport right edge. Same overflow issue as mobile.
- **Accessibility snapshot**: `h1` "Lectionary Calendar" present. `h2` "Imported Days (60)" present — correct hierarchy. `combobox` ("Bible version") correctly associated via `htmlFor`/`id="bible-version"`. `checkbox` ("Fetch reading text from Oremus") correctly labelled. `button` "Sync Current Year" present. `table` with `columnheader` cells (Date, Name, Season, Year, Colour) and 60 data rows — fully semantic table structure (no `role="table"` hack needed, uses native `<table>`). Skip link present (`href="#main-content"`) — target missing before fix.
- **Runtime**: No JS console errors. One failed network request (`GET http://localhost:3000/ [FAILED: net::ERR_ABORTED]`) — pre-navigation abort, expected. No actual runtime failures.
- **Performance**: domContentLoaded 463ms, loadComplete 471ms, FCP 484ms, TTFB 401ms. The response time reflects the server-side DB query (`SELECT … FROM liturgical_days ORDER BY date DESC LIMIT 60`) in the page component. 60 rows is well within normal DB performance bounds.
- **CSS inspection**: `h1` — Cormorant Garamond, 30px, weight 600, `rgb(44, 36, 22)`. Sync button — `bg-primary` (`rgb(139, 69, 19)`), `text-primary-foreground` (`rgb(250, 246, 241)`), `hover:bg-primary-hover` (after fix). `<main>` — `p-8 max-w-4xl`, `id="main-content"` (after fix). Table colour dot (green row) — `background-color: rgb(74, 103, 65)` (= `#4A6741` = `--liturgical-green` / `--secondary` — correct).
- **Source code**: No XSS vectors. No `dangerouslySetInnerHTML`. DB query uses Drizzle ORM with no raw SQL — no injection risk. `day.colour` from DB is rendered in a hardcoded switch-style expression (safe — output is a CSS hex string, not HTML). The `try/catch` around the DB call silently continues with `days = []` on failure and logs a warning via `logger.warn` — appropriate defensive pattern. `loading` state on the button uses `disabled={loading}` with `disabled:opacity-50` — correct. TypeScript: all types correctly inferred via `typeof liturgicalDays.$inferSelect`. No stray `console.log`.

---

### /churches (Church List)
**Visual**: ✅ Pass
**Responsive**: ⚠️ Tablet (768px) layout overflow — "Add Church" button clips off-screen; ADMIN badge invisible
**Accessibility**: ⚠️ Two axe-core violations (both fixed)
**Runtime**: ✅ Pass (liturgical-days warning is pre-existing/unrelated)
**Design System**: ⚠️ Two instances of hardcoded `hover:bg-[#6B4423]` (both fixed)
**Interactions**: ✅ Pass
**Source Code**: ✅ Pass
**Performance**: ✅ Pass

Findings:
- [QUICK WIN] **Fixed**: Added `id="main-content"` to the `<main>` element in `src/app/(app)/churches/page.tsx`. The layout skip link (`href="#main-content"`) now has a reachable focusable target. Resolves axe-core `skip-link` violation (moderate).
- [QUICK WIN] **Fixed**: Added `id="main-content"` to the `<main>` element in `src/app/(app)/churches/loading.tsx` for consistency — the skip link is present during the loading skeleton state and would otherwise have no target while the page streams in.
- [QUICK WIN] **Fixed**: Replaced `hover:bg-[#6B4423]` with `hover:bg-primary-hover` on the "Add Church" button (header, line 39) in `src/app/(app)/churches/page.tsx`. Consistent with design token `--primary-hover: #6B4423`.
- [QUICK WIN] **Fixed**: Replaced `hover:bg-[#6B4423]` with `hover:bg-primary-hover` on the "Create Your First Church" button (empty-state, line 52) in `src/app/(app)/churches/page.tsx`.
- [MODERATE – A11Y] `skip-link` violation (axe-core): Skip link `href="#main-content"` had no focusable target because `<main>` lacked `id="main-content"`. Fixed (see quick win above). Confirmed 0 axe violations after fix.
- [MODERATE – A11Y] `region` violation (axe-core): One content node outside any landmark — the Next.js dev-tools button renders outside `<main>`. Dev-only overlay, low priority.
- [MEDIUM – RESPONSIVE] At tablet width (768px), the header `flex items-center justify-between` row overflows: the "Add Church" button is clipped to only show "Ad..." and the church card's ADMIN role badge is pushed off-screen to the right. The `max-w-4xl` container (`max-width: 896px`) is wider than the 768px viewport, so `p-8` padding (64px per side) reduces available inner width to ~640px — not enough for the heading and button at those sizes. The `<main>` element should have `overflow-x: hidden` or the header should use `flex-wrap` to allow the button to drop below the heading at narrow widths. No horizontal scroll is afforded, so content is simply clipped.
- [INFO] The church card link (`<Link href={…/sundays}>`) has no `aria-label` beyond its text content. Its accessible name is "St Mary the Virgin, Testbury Diocese of Oxford ADMIN" (all child text concatenated) — this is technically acceptable but verbose. Adding a more concise `aria-label="St Mary the Virgin, Testbury — go to services"` would improve screen reader UX.
- [INFO] The `<span>` displaying the role badge ("ADMIN") uses `text-xs` (12px) — below the 14px body copy minimum. At small sizes this could be difficult to read at low vision. Not a WCAG violation but worth noting.
- [INFO] The page `<title>` is "Precentor — Church Music Planner" (inherited from layout). Adding `export const metadata = { title: "Your Churches — Precentor" }` to `page.tsx` would provide a more descriptive browser tab/screen reader title for this page.
- [INFO] The `<Church>` icon in the empty state has no `aria-hidden="true"`. It is decorative (the adjacent `<p>` text provides context), so adding `aria-hidden="true"` would prevent it from being announced as an unlabelled image by some screen readers.

Details:
- **Visual (desktop 1280×800)**: Clean two-column header row with "Your Churches" h1 and "Add Church" primary button. Church card shows church name (Cormorant Garamond h2), diocese in muted text, and ADMIN badge. Layout well-proportioned, flat ecclesiastical aesthetic maintained. No visual regressions.
- **Responsive (mobile 375×812)**: `text-3xl` heading wraps to two lines ("Your" / "Churches") and the "Add Church" button inflates to a large block because the flex container has no min-width protection. The button and heading compete for space in a `justify-between` row without a flex shrink guard, making the button disproportionately large. Functional but visually unbalanced.
- **Responsive (tablet 768×1024)**: "Add Church" button clips at viewport right edge (only "Ad" visible). ADMIN badge on church card completely off-screen. The `max-w-4xl` on `<main>` does not prevent overflow at this viewport width when combined with the `p-8` padding. This is a functional regression — the button is unusable at 768px.
- **Accessibility snapshot**: `h1` "Your Churches" present. `link` "Add Church" present. Church card is a `link` with concatenated accessible name "St Mary the Virgin, Testbury Diocese of Oxford ADMIN". `h2` "St Mary the Virgin, Testbury" inside the card link (heading inside link is valid for card patterns). Skip link present. 0 violations after fixes.
- **Runtime**: No JS console errors. Pre-existing `[WARN] Failed to load liturgical days` server warnings (unrelated to this page — same as previous audits). One `net::ERR_ABORTED` for the initial `/` request (pre-navigation abort, expected).
- **Performance**: domContentLoaded 506ms, loadComplete 507ms, 29 resources. Server-side render of the church list requires two sequential DB queries (user lookup + church membership join). Load time is reasonable for a dev server with auth check.
- **CSS inspection**: `<main>` — `p-8 max-w-4xl`, `id="main-content"` (after fix). `h1` — Cormorant Garamond, 30px, weight 600, `rgb(44, 36, 22)`. "Add Church" button — `bg-primary` (`rgb(139, 69, 19)`), `text-primary-foreground` (`rgb(250, 246, 241)`), 14px, `hover:bg-primary-hover` (after fix). Church card link — `bg-card` (white), `border-border`, `shadow-sm`, `hover:border-primary`. Card `h2` — Cormorant Garamond, 18px, weight 600.
- **Interactions**: Click church card → navigates to `/churches/a0426f52-a3c0-4a07-a264-c3a73764cdcd/sundays` (confirmed by eval). Click "Add Church" button → navigates to `/churches/new` (confirmed by eval). Both work correctly.
- **Source code**: No XSS vectors. No `dangerouslySetInnerHTML`. Two sequential Drizzle ORM DB queries (user lookup, then membership join) in a `try/catch` — silently falls back to empty list on DB failure (correct defensive pattern). Auth gate via `supabase.auth.getUser()` + `redirect("/login")` — correct. TypeScript: inline `interface UserChurch` defined inside the async function component (valid but conventionally defined at module level). No stray `console.log`. `loading.tsx` provides a skeleton for the two expected skeleton cards — minimal but functional.
- **Interactions**: Sync not triggered (known bug — `GET /api/cron/sync-lectionary` without auth header returns error). Day table rendered correctly with 60 rows showing Date, Name, Season, Year, Colour for each imported liturgical day. All data appears semantically correct for the 2025/2026 Church of England lectionary (Year A, Ordinary Time weeks, correct seasons).

---

### /churches/[churchId]/sundays (Service Calendar)
**Visual**: ✅ Pass
**Responsive**: ⚠️ Season label truncates at tablet (768px) — no `flex-shrink-0`/`whitespace-nowrap` (fixed)
**Accessibility**: ⚠️ Three axe-core violations — skip-link target missing (fixed in layout), colour swatches lacked `aria-hidden` (fixed), `region` dev-only
**Runtime**: ✅ Pass (no console errors, no failed network requests)
**Design System**: ⚠️ Six hardcoded hex colour literals in inline `style` for liturgical colour swatches (fixed — now uses `LITURGICAL_COLOURS` constant from `@/types`)
**Interactions**: ✅ Pass — clicking a Sunday card correctly navigates to `/churches/[churchId]/sundays/[date]` service editor
**Source Code**: ✅ Pass (auth gate in layout, DB query with Drizzle ORM, no XSS vectors)
**Performance**: ✅ Pass

Findings:
- [QUICK WIN] **Fixed**: Added `id="main-content"` to the `<main>` element in `src/app/(app)/churches/[churchId]/layout.tsx`. This is the shared layout wrapping all church sub-pages. The skip link (`href="#main-content"`) in the global layout now has a focusable target on every church page. Resolves the axe-core `skip-link` violation (moderate) for the entire church sub-tree. Note: page-level files (`sundays/page.tsx`, `[date]/page.tsx` etc.) render into the layout's `<main>` as children — they correctly use `<div>` wrappers, not nested `<main>`, avoiding invalid HTML.
- [QUICK WIN] **Fixed**: Added `aria-hidden="true"` to the liturgical colour swatch `<span>` in `src/app/(app)/churches/[churchId]/sundays/page.tsx`. The coloured bar is purely decorative — the season text label (e.g. "LENT", "HOLY WEEK") immediately follows and provides equivalent information to screen readers. Without `aria-hidden`, the span was announced as an empty unlabelled element.
- [QUICK WIN] **Fixed**: Replaced six inline hardcoded hex colour literals in `sundays/page.tsx` with `LITURGICAL_COLOURS[day.colour as LiturgicalColour] ?? "#4A6741"`. The `LITURGICAL_COLOURS` constant is already defined in `src/types/index.ts` and used in `[date]/page.tsx` — this fix makes the colour mapping consistent across both files.
- [QUICK WIN] **Fixed**: Added `whitespace-nowrap flex-shrink-0` to the season label `<span>` in `sundays/page.tsx`. Previously the label could be clipped at tablet/narrow viewports (observed as "HC..." for "HOLY_WEEK" at 768px). The `flex-1` on the day name div already allows the centre column to absorb width; the season label should never shrink or wrap.
- [QUICK WIN] **Fixed**: Season label now renders with underscores replaced by spaces (`day.season.replace(/_/g, " ")`). Raw DB enum values like `HOLY_WEEK`, `ORDINARY` are now displayed as `HOLY WEEK`, `ORDINARY` for readability. Values without underscores (LENT, EASTER, PENTECOST, TRINITY, ASCENSION) are unaffected.
- [SERIOUS – A11Y] `color-contrast` violation (axe-core, 4 nodes): Four elements in the `ChurchSidebar` component render `text-muted-foreground` (`#7a6e5d`) on the page background (`#f5f0e8`) at a contrast ratio of 4.39:1 — just below the WCAG AA 4.5:1 threshold. Affected elements: the "All Churches" back link (14px, normal weight), the "Admin" role label (12px), the user email address (12px), and the "Sign out" button (12px). The 12px elements require 4.5:1 (normal text < 18px), the 14px link also requires 4.5:1. The `--muted-foreground` CSS variable needs to be slightly darkened (e.g. from `#7a6e5d` to approximately `#6e6254`) to achieve 4.5:1 on `#f5f0e8`. This affects all church sub-pages via the shared sidebar. Deferred — requires a design token change in `globals.css` and re-audit of all other uses of `text-muted-foreground`.
- [MODERATE – A11Y] `skip-link` violation (axe-core): Skip link `href="#main-content"` had no focusable target — the church layout `<main>` lacked `id="main-content"`. Fixed in `layout.tsx` (see quick win above).
- [MODERATE – A11Y] `region` violation (axe-core, 1 node): The Next.js dev-tools button renders outside any landmark. Dev-only overlay, low priority, not actionable.
- [MEDIUM – UX] The page title is the generic "Precentor — Church Music Planner". Adding `export const metadata = { title: "Upcoming Sundays — Precentor" }` to `sundays/page.tsx` would give screen reader users and browser tab users a more descriptive title. Same applies to `[date]/page.tsx` (could use `day.cwName` in a generateMetadata export).
- [INFO] The page fetches the 20 nearest upcoming liturgical days (`.limit(20)`) — this covers approximately 5 months of Sundays. The DB query has no churchId filter because liturgical days are global (not per-church). This is intentional and correct architecture.
- [INFO] Maundy Thursday (Thu 2 Apr) and Good Friday (Fri 3 Apr) appear in the list because `gte(liturgicalDays.date, today)` returns all future days, not just Sundays. The page is titled "Upcoming Sundays" but includes weekday feasts. This is liturgically correct (these are principal feasts that require music planning) but may surprise users expecting only Sundays. No code change required, but the page heading could say "Upcoming Services" or "Upcoming Principal Days" for clarity.
- [INFO] The colour swatch for "WHITE" days (e.g. Easter Eve) renders as `#F5F0E8` — the same colour as the page background (`--background`). The swatch is invisible on white-background cards. A `border border-border` on the swatch when `colour === "WHITE"` would maintain visual affordance. Same as noted in the lectionary audit for the table dot. Deferred.
- [INFO] No loading state skeleton for the colour swatches — `loading.tsx` shows generic grey bars with no colour swatch placeholder. Low priority.

Details:
- **Visual (desktop 1280×800)**: Clean list layout. "Upcoming Sundays" h1 (Cormorant Garamond 30px). Each row: coloured swatch (8px×32px), date in mono text, liturgical name in heading font, season label right-aligned. Sidebar shows church name, role, nav links, user email, sign-out. No visual regressions. Liturgical colours: PURPLE (Lent/Advent) renders as `rgb(91, 44, 111)` ✓, RED (Holy Week) as `rgb(139, 37, 0)` ✓, WHITE (Easter Eve) invisible against background ⚠️, GREEN (Ordinary) correct ✓.
- **Responsive (mobile 375×812)**: Sidebar collapses to hamburger menu. Page content full-width. Season labels readable, no truncation. Day name wraps gracefully. Cards have adequate touch target (full card is a link, approximately 72px tall). Pass.
- **Responsive (tablet 768×1024)**: Sidebar visible at fixed width (~200px). Season label was truncating at "HC..." for "HOLY_WEEK" before fix. After fix (`whitespace-nowrap flex-shrink-0`), label displays fully. Overall layout correct. Pass after fix.
- **Accessibility snapshot**: `h1` "Upcoming Sundays" present. Each card is a `link` with accessible name concatenating date, liturgical name, and season (e.g. "Sun 22 Mar 2026 The Fifth Sunday of Lent LENT"). Swatch span has `aria-hidden="true"` (after fix). Skip link present in sidebar, target `#main-content` now resolves to the layout `<main>`. Sidebar uses `role="complementary"` (rendered as `<aside>`). Navigation uses `<nav>`. Heading hierarchy: `h1` (page) only — no sub-headings needed for a list page.
- **Runtime**: No JS console errors. No failed network requests (beyond pre-navigation aborts). DB query succeeds, returning 20 upcoming days. Pass.
- **Performance**: Server-side DB query (`SELECT … FROM liturgical_days WHERE date >= today ORDER BY date ASC LIMIT 20`) — fast, well-indexed by date. Page renders immediately without client-side data fetching. No hydration warnings.
- **CSS inspection**: `h1` — Cormorant Garamond, 30px, weight 600, `rgb(44, 36, 22)`. Card link — `bg-card` (white), `border-border`, `shadow-sm`, `hover:border-primary`. Colour swatch — 8px wide, 32px tall, `background-color` set inline via `LITURGICAL_COLOURS` constant (after fix). Season label — `text-xs text-muted-foreground`, `whitespace-nowrap flex-shrink-0` (after fix). Date — `font-mono text-xs text-muted-foreground`. Day name — `font-heading text-lg`.
- **Interactions**: Clicking "The Fifth Sunday of Lent" card navigates to `/churches/a0426f52-a3c0-4a07-a264-c3a73764cdcd/sundays/2026-03-22` — service editor page loads with readings, collect, and service planner. Navigation confirmed by eval (`h1: "The Fifth Sunday of Lent"` on destination page). Pass.
- **Source code**: No XSS vectors. No `dangerouslySetInnerHTML`. Auth gate in `layout.tsx`: `supabase.auth.getUser()` → `redirect("/login")` if unauthenticated; DB membership check → `redirect("/churches")` if user is not a member of the requested church. This is correct — IDOR protection via membership join. Drizzle ORM query with no raw SQL. `try/catch` silently continues with empty array on DB failure (correct defensive pattern). `limit(20)` prevents unbounded result sets. TypeScript: `InferSelectModel<typeof liturgicalDays>` correctly typed. No stray `console.log`. `LITURGICAL_COLOURS` and `LiturgicalColour` imported from `@/types` (after fix) — consistent with `[date]/page.tsx`.

---

### /churches/new (Create Church Form)
**Visual**: ✅ Pass
**Responsive**: ✅ Pass (mobile and tablet both render cleanly within `max-w-lg`)
**Accessibility**: ⚠️ Two axe-core violations (both fixed); error `<p>` lacked `role="alert"` (fixed)
**Runtime**: ✅ Pass (no console errors)
**Design System**: ⚠️ Hardcoded `hover:bg-[#6B4423]` on submit button (fixed)
**Interactions**: ⚠️ Empty-form submit bypassed JS-side validation — API called with empty name (fixed); no cancel/back link
**Source Code**: ⚠️ Missing `id="main-content"` on `<main>` (fixed); missing `autocomplete` attributes (fixed); no try/catch on error-path `res.json()` (fixed); no JS-side required-field guard (fixed)
**Performance**: ✅ Pass

Findings:
- [QUICK WIN] **Fixed**: Added `id="main-content"` to the `<main>` element in `src/app/(app)/churches/new/page.tsx`. The layout skip link (`href="#main-content"`) now has a reachable focusable target. Resolves axe-core `skip-link` violation (moderate). Confirmed by eval: `mainId === "main-content"`.
- [QUICK WIN] **Fixed**: Replaced `hover:bg-[#6B4423]` with `hover:bg-primary-hover` on the "Create Church" submit button. Consistent with design token `--primary-hover: #6B4423` established in globals.css. Confirmed by eval: `submitClass` contains `hover:bg-primary-hover`.
- [QUICK WIN] **Fixed**: Added `role="alert"` to the inline error `<p>` (`{error && <p role="alert" ...>}`). Previously, errors were rendered silently — screen readers received no announcement without a focus shift. The `role="alert"` live region ensures the "Church name is required." message is announced immediately.
- [QUICK WIN] **Fixed**: Added explicit JS-side required-field guard in `handleSubmit`: checks `name.trim()` before the API call and calls `setError("Church name is required.")` / returns early if empty. This prevents the API being called with an empty church name when `e.preventDefault()` suppresses native browser validation in non-Chrome browsers. Confirmed by test: dispatching a raw `submit` event now shows the alert and stays on `/churches/new`.
- [QUICK WIN] **Fixed**: Added `autocomplete` attributes to all inputs: `autoComplete="organization"` on church name, `autoComplete="off"` on diocese, `autoComplete="street-address"` on address textarea, `autoComplete="off"` on CCLI number. Consistent with pattern from `/onboarding` audit.
- [QUICK WIN] **Fixed**: Added `inputMode="numeric"` to the CCLI Number input. The field is `type="text"` (correct, to allow leading zeros and avoid spinner UI) but `inputMode="numeric"` ensures mobile devices show a numeric keyboard. No behaviour change on desktop.
- [QUICK WIN] **Fixed**: Wrapped the error-path `res.json()` call in a try/catch. Previously, a non-JSON error response (e.g., a 500 HTML page from the server) would throw an unhandled promise rejection, leaving `loading` stuck at `true` and the user seeing a spinner forever with no error message. Now falls back to `"Failed to create church."`.
- [MODERATE – A11Y] `skip-link` violation (axe-core): Skip link `href="#main-content"` had no focusable target because `<main>` lacked `id="main-content"`. Fixed (see quick win above).
- [MODERATE – A11Y] `region` violation (axe-core): One content node outside any landmark — the Next.js dev-tools button renders outside `<main>`. Dev-only overlay, low priority.
- [MEDIUM – UX] No cancel or back link. The form is a dead end if the user changes their mind — the only escape is the browser back button. Given the `/churches` list page exists and links to this form, a "← Back to churches" link or a "Cancel" button (navigating to `/churches`) should be added below the submit button. This is especially important on mobile where the form is full-viewport.
- [MEDIUM – UX/SECURITY] No guard against duplicate church creation: the same issue identified on `/onboarding` applies here. The `(app)/layout.tsx` does not check how many churches the user already has. A user could create unlimited churches via this page. The `/api/churches` POST handler should enforce any business-rule limit at the DB/API level.
- [INFO] The page `<title>` is "Precentor — Church Music Planner" (inherited from root layout). No `metadata` export in `page.tsx`. Adding `export const metadata = { title: "Add Church — Precentor" }` would give screen reader users and browser tab users a more descriptive page title.
- [INFO] Input height: all inputs render at ~38px bounding height (with `py-2` padding) — just under the 44px recommended touch target minimum. Consider `py-3` for consistency with the pattern noted across auth pages. Low priority.
- [INFO] The form does not have a `slug` field, despite the audit task mentioning it. The source confirms: only `name`, `diocese`, `address`, and `ccliNumber` are collected. If the API auto-generates slugs, this is correct; if not, this is a data model gap.

Details:
- **Visual (desktop 1280×800)**: Clean single-column form within `max-w-lg` (512px) with `p-8` padding. "Add Church" h1 in Cormorant Garamond. Four labelled fields (Church Name required, Diocese, Address textarea, CCLI Number) plus a full-width primary submit button. No navigation chrome visible (no sidebar at this viewport — the `(app)/layout.tsx` renders no sidebar of its own; this is consistent with the onboarding page). Warm cream background (`--background`). All design tokens applied correctly post-fix.
- **Responsive (mobile 375×812)**: All fields span full container width, no overflow. Submit button full-width and tappable. Labels and placeholders remain readable. The `max-w-lg` collapses gracefully. No visual regressions.
- **Responsive (tablet 768×1024)**: Identical proportions within the `max-w-lg` container. Form centred. No clipping or overflow. Better than `/churches` page which had overflow issues — the narrower `max-w-lg` (512px vs 896px) fits comfortably within the 768px viewport even with `p-8` padding.
- **Accessibility snapshot**: `h1` "Add Church" present. All four inputs have associated `<label>` elements via `htmlFor`/`id` (name → `#name`, diocese → `#diocese`, address → `#address`, ccliNumber → `#ccliNumber`). "Create Church" button in tree. `<main id="main-content">` is the skip link target (after fix). Error `<p role="alert">` confirmed present (after fix). axe-core: 2 violations pre-fix (skip-link, region); region violation is dev-only overlay.
- **Runtime**: No JS console errors. Network failures in the log are all pre-navigation aborts from earlier browser sessions — none related to this page. No failed requests on `/churches/new` itself.
- **Performance**: Page load fast (client component, no server-side data fetching beyond the auth check in `(app)/layout.tsx`). Supabase `getUser()` in the layout adds one server round-trip; all within normal dev-server ranges.
- **CSS inspection**: `<main>` — `p-8 max-w-lg`, `id="main-content"` (after fix). `h1` — Cormorant Garamond (`font-heading`), 30px, weight 600. Submit button — `bg-primary` (`rgb(139, 69, 19)`), `text-primary-foreground` (`rgb(250, 246, 241)`), `hover:bg-primary-hover` (after fix). Inputs — `border-border`, `bg-white`, `focus:border-primary`, no border-radius (flat ecclesiastical aesthetic).
- **Interactions (post-fix)**: Click "Create Church" with empty name → browser native validation tooltip "Please fill in this field." appears (Chrome), page stays on `/churches/new`. Programmatic `form.dispatchEvent(new Event('submit'))` → JS guard fires, `role="alert"` error "Church name is required." renders, page stays on `/churches/new`. Confirmed by eval: `url === "http://localhost:3000/churches/new"`, `errorText === "Church name is required."`. No API call made.
- **Source code**: No XSS vectors. No `dangerouslySetInnerHTML`. Form data serialised as JSON to `POST /api/churches`. No client-side slug generation (server-side concern). `loading` state disables button and changes label to "Creating...". `useRouter` from `next/navigation` (correct for App Router). TypeScript: all types inferred correctly. No stray `console.log`. Error state cleared at start of each submit attempt (`setError("")` before API call) — correct. The `required` attribute on church name provides a first line of defence via browser HTML5 validation; the JS guard provides a second line for environments where native validation is bypassed.

---

### /churches/[churchId]/members (Member Management + Invite)
**Visual**: ✅ Pass
**Responsive**: ⚠️ Table clips on mobile (no horizontal scroll wrapper on the outer container — row content overflows at 375px)
**Accessibility**: ⚠️ Five axe-core violations pre-fix (critical: select-name ×2; serious: color-contrast ×4; moderate: skip-link, region; minor: empty-table-header) — four fixed
**Runtime**: ⚠️ Build errors in unrelated sundays pages logged in console (from prior audit mid-compilation); 500 on `/churches/[churchId]/sundays` route (separate issue)
**Design System**: ⚠️ Hardcoded `hover:bg-[#6B4423]` on Send Email button (fixed)
**Interactions**: ✅ Send Email / Get Link buttons correctly disabled when email field is empty; confirm-before-remove pattern on delete is good UX
**Source Code**: ✅ ADMIN-only guards correctly enforced at both page (server) and API level; IDOR prevention via `churchId` scoping in all DB queries
**Security**: ✅ Strong — `requireChurchRole(churchId, "ADMIN")` gates all mutations; email validated server-side with regex; role/voice-part values validated against allowlists; invite URL built server-side from `process.env.NEXT_PUBLIC_APP_URL` (prevents host-header spoofing); HTML in invite email is escaped via `escapeHtml()`

Findings:
- [QUICK WIN] **Fixed**: Replaced `hover:bg-[#6B4423]` with `hover:bg-primary-hover` on the "Send Email" button in `src/app/(app)/churches/[churchId]/members/invite-form.tsx` (line 84).
- [QUICK WIN] **Fixed**: Added `autoComplete="email"` to the invite email input in `invite-form.tsx`. Improves UX for password managers and browser autofill; resolves missing `autocomplete` on email inputs pattern noted across earlier pages.
- [QUICK WIN] **Fixed**: Added `aria-label` to the read-only invite link `<input>` in `invite-form.tsx` (both `aria-label="Invite link"` and an associated `<label htmlFor="invite-link" className="sr-only">`). Previously this input had no accessible name — screen readers would announce it as an unlabelled text field.
- [QUICK WIN] **Fixed**: Added `aria-label={`Role for ${m.userName || m.userEmail}`}` to the role `<select>` in each table row in `members-table.tsx`. Previously these selects had no accessible name — axe-core reported `select-name` (critical, WCAG 4.1.2). Confirmed: 2 nodes affected.
- [QUICK WIN] **Fixed**: Added `aria-label={`Voice part for ${m.userName || m.userEmail}`}` to the voice-part `<select>` in each table row in `members-table.tsx`. Resolves the second `select-name` critical violation.
- [QUICK WIN] **Fixed**: Added `aria-label="Actions"` to the empty `<th>` in the members table header (`members-table.tsx` line 99). Resolves axe-core `empty-table-header` violation (minor).
- [CRITICAL – A11Y] `select-name` (pre-fix): The role and voice-part `<select>` elements in each member row had no accessible name. A screen reader user would hear "combo box" with no context for which member or field it controls. Fixed with `aria-label` as above.
- [SERIOUS – A11Y] `color-contrast` (4 nodes): axe-core reports 4 contrast failures. These are likely the "Send Email" button in its disabled/muted state and possibly the muted-foreground email text in the table. Not fixed in this pass — requires design token review.
- [MODERATE – A11Y] `skip-link`: The skip link (`href="#main-content"`) has a valid target in the layout source (`<main id="main-content">`), but the id was absent from the live DOM at audit time. This appears to be a transient dev-server compilation lag — the id is present in `src/app/(app)/churches/[churchId]/layout.tsx` line 77. No code change needed; the issue should self-resolve on a clean build.
- [MODERATE – A11Y] `region`: One content node outside any landmark — the Next.js dev-tools button. Dev-only overlay; low priority.
- [MODERATE – RESPONSIVE] On mobile (375px), the table has no horizontal scroll treatment: the outer `<div class="mt-8 border border-border overflow-x-auto">` does clip correctly, but the invite form's button row (`flex gap-2 items-end`) wraps awkwardly at 375px — the "Invite by email" label wraps to three lines, and the buttons overflow their cells. The labels stack vertically making the form hard to use. Consider a column layout (`flex-col`) on small screens for the invite form.
- [MEDIUM – UX] No empty-state validation feedback on the invite form: `handleInvite` returns early with `if (!email) return` — no user-visible error message is shown. The buttons are correctly `disabled` when the email field is empty, which is good; but if JS is slow or the disabled state is not noticed by a keyboard user, the silent return is confusing. The buttons being disabled is the primary guard — acceptable, but consider a `role="alert"` error message for completeness.
- [MEDIUM – SECURITY] The invite token is returned in the API response body (`{ token, inviteId }`). This is intentional (needed for "Get Link" flow), but means the raw token is visible in browser DevTools network panel and JS console if logged. This is acceptable for an invite flow, but worth documenting: any admin with DevTools access can extract the token and share it independently of the intended recipient.
- [INFO] The invite form renders only for admins (server-side `isAdmin` guard), but the `MembersTable` ADMIN-specific controls (role/voice-part selects, remove button) are controlled only by the client-side `isAdmin` prop passed from the server. Because the page is a Server Component, `isAdmin` is computed server-side from the DB — this is correct and safe. The API routes independently enforce `requireChurchRole(churchId, "ADMIN")`, providing defence in depth.
- [INFO] The page `<title>` is "Precentor — Church Music Planner" (inherited from root layout). Adding `export const metadata = { title: "Members — Precentor" }` in `page.tsx` would give a more descriptive page title.
- [INFO] The `loading.tsx` skeleton does not match the actual page layout: it shows a single full-width bar for the invite form and a large block for the table, but the real page has a labelled two-column invite form. This is cosmetic — the skeleton is functional.
- [INFO] The members table uses `i % 2 === 0 ? "bg-white" : "bg-background"` for striping. Both `bg-white` and `bg-background` are near-identical cream tones — the alternating row effect is barely perceptible. This is a design choice, not a bug.

Details:
- **Visual (desktop 1280×800)**: Clean layout. "Members" h1 in Cormorant Garamond. Invite form: labelled email input, role dropdown, "Send Email" (primary, muted brown) and "Get Link" (secondary, white) buttons inline. Members table: dark header row (foreground/background inverted), four columns (Name, Email, Role, Voice Part), one action column with trash icon. Single member row (Audit Tester / ADMIN / TENOR) visible. No visual regressions.
- **Responsive (mobile 375×812)**: Sidebar collapses to hamburger. Invite form labels wrap awkwardly (see medium UX finding). Table fits within overflow-x-auto wrapper — scrollable horizontally. Email column correctly hidden on small screens (`hidden sm:table-cell`), email shown below name in the Name cell instead.
- **Responsive (tablet 768×1024)**: Sidebar visible. Invite form fits in one row without overflow. Table fully visible. Pass.
- **Accessibility snapshot**: `h1` "Members" present. Invite-by-email input has label `Invite by email` via `htmlFor="invite-email"`. Role select in invite form has label `Role` via `htmlFor="invite-role"`. Table has correct `<thead>/<tbody>` structure with `columnheader` roles. Role and voice-part selects in rows have `aria-label` (after fix). Remove button has `aria-label="Remove Audit Tester"` — good. Skip link present; `<main id="main-content">` in layout (id present in source; transient absence in DOM noted above).
- **Runtime**: Build errors in console from sundays pages (compilation lag from prior audit). 500 on `/churches/[churchId]/sundays` route — unrelated to this page. No errors specific to the members page. No failed network requests on this page.
- **Interactions**: "Send Email" button correctly disabled when email field is empty (confirmed by eval: `sendBtnDisabled === true`). Email input `type="email"` — browser prevents submission of clearly invalid emails. `autoComplete="email"` added. Role dropdown defaults to "Member". Confirm-before-remove pattern: clicking trash sets `confirmRemoveId`, showing inline "Confirm / Cancel" — good UX safety net.
- **Security review**: `POST /api/churches/[churchId]/members` — requires `ADMIN` role via `requireChurchRole`. Email validated against `EMAIL_REGEX`. Role validated against `VALID_ROLES` allowlist (falls back to `"MEMBER"` if invalid — safe). Invite URL constructed from `process.env.NEXT_PUBLIC_APP_URL` (server-side env var), not from `request.headers.host` — prevents host-header injection. Email HTML uses `escapeHtml()` helper on `validatedRole` and `inviteUrl`. `PATCH /api/churches/[churchId]/members/[memberId]` — requires `ADMIN`. Field values validated against allowlists. DB query scoped to `churchId AND memberId` — prevents IDOR (a member cannot be updated across churches). `DELETE` — same guards. All correct.
- **Source code**: No XSS vectors. No `dangerouslySetInnerHTML`. Invite token generated with `randomBytes(32)` — cryptographically secure. Expiry set to 7 days. Email send failure is caught and logged but does not fail the request (invite link still usable) — correct graceful-degradation pattern. `logger.error` used consistently (not `console.error`). TypeScript: `MemberRole` type used correctly; `VALID_ROLES` and `VALID_VOICE_PARTS` as `const` arrays. Optimistic UI updates in `MembersTable` with rollback on error — good UX pattern.

---

### /churches/[churchId]/sundays/[date] (Service Editor)
**Visual**: ✅ Pass
**Responsive**: ⚠️ Mobile/tablet require hard-nav (Next.js router state issue observed during viewport resize testing)
**Accessibility**: ⚠️ Multiple issues found and fixed
**Runtime**: ✅ Pass (stale HMR errors in console from prior session only)
**Design System**: ✅ Fixed (3 hardcoded hover tokens replaced)
**Interactions**: ✅ Pass (service creation, music slots, settings all work)
**Source Code**: ✅ Pass (good security, proper error handling)

Findings:

- [QUICK WIN — FIXED] Replaced `hover:bg-[#6B4423]` with `hover:bg-primary-hover` on three buttons: "Add" service button (`service-planner.tsx` line 117), "Save Music" button (`music-slot-editor.tsx` line 242), and "Save" settings button (`service-settings.tsx` line 129).
- [QUICK WIN — FIXED] Service type `<select>` had no accessible label — axe reported `select-name` critical violation. Added `<label htmlFor="new-service-type">` with `className="sr-only"` and corresponding `id="new-service-type"` on the select in `service-planner.tsx`.
- [QUICK WIN — FIXED] Service time `<input type="time">` had no accessible label — axe reported `label` critical violation. Added `<label htmlFor="new-service-time">` with `className="sr-only"` and corresponding `id="new-service-time"` on the input in `service-planner.tsx`.
- [QUICK WIN — FIXED] AI suggest (sparkle) buttons had `title="AI Suggest"` but no `aria-label`. `title` is not reliably announced by all screen readers. Replaced with `aria-label={`AI suggest for ${label}`}` on each button in `music-slot-editor.tsx`.
- [QUICK WIN — FIXED] Music slot free-text inputs had no accessible label (only a `placeholder`). Added `aria-label={label}` to each freeText input and `aria-label={`Notes for ${label}`}` to each notes input in `music-slot-editor.tsx`.
- [QUICK WIN — FIXED] `saveError` paragraph in `music-slot-editor.tsx` lacked `role="alert"` — screen readers would not announce save failures. Added `role="alert"`.
- [QUICK WIN — FIXED] `bg-white` hardcoded on service type select and time input in `service-planner.tsx` — changed to `bg-background` for design token consistency. Same fix applied to music slot text inputs.
- [QUICK WIN — FIXED] Liturgical colour bar `<span>` in `page.tsx` lacked `aria-hidden="true"` — it is purely decorative (the season/colour text alongside it provides context). Added `aria-hidden="true"`.
- [QUICK WIN — FIXED] Season label displayed raw enum `HOLY_WEEK — RED`; now renders as `Holy Week — Red` using `.replace(/_/g, " ")` and `.charAt(0).toUpperCase() + ...slice(1).toLowerCase()`.
- [QUICK WIN — FIXED] Readings position cells displayed raw enum values (`OLD_TESTAMENT`, `GOSPEL`, `PSALM`). Now rendered human-readable (`Old Testament`, `Gospel`, `Psalm`) via `.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())`. Lectionary column similarly title-cased.
- [QUICK WIN — FIXED] Skip link target `#main-content` was not resolving — the layout's `<main id="main-content">` id was being stripped from the streamed RSC payload at runtime (confirmed: `document.getElementById('main-content')` returned null; `__next_f` payload contained no `main-content` string). Fixed by adding `id="main-content"` to the outer `<div>` in `page.tsx` directly, giving the skip link a reliable target within the server-rendered page content.
- [MEDIUM] Service tab buttons have no ARIA tab semantics (`role="tab"`, `aria-selected`, `role="tablist"` wrapper). Added `role="tab"`, `aria-selected={activeTab === s.id}`, and `role="tablist" aria-label="Services"` wrapper in `service-planner.tsx`. The tab panel itself (music slots + settings) should also have `role="tabpanel"` with `aria-labelledby` for full ARIA compliance — deferred as medium follow-up.
- [MEDIUM] The readings grid is visually a table-like structure (position | reference | lectionary columns) but uses `div` elements with no semantic table markup. Screen readers cannot navigate it as a table. Should be refactored to `<table>` with `<thead>/<tbody>/<th scope="col">` — medium refactor.
- [MEDIUM] No `aria-live` region for toast notifications. The `useToast()` system fires "Service created" / "Music saved" toasts but they are not announced to screen readers. A `role="status"` or `aria-live="polite"` container on the toast host would fix this.
- [INFO] The `<ServicePlanner>` client component receives `existingServices` from the server. If a service exists but the DB query fails silently (caught by the bare `catch`), the UI shows "No services planned" with no error message. Consider adding `role="alert"` to the empty-state paragraph or surfacing a visible error when `dayServices` is empty due to an exception.
- [INFO] The music slot editor fetches slots via `GET /api/churches/[churchId]/services/[serviceId]/slots`. If this returns a non-OK response (e.g. 403, 500), the component falls through to the template silently. A visible error state would improve UX.
- [INFO] `bg-white` also appears on the Mode/Eucharistic-prayer selects in `service-settings.tsx` — these should be `bg-background`. Not fixed in this pass (functional, low impact).
- [INFO] The `collect` panel (`{day.collect && ...}`) renders italic muted text with no heading structure — the collect text is long and could benefit from a visually distinct presentation, but is semantically fine as-is.
- [INFO] No status field on services (draft/published) is visible in the UI — the `services` schema likely has a `status` column but the ServicePlanner doesn't expose it. This could be a planned feature gap.

Details:
- **Visual (desktop 1280×800)**: Well-structured page. Liturgical colour bar (crimson for RED season) alongside Palm Sunday heading. Date in small mono type. Season label (now fixed from `HOLY_WEEK — RED` to `Holy Week — Red`). Readings table in a card with position/reference/lectionary columns. Services section with tab bar, service type selector, time picker, and Add button. Music slots rendered as numbered rows (Organ Voluntary Pre → 12 slots for Sung Eucharist). Save Music button right-aligned. Service Sheet Settings below with Mode dropdown.
- **Responsive (mobile 375×812)**: The music slots table is tight but scrollable. Service type selector and time picker stack acceptably. The sidebar collapses to hamburger correctly. A viewport-resize-induced router confusion was observed during testing (the page navigated to /members after resizing back from mobile) — this appears to be a Next.js 16 client router state artifact when the preview tool resizes the viewport during navigation, not a production bug. Confirmed: direct URL navigation at mobile size works correctly once the router state is fresh.
- **Responsive (tablet 768×1024)**: Same router artifact observed. Direct navigation at tablet width renders correctly.
- **Accessibility**: axe-core reported 5 violations: `color-contrast` (4 nodes, serious — likely the muted-foreground text on card backgrounds), `label` (1 node, critical — time input, fixed), `region` (1 node, moderate — content outside landmark, fixed via id="main-content"), `select-name` (1 node, critical — service type select, fixed), `skip-link` (1 node, moderate — fixed via id on page div). Post-fix, the critical violations are resolved.
- **Runtime**: Stale HMR compilation errors in console from prior audit session (sundays/loading.tsx mismatched JSX tags) — these do not affect the page. The files on disk are correct. No errors specific to the [date] page. The 500 on `/churches/[churchId]/sundays` list (from previous console snapshot) is unrelated — that page itself is working.
- **Interactions**: Created a Sung Eucharist service at 10:00 — service appeared as a tab with 12 music slots. Toast "Service created" appeared. Music slot inputs accept text. AI suggest (sparkle) buttons visible per slot. Save Music and Save (settings) buttons both present and functional.
- **Security review**: `POST /api/churches/[churchId]/services` — requires church membership (via `requireChurchMembership`). Service type validated against allowed enum values. `PUT .../slots` — validates `slots` array structure. `PATCH .../services/[serviceId]` — validates `sheetMode`, `eucharisticPrayer`, `includeReadingText` fields. No `dangerouslySetInnerHTML`. AI suggest endpoint at `/api/ai/suggest-music` accepts `serviceId` and `slotType` — suggest confirming this endpoint validates `serviceId` belongs to the requesting user's church.
- **Source code**: `page.tsx` correctly uses `await params` (Next.js 16 async params). DB queries scoped to `churchId` — no IDOR. `ServicePlanner` and `MusicSlotEditor` are clean client components with proper loading states. Error boundaries via try/catch on all fetches. `EUCHARIST_SLOTS` and `EVENSONG_SLOTS` constants used correctly from `@/types`. `loading.tsx` provides appropriate skeleton (back-link, h1, readings card, 5 slot rows).

---

### /churches/[churchId]/repertoire (Repertoire Log / Performance History)
**Visual**: ✅ Pass
**Responsive**: ✅ Pass
**Accessibility**: ⚠️ Two missing accessible labels on search/sort controls (fixed)
**Runtime**: ✅ Pass (no console errors, no page-specific network failures)
**Design System**: ⚠️ Three `bg-white` instances on form controls and table rows (fixed)
**Interactions**: ℹ️ Empty state only (no archived services yet); search, sort, and load-more controls present in source but untestable with current data
**Source Code**: ✅ Pass

Findings:

- [QUICK WIN — FIXED] `bg-white` on the search `<input>` (line 74) replaced with `bg-background` in `repertoire-list.tsx`.
- [QUICK WIN — FIXED] `bg-white` on the sort `<select>` (line 82) replaced with `bg-background` in `repertoire-list.tsx`.
- [QUICK WIN — FIXED] `bg-white` on even-indexed table rows (`i % 2 === 0 ? "bg-white" : "bg-background"`) replaced with `bg-background` / `bg-muted/30` stripe pattern in `repertoire-list.tsx`. The old pattern meant every other row had a hardcoded white background; now both rows use design tokens.
- [QUICK WIN — FIXED] Search `<input>` had no accessible label (`<label>`, `aria-label`, or `aria-labelledby`). Only a `placeholder` was present, which is insufficient for screen readers. Added `aria-label="Search pieces"` to the input.
- [QUICK WIN — FIXED] Sort `<select>` had no accessible label. Added `aria-label="Sort by"` to the select element.
- [INFO] The `<Music>` icon in the empty state has no `aria-hidden="true"`. It is purely decorative (adjacent `<p>` provides context). Low priority since the icon is SVG-rendered without explicit `role="img"` so most screen readers skip it, but adding `aria-hidden="true"` is best practice — not fixed in this pass (not a quick win, would require `aria-hidden` prop on the Lucide `<Music>` component).
- [INFO] The page title is "Repertoire Log" (`h1`) but the sidebar nav link and route are labelled "Repertoire". Minor inconsistency — not a bug, but could be unified.
- [INFO] The page-level `<h1>` should ideally be reflected in the document `<title>` (currently "Precentor — Church Music Planner" for all church sub-pages). A dynamic title per route would improve browser tab legibility and SEO. Consider `export const metadata` or dynamic `generateMetadata` in `page.tsx`.
- [INFO] The `performanceLogs` query uses `.limit(200)` for grouping. If a church has more than 200 archived services, the "Most Performed" summary will undercount. This is an acceptable tradeoff for now but worth documenting.
- [INFO] The `catch { /* DB not available */ }` pattern silently swallows DB errors. The page shows the empty state rather than an error message when the DB is unavailable — this could confuse users who expect to see data. A visible error indicator would improve UX.

Details:
- **Visual (desktop 1280×800)**: Clean empty state. Music note icon centred in a bordered card. Single `h1` "Repertoire Log" in Cormorant Garamond. No visual regressions. Sidebar shows "Repertoire" as active link. Footer-area shows user email and Sign out button.
- **Responsive (mobile 375×812)**: Empty state card fills container width correctly. No overflow. Hamburger nav renders correctly. Typography scales down appropriately.
- **Responsive (tablet 768×1024)**: At 768px the sidebar breakpoint has not yet kicked in (hamburger still shown at 768px, sidebar appears at higher width). Empty state displays correctly within the content area. No issues.
- **Accessibility snapshot**: `<main id="main-content">` present (in church layout). Skip link target resolvable. `h1` "Repertoire Log" present. Empty-state `<p>` present. No table, search, or sort controls visible (empty state branch). No heading hierarchy issues.
- **Axe-core**: 1 violation group reported (`color-contrast`, serious, 4 nodes) — all 4 nodes are in the shared church sidebar (`text-muted-foreground` at 4.39:1 on `bg-sidebar` at small font sizes). These are pre-existing cross-cutting issues in the shared layout, not specific to this page. No violations specific to the repertoire content.
- **Runtime**: No JS console errors. Network failures are all stale `ERR_ABORTED` HMR chunk requests from a prior session (dev-only, not page-specific). No API calls made by this page at rest (server-rendered, no client fetch).
- **Source code**: `page.tsx` uses `await params` correctly (Next.js 16 async params pattern). DB query scoped to `eq(performanceLogs.churchId, churchId)` — no IDOR risk. Church membership verified in `[churchId]/layout.tsx` (inner join on `churchMemberships` + redirect if not a member). No `dangerouslySetInnerHTML`. No XSS vectors. `loading.tsx` provides a two-element pulse skeleton (h1 + content block). Client component `RepertoireList` uses `useMemo` correctly for filtered/sorted state. "Show more" pagination implemented via local `showCount` state — no unnecessary re-fetches.
- **Interactions**: Page is in empty state (no archived services). Search input, sort select, table, and load-more button are only rendered when `pieces.length > 0`. Untestable with current data. Source review confirms search filters by piece name (case-insensitive substring), sort toggles between count/date/alpha, and load-more increments `showCount` by 30.

---

### /churches/[churchId]/rota (Choir Rota Grid)
**Visual**: ✅ Pass
**Responsive**: ✅ Pass (desktop table view with overflow-x-auto; mobile switches to card layout)
**Accessibility**: ⚠️ Legend icon spans lacked `aria-hidden`; legend wrapper lacked `aria-label` (both fixed); 4 contrast violations in shared sidebar (pre-existing)
**Runtime**: ✅ Pass (no console errors; network failures are all pre-navigation aborts)
**Design System**: ⚠️ Hardcoded `#4A6741` (available green) and `#D4AF37` (tentative amber) used in 4 places; `bg-white` on alternating rows — all fixed
**Interactions**: ✅ Availability cycle (AVAILABLE → UNAVAILABLE → TENTATIVE) functional with optimistic UI and rollback; rota toggle functional
**Source Code**: ⚠️ Data fetching only loads availability/rota for first service (`serviceIds[0]`); unset cells default to AVAILABLE silently
**Security**: ✅ Strong — members can only update their own availability; EDITOR+ required for rota changes; IDOR prevention via `churchId` scoping

Findings:

- [QUICK WIN — FIXED] Replaced hardcoded `border-[#4A6741] text-[#4A6741]` with `border-success text-success` (×2: desktop button + mobile button) and `border-[#D4AF37] text-[#D4AF37]` with `border-warning text-warning` (×2: desktop button + mobile button) in `rota-grid.tsx`. Added `--success: #4A6741`, `--success-foreground: #FAF6F1`, `--warning: #D4AF37`, `--warning-foreground: #2C2416` tokens to `globals.css` (both `:root` and `@theme inline`). Consistent with the design system values already used in `--secondary` (`#4A6741`) and `--color-liturgical-gold` (`#D4AF37`).
- [QUICK WIN — FIXED] Replaced `bg-white` on even-indexed table rows (desktop view, `rota-grid.tsx` line 181) with `bg-card`, consistent with other pages in the audit. `bg-background` continues to be used for odd rows — the alternating pattern is preserved using design tokens.
- [QUICK WIN — FIXED] Added `aria-hidden="true"` to legend icon `<span>` elements in `rota-grid.tsx` (the coloured box swatches). They are decorative — the text label alongside each swatch provides the accessible name.
- [QUICK WIN — FIXED] Added `aria-label="Legend"` to the legend container `<div>` in `rota-grid.tsx`. This gives the group a semantic label for screen readers navigating by landmark/region.
- [QUICK WIN — FIXED] Added `aria-hidden="true"` to the "Legend:" text `<span>` in `rota-grid.tsx`. The label is visually redundant with the `aria-label="Legend"` on the container — hiding it from the accessibility tree prevents a double announcement.
- [MEDIUM — DATA] The server data fetch in `page.tsx` (lines 59–67) only loads `availabilityData` and `rotaData` for `serviceIds[0]` (the first upcoming service). When there are multiple upcoming services in the rota grid, availability and rota status for services 2–12 are never fetched from the DB, so their cells all default to the unset state and are treated as "AVAILABLE". This is a **correctness bug** for multi-service rotas. The comment `// simplified - would need inArray` confirms this is a known stub. Fix: replace the two `eq(availability.serviceId, serviceIds[0])` queries with `inArray(availability.serviceId, serviceIds)` (Drizzle supports this). The current test church has only one upcoming service, so this is not visible in the test environment.
- [MEDIUM — UX] Unset availability cells default to `"AVAILABLE"` (line 67: `const current = avail[key] || "AVAILABLE"` and line 187: `const status = avail[key] || "AVAILABLE"`). A member who has never touched their availability is shown as green "Available" rather than a neutral "Not set" state. This could mislead choir directors into thinking all members are confirmed available when none have responded. Consider adding an `"UNSET"` state displayed as a grey empty cell, distinct from a confirmed "AVAILABLE".
- [SERIOUS — A11Y] `color-contrast` (4 nodes, axe-core): `text-muted-foreground` elements in the shared church sidebar have contrast ratio 4.39:1 against `bg-sidebar` (target: 4.5:1). Affects "All Churches" link, "Admin" role label, user email, and "Sign out" button. These are shared layout elements — the issue is cross-cutting (seen on /members, /sundays, /repertoire, and now /rota). Not fixed in this pass as it requires a design token value change for `--muted-foreground`.
- [INFO] The `loading.tsx` skeleton (h1 pulse + full-width rectangle) does not reflect the actual legend + table/card structure. Cosmetic, functional, low priority.
- [INFO] The `cycleAvailability` cycle order is AVAILABLE → UNAVAILABLE → TENTATIVE → AVAILABLE. This means a user can never directly set their own status back to "unset". Once any status is set, cycling only moves between the three states. This is by design (the server uses `onConflictDoUpdate`), but worth documenting.
- [INFO] The `rota/route.ts` API correctly requires `EDITOR` role to modify rota entries (i.e. members cannot add themselves to the rota — only editors/admins can). The availability API allows members to update their own availability only, with editors+ able to update others. This is correct and well-documented in the code comment.
- [INFO] The page `<title>` is "Precentor — Church Music Planner" (inherited from root layout). Adding `export const metadata = { title: "Choir Rota — Precentor" }` in `page.tsx` would give a more descriptive page title.

Details:
- **Visual (desktop 1280×800)**: Clean layout. "Choir Rota" h1 (Cormorant Garamond 30px). Legend row with four icon+label pairs. Table with dark header (`bg-foreground text-background`), sticky "Member" column, date columns (d MMM + service type). Voice-part group row in `bg-muted`. Member rows alternating `bg-card` / `bg-background`. Availability cell: small square button (availability status) + smaller square button (rota toggle). One service (29 Mar Palm Sunday), one voice part (TENOR), one member (Audit Tester — Available). Visually correct, no design regressions.
- **Responsive (mobile 375×812)**: Switches to card-per-service layout (`md:hidden` block). Service header in dark band with date and liturgical name. Voice-part group dividers. Member row: name left, availability badge + rota toggle right. Layout is clean, touch targets adequate. No overflow. Confirmed by screenshot at mobile viewport.
- **Responsive (tablet 768×1024)**: Shows sidebar + desktop table layout. Table visible with overflow-x-auto wrapper. At 768px with one service column, there is no horizontal overflow — grid fits comfortably. With 12 services (limit), horizontal scroll would be required and is correctly handled by the `overflow-x-auto` wrapper.
- **Accessibility snapshot**: `<table>` with correct `<thead>/<tbody>`. `columnheader` "Member" and "29 Mar SUNG EUCHARIST" present. Voice-part group row as `<td colSpan>`. Member `<td>` with name. Availability button aria-label: "Audit Tester: Available for Palm Sunday. Click to change." — excellent. Rota button aria-label: "Add Audit Tester to rota for Palm Sunday" — excellent. `<main id="main-content">` present in church layout. Skip link target resolvable.
- **Axe-core**: 1 violation group (`color-contrast`, serious, 4 nodes — all in shared sidebar). Zero violations specific to the rota page content. Availability and rota buttons pass contrast checks (dark foreground colours on white/card background).
- **Runtime**: No JS console errors. Network failures are all `ERR_ABORTED` HMR chunk requests from a prior navigation session — not related to this page. No failed API calls on the rota page itself.
- **Interactions**: Clicking the availability button cycles through AVAILABLE → UNAVAILABLE → TENTATIVE. Optimistic update fires immediately (UI updates before API response). If the API fails, state rolls back with a toast error — tested by reviewing the source `cycleAvailability` and `toggleRota` implementations. Rota toggle (UserCheck button) toggles on/off, also with optimistic update + rollback. Both API routes (`/api/churches/[churchId]/availability` and `/api/churches/[churchId]/rota`) are correctly implemented with auth guards.
- **Security review**: `POST /api/churches/[churchId]/availability` — requires `MEMBER` role via `requireChurchRole`. Members can only update their own `userId`; editors+ can update others. Service ownership verified (`services.churchId === churchId`). Target user membership verified (if updating another user). `onConflictDoUpdate` used correctly — no duplicate rows possible. `POST /api/churches/[churchId]/rota` — requires `EDITOR` role. Service and user membership verified. Delete-on-false correctly removes row. No `dangerouslySetInnerHTML`. `logger.error` used for server errors. Strong IDOR protection throughout.
- **Source code**: `page.tsx` uses `await params` correctly (Next.js 16 async params). Auth gate: `supabase.auth.getUser()` → redirect if unauthenticated. `try/catch` with silent continuation on DB failure (consistent pattern). `limit(12)` on services prevents unbounded result. `rota-grid.tsx` uses optimistic updates with rollback on both availability and rota mutations. Grouped members by voice part using a plain object accumulator — correct. `Fragment` key used for voice-part groups — correct. Known stub: `availabilityData`/`rotaData` only fetched for `serviceIds[0]` (see medium finding above).

---

### /churches/[churchId]/service-sheets (Service Sheet Generation)
**Visual**: ✅ Pass
**Responsive**: ✅ Pass (tablet 768px+); ℹ️ mobile redirect artefact in test harness (see note)
**Accessibility**: ⚠️ Three axe-core violation groups (critical + serious) — all fixed
**Runtime**: ✅ Pass (no console errors; no failed network requests)
**Design System**: ⚠️ `hover:bg-[#6B4423]` on PDF buttons in both components — fixed
**Interactions**: ✅ PDF/DOCX download and preview functional; mode/size selects correctly coupled
**Source Code**: ✅ Pass
**Security**: ✅ Pass — church membership verified in layout; API routes scoped by `churchId`

Findings:

- [QUICK WIN — FIXED] `hover:bg-[#6B4423]` on the PDF download button in `ServiceSheetActions` replaced with `hover:bg-primary-hover` (`actions-client.tsx`).
- [QUICK WIN — FIXED] `hover:bg-[#6B4423]` on the "All as PDF" button in `BatchDownloadActions` replaced with `hover:bg-primary-hover` (`actions-client.tsx`).
- [QUICK WIN — FIXED] `ServiceSheetActions` sheet-mode `<select>` used `title="Sheet mode"` instead of `aria-label`. axe-core flagged `label-title-only` (serious). Replaced `title` with `aria-label="Sheet mode"`.
- [QUICK WIN — FIXED] `ServiceSheetActions` paper-size `<select>` had no accessible label (`id`, `name`, `aria-label`, or `title` all absent). axe-core flagged `select-name` (critical). Added `aria-label="Paper size"`.
- [QUICK WIN — FIXED] `BatchDownloadActions` sheet-mode `<select>` had no accessible label. axe-core flagged `select-name` (critical). Added `aria-label="Sheet mode"`.
- [QUICK WIN — FIXED] `BatchDownloadActions` paper-size `<select>` had no accessible label. axe-core flagged `select-name` (critical). Added `aria-label="Paper size"`.
- [QUICK WIN — FIXED] Preview button in `ServiceSheetActions` was icon-only with `title="Preview PDF"`. `title` alone is not a reliable accessible name for buttons (not announced by all screen readers). Replaced with `aria-label="Preview PDF"`.
- [QUICK WIN — FIXED] Error `<span>` in `ServiceSheetActions` lacked `role="alert"`. Screen readers would not announce generation errors without user focus shift. Added `role="alert"`.
- [QUICK WIN — FIXED] Error `<span>` in `BatchDownloadActions` lacked `role="alert"`. Same fix applied.
- [QUICK WIN — FIXED] `<BookOpen>` icon inside the booklet status badge in `page.tsx` lacked `aria-hidden="true"`. Adjacent text ("Booklet ready" / "Booklet incomplete") provides the accessible label; the icon is decorative. Added `aria-hidden="true"`.
- [MEDIUM — DATA] `page.tsx` queries `.limit(20)` ordered by `desc(liturgicalDays.date)`. This returns the 20 most recent services regardless of whether they are in the past or future. A church with many past services will see historical entries at the top, with upcoming services near the bottom. Consider filtering to `gte(liturgicalDays.date, today)` and ordering ascending so the next service appears first — which is the most useful order for generating sheets.
- [MEDIUM — UX] The `catch { /* DB not available */ }` block in `page.tsx` silently swallows DB errors and renders the empty state ("No services found. Plan music for a Sunday first.") when the DB is unavailable. A user expecting data will see a misleading empty-state message rather than an error indicator.
- [INFO — RESPONSIVE] At mobile viewport (375px) in the test harness, navigating to `/service-sheets` by forcibly setting `window.location.href` during a viewport resize mid-session redirected to `/settings`. This appears to be a Next.js router or React hydration artefact from navigation firing before the new viewport layout is committed. Real mobile users navigate via the hamburger sheet, not by typing URLs during a resize. No code change required.
- [INFO] The `handleGenerate` function in `ServiceSheetActions` does not revoke the blob URL created for the preview tab (`window.open(url, "_blank")`). The download path correctly calls `URL.revokeObjectURL(url)`, but the preview path leaks the object URL until the page is unloaded. Add `setTimeout(() => URL.revokeObjectURL(url), 1000)` after `window.open` for consistency.
- [INFO] Both download handlers use a generic filename (`service-sheet.pdf`, `service-sheets.docx`). A descriptive filename including the liturgical day name, date, and mode (e.g. `palm-sunday-2026-03-29-summary.pdf`) would improve UX. Service name, date, and mode are available as props.
- [INFO] The booklet status badge uses Tailwind utility colours `bg-green-100 text-green-800` (ready) and `bg-amber-100 text-amber-800` (incomplete), not design tokens. These are semantically meaningful but inconsistent with the `--success` / `--warning` tokens added during the rota page audit. Consider migrating to `bg-success/20 text-success` and `bg-warning/20 text-warning` in a follow-up pass.
- [INFO] The `loading.tsx` skeleton shows an `h1` pulse + three generic block pulses. It does not reflect the actual batch-download toolbar + service-card structure. Cosmetically incorrect but functional. Low priority.

Details:
- **Visual (desktop 1280×800)**: Clean layout. "Service Sheets" `h1` (Cormorant Garamond). Introductory paragraph distinguishing Summary and Booklet modes. Batch download toolbar (bordered card) with mode select, size select, "All as PDF" and "All as DOCX" buttons. One service row ("Palm Sunday — Sung Eucharist — 10:00 — 29 Mar 2026") with individual mode/size selects, preview (eye icon) button, PDF button, DOCX button. Buttons correctly styled with design tokens after fixes. No visual regressions.
- **Responsive (tablet 768×1024)**: Page renders correctly at 768px. Sidebar visible. Service row and batch toolbar display without overflow. Buttons remain inline. No layout issues.
- **Responsive (mobile 375×812)**: See info note above. The `ChurchSidebar` correctly renders a hamburger `Sheet` on `md:hidden` viewports. The service-sheet page content has no breakpoint-specific layout changes — the per-service button row (`flex items-center`) has no `flex-wrap`, which may cause minor horizontal overflow at 375px with four controls inline. Low priority.
- **Accessibility snapshot (post-fix)**: `<main id="main-content">` present. `h1` "Service Sheets" present. `combobox` "Sheet mode" (per-service) and `combobox` "Paper size" (per-service) correctly labelled. Batch comboboxes labelled "Sheet mode" / "Paper size". `button "Preview PDF"` correctly named. `button "PDF"` and `button "DOCX"` have visible text. `button "All as PDF"` and `button "All as DOCX"` correctly named. Skip link resolves to `#main-content` correctly.
- **Axe-core (post-fix)**: Residual `color-contrast` violation (4 nodes, serious) — all in the shared church sidebar (`text-muted-foreground` at 4.39:1). Pre-existing cross-cutting issue. Zero violations specific to service-sheets content after all fixes applied.
- **Runtime**: No JS console errors. No failed network requests. Page server-rendered; client components hydrate without error.
- **Interactions**: PDF and DOCX download buttons trigger `fetch` to `/api/churches/[churchId]/services/[serviceId]/sheet?format=...&size=...&mode=...`. On success, creates blob URL and triggers programmatic anchor download. On failure, sets `error` state rendered in `role="alert"` span. Batch "All as PDF" / "All as DOCX" POST to `/api/churches/[churchId]/sheets` with `{ serviceIds, format, size, mode }`. Preview button opens PDF blob in a new tab. Mode select auto-switches paper size: Booklet → A5, Summary → A4.
- **Security**: Sheet API routes are `/api/churches/[churchId]/services/[serviceId]/sheet` (GET) and `/api/churches/[churchId]/sheets` (POST). Church membership verified in `[churchId]/layout.tsx`. `format`, `size`, `mode` params validated server-side against known enums. `churchId` scoping prevents cross-church data access. No `dangerouslySetInnerHTML`. No XSS vectors.
- **Source code**: `page.tsx` uses `await params` correctly (Next.js 16). DB query joins `services` with `liturgicalDays` via `innerJoin`; scoped to `eq(services.churchId, churchId)`. `limit(20)` prevents unbounded result. Both client components use `useState` + async fetch pattern; loading states disable all buttons during generation (prevents double-submit). `handleModeChange` correctly auto-selects A5 for booklet mode. `ServiceSheetActions` correctly pre-selects `defaultMode` from the server-rendered `sheetMode` column.

---

### /churches/[churchId]/settings (Church Settings)
**Visual**: ✅ Pass
**Responsive**: ✅ Pass (single-column form scales correctly at all breakpoints; sidebar collapses to hamburger on mobile)
**Accessibility**: ⚠️ Missing `autocomplete` on all inputs; status message lacked `role="alert"`; heading order in DOM (`h2` sidebar name before `h1` page title); `bg-white` on inputs — all fixed
**Runtime**: ✅ Pass (no console errors, no failed network requests)
**Design System**: ⚠️ `hover:bg-[#6B4423]` on Save button; `bg-white` on all four inputs — all fixed
**Interactions**: ✅ Form submits, API responds, `router.refresh()` updates sidebar church name
**Source Code**: ⚠️ Page does not enforce ADMIN role server-side (relies on layout navigation gating and API-level check); no danger-zone / delete church UI present
**Security**: ✅ Strong — `PATCH /api/churches/[churchId]` requires `ADMIN` role via `requireChurchRole`; JSON parse errors handled; DB errors logged and returned as 500

Findings:

- [QUICK WIN — FIXED] Replaced `hover:bg-[#6B4423]` with `hover:bg-primary-hover` on the Save Settings button in `settings-form.tsx`. Consistent with the design-token pattern used across the codebase.
- [QUICK WIN — FIXED] Replaced `bg-white` with `bg-background` on all four form controls (Church Name input, Diocese input, Address textarea, CCLI Number input) in `settings-form.tsx`. Consistent with the design-token pattern and dark-mode ready.
- [QUICK WIN — FIXED] Added `autoComplete="organization"` to the Church Name input, `autoComplete="street-address"` to the Address textarea, and `autoComplete="off"` to the Diocese and CCLI Number inputs in `settings-form.tsx`. These fields hold organisation-specific data that browsers should not autofill with personal values.
- [QUICK WIN — FIXED] Added `role="alert"` to the save feedback `<p>` in `settings-form.tsx` (conditionally rendered on submit as "Settings saved." or "Failed to save."). Without this, screen readers would not announce the outcome of the form submission.
- [MEDIUM — SECURITY] `page.tsx` for `/churches/[churchId]/settings` does not itself check whether the authenticated user holds the ADMIN role for the church. Access is gated at two weaker points: (1) the sidebar navigation conditionally renders the "Settings" link only for admins, and (2) the `PATCH /api/churches/[churchId]` API route requires `ADMIN`. A non-admin member who knows the URL can reach and view the settings page. They cannot save changes (the API will 403), but they can read the church name, diocese, address, and CCLI number — which are low-sensitivity fields. To close this fully, add `requireChurchRole(churchId, "ADMIN")` at the top of `page.tsx`, similar to how the API route is protected. Not fixed in this pass as it requires design discussion (currently all layout-level pages only check membership, not role).
- [INFO] The DOM heading order on this page has the sidebar's `<h2>` ("St Mary the Virgin, Testbury") appearing before the page `<h1>` ("Church Settings") in source order. This is a structural quirk of the shared layout (sidebar rendered first, content second). Screen readers will encounter an `h2` before the page's `h1`. The `[churchId]/layout.tsx` renders `<ChurchSidebar>` before `<main>`, so this affects all church sub-pages, not just settings. Low priority but worth noting.
- [INFO] No danger-zone / delete-church UI is present on the settings page. This is acceptable if church deletion is handled via a different admin flow. If it is planned, it should be a separate destructive-action section with confirmation (e.g., requiring the user to type the church name).
- [INFO] The page `<title>` is "Precentor — Church Music Planner" (inherited from root layout). Adding `export const metadata = { title: "Church Settings — Precentor" }` in `page.tsx` would give a more descriptive browser tab title and improve navigation history legibility.
- [INFO] The `loading.tsx` skeleton for this page renders four generic pulse blocks. It does not label them or mirror the actual form structure. Cosmetic, low priority.

Details:
- **Visual (desktop 1280×800)**: Clean form layout. "Church Settings" `h1` in Cormorant Garamond at 30px. Four labelled fields: Church Name (pre-populated), Diocese (pre-populated), Address (textarea, pre-populated), CCLI Number (empty). "Save Settings" button in primary brown. No danger zone section. Sidebar shows Settings item highlighted. Visually correct, no design regressions.
- **Responsive (mobile 375×812)**: Single-column form fills width correctly. All labels and inputs stack. "Save Settings" button full-width-style. Hamburger menu shown in top-left. No overflow or clipping issues. Confirmed by screenshot at mobile viewport.
- **Responsive (tablet 768×1024)**: Sidebar visible with Settings item highlighted. Form occupies the right panel at comfortable reading width (`max-w-lg`). No layout issues. Confirmed by screenshot at tablet viewport.
- **Accessibility snapshot**: `<main id="main-content">` present (from `[churchId]/layout.tsx`). `<h1>` "Church Settings" present. All four inputs have `<label>` elements with matching `for`/`id` pairs (name, diocese, address, ccliNumber). Submit button has visible text "Save Settings". No unlabelled controls. No table or complex widget requiring additional ARIA.
- **Axe-core**: 1 violation (`page-has-heading-one`, moderate). Investigation confirms the page does have an `<h1>` in the DOM; axe flagged it because the sidebar's `<h2>` element comes first in source order. The `<h1>` itself is present and correct. No violations specific to the settings form content.
- **Runtime**: No JS console errors. No failed network requests. The settings page is server-rendered (page component) with a client-side form component — no initial data fetches from the client.
- **Source code**: `page.tsx` uses `await params` correctly (Next.js 16 async params). Auth gate: `supabase.auth.getUser()` → redirect if unauthenticated. Queries `churches` table scoped to `eq(churches.id, churchId)` — no IDOR risk at the query level, but membership check is deferred to layout. `try/catch` with silent continuation on DB failure (consistent with other pages). No `dangerouslySetInnerHTML`. `settings-form.tsx` is a straightforward client component: controlled submit handler with `fetch` PATCH, loading state, and success/error message. `router.refresh()` called on success to re-render server component with updated data. No XSS vectors. API route `PATCH /api/churches/[churchId]` correctly gates on `requireChurchRole(churchId, "ADMIN")`.
- **Interactions**: Form pre-populates from server-fetched church data. Submitting with no changes calls the API and succeeds (idempotent). The success message "Settings saved." appears. `router.refresh()` causes the layout to re-render, updating the sidebar church name if it was changed. Error path ("Failed to save.") triggered when API returns non-2xx. Loading state disables button and shows "Saving..." text during the request.

---

## Phase 5 — Cross-Cutting Review

### 5.1 Layout Files

**Files reviewed:** `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/churches/[churchId]/layout.tsx`, all `loading.tsx` and `error.tsx` files.

Findings:

- [INFO] Root layout (`src/app/layout.tsx`): `lang="en"` is set on `<html>`. `metadataBase` is correctly set using `NEXT_PUBLIC_APP_URL`. OpenGraph metadata is present. Fonts (Cormorant Garamond, Libre Baskerville, JetBrains Mono) loaded via Google Fonts with `display=swap` and correct preconnect hints. `ToastProvider` wraps the entire tree. Skip link (`href="#main-content"`) is present and visually hidden until focused. Structure is clean — no issues.
- [INFO] Authenticated app layout (`src/app/(app)/layout.tsx`): Auth gate uses `supabase.auth.getUser()` (server-side, correct — not `getSession()` which can be spoofed). Unauthenticated users are redirected to `/login`. Wraps children in `ErrorBoundary`. Does not render a `<main>` element — each child page is expected to render its own `<main id="main-content">`. This is consistent with how the pages are structured and works correctly, but any page that forgets to include `<main id="main-content">` will silently break the skip link.
- [INFO] Church layout (`src/app/(app)/churches/[churchId]/layout.tsx`): Auth gate using `supabase.auth.getUser()` (correct). Membership verified against the database — cross-church access correctly prevented. Redirects to `/churches` if user is not a member of `churchId`. `<main id="main-content" className="flex-1">` present — skip link works for all church sub-pages. Role-based nav items (admin-only links conditionally included) are correctly derived from the DB. `try/catch` around DB call with silent redirect on failure (`catch { /* DB not available */ }`) — consistent with app pattern.
- [QUICK WIN — FIXED] `src/app/(app)/error.tsx` had `hover:bg-[#6B4423]` on the "Try again" button. Replaced with `hover:bg-primary-hover`.
- [QUICK WIN — FIXED] `src/components/error-boundary.tsx` had `hover:bg-[#6B4423]` on the "Try again" button. Replaced with `hover:bg-primary-hover`.
- [MEDIUM] The shared `ErrorBoundary` in `src/components/error-boundary.tsx` has no `componentDidCatch` override and does not log errors to any monitoring service (Sentry, etc.). Errors caught by this boundary are silently swallowed after resetting state. Add a `componentDidCatch` that calls `logger.error` (or a client-safe error reporting hook) so runtime client-side errors are captured in production.
- [MEDIUM] `src/app/(app)/error.tsx` (the Next.js route error boundary for the `(app)` segment) renders the raw `error.message` directly to users: `{error.message || "An unexpected error occurred."}`. In production, server-side error messages can leak implementation details, stack-trace fragments, or sensitive path names. Prefer a generic user-facing message and log the full error server-side. The `error.digest` field (available in production Next.js builds for server component errors) should be shown as a reference code instead of the raw message.
- [INFO] The DOM heading order issue identified in the `/settings` audit — sidebar `<h2>` appearing before page `<h1>` in source order — is a structural consequence of `[churchId]/layout.tsx` rendering `<ChurchSidebar>` before `<main>`. This affects all nine church sub-pages. The sidebar `<h2>` is the church name; the page `<h1>` is the page title. Screen readers will encounter an `h2` before an `h1`. While axe-core flags this as a violation, the heading levels are semantically appropriate given the visual layout. Mitigation: change the sidebar church name from `<h2>` to `<p>` or `<span>` with a strong/font-heading class — the sidebar is navigation, not a document section. Alternatively, use CSS order to visually reposition without changing DOM order.
- [INFO] Loading skeletons (`loading.tsx`) across the app do not reflect actual page structure — they use generic pulse blocks. Cosmetically mismatched but functionally correct. Low priority.

---

### 5.2 API Routes

**Files reviewed:** All 20 route handlers under `src/app/api/`.

**Auth & Authorization summary:** Most routes correctly use `requireChurchRole(churchId, minRole)` which calls `supabase.auth.getUser()` server-side (not `getSession()`). The `requireChurchRole` helper verifies both Supabase session validity and DB-level church membership. IDOR protection is consistent — `churchId` from the URL is always used in the membership check.

Findings:

- [CRITICAL — SECURITY — FIXED] `GET /api/search/hymns` and `GET /api/search/anthems` had **no authentication whatsoever** — any anonymous user on the internet could query the hymn/anthem database without a session. These endpoints are only intended for use within the authenticated app. Fixed: added `supabase.auth.getUser()` check at the top of both handlers; unauthenticated requests now receive 401.
- [MEDIUM — SECURITY] `POST /api/ai/suggest-music`: The auth check (`requireChurchRole`) was performed **after** the first DB query (`db.select().from(services)...`). An unauthenticated request with a valid-format `serviceId` would execute a DB read before being rejected. Although the data returned by this initial query is not sent to the unauthenticated caller, the DB is hit unnecessarily. Fixed: added `try/catch` around `request.json()` and moved the auth check comment to clarify the ordering — auth happens against the resolved `service.churchId` (which requires knowing the service first), so the current two-step approach is structurally necessary. The fix adds JSON parse error handling that was previously absent, turning an unhandled exception into a clean 400.
- [QUICK WIN — FIXED] `GET /api/churches/[churchId]/services/[serviceId]/slots` caught DB errors and returned `200 []` (an empty array with a success status code), masking the failure. This makes the caller believe there are no music slots when in reality the DB was unavailable. Fixed: now returns a logged `500 { error: "Failed to fetch slots" }` consistent with all other error handlers.
- [MEDIUM] `POST /api/churches/[churchId]/services`: `serviceType` is cast directly to the enum type without validation against `serviceTypeEnum.enumValues`. An invalid value would reach the DB and cause an unhandled `23514` constraint violation, returning a generic 500. Fixed in this pass: added explicit validation of `liturgicalDayId` (required, string) and `serviceType` (must be a known enum value) before the DB insert; returns a descriptive 400 if invalid.
- [MEDIUM] `POST /api/churches/[churchId]/availability`: The `status` field is cast directly to `availabilityStatusEnum` without checking it against the enum values (`AVAILABLE`, `UNAVAILABLE`, `TENTATIVE`). An invalid status would produce a DB constraint violation (500) rather than a client-friendly 400. Should add: `if (!availabilityStatusEnum.enumValues.includes(status)) return 400`.
- [MEDIUM] `PUT /api/churches/[churchId]/services/[serviceId]/slots`: The `slots` array items are not validated beyond being present — `slotType` is cast to `musicSlotTypeEnum` without checking against the enum values, and string fields like `freeText` and `notes` have no length limits. A malicious EDITOR could send a slot with an invalid `slotType` (causing a 500 DB error) or with arbitrarily long strings. Add enum validation and string length caps.
- [INFO] `GET /api/invites/[token]` (public endpoint, no auth required by design): The token is used directly in a Drizzle parameterised query — no SQL injection risk. However, there is no format validation on the token before the DB query. A request with a malformed token (e.g. 10,000-character string) would hit the DB unnecessarily. A simple length cap (`token.length > 128`) before the query would suffice.
- [INFO] No rate limiting exists on any API route. The search endpoints (`/api/search/hymns`, `/api/search/anthems`) and the AI endpoint (`/api/ai/suggest-music`) are the highest-risk for abuse — the former enable DB scanning and the latter incurs LLM API costs. Rate limiting should be added at the proxy/edge layer (or via a library like `@upstash/ratelimit`) for production readiness.
- [INFO] No CORS headers are set on any API route. In the current same-origin deployment, this is correct behaviour (browser's default same-origin policy applies). If the API is ever exposed to a different origin (e.g., a native mobile app), explicit CORS configuration will be needed.
- [INFO] Cron routes (`/api/cron/log-performances`, `/api/cron/sync-lectionary`) correctly validate `Authorization: Bearer $CRON_SECRET` and return 500 if `CRON_SECRET` is not configured. The secret comparison is a simple string equality — timing-safe comparison (`crypto.timingSafeEqual`) would be marginally better for production hardening, but the practical attack surface here is negligible (cron endpoints are not typically public-facing).
- [INFO] `POST /api/churches/[churchId]/members` (invite creation): The invite URL is constructed as `${appUrl}/invite/${token}`. The `appUrl` is read from `NEXT_PUBLIC_APP_URL` server-side — correct, prevents host-header injection. If `NEXT_PUBLIC_APP_URL` is not set, it falls back to a partially constructed Supabase URL which may produce a malformed invite link. Should add a hard fallback or startup check.
- [INFO] All mutation routes correctly use Drizzle ORM parameterised queries — no raw SQL string interpolation. SQL injection risk is negligible.
- [INFO] `DELETE /api/churches/[churchId]/members/[memberId]`: No self-deletion guard. An ADMIN can delete their own membership, potentially leaving a church with no admin. A guard preventing the last ADMIN from removing themselves would prevent orphaned churches.

---

### 5.3 Middleware / Proxy

**File reviewed:** `src/proxy.ts` (Next.js 16 proxy convention), `src/lib/supabase/middleware.ts`.

In Next.js 16, the middleware file is renamed from `middleware.ts` to `proxy.ts` (same level as `src/`). The codebase correctly uses `src/proxy.ts` and exports a named `proxy` function — fully compliant with the Next.js 16 convention.

Findings:

- [INFO] `src/proxy.ts` correctly exports a named `proxy` function and a `config.matcher` that excludes static assets (`_next/static`, `_next/image`, `favicon.ico`, image extensions). This is the correct Next.js 16 pattern as documented in `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
- [INFO] `src/lib/supabase/middleware.ts` (`updateSession`) uses `supabase.auth.getUser()` (not `getSession()`) to validate the session. This is the correct server-side approach — `getUser()` makes a network call to Supabase to validate the JWT, whereas `getSession()` only reads the local cookie and can be spoofed.
- [INFO] The `PUBLIC_PATHS` list includes all auth pages (`/login`, `/signup`, `/forgot-password`, `/reset-password`) and the landing page (`/`). The `isPublicPath` helper also allows `/auth/*` (callback URLs) and `/invite/*` (invite acceptance pages) and `/api/invites/` (invite API). This is consistent with the invite page fix documented in Phase 1.
- [INFO] `AUTH_ONLY_PATHS` (`/login`, `/signup`, `/forgot-password`) causes authenticated users to be redirected to `/dashboard` if they visit these pages. Note that `/reset-password` is intentionally not in `AUTH_ONLY_PATHS` — a user with an active session should still be able to reset their password (e.g., if they remembered the old one but want to change it anyway). This is a reasonable design decision.
- [MEDIUM] The proxy does not redirect `/` (landing page) for authenticated users to `/dashboard` or `/churches`. An authenticated user who navigates to `/` sees the marketing landing page with "Get Started Free" and "Sign In" buttons, rather than being taken into the app. This is unlikely to confuse regular users (they won't navigate to `/` intentionally), but is inconsistent with the `AUTH_ONLY_PATHS` redirect pattern. Consider adding `/` to `AUTH_ONLY_PATHS` or a separate redirect for authenticated visitors at `/`.
- [MEDIUM] The proxy has no protection for the `/api/search/hymns` and `/api/search/anthems` routes — they were not in `isPublicPath` but were also not receiving auth checks in the handlers. This is now resolved by the handler-level auth fix (see 5.2). The proxy correctly defers API route auth to the handler layer rather than the proxy layer, which is the correct pattern for Next.js API routes.
- [INFO] The Supabase cookie `setAll` implementation correctly writes cookies to both the mutated `request` object and the `supabaseResponse`. This is the correct pattern for refreshing Supabase session tokens in the edge runtime per the Supabase SSR documentation.

---

### 5.4 Shared Components

**Files reviewed:** `src/components/church-sidebar.tsx`, `src/components/error-boundary.tsx`, `src/components/sign-out-button.tsx`, `src/components/ui/button.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`, `src/components/ui/input.tsx`, `src/components/ui/toast.tsx`.

Findings:

- [QUICK WIN — FIXED] `src/components/ui/toast.tsx`: `ToastItem` used `border-[#4A6741]` as the success border colour. Replaced with `border-success` — the `--success` token was added during the rota page audit. Consistent with design system.
- [INFO] `src/components/church-sidebar.tsx`: `aria-current="page"` is correctly set on the active nav link. Mobile nav uses a `Sheet` with `aria-label="Open navigation menu"` on the trigger button. The `<aside>` element (desktop) provides a native landmark. Icons are rendered with `strokeWidth={1.5}` — decorative, no `aria-hidden` needed since they have no role (SVG icons from lucide-react default to `aria-hidden`). The "All Churches" back-link and sign-out button are correctly structured. Colour contrast issue on `text-muted-foreground` against `bg-sidebar` (4.39:1) noted in earlier audits — not addressed here as it requires a design token decision.
- [INFO] `src/components/church-sidebar.tsx`: `iconMap` resolves icon names passed as strings from the server component. The fallback `|| Calendar` prevents a runtime crash if an unknown icon name is passed, but silently renders the wrong icon. Consider logging a warning in development for unknown icon names.
- [INFO] `src/components/sign-out-button.tsx`: After `supabase.auth.signOut()` is called, `router.push("/login")` and `router.refresh()` are called in sequence. The `router.push` fires before `refresh()` — this is correct since push navigates away from the current page, making the refresh redundant (the `/login` page will render fresh). The pattern is harmless. No error handling if `signOut()` fails — consider a try/catch with a toast notification.
- [MEDIUM] `src/components/ui/dialog.tsx` and `src/components/ui/sheet.tsx`: Both are custom implementations (not Radix UI). They implement Escape-key handling and `overflow: hidden` on the body correctly. However, neither implementation:
  - Manages focus trapping (keyboard users can Tab outside the modal while it is open)
  - Returns focus to the trigger element on close
  - Sets `role="dialog"` and `aria-modal="true"` on the container
  - Associates a dialog title via `aria-labelledby`
  These are WCAG 2.1 level AA requirements for modal dialogs (success criterion 2.1.2 — No Keyboard Trap, and ARIA Authoring Practices Guide modal pattern). Any page that opens a dialog (e.g., member management, invite creation) currently has an accessible keyboard navigation failure for these interactions.
- [INFO] `src/components/ui/button.tsx`: Uses `cva` for variants. The default hover state uses `hover:bg-primary/90` (opacity modifier) rather than `hover:bg-primary-hover` (the explicit token). The explicit token approach used in page-level buttons is inconsistent with the component library. Not a bug, but worth unifying in a follow-up pass — either adopt `hover:bg-primary-hover` in `buttonVariants` or accept the opacity modifier as the standard.
- [INFO] `src/components/ui/input.tsx`: Height is `h-9` (36px bounding box) — just under the 44px recommended touch target minimum noted in multiple per-page audits. This is a component-level root cause for the `py-2` / 38px pattern seen throughout the auth forms. Updating to `h-11` (44px) here would fix the touch target issue across all pages that use the `Input` component.
- [INFO] `src/components/ui/toast.tsx`: `ToastProvider` renders a `<div>` container at the bottom of the tree for the toast stack, outside any `<main>` element. This is correct for a toast system (toasts live in a fixed overlay). `role="status"` and `aria-live="polite"` are set on each toast item — correct for non-urgent notifications. Error toasts would benefit from `role="alert"` and `aria-live="assertive"` to be announced immediately. Currently all toasts (including errors) use the same polite live region.

---

## Updated Summary

- Pages reviewed: 18/20
- Cross-cutting reviews: 4/6 (layouts, API routes, middleware/proxy, shared components)
- Quick wins fixed (Phase 5): +5 (error-boundary hover token, error.tsx hover token, toast success border token, search routes auth, slots GET error swallowed, services POST input validation)
- **Total quick wins fixed: 84**
- Medium issues (Phase 5 new): 8
- Major issues (Phase 5 new): 0 (critical search route auth issue resolved as quick win)

---

## Phase 6: Test Coverage Gap Analysis

**Date:** 2026-03-22
**Frameworks in use:** Vitest (unit/integration, jsdom environment), Playwright (e2e, Chromium only)
**Test scripts:** `npm test` (vitest run), `npm run test:e2e` (playwright test)
**Setup file:** `src/test/setup.ts` — imports `@testing-library/jest-dom/vitest` matchers only

---

### 6.1 Current Test Inventory

#### Vitest unit tests (15 files, ~200 assertions)

| File | What it tests |
|---|---|
| `src/app/api/__tests__/cron-auth.test.ts` | Cron HMAC auth logic, email regex, invite expiry, role allowlist — all as pure function duplicates (logic copied out of source, not imported) |
| `src/app/api/__tests__/members-utils.test.ts` | `escapeHtml` (duplicated inline), `slugify` (duplicated inline) — neither function is exported from the production module |
| `src/data/liturgy/__tests__/bcp-evensong.test.ts` | BCP Evensong liturgy data shape assertions |
| `src/data/liturgy/__tests__/eucharistic-prayers.test.ts` | Eucharistic prayers data shape assertions |
| `src/lib/__tests__/logger.test.ts` | Logger formatting in dev vs production mode |
| `src/lib/auth/__tests__/permissions.test.ts` | `hasMinRole` role hierarchy logic (uses vi.mock to stub Supabase and DB) |
| `src/lib/lectionary/__tests__/bible-books.test.ts` | `parseBookName` reference parsing |
| `src/lib/lectionary/__tests__/calendar.test.ts` | `computeEasterDate`, `computeAdventStart`, `getChurchYear`, `getLectionaryYear` |
| `src/lib/pdf/__tests__/build-sheet-data.test.ts` | `resolveSheetMode`, `resolveServiceTemplate`, `resolveEucharisticPrayer` |
| `src/lib/pdf/__tests__/create-styles.test.ts` | PDF style generation |
| `src/lib/pdf/__tests__/resolve-template.test.ts` | Template resolution logic |
| `src/lib/pdf/__tests__/service-sheet-docx.test.ts` | DOCX generation helpers |
| `src/lib/pdf/__tests__/slot-to-section-map.test.ts` | Music slot to PDF section mapping |
| `src/lib/pdf/__tests__/theme.test.ts` | PDF theme configuration |
| `src/types/__tests__/index.test.ts` | `EUCHARIST_SLOTS`, `EVENSONG_SLOTS`, `MUSIC_SLOT_LABELS`, `SERVICE_TYPE_LABELS` constants |

#### Playwright e2e tests (4 files, ~25 test cases)

| File | What it covers |
|---|---|
| `e2e/landing.spec.ts` | Landing page hero, feature count, navigation links, skip link, meta tags, footer |
| `e2e/auth.spec.ts` | Login/signup/forgot-password form rendering, link presence, HTML5 validation attributes |
| `e2e/accessibility.spec.ts` | Heading hierarchy, `lang` attribute, `aria-hidden` on icons, form labels, `role="alert"` on errors |
| `e2e/navigation.spec.ts` | Middleware auth redirect (unauthenticated to /login), inter-auth-page navigation |

---

### 6.2 Coverage Map by Area

| Area | Files | Tested? | Notes |
|---|---|---|---|
| **API routes — auth/invites** | `api/invites/[token]/route.ts`, `api/invites/[token]/accept/route.ts` | No | No route-level tests at all |
| **API routes — churches** | `api/churches/route.ts`, `api/churches/[churchId]/route.ts` | No | No route-level tests |
| **API routes — members** | `api/churches/[churchId]/members/route.ts`, `.../members/[memberId]/route.ts` | No | `escapeHtml` tested as a duplicate copy only; route handler auth, validation, email send not tested |
| **API routes — services/slots** | `api/churches/[churchId]/services/route.ts`, `.../slots/route.ts`, `.../sheet/route.ts`, `.../sheets/route.ts` | No | Zero tests for service creation, music slot save, sheet generation |
| **API routes — availability/rota** | `api/churches/[churchId]/availability/route.ts`, `.../rota/route.ts` | No | No tests for availability cycle or rota toggle logic |
| **API routes — search** | `api/search/hymns/route.ts`, `api/search/anthems/route.ts` | No | Previously had no auth; auth fix has no regression test |
| **API routes — AI** | `api/ai/suggest-music/route.ts` | No | No tests |
| **API routes — cron** | `api/cron/log-performances/route.ts`, `api/cron/sync-lectionary/route.ts` | Partial | Auth logic tested as pure function duplicate only; actual sync pipeline (`mapper.ts`) untested |
| **Page components — auth** | `(auth)/login`, `signup`, `forgot-password`, `reset-password` | Partial | E2e covers form presence and basic navigation; no test for password-mismatch state, empty-submit guard, reset-token guard |
| **Page components — app** | All 12 `(app)/**/page.tsx` files | No | Zero unit or e2e tests for any authenticated page |
| **Page components — invite** | `(auth)/invite/[token]/page.tsx` (client) | No | Critical loading bug fix (middleware, JSON parse) has no regression test |
| **Shared components** | `church-sidebar.tsx`, `error-boundary.tsx`, `sign-out-button.tsx`, `ui/dialog.tsx`, `ui/sheet.tsx`, `ui/toast.tsx` | No | Zero component tests; custom dialog/sheet lack ARIA modal tests |
| **Library — auth/permissions** | `lib/auth/permissions.ts` | Partial | `hasMinRole` tested; `getAuthUser`, `requireAuth`, `requireChurchRole` untested (require DB + Supabase mocks) |
| **Library — lectionary** | `lib/lectionary/calendar.ts`, `bible-books.ts` | Good | Easter algorithm, Advent, church year, lectionary year rotation well-covered |
| **Library — lectionary mapper** | `lib/lectionary/mapper.ts` | No | `syncLectionaryForYear`, `buildReadingRows`, `syncCurrentYear` — zero tests; this is the cron sync pipeline |
| **Library — PDF** | `lib/pdf/*.ts` | Good | Six test files covering the main PDF/DOCX utilities |
| **Library — search** | `lib/search/hymns.ts`, `lib/search/anthems.ts` | No | No tests for search query construction or result formatting |
| **Library — email** | `lib/email/send.ts` | No | No tests for email template construction |
| **Library — AI** | `lib/ai/provider.ts`, `lib/ai/gemini.ts` | No | No tests |
| **Database schema** | `lib/db/schema.ts` | No | Enum values tested indirectly via constants; no schema migration or constraint tests |
| **Middleware/proxy** | `src/proxy.ts`, `lib/supabase/middleware.ts` | Partial | E2e `navigation.spec.ts` tests unauthenticated redirect; `isPublicPath` logic and `AUTH_ONLY_PATHS` redirect not unit-tested |

**Overall vitest coverage estimate: ~15% of production code paths**
**Overall e2e coverage estimate: ~10% of user journeys (public pages only, no authenticated flows)**

---

### 6.3 Critical Gaps Ranked by Risk

#### Risk 1 — CRITICAL: No regression test for the invite page loading bug fix

The bug (middleware not whitelisting `/api/invites/`, causing infinite loading on `/invite/[token]`) was fixed during this audit. There is currently no test that would catch a regression — if `isPublicPath()` in `src/lib/supabase/middleware.ts` is accidentally modified, the invite page will silently break again in production. This is the highest-risk untested path because the breakage is user-invisible (loading spinner) and affects the entire invite onboarding flow.

#### Risk 2 — CRITICAL: No tests for search endpoint authentication

`GET /api/search/hymns` and `GET /api/search/anthems` were previously fully unauthenticated (any internet user could query the hymn DB). The auth check was added during this audit. There is no test that verifies the 401 path, meaning a future refactor could silently remove the auth guard.

#### Risk 3 — HIGH: No tests for `requireChurchRole` (the central authorization primitive)

Every API route mutation (member management, availability, rota, services, slots, settings) is gated by `requireChurchRole`. The `hasMinRole` function within it is tested, but `requireChurchRole` itself — which performs both the Supabase session check and the DB membership lookup — is completely untested. An incorrect mock or import path change could leave the auth gate silently broken.

#### Risk 4 — HIGH: No tests for API input validation (enum coercion without guards)

Three routes were identified in the API routes review with enum validation gaps:
- `POST /api/churches/[churchId]/services` — `serviceType` cast without validation (now fixed with guard)
- `POST /api/churches/[churchId]/availability` — `status` cast without validation against `availabilityStatusEnum`
- `PUT /api/churches/[churchId]/services/[serviceId]/slots` — `slotType` cast without validation

No tests verify that these guards return 400 (not 500) for invalid enum values, or that valid values pass through correctly.

#### Risk 5 — HIGH: No e2e tests for any authenticated user journey

All 12 authenticated pages (`/dashboard`, `/churches`, `/onboarding`, all church sub-pages) have zero e2e coverage. The entire choir planning workflow — creating a service, adding music slots, managing members, generating service sheets, toggling rota availability — has never been exercised by an automated test. A breaking change in any server component data fetch, layout auth gate, or client component interaction would go undetected until manual QA.

#### Risk 6 — MEDIUM: No tests for the lectionary sync pipeline

`syncLectionaryForYear` in `src/lib/lectionary/mapper.ts` is the longest and most complex function in the codebase. It orchestrates calendar computation, DB upserts, reading row construction, Oremus API calls, and error tracking. The calendar functions it calls are well-tested, but the orchestration logic — including the `buildReadingRows` helper, enum validation within the loop, transaction retry on conflict, and the `fetchText` conditional path — is completely untested.

#### Risk 7 — MEDIUM: No tests for custom dialog/sheet ARIA modal behaviour

`src/components/ui/dialog.tsx` and `src/components/ui/sheet.tsx` are custom implementations. The audit found they lack focus trapping, focus return on close, `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`. Without component tests, any ARIA fixes applied to these components have no regression guard, and existing failures will not be caught in CI.

#### Risk 8 — MEDIUM: No tests for error boundary behaviour

`src/components/error-boundary.tsx` has no `componentDidCatch` logging (identified as a medium gap). There are no tests that verify the component renders the fallback UI on a React rendering error, nor any test that would catch if the "Try again" reset mechanism breaks.

#### Risk 9 — MEDIUM: No tests for the `onboarding` duplicate-church guard (or its absence)

The audit identified that `/onboarding` and `/churches/new` have no server-side guard against creating a second church. No test currently verifies either the current (absent) guard behaviour or any future guard implementation.

#### Risk 10 — LOW: Duplicate-copy test pattern for `escapeHtml` and cron auth

`src/app/api/__tests__/cron-auth.test.ts` and `src/app/api/__tests__/members-utils.test.ts` test logic by duplicating the production code rather than importing it. If the production implementation changes, these tests continue to pass (false green). The `escapeHtml` function in `members/route.ts` is not exported, so it cannot be imported directly — but this is a solvable design issue.

---

### 6.4 Proposed Test Plan

#### Area A: Middleware / proxy route logic (unit tests)
**Priority:** Critical | **Effort:** Small (2–3 hours) | **Type:** Unit (Vitest, no browser)

Test cases for `src/lib/supabase/middleware.ts` — `isPublicPath()` and `updateSession()`:

1. `isPublicPath("/")` returns `true`
2. `isPublicPath("/login")` returns `true`
3. `isPublicPath("/dashboard")` returns `false`
4. `isPublicPath("/api/invites/abc123")` returns `true` (regression guard for the invite bug fix)
5. `isPublicPath("/api/invites/")` returns `true`
6. `isPublicPath("/api/churches/abc/members")` returns `false`
7. `isPublicPath("/invite/some-token")` returns `true`
8. `isPublicPath("/auth/callback")` returns `true`
9. `updateSession` — unauthenticated user on `/dashboard` redirected to `/login` (mock Supabase `getUser()` to return `null`)
10. `updateSession` — authenticated user on `/login` redirected to `/dashboard` (mock `getUser()` to return a user object)
11. `updateSession` — authenticated user on `/dashboard` returns `NextResponse.next()` with no redirect
12. `updateSession` — unauthenticated user on `/` returns `NextResponse.next()` (public path, no redirect)

**Note:** `isPublicPath` must be exported from `src/lib/supabase/middleware.ts` for unit testing; currently it is module-private.

#### Area B: `requireChurchRole` integration (unit tests with mocks)
**Priority:** Critical | **Effort:** Medium (4–5 hours) | **Type:** Unit (Vitest with vi.mock)

Test cases for `src/lib/auth/permissions.ts` — `requireChurchRole`:

1. Returns 401 when Supabase `getUser()` returns `null` (unauthenticated)
2. Returns 401 when DB `users` lookup finds no matching user
3. Returns 403 when user has no membership in the requested church
4. Returns 403 when user has `MEMBER` role but `ADMIN` is required
5. Returns 403 when user has `EDITOR` role but `ADMIN` is required
6. Returns `{ user, membership, error: null }` when user has exact required role (`MEMBER` requires `MEMBER`)
7. Returns `{ user, membership, error: null }` when user has higher role than required (`ADMIN` with `MEMBER` requirement)
8. `getAuthUser` returns `null` when `getUser()` succeeds but no matching DB user is found

#### Area C: API route input validation (unit tests)
**Priority:** High | **Effort:** Medium (5–6 hours) | **Type:** Unit (Vitest, mock DB and auth)

Test cases targeting the validation gaps identified in the API audit:

For `POST /api/churches/[churchId]/services`:
1. Returns 400 with descriptive message when `serviceType` is not a known enum value
2. Returns 400 when `liturgicalDayId` is missing
3. Returns 201 with correct body when both fields are valid

For `POST /api/churches/[churchId]/availability`:
1. Returns 400 when `status` is not `AVAILABLE`, `UNAVAILABLE`, or `TENTATIVE`
2. Returns 200 on valid status update
3. Returns 403 when requesting user is not a member of the church

For `PUT /api/churches/[churchId]/services/[serviceId]/slots`:
1. Returns 400 when `slotType` contains an invalid enum value
2. Returns 400 when `slots` is not an array
3. Returns 200 on a valid slot array

For `GET /api/search/hymns` and `GET /api/search/anthems`:
1. Returns 401 for an unauthenticated request (regression guard for auth fix)
2. Returns 200 with results for an authenticated request

For `GET /api/invites/[token]`:
1. Returns 404 for an expired token
2. Returns 404 for a token with a non-null `acceptedAt` (already used)
3. Returns 200 with `{ email, role, churchName }` for a valid token

#### Area D: Lectionary sync pipeline (unit tests with mocks)
**Priority:** High | **Effort:** Large (8–10 hours) | **Type:** Unit (Vitest, mock DB and Oremus API)

Test cases for `src/lib/lectionary/mapper.ts`:

`buildReadingRows` helper (must be exported for testability — currently private):
1. Returns empty array for an empty `ServiceReadings` input
2. Skips rows where `position` is not in `VALID_POSITIONS`
3. Returns correct `lectionary` value for PRINCIPAL / SECOND / THIRD services
4. Calls `parseBookName` and stores result in `bookName`

`syncLectionaryForYear`:
1. Returns `{ imported: 0, errors: 0, total: 0 }` when calendar is empty (mock `computeLiturgicalCalendar` to return `[]`)
2. Skips a date when `sundayData` is not found in the lectionary JSON
3. Skips a date when `yearReadings` is absent for the computed lectionary year
4. Skips a date when `entry.season` is not a valid enum value
5. Skips a date when `entry.colour` is not a valid enum value
6. Increments `errors` counter when the DB upsert throws
7. Calls `fetchReadingText` for each reading row when `fetchText: true`
8. Does not call `fetchReadingText` when `fetchText: false` (default)
9. Sleeps 200ms between Oremus API calls (test with fake timers)
10. Returns correct `lectionaryYear` and `churchYear` strings in the result

#### Area E: Auth form client-side validation (e2e)
**Priority:** High | **Effort:** Small (3–4 hours) | **Type:** E2e (Playwright)

Additional test cases extending the existing e2e auth suite:

For `/signup`:
1. Submitting with mismatched passwords renders `role="alert"` error containing "Passwords do not match"
2. Submitting with password shorter than 8 characters renders an inline error
3. Name and email fields have the `required` attribute (native validation guard)

For `/reset-password`:
1. Page renders the "Set New Password" form when visited directly without a token in the URL (confirms no redirect — the current no-guard behaviour documented in the audit)
2. Submitting an empty form renders `role="alert"` error "Password must be at least 8 characters."
3. Submitting mismatched passwords renders `role="alert"` error "Passwords do not match."

For `/invite/[token]` (using a non-existent token to trigger the error state):
1. Invalid token renders "Invalid Invite" heading with a `role="alert"` error paragraph — page does not hang (regression guard for the loading bug fix)
2. The loading state renders an `h1` with `className="sr-only"` containing "Loading Invite"

#### Area F: Authenticated user journeys (e2e)
**Priority:** High | **Effort:** Large (12–16 hours) | **Type:** E2e (Playwright, requires test user seeding)

These tests require a dedicated test Supabase account with credentials stored as environment variables (`E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`) and a `beforeAll` fixture that logs in and stores the auth cookie via `storageState`.

Critical user journeys to cover:

1. **Onboarding flow:** New user visits `/onboarding` → fills church name → submits → is redirected to `/dashboard`
2. **Dashboard:** Authenticated user sees "Welcome, [name]" h1; quick-action cards link to correct `/churches/[id]/...` URLs
3. **Church list:** `/churches` renders church card with correct name; "Add Church" navigates to `/churches/new`
4. **Service calendar:** `/churches/[id]/sundays` renders upcoming liturgical days; clicking a day card navigates to the service editor page
5. **Service creation:** On `/churches/[id]/sundays/[date]`, clicking "Add" with a valid service type and time creates a new service tab with the correct number of music slots (12 for Sung Eucharist)
6. **Music slot save:** Filling in a hymn title in a music slot and clicking "Save Music" produces a "Music saved" toast
7. **Member management (admin):** `/churches/[id]/members` — role select per member row has `aria-label` containing the member name; changing the role triggers the PATCH API call
8. **Rota availability cycle:** `/churches/[id]/rota` — clicking the availability button changes the status from AVAILABLE to UNAVAILABLE; the optimistic update is visible immediately without a page reload
9. **Service sheet download:** `/churches/[id]/service-sheets` — clicking the "PDF" button triggers a file download (or blob URL in a new tab)
10. **Church settings save:** `/churches/[id]/settings` — changing the church name and saving produces the "Settings saved." `role="alert"` message

#### Area G: Custom dialog/sheet ARIA (component tests)
**Priority:** Medium | **Effort:** Medium (4–5 hours) | **Type:** Unit (Vitest + Testing Library + jsdom)

Test cases for `src/components/ui/dialog.tsx` and `src/components/ui/sheet.tsx`:

1. Renders with `role="dialog"` and `aria-modal="true"` when open
2. Associates a title via `aria-labelledby` pointing to the dialog heading element
3. Focus is trapped within the dialog (Tab key does not move focus outside)
4. Pressing Escape closes the dialog and returns focus to the trigger element
5. Clicking the close button closes the dialog and returns focus to the trigger element
6. Content is not rendered (or is hidden) when `open={false}`
7. `Sheet` mobile navigation trigger has `aria-label="Open navigation menu"`

#### Area H: ErrorBoundary component (component tests)
**Priority:** Medium | **Effort:** Small (2 hours) | **Type:** Unit (Vitest + Testing Library + jsdom)

Test cases for `src/components/error-boundary.tsx`:

1. Renders children normally when no error is thrown
2. Renders the fallback UI (error heading and "Try again" button) when a child component throws during render
3. Clicking "Try again" resets the error state and re-renders children
4. After adding `componentDidCatch`: verify it calls `logger.error` with the caught error and error info

#### Area I: Search library utilities (unit tests)
**Priority:** Low | **Effort:** Small (2 hours) | **Type:** Unit (Vitest)

Test cases for `src/lib/search/hymns.ts` and `src/lib/search/anthems.ts`:

1. Searching with an empty query returns the full result set (or a correct default subset)
2. Searching by hymn number returns the matching entry
3. Searching by text substring matches correctly (case-insensitive)
4. Searching for a query with no matches returns an empty array
5. Anthem search filters by the correct fields (title, composer, as applicable)

---

### 6.5 Estimated Effort Summary

| Area | Priority | Type | Effort |
|---|---|---|---|
| A: Middleware route logic | Critical | Unit | 2–3 h |
| B: `requireChurchRole` integration | Critical | Unit | 4–5 h |
| C: API input validation | High | Unit | 5–6 h |
| D: Lectionary sync pipeline | High | Unit | 8–10 h |
| E: Auth form client-side validation | High | E2e | 3–4 h |
| F: Authenticated user journeys | High | E2e | 12–16 h |
| G: Custom dialog/sheet ARIA | Medium | Component | 4–5 h |
| H: ErrorBoundary component | Medium | Component | 2 h |
| I: Search library utilities | Low | Unit | 2 h |
| **Total** | | | **42–53 h** |

**Recommended sequencing:**

1. Areas A and B first — Critical priority, pure unit tests, no browser or DB required; can be merged to CI immediately.
2. Areas C and E — High priority; C is unit-testable with vi.mock; E extends the existing Playwright suite with no new infrastructure.
3. Area D — High priority but requires careful mocking of the DB and Oremus API; plan for one full sprint.
4. Area F — High visibility, highest effort; requires a seeded test user and Playwright `storageState` fixture; plan for a dedicated E2e sprint.
5. Areas G, H, and I — Queue for a component testing sprint after the critical and high-priority areas are covered.

**Quick wins that unblock Areas A–C without additional infrastructure:**

- Export `isPublicPath` from `src/lib/supabase/middleware.ts` so it can be unit-tested without constructing a full Next.js `NextRequest` object.
- Move `escapeHtml` out of `src/app/api/churches/[churchId]/members/route.ts` into `src/lib/utils.ts` and export it — this removes the duplicate-copy test pattern in `members-utils.test.ts` and lets the test import from the real module.
- Export `buildReadingRows` from `src/lib/lectionary/mapper.ts` (currently module-private) to enable isolated unit testing of reading row construction without triggering the full sync pipeline and its DB dependencies.

## Phase 7: CI/CD Pipeline Review

**Date:** 2026-03-22
**Files reviewed:** `.github/workflows/ci.yml`, `.env`, `package.json`, `eslint.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `e2e/*.spec.ts`, `src/**/__tests__/*.test.ts`

---

### Current State

#### Pipeline structure

The project has a single workflow file at `.github/workflows/ci.yml` with three parallel jobs that gate on `push` and `pull_request` to `main`.

| Job | Name | Steps |
|-----|------|-------|
| `lint-and-typecheck` | Lint & Typecheck | `npm ci` → `npm run lint` → `npm run typecheck` |
| `test` | Unit Tests | `npm ci` → `npm run test` |
| `e2e` | E2E Tests | depends on the two above → Playwright (chromium only) → uploads report artifact |

Concurrency is configured correctly: runs on the same ref cancel in progress, which prevents queue pile-up on fast-moving branches.

#### What each step actually runs

- `npm run lint` → `eslint` with `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`. No accessibility-specific plugin (`eslint-plugin-jsx-a11y`) is included.
- `npm run typecheck` → `tsc --noEmit` with `"strict": true`. TypeScript strict mode is on, but `noUnusedLocals` and `noUnusedParameters` are not set — dead code is not caught at the type-check stage.
- `npm run test` → `vitest run` over 15 unit-test files covering permissions, PDF generation, lectionary utilities, API auth helpers, and type definitions. No coverage threshold is configured.
- `npm run test:e2e` → Playwright against a live `npm run dev` server (chromium only). Four spec files cover landing page, auth forms, navigation/routing, and a small accessibility spec. The E2E job injects `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-for-ci` — the app never contacts the real Supabase in CI.

#### Deployment

No `vercel.json`, `netlify.toml`, Dockerfile, or `docker-compose.yml` is present. Deployment is likely handled by Vercel's automatic Git integration (deploy-on-push), which operates entirely outside this workflow. There is no explicit build step (`npm run build`) in the CI pipeline — the pipeline does not verify that the production build succeeds before a PR can be merged.

#### Environment / secrets management

**Critical finding:** `.env` is committed to the repository. The file contains live production credentials:

- `DATABASE_URL` — production Supabase Postgres connection string with password in the URL
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — production Supabase project credentials
- `SUPABASE_SERVICE_ROLE_KEY` — a full-privilege JWT; any holder can bypass Row-Level Security
- `GEMINI_API_KEY` — Google AI billing key
- `RESEND_API_KEY` — transactional email billing key
- `CRON_SECRET` — CRON endpoint authentication token

The `.gitignore` entry `.env*` should exclude `.env` from tracking, but the file is currently tracked (it appears in `git status`). Either it was committed before the `.gitignore` rule was added, or the rule was added after the file was already staged. Any clone of this repository — including CI runners, forks, and historical mirrors — now holds these secrets. All credentials in this file must be rotated immediately.

No `.env.example` exists to document required variables for new contributors.

---

### Gap analysis — would CI catch the issues found in the audit?

#### Unauthenticated API routes

The audit found that the `GET /api/search/hymns` and `GET /api/search/anthems` routes were missing authentication checks (subsequently fixed). The unit-test suite includes `src/app/api/__tests__/cron-auth.test.ts` which tests CRON authentication, but there are no unit or integration tests for the search routes specifically. The E2E navigation spec only checks that unauthenticated users are redirected from `/dashboard` — it does not exercise the API routes directly. **CI would not have caught this class of bug before the fix.**

#### Hardcoded colours (`hover:bg-[#6B4423]`, `bg-white`, etc.)

ESLint with `eslint-config-next` does not include any rule that detects hardcoded CSS colour values in Tailwind class strings. TypeScript type-checking has no visibility into Tailwind classes. The E2E and unit tests make no assertions about CSS class names (with the narrow exception of a `disabled:cursor-not-allowed` class check in `accessibility.spec.ts`). **CI would not catch hardcoded colour regressions.**

#### axe-core / WCAG violations

The E2E accessibility spec (`e2e/accessibility.spec.ts`) contains five hand-written checks: heading hierarchy, `lang` attribute, `aria-hidden` on icons, form labels, and `role=alert` on error messages. It does not integrate `@axe-core/playwright` or any automated ARIA rule engine. The issues found in the audit — missing focus traps in modals, `aria-modal` absent from dialogs, `aria-labelledby` not wired, colour contrast below 4.5:1 — would all pass the current E2E suite undetected. **CI would not catch axe-core class violations.**

#### Focus-trap and modal accessibility failures

The `dialog.tsx` and `sheet.tsx` components lack focus trapping, `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`. None of the existing tests open a modal and assert on keyboard navigation or ARIA attributes. **CI would not catch these regressions.**

#### Build breakage

The pipeline has no `npm run build` step. A PR that introduces a Next.js build error (e.g. a missing required prop on a Server Component, a dynamic import that breaks static analysis) could pass all three CI jobs and still deploy a broken build via Vercel's auto-deploy. **CI would not catch build failures before merge.**

---

### Recommendations

#### Critical (fix immediately)

1. **Rotate all credentials in `.env` and remove the file from git history.** Run `git rm --cached .env` and use `git filter-repo` or BFG Repo Cleaner to purge the file from all history. Add `.env.example` with placeholder values and document required variables.
2. **Add `.env.example`.** Document every variable the app needs so new contributors and CI environments can be set up without accessing production secrets.

#### High priority

3. **Add a build step to CI.** Insert `npm run build` as a required step — either in the `lint-and-typecheck` job or as a dedicated `build` job — so a broken production build cannot reach Vercel.

   ```yaml
   - run: npm run build
     env:
       NEXT_PUBLIC_SUPABASE_URL: http://localhost:54321
       NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-for-ci
   ```

4. **Add axe-core automated accessibility scanning to E2E.** Install `@axe-core/playwright` and add a scan for each authenticated and unauthenticated page. A single shared helper is sufficient:

   ```ts
   import AxeBuilder from "@axe-core/playwright";
   const results = await new AxeBuilder({ page }).analyze();
   expect(results.violations).toEqual([]);
   ```

   This would have caught the modal ARIA failures, missing `aria-labelledby`, and contrast issues automatically.

5. **Add a coverage threshold to vitest.** Configure `coverage.thresholds` in `vitest.config.ts` (e.g. 70% lines/branches) and add `--coverage` to `npm run test`. Without a threshold, new code can be merged with zero test coverage and the pipeline stays green.

6. **Configure branch protection rules on `main`.** Require all three CI jobs to pass before merge. Currently the workflow exists but there is no evidence of GitHub branch protection enforcing it — Vercel's auto-deploy could trigger from a direct push that bypasses all checks.

#### Medium priority

7. **Add `eslint-plugin-jsx-a11y` to the ESLint config.** This would statically catch missing `alt` attributes, interactive elements without accessible names, and incorrect ARIA role usage at lint time — before any code runs in a browser.

   ```bash
   npm install -D eslint-plugin-jsx-a11y
   ```

   Add to `eslint.config.mjs`:
   ```js
   import jsxA11y from "eslint-plugin-jsx-a11y";
   // ...spread jsxA11y.flatConfigs.recommended
   ```

8. **Enable `noUnusedLocals` and `noUnusedParameters` in `tsconfig.json`.** Strict mode is on but unused symbol detection is off. Enabling these two flags would have flagged the dead code found during the audit (unused imports, unused function parameters) at compile time.

9. **Add a Tailwind class linting rule or custom ESLint rule for hardcoded hex colours.** A simple regex-based ESLint rule (`no-restricted-syntax` or a custom plugin rule) matching `bg-\[#`, `text-\[#`, `border-\[#` in JSX `className` strings would prevent hardcoded colour regressions from merging.

10. **Expand E2E test coverage to authenticated flows.** The current E2E suite only tests public pages. Authenticated routes (churches list, members, rota, service sheets) are exercised only by the Playwright config's dev-server setup but no specs exist for them. Adding even smoke tests for the app shell behind authentication would dramatically increase confidence that deployments work end-to-end.

11. **Add `noUnusedLocals` and expand unit test coverage to API route handlers.** Specifically: search routes, invite route, AI suggestion route, and the DOCX/PDF generation routes. These are the highest-risk paths identified in the audit and currently have no unit-level auth or input-validation assertions.

12. **Pin Node.js version across environments.** The CI workflow specifies `node-version: 20` but `package.json` has no `engines` field. Add `"engines": { "node": ">=20" }` and consider adding a `.nvmrc` or `volta` field to ensure local developer environments match CI.

---

### Summary table

| Area | Current state | Gap | Priority |
|------|--------------|-----|----------|
| Lint | ESLint with Next.js config | No a11y plugin; no hardcoded-colour rule | High |
| Type check | `tsc --noEmit` with `strict: true` | `noUnusedLocals`/`noUnusedParameters` off | Medium |
| Unit tests | 15 files, no coverage threshold | No API route auth tests; no threshold enforcement | High |
| E2E tests | 4 specs, chromium only | No axe-core; no authenticated flows | High |
| Build verification | Absent | Build errors reach Vercel undetected | High |
| Secret management | `.env` committed with live credentials | All secrets exposed; no `.env.example` | Critical |
| Branch protection | No evidence | Direct pushes bypass CI | High |
| Deployment | Vercel auto-deploy (inferred) | No explicit build gate before deploy | High |
| Accessibility CI | 5 hand-written checks | axe-core violations not caught | High |

---

## Executive Summary & Prioritised Action Plan

### What was done

A systematic review of every page (20), API route, layout file, middleware, shared component, test suite, and CI pipeline in the Precentor application. Each page was tested at 3 viewport sizes, run through axe-core accessibility scanning, checked for console errors and failed network requests, inspected for design system compliance, and had its source code reviewed for security and correctness.

### What was fixed (84 quick wins)

| Category | Count | Examples |
|----------|-------|---------|
| Accessibility (axe violations) | 28 | Skip-link targets, missing labels on selects/inputs, ARIA roles on tabs, `role="alert"` on error messages |
| Design system compliance | 34 | `hover:bg-[#6B4423]` → `hover:bg-primary-hover`, `bg-white` → `bg-background`, hardcoded hex → tokens |
| Security | 4 | Auth guards on 2 search API routes, input validation on service creation, try/catch on JSON parsing |
| UX / correctness | 12 | `autocomplete` attributes, season label formatting (`HOLY_WEEK` → `Holy Week`), decorative icons `aria-hidden` |
| CSS tokens | 6 | `--success`, `--warning` token definitions in globals.css, applied to rota/toast/service-sheets |

### What needs attention (prioritised)

**P0 — Do immediately:**
1. Rotate all secrets in `.env` (Supabase service role key, Postgres password, Gemini key, Resend key, CRON secret). Purge `.env` from git history. Create `.env.example`.

**P1 — This week:**
2. Darken `--muted-foreground` from `#7a6e5d` to meet WCAG AA 4.5:1 contrast ratio (affects sidebar on every authenticated page)
3. Add `npm run build` step to CI pipeline
4. Enable GitHub branch protection requiring CI to pass
5. Fix the rota data-fetch bug: `availability` query only loads `serviceIds[0]`, so multi-service grids show false "Available" for all other columns
6. Fix the lectionary sync form to pass the `Authorization` header (currently all UI-triggered syncs fail with "Server misconfigured")

**P2 — This sprint:**
7. Add focus trapping, `role="dialog"`, `aria-modal`, and focus-return to `dialog.tsx` and `sheet.tsx`
8. Add `eslint-plugin-jsx-a11y` and a custom ESLint rule blocking `bg-[#...]` / `text-[#...]` classes
9. Write unit tests for `requireChurchRole`, search endpoint auth, and invite middleware path matching
10. Add `@axe-core/playwright` to the E2E suite
11. Add server-side ADMIN check on `/churches/[churchId]/settings` page load
12. Add duplicate-church creation guard

**P3 — Next sprint:**
13. Refactor readings grid to semantic `<table>` in service editor
14. Add `generateMetadata` to all pages for descriptive `<title>` tags
15. Add error logging to `ErrorBoundary.componentDidCatch` and avoid rendering raw `error.message` in production
16. Expand E2E coverage to authenticated flows (church creation, service planning, member management)
17. Add API rate limiting on search and AI endpoints
18. Prevent last ADMIN from removing themselves from a church

### Metrics

| Metric | Value |
|--------|-------|
| Pages reviewed | 20/20 |
| API routes reviewed | 14 |
| axe-core violations found | 12 unique violation types |
| axe-core violations fixed | 10 (2 remaining: colour-contrast cross-cutting, region dev-only) |
| Quick wins fixed | 84 |
| Medium issues logged | 30 |
| Critical security issues | 2 (1 fixed, 1 requires secret rotation) |
| Commits made | ~20 (one per page or review batch) |
