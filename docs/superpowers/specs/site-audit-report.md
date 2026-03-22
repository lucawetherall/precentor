# Precentor Site Audit Report

**Date:** 2026-03-22
**Status:** In Progress
**Branch:** claude/awesome-colden

## Summary
- Pages reviewed: 4/20
- Cross-cutting reviews: 0/6
- Quick wins fixed: 8
- Medium issues: 4
- Major issues: 0

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
