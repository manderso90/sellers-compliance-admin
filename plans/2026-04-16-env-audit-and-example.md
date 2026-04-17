# Plan: Environment Variable Audit & `.env.example`

**Created:** 2026-04-16
**Status:** Implemented
**Request:** Audit all environment variable usage, create `.env.example`, produce a gap report, and document what belongs in Vercel project settings.

---

## Overview

### What This Plan Accomplishes

A complete inventory of every `process.env.*` reference in the codebase, compared against what's actually in `.env.local` today. Produces a well-organized `.env.example` with placeholders and inline docs, a gap report identifying missing/unused vars, and guidance on what goes in Vercel vs. local dev.

### Why This Matters

The app currently has **9 distinct env vars** referenced in source code but only **2 defined** in `.env.local`. The remaining 7 are presumably set in Vercel project settings but aren't documented locally, making onboarding and debugging fragile. A proper `.env.example` and gap report closes that gap.

---

## Current State

### Complete Env Var Inventory (from source scan)

| Variable | Where Used | Type |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `client.ts`, `server.ts`, `proxy.ts`, `admin/layout.tsx`, 3 API routes | Public, required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `client.ts`, `server.ts`, `proxy.ts` | Public, required |
| `SUPABASE_SERVICE_ROLE_KEY` | `proxy.ts`, `admin/layout.tsx`, 3 API routes | Secret, required |
| `STRIPE_SECRET_KEY` | `src/lib/stripe.ts` | Secret, required |
| `STRIPE_WEBHOOK_SECRET` | `src/app/api/stripe/webhook/route.ts` | Secret, required |
| `NEXT_PUBLIC_SITE_URL` | `src/app/api/stripe/create-checkout/route.ts` (fallback) | Public, recommended |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `src/app/order/page.tsx` (Places Autocomplete) | Public, required for /order |
| `GOOGLE_MAPS_API_KEY` | `src/lib/utils/geocoding.ts` (server geocoding) | Secret, optional (graceful fallback) |
| `RESEND_API_KEY` | `src/app/api/inspections/route.ts` (email notification) | Secret, optional (graceful fallback) |

### What `.env.local` Has Today

```
NEXT_PUBLIC_SUPABASE_URL=<set>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<set>
```

Only 2 of 9. The other 7 are either set in Vercel only, or truly missing from local dev.

### Gaps Being Addressed

1. **No `.env.example` exists** — new contributor or fresh clone has no documentation of needed vars.
2. **7 vars missing from `.env.local`** — local dev may work partially but Stripe, email, Google Maps all fail silently.
3. **No categorization or documentation** of which vars are required vs optional, public vs secret.
4. **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** is mentioned in the Stripe live-mode switchover runbook but NOT referenced anywhere in source code — it's a future/unused var (server-side checkout doesn't need the publishable key).

---

## Proposed Changes

### Summary of Changes

- Create `.env.example` with all 9 vars organized by category, with placeholder values and inline comments
- Recommend additions to `.env.local` (placeholders only — Mo fills in real values)
- Document Vercel-side variable requirements
- Flag `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` as runbook-only (not currently needed in code)

### New Files to Create

| File Path | Purpose |
|---|---|
| `.env.example` | Documented template of all env vars with placeholder values |

### Files to Modify

None. `.env.local` is not modified — only a gap report is produced for Mo to act on.

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Do not modify `.env.local` programmatically**: The user's real secrets must never be touched. The gap report tells Mo exactly what to add.
2. **Group by integration, not alphabetically**: Supabase, Stripe, Google Maps, Resend, App — matches how a developer thinks about configuration.
3. **Mark optional vars explicitly**: `GOOGLE_MAPS_API_KEY` (server geocoding) and `RESEND_API_KEY` both have graceful fallbacks in code, so they're genuinely optional for local dev.
4. **Exclude `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`**: Not in source code. Only in the switchover runbook. Adding it to `.env.example` would be misleading — it should be added to the runbook step when live mode is enabled, not to the general env template.

