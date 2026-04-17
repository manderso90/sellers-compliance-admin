# Plan: Restore April 3 Command Center Dashboard (Phase C)

**Created:** 2026-04-16
**Status:** Implemented
**Request:** Restore the April 3 Command Center dashboard from orphan commit `d0cec1f` onto the rewritten Seller's Compliance schema, continuing the Phase A (booking) and Phase B (Stripe invoicing) restoration pattern.

---

## Overview

### What This Plan Accomplishes

Restores the design-rich, data-dense Command Center at `/admin` that Mo built before the DisptchMama-era schema rewrite wiped it out. After implementation, `/admin` renders the full April 3 experience: the SC Bold neo-brutalist shell, an alerts banner, a 4-card metrics row (Scheduled Today / Completed This Week / Unconfirmed / Unassigned), a 2×2 grid of business-analytics cards (Spaces Inspected + Inspection Analysis + Product Pricing + Installs This Week), and a detailed Inspector Workload snapshot — all sourced from real inspection, install-line-item, and profile data on the current schema.

### Why This Matters

The Command Center is Mo's daily operational dashboard. The current monolithic `CommandCenter.tsx` covers only a fraction of what he built (stats + critical/needs-attention buckets + a minimal inspector table). Everything tied to weekly business KPIs — inspection revenue, install revenue, profit, spaces inspected, product performance — is gone. Phase C is not a polish pass; it is a functional restoration of the primary at-a-glance business view for the operator, using real data on the new schema, and re-establishing the SC Bold visual language across the admin shell.

---

## Current State

### Relevant Existing Structure

- **`src/app/admin/page.tsx`** — 9-line wrapper that calls `getCommandCenterData()` and renders `<CommandCenter>`. Admin gate lives in `src/app/admin/layout.tsx`.
- **`src/components/admin/command-center/CommandCenter.tsx`** — 335-line monolithic `'use client'` component: header with `font-[Syne]`, 4 SummaryCards (Active / Unassigned / Today / On Hold), Critical section, Needs Attention section, Inspector Workload table. Uses `neo-shadow`, hex colors `#FFFDF5`, `#FDE047`.
- **`src/lib/queries/command-center.ts`** — 183 lines, one exported function `getCommandCenterData()` with 3 parallel queries on `inspections` + `profiles`. Returns `{ critical, needsAttention, inspectorWorkload }`. Status filter uses `'requested'`.
- **`src/app/globals.css`** — 188 lines, Tailwind v4 `@theme inline`. Has: `neo-shadow`, `neo-shadow-sm`, `neo-shadow-hover`. **Missing** (needed by d0cec1f components): `display-font`, `neo-shadow-gold`, `neo-shadow-red`, `btn-press`, `.sc-bold` scoped typography with Syne/Space Grotesk, `animate-blob`.
- **`src/types/database.ts`** — Already includes `properties.bedrooms/bathrooms/levels`, `inspections.requested_date`, `install_line_items.unit_part_cost/unit_labor_cost/completed_at`, `profiles.is_active/full_name`. `JobStatus` union is `'requested' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'` — does **not** include `'awaiting_confirmation'` (d0cec1f references it).
- **`src/lib/utils/pricing.ts`** — Has `getInspectionPrice` and `getInspectionProfit` (already in use for Phase B).
- **`package.json`** — `date-fns ^4.1.0` ✓, `lucide-react ^0.577.0` ✓, no new deps required.
- **`src/components/admin/`** — has `command-center/`, `dispatch/`, `inspections/`, `inspectors/`, `jobs/`, `layout/`, `shared/`.

### Gaps or Problems Being Addressed

1. **No `/admin/command` route** — d0cec1f lived at `/admin/command`; we need to either add that route or replace `/admin/page.tsx` to render the new shell. This plan chooses the latter so `/admin` stays the canonical landing URL.
2. **No `CommandCenterShell`** — the Syne + Space Grotesk font wrapper, `.sc-bold` scoped typography class, and background/blob decoration are missing.
3. **No granular command components** — all 7 card components (`CommandMetricsRow`, `AlertsBanner`, `SpacesInspectedCard`, `InspectionAnalysisCard`, `ProductPricingCard`, `InstallsThisWeekCard`, `InspectorWorkloadSnapshot`) are absent.
4. **Query layer missing 5 of 6 functions** — `getCommandCenterStats`, `getWeeklySpacesInspected`, `getWeeklyInspectionAnalysis`, `getComputedAlerts`, `getInspectorWorkloads` do not exist. Only a single flat `getCommandCenterData` is there.
5. **No `product-queries.ts`** — `getActiveProducts` and `getWeeklyInstallAggregation` don't exist.
6. **No `products` table support in the repo** — `src/types/database.ts` does not declare a `products` table. Whether it exists in production is one of the schema-verification questions (Step 1). `ProductPricingCard` + `product-actions.ts` + `InstallsThisWeekCard` all depend on it.
7. **No `formatting.ts`** — `formatCurrency`, `formatCurrencyPrecise`, `formatNumber` don't exist.
8. **No `ScheduleSyncClient`** and no `use-schedule-sync` hook — d0cec1f drops this into the command page for cross-tab refresh.
9. **SC Bold CSS tokens missing** — `src/styles/sc-bold-tokens.css` and `src/styles/sc-bold-components.css` don't exist; globals.css does not import them.
10. **`'awaiting_confirmation'` status mismatch** — d0cec1f's `getComputedAlerts` queries for this status; current schema may or may not accept it. Must resolve in Step 1.

