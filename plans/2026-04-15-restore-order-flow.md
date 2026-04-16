# Plan: Restore `/order` Public Booking Flow

**Created:** 2026-04-15
**Status:** Draft
**Request:** Restore the `/order` multi-step booking flow from orphan commit `d0cec1f` so customers can book a $125 compliance inspection from the public homepage, adapted to the current Seller's Compliance database schema.

---

## Overview

### What This Plan Accomplishes

Brings back the 5-step public booking form (`/order`) and its confirmation page (`/order/confirmation`), plus the `POST /api/inspections` endpoint that persists a request as three linked rows (customer → property → inspection) and fires an internal notification email. After this lands, the "Book $125 Inspection" CTA on the restored homepage will actually work end-to-end.

### Why This Matters

The homepage has had a dead `<Link href="/order">` CTA since the April 3 snapshot was partially restored. Without a working booking flow, sellerscompliance.com is a brochure — agents can call the phone line but can't self-serve. Restoring `/order` closes the loop on the public marketing site so Christian's inbound pipeline lands directly in the admin dispatch queue as `status='requested'` inspections.

---

## Current State

### Relevant Existing Structure

- `src/app/page.tsx` — homepage with two `<Link href="/order">` CTAs (lines 145 and 557) that currently 404
- `src/app/api/auth/callback/route.ts`, `src/app/api/auth/logout/route.ts` — only existing API routes
- `src/components/ui/input.tsx`, `label.tsx`, `button.tsx`, `card.tsx`, `select.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `avatar.tsx` — existing shadcn primitives
- `src/lib/utils.ts` — exports `cn()` (identical to d0cec1f)
- `src/types/database.ts` — has `customer_type`, `service_type`, `dispatch_status` fields on types; the FlattenedInspection `Job` type is already in place from the schema rewrite
- `supabase/schema.sql` — documents current production schema. All three tables the booking flow needs (`customers`, `properties`, `inspections`) exist with the right columns, and `inspections.stripe_checkout_session_id` is already present at line 107
- `src/app/admin/dispatch/` — admin dispatch board that will receive new `status='requested'` rows in its unscheduled queue
- Git reflog reference: commit `d0cec1f` is the canonical source for the order flow (see `memory/reference_april3_homepage.md`)

### Gaps or Problems Being Addressed

- `/order` and `/order/confirmation` routes do not exist — homepage CTAs 404
- No `POST /api/inspections` endpoint — no way for a public form to create an inspection record
- `src/components/ui/textarea.tsx` missing — the booking form uses a multi-line notes field
- `src/components/ui/address-autocomplete.tsx` missing — booking form's address field relies on Google Places autocomplete
- `src/lib/utils/geocoding.ts` missing — server-side helper that enriches saved properties with lat/lng
- `src/lib/email/order-notification-template.ts` missing — HTML email template for internal booking notifications
- Several npm dependencies the booking flow requires are absent from `package.json`: `@vis.gl/react-google-maps`, `use-places-autocomplete`, `resend`, `zod`
- Environment variables for Google Maps + Resend are not yet provisioned on Vercel

---

## Proposed Changes

### Summary of Changes

- Restore 4 source files verbatim from `d0cec1f` (two pages, one API route, one email template)
- Restore 2 UI primitives from `d0cec1f` (`textarea.tsx`, `address-autocomplete.tsx`)
- Restore 1 server utility from `d0cec1f` (`geocoding.ts`)
- Add 4 npm dependencies to `package.json` (`@vis.gl/react-google-maps`, `use-places-autocomplete`, `resend`, `zod`)
- Verify / provision 3 Vercel env vars (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_API_KEY`, `RESEND_API_KEY`)
- Verify `customers.email` has a `UNIQUE` constraint in production (required for the `onConflict: 'email'` upsert) and add one via migration if missing
- **Defer** the Stripe balance-due invoicing flow (`/api/stripe/create-checkout`, `/api/stripe/webhook`, `src/lib/stripe.ts`, `src/lib/utils/pricing.ts`) to a Phase B follow-up — it is not used by the public `/order` booking and depends on `install_line_items` + `payments` tables that are not in `supabase/schema.sql`

### New Files to Create

