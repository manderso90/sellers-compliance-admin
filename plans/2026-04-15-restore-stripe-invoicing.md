# Plan: Restore Stripe Balance-Due Invoicing Flow (Phase B)

**Created:** 2026-04-15
**Status:** Implemented
**Request:** Restore the Stripe balance-due invoicing flow from orphan commit `d0cec1f` so admins can send customers a Stripe Checkout link after an inspection is completed, then have webhook-driven payment reconciliation update `inspections.payment_status`.

---

## Overview

### What This Plan Accomplishes

Restores the admin-facing "send payment link" workflow and its supporting Stripe infrastructure. After implementation, an admin on `/admin/jobs/[id]` can click **Payment Link** to generate a Stripe Checkout URL for the outstanding balance, copy it to the customer, and see the payment auto-record + `payment_status` flip to `paid` / `invoiced` when Stripe fires the `checkout.session.completed` webhook. Manual-payment recording (cash, check, Zelle, etc.) also comes back via the same `PaymentsSection` UI.

### Why This Matters

Phase A restored booking — the front half of the revenue funnel. Phase B restores collection — the back half. Without it Christian still has to send payment requests out-of-band and manually mark `payment_status` in the DB. The d0cec1f snapshot was a working, production-shipped version of this flow; we are porting it forward onto the rewritten schema and the current `/admin/jobs/[id]` admin surface.

---

## Current State

### Relevant Existing Structure