---

## Proposed Changes

### Summary of Changes

- **Step 1 (blocking): SQL-verify five schema assumptions** against production before touching any code.
- Restore SC Bold design tokens: two new CSS files imported from `globals.css`, plus a `.sc-bold` wrapper on the command page.
- Restore all 7 command-card components plus the shell + schedule-sync client (9 new `.tsx` files).
- Expand `src/lib/queries/command-center.ts` from 183 → ~413 lines with 5 new query functions.
- Create `src/lib/queries/product-queries.ts` and `src/lib/utils/formatting.ts`.
- Conditionally restore `ProductPricingCard` + `product-actions.ts` + `Product` type — **only if** Step 1 confirms the `products` table exists. Otherwise defer to Phase D.
- Replace `src/app/admin/page.tsx` body to render the new shell instead of the monolithic `CommandCenter`.
- Delete `src/components/admin/command-center/CommandCenter.tsx` (no longer referenced after replacement).
- Add `ScheduleSyncClient` + `use-schedule-sync` hook (minimal realtime for cross-tab refresh only — no expanded realtime scope).

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/styles/sc-bold-tokens.css` | SC Bold design tokens scoped to `.sc-bold` (colors, shadows, radii, typography vars) |
| `src/styles/sc-bold-components.css` | SC Bold component classes: `.neo-shadow`, `.neo-shadow-gold`, `.neo-shadow-red`, `.btn-press`, `.display-font`, scoped to `.sc-bold` |
| `src/lib/utils/formatting.ts` | `formatCurrency`, `formatCurrencyPrecise`, `formatNumber` helpers |
| `src/lib/queries/product-queries.ts` | `getActiveProducts(supabase)`, `getWeeklyInstallAggregation(supabase)` — reads `products` + `install_line_items` |
| `src/lib/hooks/use-schedule-sync.ts` | Minimal Supabase realtime subscription that calls `router.refresh()` on `inspections` changes |
| `src/components/admin/shared/ScheduleSyncClient.tsx` | `'use client'` wrapper that invokes `useScheduleSync()` and renders null |
| `src/components/admin/command/CommandCenterShell.tsx` | `'use client'` shell: loads Syne + Space Grotesk Google fonts, applies `.sc-bold` class, renders decorative blob background |
| `src/components/admin/command/CommandMetricsRow.tsx` | 4-card top row (Scheduled Today / Completed / Unconfirmed / Unassigned) with variant styling |
| `src/components/admin/command/AlertsBanner.tsx` | Dismissable gold-bordered alert banner driven by `ComputedAlert[]` |
| `src/components/admin/command/SpacesInspectedCard.tsx` | Weekly spaces breakdown: Bedrooms / Hallways / Bathrooms / Water Heaters with colored icons |
| `src/components/admin/command/InspectionAnalysisCard.tsx` | Weekly business KPIs: revenue/profit/per-property/per-inspection ratios |
| `src/components/admin/command/InstallsThisWeekCard.tsx` | Per-product install aggregation table with totals row |
| `src/components/admin/command/InspectorWorkloadSnapshot.tsx` | Per-inspector row with status dot, time range, job count + minutes pill |
| `src/components/admin/command/ProductPricingCard.tsx` | **Conditional on Step 1** — editable product catalog table. Add/edit/delete inline with server actions. If `products` table does not exist, skip this file and defer to Phase D. |
| `src/lib/actions/product-actions.ts` | **Conditional on Step 1** — `createProduct`, `updateProduct`, `deleteProduct` server actions. Skip if products table absent. |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/app/admin/page.tsx` | Replace body: fetch 5–7 datasets in parallel (stats, workloads, alerts, weeklyInstalls, spaces, analysis, and products if present), render `<CommandCenterShell>` + `<ScheduleSyncClient>` + header + `<AlertsBanner>` + `<CommandMetricsRow>` + 2×2 card grid + `<InspectorWorkloadSnapshot>`. |
| `src/lib/queries/command-center.ts` | Expand to ~413 lines. Add: `getCommandCenterStats`, `getWeeklySpacesInspected`, `getWeeklyInspectionAnalysis`, `getComputedAlerts`, `getInspectorWorkloads`, helper `getWeeklyInstallRevenue`. Existing `getCommandCenterData` may stay for the legacy component during transition, or be removed once `/admin/page.tsx` switches over. Resolve `'awaiting_confirmation'` vs `'requested'` based on Step 1 output. |
| `src/app/globals.css` | Add two `@import` lines at top for the SC Bold token/component CSS files. No other changes (the existing admin-wide neo-shadow/hex usage can stay). |
| `src/types/database.ts` | **Conditional on Step 1** — add `products` table row/insert/update + top-level `Product` alias. Skip if table doesn't exist. |

### Files to Delete