| File Path | Purpose |
|---|---|
| `src/app/order/page.tsx` | Client component — 5-step booking form (Property → Contact → Schedule → Details → Review), POSTs to `/api/inspections` |
| `src/app/order/confirmation/page.tsx` | Server component — renders post-submit success state from searchParams |
| `src/app/api/inspections/route.ts` | `POST` handler — validates with zod, upserts customer, inserts property + inspection, geocodes async, sends Resend email |
| `src/components/ui/textarea.tsx` | shadcn textarea primitive (missing from current `ui/`) |
| `src/components/ui/address-autocomplete.tsx` | Google Places-backed address input that emits structured `{ street_address, city, state, zip_code }` on selection |
| `src/lib/email/order-notification-template.ts` | `buildOrderNotificationHtml()` — inline-styled HTML email body |
| `src/lib/utils/geocoding.ts` | `geocodeAddress()`, `formatPropertyAddress()` — Google Geocoding API wrappers |

### Files to Modify

| File Path | Changes |
|---|---|
| `package.json` | Add dependencies: `@vis.gl/react-google-maps ^1.7.1`, `use-places-autocomplete ^4.0.1`, `resend ^6.10.0`, `zod ^4.3.6` |

### Files to Delete

None.

### Files Intentionally NOT Restored (Phase B)

| File Path | Why deferred |
|---|---|
| `src/app/api/stripe/create-checkout/route.ts` | Used for balance-due invoicing AFTER inspection, not for booking. Depends on `install_line_items` + `payments` tables not documented in `schema.sql` |
| `src/app/api/stripe/webhook/route.ts` | Receives Stripe checkout completion; same dependency concern |
| `src/lib/stripe.ts` | Stripe client singleton — only needed for the two routes above |
| `src/lib/utils/pricing.ts` | `getInspectionPrice()` — only referenced by the Stripe routes |
| `supabase/migrations/20260402000000_add_stripe_checkout_session_id.sql` | The `stripe_checkout_session_id` column is already in current `schema.sql` at line 107. Migration file is redundant |

---

## Design Decisions

### Key Decisions Made

1. **Split Stripe (Phase B) from the booking flow (Phase A)**: The public `/order` form does NOT collect payment — it creates a `status='requested'` inspection and notifies the internal team, who confirms the time and later invoices through the admin flow. Bundling Stripe into this plan conflates two separate concerns and blocks the booking restoration on `install_line_items` / `payments` table work that's out of scope.
2. **Restore source files verbatim from d0cec1f, no refactoring**: The `/api/inspections` route already targets the rewritten schema (upsert `customers`, insert `properties`, insert `inspections` with `status='requested'`, FKs in place). Every column it writes exists in current `schema.sql`. No adaptation needed — this was post-schema-rewrite code when it was written.
3. **Use service-role Supabase client in the API route**: The public booking endpoint is anonymous — there's no user session to carry RLS context. Same pattern we already use in `src/proxy.ts` and `src/app/admin/layout.tsx` for the RLS-bypass profile lookup.
4. **Keep email non-blocking**: A booking must succeed even if Resend is down or mis-keyed. The existing try/catch around the Resend call is the right shape — preserve it.
5. **Keep geocoding non-blocking**: Same reasoning — a property row must save even if Google Geocoding fails or rate-limits.
6. **Restore shadcn primitives by copying from d0cec1f, not via `npx shadcn@latest add`**: The d0cec1f textarea and input/label use our existing `@base-ui/react` primitive style (the current repo is on `@base-ui/react` per `package.json`), and running the shadcn CLI would pull the Radix variant and drift from the existing stack.
7. **Do not restore `src/styles/sc-bold-tokens.css` / `sc-bold-components.css`**: The `/order` page uses hardcoded hex values in an inline `B` const (`red: '#C62026'`, `gold: '#ECB120'`, etc.) — it doesn't depend on the sc-bold token CSS. Keeping those files out of Phase A avoids re-opening the admin theming question.
8. **Use the current `Input` component as-is**: d0cec1f's input uses `border border-input`; current uses `border-2 border-black` (neo-brutalist). The `/order` form passes explicit `className` to `<Input>` on every usage, so the current styling will be overridden where needed. If it still looks off after deploy, we can scope a plain input via className at that point.

### Alternatives Considered

