# Plan: Restore April 3 Seller's Compliance homepage

**Created:** 2026-04-15
**Status:** Implemented
**Request:** Bring back the public marketing homepage that was on sellerscompliance.com on April 3 (bold black header, "Keep Escrow Moving" hero, $125 pricing) — grafting it onto the current repo without disturbing the working admin app.

---

## Overview

### What This Plan Accomplishes

Restore the April 3 public marketing homepage at `/` so sellerscompliance.com once again has a real landing page — while keeping the currently-working admin app at `/admin/*` fully functional. Also re-brand the admin shell from "DisptchMama" back to "Seller's Compliance".

### Why This Matters

Right now sellerscompliance.com silently redirects to `/admin/dispatch`, which hits the login wall. Any real customer hitting the root domain sees a login screen — not a marketing site. Restoring the public homepage fixes the public brand presence and is the prerequisite for later work (phase 2: the `/order` booking flow).

---

## Current State

### Relevant Existing Structure

- `src/app/page.tsx` — 5-line `redirect('/admin/dispatch')`
- `src/app/layout.tsx` — root layout with Space Grotesk + Syne fonts loaded, `<title>DisptchMama | Dispatch Board</title>`
- `src/app/globals.css` — Tailwind v4, CSS variables, neo-brutalist utilities (admin styling). Standard Tailwind color palettes (stone, amber, red) available out of the box.
- `src/components/admin/layout/AdminSidebar.tsx` — hardcoded "DisptchMama" branding, Truck icon, yellow-on-slate color scheme
- `src/proxy.ts` — only matches `/admin/:path*` and `/login`; does **not** touch `/`
- `package.json` — name `"disptchmama"`; has all runtime deps the old homepage needs (react 19, next 16, lucide-react, tailwind v4)
- Orphaned git commit `d0cec1f` (Apr 3, 22:48 PDT) — contains the complete April 3 homepage + PublicHeader + all assets. Verified matches user's screenshot (Keep Escrow Moving, $125 fee, SC badge logo).

### Gaps or Problems Being Addressed

- Public homepage is gone — `/` is a redirect to the admin login
- Admin shell still brands as "DisptchMama" — user wants "Seller's Compliance"
- Page `<title>` says "DisptchMama | Dispatch Board"
- PWA webmanifest says "DisptchMama"

---

## Proposed Changes

### Summary of Changes

