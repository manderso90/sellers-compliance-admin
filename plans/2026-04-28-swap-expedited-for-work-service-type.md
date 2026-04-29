# Plan: Retire `Expedited`, add `Work` service type (admin-only UI)

**Created:** 2026-04-28
**Status:** Implemented
**Request:** Remove `Expedited` as a service type and add a new `Work` service type. Backfill any existing `expedited` rows to `standard`. Tighten the public intake API's Zod enum to match. The new `Work` option is admin-only for now (not exposed on the public `/order` page).

---

## Overview

### What This Plan Accomplishes

Replaces the retired `Expedited` service tier with a new `Work` tier across every layer of the system:

- Admin UI (`/admin/jobs/new`): drop the `Expedited` pill, add a `Work` pill (label "Work", value `'work'`).
- Admin server-side validator (`validateIntakeInput`): swap `'expedited'` for `'work'` in the allowlist.
- Public intake API (`Sellers-Compliance/src/app/api/inspections/route.ts`): swap the Zod enum the same way.
- Database (Supabase): backfill any existing `service_type='expedited'` rows to `'standard'`, then redefine the column's `CHECK` constraint to `('standard','reinspection','work')`.
- Mirror file: refresh `supabase/schema.sql` from the live DB so it reflects the new constraint.
- Log it in `aios/05_active/in-progress.md`.

The public order form (`Sellers-Compliance/src/app/order/page.tsx`) is **deliberately not touched**: the new `Work` value is admin-entry-only at this time. (The customer-facing form already shows only Standard + Reinspection; that stays.)

### Why This Matters

`Expedited` was an old service tier with no operational meaning anymore — leaving the option on the highest-traffic intake form (`/admin/jobs/new`) invites coordinators to choose a value with no downstream behavior. `Work` is replacing it as a distinct service category the business does need to track. Doing the full retirement-and-replace in one coordinated change avoids a stale split between UI / validator / DB / API — every layer ends in the same place.

---

## Current State

### Relevant Existing Structure

The string `'expedited'` (or label `'Expedited'`) currently appears in five places spanning two repos plus the live database. The `Work` option is brand new — no existing references.

**Admin repo (`sellers-compliance-admin`):**

- `src/components/admin/jobs/NewJobForm.tsx:15` — `type ServiceType = 'standard' | 'expedited' | 'reinspection'`
- `src/components/admin/jobs/NewJobForm.tsx:85-89` — `serviceTypeOptions` array; row L87 = `['expedited', 'Expedited']` (the pill the user wants gone). `initialForm.service_type` at L52 is `'standard'` (stays).
- `src/services/job-lifecycle.ts:47` — `const VALID_SERVICE_TYPES = ['standard', 'expedited', 'reinspection'] as const`. Consumed by `validateIntakeInput` at L148-153 (called from the `createJob` server action). The exported `ServiceType` type at L52 derives from this constant via `typeof VALID_SERVICE_TYPES[number]`.
- `supabase/schema.sql:88` — doc comment `--   service_type              — tier: 'standard' | 'expedited' | 'reinspection'`
- `supabase/schema.sql:124-125` — column DDL with inline CHECK:
  ```
  service_type text not null default 'standard'
    check (service_type in ('standard','expedited','reinspection')),
  ```
  The constraint is column-inline with no explicit name; Postgres auto-names it `inspections_service_type_check` (verify before dropping — see Step 1).

**Public repo (`Sellers-Compliance`):**

- `src/app/order/page.tsx:680-684` — public order form options list: only `Standard Inspection` and `Work Completion (Follow-Up)` (the latter maps to value `'reinspection'`). **Deliberately left unchanged in this plan.** The new `'work'` value will not surface here.
- `src/app/api/inspections/route.ts:27` — `service_type: z.enum(['standard', 'expedited', 'reinspection']).default('standard')`. Tightened to `['standard', 'reinspection', 'work']` in Step 5.

**Live database (Supabase):**

- `inspections.service_type` column with `CHECK IN ('standard','expedited','reinspection')`. Unknown number of rows currently hold `service_type='expedited'`; backfill query in Step 2 handles 0..N.

**Surfaces that need NO change:**

