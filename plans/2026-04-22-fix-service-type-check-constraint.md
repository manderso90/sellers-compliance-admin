# Plan: Fix Create-Job 500 by Writing the Right Columns (no schema migration)

**Created:** 2026-04-22
**Revised:** 2026-04-22 — Step 0 findings changed the approach; no migration needed.
**Status:** Implemented
**Request:** Fix the 500 on `POST /admin/jobs/new`. The live DB rejects every insert with Postgres `23514: inspections_service_type_check`. The form treats the `service_type` column as a job-type toggle (Inspection vs Work); the real column is a service-tier enum (`standard` / `expedited` / `reinspection`). Use the already-existing `inspections.includes_installation` boolean for the Inspection-vs-Work-Completion distinction and stop writing the wrong value to `service_type`.

---

## Overview

### What This Plan Accomplishes

1. Refreshes `supabase/schema.sql` in the admin repo with the authoritative DDL pulled from the live database, so documented schema stops drifting from reality.
2. Reroutes the "Inspection vs Work Completion" distinction in the Create Job / Edit Job flow to the column that was designed for it (`includes_installation boolean`) instead of the service-tier column it was wrongly hitting (`service_type`).
3. Hard-codes `service_type: 'standard'` on every write from the admin form, matching what every existing row uses. A tier selector (standard / expedited / reinspection) can be added as a separate UI element later if the business needs it.
4. Adds a `surfacePgError` helper to `job-actions.ts` so future Postgres constraint violations surface as legible "Database error (23514) …" messages in the form banner and structured server logs, instead of the redacted "An error occurred in the Server Components render" text.
5. Updates the dispatch / jobs read paths to derive the displayed job-type label from `includes_installation`, so the UI keeps showing "Inspection" / "Work Completion" (not "standard") after the fix.

### Why This Matters

Create Job is the primary intake entry point for every phone-in and walk-in appointment, and it has been returning 500 on every submission in production. More importantly, the Step 0 investigation revealed the code was modeling a concept the schema already models with a different column — widening the CHECK constraint (original plan) would have polluted service-tier vocabulary with job-type values and entrenched a design mistake. The right fix is to use the right column, and that requires no schema change at all.

### Step 0 Findings (read-only, completed)

Pulled live constraint bodies via the Supabase Management API (`POST /v1/projects/{ref}/database/query`, `pg_get_constraintdef`):

| Column | CHECK allow-list (live) |
|---|---|
| `service_type` | `standard`, `expedited`, `reinspection` |
| `status` | `requested`, `awaiting_confirmation`, `alternatives_offered`, `confirmed`, `in_progress`, `work_in_progress`, `completed`, `no_show`, `hold`, `needs_rescheduling`, `cancelled` |
| `requested_time_preference` | `morning`, `afternoon`, `anytime`, `flexible` |
| `payment_status` | `unpaid`, `invoiced`, `paid`, `waived` |
| `inspector_outcome` | `completed_no_work`, `completed_with_work`, `work_needed_future`, `reinspection_required`, `unable_to_complete` |

The `status` constraint has substantially more values than `aios/01_context/terminology.md`, `supabase/schema.sql`, and `services/job-lifecycle.ts`'s `VALID_TRANSITIONS` assume. That's a real drift problem but out of scope for this plan; not addressed here.

---

## Current State

### Relevant Existing Structure

**Admin repo** (`/Users/morrisanderson/Projects-clean/sellers-compliance-admin`):
- `src/components/admin/jobs/NewJobForm.tsx` — client form; Job Type radio writes `"Inspection"` / `"Work"` into local `title`, submitted to `createJob` as `title`.
- `src/lib/actions/job-actions.ts`:
  - `createJob` line 138 — `service_type: title` (wrong column).
  - `updateJob` line 296 — `inspectionUpdate.service_type = data.title.trim()` (wrong column, same bug on the edit path).
- `src/lib/queries/dispatch.ts` — two SELECTs pull `service_type` and map it to `title` in the UI payload (lines 45/68 and 107/122).
- `src/lib/queries/jobs.ts` line 33 — same mapping (`title: row.service_type ?? ''`).
- `src/lib/actions/scheduling-actions.ts` lines 78/89 — same mapping.
- `src/services/job-lifecycle.ts` — `VALID_TITLES = ['Inspection', 'Work']` (UI-level validation).
- `src/types/database.ts` — already exposes `includes_installation: boolean` on the inspections Row/Insert/Update types (generated from PostgREST introspection).
- `supabase/schema.sql` — reference-only, self-documented as "NOT a runnable migration"; missing the CHECK bodies, which is how the mismatch survived review.