- **Bundle Stripe into Phase A**: Rejected — see decision #1. Adds surface area (webhook testing, Stripe account config, two missing tables) without any payoff for closing the homepage CTA loop.
- **Rebuild the form from scratch with react-hook-form + zod resolver**: Rejected — the existing form uses plain `useState` and works. Rewriting is scope creep; the existing shape has the validation, step logic, and address autocomplete integration already debugged.
- **Use Next.js Server Actions instead of `/api/inspections` route**: Rejected for now — the form is a `'use client'` component and the existing contract (POST returns JSON with `inspectionId`, `confirmationNumber`) is fine. A Server Action rewrite is an optimization we can do later.
- **Auto-assign inspections on insert**: Rejected — Christian dispatches manually. New rows land in the unscheduled queue with `assigned_inspector_id = NULL`, exactly matching how the admin dispatch board expects to receive them.

### Open Questions

1. **Does `customers.email` have a `UNIQUE` constraint in production?** The `schema.sql` shows `email text not null` with no unique index. The `/api/inspections` route uses `.upsert({...}, { onConflict: 'email' })`. Without the unique constraint, the upsert will fail. Verify via `\d customers` in Supabase SQL editor; if missing, add `ALTER TABLE customers ADD CONSTRAINT customers_email_unique UNIQUE (email)` as a migration step.
2. **Is `info@sellerscompliance.com` the right recipient for booking notifications?** The d0cec1f template hardcodes it. Should it also CC Christian, or go to him directly?
3. **Is the `results@sellerscompliance.com` sender domain verified in Resend?** If not, emails will either bounce or Resend will reject the send call. Needs confirmation before deploy.
4. **What Google Maps API key restrictions are in place?** The client needs a key with Places Autocomplete + Maps JavaScript API enabled and HTTP-referrer restricted to `sellerscompliance.com` + `localhost`. The server geocoding call needs a key with Geocoding API enabled and IP-restricted (or the same key with the referrer-restriction lifted for server calls).
5. **Phase B timing for Stripe**: Should the invoicing flow restoration be queued as the immediate next plan after this one, or is it lower priority than other admin work?

---

## Step-by-Step Tasks

Execute these tasks in order during implementation.

### Step 1: Verify `customers.email` unique constraint in production

Before writing any code, confirm the upsert target is valid.

**Actions:**

- Open Supabase SQL editor
- Run `SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid WHERE rel.relname = 'customers';`
- If no `UNIQUE` or primary-key constraint covers `email`, add one:
  ```sql
  ALTER TABLE customers ADD CONSTRAINT customers_email_unique UNIQUE (email);
  ```
- If the column has duplicate emails, deduplicate first by keeping the oldest row per email (`DELETE FROM customers a USING customers b WHERE a.created_at > b.created_at AND a.email = b.email;`) — only if there are duplicates
- Also create a placeholder migration file documenting this:
  - Path: `supabase/migrations/20260415000000_add_customers_email_unique.sql`
  - Content: the `ALTER TABLE` statement above, idempotent form (`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_email_unique') THEN ALTER TABLE customers ADD CONSTRAINT customers_email_unique UNIQUE (email); END IF; END $$;`)

**Files affected:**

- `supabase/migrations/20260415000000_add_customers_email_unique.sql` (new)
- Supabase production DB (if constraint was missing)

---

### Step 2: Add npm dependencies

Install the four packages the booking flow needs.

**Actions:**

- Run from repo root:
  ```bash
  npm install @vis.gl/react-google-maps@^1.7.1 use-places-autocomplete@^4.0.1 resend@^6.10.0 zod@^4.3.6
  ```
- Verify `package.json` and `package-lock.json` updated
- Do NOT install `stripe`, `@stripe/stripe-js`, `@hookform/resolvers`, `react-hook-form`, `shadcn`, or `vitest` — those are for Phase B or unused by the restored flow

**Files affected:**

- `package.json`
- `package-lock.json`

---

### Step 3: Restore `src/components/ui/textarea.tsx`

**Actions:**

- Run: `git show d0cec1f:src/components/ui/textarea.tsx > src/components/ui/textarea.tsx`
- Verify file content matches d0cec1f's version (10 lines, uses `cn` from `@/lib/utils`, wraps native `<textarea>`)

**Files affected:**

- `src/components/ui/textarea.tsx` (new)

---

### Step 4: Restore `src/components/ui/address-autocomplete.tsx`

**Actions:**

- Run: `git show d0cec1f:src/components/ui/address-autocomplete.tsx > src/components/ui/address-autocomplete.tsx`
- Verify imports: `usePlacesAutocomplete, getGeocode` from `use-places-autocomplete`, `useApiIsLoaded` from `@vis.gl/react-google-maps`, `cn` from `@/lib/utils`
- The component is a `'use client'` combobox that emits `AddressComponents` via `onSelect` prop

