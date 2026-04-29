# Plan: Fix `/admin/dashboard` 404 from Command Center metric cards

**Created:** 2026-04-28
**Status:** Implemented
**Request:** Fix the 404 at `https://admin.sellerscompliance.com/admin/dashboard?dateRange=today` (and the three sibling 404s) by repointing the broken Command Center metric-card links to existing routes.

---

## Overview

### What This Plan Accomplishes

Removes the four 404 dead-ends behind the top-row Command Center summary cards by repointing each card to an existing `/admin/jobs` view (or `/admin/dispatch`) using the URL vocabulary that's already implemented in `getJobsList`. Eliminates a no-op route name (`/admin/dashboard`) that never existed and aligns the Command Center's CTAs with how the rest of the admin UI navigates filtered job lists.

### Why This Matters

The four cards are the most prominent CTAs on the operating layer's home page (`/admin`). Every click currently lands on a Next.js 404, which (a) breaks the operator's mental model — the Command Center metrics are supposed to drill into the underlying jobs — (b) hides drill-down workflows that already work elsewhere, and (c) signals broken software in a place a coordinator looks every day. This is a small fix that restores a core navigation flow with no schema, query, or service changes.

---

## Current State

### Relevant Existing Structure

- `src/app/admin/page.tsx` — the Command Center page (this is the "dashboard" — there is no `/admin/dashboard` route).
- `src/app/admin/dashboard/` — **does not exist** in `src/app/`. That's the literal cause of the 404.
- `src/components/admin/command/CommandMetricsRow.tsx:68-111` — the four `BoldMetricCard`s with broken hrefs:
  - L78  `href="/admin/dashboard?dateRange=today"` — Scheduled Today
  - L87  `href="/admin/dashboard?status=completed"` — This Week (Completed)
  - L97  `href="/admin/dashboard?status=requested"` — Unconfirmed
  - L107 `href="/admin/dashboard?status=requested"` — Unassigned
- `src/app/admin/jobs/page.tsx` — the jobs list, which is the natural drill-down target. Already supports `status`, `scope`, `search`, `page` URL params (see header comment around L31).
- `src/lib/queries/jobs.ts:20-97` — `getJobsList` accepts:
  - `status` — any of the 6-state model values (`requested`, `confirmed`, `in_progress`, `completed`, `cancelled`, `on_hold`).
  - `scope` — `'today'` (scheduled_date = today), `'week'` (this week), `'unscheduled'` (dispatch_status = `unscheduled`).
- `src/components/admin/jobs/JobsFilters.tsx:41-48` — confirms tabs write `status` and clear `scope`; the two are mutually exclusive in the UI for tab selection but `scope=week` + `status=completed` together is a valid query for the underlying query function.
- `src/components/admin/dispatch/DispatchHeader.tsx:18` — pattern for `?date=YYYY-MM-DD` if we ever want "today's dispatch timeline" instead of "today's job list" for the first card.
- `src/components/admin/command/InspectorWorkloadSnapshot.tsx:42` — already uses `/admin/dispatch` as a drill-down (precedent: cross-link from Command Center into operational pages).

### Gaps or Problems Being Addressed

- The `/admin/dashboard` URL was never a route. All four metric cards lead nowhere.
- The Command Center has no working drill-downs from its top metrics — the operator can see "12 Scheduled Today" but cannot click through to see *which* 12.
- The `dateRange=today` query-param vocabulary used in the broken hrefs doesn't match any consumer in the codebase. The supported vocabulary is `scope=today` (per `getJobsList`).

---

## Proposed Changes

### Summary of Changes

- Repoint the four `BoldMetricCard.href` values in `CommandMetricsRow.tsx` to working `/admin/jobs?...` (and one `/admin/dispatch`) destinations using the existing URL vocabulary.
- No new routes, no new query params, no schema or services touched.
- Update `aios/05_active/in-progress.md` with a "Recent Completions" entry once implemented.