- Copy the April 3 public homepage (`page.tsx`) and its only custom component (`PublicHeader.tsx`) verbatim from commit `d0cec1f`
- Copy the 4 public image assets from `d0cec1f` into `public/`
- Replace the 5-line redirect at `src/app/page.tsx` with the real homepage
- Fix `src/app/layout.tsx` metadata (title + description)
- Rebrand `AdminSidebar.tsx` from "DisptchMama" → "Seller's Compliance"
- Update `package.json` name
- Update `public/site.webmanifest` if it references DisptchMama
- Leave `proxy.ts` alone (already doesn't touch `/`)
- Leave `/order` link in the CTA pointing to `/order` (will 404 until phase 2, per user decision)
- Do NOT restore the old `/login`, `/admin/*`, or `/order` routes — we keep the current working versions and leave order for phase 2
- Do NOT restore any old components besides `PublicHeader`

### New Files to Create

| File Path | Purpose |
|---|---|
| `src/components/public/PublicHeader.tsx` | Sticky black header with SC logo, phone CTA, section nav, and mobile menu |
| `public/Seller_Compliance_SVG_File.svg` | Primary logo used by PublicHeader |
| `public/sc-logo.svg` | Logo variant (kept for any other references) |
| `public/sc-logo.png` | PNG logo fallback |
| `public/sellerscompliance_hero.png` | Hero background image (~2MB) |

### Files to Modify

| File Path | Changes |
|---|---|
| `src/app/page.tsx` | Replace 5-line redirect with the 715-line homepage from `d0cec1f` |
| `src/app/layout.tsx` | Change `<title>` to "Seller's Compliance" + update description; keep Google Fonts + favicon setup |
| `src/components/admin/layout/AdminSidebar.tsx` | Replace "DisptchMama" / "Dispatch Board" text with "Seller's Compliance" / "Admin" (or similar); keep the Truck icon + colors (admin is still neo-brutalist) |
| `package.json` | Rename `"disptchmama"` → `"sellers-compliance"` |
| `public/site.webmanifest` | Update `name`/`short_name` if they reference DisptchMama |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Cherry-pick files, don't cherry-pick commits.** Commit `d0cec1f` contains an entire old repo state (different admin, different schema, Stripe integration). Cherry-picking the commit would reintroduce all the dead code we just cleaned up. We copy only `page.tsx`, `PublicHeader.tsx`, and 4 assets — the minimum viable homepage surface.

2. **Keep the old homepage code verbatim.** No refactoring, no "improvements." The user confirmed this version looks/works right. Faithful restoration minimizes risk of visual regressions.

3. **Leave `/order` broken for now.** Phase 2 (booking flow restoration) is a separate effort because it requires rewriting DB inserts against the Seller's Compliance schema and verifying Stripe/email env vars. User explicitly chose "homepage only" and accepted that the "Book $125 Inspection" CTA will 404.

4. **Don't touch `proxy.ts`.** The matcher is `['/admin/:path*', '/login']` — it already skips `/` entirely, so the public homepage works without middleware changes. No need to touch auth logic.

5. **Don't auto-redirect admins from `/` to `/admin/dispatch`.** User chose option (a): public homepage always. Admins use `/admin/dispatch` bookmark. Cleaner separation between public and internal.

6. **Admin still keeps neo-brutalist styling.** Only the brand name changes. The yellow/slate/truck visual language stays — this is an internal tool, different audience from the marketing site.

### Alternatives Considered

- **`git checkout d0cec1f -- src/app/page.tsx` (worktree-style full restore):** Rejected — imports `PublicHeader` which doesn't exist in current repo; also pulls in an old homepage + old admin coexistence we don't want. Selective copy is cleaner.
- **Rebrand admin heavier (colors, sidebar style too):** Rejected — scope creep. Fix the one-word brand label; leave visual system alone unless user asks.
- **Add a "Home" link back to `/` from the admin sidebar:** Rejected — internal users don't need it. Can add later if someone asks.

### Open Questions

None — user has answered all scoping questions.

---

## Step-by-Step Tasks

### Step 1: Copy the 4 image assets from `d0cec1f` into `public/`

Use `git show` to extract each asset and write it to the working tree. These are binary / text files; need to handle them appropriately.

**Actions:**

- `git show d0cec1f:public/Seller_Compliance_SVG_File.svg > public/Seller_Compliance_SVG_File.svg`
- `git show d0cec1f:public/sc-logo.svg > public/sc-logo.svg`
- `git show d0cec1f:public/sc-logo.png > public/sc-logo.png` (binary — use `git cat-file blob` or equivalent)
- `git show d0cec1f:public/sellerscompliance_hero.png > public/sellerscompliance_hero.png` (binary)
- Verify with `ls -la public/` that all 4 files landed and sizes are plausible (hero ≈ 2MB, PNG logo ≈ 62KB, SVGs ≈ a few KB each)

**Files affected:**

- `public/Seller_Compliance_SVG_File.svg` (new)
- `public/sc-logo.svg` (new)
- `public/sc-logo.png` (new)
- `public/sellerscompliance_hero.png` (new)

---

### Step 2: Create `src/components/public/PublicHeader.tsx`

Copy the file verbatim from `d0cec1f`.

**Actions:**

- Ensure directory exists: `mkdir -p src/components/public`
- `git show d0cec1f:src/components/public/PublicHeader.tsx > src/components/public/PublicHeader.tsx`
- Open file, confirm imports resolve against current repo (`react`, `next/link`, `next/image`, `lucide-react` all present)

**Files affected:**

- `src/components/public/PublicHeader.tsx` (new)

---

### Step 3: Replace `src/app/page.tsx` with the April 3 homepage

**Actions:**

- `git show d0cec1f:src/app/page.tsx > src/app/page.tsx`
- Verify file size is ~715 lines
- Confirm imports all resolve (PublicHeader from step 2; lucide-react icons; next/link; next/image; react useState)

**Files affected:**

- `src/app/page.tsx` (rewrite)

---

### Step 4: Update `src/app/layout.tsx` metadata

Change the `metadata` export so the browser tab title and meta description reflect Seller's Compliance, not DisptchMama. Keep everything else (favicon setup, font preconnects, body className) unchanged.

**Actions:**

- Change `title: "DisptchMama | Dispatch Board"` → `title: "Seller's Compliance | California Home Sale Compliance Inspections"`
- Change description to something matching the homepage copy, e.g., `"Same-day California home compliance inspections in Los Angeles & Orange County. $125 flat fee, state-required safety items handled fast."`
- Leave icons, fonts, body, and layout structure alone

**Files affected:**

- `src/app/layout.tsx`

---

### Step 5: Rebrand `AdminSidebar.tsx`

Change the two visible "DisptchMama" strings to "Seller's Compliance" and update the subtitle. Keep the truck icon and all colors/layout — admin is an internal tool, separate visual language from the public site.

**Actions:**

- Line ~94: `"DisptchMama"` → `"Seller's Compliance"`
- Line ~97: `"Dispatch Board"` → `"Admin"` (or `"Operations"` — pick one; I'll use "Admin" for brevity)
- Line ~134: `"DisptchMama &copy; 2026"` → `"Seller's Compliance &copy; 2026"`

**Files affected:**

- `src/components/admin/layout/AdminSidebar.tsx`

---

### Step 6: Update `package.json` name

**Actions:**

- Change `"name": "disptchmama"` → `"name": "sellers-compliance"`

**Files affected:**

- `package.json`

---

### Step 7: Update `public/site.webmanifest` if needed

Read the file; if it references DisptchMama, rename to Seller's Compliance.

**Actions:**

- Read `public/site.webmanifest`
- If present, change `name` / `short_name` fields to "Seller's Compliance"

**Files affected:**

- `public/site.webmanifest` (if it contains DisptchMama references)

---

### Step 8: Build & verify locally

**Actions:**

- Run `npx tsc --noEmit` — expect zero type errors
- Run `npm run build` — expect successful build
- Start dev server: `npm run dev` (default port 3000)
- Visit `http://localhost:3000/` — confirm homepage renders with:
  - Black header, SC logo, phone CTA, nav links
  - "Keep Escrow Moving. We Handle the Compliance." hero
  - House photo background
  - Red "Book $125 Inspection" CTA
  - Scroll down: Services / About / Book Now / FAQ / Contact sections render
- Visit `http://localhost:3000/admin/dispatch` — confirm admin app still works (after logging in), sidebar now says "Seller's Compliance"
- Compare side-by-side with preview worktree on port 3001 (it's still running) — should look identical

**Files affected:**

- None (verification only)

---

### Step 9: Commit & push

**Actions:**

- `git status` to review changed files
- `git add` the modified/new files (leave unrelated `aios/` edits, `plans/`, `.claude/settings.local.json` untouched — same approach as prior commit)
- Commit with a message like:
  ```
  restore Seller's Compliance public homepage and rebrand admin

  Brings back the April 3 marketing homepage (cherry-picked from
  orphaned commit d0cec1f) and rebrands the admin shell from
  DisptchMama back to Seller's Compliance. The /order booking
  flow is deferred to a follow-up.

  - src/app/page.tsx: restore 715-line homepage (was a redirect)
  - src/components/public/PublicHeader.tsx: sticky black header with
    SC logo, phone CTA, and section nav
  - public/: restore SC logo SVGs + hero image
  - layout.tsx/sidebar/package.json/webmanifest: rebrand to SC
  ```
- `git push origin main` — triggers Vercel deployment
- Wait for Vercel build to go green, then verify sellerscompliance.com shows the restored homepage

**Files affected:**

- None (deployment)

---

### Step 10: (Optional) Tear down the preview worktree

Once the production deploy is confirmed working and the user no longer needs side-by-side comparison, clean up.

**Actions:**

- Stop the background dev server (`b2599s0hv`)
- `git worktree remove /Users/morrisanderson/Projects-clean/Sellers-Compliance-preview`
- Optionally delete the directory's `node_modules` / the whole dir if not auto-removed

**Files affected:**

- None (filesystem cleanup outside the repo)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/proxy.ts` — matcher excludes `/`, so no change needed
- All admin pages reference `AdminSidebar` — no breaking change, just rebrand

### Updates Needed for Consistency

- None beyond what's listed in the steps.

### Impact on Existing Workflows

- **Admin users**: `/` no longer auto-redirects to `/admin/dispatch`. They must navigate to `/admin/dispatch` directly (bookmark recommended). Per user's explicit decision.
- **Public users**: `/` now serves a real marketing page instead of a login wall.
- **Vercel deploy**: one push triggers one deploy, same as always.

---

## Validation Checklist

- [ ] All 4 public assets exist in `public/` with non-zero sizes
- [ ] `src/components/public/PublicHeader.tsx` exists and compiles
- [ ] `src/app/page.tsx` is ~715 lines (not 5)
- [ ] `npx tsc --noEmit` reports zero errors
- [ ] `npm run build` succeeds
- [ ] Local `/` renders homepage matching preview on :3001
- [ ] Local `/admin/dispatch` still works, sidebar says "Seller's Compliance"
- [ ] Browser tab title on `/` says "Seller's Compliance"
- [ ] Commit pushed, Vercel build green
- [ ] Production `sellerscompliance.com` loads the homepage

---

## Success Criteria

1. `https://sellerscompliance.com/` displays the April 3 marketing homepage matching the user's screenshot, with no visual regressions
2. `https://sellerscompliance.com/admin/dispatch` continues to load (for authenticated inspectors/admins) — the admin app is unaffected
3. The admin sidebar and browser tab title read "Seller's Compliance", not "DisptchMama"
4. Clicking "Book $125 Inspection" goes to `/order` (which will 404 — accepted trade-off until phase 2)
5. TypeScript compiles cleanly; `npm run build` succeeds; Vercel deploy is green

---

## Notes

- **Phase 2 (separate plan):** The `/order` booking flow needs DB insert logic rewritten against the Seller's Compliance schema (the old version targeted an older shape). It also needs Stripe env vars verified and the notification email service wired up. That'll be its own plan once phase 1 is live.
- **Future cleanup:** The `aios/` context docs still say "DisptchMama" in many places. Out of scope for this plan — they're internal docs, not user-facing.
- **Preview worktree:** Kept running on port 3001 until implementation is done, per user request. Tear-down is step 10.

---

## Implementation Notes

**Implemented:** 2026-04-15

### Summary

- Restored the April 3 public homepage at `/` (654 lines) from orphaned commit `d0cec1f`
- Created `src/components/public/PublicHeader.tsx` (124 lines) — sticky black header with SC logo, phone CTA, section nav, mobile menu
- Confirmed all 4 public image assets (`Seller_Compliance_SVG_File.svg`, `sc-logo.svg`, `sc-logo.png`, `sellerscompliance_hero.png`) were already in `public/` and byte-identical to `d0cec1f`
- Rebranded admin shell: AdminSidebar text, layout.tsx metadata title/description, package.json name, site.webmanifest name/short_name — all from "DisptchMama" → "Seller's Compliance"
- Verified with `npx tsc --noEmit` (zero errors) and `npm run build` (11 routes, clean)

### Deviations from Plan

- **Step 1 shortcut:** The 4 assets were already present and matched `d0cec1f` exactly, so no copy was needed. Plan said "Copy"; actual action was "verify and skip."
- **Shell cwd mishap during initial run:** First `git show > file` extractions for `page.tsx` and `PublicHeader.tsx` wrote to the preview worktree instead of the main repo because the shell's cwd was still in the preview dir from an earlier `cd`. Caught on `git status` reveal, re-ran with absolute paths. Net result is correct; worth noting for future runs to always use absolute paths with `git show > file` redirection.

### Issues Encountered

- Stale `.next` dev cache in the main repo had references to routes from an older state (d0cec1f routes like `/inspector/*`, `/order/*`) which caused spurious tsc errors. Resolved by `rm -rf .next` before rebuilding.
- The Next.js plugin validator flagged the existing external Google Fonts `<link>` tags in `layout.tsx` as a non-blocking recommendation (use `next/font` instead). Intentionally not addressed — out of scope per plan's decision #2 (faithful restoration, no unrelated refactoring). Worth a follow-up task.

### Follow-ups (not in this plan)

1. **Phase 2: `/order` booking flow restoration** — rewrite DB inserts to target Seller's Compliance schema (customers + properties + inspections), verify Stripe env vars, wire notification emails.
2. **`next/font` migration** — move Space Grotesk + Syne loading from external `<link>` to `next/font` for zero-CLS and self-hosted fonts.
3. **`aios/` doc sweep** — internal docs still reference "DisptchMama" in many places.