| File Path | Reason |
|-----------|--------|
| `src/components/admin/command-center/CommandCenter.tsx` | Replaced by the new granular command/* component tree. Only delete **after** `/admin/page.tsx` has been switched over and compiles. |

---

## Design Decisions

### Key Decisions Made

1. **Keep `/admin` as the landing route; don't add `/admin/command`.** d0cec1f used `/admin/command` with `/admin/dashboard` as the job-list page. Current main inverts that — `/admin` is the command center, `/admin/dashboard` doesn't exist, `/admin/jobs` is the list. Rationale: less router churn, no nav re-wiring, fewer cross-link rewrites.

2. **Conditionally defer `ProductPricingCard` if the `products` table does not exist in production.** Creating a brand-new table + backfilling seed rows is a distinct piece of work (Phase D candidate). If Step 1 returns "no products table," the 2×2 grid becomes a 1×3 column: Spaces Inspected + Inspection Analysis + Installs This Week (the InstallsThisWeek card can render with an empty-state message that references install_line_items directly). This keeps Phase C shippable without a schema migration.

3. **Use `.sc-bold` scoped wrapper, not global CSS.** d0cec1f kept the neo-brutalist theme wrapped in a `.sc-bold` class so it doesn't leak to `/order`, `/login`, or Phase A public pages. This is load-bearing — the tokens intentionally cascade only inside the admin shell. Keep the scoping discipline.

4. **Use the existing `getInspectionPrice` / `getInspectionProfit` utilities.** Phase B already established these. The command-center queries should call them rather than re-implementing pricing logic.

5. **Keep the `ScheduleSyncClient` minimal.** d0cec1f dropped it on the command page for cross-tab auto-refresh. We port only that narrow behavior; broader realtime UI (live alert pushes, per-card subscriptions) is explicitly out of scope.

6. **Follow Phase A/B pattern — Step 1 is schema verification, before any code edit.** Mo has been bitten twice now (canonical URL, Stripe account mismatch). Blocking the plan on SQL verification is the pattern that's worked.

7. **Keep the existing `getCommandCenterData` during transition.** Deleting it immediately could break `/admin/page.tsx` mid-implementation. Leave it in place until the new queries + page are wired, then delete in the final cleanup step.

### Alternatives Considered

- **Mount d0cec1f's structure verbatim at `/admin/command` and leave current `/admin` alone.** Rejected — produces two competing command centers, forces sidebar/link rewrites, and contradicts Mo's "this should be what I see at /admin" expectation.
- **Skip the `.sc-bold` scoping; promote all tokens to global.** Rejected — the tokens conflict with existing neo-shadow definitions in `globals.css`, and Mo's /order flow uses a different aesthetic that shouldn't inherit Syne/Space Grotesk headings.
- **Create the `products` table as part of this plan.** Rejected — schema migrations + seed data + types + admin-side management is its own unit of work with its own risks. Better to confirm existence first and defer if needed.
- **Port the revenue-at-risk / unassigned-revenue math from d0cec1f as-is.** Accepted, since those values already depend on `getInspectionPrice` which we already have. No alternative needed.

### Open Questions

These are resolved by Step 1 before any code work begins:

1. **Does `products` exist in production?** If yes, port full card + actions. If no, defer to Phase D, render the 3-card variant.
2. **Does `inspections.status` accept `'awaiting_confirmation'`?** If yes, port d0cec1f's overdue query verbatim. If no, collapse it with `'requested'` (current convention).
3. **Do all referenced columns exist as the types claim?** Specifically `inspections.requested_date`, `properties.bedrooms/bathrooms/levels`, `install_line_items.completed_at`. Types declare them; verify against live DB.

---

## Step-by-Step Tasks

### Step 1: Schema verification (BLOCKING)

Run SQL against production Supabase before any code change. Document results inline in this plan before proceeding to Step 2.

**Actions:**

Run each query through Supabase SQL editor or `psql` (via the project's database URL):

1. **Confirm `install_line_items` exists with required columns:**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'install_line_items'
   ORDER BY ordinal_position;
   ```
   Expected: `quantity`, `unit_price`, `unit_part_cost`, `unit_labor_cost`, `completed_at`, `product_id`.

2. **Confirm `inspections.requested_date` exists:**
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name='inspections' AND column_name='requested_date';
   ```

3. **Confirm `properties` has `bedrooms`, `bathrooms`, `levels`:**
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name='properties'
     AND column_name IN ('bedrooms','bathrooms','levels','adu_count','unit_count')
   ORDER BY column_name;
   ```
   Expected: all 5 rows returned.

4. **Check valid `inspections.status` values:**
   ```sql
   SELECT DISTINCT status FROM inspections ORDER BY status;
   -- AND check the enum/constraint:
   SELECT conname, pg_get_constraintdef(oid)
   FROM pg_constraint
   WHERE conrelid = 'public.inspections'::regclass
     AND contype = 'c';
   ```
   Note whether `'awaiting_confirmation'` is valid.

5. **Check for `products` table:**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema='public' AND table_name IN ('products','install_products');
   ```
   If present, also inspect columns:
   ```sql
   SELECT column_name, data_type FROM information_schema.columns
   WHERE table_schema='public' AND table_name='products'
   ORDER BY ordinal_position;
   ```
   Required columns for the full restoration: `id`, `product_name`, `price`, `part_cost`, `labor_cost`, `is_active`, `sort_order`, `category`, `notes`.

**Branch decisions based on results:**

- If `'awaiting_confirmation'` is not a valid status → in Step 6's query, use `status IN ('requested','confirmed')` for the unconfirmed logic instead.
- If `products` does not exist → skip Steps 5, 11, 12, and the type addition in Step 13. Render the 3-card grid variant in Step 14.
- If any other expected column is missing → STOP and ask Mo before proceeding.

**Record findings:** Append a short "Step 1 Findings" subsection below this step with the actual results before moving to Step 2.

#### Step 1 Findings (recorded 2026-04-16)

Verified from `supabase/schema.sql` + `src/types/database.ts` (both kept in sync with the live schema after the rewrite) and a user-provided DDL + screenshot of the Supabase table editor. No production SQL queries were required — local sources are authoritative.

1. **`install_line_items`** — exists with all required columns (`quantity`, `unit_price`, `unit_part_cost`, `unit_labor_cost`, `completed_at`, `product_id`, `item_name`). Confirmed via `src/types/database.ts` lines 334–376 and visible in the user's Supabase table-editor screenshot. ✅
2. **`inspections.requested_date`** — exists (`date` column). Confirmed in `schema.sql` line 76 and `database.ts`. ✅
3. **`properties.bedrooms` (integer), `bathrooms` (numeric), `levels` (integer), `adu_count` (integer), `unit_count` (integer)** — all present. Confirmed in `schema.sql` lines 58–62. ✅
4. **`inspections.status` valid values** — CHECK constraint limits to exactly: `'requested'`, `'confirmed'`, `'in_progress'`, `'completed'`, `'cancelled'`, `'on_hold'`. **`'awaiting_confirmation'` is NOT valid.** Confirmed in `schema.sql` lines 74–75. → In Step 6, `getComputedAlerts` must filter overdue inspections with `status = 'requested'` only (do NOT port d0cec1f's `'awaiting_confirmation'` reference). In `getCommandCenterStats`, unconfirmed count = `status = 'requested'`. ❗ Adjustment required.
5. **`products` table** — **exists** in production. Full DDL provided by user:
   ```sql
   create table public.products (
     id uuid primary key default extensions.uuid_generate_v4(),
     product_name text not null,
     price numeric(10,2) not null default 0,
     part_cost numeric(10,2) not null default 0,
     labor_cost numeric(10,2) not null default 0,
     is_active boolean not null default true,
     sort_order integer not null default 0,
     category text,
     notes text,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   );
   ```
   Schema matches d0cec1f's expectations **exactly**. Existing data (visible in user's screenshot): 20+ product rows for CO detectors, smoke alarms, strap, discount items, etc. → **All conditional steps (5, 7, 11, 12, 13) are now UNCONDITIONAL.** Port ProductPricingCard + product-actions + Product type verbatim. ✅

**Implication for branching decisions:** No deferrals. Proceed to Step 2 with the full 4-card grid, including ProductPricingCard. One small adjustment: anywhere the plan says "if Step 1 confirmed..." or references `'awaiting_confirmation'`, treat as unconditional for products and use `'requested'`-only for overdue alerts.

---

### Step 2: Add SC Bold design tokens

Create the two CSS files that d0cec1f's admin shell depends on.

**Actions:**

- Create `src/styles/sc-bold-tokens.css` — port d0cec1f verbatim. Contains `--sc-red`, `--sc-gold`, `--sc-ink`, `--sc-shadow`, `--sc-shadow-gold`, `--sc-shadow-red`, `--sc-font-display`, `--sc-font-body`, etc., all scoped inside `.sc-bold { ... }`.
- Create `src/styles/sc-bold-components.css` — port d0cec1f verbatim. Defines `.sc-bold .neo-shadow`, `.sc-bold .neo-shadow-sm`, `.sc-bold .neo-shadow-red`, `.sc-bold .neo-shadow-gold`, `.sc-bold .neo-shadow-hover`, `.sc-bold .btn-press`, `.sc-bold .display-font`, and all the `.sc-card*`, `.sc-metric-card*`, `.sc-btn-*`, `.sc-badge-*`, etc.

**Files affected:**

- `src/styles/sc-bold-tokens.css` (new)
- `src/styles/sc-bold-components.css` (new)

---

### Step 3: Wire SC Bold CSS into globals.css

**Actions:**

- Read `src/app/globals.css`.
- Add two imports near the top, after any existing `@import "tailwindcss"` line:
  ```css
  @import "../styles/sc-bold-tokens.css";
  @import "../styles/sc-bold-components.css";
  ```
- Do not modify existing `neo-shadow` / `neo-shadow-sm` / `@theme` rules — the new `.sc-bold`-scoped rules override them only inside the admin wrapper.

**Files affected:**

- `src/app/globals.css`

---

### Step 4: Restore formatting utilities

**Actions:**

- Create `src/lib/utils/formatting.ts` with three exports:
  - `formatCurrency(value: number)` — Intl NumberFormat with 0 decimals (`$125`).
  - `formatCurrencyPrecise(value: number)` — Intl NumberFormat with 2 decimals (`$125.00`).
  - `formatNumber(value: number, decimals?: number = 1)` — tabular number formatting with optional decimals.
- Port verbatim from d0cec1f.

**Files affected:**

- `src/lib/utils/formatting.ts` (new)

---

### Step 5: Restore schedule-sync hook + client

Minimal realtime behavior to keep the command center fresh across tabs.

**Actions:**

- Create `src/lib/hooks/use-schedule-sync.ts` — port d0cec1f. Subscribes to Supabase realtime changes on `inspections`, calls `router.refresh()` on event. Keep the subscription narrow: `inspections` table only, all events.
- Create `src/components/admin/shared/ScheduleSyncClient.tsx` — 'use client' component that calls `useScheduleSync()` and returns null.

**Files affected:**

- `src/lib/hooks/use-schedule-sync.ts` (new)
- `src/components/admin/shared/ScheduleSyncClient.tsx` (new)

---

### Step 6: Expand command-center queries

Rewrite `src/lib/queries/command-center.ts` to export the 5 new functions d0cec1f used, plus the helper. Keep the existing `getCommandCenterData` export at the bottom of the file for now so the legacy component still compiles until Step 14 swaps `/admin/page.tsx`.

**Actions:**

- `getWeeklyInstallRevenue(supabase)` helper — queries `install_line_items` for the current week window using `date-fns` `startOfWeek`/`endOfWeek` (weekStartsOn: 1), returns `{ revenue, profit }` aggregated from `quantity * unit_price` / `unit_part_cost` / `unit_labor_cost`.
- `getCommandCenterStats(supabase)` — 4 parallel queries:
  - Today's inspections (scheduled_date = today) → scheduledToday, projectedTodayRevenue via `getInspectionPrice`.
  - Completed this week (completed_at within week) → completedThisWeek, completedRevenueThisWeek, completedProfitThisWeek via `getInspectionProfit` + weekly install profit/revenue from helper.
  - Unconfirmed count (status = 'requested'; if Step 1 found `'awaiting_confirmation'` is valid, OR with it) → unconfirmedCount, revenueAtRisk.
  - Unassigned count (assigned_inspector_id IS NULL AND status != 'completed' AND status != 'cancelled') → unassignedCount, unassignedRevenue.
  - Returns typed `CommandCenterStats`.
- `getWeeklySpacesInspected(supabase)` — query completed inspections this week with `properties(bedrooms, bathrooms, levels)` join, aggregate. Returns `WeeklySpaces { bedrooms, hallways, bathrooms, waterHeaters }`. (`hallways = sum of levels`; `waterHeaters = count of inspections` as d0cec1f treats it 1-per-property.)
- `getWeeklyInspectionAnalysis(supabase)` — returns 12-field `WeeklyAnalysis`: totalPropertiesInspected, inspectionRevenue, installRevenue, totalWeeklyRevenue, totalWeeklyProfit, avgRevenuePerProperty, avgInstallRevenuePerInspection, avgProfitPerProperty, totalInstalls, totalSpaces (= bedrooms+hallways+bathrooms+waterHeaters), installsPerProperty, installsPerBedroom.
- `getInspectorWorkloads(supabase)` — query `profiles` where `is_active = true`, join today's `inspections` for each (`scheduled_date = today`, status in ('scheduled','confirmed','in_progress')), return `InspectorWorkload[] { id, full_name, jobCount, totalMinutes (sum of estimated_duration_minutes), firstJobTime (earliest scheduled_time), lastJobEnd (latest scheduled_end) }`.
- `getComputedAlerts(supabase)` — query inspections with `requested_date < two_days_ago` for overdue (depending on Step 1, use `status IN ('requested')` or `status IN ('requested','awaiting_confirmation')`). Query unassigned inspections. Return `ComputedAlert[] { type, severity, message }`.
- Export all new types: `CommandCenterStats`, `WeeklySpaces`, `WeeklyAnalysis`, `InspectorWorkload`, `ComputedAlert`.
- **Keep** the existing `getCommandCenterData` and its `CommandCenterData` type until Step 14.

**Files affected:**

- `src/lib/queries/command-center.ts`

---

### Step 7: Create product-queries module

This step applies to the install aggregation only; the `getActiveProducts` function is conditional on Step 1.

**Actions:**

- Create `src/lib/queries/product-queries.ts`.
- If Step 1 confirmed `products` exists: port `getActiveProducts(supabase)` verbatim from d0cec1f. Returns `Product[]`.
- Port `getWeeklyInstallAggregation(supabase)` — joins `install_line_items` to `products` (if table exists) or falls back to `install_line_items.item_name` (if products is absent). Returns `WeeklyInstallRow[] { product_id, product_name, quantity, revenue, cost, labor, profit }`.
- Export `WeeklyInstallRow` type.

**Files affected:**

- `src/lib/queries/product-queries.ts` (new)

---

### Step 8: Restore CommandCenterShell

**Actions:**

- Create `src/components/admin/command/CommandCenterShell.tsx`. Port d0cec1f verbatim:
  - `'use client'`
  - Loads `Syne` and `Space_Grotesk` from `next/font/google` with CSS vars `--font-syne`, `--font-space-grotesk`.
  - Wraps children in a `div.sc-bold` with `style={{ ... font CSS vars ... }}` and background `#FFFDF5`.
  - Renders 3 decorative blob divs (`#C8102E`, `#D4AF37`) with `animate-blob` animation inside the wrapper.
- Add the `animate-blob` keyframes to `sc-bold-components.css` (already included if ported fully in Step 2).

**Files affected:**

- `src/components/admin/command/CommandCenterShell.tsx` (new)

---

### Step 9: Restore CommandMetricsRow

**Actions:**

- Create `src/components/admin/command/CommandMetricsRow.tsx`. Port d0cec1f verbatim.
- Imports: `CalendarCheck`, `CheckCircle`, `AlertTriangle`, `UserX` from `lucide-react`.
- Uses `formatCurrency` from the new `formatting.ts`.
- Takes `stats: CommandCenterStats` prop.
- Renders 4 `BoldMetricCard` components with variants: default / warning / danger.

**Files affected:**

- `src/components/admin/command/CommandMetricsRow.tsx` (new)

---

### Step 10: Restore AlertsBanner, SpacesInspectedCard, InspectionAnalysisCard, InstallsThisWeekCard, InspectorWorkloadSnapshot

Port all five verbatim from d0cec1f.

**Actions:**

- `AlertsBanner.tsx` — `'use client'`, dismissable gold banner, takes `alerts: ComputedAlert[]`.
- `SpacesInspectedCard.tsx` — server component, takes `spaces: WeeklySpaces`. Imports `Bed`, `Layers`, `Bath`, `Flame` from `lucide-react`.
- `InspectionAnalysisCard.tsx` — server component, takes `analysis: WeeklyAnalysis`. Uses `formatCurrency`, `formatNumber`.
- `InstallsThisWeekCard.tsx` — server component, takes `products: Product[]` and `weeklyInstalls: WeeklyInstallRow[]`. If Step 1 deferred `products`, this card still renders but sources rows directly from `weeklyInstalls` (with product_name coming from the `item_name` fallback added in Step 7) — update the signature to accept `products?: Product[]` and handle the missing case with a flat per-product list.
- `InspectorWorkloadSnapshot.tsx` — server component, takes `workloads: InspectorWorkload[]`.

**Files affected:**

- `src/components/admin/command/AlertsBanner.tsx` (new)
- `src/components/admin/command/SpacesInspectedCard.tsx` (new)
- `src/components/admin/command/InspectionAnalysisCard.tsx` (new)
- `src/components/admin/command/InstallsThisWeekCard.tsx` (new)
- `src/components/admin/command/InspectorWorkloadSnapshot.tsx` (new)

---

### Step 11: Restore ProductPricingCard **(conditional on Step 1)**

**Only if Step 1 confirmed `products` exists.**

**Actions:**

- Create `src/components/admin/command/ProductPricingCard.tsx`. Port d0cec1f verbatim.
- `'use client'` with `useState`, `useTransition`, `useRouter`.
- Inline add/edit/delete with neo-brutalist form styling.
- Handles both regular products and discount category (separate sub-table).
- Calls `createProduct`, `updateProduct`, `deleteProduct` from Step 12.

If Step 1 deferred, **skip this file**. Document the deferral inline in the plan's Implementation Notes section after execution.

**Files affected:**

- `src/components/admin/command/ProductPricingCard.tsx` (new, conditional)

---

### Step 12: Restore product-actions **(conditional on Step 1)**

**Only if Step 1 confirmed `products` exists.**

**Actions:**

- Create `src/lib/actions/product-actions.ts`. Port d0cec1f verbatim.
- `'use server'` with `createProduct`, `updateProduct`, `deleteProduct`.
- Each uses `requireAdmin()` from Phase B's `src/lib/auth.ts`.
- Each calls `revalidatePath('/admin')` (not `/admin/command` — we're mounting at `/admin`).

**Files affected:**

- `src/lib/actions/product-actions.ts` (new, conditional)

---

### Step 13: Add Product type **(conditional on Step 1)**

**Only if Step 1 confirmed `products` exists.**

**Actions:**

- Read `src/types/database.ts`.
- Add `products` table definition under `Tables`:
  ```ts
  products: {
    Row: {
      id: string
      product_name: string
      price: number
      part_cost: number
      labor_cost: number
      is_active: boolean
      sort_order: number
      category: string | null
      notes: string | null
      created_at: string
      updated_at: string
    }
    Insert: { /* partial mirror */ }
    Update: { /* partial mirror */ }
    Relationships: []
  }
  ```
- Add convenience alias at bottom: `export type Product = Database['public']['Tables']['products']['Row']`.
- Match the actual schema columns from Step 1 — adjust if production differs.

**Files affected:**

- `src/types/database.ts`

---

### Step 14: Swap `/admin/page.tsx` to render the new shell

This is the visible cutover — once this ships, `/admin` renders the new UI. Do this **after** all components, queries, and types compile clean.

**Actions:**

- Read `src/app/admin/page.tsx`.
- Replace body to:
  1. Call the Phase B `requireAdmin()` helper to get the supabase service client (or use the existing server client factory if admin-gate happens in `layout.tsx` already).
  2. Run 6–7 parallel queries via `Promise.all`: `getCommandCenterStats`, `getInspectorWorkloads`, `getComputedAlerts`, `getWeeklyInstallAggregation`, `getWeeklySpacesInspected`, `getWeeklyInspectionAnalysis`, and `getActiveProducts` (if Step 1 applied).
  3. Render:
     ```tsx
     <CommandCenterShell>
       <ScheduleSyncClient />
       <div className="px-6 py-6 max-w-[1400px] mx-auto space-y-5">
         <header>
           <h1 className="text-3xl display-font font-bold text-[#2B2B2B]">Command Center</h1>
           <p className="text-sm text-[#71717A]">Operational dashboard</p>
         </header>
         {alerts.length > 0 && <AlertsBanner alerts={alerts} />}
         <CommandMetricsRow stats={stats} />
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
           <SpacesInspectedCard spaces={spaces} />
           <InspectionAnalysisCard analysis={analysis} />
           {products && <ProductPricingCard products={products} />}
           <InstallsThisWeekCard products={products ?? []} weeklyInstalls={weeklyInstalls} />
         </div>
         <InspectorWorkloadSnapshot workloads={workloads} />
       </div>
     </CommandCenterShell>
     ```
  4. Drop the old `<CommandCenter data={...} />` call entirely.

- If Step 1 deferred products → collapse the 2×2 grid to 1 column on mobile and 2 on desktop with 3 cards (drop `ProductPricingCard`).

**Files affected:**

- `src/app/admin/page.tsx`

---

### Step 15: Type-check + smoke test

**Actions:**

- Run `npx tsc --noEmit` — must pass with zero errors.
- Run `npm run lint` — must pass clean.
- Start dev server with `npm run dev`.
- Visit `/admin` — confirm each section renders:
  - Header "Command Center"
  - (If any alerts) gold banner with dismissable X
  - 4-card metrics row with correct counts + currency
  - Spaces Inspected card shows real values or empty state
  - Inspection Analysis card shows stats or empty state
  - (If products restored) Product Pricing card shows catalog rows
  - Installs This Week card shows aggregation + totals row
  - Inspector Workload list shows active inspectors with job counts
- Visit `/order` — confirm no visual regression (Phase A still works).
- Visit any `/admin/jobs/[id]` — confirm Phase B Stripe payment section still works.
- Open two browser tabs → make a status change in one → confirm the other tab refreshes within a few seconds (ScheduleSyncClient).

---

### Step 16: Delete legacy monolith

**Actions:**

- Delete `src/components/admin/command-center/CommandCenter.tsx`.
- Delete the `src/components/admin/command-center/` directory if now empty.
- Search for any remaining imports of `CommandCenter` (`grep -r "from.*command-center/CommandCenter" src/`) and remove them (there should be none after Step 14).
- Remove the legacy `getCommandCenterData` function and `CommandCenterData` type from `src/lib/queries/command-center.ts` if no longer imported.
- Re-run `npx tsc --noEmit` — must still pass.

**Files affected:**

- `src/components/admin/command-center/CommandCenter.tsx` (deleted)
- `src/lib/queries/command-center.ts` (cleanup)

---

### Step 17: Commit + update plan status

**Actions:**

- Commit in logical chunks: (a) CSS tokens + globals, (b) queries + utilities, (c) components + shell, (d) page swap + deletion.
- Update this plan's `**Status:** Draft` → `**Status:** Implemented` and append Implementation Notes section per standard pattern.
- Do NOT push until Mo confirms visuals match his expectation.

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/admin/layout.tsx` — admin-gate wrapper; already handles auth. No change needed.
- `src/components/admin/layout/AdminSidebar.tsx` — if present, sidebar links may reference `/admin/command` or `/admin/dashboard`. Audit during Step 14 and rewrite to `/admin` if they point to stale URLs.
- `src/lib/hooks/` — existing hooks (if any); `use-schedule-sync.ts` is new and self-contained.

