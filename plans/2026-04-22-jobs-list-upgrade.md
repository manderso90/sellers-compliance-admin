# Plan: Upgrade /admin/jobs with Tabs, Summary Cards, Search & Pagination (Step 3)

**Date**: 2026-04-22
**Status**: Implemented
**Depends on**: Step 1 (richer new-job form, `6fec874`) and Step 2 (customers list, `9e7ec63`)

## Context

The preview monolith had two rich browsing surfaces for inspection rows: `/admin/dashboard` (summary cards + filter bar + paginated card grid) and `/admin/inspections` (status-tab paginated list). The post-split admin only kept a minimal `/admin/jobs` — a flat table with no filters, pagination, or search.

Rather than reintroduce two separate surfaces, this plan **collapses that functionality into a single upgraded `/admin/jobs`** — the canonical place to browse the Job unit per `aios/01_context/terminology.md`. `/admin` (Command Center) remains the analytics/ops surface; `/admin/jobs` becomes the browsable list.

## Decisions (confirmed)

1. **Direction**: upgrade `/admin/jobs` (no new `/admin/dashboard` route).
2. **Status tabs**: 6-state model — `requested` → `confirmed` → `in_progress` → `completed` | `cancelled` | `on_hold`. The live DB CHECK allows 11 values (F4); this UI deliberately shows 6 for clarity. Any row with a status outside the 6 (e.g. `awaiting_confirmation`) still renders in "All" but no dedicated tab surfaces it. F4's own plan resolves the drift.
3. **Summary cards**: 4 cards — Today / This Week / Unscheduled / Needs Review.

## Goal

`/admin/jobs` renders:
- Page header + "+ New Job" CTA (kept from current page)
- **Summary cards row** (4 cards, each clickable → filters the list below)
- **Filter tabs** (All + 6 statuses, URL-driven)
- **Search input** (customer name, street address)
- **Paginated table** (30 rows per page, URL-driven `?page=N`)
- **Pagination control** (prev / next / page count)

## Non-goals (v1)

- Multi-filter combinations beyond (tab + search + page). No date-range filter bar, no inspector filter, no payment-status filter. Add as follow-up if operators ask.
- Inline edit in the table rows. Editing still happens on `/admin/jobs/[id]`.
- Bulk actions.
- Card-grid layout option. Table only in v1.
- Touching the current `/admin` Command Center surface.
- Resolving F4 status drift (its own plan).

## Summary card definitions

Each card shows `{count, label, href}`. Clicking the card navigates to `/admin/jobs` with query params that reproduce that slice.

| Card | Definition (SQL semantics) | Click href |
|---|---|---|
| **Today** | `scheduled_date = CURRENT_DATE` (regardless of status) | `/admin/jobs?scope=today` |
| **This Week** | `scheduled_date BETWEEN Monday-of-current-week AND Sunday-of-current-week` | `/admin/jobs?scope=week` |
| **Unscheduled** | `dispatch_status = 'unscheduled'` (no date, no inspector) | `/admin/jobs?scope=unscheduled` |
| **Needs Review** | `status = 'on_hold'` | `/admin/jobs?status=on_hold` |

Implementation note: `scope` is a pseudo-filter that expands to a `scheduled_date` range; `status` is the literal column value. Both coexist with the tab filter (tabs write `status`; clicking a scope card clears `status` and writes `scope`).

Week is **ISO (Monday–Sunday)** to match how operators typically think about work weeks.

## Status tab definitions

7 tabs total:

| Tab | `status` filter | Notes |
|---|---|---|
| All | (no filter) | Default |
| Requested | `status=requested` | |
| Confirmed | `status=confirmed` | |
| In Progress | `status=in_progress` | |
| Completed | `status=completed` | Typically terminal — may want to hide older completions later |
| Cancelled | `status=cancelled` | Terminal |
| On Hold | `status=on_hold` | Matches "Needs Review" summary card |

## Search semantics

Case-insensitive substring match across:
- `customers.full_name`
- `properties.street_address`

Implementation: Supabase `.or('customers.full_name.ilike.%q%,properties.street_address.ilike.%q%')` on the joined query. Debounce on client, submit URL param `?search=...`.

Proposal: debounce 300ms client-side; push to URL via `router.replace()` so bookmarks and browser back work.

## Architecture mapping (four-layer)

