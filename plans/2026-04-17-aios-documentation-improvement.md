# Plan: Align AIOS Documentation with Current System Reality

**Created:** 2026-04-17
**Status:** Implemented
**Request:** Review and improve the 5 AIOS documentation files in `00_overview/` and `01_context/` to reflect the current codebase, establish them as living documents, and orient them toward optimal performance.

---

## Overview

### What This Plan Accomplishes

Rewrites the 5 core AIOS context files so they accurately reflect the Seller's Compliance platform as it exists today — not the aspirational MVP that was planned months ago. Each file will be updated to match the real database schema, actual routes, live integrations (Stripe, Supabase, Resend), and the SC Bold design system. A "living document" protocol will be added to CLAUDE.md so these files are automatically updated whenever structural changes occur.

### Why This Matters

Every Claude Code session loads these files (via `/prime`) to establish context. When the docs describe statuses, features, or architecture that don't match the codebase, Claude makes incorrect assumptions and writes broken code. Aligning these files to reality directly improves code generation accuracy — that's the "optimal performance" the system needs.

---

## Current State

### Relevant Existing Structure

```
aios/00_overview/product.md    — 166 lines, product overview
aios/00_overview/vision.md     — 208 lines, vision & strategy
aios/01_context/business.md    — 80 lines, business context
aios/01_context/terminology.md — 89 lines, domain glossary
aios/01_context/users.md       — 153 lines, user roles
aios/CLAUDE.md                 — 508 lines, master operating instructions
```

### Gaps and Problems Being Addressed

**1. Wrong status values everywhere**
- `terminology.md` says: `new → scheduled → in_progress → completed`
- `product.md` says: `requested → awaiting_confirmation → alternatives_offered → confirmed → completed → on_hold → reschedule → no_show → cancelled`
- **Actual schema**: `JobStatus = 'requested' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'`
- **Actual dispatch**: `DispatchStatus = 'unscheduled' | 'scheduled' | 'dispatched' | 'en_route'`

**2. Missing features and integrations**
- No mention of Stripe payments, checkout flow, or webhooks
- No mention of the public `/order` page (customer self-service)
- No mention of `products` table or `install_line_items`
- No mention of `payments` table
- No mention of employee invite system (Resend emails)
- No mention of SC Bold design system

**3. Outdated architecture references**
- References to `region` field on inspectors (removed from schema)
- References to "Inspector View" as if it exists (not built)
- `business.md` has no markdown headers — just plain text
- `product.md` still says "(MVP)" — the system is past MVP
- `vision.md` has "Open Questions" that have been answered by the built system

**4. Terminology drift**
- Glossary says avoid "order" — but there's literally an `/order` route for customers
- Missing terms: `product`, `line item`, `payment`, `checkout`, `customer order`
- "Overview Page" defined inconsistently (glossary says job detail; elsewhere means dashboard)
- `Dispatch Status: unassigned` should be `unscheduled`

**5. Missing user role**
- No `Customer` role documented — customers can self-serve via `/order`
- No mention of the public-facing site at all

---

## Proposed Changes

### Summary of Changes

- **product.md** — Remove MVP framing. Update feature list to match actual routes and capabilities. Fix status values. Add Stripe/payments, customer ordering, products catalog, SC Bold design system.
- **vision.md** — Convert open questions to resolved decisions (based on what was built). Update strategic priorities to reflect current state (post-MVP, scaling phase). Remove speculative items that were decided.
- **business.md** — Add proper markdown headers. Update pricing to reflect products table (dynamic, not just $125). Add Stripe, Resend, and online ordering as operational capabilities.
- **terminology.md** — Fix Job Status and Dispatch Status to match `src/types/database.ts` enums exactly. Add missing terms (product, line item, payment, checkout, customer order). Remove the "avoid order" guideline. Update "Overview Page" definition.
- **users.md** — Add Customer role (public ordering). Remove references to geographic routing/region. Mark Inspector View as planned/not built. Update system support descriptions to match actual capabilities.
- **CLAUDE.md** — Add a "Living Document Protocol" section defining when and how these files must be updated.