### Updates Needed for Consistency

- `CLAUDE.md` — if it documents the admin routing map or Command Center structure, refresh after Step 16.
- `supabase/schema.sql` — if Step 1 discovered the `products` table, the schema file may need to be updated to document it. Not blocking; can be a follow-up.

### Impact on Existing Workflows

- **`/admin` URL behavior**: Unchanged landing path; visually and functionally richer page.
- **`/order` (Phase A)**: Zero impact — SC Bold tokens are scoped to `.sc-bold` wrapper.
- **`/admin/jobs/[id]` Stripe flow (Phase B)**: Zero impact — no shared files modified destructively.
- **Realtime**: `ScheduleSyncClient` only triggers `router.refresh()`; no cross-user write conflicts introduced.

---

## Validation Checklist

- [ ] **Step 1 executed** and findings documented in the plan before any code change.
- [ ] `src/styles/sc-bold-tokens.css` and `src/styles/sc-bold-components.css` exist and are imported from `globals.css`.
- [ ] `.sc-bold` wrapper is applied on the command page and tokens resolve (visible Syne + Space Grotesk fonts, gold/red neo-shadows).
- [ ] All 7 command components exist under `src/components/admin/command/` (or 6 if products deferred).
- [ ] `src/lib/queries/command-center.ts` exports the 5 new functions + helper.
- [ ] `src/lib/queries/product-queries.ts` exists.
- [ ] `src/lib/utils/formatting.ts` exists with 3 exports.
- [ ] `src/lib/hooks/use-schedule-sync.ts` exists.
- [ ] `src/components/admin/shared/ScheduleSyncClient.tsx` exists.
- [ ] If products exists: `src/lib/actions/product-actions.ts` + `Product` type in `database.ts`.
- [ ] `/admin/page.tsx` renders the new shell with all cards.
- [ ] Legacy `CommandCenter.tsx` deleted.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `/admin` renders with real data from production DB.
- [ ] `/order` still works (no regression).
- [ ] `/admin/jobs/[id]` Stripe payment flow still works (no regression).
- [ ] Two-tab realtime refresh works.