### New Files to Create

None.

| File Path | Purpose |
| --- | --- |
| _(none)_ | _(no new routes — fix uses existing routes and URL vocabulary)_ |

### Files to Modify

| File Path | Changes |
| --- | --- |
| `src/components/admin/command/CommandMetricsRow.tsx` | Replace all four `/admin/dashboard?...` hrefs with the mapping in **Design Decisions §1** below. |
| `aios/05_active/in-progress.md` | Add a "Recent Completions" row dated 2026-04-28 referencing this plan. |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Card → destination mapping** (the core decision):

   | Card | Old (broken) | New | Rationale |
   | --- | --- | --- | --- |
   | Scheduled Today | `/admin/dashboard?dateRange=today` | `/admin/jobs?scope=today` | `getJobsList` already implements `scope='today'` as `scheduled_date = today`. Exact intent match. |
   | This Week (Completed) | `/admin/dashboard?status=completed` | `/admin/jobs?scope=week&status=completed` | The metric is "this week, completed". Both filters are supported by `getJobsList`. JobsFilters tab UI clears `scope` when a tab is clicked, but landing with both params set is fine — the table renders correctly and the user can refine from there. |
   | Unconfirmed | `/admin/dashboard?status=requested` | `/admin/jobs?status=requested` | `unconfirmedCount` in `getCommandCenterStats` corresponds to jobs in the `requested` state. Direct mapping. |
   | Unassigned | `/admin/dashboard?status=requested` | `/admin/jobs?scope=unscheduled` | `unassignedCount` filters on `assigned_inspector_id IS NULL`. The closest existing query option is `scope=unscheduled` (`dispatch_status = 'unscheduled'`). The two sets overlap but are not identical — accepted as an approximation for this interim fix; the future `/admin/dashboard` page will own the exact drill-down. The old href used `status=requested`, which conflated unconfirmed and unassigned — repointing to `scope=unscheduled` is a small semantic improvement even with the residual approximation. |

2. **Use existing URL vocabulary, do not invent `dateRange=`.** The codebase already standardized on `scope` (`today` / `week` / `unscheduled`) for time-bucket filters in `getJobsList`. Adding a parallel `dateRange` vocabulary just to match the broken hrefs would create drift. Rule from `aios/CLAUDE.md`: code is the source of truth — match the implementation.

3. **Drill into `/admin/jobs`, not a new `/admin/dashboard` page.** The Command Center *is* the dashboard (it lives at `/admin`). Building a second "dashboard" route that overlaps with the jobs list would duplicate the existing list with no added value.

4. **Don't add an `assigned=null` filter for the Unassigned card.** Mapping to `scope=unscheduled` is good enough and uses the dispatch-status concept the codebase already speaks. Adding a third filter dimension to `getJobsList` for one card isn't justified.

5. **Don't redirect `/admin/dashboard` to `/admin`.** A redirect would mask the underlying broken hrefs without fixing intent (the operator wants the *filtered list*, not the dashboard they're already on). The right fix is at the source — the four hrefs.

### Alternatives Considered

- **A. Build a real `/admin/dashboard/page.tsx` route.** Rejected — it would either duplicate `/admin/jobs` or duplicate `/admin`. No new functionality justified.
- **B. Add a redirect from `/admin/dashboard` to `/admin/jobs?...` in `proxy.ts` or via a route handler.** Rejected — the operator's intent depends on which card they clicked; a single redirect can't preserve that. Fixing the source links is simpler and more correct.
- **C. Repoint "Scheduled Today" to `/admin/dispatch?date=today-yyyy-mm-dd`.** Considered as a stronger match for "what's on the timeline today." Rejected for v1 because (a) the other three cards naturally land on the jobs list, so consistency wins, and (b) Dispatch shows visual timeline only — the operator who clicks a metric card likely wants the tabular drill-down. Could be revisited in a follow-up if usability feedback says otherwise.
- **D. Extend `JobsListOptions` with an `assigned: 'unassigned' | 'assigned'` filter.** Rejected — `scope=unscheduled` already covers the unassigned case via `dispatch_status`. Don't grow the filter surface for one click target.