### Files to Modify

| File Path | Changes |
|---|---|
| `aios/00_overview/product.md` | Remove MVP label. Fix statuses. Add payments, ordering, products, design system sections. |
| `aios/00_overview/vision.md` | Resolve open questions. Update priorities to current phase. Remove answered speculation. |
| `aios/01_context/business.md` | Add markdown headers. Update pricing model. Add integrations (Stripe, Resend). |
| `aios/01_context/terminology.md` | Fix status enums. Add 8+ missing terms. Update definitions. Remove stale guidelines. |
| `aios/01_context/users.md` | Add Customer role. Remove region refs. Mark Inspector View as not-yet-built. |
| `aios/CLAUDE.md` | Add Living Document Protocol section. |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Source from code, not memory**: Every status value, table name, and feature claim will be verified against the actual codebase before writing. No guessing.
2. **Living document protocol in CLAUDE.md, not in each file**: A single protocol section in CLAUDE.md is easier to maintain and enforce than per-file instructions.
3. **Keep strategic/aspirational content in vision.md**: Facts that are about the future (expansion plans, AI automation goals) stay in `vision.md`. Facts about what exists today go in `product.md` and `business.md`.
4. **Terminology as single source of truth for naming**: The glossary should be authoritative — if a term is in the glossary, that's what Claude uses. If it's not, Claude should flag it.

### Alternatives Considered

- **Auto-generate docs from schema**: Rejected. These are strategic/context documents, not technical docs. They explain *why* and *how*, not just *what tables exist*.
- **Merge all 5 files into one**: Rejected. The separation by concern (product, vision, business, terms, users) is useful and matches the AIOS folder structure.

### Open Questions

None — all changes are based on observable codebase state.

---

## Step-by-Step Tasks

### Step 0: Scan and Fix Stale References Across All AIOS Files

The grep for stale terms (`pending`, `unassigned`, `region`, `MVP`) found hits in **11 files beyond the 5 core files**. These must be fixed in the same pass to avoid contradictions within the workspace.

**Stale files found:**

| File | Stale Terms | Fix |
|---|---|---|
| `aios/05_active/known-issues.md` | `pending` (line 49) | Change to `requested` |
| `aios/03_workflows/core-flows.md` | `pending` throughout (lines 14, 46, 50, 57, 104) | Replace `pending` with `requested`. Update full status lifecycle diagram. |
| `aios/03_workflows/edge-cases.md` | `pending` (lines 23, 40, 47, 53), `single-region` (line 82) | Replace `pending` with `requested`. Update region references. |
| `aios/02_architecture/system-design.md` | `pending` (line 82) | Replace status lifecycle to match actual enum |
| `aios/02_architecture/data-model.md` | `MVP` (line 180), `unassigned` (line 222), `multi-region` (line 252) | Update status values, remove MVP label, note region removal |
| `aios/02_architecture/integrations.md` | `post-MVP` (lines 55, 60) | Update priority labels (Stripe is now live, not "post-MVP") |
| `aios/02_architecture/folder-structure.md` | `migration pending` (line 127) | Check if migration happened, update note |
| `aios/04_rules/ui-ux-rules.md` | `region` (line 50), `MVP` (line 68), `DisptchMama` (line 68) | Remove region grouping ref, update to "Seller's Compliance", remove MVP |
| `aios/README.md` | `regions` (line 98) | Update glossary description |

**Note:** `aios/06_history/` files (decisions.md, migrations.md, README.md) reference `region` and old patterns, but these are **historical records** and should NOT be edited. History preserves what was true at the time.

**Actions:**
- For each file above, read it, apply targeted find-and-replace for stale terms
- Do not rewrite entire files — just fix the specific stale references
- Skip `06_history/` — those are intentionally frozen

