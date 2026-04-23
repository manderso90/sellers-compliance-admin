# Plan: Customers List + Inline Edit (Step 2)

**Date**: 2026-04-22
**Status**: Draft — awaiting approval
**Depends on**: `plans/2026-04-22-richer-new-job-form.md` (done, 6fec874)

## Context

The monolith admin had `/admin/customers` with a searchable, tab-filtered table showing inspection counts per customer, plus inline edit and delete dialogs. The split on 2026-04-19 dropped this surface. Now that the new-job form writes rich customer data (`full_name`, `email`, `phone`, `company_name`, `customer_type`), a list surface turns that data into something operators can read, edit, and dedup.

Same approach as Step 1: build fresh against the current schema / four-layer architecture / SC Bold design, with the preview repo's `CustomerTable.tsx` (263 lines) as a spec.

## Goal

Ship `/admin/customers` with:
- Server-rendered list of customers (with inspection counts)
- Client-side search (name / email / company)
- Tab filter (All / Agents / Sellers by default)
- Edit dialog (updates `full_name`, `email`, `phone`, `company_name`, `customer_type`)
- Delete dialog (blocked if customer has inspections — FK is `ON DELETE RESTRICT`)
- Sidebar link under the Records section

## Non-goals

- `/admin/customers/[id]` detail page. The preview didn't have one; an inline edit dialog covers the common case. Follow-up plan if needed.
- "Add customer" button on this page. Customers are created through the new-job intake flow today, and there's no clear use case for a customer with zero inspections. Can be added later.
- CustomerAutocomplete on the new-job form. Deferred (listed as follow-up in Step 1 plan).
- `/api/customers/search` endpoint. Only needed for CustomerAutocomplete; park with it.
- Soft-delete. Schema change avoided in v1; block hard-delete when inspections exist.

## Decisions to confirm before coding

### A. Tab filters
Preview used 3 tabs: **All / Agents / Sellers**. The schema supports 6 `customer_type` values (agent, broker, transaction_coordinator, seller, escrow, other). Proposal: match preview (3 tabs) and let search handle the long tail. Confirm or extend to all 6?

### B. Delete behavior
Customer → Inspection FK is `ON DELETE RESTRICT`. Three choices:
- **B1 (recommended)**: block the delete in-action with a clear "X inspections reference this customer" message. Operator must delete/reassign inspections first.
- B2: soft-delete (requires adding `deleted_at timestamptz` column — schema migration).
- B3: cascade delete inspections. Too dangerous.

### C. Sidebar placement
Records group currently has: Jobs, Inspectors. Proposal: **Jobs → Customers → Inspectors**. Customers is conceptually upstream of scheduling, so it reads well after Jobs and before Inspectors. Confirm or reorder?

### D. Row density / capabilities
Preview uses a dense card layout with mailto:/tel: links and a neo-shadow table. Proposal: match preview's look, adapted to current primitives (Input, Label, Button, Dialog). No dropdown actions — just inline Edit / Delete icon buttons, same as the preview.

## Architecture (four-layer mapping)

| Layer | File | Purpose |
|---|---|---|
| Page | `src/app/admin/customers/page.tsx` | Server component; fetches list; renders `<CustomerTable>` |
| Query | `src/lib/queries/customers.ts` | `getCustomersWithInspectionCount()` — single function, returns `CustomerWithCount[]` |
| Action | `src/lib/actions/customer-actions.ts` | `updateCustomer(id, patch)`, `deleteCustomer(id)` — both `'use server'`, both use `surfacePgError` |
| Component | `src/components/admin/customers/CustomerTable.tsx` | Client table with tabs/search/edit/delete |
| Component | `src/components/admin/customers/CustomerFormDialog.tsx` | Client dialog for edit (add mode dropped per non-goals) |
| Component | `src/components/admin/customers/DeleteCustomerDialog.tsx` | Client dialog — confirm delete, show blocker when `inspection_count > 0` |
| Nav | `src/components/admin/layout/AdminSidebar.tsx` | Add `{ label: 'Customers', href: '/admin/customers', icon: IconUsers }` |

## Schema read