### Resolved Questions

1. **`unassignedCount` filter** — confirmed: `getCommandCenterStats.unassignedCount` filters on `assigned_inspector_id IS NULL`, **not** on `dispatch_status = 'unscheduled'`. The two sets overlap heavily (a job with no inspector is almost always also unscheduled in dispatch), but they are not identical. Implication for this plan: the `Unassigned` card's destination `?scope=unscheduled` is an **acceptable approximation**, not an exact match. The displayed count and the resulting list row count may differ by 0–N rows. This is documented in the Notes section and is the rationale for **not** extending `getJobsList` here.
2. **Future `/admin/dashboard` page** — confirmed: a real dashboard is intended to exist at `/admin/dashboard` in the future, but it does not exist today. This plan is an **interim fix**. When the dashboard ships, the four card hrefs in `CommandMetricsRow.tsx` should be revisited and pointed at the dashboard's filtered views. See **Future work** in Notes.

---

## Step-by-Step Tasks

### Step 1: Verify the source-of-truth route layout and `unassignedCount` semantics

Quick read-only verification before editing.

**Actions:**
- `ls src/app/admin/` to confirm `dashboard/` is absent.
- Read `src/lib/queries/command-center.ts` and locate `getCommandCenterStats` — note the exact filter used to compute `unassignedCount` and `unconfirmedCount`. Compare to:
  - `unconfirmedCount` ↔ expected `status = 'requested'`
  - `unassignedCount` ↔ expected `dispatch_status = 'unscheduled'`
- If either differs, capture the exact filter and use it to refine the mapping in Step 2 (still using `?status=` / `?scope=` from the existing vocabulary — do not invent a new param).

**Files affected:**
- _(read-only)_

---

### Step 2: Repoint the four metric-card hrefs

Edit `src/components/admin/command/CommandMetricsRow.tsx`.

**Actions:**
- Line 78: change
  ```
  href="/admin/dashboard?dateRange=today"
  ```
  to
  ```
  href="/admin/jobs?scope=today"
  ```
- Line 87: change
  ```
  href="/admin/dashboard?status=completed"
  ```
  to
  ```
  href="/admin/jobs?scope=week&status=completed"
  ```
- Line 97: change
  ```
  href="/admin/dashboard?status=requested"
  ```
  to
  ```
  href="/admin/jobs?status=requested"
  ```
- Line 107: change
  ```
  href="/admin/dashboard?status=requested"
  ```
  to
  ```
  href="/admin/jobs?scope=unscheduled"
  ```
- Leave the rest of the component (props, `BoldMetricCard`, styling, the `Wrapper = href ? 'a' : 'div'` pattern) untouched.

**Files affected:**
- `src/components/admin/command/CommandMetricsRow.tsx`

---

### Step 3: Type-check and confirm no other consumers reference `/admin/dashboard`

**Actions:**
- Run `npx tsc --noEmit` from project root — must report 0 errors. (The change is a pure string swap, but per `aios/04_rules/coding-rules.md` the zero-errors policy is mandatory before commit.)
- Run `grep -rn "admin/dashboard" src/` and confirm no remaining references. (Pre-investigation showed all four were in `CommandMetricsRow.tsx`; this is a paranoia check in case any new file was added since.)

**Files affected:**
- _(verification only)_

---

### Step 4: Manual smoke test in the dev server

**Actions:**
- `npm run dev`, log in, land on `/admin` (Command Center).
- Click each of the four cards in turn:
  1. **Scheduled Today** → expect `/admin/jobs?scope=today` showing today's scheduled jobs only.
  2. **This Week (Completed)** → expect `/admin/jobs?scope=week&status=completed` showing this week's completed jobs.
  3. **Unconfirmed** → expect `/admin/jobs?status=requested` showing unconfirmed jobs (the "Unconfirmed" tab if `JobsFilters` highlights it; otherwise the All view filtered to `requested`).
  4. **Unassigned** → expect `/admin/jobs?scope=unscheduled` showing jobs with `dispatch_status = 'unscheduled'`.