**Files affected:**
- `aios/05_active/known-issues.md`
- `aios/03_workflows/core-flows.md`
- `aios/03_workflows/edge-cases.md`
- `aios/02_architecture/system-design.md`
- `aios/02_architecture/data-model.md`
- `aios/02_architecture/integrations.md`
- `aios/02_architecture/folder-structure.md`
- `aios/04_rules/ui-ux-rules.md`
- `aios/README.md`

---

### Step 1: Update `terminology.md` — Fix Status Enums and Add Missing Terms

This is the highest-impact change because every other file references these terms.

**Actions:**

- Replace Job Status row: change `new → scheduled → in_progress → completed` to `requested → confirmed → in_progress → completed → cancelled → on_hold`
- Replace Dispatch Status row: change `unassigned → scheduled → dispatched → en_route` to `unscheduled → scheduled → dispatched → en_route`
- Add new terms to "Job & Scheduling" section:
  - **Service Type** — The category of work: `Inspection`, `Work Completion`, `Installation`, etc. Stored as `service_type` on inspections.
- Add new "Products & Payments" section with terms:
  - **Product** — A catalog item representing a service or part (e.g., smoke detector, water heater strap). Stored in the `products` table with pricing breakdown (price, part_cost, labor_cost).
  - **Line Item** — A specific product applied to an inspection with quantity and pricing. Stored in `install_line_items`.
  - **Payment** — A recorded payment against an inspection. Tracks amount, method, and timestamp.
  - **Checkout** — The Stripe-powered payment flow where customers pay for services online.
  - **Customer Order** — A self-service inspection request placed by a customer through the `/order` page.
- Update "Internal Language Guidelines":
  - Remove "avoid order" — the system has an `/order` route
  - Add: Use "Customer Order" for public-facing self-service requests, "Job" for internal scheduling units
- Update "Overview Page" definition to: "The job detail page (`/admin/jobs/[id]`) showing property details, inspection results, line items, payments, and notes."

**Files affected:**
- `aios/01_context/terminology.md`

---

### Step 2: Update `product.md` — Remove MVP Framing, Fix Features, Add Missing Capabilities

**Actions:**

- Change "Key Features (MVP)" heading to "Key Features"
- Fix status tracking line to: `requested → confirmed → in_progress → completed → cancelled → on_hold`
- Add new section: **Customer Ordering**
  - Public-facing order form at `/order`
  - Customers can request inspections directly
  - Order confirmation flow at `/order/confirmation`
- Add new section: **Payments & Invoicing**
  - Stripe-powered checkout for online payments
  - Product catalog with part cost / labor cost breakdown
  - Line item tracking per inspection
  - Payment recording and status tracking
- Add new section: **Employee Management**
  - Invite employees via email (Resend integration)
  - Role-based access (admin, inspector, coordinator)
- Update "Design Language" section:
  - Remove neo-brutalism note
  - Add: SC Bold design system — Inter font, true black sidebar, gold/red accent colors, consistent 24px bold page titles, pill-shaped user badge
- Remove "(MVP)" from section title and any "MVP" language throughout

**Files affected:**
- `aios/00_overview/product.md`

---

### Step 3: Update `vision.md` — Resolve Open Questions, Update Phase

**Actions:**

- Update "Current Focus Period" from "Q2 2026 — MVP" to "Q2 2026 — Post-MVP Hardening & Scaling"
  - The core platform is built. Focus is now on reliability, real data, and operational polish.
- In "Key Decisions & Open Questions" section, convert to "Key Decisions (Resolved)":
  1. **Manual vs. System-Driven Control** → Resolved: Hybrid approach. Drag-and-drop scheduling with system-assisted suggestions (scheduling suggestions engine built in `src/services/scheduling-suggestions.ts`). Dispatcher retains full control.
  2. **Level of AI Involvement** → Resolved: Assistant mode. System provides scheduling suggestions, conflict detection, and duration estimation. Dispatcher makes final decisions.
  3. **Dispatch Interface Design** → Resolved: Timeline-based with unscheduled queue. Horizontal timeline by inspector with drag-and-drop, plus collapsible unscheduled jobs queue.
  4. **Handling Scheduling Volatility** → Resolved: Supabase realtime subscriptions propagate changes instantly. Drag-and-drop with immediate database updates.
  5. **Integration Across the System** → Resolved: Shared Supabase tables. All views query the same `inspections`, `profiles`, `properties`, `customers` tables. Realtime sync keeps views consistent.