Current `customers` columns (from refreshed `schema.sql`):
```
id uuid PK
full_name text NOT NULL
email text NOT NULL UNIQUE
phone text
company_name text
customer_type text CHECK (agent, broker, transaction_coordinator, seller, escrow, other)
notes text
created_at timestamptz
updated_at timestamptz
```

Editable in v1: full_name, email, phone, company_name, customer_type.
Read-only: created_at, updated_at, inspection_count (derived).

Email uniqueness is enforced — an edit that changes email to a value that collides will surface a Postgres 23505 error via `surfacePgError`. Good enough for v1; no pre-check needed.

## Step order

Each step `tsc --noEmit` clean on its own.

### Step 1 — Query
`src/lib/queries/customers.ts`: `getCustomersWithInspectionCount(limit?: number)`. Runs the two-query join the preview did (select customers, select inspections.customer_id, aggregate in JS). Returns `Array<Customer & { inspection_count: number }>`.

### Step 2 — Actions
`src/lib/actions/customer-actions.ts`:
- `updateCustomer(id: string, patch: { full_name?, email?, phone?, company_name?, customer_type? })` — auth guard, empty-patch skip, normalize, `.update().eq('id', id)`, `surfacePgError`, `revalidatePath('/admin/customers')`.
- `deleteCustomer(id: string)` — auth guard, pre-check inspection count; if > 0 throw `'Cannot delete: N inspection(s) reference this customer'`; else delete; `revalidatePath`.

### Step 3 — Dialogs
- `CustomerFormDialog.tsx` — `'use client'`. Props: `{ customer, open, onOpenChange }`. Uses existing `Dialog`, `Input`, `Label`. Radio-pill row for `customer_type` matching the new-job form pattern. Submit → `updateCustomer`, close on success, show error banner on failure.
- `DeleteCustomerDialog.tsx` — `'use client'`. Props: `{ customer, inspectionCount, open, onOpenChange }`. If `inspectionCount > 0`, render a disabled state with the count and a "Delete inspections first" message. Else render a confirm button that calls `deleteCustomer`.

### Step 4 — Table
`CustomerTable.tsx` — `'use client'`. Tabs, search input, table of customers with columns: Name/Company, Contact (email + phone), Role pill, Inspections count, Created, Actions (Edit/Delete icon buttons). Memoize the filtered list.

### Step 5 — Page + sidebar
- `src/app/admin/customers/page.tsx` — server component, calls the query, renders header + `<CustomerTable>`.
- Add sidebar entry between Jobs and Inspectors. New `IconUsers` inline SVG matching the existing icon style.

### Step 6 — Verify
- `tsc --noEmit` clean, `npm run lint` no new issues
- Browser: list loads, tabs filter, search works, edit persists, delete-with-inspections is blocked, delete-without-inspections succeeds
- Update `aios/05_active/in-progress.md` with the completion entry
- Sidebar link clickable, active state correct when on the page

### Step 7 — Commit
Single commit: `feat(customers): restore customer list with inline edit/delete`.

## Risks

| Risk | Mitigation |
|---|---|
| Email uniqueness collision on edit | `surfacePgError` already in codebase; error banner shows "Database error (23505) during updateCustomer.updateCustomer" — acceptable for v1, improves in a later pass if noisy. |
| Inspection count query scales poorly at 10k+ customers | Not a near-term concern; 500-row cap (matching preview) is the guardrail. Can move to a DB view later if needed. |
| Sidebar re-ordering breaks muscle memory | Low — there are only 5 items and we're inserting, not rearranging existing ones. |
| Tabs hardcode 3 of 6 `customer_type` values | Broker/escrow/transaction_coordinator accessible via search in the All tab. Clear UX trade. |

## Validation checklist

- [ ] `/admin/customers` renders a list with inspection counts
- [ ] Tabs: All / Agents / Sellers filter correctly
- [ ] Search filters by name, email, company (case-insensitive)
- [ ] Edit dialog opens populated, submit updates the row, realtime not needed (the page revalidates)
- [ ] Delete dialog blocks when inspections exist, succeeds when they don't
- [ ] Sidebar link shows active on `/admin/customers`
- [ ] `tsc --noEmit` clean, `npm run lint` no new issues