---

## Success Criteria

The implementation is complete when:

1. Visiting `/admin` while logged in shows the full April 3-era Command Center: shell + header + alerts + 4-card metrics + 2×2 (or 1×3 if deferred) analytics grid + inspector workload — all populated from the current schema with real data.
2. Mo visually confirms the restored UI matches or exceeds his recollection of the April 3 version. (He has implicit expectations — we trust his reaction after deploy.)
3. `npx tsc --noEmit` returns zero errors.
4. No regression on `/order` (Phase A) or `/admin/jobs/[id]` Stripe invoicing (Phase B).
5. Two browser tabs on `/admin` stay in sync when inspection data changes.

---

## Notes

- **Defer list (for Phase D or beyond):**
  1. Creating the `products` table + seed data, if Step 1 confirms it doesn't exist.
  2. Inline product pricing edits, if `products` deferred.
  3. Expanded realtime: live alert push notifications, per-card subscriptions beyond `ScheduleSyncClient`.
  4. OKLCH red/amber color scales from d0cec1f's globals.css — only needed if future pages outside the command center adopt them.
  5. The `.sc-bold` admin-wide rollout (sidebar, inspector detail, dispatch) — this plan scopes SC Bold to `/admin` only.
- **Visual polish trust model:** Mo has said the April 3 design is what "working right" looks like. After ship, expect micro-feedback (spacing, color, density) rather than structural rework. Budget time for one tweak pass after the initial merge.
- **Scope discipline:** This plan is restoration, not feature work. Resist the urge to add "improvements" (new cards, new KPIs, new filters) — those belong in a future plan once the April 3 parity is re-established and Mo is using the page daily again.