- `src/components/admin/jobs/JobEditForm.tsx` — does not expose `service_type`. Confirmed by grep.
- `JobsTable`, `JobsFilters`, `JobsSummaryCards`, dispatch tile, job detail page — none render the literal label `'Expedited'`. The only label string `'Expedited'` lives in `NewJobForm.tsx`.
- AIOS docs (`aios/`) — no references to `expedited` in either repo's `aios/` tree.
- Pricing / duration / scheduling logic — no code branches on `service_type === 'expedited'` in either repo.
- `src/types/database.ts` — types `service_type` as `string` (not narrowed), so no type-level edit needed.
- `src/app/order/page.tsx` (public form) — admin-only scope per user.

### Gaps or Problems Being Addressed

1. The admin form still offers a retired tier (`Expedited`) that has no business meaning.
2. The new operational tier (`Work`) has no entry point anywhere — the business needs to be able to record jobs against it.
3. Data drift risk: validator allowlist, DB CHECK, and public API Zod enum all permit `'expedited'`. After the rewrite, all three converge on the same set: `('standard','reinspection','work')`.
4. Any historical row with `service_type='expedited'` needs a defined home. Per user direction, those rows backfill to `'standard'`.

---

## Proposed Changes

### Summary of Changes

- **Admin repo code:** swap `'expedited'` for `'work'` in `NewJobForm.tsx` (type union + pill array) and in `services/job-lifecycle.ts` (validator allowlist). Default value stays `'standard'`.
- **Admin repo schema mirror:** refresh `supabase/schema.sql` from the live DB after the DB change lands; do not hand-edit.
- **Public repo:** swap `'expedited'` for `'work'` in the API Zod enum at `Sellers-Compliance/src/app/api/inspections/route.ts:27`.
- **Database:** run a one-shot SQL block in Supabase: backfill `expedited → standard`, then redefine the CHECK to allow `('standard','reinspection','work')`.
- **AIOS:** add a 2026-04-28 row in `aios/05_active/in-progress.md` (admin repo). Mirror the same row into the public repo's `aios/05_active/in-progress.md` per the Cross-Repo Sync Rule, since this change touches shared DB state and shared business terminology.

### New Files to Create

None.

| File Path | Purpose |
| --- | --- |
| _(none)_ | _(no new code files; the DB SQL is run inline via Supabase, not committed as a migration since this project does not use a `supabase/migrations/` directory)_ |

### Files to Modify

| File Path | Changes |
| --- | --- |
| `src/components/admin/jobs/NewJobForm.tsx` (admin repo) | L15: `type ServiceType = 'standard' \| 'reinspection' \| 'work'`. L85-89: drop the `expedited` row; add `['work', 'Work']`. |
| `src/services/job-lifecycle.ts` (admin repo) | L47: `VALID_SERVICE_TYPES = ['standard', 'reinspection', 'work'] as const`. The exported `ServiceType` type narrows automatically. |
| `supabase/schema.sql` (admin repo) | L88 doc comment: replace `'expedited'` with `'work'`. L125 CHECK literal: replace `'expedited'` with `'work'`. **Do not hand-edit before the live DB is changed** — instead, refresh from live via Management API after Step 2 (mirrors recent commit `77a5649 docs(schema): refresh schema.sql from live DB via Management API`). |
| `Sellers-Compliance/src/app/api/inspections/route.ts` (public repo) | L27: `z.enum(['standard', 'reinspection', 'work']).default('standard')`. |
| `aios/05_active/in-progress.md` (admin repo) | Add the 2026-04-28 Recent Completions row. |
| `Sellers-Compliance/aios/05_active/in-progress.md` (public repo, if it exists; else skip) | Mirror the same Recent Completions row. The shared DB schema change is exactly the kind of cross-repo concern called out in `aios/CLAUDE.md` Cross-Repo Sync Rule. |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Single sweep, all layers.** Earlier draft of this plan deliberately split the layers (UI narrows; DB stays wide). User direction reverses that: backfill the data, narrow the DB, narrow the public API, and add `Work` everywhere except the customer-facing public order form. End state: every layer's allowlist is exactly `('standard','reinspection','work')`. No drift between layers.

2. **DB value `'work'` (lowercase, unquoted-style).** Matches the existing pattern for the other two values (`'standard'`, `'reinspection'`). The admin pill displays the label `'Work'` (capitalized) — same casing convention as the existing `Standard`, `Expedited`, `Reinspection` pills.

3. **Default value stays `'standard'`.** No reason to flip the default to `'work'`; most jobs will continue to be standard inspections.