| Layer | File | Purpose |
|---|---|---|
| Query | `src/lib/queries/jobs.ts` | Extend: `getJobsList({status?, scope?, search?, page?, pageSize?})` returns `{ jobs, total }`. Preserve existing no-arg behavior for any other caller. |
| Query | `src/lib/queries/jobs.ts` | New: `getJobsSummaryCounts()` — single call, returns `{today, week, unscheduled, needsReview}`. Can run in parallel with the list query. |
| Page | `src/app/admin/jobs/page.tsx` | Server component; accepts `searchParams`; runs the two queries in parallel; renders header, `<JobsSummaryCards>`, `<JobsFilters>`, `<JobsTable>`, `<JobsPagination>`. |
| Component | `src/components/admin/jobs/JobsSummaryCards.tsx` | Client (for highlight-on-click) or server (if we avoid interactivity). Proposal: server component rendering 4 `<Link>` cards — keeps JS bundle small. |
| Component | `src/components/admin/jobs/JobsFilters.tsx` | Client. Tabs (rendered as `<Link>` with URL mutation) + search input (debounced). |
| Component | `src/components/admin/jobs/JobsTable.tsx` | Touch only if the existing columns need adjustment. Proposal: keep current table; add `empty-state` message when filtered query returns zero rows. |
| Component | `src/components/admin/jobs/JobsPagination.tsx` | Server component rendering prev/next `<Link>` with page numbers. |

## File changes summary

### Modified
- `src/lib/queries/jobs.ts` — extended `getJobsList` signature, new `getJobsSummaryCounts`
- `src/app/admin/jobs/page.tsx` — rewritten to accept searchParams and render the new components
- `src/components/admin/jobs/JobsTable.tsx` — minor empty-state fix only (if needed)

### New
- `src/components/admin/jobs/JobsSummaryCards.tsx`
- `src/components/admin/jobs/JobsFilters.tsx`
- `src/components/admin/jobs/JobsPagination.tsx`

### Unchanged
- `src/components/admin/jobs/NewJobForm.tsx` — Step 1 work, done
- `src/lib/actions/job-actions.ts` — no new actions needed
- Sidebar — "Jobs" link already exists

## Data layer specifics

### `getJobsList` signature change

```ts
export async function getJobsList(opts: {
  status?: string         // one of VALID_STATUSES or undefined
  scope?: 'today' | 'week' | 'unscheduled'
  search?: string
  page?: number           // 1-indexed, default 1
  pageSize?: number       // default 30
} = {}): Promise<{ jobs: JobWithJoins[]; total: number }>
```

Callers: there's exactly one existing caller (`page.tsx`), which is being rewritten in the same step. Low risk.

### `getJobsSummaryCounts` signature

```ts
export async function getJobsSummaryCounts(): Promise<{
  today: number
  week: number
  unscheduled: number
  needsReview: number
}>
```

Implementation: four `.select('id', { count: 'exact', head: true })` calls in parallel. Cheap at any reasonable volume.

### Pagination math

- `pageSize = 30`, `page = 1`-indexed
- `range(from, to)` → `range((page-1) * 30, page * 30 - 1)`
- `total` from Supabase's `{ count: 'exact' }` option
- `totalPages = Math.ceil(total / pageSize)`

### Date semantics (ISO week)

Postgres-side, using `date_trunc`:
- **Today**: `scheduled_date = CURRENT_DATE`
- **Week**: `scheduled_date >= date_trunc('week', CURRENT_DATE) AND scheduled_date < date_trunc('week', CURRENT_DATE) + interval '7 days'`
  - `date_trunc('week', ...)` in Postgres uses ISO week (Monday start), matching our spec.

Alternative: compute boundaries in JS and pass as strings. Postgres filters are simpler and tz-correct on the server. Proposal: do it in SQL via `.gte/.lt` with ISO-formatted date strings computed from the current date on the server.

## Step order