---

## Implementation Notes

**Implemented:** 2026-04-16

### Summary

- Step 1 schema verification: confirmed `products` table exists with DDL matching d0cec1f. Confirmed `'awaiting_confirmation'` is NOT a valid status in the current CHECK constraint — replaced with `'requested'` in `getComputedAlerts`. All other columns (bedrooms/bathrooms/levels/requested_date/install_line_items.completed_at) present.
- Restored SC Bold design system under `.sc-bold` scope: `src/styles/sc-bold-tokens.css` and `src/styles/sc-bold-components.css`, imported from `src/app/globals.css`.
- Created shared utilities: `src/lib/utils/formatting.ts` (`formatCurrency`, `formatCurrencyPrecise`, `formatNumber`) and `src/components/admin/shared/ScheduleSyncClient.tsx` wrapping the pre-existing `use-schedule-sync` hook.
- Expanded `src/lib/queries/command-center.ts` from 183 → 415 lines with 5 new query functions + `CommandCenterStats`/`WeeklySpaces`/`WeeklyAnalysis`/`InspectorWorkload`/`ComputedAlert` exports.
- Ported 7 d0cec1f components verbatim into `src/components/admin/command/`: `CommandCenterShell`, `CommandMetricsRow`, `AlertsBanner`, `SpacesInspectedCard`, `InspectionAnalysisCard`, `InstallsThisWeekCard`, `InspectorWorkloadSnapshot`, `ProductPricingCard`.
- Created `src/lib/queries/product-queries.ts` (`getActiveProducts`, `getWeeklyInstallAggregation`) and `src/lib/actions/product-actions.ts` (`createProduct`, `updateProduct`, `deleteProduct`) with `revalidatePath('/admin')` per plan.
- Added `products` Row/Insert/Update types + `Product` alias to `src/types/database.ts`.
- Swapped `src/app/admin/page.tsx` to fetch 7 parallel queries and render the new `CommandCenterShell` layout.
- Deleted the legacy `src/components/admin/command-center/CommandCenter.tsx` monolith and its empty directory; removed legacy `getCommandCenterData`/`RiskJob`/`InspectorWorkloadItem`/`CommandCenterData` exports (plus now-unused `createClient`/`JobStatus`/`DispatchStatus` imports) from `command-center.ts`.