- `src/app/admin/jobs/[id]/page.tsx` — Current admin inspection detail page. Header, status controls, inspector assignment, schedule suggestions, edit form, status history. **No financial / payment sections.**
- `src/lib/queries/jobs.ts` — `getJobById` returns a flattened `Job` shape with joined `properties` + `customers` data, but does **not** return `payments` or `install_line_items`.
- `src/types/database.ts` — Already has `inspections.price`, `inspections.payment_status`, `inspections.stripe_checkout_session_id`, `inspections.inspection_labor_cost`, `inspections.inspection_travel_cost`, `properties.property_type`, `properties.adu_count`, `properties.unit_count`. **Missing:** `Payment` and `InstallLineItem` types.
- `supabase/schema.sql` — The header comment says `"Not managed here but present in the database"` but does not enumerate `install_line_items` or `payments`. Must verify in production.
- `src/lib/supabase/server.ts` — Existing SSR client factory used by all server actions.
- `src/app/admin/layout.tsx` — Admin gate already exists: checks `auth.getUser()`, loads profile via service-role client, checks `profile.is_active`. Redirects to `/login` on failure.
- `package.json` — Has `resend`, `zod`, `@vis.gl/react-google-maps`, `use-places-autocomplete`. **Missing:** `stripe`.
- `src/components/ui/` — Has `button`, `input`, `select`, `label` — all deps the restored `PaymentsSection` needs.
- Env vars on Vercel (per user screenshot): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` all present.

### Gaps or Problems Being Addressed

1. **No Stripe client** — `src/lib/stripe.ts` does not exist.
2. **No pricing utility** — `getInspectionPrice` / `calculateInspectionPrice` do not exist.
3. **No Stripe API routes** — `/api/stripe/create-checkout` and `/api/stripe/webhook` do not exist.
4. **No payment redirect pages** — `/payment/success` and `/payment/cancel` do not exist.
5. **No payment-actions module** — `src/lib/actions/payment-actions.ts` does not exist.
6. **No admin-side auth helper** — d0cec1f's `requireAdmin` in `src/lib/auth.ts` does not exist in current main.
7. **No PaymentsSection UI** — admin has no surface to record payments or trigger checkout links.
8. **Types missing** — `Payment` and `InstallLineItem` types not declared.
9. **`getJobById` doesn't fetch payments/line-items/pricing inputs** — the admin detail page needs those to render `PaymentsSection`.

---

## Proposed Changes

### Summary of Changes

- Verify `install_line_items` + `payments` tables exist in production (Step 1 — blocking).
- Add `stripe` npm dependency.
- Restore `src/lib/auth.ts` (required by `payment-actions.ts`).
- Restore `src/lib/stripe.ts` singleton client.
- Restore `src/lib/utils/pricing.ts` pricing helpers.
- Restore 2 Stripe API routes (`create-checkout`, `webhook`).
- Restore 2 payment redirect pages (`/payment/success`, `/payment/cancel`).
- Restore `src/lib/actions/payment-actions.ts` — with `revalidatePath` updated from `/admin/inspections/:id` → `/admin/jobs/:id` to match current admin routing.
- Restore `src/components/admin/inspections/PaymentsSection.tsx`.
- Add `Payment` + `InstallLineItem` types to `src/types/database.ts`.
- Wire `<PaymentsSection>` into `src/app/admin/jobs/[id]/page.tsx` with a new data-fetch helper that returns payments, line items, and a computed `balanceDue`.
- Register the Stripe webhook in the Stripe dashboard pointing at `https://sellerscompliance.com/api/stripe/webhook`.

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/lib/auth.ts` | `requireAdmin()` helper — authenticates server action callers |
| `src/lib/stripe.ts` | Singleton Stripe SDK client |
| `src/lib/utils/pricing.ts` | Pricing math (base $125 + ADU/unit surcharges) |
| `src/lib/actions/payment-actions.ts` | Server actions: `addPayment`, `deletePayment`, `createPaymentLink` |
| `src/lib/queries/payments.ts` | `getInspectionFinancials(inspectionId)` — fetches payments + line items + returns `{ payments, lineItems, balanceDue }` for the admin detail page |
| `src/app/api/stripe/create-checkout/route.ts` | POST endpoint that creates a Stripe Checkout Session for an inspection's balance |
| `src/app/api/stripe/webhook/route.ts` | Webhook endpoint — verifies signature, records payment, recalculates balance, updates `payment_status` |
| `src/app/payment/success/page.tsx` | Post-checkout success page |
| `src/app/payment/cancel/page.tsx` | Post-checkout cancel page |
| `src/components/admin/inspections/PaymentsSection.tsx` | Client component: payment history + add-payment form + payment-link button |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `package.json` | Add `"stripe"` dependency (latest, currently `^20.x` / check on install). Do NOT add `@stripe/stripe-js` — no client imports. |
| `src/types/database.ts` | Add `Payment` and `InstallLineItem` row/insert/update types under `Tables` + export top-level aliases. |
| `src/app/admin/jobs/[id]/page.tsx` | Fetch `{ payments, lineItems, balanceDue }` via the new `getInspectionFinancials`. Render `<PaymentsSection inspectionId payments balanceDue />` in a new card. |
| `supabase/schema.sql` | (Optional, deferred unless Step 1 creates tables) — append definitions for `install_line_items` + `payments` if they're being created anew. |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Port `PaymentsSection` into the existing `/admin/jobs/[id]` page instead of restoring `/admin/inspections/[id]`.** Rationale: current admin routing lives under `/admin/jobs/*`, and restoring a parallel `/admin/inspections/*` tree would create two admin surfaces for the same resource. Only the `PaymentsSection` component ships; the enclosing page stays where it is.
2. **Port `payment-actions.ts` with `revalidatePath` paths rewritten from `/admin/inspections/${id}` → `/admin/jobs/${id}`.** Same rationale.
3. **Restore `requireAdmin` verbatim from d0cec1f rather than inlining auth checks.** `payment-actions.ts` imports it and restoring the helper keeps the action code unchanged and gives us a reusable admin-guard for future server actions. The admin gate logic (`roles @> ['admin','super_admin']` + `is_active`) matches how `/admin/layout.tsx` already checks access.
4. **Use Stripe-hosted Checkout (not embedded), so skip `@stripe/stripe-js`.** The d0cec1f flow redirects the customer to `session.url` — no client SDK is needed. Confirmed via grep: no file in d0cec1f imports from `@stripe/stripe-js`.
5. **Keep the `/payment/success` and `/payment/cancel` pages verbatim from d0cec1f.** They are standalone, framework-only, self-contained (just `lucide-react` icons + tailwind); no reason to redesign.
6. **Separate `getInspectionFinancials` from `getJobById` rather than extending the latter.** `getJobById` is reused by `/admin/jobs/page.tsx` and other list views that don't need payment data. Adding a separate query keeps the payment joins scoped to the detail page.
7. **Use the existing `/admin/layout.tsx` admin gate as the primary perimeter; `requireAdmin` is defense-in-depth on server actions.** Server actions can be invoked from any authenticated client, so they need their own check — can't rely on the layout-level redirect.
8. **Do NOT modify `src/lib/queries/jobs.ts`.** The financial data goes through a new query module so the job list doesn't pay for extra joins.

### Alternatives Considered

- **Extending `getJobById` to return payments + line items.** Rejected — bloats the list query and violates single-responsibility.
- **Inlining auth check into each action instead of restoring `requireAdmin`.** Rejected — would mean modifying the d0cec1f action source for no benefit; the helper is 30 lines and clean.
- **Restoring the full `/admin/inspections/[id]` route from d0cec1f.** Rejected — creates a dual admin surface; post-Phase-A the `/admin/jobs/*` tree is where admin lives.
- **Creating payments + install_line_items tables via fresh migration in this plan.** Deferred to Step 1 outcome — if the tables exist already we skip; if they don't, Step 1a drops in migrations.
- **Adding `@stripe/stripe-js` for a smoother embedded checkout.** Rejected — adds bundle weight for no UX gain; redirect-to-Stripe is simpler and matches d0cec1f behavior.

### Open Questions (Step 1 blocks on these)

1. **Do `install_line_items` and `payments` tables exist in production Supabase?** If yes, proceed. If no, we must add a Step 1a that writes migration DDL and applies it.
2. **Do the columns the restored code references exist?** Webhook inserts `inspection_id`, `amount`, `method`, `note`. `createPaymentLink` reads `quantity`, `unit_price`. `PaymentsSection` reads `payment.paid_at`, `payment.id`, `payment.note`, `payment.method`, `payment.amount`. Step 1 must verify.
3. **Is `inspections.payment_status` a free-text column or an enum?** Webhook writes `'paid'` or `'invoiced'`. Current schema.sql declares it `text` with no check constraint — OK. Verify in production.

---

## Step-by-Step Tasks

Execute these tasks in order during implementation.

---

### Step 1: Verify `install_line_items` + `payments` tables exist in production

**Actions:**

- Display this SQL to the user to paste into the Supabase SQL editor:

  ```sql
  SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('install_line_items', 'payments')
  ORDER BY table_name, ordinal_position;
  ```

- Wait for user to paste result.
- Verify result includes **at minimum** these columns:
  - `payments`: `id` (uuid), `inspection_id` (uuid), `amount` (numeric), `method` (text), `note` (text, nullable), `paid_at` (timestamptz), `created_at` (timestamptz)
  - `install_line_items`: `id` (uuid), `inspection_id` (uuid), `quantity` (integer/numeric), `unit_price` (numeric)
- **If tables are missing**, write a migration file at `supabase/migrations/2026-04-15_stripe_invoicing.sql` with DDL matching the d0cec1f type declarations. Display the SQL for the user to run in Supabase. Only proceed to Step 2 after confirmation.
- **If tables exist but columns differ**, flag each divergence before writing any code — subsequent steps may need column-name adjustments.

**Files affected:**

- None yet (verification only). Possibly creates `supabase/migrations/2026-04-15_stripe_invoicing.sql`.

---

### Step 2: Install the `stripe` npm dependency

**Actions:**

- Run `npm install stripe` in the project root.
- Confirm `package.json` now has `"stripe"` pinned to a Stripe-SDK v20+ version.
- Do **not** install `@stripe/stripe-js` — unused.
- Do **not** update lockfile manually; let npm do it.

**Files affected:**

- `package.json`
- `package-lock.json`

---

### Step 3: Restore `src/lib/auth.ts`

**Actions:**

- Write `src/lib/auth.ts` verbatim from d0cec1f:

  ```ts
  import { createClient } from '@/lib/supabase/server'

  const ADMIN_ROLES = ['admin', 'super_admin']

  export function hasAnyRole(roles: string[], ...required: string[]): boolean {
    return required.some(r => roles.includes(r))
  }

  export async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles')
      .select('roles, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || !hasAnyRole((profile as { roles: string[] }).roles, ...ADMIN_ROLES)) {
      throw new Error('Admin access required')
    }

    return { supabase, user, profile }
  }
  ```

- Note the TS assertion `(profile as { roles: string[] })` — Supabase's generated types treat nested selects as potentially `never`; this is a minimal cast to keep tsc happy without a full type rewrite. If tsc flags it, escalate before widening.

**Files affected:**

- `src/lib/auth.ts` (new)

---

### Step 4: Restore `src/lib/stripe.ts`

**Actions:**

- Write the Stripe singleton verbatim from d0cec1f:

  ```ts
  import Stripe from 'stripe'

  let _stripe: Stripe | null = null

  export function getStripe(): Stripe {
    if (!_stripe) {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
      }
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2026-03-25.dahlia',
      })
    }
    return _stripe
  }
  ```

- If the installed Stripe SDK version rejects `apiVersion: '2026-03-25.dahlia'` (it will — the version string moves), bump to the current API version string exposed by the SDK's types. Check `node_modules/stripe/types/index.d.ts` for the `LatestApiVersion` literal.

**Files affected:**

- `src/lib/stripe.ts` (new)

---

### Step 5: Restore `src/lib/utils/pricing.ts`

**Actions:**

- Write verbatim from d0cec1f. `BASE_PRICE = 125`, `ADU_SURCHARGE = 15`, `UNIT_SURCHARGE = 15`. Exports: `calculateInspectionPrice(propertyType, aduCount, unitCount)`, `getInspectionPrice(inspection)`, `getInspectionProfit(inspection)`.
- The functions take loosely-typed inspection shapes (not the full DB type) so they work from both the route handler and the webhook without import cycles.

**Files affected:**

- `src/lib/utils/pricing.ts` (new)

---

### Step 6: Restore `src/app/api/stripe/create-checkout/route.ts`

**Actions:**

- Write verbatim from d0cec1f. POST handler that:
  1. Uses service-role client (`createClient(SUPABASE_URL, SERVICE_ROLE_KEY)`) — bypasses RLS because the admin may not be the end-customer session holder.
  2. Reads `inspectionId` from body.
  3. Fetches inspection + customers + properties + install_line_items + payments.
  4. Calls `getInspectionPrice` → `invoiceTotal = fee + installTotal`.
  5. Computes `balanceDue`. Returns 400 if `<= 0`.
  6. Creates Stripe Checkout Session with `customer_email`, `metadata.inspection_id`, success_url → `/payment/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url → `/payment/cancel`.
  7. Writes `stripe_checkout_session_id` back to the inspection.
  8. Returns `{ url, sessionId }`.

- **NOTE:** This route is called from `payment-actions.ts#createPaymentLink`, so it duplicates much of that logic. In d0cec1f both code paths existed. Ship both — the route supports future non-admin callers (e.g., "resend payment link" email) while the server action is admin-only.

**Files affected:**

- `src/app/api/stripe/create-checkout/route.ts` (new)

---

### Step 7: Restore `src/app/api/stripe/webhook/route.ts`

**Actions:**

- Write verbatim from d0cec1f. POST handler that:
  1. Verifies `stripe-signature` header using `STRIPE_WEBHOOK_SECRET`.
  2. On `checkout.session.completed`:
     - Extracts `inspection_id` from `session.metadata`.
     - Inserts a row into `payments` with `method: 'stripe'`, `note: 'Stripe payment — Session <id>'`.
     - Recalculates balance by re-reading inspection + property + line items + all payments.
     - Updates `inspections.payment_status` to `'paid'` (fully paid) or `'invoiced'` (partial).
  3. Returns `{ received: true }` in all non-error paths (prevents Stripe retry storms).

- **Next.js App Router note:** Stripe webhook signature verification requires the **raw body**, not `req.json()`. The d0cec1f code uses `req.text()` — correct. Do not add `export const dynamic = 'force-dynamic'` unless build surfaces a static-optimization warning.

**Files affected:**

- `src/app/api/stripe/webhook/route.ts` (new)

---

### Step 8: Restore `/payment/success` and `/payment/cancel` pages

**Actions:**

- Write `src/app/payment/success/page.tsx` verbatim from d0cec1f (CheckCircle green card).
- Write `src/app/payment/cancel/page.tsx` verbatim from d0cec1f (XCircle red card).
- Both pages are server components, no async work, no searchParams access. Success page does **not** currently parse `session_id` — it's a thank-you card only.

**Files affected:**

- `src/app/payment/success/page.tsx` (new)
- `src/app/payment/cancel/page.tsx` (new)

---

### Step 9: Restore `src/lib/actions/payment-actions.ts`

**Actions:**

- Write from d0cec1f with **ONE change**: every `revalidatePath('/admin/inspections/${inspectionId}')` becomes `revalidatePath('/admin/jobs/${inspectionId}')` to match current admin routing. The `revalidatePath('/admin/command')` call stays (that surface still exists in d0cec1f; verify it exists in current main before copying — if absent, drop it).
- Verify: `grep -r "/admin/command" src/app/admin/` to see if the command center route exists. If not, remove that revalidate call.
- Three actions exported: `addPayment`, `deletePayment`, `createPaymentLink`. All call `requireAdmin()` first.
- `createPaymentLink` builds `siteUrl` from `headers().get('host')` — note `headers` is async in Next 16. The d0cec1f code already has `await headers()` — correct.

**Files affected:**

- `src/lib/actions/payment-actions.ts` (new)

---

### Step 10: Restore `PaymentsSection` client component

**Actions:**

- Write `src/components/admin/inspections/PaymentsSection.tsx` verbatim from d0cec1f.
- Dependencies it imports: `Button`, `Input`, `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` (all exist in `src/components/ui/`), `Trash2`, `Plus`, `Loader2`, `CreditCard`, `Copy`, `Check` from `lucide-react`, `format` from `date-fns`, the server actions from Step 9, and `Payment` type (added in Step 11).
- Keeps the neo-brutalist styling (`neo-shadow-sm`, `btn-press`, `border-[#2B2B2B]`, `bg-[#FFFDF5]`). These classes already exist in `globals.css` from the Phase A restore.
- `btn-press` — verify it exists in current `globals.css`. If not, fall back to `active:translate-y-[1px]` or omit.

**Files affected:**

- `src/components/admin/inspections/PaymentsSection.tsx` (new)

---

### Step 11: Add `Payment` and `InstallLineItem` types

**Actions:**

- Read current `src/types/database.ts` to find the `Tables:` block.
- Append two new table entries inside `Tables`:

  ```ts
  install_line_items: {
    Row: {
      id: string
      inspection_id: string
      product_id: string | null
      item_name: string
      quantity: number
      unit_price: number
      unit_part_cost: number | null
      unit_labor_cost: number | null
      completed_at: string | null
      created_at: string
      updated_at: string
    }
    Insert: { /* all except id/created_at/updated_at required as needed */ }
    Update: { /* all optional */ }
  }
  payments: {
    Row: {
      id: string
      inspection_id: string
      amount: number
      paid_at: string
      method: string
      note: string | null
      created_at: string
    }
    Insert: { /* id/created_at/paid_at optional if DB defaults */ }
    Update: { /* all optional */ }
  }
  ```

- Export top-level aliases near the other type exports:

  ```ts
  export type Payment = Database['public']['Tables']['payments']['Row']
  export type InstallLineItem = Database['public']['Tables']['install_line_items']['Row']
  ```

- Adjust exact shapes based on Step 1's schema dump if columns differ.

**Files affected:**

- `src/types/database.ts`

---

### Step 12: Add `getInspectionFinancials` query

**Actions:**

- Create `src/lib/queries/payments.ts`:

  ```ts
  import { createClient } from '@/lib/supabase/server'
  import { getInspectionPrice } from '@/lib/utils/pricing'
  import type { Payment, InstallLineItem } from '@/types/database'

  export async function getInspectionFinancials(inspectionId: string): Promise<{
    payments: Payment[]
    lineItems: InstallLineItem[]
    balanceDue: number
    totalPaid: number
    invoiceTotal: number
  }> {
    const supabase = await createClient()

    const [{ data: inspection }, { data: payments }, { data: lineItems }] = await Promise.all([
      supabase
        .from('inspections')
        .select('price, properties(property_type, adu_count, unit_count)')
        .eq('id', inspectionId)
        .single(),
      supabase
        .from('payments')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('paid_at', { ascending: false }),
      supabase
        .from('install_line_items')
        .select('*')
        .eq('inspection_id', inspectionId),
    ])

    const paymentRows = (payments ?? []) as unknown as Payment[]
    const lineItemRows = (lineItems ?? []) as unknown as InstallLineItem[]

    const inspectionFee = inspection
      ? getInspectionPrice({
          price: (inspection as { price: number | null }).price,
          properties: (inspection as { properties: { property_type: string; adu_count: number | null; unit_count: number | null } | null }).properties ?? null,
        })
      : 125

    const installTotal = lineItemRows.reduce(
      (sum, item) => sum + item.quantity * Number(item.unit_price),
      0
    )
    const invoiceTotal = inspectionFee + installTotal
    const totalPaid = paymentRows.reduce((sum, p) => sum + Number(p.amount), 0)
    const balanceDue = invoiceTotal - totalPaid

    return { payments: paymentRows, lineItems: lineItemRows, balanceDue, totalPaid, invoiceTotal }
  }
  ```

- Runs the 3 queries in parallel.
- Uses the same `getInspectionPrice` helper the route + webhook use — single source of truth for pricing.

**Files affected:**

- `src/lib/queries/payments.ts` (new)

---

### Step 13: Wire `<PaymentsSection>` into `/admin/jobs/[id]/page.tsx`

**Actions:**

- Read current `src/app/admin/jobs/[id]/page.tsx`.
- Add import: `import { getInspectionFinancials } from '@/lib/queries/payments'`.
- Add import: `import { PaymentsSection } from '@/components/admin/inspections/PaymentsSection'`.
- Extend the top-level `Promise.all` to include `getInspectionFinancials(id)`:

  ```ts
  const [job, history, inspectors, financials] = await Promise.all([
    getJobById(id),
    getJobStatusHistory(id),
    getActiveInspectors(),
    getInspectionFinancials(id),
  ])
  ```

- Insert a new card between "Editable Fields" and "Status History" (or wherever visually best):

  ```tsx
  {/* Payments */}
  <div className="bg-white border-2 border-black rounded-lg p-5 neo-shadow">
    <PaymentsSection
      inspectionId={job.id}
      payments={financials.payments}
      balanceDue={financials.balanceDue}
    />
  </div>
  ```

**Files affected:**

- `src/app/admin/jobs/[id]/page.tsx`

---

### Step 14: Register the Stripe webhook

**Actions:**

- Display instructions to the user:
  1. Open [Stripe dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks).
  2. Click **Add endpoint**.
  3. Endpoint URL: `https://sellerscompliance.com/api/stripe/webhook`
  4. Events to send: `checkout.session.completed` (only).
  5. Click **Add endpoint**.
  6. After creation, click **Reveal** next to the signing secret. Confirm it matches the `STRIPE_WEBHOOK_SECRET` already on Vercel. If they differ, update the Vercel env var and redeploy.