4. **No `supabase/migrations/` directory.** This project does not use Supabase CLI migrations (verified: `supabase/migrations/` does not exist). The convention here, set by the recent `docs(schema): refresh schema.sql from live DB via Management API` commit, is: run SQL directly against the live DB via the Supabase dashboard SQL Editor, then refresh `supabase/schema.sql` from the live DB via the Management API. We follow that pattern.

5. **Admin-only scope for `Work`.** The user confirmed: do not add `Work` to the public order form. The customer-facing form (`Sellers-Compliance/src/app/order/page.tsx`) continues to show only `Standard Inspection` and `Work Completion (Follow-Up)`. This means an end customer cannot self-serve order a `Work`-typed job — only the admin can record one through `/admin/jobs/new`. We still tighten the public Zod enum to include `'work'` and exclude `'expedited'`, because the API is the gate that protects the DB CHECK and we want all layers aligned.

6. **Backfill before tightening the CHECK.** Order matters: if any row holds `service_type='expedited'`, redefining the CHECK first will fail with `check constraint "..." is violated by some row`. The Step 2 SQL block does the backfill first, in a single transaction with the CHECK redefinition, so either the entire change applies or none of it does.

7. **Drop and re-add the CHECK; do not use `ALTER ... ADD ... NOT VALID`.** A simple `DROP CONSTRAINT ... ADD CONSTRAINT ... CHECK (...)` inside one transaction is enough. The table is small (job inventory) and the validation cost is negligible.

8. **Coordinate the public-repo Zod change with the DB CHECK tightening.** Risk: between the moment the DB CHECK drops `'expedited'` and the moment the public API redeploys with the tightened Zod, a stray request with `service_type='expedited'` could pass Zod validation but fail at the DB layer with a confusing 500. Mitigation: ship the public-repo Zod change *first* (or at the same time as the DB change). The public order form already does not surface `'expedited'`, so the practical exposure window is near-zero, but Step 5 captures the recommended order anyway.

9. **Update both `aios/` trees.** Per `aios/CLAUDE.md` Cross-Repo Sync Rule, "Entries tied to shared state — the Supabase database schema, cross-repo business logic, shared terminology — must be mirrored into both `aios/` trees manually." This change touches the shared DB schema *and* shared service-type terminology, so the AIOS log row goes into both `aios/05_active/in-progress.md` files. (If the public repo's `aios/` tree doesn't have that file, skip the mirror and note in the implementation report.)

10. **Schema.sql is regenerated, not hand-edited.** Per the Technical Documentation Policy in `aios/CLAUDE.md`: "Do not patch outdated technical docs. Always regenerate from current implementation." The DB is the source of truth; `schema.sql` is a mirror. After Step 2 lands, run the same Management-API refresh flow that produced commit `77a5649`. If hand-editing is necessary as a temporary fallback (e.g., the Management API path is unavailable), only edit the two literal occurrences of `'expedited'` (L88 comment, L125 CHECK list) and replace with `'work'`.

### Alternatives Considered

- **A. Keep `Expedited` and just hide the pill.** Rejected — leaves a stale value in the DB CHECK and the API allowlist that nothing produces. The user explicitly wants the field retired.
- **B. Don't backfill; ALTER the CHECK to keep `'expedited'` as a legacy-allowed value.** Rejected per user direction: backfill to `'standard'`.
- **C. Add `Work` to the public order form too.** Rejected per user: admin-only for now. Captured as Future Work.
- **D. Use a Supabase CLI migration file in `supabase/migrations/`.** Rejected — this project doesn't use that flow. Adopting it for a single one-shot DDL change is overkill and would diverge from the established `Management API → schema.sql` pattern.
- **E. Treat `Work` as a new column (`service_subtype`) instead of a new value of `service_type`.** Rejected — the user asked for "a service type of 'Work'", which is exactly the `service_type` column. Don't grow the schema for an addition the existing column already accommodates.

### Open Questions

None. User confirmed: backfill to `'standard'`, tighten public Zod, add `'work'` admin-only.

---

## Step-by-Step Tasks

Run these in this exact order. Several steps cross repos and the live database; pay attention to the order callouts.

### Step 1: Verify the current state

Read-only verification before any edits.

**Actions:**