- Verify no console warnings, no 404s, JobsTable renders rows in each case (or an empty state if no rows match).
- Verify the "Clear filters" affordance in `JobsFilters` works to bail out of the filtered view.

**Files affected:**
- _(test only)_

---

### Step 5: Update AIOS active state

Add a "Recent Completions" entry to `aios/05_active/in-progress.md`.

**Actions:**
- Read `aios/05_active/in-progress.md`.
- Add a new row at the top of the "Recent Completions" table (it currently starts with the 2026-04-26 entries) with this content:

  ```
  | 2026-04-28 | Fix `/admin/dashboard` 404 on Command Center metric cards (plan: `plans/2026-04-28-fix-dashboard-404-metric-card-links.md`). Repointed all four `BoldMetricCard` hrefs in `CommandMetricsRow.tsx` from the non-existent `/admin/dashboard?...` to `/admin/jobs?...` using the existing `scope` / `status` URL vocabulary. No new routes; no schema or service changes. |
  ```

**Files affected:**
- `aios/05_active/in-progress.md`

---

### Step 6: (Optional, non-blocking) Note the dispatch alternative for "Scheduled Today"

If the operator finds the jobs-list drill-down less useful than the dispatch timeline for the "Scheduled Today" card, a follow-up plan can repoint just that card to `/admin/dispatch?date=YYYY-MM-DD` (today's date computed at click time). This requires either making the card a client component or computing the date server-side at render. Out of scope for this fix — flagged in the post-implementation report.

**Actions:**
- None for this plan. Capture in the implementation report.

**Files affected:**
- _(none)_

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/admin/page.tsx` — renders `<CommandMetricsRow stats={stats} />`. No change needed; the component's public surface is unchanged.
- `src/lib/queries/command-center.ts` — produces the `CommandCenterStats` shape consumed by the cards. No change needed; this plan does not touch what the cards display, only where they link.
- `src/components/admin/jobs/JobsFilters.tsx` and `src/lib/queries/jobs.ts` — the destinations. Read-only dependencies; their existing URL vocabulary (`status`, `scope`) is what makes this a one-component fix.

### Updates Needed for Consistency

- `aios/05_active/in-progress.md` — add the recent-completion entry (Step 5).
- No other AIOS file needs updating: there's no terminology change, no schema change, no new user-facing capability, no integration change. The `living-document protocol` table in `aios/CLAUDE.md` is not triggered.
- No mirror needed in the `Sellers-Compliance` (public) repo — this is a single-component fix in `sellers-compliance-admin` only, not shared business logic.

### Impact on Existing Workflows

- Multi-view sync rule: clicking a Command Center card now correctly drives the operator into the Jobs view, matching the existing pattern (e.g., `InspectorWorkloadSnapshot` already drills into `/admin/dispatch`). Net positive for view-coherence.
- Realtime: not affected. The jobs list and Command Center already mount `<ScheduleSyncClient />`; once the operator lands on `/admin/jobs?scope=...`, realtime continues to work.
- No effect on auth, RLS, server actions, or services.

---

## Validation Checklist

- [ ] `grep -rn "admin/dashboard" src/` returns zero matches after the edit.
- [ ] `npx tsc --noEmit` passes with 0 errors.
- [ ] Each of the four cards on `/admin` navigates to the expected `/admin/jobs?...` URL with no 404.
- [ ] `JobsTable` renders the expected filtered rows for each card destination (or an appropriate empty state).
- [ ] No new console warnings on the Command Center or Jobs pages.
- [ ] `aios/05_active/in-progress.md` has the 2026-04-28 entry.
- [ ] The implementation report explicitly notes that `Unassigned` → `?scope=unscheduled` is an approximation (count filters on `assigned_inspector_id IS NULL`; destination filters on `dispatch_status = 'unscheduled'`) and that the future `/admin/dashboard` will replace it.

---

## Success Criteria

The implementation is complete when:

1. Clicking any of the four Command Center top-row metric cards lands on a working `/admin/jobs?...` page with the table filtered to match the metric's intent.
2. No production navigation path leads to a `/admin/dashboard` 404.
3. The codebase contains no references to `/admin/dashboard` (verified by `grep`).
4. `aios/05_active/in-progress.md` reflects the change in its Recent Completions table.

---

## Notes

- This is a near-zero-risk fix: one component, four string changes, all to existing routes with existing query handling. No `/implement` step requires schema, service, or query work.
- **Unassigned card is an approximation, by design.** `getCommandCenterStats.unassignedCount` filters on `assigned_inspector_id IS NULL` (confirmed with the user). The destination `?scope=unscheduled` filters on `dispatch_status = 'unscheduled'`. These sets overlap heavily but are not identical. The mismatch is accepted because (a) it's still a strict improvement over the broken `?status=requested` href, (b) the future dashboard (see Future work) will replace this drill-down anyway, and (c) extending `getJobsList` with an `assigned` filter for a temporary stop-gap doesn't pay off.
- A future improvement worth considering: making `BoldMetricCard` use `next/link` instead of a raw `<a>` so the navigations are client-side and don't trigger a full page reload. Out of scope for this fix; the broken hrefs are the only emergency.

### Future work

- **`/admin/dashboard` is planned.** When that page lands, the four card hrefs in `CommandMetricsRow.tsx` should be revisited and pointed at the dashboard's filtered views. The dashboard will be the right home for tight semantic mappings (e.g., an exact "Unassigned" view backed by `assigned_inspector_id IS NULL`) without contorting the jobs list. Treat the hrefs from this plan as scaffolding, not the final destination.
- When the dashboard plan is created, include a step to grep `src/` for `/admin/jobs?scope=` and `/admin/jobs?status=` references that originated in this fix and decide on a per-card basis whether to repoint or keep the jobs-list drill-down.

---

## Implementation Notes

**Implemented:** 2026-04-28

### Summary

Repointed the four `BoldMetricCard` hrefs in `src/components/admin/command/CommandMetricsRow.tsx` from the non-existent `/admin/dashboard?...` to working `/admin/jobs?...` destinations using the existing `scope` / `status` URL vocabulary. Added a Recent Completions entry to `aios/05_active/in-progress.md`.

The exact mapping landed as planned:

- Scheduled Today → `/admin/jobs?scope=today`
- This Week (Completed) → `/admin/jobs?scope=week&status=completed`
- Unconfirmed → `/admin/jobs?status=requested`
- Unassigned → `/admin/jobs?scope=unscheduled` (approximation — see Notes)

Verification: `npx tsc --noEmit` returned 0 errors. `grep -rn "admin/dashboard" src/` returned 0 matches.

### Deviations from Plan

- Step 1's optional read of `src/lib/queries/command-center.ts` to re-verify `unassignedCount` semantics was skipped — the plan's "Resolved Questions" already documents the filter (`assigned_inspector_id IS NULL`) as user-confirmed, and the destination mapping does not depend on that semantic being re-checked. The known approximation is preserved.
- Step 4 (manual smoke test in dev server) was not executed automatically — that's an operator action. Validation Checklist items requiring browser navigation remain unchecked pending manual smoke test.

### Issues Encountered

None. Pure string-swap fix; type check clean; no other consumers of `/admin/dashboard` in `src/`.

### Follow-up (from Step 6)

Optional future improvement: if the operator finds the jobs-list drill-down for "Scheduled Today" less useful than the dispatch timeline, repoint that one card to `/admin/dispatch?date=YYYY-MM-DD` (today computed at click time). Out of scope here.