### Alternatives Considered

- **Zod schema validation at startup**: Overkill for a single-developer project. A well-documented `.env.example` achieves the same practical outcome without adding a runtime dependency.
- **Auto-patching `.env.local`**: Rejected — risk of corrupting existing secrets, and the user asked us not to overwrite.

### Open Questions

None — the scan is exhaustive and all vars have clear provenance in source code.

---

## Step-by-Step Tasks

### Step 1: Create `.env.example`

Write `.env.example` at the repo root with the following exact content:

```env
# ============================================
# Seller's Compliance — Environment Variables
# Copy to .env.local and fill in real values
# ============================================

# ── App ──────────────────────────────────────
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# Production: https://sellerscompliance.com

# ── Supabase ─────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
# Service role key: Settings → API → service_role (secret)

# ── Stripe ───────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# For local dev: run `stripe listen --forward-to localhost:3000/api/stripe/webhook`
# and use the whsec_ it prints

# ── Google Maps ──────────────────────────────
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
# Client-side: Places Autocomplete on /order
GOOGLE_MAPS_API_KEY=AIza...
# Server-side: geocoding (optional — skips gracefully if unset)

# ── Resend (email) ───────────────────────────
RESEND_API_KEY=re_...
# Optional — order notification emails. Skips gracefully if unset.
```

**Actions:**

- Write the file exactly as shown above
- Verify `.env.example` is NOT in `.gitignore` (it should be committed — `.gitignore` only excludes `.env*.local`)

**Files affected:**

- `.env.example` (new)

---

### Step 2: Produce gap report as plan output

The gap report is this section itself — no separate file needed. Mo reads this plan.

**`.env.local` gap report:**

| Variable | In `.env.local`? | In Vercel? | Action Needed |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Should be | None |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Should be | None |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | Should be | Add to `.env.local` for local dev if testing admin/API routes |
| `STRIPE_SECRET_KEY` | **No** | Should be | Add to `.env.local` (use `sk_test_...`) for local Stripe testing |
| `STRIPE_WEBHOOK_SECRET` | **No** | Should be | Add to `.env.local` (from `stripe listen` output) for local webhook testing |
| `NEXT_PUBLIC_SITE_URL` | **No** | Recommended | Add to `.env.local` as `http://localhost:3000`; set to `https://sellerscompliance.com` in Vercel |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | **No** | Should be | Add to `.env.local` for /order autocomplete to work locally |
| `GOOGLE_MAPS_API_KEY` | **No** | Optional | Add if you want server geocoding locally; app works without it |
| `RESEND_API_KEY` | **No** | Optional | Add if you want email notifications locally; app works without it |

**Unused / not-in-code:**

| Variable | Status | Recommendation |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Referenced in Stripe live-mode switchover runbook only | Do NOT add to `.env.example`. Add to Vercel only when going live (per runbook). Not needed in code today. |

**Duplicated / misnamed:**

None found. The two Google Maps keys (`NEXT_PUBLIC_*` for client, plain for server) is correct — they serve different purposes and may even be different restricted keys.

---

### Step 3: Document Vercel project settings requirements

Add a comment block at the top of `.env.example` or rely on this plan as the reference:

**Must be set in Vercel project settings (Production + Preview):**

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All environments | Same for preview + production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All environments | Same for preview + production |
| `SUPABASE_SERVICE_ROLE_KEY` | All environments | Never expose client-side |
| `STRIPE_SECRET_KEY` | Production: `sk_live_...`, Preview: `sk_test_...` | Different per environment |
| `STRIPE_WEBHOOK_SECRET` | Production: live `whsec_...`, Preview: test `whsec_...` | Different per environment |
| `NEXT_PUBLIC_SITE_URL` | Production: `https://sellerscompliance.com` | Stripe checkout uses this for redirect URLs |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | All environments | Restrict to `sellerscompliance.com` + `localhost` referrers in Google Cloud Console |