**Public repo** (`/Users/morrisanderson/Projects-clean/Sellers-Compliance`):
- `src/app/order/page.tsx` — customer-facing order form already writes `includes_installation` directly (lines 66, 109, 254, 693, 831, 835, 840). Switching the admin form to the same column aligns the two intake paths.

### Gaps or Problems Being Addressed

1. **Create Job is 500 in production.** Runtime logs (`prj_3fZz2U7MX0XTRishYtbhDs8QQ7kc`, three failures at 2026-04-22T17:41–T17:45, digest `926982595@E394`) confirm the CHECK violation on every submit.
2. **Two concepts were conflated into one column.** `service_type` (tier: standard / expedited / reinspection) and Inspection-vs-Work-Completion (`includes_installation` boolean) are different facts. Commit `e1ca533` wrote the UI toggle into the tier column.
3. **Reads must change in lockstep with writes.** Four call sites currently surface `row.service_type` as the UI `title` (dispatch timeline, jobs list, scheduling actions). After the fix, `service_type` will always be `'standard'` for newly-created jobs — so the UI would regress from showing "Inspection"/"Work" to showing "standard" unless those reads also switch to deriving the label from `includes_installation`.
4. **Form label drift.** The radio option reads "Work" but terminology is "Work Completion". Since we're editing the form anyway, fix the label to match `aios/01_context/terminology.md`.
5. **Error opacity at the client.** `NewJobForm`'s catch writes `err.message` into UI state; for server-action errors in production Next.js scrubs the message to the generic RSC text. The action should log the Postgres code/message before throwing and throw a short user-safe summary.
6. **`supabase/schema.sql` lies.** It omits every CHECK body. Refresh it from the live DB so future reviewers can see constraint enums without a management-API detour.

---

## Proposed Changes

### Summary

- No DB migration. Schema is correct; code is wrong.
- Write `includes_installation` instead of repurposing `service_type`. Always write `service_type: 'standard'` on admin inserts for now.
- Update all four read sites to also select `includes_installation` and derive the displayed label from it.
- Rename the form's "Work" option to "Work Completion" and align `VALID_TITLES` to match.
- Add a `surfacePgError` helper and wire it through the existing `throw error ?? new Error(...)` sites in `job-actions.ts`.
- Refresh `supabase/schema.sql` from live DDL (Management API, no Docker required).

### Detailed changes — admin repo

**`src/components/admin/jobs/NewJobForm.tsx`**
- Replace the two `'Work'` occurrences (state compare on line 73, setter on line 74) with `'Work Completion'`.
- Update the visible `<span>` on line 77 to read `Work Completion`.
- Default remains `'Inspection'`. No other behavioral change — the submit handler keeps passing `title` through.