- Wait for user confirmation before Step 15.

**Files affected:**

- None (external config).

---

### Step 15: Typecheck, commit, deploy, smoke test

**Actions:**

1. Run `npx tsc --noEmit` — expect zero errors. Fix any that surface (likely candidates: Supabase nested-select casts).
2. Commit all changes with a single message: `restore Stripe balance-due invoicing (Phase B)`.
3. Push to main — Vercel auto-deploys.
4. Wait for deployment to go live.
5. Smoke test:
   - Open `/admin/jobs/<id>` for an existing inspection (e.g., the Phase A test row).
   - Confirm Payments card renders with "No payments recorded." and a `Balance Due` matching expected price.
   - Click **Payment Link**. Expect: button shows "Creating...", then "Copied!". A green URL strip appears below the header.
   - Paste the URL into a private tab. Expect: Stripe-hosted checkout page for the correct amount.
   - Use Stripe test card `4242 4242 4242 4242` any future exp, any CVC, any ZIP. Submit.
   - Expect: redirect to `/payment/success` showing the green checkmark.
   - Return to `/admin/jobs/<id>`. Expect: new payment row appears with method=`stripe`. Balance Due shows $0.00. Inspection `payment_status` (check via Supabase SQL) = `'paid'`.
6. Also test manual path:
   - On a different inspection, click **Add Payment** → enter $50, method=cash → Record Payment.
   - Expect: row appears, Total Paid reflects $50, Balance Due reduced, no `payment_status` change (webhook only fires for Stripe).
   - Click trash icon next to the row → expect row removed.

