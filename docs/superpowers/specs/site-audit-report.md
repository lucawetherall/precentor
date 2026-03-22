# Precentor Site Audit Report

**Date:** 2026-03-22
**Status:** In Progress
**Branch:** claude/awesome-colden

## Summary
- Pages reviewed: 2/20
- Cross-cutting reviews: 0/6
- Quick wins fixed: 2
- Medium issues: 2
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