**Files affected:**

- `src/components/ui/address-autocomplete.tsx` (new)

---

### Step 5: Restore `src/lib/utils/geocoding.ts`

**Actions:**

- Run: `mkdir -p src/lib/utils && git show d0cec1f:src/lib/utils/geocoding.ts > src/lib/utils/geocoding.ts`
- Verify exports: `formatPropertyAddress()`, `geocodeAddress()`, `geocodeProperty()`
- The file imports `Property` type from `@/types/database` — confirm that type is still exported there (it should be, per the schema rewrite in `src/types/database.ts`). If not, add it.

**Files affected:**

- `src/lib/utils/geocoding.ts` (new)

---

### Step 6: Restore `src/lib/email/order-notification-template.ts`

**Actions:**

- Run: `mkdir -p src/lib/email && git show d0cec1f:src/lib/email/order-notification-template.ts > src/lib/email/order-notification-template.ts`
- Verify exports: `OrderNotificationData` interface and `buildOrderNotificationHtml()` function
- No imports of project-internal code — it's pure HTML string construction

**Files affected:**

- `src/lib/email/order-notification-template.ts` (new)

---

### Step 7: Restore `src/app/api/inspections/route.ts`

This is the core server handler.

**Actions:**

- Run: `mkdir -p src/app/api/inspections && git show d0cec1f:src/app/api/inspections/route.ts > src/app/api/inspections/route.ts`
- Verify the handler does the following in order:
  1. Parses JSON body with zod (`orderSchema`)
  2. Upserts into `customers` with `onConflict: 'email'`
  3. Inserts into `properties` with `state: 'CA'` hardcoded
  4. Fire-and-forget geocodes the address and patches `properties.latitude / longitude`
  5. Inserts into `inspections` with `status: 'requested'` and the customer + property FKs
  6. Fire-and-forget sends the Resend email (guarded by `RESEND_API_KEY` presence)
  7. Returns JSON: `{ success: true, inspectionId, confirmationNumber, address, requestedDate }`
- Verify `createClient` is from `@supabase/supabase-js` (service-role, not the SSR client)
- Do NOT edit this file — it already targets the rewritten schema correctly

**Files affected:**

- `src/app/api/inspections/route.ts` (new)

---

### Step 8: Restore `src/app/order/page.tsx`

**Actions:**

- Run: `mkdir -p src/app/order && git show d0cec1f:src/app/order/page.tsx > src/app/order/page.tsx`
- Verify it's a `'use client'` 5-step form wrapped in `<APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={['places']}>`
- Verify `handleSubmit` POSTs to `/api/inspections` and navigates to `/order/confirmation?...` on success
- Verify imports resolve: `Input`, `Label`, `Textarea`, `AddressAutocomplete` from `@/components/ui/*`, `APIProvider` from `@vis.gl/react-google-maps`, `cn` from `@/lib/utils`

**Files affected:**

- `src/app/order/page.tsx` (new)

---

### Step 9: Restore `src/app/order/confirmation/page.tsx`

**Actions:**

- Run: `mkdir -p src/app/order/confirmation && git show d0cec1f:src/app/order/confirmation/page.tsx > src/app/order/confirmation/page.tsx`
- Verify it's an `async` server component that `await`s `searchParams` and wraps the content in `<Suspense>`
- Verify it links to `/Seller_Compliance_SVG_File.svg` (already in `public/` from the homepage restoration)

**Files affected:**

- `src/app/order/confirmation/page.tsx` (new)

---

### Step 10: Provision environment variables on Vercel

**Actions:**

- Via Vercel dashboard (Project → Settings → Environment Variables) OR `vercel env` CLI, add:
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Production, Preview, Development. Value: a Google Maps API key with Maps JavaScript API + Places API enabled, HTTP-referrer restricted to `sellerscompliance.com/*`, `*.vercel.app/*` (for previews), `localhost:*`
  - `GOOGLE_MAPS_API_KEY` — Production, Preview. Value: a Google Maps API key with Geocoding API enabled, no referrer restriction (server-to-server). Can be the same key as above if IP-restricted instead.
  - `RESEND_API_KEY` — Production, Preview. Value: production Resend API key from https://resend.com/api-keys
- Confirm these are already present (do NOT add again, just verify):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Run `vercel env pull .env.local` locally after provisioning to sync for dev testing