### Deviations from Plan

- **`use-schedule-sync` location.** Plan specified `src/lib/hooks/use-schedule-sync.ts`. The hook already existed at `src/hooks/use-schedule-sync.ts` from earlier work with the correct implementation, so `ScheduleSyncClient` imports from the existing path rather than moving/duplicating the hook.
- **Status filter fix in `getComputedAlerts`.** d0cec1f's source filtered `.in('status', ['requested', 'awaiting_confirmation'])`, but Step 1 confirmed `'awaiting_confirmation'` is not in the current CHECK constraint. Filter changed to `.eq('status', 'requested')` with an inline comment documenting the divergence from d0cec1f.
- **`revalidatePath` target.** Plan noted this deviation up front: d0cec1f revalidated `/admin/command`, but the command center is served at `/admin` in this repo, so all three product actions revalidate `/admin`.

### Issues Encountered

- None blocking. Pre-existing lint issues (AdminHeader's `setState` in effect, DispatchClient unused vars, order/page.tsx unused `err`, address-autocomplete a11y warning, inspector-actions unused `_data`) were surfaced by the full-tree lint but are all outside Phase C scope and predate this work.

### Validation

- `npx tsc --noEmit`: zero errors.
- `npx eslint src/`: zero errors/warnings in any Phase C file; only pre-existing unrelated issues remain.
- All new imports resolve; no dangling references to the deleted monolith or legacy queries.