**Optional in Vercel (set if feature is wanted):**

| Variable | Notes |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Server-side geocoding. Restrict to IP if using Vercel. |
| `RESEND_API_KEY` | Email notifications on new orders. |

**CLI-only / not Vercel:**

| Variable | Where it lives | Notes |
|---|---|---|
| Stripe CLI login token | `~/.config/stripe/config.toml` | Used by `stripe listen` for local webhook forwarding. Not an app env var. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Nowhere currently | Future: add to Vercel when live mode activates. Not in source code. |

---

### Step 4: Verify .gitignore coverage

**Actions:**

- Confirm `.gitignore` has `.env*.local` (already confirmed — it does)
- Confirm `.env.example` is NOT excluded (it shouldn't be — `.gitignore` only blocks `.env*.local`)
- No action needed — current `.gitignore` is correct

**Files affected:**

- None (verification only)

---

## Connections & Dependencies

### Files That Reference This Area

Every file in the env var inventory table above. No code changes are proposed — this plan only creates `.env.example` and documents findings.

### Updates Needed for Consistency

- The Stripe live-mode switchover runbook (in memory) mentions `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. When live mode is activated, reassess whether that var needs to be added to both the codebase and `.env.example`.

### Impact on Existing Workflows

None — this is additive documentation only. No runtime behavior changes.

---

## Validation Checklist

- [ ] `.env.example` exists at repo root with all 9 vars
- [ ] `.env.example` contains NO real secret values
- [ ] `.env.example` is not in `.gitignore`
- [ ] All 9 `process.env.*` references from source scan are represented
- [ ] Variables are grouped by category with inline comments
- [ ] Optional vars are clearly marked as optional
- [ ] `npx tsc --noEmit` still passes (no code changes, but verify)

---

## Success Criteria

The implementation is complete when:

1. `.env.example` is committed with placeholder values for all 9 env vars used in source
2. Gap report (this plan) documents what Mo needs to add to `.env.local` and Vercel
3. No real secrets appear in any committed file
4. Mo can read this plan and know exactly which Vercel env vars to verify/set

---

## Notes

- **`NEXT_PUBLIC_SITE_URL` has a hardcoded fallback** in `create-checkout/route.ts`: `process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'`. This means local dev works without it, but it should be set in Vercel production to ensure Stripe redirects go to `sellerscompliance.com` (not some Vercel preview URL).
- **Two Google Maps keys is intentional**: `NEXT_PUBLIC_*` is exposed to the browser (restricted by HTTP referrer), while the plain `GOOGLE_MAPS_API_KEY` is server-only (can be restricted by IP). They may even be different keys with different restrictions in Google Cloud Console.
- **Future consideration**: If the app grows to need client-side Stripe (e.g., embedded payment elements), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` will need to be added to both source code and `.env.example`. For now, the server-side checkout redirect pattern doesn't need it.

---

## Implementation Notes

**Implemented:** 2026-04-16

### Summary

Created `.env.example` with all 9 env vars grouped by category. Added `!.env.example` negation to `.gitignore` and force-added the file to git tracking to overcome a global `~/.gitignore` rule (`/.env.*`). Verified no secrets in the file, all 9 vars present, and `tsc --noEmit` still passes.

### Deviations from Plan

- **`.gitignore` modification**: Plan Step 4 said "No action needed" but the global `~/.gitignore` had `.env.*` which blocked `.env.example`. Added `!.env.example` negation to the project `.gitignore` and used `git add -f` to force-track the file. This is a necessary fix the plan didn't anticipate.

### Issues Encountered

- Global `~/.gitignore` line 3 (`.env.*`) was silently ignoring `.env.example`. Discovered via `git check-ignore -v`. Resolved with both a project-level negation rule and `git add -f`.