- Confirm five `expedited` matches in the admin repo and one in the public repo:
  ```bash
  grep -rn -i "expedited" sellers-compliance-admin/src/ sellers-compliance-admin/supabase/
  grep -rn -i "expedited" Sellers-Compliance/src/
  ```
  Expect:
  - Admin: `NewJobForm.tsx:15`, `NewJobForm.tsx:87`, `services/job-lifecycle.ts:47`, `supabase/schema.sql:88`, `supabase/schema.sql:125`.
  - Public: `src/app/api/inspections/route.ts:27`.
- Confirm zero existing `'work'` references:
  ```bash
  grep -rn "'work'" sellers-compliance-admin/src/ Sellers-Compliance/src/ | grep -v "node_modules"
  ```
  (Some incidental matches like CSS class `'work-...'` are fine; the literal value is what matters.)
- In Supabase SQL Editor (or `psql`), confirm the actual constraint name and current row count for `'expedited'`:
  ```sql
  SELECT conname
    FROM pg_constraint
   WHERE conrelid = 'inspections'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%service_type%';
  -- Expect: inspections_service_type_check (or similar — capture the actual name)

  SELECT count(*) AS expedited_row_count
    FROM inspections
   WHERE service_type = 'expedited';
  -- Capture this number for the implementation report.
  ```

**Files affected:**

- _(read-only)_

---

### Step 2: Apply the database change

Run the following SQL block in the Supabase dashboard's SQL Editor (single transaction). Use the constraint name captured in Step 1 if it differs from `inspections_service_type_check`.

```sql
BEGIN;

-- 2a. Backfill any existing 'expedited' rows to 'standard'.
UPDATE inspections
   SET service_type = 'standard'
 WHERE service_type = 'expedited';

-- 2b. Drop the old CHECK and re-add with the new allowlist.
ALTER TABLE inspections
  DROP CONSTRAINT inspections_service_type_check,
  ADD CONSTRAINT inspections_service_type_check
    CHECK (service_type IN ('standard','reinspection','work'));

-- 2c. Sanity check before commit.
SELECT service_type, count(*) FROM inspections GROUP BY service_type ORDER BY 1;

COMMIT;
```

**Verify:**

- The post-`COMMIT` `SELECT` should show only `standard`, `reinspection`, and (later, after admin uses the new pill) `work`. No `expedited`.
- A test `INSERT` with `service_type='expedited'` should fail with `new row for relation "inspections" violates check constraint "inspections_service_type_check"`.
- A test `INSERT` with `service_type='work'` should succeed (after Step 4 admin code lands; the DB is already permissive for it).

**Files affected:**

- Live Supabase DB (the `inspections.service_type` CHECK; rows that previously held `'expedited'`).
- _(no code file edits in this step)_

---

### Step 3: Refresh `supabase/schema.sql` from the live DB

Mirror commit `77a5649`'s pattern.

**Actions:**

- Use the Supabase Management API or the project's existing `pg_dump --schema-only` flow to regenerate `supabase/schema.sql` from the live DB.
- Verify the regenerated file shows:
  - L88-ish (now): comment line lists the new tier set, e.g. `'standard' | 'reinspection' | 'work'`.
  - L125-ish (now): `check (service_type in ('standard','reinspection','work'))`.
- If the Management API regeneration is unavailable, fall back to a precise hand-edit of those two literal occurrences only — replace `'expedited'` with `'work'` at L88 and L125. Note the deviation in the implementation report.

**Files affected:**

- `sellers-compliance-admin/supabase/schema.sql`

---

### Step 4: Update the admin form and admin validator

Edit two files in `sellers-compliance-admin`.

**Actions in `src/components/admin/jobs/NewJobForm.tsx`:**

- L15: change
  ```
  type ServiceType = 'standard' | 'expedited' | 'reinspection'
  ```
  to
  ```
  type ServiceType = 'standard' | 'reinspection' | 'work'
  ```
- L85-89: change the `serviceTypeOptions` array from
  ```
  const serviceTypeOptions: readonly [ServiceType, string][] = [
    ['standard', 'Standard'],
    ['expedited', 'Expedited'],
    ['reinspection', 'Reinspection'],
  ]
  ```
  to
  ```
  const serviceTypeOptions: readonly [ServiceType, string][] = [
    ['standard', 'Standard'],
    ['reinspection', 'Reinspection'],
    ['work', 'Work'],
  ]
  ```
  (Order: keep `Standard` first as the default; put `Work` last as the newest option.)