- Add new strategic priority: **Revenue Integration** — Stripe checkout is live, product catalog exists, payment tracking built. Next: close the loop on escrow payments and reporting.
- Add new strategic priority: **Public Site & Customer Self-Service** — `/order` flow is live. Next: order status tracking, customer portal.
- Replace the old "Long-Term Vision" bullet list with a **"Next Horizons"** section containing 4 concrete near-term priorities:
  1. **Inspector View** — Mobile-friendly interface for inspectors to see daily assignments, input results, upload photos, and update job status from the field. This is the largest missing piece for field operations.
  2. **Escrow & Payment Reconciliation** — Close the loop on escrow payments (wire, check, courier) alongside Stripe online payments. Full revenue visibility per inspection.
  3. **Customer Portal** — Post-order status tracking for customers. View inspection results, pay online, request follow-up work.
  4. **Reporting & Analytics** — Weekly/monthly operational reports: job throughput, revenue by period, inspector utilization, average completion time.
- Keep a shorter "Long-Term Vision" paragraph below Next Horizons for the bigger-picture items (multi-region expansion, franchise model, AI automation deepening).

**Files affected:**
- `aios/00_overview/vision.md`

---

### Step 4: Update `business.md` — Add Markdown Headers, Update Pricing, Add Integrations

**Actions:**

- Add proper markdown headers (`#`, `##`, `###`) throughout the file — currently missing all headers
- Update pricing section: change from fixed "$125" to "Standard inspection pricing starts at $125. Additional services are priced per product catalog (stored in `products` table with part_cost + labor_cost breakdown)."
- Add new section: **Technology & Integrations**
  - **Supabase** — Database, auth, realtime subscriptions, row-level security
  - **Stripe** — Online checkout, payment processing, webhooks
  - **Resend** — Transactional email (employee invites, notifications)
  - **Vercel** — Hosting, deployment, serverless functions
  - **Next.js 16** — App Router, server components, server actions
- Add new section: **Customer Channels**
  - Phone/email coordination (traditional)
  - Online self-service ordering via `/order` page
  - Agent/escrow referral pipeline

**Files affected:**
- `aios/01_context/business.md`

---

### Step 5: Update `users.md` — Add Customer Role, Fix Inaccuracies

**Actions:**

- Add new section after "Field Users": **Public Users / Customers**
  - **Customer** — Property owners, real estate agents, or escrow officers who request inspections. Can self-serve via the `/order` page or be created by a coordinator.
  - Key interactions: place orders, receive confirmation, make payments via Stripe, receive inspection results.
- Remove "Geographic routing" from coordinator responsibilities (region field was removed from schema)
- In "For Inspectors" section, change "Provide a simple, mobile-friendly list" to "Planned: mobile-friendly inspector view for assigned jobs" (Inspector View is not yet built)
- Update "System Owner" section: change "modern development tools" to "Claude Code and the AIOS workspace"

**Files affected:**
- `aios/01_context/users.md`

---

### Step 6: Add Living Document Protocol to `CLAUDE.md`

**Actions:**

- Add a new section after "Critical Instruction: Maintain This File" titled "Living Document Protocol"
- Content:

```markdown
## Living Document Protocol

The following AIOS context files must be kept in sync with the codebase:

| File | Trigger for Update |
|---|---|
| `aios/01_context/terminology.md` | Any new enum, status value, domain concept, or naming change |
| `aios/00_overview/product.md` | New feature, removed feature, or changed capability |
| `aios/00_overview/vision.md` | Strategic priority completed, new priority added, or phase transition |
| `aios/01_context/business.md` | New integration, pricing change, or operational model change |
| `aios/01_context/users.md` | New user role, changed permissions, or new user-facing capability |

### When to Update

After completing any implementation that:
- Adds or removes a database table or column
- Changes status enums or workflow states
- Adds a new user-facing route or feature
- Integrates a new external service
- Changes pricing or business logic

### How to Update

1. Read the affected file(s)
2. Update only the sections that changed
3. Verify terminology consistency across all 5 files
4. Do not add speculative/planned features — document what exists now
```