**Files affected:**

- Vercel project env vars (not a repo file)
- `.env.local` (local only, gitignored)

---

### Step 11: Verify Resend sender domain

**Actions:**

- Log into Resend dashboard
- Confirm `sellerscompliance.com` is a verified domain with SPF + DKIM + DMARC records in place
- Confirm `results@sellerscompliance.com` is usable as a `from` address (either the domain is verified or the specific address is in the allowed-senders list)
- If NOT verified: either verify the domain OR change the `from` in `src/app/api/inspections/route.ts` line ~163 to a verified address before deploying (temporarily: Resend's default `onboarding@resend.dev` works for testing only)

**Files affected:**

- Resend dashboard configuration (external)
- Possibly `src/app/api/inspections/route.ts` (only if `from` needs to change)

---

### Step 12: Local typecheck and dev-server smoke test

**Actions:**

- Run: `rm -rf .next && npx tsc --noEmit`
- Expect zero errors. If there are errors:
  - Missing `Property` export from `@/types/database` — add it
  - Missing `cn` export — already present
  - Google Maps React type issues — ensure `@vis.gl/react-google-maps` installed correctly
- Run: `npm run dev`
- Visit `http://localhost:3000/order`
- Confirm the form renders, address autocomplete fires suggestions, all 5 steps navigate
- Do NOT actually submit yet — save the first real submit for the production deploy smoke test (to avoid creating test rows in production unless you have a Supabase preview env)

**Files affected:**

- None (verification only)

---

### Step 13: Commit and push

**Actions:**

- Stage only the files this plan touches:
  ```bash
  git add package.json package-lock.json \
    src/app/order/page.tsx \
    src/app/order/confirmation/page.tsx \
    src/app/api/inspections/route.ts \
    src/components/ui/textarea.tsx \
    src/components/ui/address-autocomplete.tsx \
    src/lib/utils/geocoding.ts \
    src/lib/email/order-notification-template.ts \
    supabase/migrations/20260415000000_add_customers_email_unique.sql \
    plans/2026-04-15-restore-order-flow.md
  ```
- Commit with message:
  ```
  feat(order): restore public /order booking flow from April 3 snapshot

  Restore the 5-step booking form, confirmation page, and POST /api/inspections
  endpoint from orphan commit d0cec1f. The endpoint targets the rewritten
  schema (customers upsert + properties insert + inspections insert with
  status='requested'). Also restores the shadcn textarea and Google Places
  address autocomplete primitives plus the Resend email template.

  Stripe balance-due invoicing deferred to Phase B (see plan).
  ```
- Push: `git push origin main`
- Vercel will auto-deploy

**Files affected:**

- Git history / origin/main

---

### Step 14: Production smoke test

**Actions:**

- Wait for Vercel deploy to complete (check the Deployments tab)
- Visit `https://sellerscompliance.com/`
- Click the "Book $125 Inspection" CTA — verify it loads `/order` (not 404)
- Walk through all 5 steps with a test booking (use your own email + a real California address)
- Verify the success page displays with the correct address/date/time
- Verify in Supabase:
  - New row in `customers` (or an existing customer row if email matched via upsert)
  - New row in `properties` with `latitude` and `longitude` populated (confirms geocoding worked)
  - New row in `inspections` with `status='requested'`, `dispatch_status='unscheduled'`, FKs to the customer and property
- Verify notification email arrived at `info@sellerscompliance.com`
- Visit `/admin/dispatch` — verify the new inspection appears in the Unscheduled Jobs queue
- Clean up the test inspection (delete it from Supabase) if the test data isn't wanted in production

**Files affected:**

- None (verification only). If a test row was created, delete from Supabase manually.

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/page.tsx:145` and `src/app/page.tsx:557` — two existing `<Link href="/order">` CTAs on the homepage. Once this plan lands, these become functional.
- `src/app/admin/dispatch/*` — the admin dispatch board queries `inspections WHERE dispatch_status='unscheduled'`, which is exactly what the `/api/inspections` POST produces. No code change needed, but a new booking should appear in the admin UI in realtime (the `use-schedule-sync` hook subscribes to `inspections` table changes).
- `src/types/database.ts` — should already export `Property`, `Customer`, `Inspection` types; `geocoding.ts` depends on `Property`.
- `memory/reference_april3_homepage.md` — pinned `d0cec1f` as the reference commit for future homepage pulls; this plan is another pull from that commit.

### Updates Needed for Consistency

- After the flow is live, update `memory/project_sellers_compliance.md` to remove the "booking flow deferred" note (it will be active).
- Consider writing a short `docs/` note (only if the user asks for one) describing the booking → dispatch handoff for anyone onboarding later.

### Impact on Existing Workflows

- **Admin dispatch**: new inbound rows will appear automatically in the unscheduled queue — Christian's flow doesn't change, just starts receiving rows without manual data entry. Confirms the public → admin pipeline.
- **Realtime sync**: `src/hooks/use-schedule-sync.ts` already subscribes to `inspections` table events; the admin board should see new bookings within seconds without a refresh.
- **Email deliverability**: adds Resend as a production dependency. If Resend is down, bookings still succeed (non-blocking), but the internal team won't be notified until they check the dispatch board.
- **Google Maps quota**: adds client-side Places Autocomplete + server-side Geocoding calls. Low volume at launch (a few bookings/day), but worth monitoring in Google Cloud Console.

---

## Validation Checklist

- [ ] `customers.email` has a `UNIQUE` constraint in production (Step 1)
- [ ] Migration file `20260415000000_add_customers_email_unique.sql` exists in repo (Step 1)
- [ ] `package.json` has `@vis.gl/react-google-maps`, `use-places-autocomplete`, `resend`, `zod` (Step 2)
- [ ] All 7 restored source files exist at their expected paths (Steps 3–9)
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_API_KEY`, `RESEND_API_KEY` present on Vercel Production + Preview (Step 10)
- [ ] Resend sender domain `sellerscompliance.com` is verified (Step 11)
- [ ] `npx tsc --noEmit` passes with zero errors (Step 12)
- [ ] `npm run dev` boots and `/order` renders all 5 steps (Step 12)
- [ ] Production deploy succeeds on Vercel (Step 13)
- [ ] End-to-end test booking creates customer + property + inspection rows with correct FKs (Step 14)
- [ ] `properties.latitude` and `longitude` populated on test booking (geocoding verified) (Step 14)
- [ ] Notification email received at `info@sellerscompliance.com` (Step 14)
- [ ] New inspection visible in `/admin/dispatch` unscheduled queue with `status='requested'` (Step 14)

---

## Success Criteria

The implementation is complete when:

1. A visitor to `sellerscompliance.com` can click "Book $125 Inspection" on the homepage and complete a booking without errors.
2. Each completed booking creates exactly three linked database rows: one `customers` (upserted), one `properties` (with lat/lng), one `inspections` (status='requested', dispatch_status='unscheduled').
3. The internal team receives an HTML notification email at `info@sellerscompliance.com` within seconds of submission.
4. The new booking appears in the admin dispatch board's unscheduled queue without a manual refresh.
5. `npx tsc --noEmit` passes and the Vercel production deploy is green.

---

## Notes

### Why the Stripe files are deferred, in plain terms

The `/api/stripe/create-checkout` route from `d0cec1f` is not the "pay $125 at booking" flow one might expect. It calculates a balance due against an existing inspection by joining `install_line_items` and `payments` (both tables that are NOT in our current `schema.sql`) and creates a Stripe Checkout Session for that balance. That flow is invoked from the admin billing UI, not from `/order`. Bundling it into this plan would require re-deriving those two tables, setting up Stripe webhooks end-to-end, and verifying the pricing logic — all for zero impact on the homepage CTA this plan is actually closing. Phase B should restore it as a discrete unit once the public booking is live.

### Future consideration: collect payment at booking

If the business decides the public booking should also collect payment (rather than pay-on-invoice), that's a different flow — single Stripe Checkout line item for the flat $125, webhook inserts the inspection only after `checkout.session.completed`. That's neither the d0cec1f implementation nor this plan. If desired, open a new plan titled "collect payment at booking" — don't try to retrofit it into the Phase B admin invoicing restoration.

### Idempotency of the form submit

The current form calls `fetch('/api/inspections', ...)` once on submit. If the user refreshes the confirmation page, no duplicate is created (navigation is to `/order/confirmation?...`, not a re-POST). If the user hits the back button from confirmation and re-submits, they'll create a second inspection with the same customer (upsert) but a new property and new inspection. This is acceptable — duplicates in the admin queue are quickly spotted and deleted. If it becomes a problem, we can add a client-side idempotency key later.