- Leave everything else untouched: `initialForm.service_type` stays `'standard'`, the Pill renderer (L362-372) is unchanged, the form submission body at L154 (`service_type: form.service_type`) is unchanged.

**Actions in `src/services/job-lifecycle.ts`:**

- L47: change
  ```
  const VALID_SERVICE_TYPES = ['standard', 'expedited', 'reinspection'] as const
  ```
  to
  ```
  const VALID_SERVICE_TYPES = ['standard', 'reinspection', 'work'] as const
  ```
- The exported `ServiceType` type at L52 narrows automatically via `typeof VALID_SERVICE_TYPES[number]`.

**Files affected:**

- `sellers-compliance-admin/src/components/admin/jobs/NewJobForm.tsx`
- `sellers-compliance-admin/src/services/job-lifecycle.ts`

---

### Step 5: Update the public-repo Zod enum

Edit one file in `Sellers-Compliance`.

**Important:** Per Design Decisions §8, ship this change before or simultaneously with the DB CHECK tightening (Step 2). If Step 2 has already landed in production, ship Step 5 immediately to close the brief window during which a stray request with `service_type='expedited'` could pass the API but fail at the DB.

**Actions in `Sellers-Compliance/src/app/api/inspections/route.ts`:**

- L27: change
  ```
  service_type: z.enum(['standard', 'expedited', 'reinspection']).default('standard'),
  ```
  to
  ```
  service_type: z.enum(['standard', 'reinspection', 'work']).default('standard'),
  ```

**Files affected:**

- `Sellers-Compliance/src/app/api/inspections/route.ts`

---

### Step 6: Type-check both repos

**Actions:**

- In `sellers-compliance-admin`: `npx tsc --noEmit` — must report 0 errors.
- In `Sellers-Compliance`: `npx tsc --noEmit` — must report 0 errors.
- Run `grep -rn -i "expedited" sellers-compliance-admin/src/ sellers-compliance-admin/supabase/ Sellers-Compliance/src/` — expect zero matches.
- Run `grep -rn "'work'" sellers-compliance-admin/src/services/job-lifecycle.ts sellers-compliance-admin/src/components/admin/jobs/NewJobForm.tsx Sellers-Compliance/src/app/api/inspections/route.ts` — expect at least one match per file.

**Files affected:**

- _(verification only)_

---

### Step 7: Manual smoke test in the admin dev server

**Actions:**

- `npm run dev` in `sellers-compliance-admin`. Log in. Navigate to `/admin/jobs/new`.
- In the **Service** section, confirm the pills are: **Standard** (selected by default), **Reinspection**, **Work**. Confirm no **Expedited** pill.
- Click **Work** to select it. Fill the rest of the form with a fake address/customer (or copy from a recent test job). Submit.
- Verify in Supabase:
  ```sql
  SELECT id, service_type, created_at
    FROM inspections
   ORDER BY created_at DESC
   LIMIT 3;
  ```
  Expect the just-created row to have `service_type='work'`.
- Visit `/admin/jobs` and confirm the new test job appears in the list with no rendering glitches. (`JobsTable` does not surface the service_type label, so the row should look identical to a standard job.)
- Visit the job detail page (`/admin/jobs/[id]`) for the new job and confirm no rendering errors. (Service type is not displayed there either, so it should look identical.)

**Files affected:**

- _(test only)_

---

### Step 8: Optional — manual smoke test of the public API

Confirms the public Zod enum tightening is wired correctly. Skip if the public repo isn't running locally; not load-bearing.

**Actions:**