Each step `tsc --noEmit` clean and the page still functionally works after each step (even if a feature isn't yet wired).

### Step 1 — Query layer
Extend `getJobsList` to accept the options object. Write `getJobsSummaryCounts`. Unit-quality check: given no options, behavior matches the pre-change signature for any future caller that might forget the new argument (i.e. returns all jobs). No existing callers broken.

### Step 2 — Summary cards component
`JobsSummaryCards.tsx` — server component, 4 `<Link>` cards. SC Bold styling (border-2 border-black, warm-white bg for inactive, yellow-highlight for the active scope/status).

### Step 3 — Filter tabs + search component
`JobsFilters.tsx` — client component. Tabs render as `<Link>` with `?status=...` URL params (preserving search + scope). Search uses `useRouter().replace()` with debounced input (300ms). Include a "Clear filters" text link when any filter is active.

### Step 4 — Pagination component
`JobsPagination.tsx` — server component, prev/next links, current-page indicator. Disabled links when at boundaries.

### Step 5 — Page rewrite
`src/app/admin/jobs/page.tsx` — accept `searchParams`, parse into a validated `JobsQuery` type, run `getJobsList` + `getJobsSummaryCounts` in parallel, render all the new components around the existing `<JobsTable>`.

### Step 6 — Verify
- `tsc --noEmit` clean, lint no new issues
- Browser: tabs filter, search filters, pagination works, summary cards navigate correctly with active-state highlight
- Verify URL is bookmarkable (copy, paste in new tab, same filtered state)
- Confirm empty-state message when filters return no rows
- Check mobile breakpoint (tabs wrap, cards stack, table horizontally scrolls)
- Update `aios/05_active/in-progress.md`

### Step 7 — Commit
Single commit: `feat(jobs): upgrade list with tabs, summary cards, search, pagination`.

## Risks

| Risk | Mitigation |
|---|---|
| F4 drift: a row with `status='awaiting_confirmation'` shows up in "All" but not in any tab | Documented non-goal. F4 has its own plan. |
| Search on joined columns (`customers.full_name`) needs the right Supabase filter syntax | Test during Step 1 with a known customer name; fall back to client-side filter of the current page if server-side proves awkward. |
| Summary count queries drift from list filters (e.g. "Today" card count doesn't match the filtered result row count) | Share the same SQL predicates between the count query and the list query — extract as TypeScript helpers that build filter clauses. |
| URL param sprawl | Keep the vocabulary small: `status`, `scope`, `search`, `page`. Document in a JSDoc block on the page component. |
| ISO week confusion for users who think of Sun–Sat weeks | Pick Mon–Sun per ISO. If operators push back, flip the boundary — one-line change. |

## Validation checklist

- [ ] Default page load: 30 most recent jobs, no filters
- [ ] Summary cards show correct counts (spot-check against raw Supabase)
- [ ] Clicking "Today" card → URL updates to `?scope=today`, table filters, Today card visually highlighted
- [ ] Each status tab filters correctly; count in the tab label (if we add one) matches
- [ ] Search (case-insensitive) filters by customer name and street address
- [ ] Combining search + tab + page works; removing one doesn't blow up the others
- [ ] Pagination: prev disabled on page 1, next disabled on last page
- [ ] Empty state: "No jobs match these filters." when a filter combo returns 0 rows
- [ ] "+ New Job" button still present and works
- [ ] `tsc --noEmit` clean
- [ ] `npm run lint` no new issues

## Follow-up plans (not in this one)

1. **Inspector filter + date-range filter + payment-status filter** on the jobs list (preview's `DashboardFilters` component).
2. **Card-grid toggle** as an alternative to the table for operators who prefer that density.
3. **F4 resolution**: decide whether to narrow the DB CHECK to 6 states or widen the UI to 11 (its own plan).
4. **Job detail page polish** (not re-scoped here; `/admin/jobs/[id]` exists and works).

---

## Implementation Notes

**Implemented:** 2026-04-26

### Summary

`/admin/jobs` now renders summary cards (Today / This Week / Unscheduled / Needs Review), 7 status tabs, a debounced search input, and 30-row pagination. All filters are URL-driven so views are bookmarkable and back-button-friendly. The Command Center route (`/admin`) was untouched per scope.

- Query layer: `getJobsList({status, scope, search, page, pageSize}) → {jobs, total}` with Supabase `range()` + `count: 'exact'` for server-side pagination. Cross-foreign-table search resolved via two pre-fetched ID lists fed to `.or('customer_id.in.(...),property_id.in.(...)')` — PostgREST can't OR-ilike across foreign tables in one call.
- New `getJobsSummaryCounts()` issues 4 parallel `count: 'exact', head: true` queries.
- ISO week boundaries computed in TS via date-fns `startOfWeek/endOfWeek` with `weekStartsOn: 1`, mirroring the existing pattern in `command-center.ts` and `product-queries.ts`.
- New components: `JobsSummaryCards.tsx` (server), `JobsFilters.tsx` (client, debounced 300ms), `JobsPagination.tsx` (server). `JobsTable.tsx` was deliberately left untouched — empty state lives at the page level so it can vary by filter context.
- Page validates `status`/`scope` against allow-lists; unknown values fall back to "no filter" rather than 404'ing — matches the F4 documented non-goal (rows with statuses outside the 6-state model still render in "All").

### Deviations from Plan

- **Search implementation**: plan suggested `.or('customers.full_name.ilike.%q%,properties.street_address.ilike.%q%')` directly on the joined query. PostgREST can't OR-ilike across two distinct foreign tables in a single `.or()` call (would need a `referencedTable` option, which is per-table). Used the documented fallback pattern: pre-fetch matching customer/property IDs and constrain the inspections query with `.or('customer_id.in.(...),property_id.in.(...)')`. Server-side pagination preserved.
- **JobsTable empty-state**: plan proposed touching the table to show a filter-aware empty message. Instead, the page renders the empty card itself (and only mounts the table when there are rows), so JobsTable's existing copy stays as the fallback for any other caller. Net behavior matches the plan.
- **JSDoc**: added a JSDoc block on the page component documenting the URL vocabulary, per the Risks section.

### Issues Encountered

- TS error initially on `query.eq('status', opts.status)` — Supabase's typed client constrains the column to the `JobStatus` union but the option is `string`. Resolved with a single cast at the boundary, with a comment noting the caller is responsible for restricting to the 6-state model.
- `npm run lint` script is just `eslint` (no path arg), and bare `npx next lint` doesn't work in Next 16 the way it did in 15. Validated by running `npx eslint <files>` directly on the changed files — clean.
- Browser-side checks from the plan's validation list (active highlight on click, mobile breakpoint, bookmarkability of filtered URLs) were not driven from this session — verify in the browser when convenient.
