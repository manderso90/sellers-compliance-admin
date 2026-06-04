# Plan: Record Install Line Items on the Job/Inspection Detail Page

**Created:** 2026-06-04
**Status:** Draft
**Request:** Let an inspector attach catalog products (item, quantity, adjustable price) to an inspection on the job detail page, with a running install total, to produce an accurate invoice for the agent.

---

## Overview

### What This Plan Accomplishes

Adds an **Install Items** section to the job/inspection detail page (`/admin/jobs/[id]`) where an inspector can add, edit, and remove line items drawn from the shared product catalog. Each line captures the product, quantity, and an adjustable unit price (defaulting to the product's price), and the section shows a running install subtotal. This is the missing piece needed to hand the real estate agent an accurate invoice after the inspection.

### Why This Matters

Today's the **first real inspection (2026-06-04)**. A dry run surfaced that there is no way to record what was needed/installed, so the invoice can't be tallied. The data layer already exists (`install_line_items` table + read query + downstream Stripe/rollup math); the only gap is a **write path and UI**. Closing it makes inspection → invoice a frictionless step — the core product promise.

---

## Current State

### Relevant Existing Structure

- **`src/app/admin/jobs/[id]/page.tsx`** — async server component. A "Job" *is* an inspection (`job.id` = inspection id). Fetches via `Promise.all([getJobById, getJobStatusHistory, getActiveInspectors, getInspectionFinancials(id)])` and renders stacked neo-shadow cards: Status/Assignment → Smart Scheduling → JobEditForm → **PaymentsSection** → Status History.
- **`src/lib/queries/payments.ts` → `getInspectionFinancials(inspectionId)`** — **already** reads `install_line_items` (`select('*')`) and returns `{ payments, lineItems, balanceDue, totalPaid, invoiceTotal }`. `installTotal = Σ quantity × unit_price` is folded into `invoiceTotal` and `balanceDue`. **The page currently discards `lineItems`/`invoiceTotal`** and only passes `payments` + `balanceDue` to `PaymentsSection`.
- **`src/lib/queries/product-queries.ts` → `getActiveProducts(supabase)`** — the catalog source the Command Center reuses. Selects `products` where `is_active = true`, ordered by `sort_order`, `product_name`. Takes a Supabase client arg.
- **`src/components/admin/inspections/PaymentsSection.tsx`** — the canonical client-component pattern to mirror: receives server-fetched data, calls server actions, then `router.refresh()`. Uses `@/components/ui/{button,input,select}`.
- **`src/components/admin/command/ProductPricingCard.tsx`** — SC Bold table styling reference (neo-shadow, gold/red accents, `formatCurrencyPrecise`).
- **`src/lib/actions/payment-actions.ts`** — server-action pattern: `'use server'`, `requireAdmin()`, mutate, `revalidatePath('/admin/jobs/${inspectionId}')`.
- **`src/lib/auth.ts` → `requireAdmin()`** — returns `{ supabase, user, profile }`; throws if not admin.
- **Types** (`src/types/database.ts`): `InstallLineItem`, `Product` aliases already exported.

### Real Column Shapes (generated types — authoritative)

- **`products`**: `id, product_name, price, part_cost, labor_cost, is_active, sort_order, category?, notes?, created_at, updated_at`
- **`install_line_items`**: `id, inspection_id, product_id?, item_name?, quantity, unit_price, unit_part_cost, unit_labor_cost, completed_at?, created_at, updated_at` — FK `inspection_id → inspections.id`.

### Gaps or Problems Being Addressed

1. **No write path** for `install_line_items` anywhere in the repo (grep confirms only `select`s). ← the whole gap.
2. **The page drops already-fetched `lineItems`** — they're loaded but never rendered.
3. **No product catalog loaded** on the detail page to pick items from.

> Note: `supabase/schema.sql` is **partial/stale** (only 5 of the live tables). The generated types + four working live queries are the authoritative in-repo source. No schema change in this plan → **no cross-repo mirror required.**

---

## Proposed Changes

### Summary of Changes

- New server-action module `line-item-actions.ts` with `addLineItem`, `updateLineItem`, `deleteLineItem`.
- New client component `InstallItemsSection.tsx` (mirrors `PaymentsSection`) — add/edit/remove rows + running install total.
- Wire `page.tsx`: load `getActiveProducts(supabase)`, pass `financials.lineItems` + `products` into the new section, placed directly **above** the Payments card.
- No schema change. No public-repo change.

### New Files to Create

| File Path | Purpose |
| --- | --- |
| `src/lib/actions/line-item-actions.ts` | Server actions to add/update/delete `install_line_items`, snapshotting price/part/labor from the chosen product. |
| `src/components/admin/inspections/InstallItemsSection.tsx` | Client UI to manage line items and show the running install subtotal. |

### Files to Modify

| File Path | Changes |
| --- | --- |
| `src/app/admin/jobs/[id]/page.tsx` | Create a Supabase client, call `getActiveProducts(supabase)` in the existing `Promise.all`, and render `<InstallItemsSection inspectionId products lineItems />` above the Payments card. |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Reuse `getActiveProducts` verbatim** for the catalog — guarantees the detail page and Command Center never drift. The page already imports `createClient` from `@/lib/supabase/server`.
2. **Snapshot pricing on add.** Copy the selected product's `price → unit_price`, `part_cost → unit_part_cost`, `labor_cost → unit_labor_cost`, and `product_name → item_name` into the row. Persisting all three `unit_*` columns keeps the invoice (Σ qty×unit_price) **and** the Command Center profit math (`unit_part_cost`/`unit_labor_cost`) correct even if the catalog changes later. Matches exactly how `getInspectionFinancials`, `getWeeklyInstallAggregation`, and the public-repo Stripe checkout already read these columns.
3. **Adjustable price only.** Per the request, the inspector edits the **unit price** (defaulting to product price) and **quantity**. `unit_part_cost`/`unit_labor_cost` are carried from the product snapshot and not edited in the field UI (keeps it fast; profit math stays intact).
4. **Set `completed_at = now` on add.** `getWeeklyInstallAggregation` filters the Command Center "Installs This Week" rollup by `completed_at`. Items installed during today's inspection should count, so we stamp `completed_at` at insert time. (Invoice/balance math does **not** depend on `completed_at`, so this only affects rollups — in the desired direction.)
5. **Store both `product_id` and `item_name`.** `product_id` powers joins/rollups; `item_name` is a resilient label snapshot (and `product_id` is nullable in the schema).
6. **Catalog dropdown excludes `category === 'discount'`.** `ProductPricingCard` treats discounts as a separate, specially-rendered group (percentages / negative prices). For "items needed/installed" v1, show only real install products so a discount can't be mis-added as a positive line. Discounts as line items can be a later enhancement.
7. **Mirror `PaymentsSection` UX** (inline add form, per-row delete, `useTransition` + `router.refresh()`, SC Bold styling) so the page stays consistent and the code is low-risk to ship today.
8. **Placement: above Payments.** Install items feed the invoice total the Payments card already reflects in `balanceDue`, so they read top-to-bottom: itemize → then take payment.

### Alternatives Considered

- **Add a new combined "Invoice" query** returning products + line items together → rejected; `getInspectionFinancials` already returns `lineItems`, and `getActiveProducts` already exists. Reusing both is less code and zero drift.
- **Editing part/labor cost in the row UI** → rejected for v1; not requested, adds clutter, and the product snapshot already yields correct profit math.
- **Live Supabase MCP schema check before building** → optional, not blocking. Generated types + four working live queries already confirm the shapes. Offered to the user as a 2-minute pre-flight if desired.

### Open Questions (if any)

1. **`completed_at = now` confirmed?** This makes the item count in "Installs This Week" immediately. (Recommended yes.)
2. **Exclude discounts from the picker for v1?** (Recommended yes.)
3. **Section heading wording** — "Install Items" vs "Line Items" vs "Items Installed". (Defaulting to **Install Items**.)

None of these block implementation; defaults are chosen.

---

## Step-by-Step Tasks

### Step 1: Create the server actions

Create `src/lib/actions/line-item-actions.ts` implementing add/update/delete against `install_line_items`, following the `payment-actions.ts` pattern exactly.

**Actions:**

- `'use server'`; import `requireAdmin` from `@/lib/auth` and `revalidatePath` from `next/cache`.
- `addLineItem(inspectionId: string, input: { productId: string; quantity: number; unitPrice: number })`:
  - `const { supabase } = await requireAdmin()`.
  - Fetch the product: `supabase.from('products').select('product_name, price, part_cost, labor_cost').eq('id', input.productId).single()`. If missing, `throw new Error('Product not found')`.
  - Insert: `{ inspection_id, product_id: input.productId, item_name: product.product_name, quantity: input.quantity, unit_price: input.unitPrice, unit_part_cost: product.part_cost, unit_labor_cost: product.labor_cost, completed_at: new Date().toISOString() }`.
  - `if (error) throw error`; then `revalidatePath('/admin/jobs/${inspectionId}')`.
- `updateLineItem(itemId: string, inspectionId: string, input: { quantity: number; unitPrice: number })`:
  - `requireAdmin()`, `supabase.from('install_line_items').update({ quantity: input.quantity, unit_price: input.unitPrice }).eq('id', itemId)`; throw on error; revalidate.
- `deleteLineItem(itemId: string, inspectionId: string)`:
  - `requireAdmin()`, `.delete().eq('id', itemId)`; throw on error; revalidate.
- Guard inputs: coerce `quantity` to an integer ≥ 1 and `unitPrice` to a finite number ≥ 0 before persisting.

**Files affected:**

- `src/lib/actions/line-item-actions.ts` (new)

---

### Step 2: Build the InstallItemsSection client component

Create `src/components/admin/inspections/InstallItemsSection.tsx`, mirroring `PaymentsSection.tsx`.

**Actions:**

- `'use client'`. Props: `{ inspectionId: string; products: Product[]; lineItems: InstallLineItem[] }`.
- Imports: `useState`, `useTransition`, `useRouter`; `Button`, `Input`, `Select*` from `@/components/ui/*`; `Plus`, `Trash2`, `Pencil`, `Check`, `X`, `Loader2` from `lucide-react`; `formatCurrencyPrecise` from `@/lib/utils/formatting`; the three actions from `@/lib/actions/line-item-actions`; types `Product`, `InstallLineItem`.
- Derive `catalog = products.filter(p => p.category !== 'discount')` for the picker.
- **Add flow:** a `showAdd` inline form with a product `<Select>`, quantity `<Input type="number" min="1">`, and unit price `<Input type="number" step="0.01">`. When a product is selected, default the price input to that product's `price`. On submit → `startTransition(() => addLineItem(inspectionId, { productId, quantity, unitPrice }))`, then reset + `router.refresh()`.
- **Edit flow:** per-row `editingId` state; show quantity + unit price inputs with Check/X; Check → `updateLineItem(item.id, inspectionId, { quantity, unitPrice })` + refresh.
- **Delete:** per-row Trash button → `confirm('Remove this item?')` → `deleteLineItem(item.id, inspectionId)` + refresh.
- **Rows render:** `item_name` (fallback "Item"), quantity, unit price, line subtotal = `quantity × Number(unit_price)` via `formatCurrencyPrecise`.
- **Running total:** footer row "Install Total" = `Σ quantity × Number(unit_price)` over `lineItems`, styled like the PaymentsSection summary (bold, `border-t-2 border-[#2B2B2B]/10`).
- Empty state: "No install items recorded." when `lineItems.length === 0 && !showAdd`.
- Disable buttons while `isPending`. SC Bold styling: `border-2 border-[#2B2B2B]`, `rounded-xl`, `neo-shadow-sm`, gold `#EFB948` / red `#C8102E` accents consistent with `PaymentsSection`/`ProductPricingCard`.

**Files affected:**

- `src/components/admin/inspections/InstallItemsSection.tsx` (new)

---

### Step 3: Wire the detail page

Modify `src/app/admin/jobs/[id]/page.tsx` to load products and render the new section.

**Actions:**

- Add imports: `import { createClient } from '@/lib/supabase/server'`, `import { getActiveProducts } from '@/lib/queries/product-queries'`, `import { InstallItemsSection } from '@/components/admin/inspections/InstallItemsSection'`.
- Inside the component, create the client and add the products fetch. Simplest: `const supabase = await createClient()` then add `getActiveProducts(supabase)` as a 5th entry in the existing `Promise.all`, destructured as `products`. (Note: `getJobById` etc. create their own clients internally, so the extra client here is fine and consistent with how `admin/page.tsx` does it.)
- Render a new card **directly above** the Payments card:
  ```tsx
  <div className="bg-white border-2 border-black rounded-lg p-5 neo-shadow">
    <InstallItemsSection
      inspectionId={job.id}
      products={products}
      lineItems={financials.lineItems}
    />
  </div>
  ```
- Leave the existing `PaymentsSection` untouched — its `balanceDue` already includes the install total from `getInspectionFinancials`.

**Files affected:**

- `src/app/admin/jobs/[id]/page.tsx`

---

### Step 4: Type-check and validate

**Actions:**

- Run `npx tsc --noEmit` — must be 0 errors (repo zero-error policy).
- Run `npm run lint` — no new warnings (note repo rule: no `console.log`; no `any` — use the exported `Product`/`InstallLineItem` types).
- Manual smoke test against a real inspection id (below).

**Files affected:**

- None (validation only).

---

## Connections & Dependencies

### Files That Reference This Area

- `getInspectionFinancials` (`lib/queries/payments.ts`) — already returns `lineItems`; the invoice/balance shown in `PaymentsSection` will now reflect added items automatically.
- `getWeeklyInstallAggregation` (`lib/queries/product-queries.ts`) and `lib/queries/command-center.ts` — read `install_line_items` filtered by `completed_at`; new rows (stamped now) appear in Command Center "Installs This Week".
- Public repo `Sellers-Compliance` Stripe checkout — sums `quantity × unit_price`; unaffected and now fed real data. **No change to that repo.**

### Updates Needed for Consistency

- `aios/05_active/in-progress.md` — add a Recent Completions row after shipping.
- `aios/00_overview/product.md` — the "Payments & Invoicing" / "line item tracking" bullet already mentions `install_line_items`; optionally note that line items are now editable from the job detail page. (Docs-only, post-merge.)
- No `terminology.md` change (no new enum/status).

### Impact on Existing Workflows

- Dispatch, scheduling, status lifecycle: **untouched.**
- Command Center: gains real install data via existing rollups (positive, read-only).
- Payments: balance now reflects itemized installs without any change to `PaymentsSection`.

---

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with 0 errors.
- [ ] `npm run lint` shows no new warnings; no `any`, no `console.log`.
- [ ] On `/admin/jobs/[id]`, an **Install Items** card renders above Payments.
- [ ] Selecting a product defaults the price to the product's price; price and quantity are editable before adding.
- [ ] Adding an item persists a row with `unit_price`, `unit_part_cost`, `unit_labor_cost`, `item_name`, `product_id`, and `completed_at` set.
- [ ] The running **Install Total** equals Σ(quantity × unit price) and updates after add/edit/delete.
- [ ] The Payments card **Balance Due** increases by the install total (proves end-to-end invoice math).
- [ ] Edit changes quantity/price and recomputes totals; delete removes the row.
- [ ] Discount-category products do not appear in the picker.

---

## Success Criteria

The implementation is complete when:

1. An inspector can add, edit, and remove install line items on the job detail page using the shared product catalog, setting quantity and an adjustable price.
2. The page shows an accurate running install total, and the Payments balance reflects it — sufficient to hand the agent a correct invoice this afternoon.
3. `tsc --noEmit` and lint are clean; no schema change; the public repo is untouched.

---

## Notes

- **Shippable-today scope.** No schema migration, no cross-repo mirror, no new query (read already exists). Three focused files: one action module, one component, one page wiring.
- **Pre-flight option:** if desired, verify the live `install_line_items`/`products` shapes via the Supabase MCP before building — generated types already match, so this is optional, not blocking.
- **Future enhancements (not today):** custom/manual line items (`product_id` null + free-text `item_name`), discount line items, editing part/labor cost per line, and surfacing a combined invoice total (inspection fee + install) directly in the Install card via the `invoiceTotal` already returned by `getInspectionFinancials`.
- **Cannot-do-safely-today flags:** none identified. The only risk is acting on stale `supabase/schema.sql`; mitigated by relying on generated types + working live queries (and the optional MCP check).