- Start the public repo's dev server.
- POST to `/api/inspections` with `service_type: 'expedited'` in the body — expect a 400 with a Zod validation error.
- POST with `service_type: 'work'` and otherwise valid fields — expect a 200 (or whatever the endpoint's success status is) and a row inserted with `service_type='work'`.
- POST with `service_type: 'standard'` — expect success (regression check).

**Files affected:**

- _(test only)_

---

### Step 9: Update AIOS active state in both repos

Add a Recent Completions row to each repo's `aios/05_active/in-progress.md`.

**Actions:**

- Read `sellers-compliance-admin/aios/05_active/in-progress.md`.
- Insert a new row at the top of the Recent Completions table (above the existing 2026-04-28 row from the `fix-dashboard-404-metric-card-links` plan):
  ```
  | 2026-04-28 | Retire `Expedited` and add `Work` service type (plan: `plans/2026-04-28-swap-expedited-for-work-service-type.md`). Backfilled existing `expedited` rows to `standard`, dropped/re-added the `inspections.service_type` CHECK to `('standard','reinspection','work')`, refreshed `supabase/schema.sql` from live, swapped the pill in `NewJobForm.tsx`, narrowed `VALID_SERVICE_TYPES` in `services/job-lifecycle.ts`, and tightened the public-repo Zod enum at `Sellers-Compliance/src/app/api/inspections/route.ts`. New `Work` value is admin-entry-only — public order form (`/order`) untouched. |
  ```
- Mirror the same row into `Sellers-Compliance/aios/05_active/in-progress.md` if that file exists. If it doesn't exist (or its structure differs), make a best-effort adaptation; note any deviation in the implementation report.

**Files affected:**

- `sellers-compliance-admin/aios/05_active/in-progress.md`
- `Sellers-Compliance/aios/05_active/in-progress.md` (if present)

---

## Connections & Dependencies

### Files That Reference This Area

- `src/lib/actions/job-actions.ts` (`createJob`, admin) — calls `validateIntakeInput` from Step 4. After narrowing, `'expedited'` becomes a rejected value with the existing `'Invalid service type'` error message. No code change here.
- `src/types/database.ts` (admin) — types `service_type` as `string`, not as a narrowed union. No change needed.
- `Sellers-Compliance/src/app/order/page.tsx` — public customer form. Per user, **do not** edit. Continues to offer Standard + Reinspection only.
- `supabase/schema.sql` (admin) — refreshed in Step 3 from the live DB, not hand-edited.

### Updates Needed for Consistency

- `aios/05_active/in-progress.md` in both repos (Step 9).
- No other AIOS file requires updating: `aios/01_context/terminology.md`, `00_overview/product.md`, `00_overview/vision.md`, `01_context/business.md`, `01_context/users.md` — none of these reference `expedited` and the Living Document Protocol triggers (new enum, new role, new feature, new integration, etc.) are not met by this swap. `service_type` is an internal classification; the change is plumbing, not a new user-facing capability.

### Impact on Existing Workflows

- **Multi-view sync rule:** No multi-view impact. `service_type` is not surfaced in Dispatch, Command Center, the jobs list, the dispatch tile, or the job detail page. The label `Expedited`/`Work` only appears on the New Job form pill.
- **Realtime / dispatch / scheduling:** Unchanged.
- **Pricing / duration:** No code branches on `service_type === 'expedited'` or `=== 'work'` in either repo. The new value is data-only for now.
- **Public order flow:** Customers still see Standard + Reinspection. Behavior unchanged.
- **Historical `expedited` rows:** All backfilled to `'standard'`. The original tier metadata is permanently lost (acceptable per user).

---

## Validation Checklist

- [ ] Step 1 grep returned the expected six matches before edits (5 admin + 1 public).
- [ ] Step 1 SQL captured the actual CHECK constraint name and the row count for `expedited`.
- [ ] Step 2 SQL committed cleanly; post-commit `SELECT service_type, count(*) ... GROUP BY 1` shows no `expedited` rows.
- [ ] A test `INSERT` with `service_type='expedited'` is rejected by the DB.
- [ ] `supabase/schema.sql` (admin repo) shows `('standard','reinspection','work')` at the inline CHECK and updated wording in the doc comment.
- [ ] `grep -rn -i "expedited" sellers-compliance-admin/src/ sellers-compliance-admin/supabase/ Sellers-Compliance/src/` returns zero matches.
- [ ] `npx tsc --noEmit` passes with 0 errors in both repos.
- [ ] On `/admin/jobs/new`, the Service section shows three pills: Standard (default), Reinspection, Work.
- [ ] Submitting the form with **Work** selected creates a row with `service_type='work'` in `inspections`.
- [ ] The public API's POST with `service_type='expedited'` returns a Zod 400. POST with `service_type='work'` succeeds.
- [ ] Both repos' `aios/05_active/in-progress.md` have the 2026-04-28 entry (or the public repo skip is noted in the report).

---

## Success Criteria

The implementation is complete when:

1. The admin `/admin/jobs/new` form shows exactly three Service Type pills: `Standard`, `Reinspection`, `Work`.
2. The admin server-side validator, the public API's Zod enum, and the live `inspections.service_type` CHECK all enforce exactly the set `{'standard','reinspection','work'}`.
3. No row in `inspections` holds `service_type='expedited'`.
4. `supabase/schema.sql` reflects the new CHECK.
5. Both repos' AIOS Recent Completions tables document the change.

---

## Notes

- **Coordinated deploy ordering matters slightly.** The safest sequence is: Step 5 (public Zod) ships → Step 2 (DB) runs → Step 4 (admin code) ships → Step 3 (schema mirror refresh). In practice for this project (single coordinator user, low traffic, public form already not surfacing `Expedited`), the practical risk window is near-zero and Steps 2/4/5 can land back-to-back without ceremony.
- **No `supabase/migrations/` directory.** Confirmed — this project does not use Supabase CLI migrations. The DB SQL in Step 2 is run interactively in the Supabase dashboard and is not committed as a migration file. Going forward, if the project adopts a migrations directory, the SQL from Step 2 should be saved as the inaugural migration to keep the history.
- **Future work — public order form `Work` pill.** If the business later wants customers to be able to self-serve a `Work`-typed job, add a third option to `Sellers-Compliance/src/app/order/page.tsx`'s service-type cards. That'll need a customer-friendly title and description (something other than `"Work Completion"`, which is already used by `'reinspection'`) — possibly `"Compliance Work"` or similar. Out of scope here.
- **Future work — pricing / duration / scheduling logic for `Work`.** If `Work` jobs need different default duration, default pricing, or different inspector matching rules, those changes go in a follow-up plan keyed off `service_type === 'work'`. This plan adds the value as a pure classification with no behavior attached.

---

## Implementation Notes

**Implemented:** 2026-04-28

### Summary

Full retirement of `Expedited` and introduction of `Work` landed across all four layers in one coordinated change:

- **Database (Supabase live):** User ran the Step 2 SQL in the Supabase SQL Editor. Backfilled all `expedited` rows to `standard` (post-COMMIT count: 41 rows on `standard`, 0 on `expedited`, 0 on `reinspection` yet, 0 on `work` yet). Dropped and re-added the `inspections_service_type_check` constraint with the new allowlist `('standard','reinspection','work')`.
- **`supabase/schema.sql`:** Hand-edited two literal occurrences (L88 doc comment and L125 inline CHECK) to mirror the new live state. See Deviations below.
- **Admin form (`NewJobForm.tsx`):** `ServiceType` union narrowed to `'standard' | 'reinspection' | 'work'`. `serviceTypeOptions` array now: `Standard, Reinspection, Work` (in that display order).
- **Admin validator (`services/job-lifecycle.ts`):** `VALID_SERVICE_TYPES` is now `['standard', 'reinspection', 'work']`. The exported `ServiceType` type narrows automatically.
- **Public Zod (`Sellers-Compliance/src/app/api/inspections/route.ts`):** `service_type` enum is now `['standard', 'reinspection', 'work']` with default `'standard'`.
- **AIOS:** Recent Completions row added in both `aios/05_active/in-progress.md` files (admin and public repos).

`tsc --noEmit` clean in both repos.

### Deviations from Plan

- **Step 3 schema refresh used hand-edit fallback, not Management API regeneration.** The plan listed Management-API regeneration as the preferred path, with hand-editing the two literal occurrences (L88 + L125) as the documented fallback. No `scripts/` or `package.json` script for the Management-API flow exists locally, so the fallback was used. The two edits are surgical and exactly mirror the new live DB state. Next time someone does a full schema regenerate, the file should match anyway.
- **Steps 7 (admin smoke test) and 8 (optional public API smoke test) not executed.** These are operator actions requiring `npm run dev` + browser/curl, which I do not auto-run. Validation Checklist items requiring runtime verification remain unchecked pending manual smoke test.

### Issues Encountered

- During Step 2 (your manual SQL run), the first paste hit a syntax error because long inline `--` comments wrapped across lines and Postgres treated the wrapped fragments as fresh statements. Resolved by re-pasting a comment-free version. The eventual transaction committed cleanly with 41 rows on `standard` post-COMMIT.
- The shell-session `cd` into the public repo for the second `tsc` reset the cwd; resolved by re-running the check inside a `(cd ... && npx tsc --noEmit)` subshell. Public repo tsc reported zero errors.