**Files affected:**
- `aios/CLAUDE.md`

---

## Connections & Dependencies

### Files That Reference This Area

- `aios/CLAUDE.md` — References these files in the `/prime` initialization sequence
- `.claude/commands/prime.md` — Loads these files at session start
- All AIOS folders (`02_architecture/` through `07_commands/`) may reference terms defined here

### Updates Needed for Consistency

- After updating `terminology.md`, grep for any stale status names in other AIOS files (e.g., `02_architecture/`, `03_workflows/`)
- Ensure `CLAUDE.md` references to folder purposes still match after updates

### Impact on Existing Workflows

- `/prime` sessions will load more accurate context → better code generation
- The Living Document Protocol adds a small maintenance step after structural changes, but prevents context drift

---

## Validation Checklist

- [ ] Every status value in `terminology.md` matches `src/types/database.ts` enums exactly
- [ ] Every feature listed in `product.md` corresponds to an actual route or component in the codebase
- [ ] No references to `region` field remain in any of the 5 files
- [ ] `business.md` has proper markdown headers and renders correctly
- [ ] `users.md` includes Customer role
- [ ] `vision.md` open questions are converted to resolved decisions
- [ ] `CLAUDE.md` includes the Living Document Protocol section
- [ ] No "MVP" framing remains in `product.md`
- [ ] All 5 core files are internally consistent (same terms, same statuses, no contradictions)
- [ ] Grep for `pending` in AIOS files (excluding `06_history/`) returns zero matches
- [ ] Grep for `unassigned` in AIOS files (excluding `06_history/`) returns zero matches
- [ ] Grep for `DisptchMama` in AIOS files (excluding `06_history/`) returns zero matches
- [ ] `vision.md` has a "Next Horizons" section with 4 concrete near-term priorities
- [ ] `06_history/` files are untouched (historical records preserved)

---

## Success Criteria

The implementation is complete when:

1. All 5 AIOS files accurately describe the system as it exists in the codebase today — no stale statuses, no phantom features, no missing integrations.
2. `CLAUDE.md` includes a Living Document Protocol that defines when and how to update these files.
3. A `/prime` session loading these files would give Claude an accurate mental model of the system without any corrections needed.

---

## Notes

- These files are strategic/context documents, not technical docs. They should describe *what the system does and why* — not implementation details like table schemas or API signatures. Technical docs belong in `02_architecture/`.
- The Living Document Protocol is intentionally lightweight. It's a checklist, not a process. The goal is to make updates a natural part of implementation, not a separate task.
- Future consideration: a `/refresh-docs` command that scans the codebase and flags which AIOS files are likely stale. Not in scope for this plan.

---

## Implementation Notes

**Implemented:** 2026-04-17

### Summary

All 5 core AIOS documentation files updated to match current codebase reality. Living Document Protocol added to CLAUDE.md. Additionally, 13 files beyond the original 5 were fixed for stale references (DisptchMama, pending, unassigned, region, MVP, neo-brutalist).

### Deviations from Plan

- **Expanded scope**: The DisptchMama→Seller's Compliance rename was found in 4 additional files beyond Step 0's original list (`current-focus.md`, `in-progress.md`, `COMMANDS.md`, `data-rules.md`). Fixed in the same pass.
- **ui-ux-rules.md received a larger update than planned**: The entire design language section was rewritten to reflect SC Bold (replacing neo-brutalist), not just targeted term fixes. This was necessary because the color palette, typography, and visual characteristics had all changed.

### Issues Encountered

- The `aios/CLAUDE.md` file uses escaped markdown (e.g., `\*\*`, `\#`). Initial edit attempt failed due to unescaped search string. Resolved by matching the exact escaped format.