**`src/services/job-lifecycle.ts`**
```ts
const VALID_TITLES = ['Inspection', 'Work Completion'] as const
```
This stays a UI-level validation (no DB value is being validated against it; we'll translate inside the action).

**`src/lib/actions/job-actions.ts`**

Add a helper at the top of the module:
```ts
function surfacePgError(err: unknown, context: string): never {
  const pg = err as { code?: string; message?: string; details?: string | null }
  if (pg?.code) {
    console.error(`[job-actions:${context}] pg ${pg.code}: ${pg.message}`)
    throw new Error(`Database error (${pg.code}) during ${context}`)
  }
  throw err instanceof Error ? err : new Error(`Unexpected error during ${context}`)
}
```

In `createJob`:
- Replace `service_type: title,` with:
  ```ts
  service_type: 'standard',
  includes_installation: title === 'Work Completion',
  ```
- Route the three inspection-related throws (`ensureCustomer`, `createProperty`, inspection insert) through `surfacePgError` instead of `throw error ?? new Error(...)`.

In `updateJob`:
- Replace the `if (data.title !== undefined) inspectionUpdate.service_type = data.title.trim()` block with:
  ```ts
  if (data.title !== undefined) {
    inspectionUpdate.includes_installation = data.title.trim() === 'Work Completion'
  }
  ```
- Route the customer/property/inspection update error throws through `surfacePgError`.

In `assignInspector` and `deleteJob`: route the `throw error` sites through `surfacePgError` as well (same helper, different context strings). Small hardening; no behavioral change on the happy path.

**`src/lib/queries/dispatch.ts`**
- Add `includes_installation` to both `.select(...)` column lists (lines 45 and 107).
- Replace both `title: row.service_type` assignments (lines 68 and 122) with `title: row.includes_installation ? 'Work Completion' : 'Inspection'`.

**`src/lib/queries/jobs.ts`**
- Same pattern: add `includes_installation` to the select, change line 33 to derive `title` from the boolean.

**`src/lib/actions/scheduling-actions.ts`**
- Add `includes_installation` to the select on line 78.
- Change line 89 to the same boolean-derived title.

### Detailed changes — documentation / schema file

**Refresh `supabase/schema.sql` (admin repo)** — replace the hand-maintained file with real DDL from the live DB. Since Docker isn't running, use the Management API rather than `supabase db dump`:

```bash
curl -sS -X POST "https://api.supabase.com/v1/projects/nuduleufdmyctcbvvrae/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = '\''public'\'' and table_name in ('\''profiles'\'','\''customers'\'','\''properties'\'','\''inspections'\'','\''inspection_status_history'\'') order by table_name, ordinal_position;"}'
```
…plus a similar query against `pg_constraint` for CHECK bodies. Assemble into a real `CREATE TABLE … CHECK (…)` file. Keep the reference-only header line removed — from now on this file is authoritative.

### Out of scope

- `status` enum drift (live DB has 11 values; code assumes 6). Acknowledged; separate plan to follow when we decide how to handle the extra states.
- RLS policy tightening (T2 in `aios/05_active/known-issues.md`).
- Services-layer extraction (S5).
- Adding a tier selector (`standard` / `expedited` / `reinspection`) — defer until the business asks for it.
- Regenerating `src/types/database.ts` from live schema — not required for this fix.

---

## Rollout Steps

1. **Refresh `supabase/schema.sql`** in the admin repo via the Management API queries above. Commit alone as a documentation fix so the subsequent code diff is easier to review.
2. **Ship the code changes** in the admin repo in a single commit touching:
   - `src/components/admin/jobs/NewJobForm.tsx`
   - `src/services/job-lifecycle.ts`
   - `src/lib/actions/job-actions.ts`
   - `src/lib/queries/dispatch.ts`
   - `src/lib/queries/jobs.ts`
   - `src/lib/actions/scheduling-actions.ts`
   Validate with `tsc --noEmit`.
3. **Deploy admin repo to production.** Push `main`; Vercel auto-deploys.
4. **Smoke test end-to-end.**
   - Create an Inspection job on `/admin/jobs/new`. Confirm it lands in `/admin/dispatch` and on `/admin/jobs` with the "Inspection" label.
   - Create a Work Completion job. Confirm it lands with "Work Completion" label.
   - Open one of the new jobs at `/admin/jobs/[id]`. Confirm no UI regression.
   - Open an existing legacy job (the one row with `service_type = 'standard'`). It will display as "Inspection" (because `includes_installation = false` is the default). Confirm that's acceptable; if that row was meant to be a Work Completion, update it manually in Supabase.
5. **Deliberate-break verification.** Submit a job with an empty address or a zero duration to confirm `surfacePgError` surfaces a legible Postgres code to the form banner, not the generic scrubbed text.
6. **Close the loop in AIOS.** Update `aios/05_active/known-issues.md` to note the `service_type` / `includes_installation` fix is complete and the `status` enum drift is a new known issue awaiting its own plan.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| The existing `service_type = 'standard'` row was actually a Work Completion and the default `includes_installation = false` silently relabels it as an Inspection. | Check the row manually in Supabase before deploy; if wrong, UPDATE it via SQL editor. There is only one row. |
| A downstream read we didn't enumerate still reads `service_type` as the job-type label and regresses to "standard". | Grep for `service_type` across the admin repo before merging (confirmed here: six sites, all in the change list). |
| The `surfacePgError` helper masks non-PG errors with a generic message. | Helper re-throws original non-PG errors unchanged; only Postgres errors (which have `.code`) get the friendly wrapper. |
| Writing `service_type: 'standard'` on every admin-created job loses intended tier distinction (e.g., all future expedited jobs become "standard"). | Accepted tradeoff: the product is not currently using tier anywhere. When/if we need it, add a tier selector as a separate UI. The column still accepts `'expedited'` / `'reinspection'` for back-office edits via Supabase if needed. |
| Management-API query to rebuild `supabase/schema.sql` is tedious and could introduce transcription errors. | If `pg_dump` is available locally (outside Docker), prefer it. Otherwise, double-check the generated file against the live `pg_constraint` / `information_schema.columns` output. |

---

## Success Criteria

- [ ] `supabase/schema.sql` in the admin repo reflects the live DDL including all CHECK bodies.
- [ ] A new job submitted via `/admin/jobs/new` with Job Type "Inspection" persists successfully and appears with label "Inspection" on `/admin/dispatch` and `/admin/jobs`.
- [ ] A new job submitted with Job Type "Work Completion" persists successfully and appears with label "Work Completion".
- [ ] `select distinct service_type from public.inspections` still returns only `'standard'` for newly-created rows.
- [ ] `select distinct includes_installation from public.inspections` returns both `true` and `false` after creating one of each job type.
- [ ] Deliberately breaking an insert surfaces a legible "Database error (23514) during …" message in the form banner.
- [ ] No regression in `/admin/dispatch`, `/admin/jobs`, `/admin/jobs/[id]`, `/admin/inspectors/[id]`, or Command Center rendering of existing or new inspections.

---

## Implementation Notes

**Implemented:** 2026-04-22

### Summary

- Step 1 — `supabase/schema.sql` refreshed from live DB via Management API (full DDL, all CHECK bodies, PK/FK/UNIQUE, indexes). Committed standalone as `77a5649`.
- Step 2 — Code fix committed as `6e1f5b3`. Both commits pushed to `origin/main`; Vercel auto-deploys.
- Step 6 — `aios/05_active/known-issues.md` updated to add F4 (`inspections.status` CHECK drift: live allows 11 values; code assumes 6). Tracked for its own plan.

### Deviations from Plan

1. **Two additional write/read sites fixed that the plan didn't enumerate.** Both were exactly the regression class the plan's Risk table flagged ("A downstream read we didn't enumerate still reads `service_type` as the job-type label"):
   - `src/components/admin/jobs/JobEditForm.tsx` — `'Work'` radio literal → `'Work Completion'` (plan covered `NewJobForm.tsx` only).
   - `src/app/admin/inspectors/[id]/page.tsx:126` — rendered `{job.service_type}` directly; switched to `includes_installation` boolean.
   - Also corrected `src/services/duration-estimation.ts` — the `else if (titleLower === 'work')` branch would silently dead-end to the 45-min default now that titles are `'Work Completion'`. Updated to match `'work completion'`.

2. **Plan's Risk #1 was stale.** Plan assumed exactly one existing `service_type = 'standard'` row needing possible manual correction. Actual count: 39 rows, with 35 `includes_installation = true` and 4 `false`. The public `/order` form has been writing `includes_installation` correctly all along, so every existing row is already labeled correctly post-deploy. No manual SQL update was needed.

3. **Scope of `schema.sql` refresh went wider than the plan's "add CHECK bodies".** The live DDL pull surfaced substantial additional drift corrected in the same commit: `customers.customer_type` default/CHECK, `properties.property_type` CHECK, `properties.bathrooms` type, `profiles.roles` default/CHECKs, unique constraint on `customers.email`, ten btree indexes, `inspections.listing_id` column, and removal of a spurious `dispatch_status` CHECK that doesn't exist in live. Header rewritten to mark the file authoritative. Triggers/RLS/functions explicitly out of scope.

### Issues Encountered

- **Management API token not in env.** `$SUPABASE_ACCESS_TOKEN` was missing from `.env.vercel-local`; Docker wasn't running (blocks `supabase db dump --linked`) and `pg_dump`/`psql` weren't on PATH. Mo supplied a personal access token for the one-shot Management API query; token used in-memory only and not written to any file, log, or commit.

### Remaining rollout steps (user-driven)

Plan Steps 4 and 5 require Mo at a browser:

- **Step 4 (smoke test):** Create Inspection + Work Completion jobs via `/admin/jobs/new`, confirm both land on `/admin/dispatch` and `/admin/jobs` with correct labels. Open an existing job on `/admin/jobs/[id]` to verify no regression.
- **Step 5 (deliberate-break verification):** Submit a job with an empty address or zero duration; confirm form banner shows `Database error (NNNNN) during …` instead of the generic RSC-scrubbed text.

### Cross-repo note

AIOS lives identically in both the public repo (`Sellers-Compliance`) and the admin repo (`sellers-compliance-admin`). I updated `aios/05_active/known-issues.md` only in the public repo since that's where `/implement` was invoked. Admin repo's AIOS will drift until manually synced — tracked as a one-line follow-up, not a blocker.