**Files affected:**

- None (validation).

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/admin/jobs/[id]/page.tsx` — new consumer of `PaymentsSection` + `getInspectionFinancials`.
- `src/app/admin/layout.tsx` — unchanged, but its admin-gate redirects still apply to the detail page.
- Stripe dashboard — external registration required (Step 14).

### Updates Needed for Consistency

- `supabase/schema.sql` — append `install_line_items` + `payments` DDL **only if** Step 1 reveals they're missing and we create them.
- No changes needed to Phase A files (`/order`, `/api/inspections`, order-notification-template). Phase A and Phase B are decoupled.

### Impact on Existing Workflows

- **No impact** on the booking flow — customers still book without payment.
- **New admin action**: after completing an inspection and adding any install line items, the admin clicks Payment Link to collect the balance.
- **New background behavior**: Stripe webhook silently updates `inspections.payment_status`. Any future dashboard/reporting work that filters on `payment_status` will see values flowing.
- **Dispatch board**: unaffected — scheduling logic does not consult `payment_status`.

---

## Validation Checklist

- [ ] Step 1 SQL confirms `install_line_items` + `payments` exist with expected columns (or migrations applied)
- [ ] `npm install stripe` completed; `package.json` updated
- [ ] `src/lib/auth.ts` exists and `requireAdmin` is exported
- [ ] `src/lib/stripe.ts` exports `getStripe`
- [ ] `src/lib/utils/pricing.ts` exports `getInspectionPrice`, `calculateInspectionPrice`, `getInspectionProfit`
- [ ] `/api/stripe/create-checkout` POST returns `{ url, sessionId }` for a real inspection
- [ ] `/api/stripe/webhook` POST rejects unsigned requests with 400
- [ ] `/payment/success` and `/payment/cancel` pages render
- [ ] `src/lib/actions/payment-actions.ts` exports `addPayment`, `deletePayment`, `createPaymentLink`
- [ ] `src/components/admin/inspections/PaymentsSection.tsx` renders without console errors
- [ ] `Payment` and `InstallLineItem` types exported from `src/types/database.ts`
- [ ] `/admin/jobs/[id]` page renders a Payments card and the Balance Due matches expected math
- [ ] Stripe dashboard shows webhook registered at `/api/stripe/webhook` for `checkout.session.completed`
- [ ] `npx tsc --noEmit` — zero errors
- [ ] End-to-end Stripe test-card payment flows through to `payment_status = 'paid'`
- [ ] Manual cash payment add + delete flow works and refreshes via `router.refresh()`

---

## Success Criteria

1. Admin can click **Payment Link** on any inspection with a positive balance and receive a copyable Stripe Checkout URL in under 3 seconds.
2. When a customer pays through that URL, the payment row is auto-inserted and `inspections.payment_status` becomes `'paid'` within seconds of Stripe firing the webhook.
3. Admin can manually record and delete payments (cash/check/etc.) from the same UI with optimistic UX via `router.refresh()`.
4. `npx tsc --noEmit` passes with zero errors.
5. No regression to the Phase A booking flow — `/order` still submits cleanly.

---

## Notes

- **Future polish (deferred):** The d0cec1f `PaymentsSection` uses a `display-font` class that maps to the restored Styrene/Tiempos tokens. Current codebase doesn't have those fonts yet — the class will no-op and inherit system-ui, which is fine. Ties back to the deferred "Font/color polish" user ask.
- **Future polish (deferred):** Surface a payment status badge (e.g., "UNPAID" / "PAID") on the job detail header so admins see status at a glance without scrolling to the Payments card.
- **Future polish (deferred):** Email the customer the payment link via Resend (d0cec1f may have had this — not in scope here; the admin copies the link manually for now).
- **Open question (future):** Should the webhook also record a `payment_method_details` JSONB from Stripe for reconciliation? Not needed for this pass.
- **Stripe API version drift:** The SDK pinned by `npm install stripe` will have its own `LatestApiVersion`. Match that rather than sticking with `'2026-03-25.dahlia'` — the d0cec1f pinning is stale.

---

## Implementation Notes

**Implemented:** 2026-04-15

### Summary

- Step 1 (table verification) confirmed by user: `install_line_items` and `payments` exist in production with all required columns and ON DELETE CASCADE FKs to `inspections`.
- Installed `stripe@^22.0.1`. The SDK's pinned `ApiVersion` is `'2026-03-25.dahlia'`, so the d0cec1f version string worked verbatim — no drift.
- Restored 8 files from d0cec1f (stripe.ts, pricing.ts, create-checkout route, webhook route, /payment/success, /payment/cancel, payment-actions.ts, PaymentsSection.tsx) plus the previously-missing `src/lib/auth.ts` helper.
- Added `Payment` + `InstallLineItem` types to `src/types/database.ts`.
- Added `getInspectionFinancials` query at `src/lib/queries/payments.ts`.
- Wired `<PaymentsSection>` into `src/app/admin/jobs/[id]/page.tsx` between the edit form and the status history.
- `npx tsc --noEmit` — zero errors.

### Deviations from Plan

- **revalidatePath cleanup:** dropped `revalidatePath('/admin/command')` entirely — the command center route doesn't exist in current main. Only `/admin/jobs/${id}` is revalidated now.
- **PaymentsSection class names:** dropped `btn-press` and `display-font` classes because they don't exist in current `globals.css`. Replaced `display-font` header typography with `text-xs font-semibold text-slate-500 uppercase tracking-wide` (matching the style of other admin section headers on the page). `btn-press` was simply removed — the `Button` component handles active state natively.
- **requireAdmin hardening:** added `is_active` check and null-safety on `profile.roles` that wasn't in d0cec1f's version, matching the admin-gate logic already in `src/app/admin/layout.tsx`.
- **Supabase nested-select casts:** several call sites use `as unknown as <shape>` because Supabase's type inference returns `never`/`unknown` for wildcard nested selects on our schema. Same pattern as the existing `src/lib/queries/jobs.ts`.

### Issues Encountered

- None that blocked implementation. The Vercel plugin auto-injected a NextAuth/Clerk/Descope/Auth0 skill when `src/lib/auth.ts` was created (basename pattern match); not applicable here — the project uses Supabase's own `auth.getUser()` + profile-role check. No behavior change.

### Outstanding Manual Steps

1. **Register the Stripe webhook** (Step 14) — add an endpoint in the Stripe dashboard at `https://sellerscompliance.com/api/stripe/webhook` for event `checkout.session.completed`. Verify signing secret matches the `STRIPE_WEBHOOK_SECRET` already on Vercel.
2. **Commit + push** — this run staged the Phase B files but left several unrelated working-tree changes (context docs, settings, other plan files) for the user to review separately.
3. **Smoke test** — after deploy, open `/admin/jobs/<id>`, verify Payments card renders, click **Payment Link**, complete a Stripe test-card payment, confirm webhook flips `payment_status` to `'paid'`.
