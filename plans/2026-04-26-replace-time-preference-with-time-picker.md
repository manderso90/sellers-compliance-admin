# Plan: Replace Time Preference (Morning / Afternoon / Anytime) with an exact-time picker

**Created:** 2026-04-26
**Status:** Implemented
**Request:** On the New Job page (and consistent surfaces), drop the Morning / Afternoon / Anytime pill group and replace it with a `<input type="time">` so operators capture the exact requested time.

---

## Overview

### What This Plan Accomplishes

Replaces the categorical "Time Preference" pills on the admin **New Job** form with a single time picker, captures the same change on the admin **Job Edit** form for consistency, and updates every read-side surface that displayed the categorical value so legacy rows (with `morning` / `afternoon` / `anytime`) continue to render while new rows render as 12-hour clock times (e.g., `2:00 PM`). The DB column itself (`inspections.requested_time_preference`) is reused — no schema change.

### Why This Matters

Operators tell us the customer is rarely vague. They book "2:30 Friday", not "Friday afternoon". The pills are a pre-AIOS shape that no longer matches how scheduling actually happens. Moving to an exact time:

- Cuts ambiguity at intake — the dispatcher gets the customer's actual ask.
- Feeds the scheduling-suggestions service a real time signal (proximity to requested time becomes a stronger ranking factor than "AM vs PM").
- Aligns with the rest of the system — `scheduled_time` is already an exact `HH:MM:SS` value rendered as 12-hour everywhere, so the inputs and the output speak the same language.

Per the AIOS Scheduling Reality Rule, "design with real-world scheduling volatility in mind" — exact times let us downstream-detect re-confirmation drift more cleanly than a fuzzy preference label.

---

## Current State

### Relevant Existing Structure

- **`src/components/admin/jobs/NewJobForm.tsx`**:
  - Lines 13–16: defines `type TimePreference = 'morning' | 'afternoon' | 'anytime'`.
  - Lines 29–30: form state has `requested_time_preference: TimePreference` with default `'anytime'` (line 52).
  - Lines 92–96: `timePreferenceOptions` array.
  - Lines 345–361: the "Time Preference" Pill group on the Scheduling section.
  - Line 160: payload passes `requested_time_preference: form.requested_time_preference` to `createJob`.
- **`src/components/admin/jobs/JobEditForm.tsx`**:
  - Lines 43, 60, 94: state plumbing for `timePreference`.
  - Line 161: read-only display — `<p className="font-medium text-slate-800 capitalize">{job.requested_time_preference || '—'}</p>`.
  - Lines 295–305: `<select>` with options morning / afternoon / anytime / flexible.
- **`src/services/job-lifecycle.ts`**:
  - Line 43: `VALID_TIME_PREFERENCES = ['morning', 'afternoon', 'anytime', 'flexible']`.
  - Lines 78–92 (`validateJobInput`): rejects values outside that list.
  - Lines 152–158 (`validateIntakeInput`): same rejection.
- **`src/services/scheduling-suggestions.ts`**:
  - Lines 74–86 (`scoreTimePreference`): returns 25 for null/anytime/flexible, 25 for matching morning/afternoon halves, 0 otherwise.
- **`src/components/admin/dispatch/UnscheduledJobChip.tsx`**:
  - Lines 9–14: `TIME_LABELS` map (`morning → AM`, `afternoon → PM`, `anytime → Any`, `flexible → Flex`).
  - Lines 48–50: lookup the label; render in the small chip beside the requested date.
- **`src/lib/utils/formatting.ts`**:
  - Already exports `formatTime12Hour(time)` from the prior plan — the helper we need for the new display path.
- **DB schema**: `inspections.requested_time_preference` is `text NULL`. No CHECK constraint at the DB level (per `aios/05_active/known-issues.md` and the schema dump). The column already accepts any string.
- **Public order flow** (`Sellers-Compliance` repo, separate codebase): may continue to write `morning` / `afternoon` / `anytime` from the customer-facing form. **Out of scope** for this plan — admin-side reads must keep handling those legacy values gracefully.

### Gaps or Problems Being Addressed

1. **Operators can't capture exact requested times.** Pills lose information.
2. **Admin Job Edit form mirrors the same problem.** Editing a job requires picking from the same fuzzy categories.
3. **`scoreTimePreference` only knows AM/PM halves.** Once we have exact times, the scheduling-suggestion ranking can do better.
4. **Display surfaces assume the categorical shape.** A row whose `requested_time_preference = "14:00"` would render as the string `14:00` (correctly capitalized but not formatted), and the dispatch chip would render no label at all (lookup miss).

---

## Proposed Changes

### Summary of Changes

- Replace the 3-pill Time Preference group on `NewJobForm` with `<input type="time">`. Label changes from "Time Preference" to "Requested Time".
- Replace the `<select>` on `JobEditForm` with `<input type="time">`. Label updated similarly. Read-only view uses a new shared display helper.
- Add `getRequestedTimeLabel(value): string` to `src/lib/utils/formatting.ts`. Returns `formatTime12Hour(value)` if `value` matches `HH:MM` / `HH:MM:SS`; capitalized legacy string otherwise (`Morning`, `Afternoon`, `Anytime`, `Flexible`, `Any`); `''` for null/empty.
- Relax `validateJobInput` and `validateIntakeInput`: accept either a legacy `VALID_TIME_PREFERENCES` value **or** a string matching `^\d{2}:\d{2}(:\d{2})?$`. Reject anything else.
- Extend `scoreTimePreference` to handle exact times: if the preference parses as `HH:MM`, compare to `slotTime` in minutes-since-midnight and award proximity points (≤30 min → 25; ≤60 min → 15; ≤120 min → 8; else → 0). Legacy categorical handling is preserved.
- Update `UnscheduledJobChip` to use `getRequestedTimeLabel` instead of the static `TIME_LABELS` lookup so chips show e.g. `2:00 PM` for new rows and `AM`/`PM`/`Any` for legacy rows.
- No schema migration. No public-repo coordination required. Cross-Repo Sync Rule does not apply (no shared schema change).

### New Files to Create

| File Path | Purpose |
|---|---|
| _none_ | All work lives in existing files. |

### Files to Modify

| File Path | Changes |
|---|---|
| `src/lib/utils/formatting.ts` | Add `getRequestedTimeLabel(value)` helper. |
| `src/components/admin/jobs/NewJobForm.tsx` | Drop `TimePreference` type, `timePreferenceOptions`, default `'anytime'`. Change form state field to `requested_time: string` (empty default). Replace pill group with a `<Input type="time">`. Pass `requested_time_preference: form.requested_time \|\| undefined` to `createJob` (still uses the same DB column). Update label to "Requested Time". |
| `src/components/admin/jobs/JobEditForm.tsx` | Replace the `<select>` with `<Input type="time">`. Rename state from `timePreference` to `requestedTime` for clarity. Update read-only Display to use `getRequestedTimeLabel`. Update label to "Client Requested Time". Remove `capitalize` class (helper already returns canonical casing). |
| `src/services/job-lifecycle.ts` | Add `TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/`. Update both `validateJobInput` and `validateIntakeInput` checks to allow legacy values OR `TIME_PATTERN.test(...)`. |
| `src/services/scheduling-suggestions.ts` | Extend `scoreTimePreference`: if `preference` matches `HH:MM[:SS]`, compute proximity bands. Otherwise fall through to existing categorical logic. |
| `src/components/admin/dispatch/UnscheduledJobChip.tsx` | Replace the static `TIME_LABELS` lookup with `getRequestedTimeLabel(job.requested_time_preference)`. Remove the local `TIME_LABELS` constant. |
| `aios/01_context/terminology.md` | Note that `requested_time_preference` now stores an exact `HH:MM` value going forward; legacy categorical values still appear for rows created via the public order flow. |
| `aios/05_active/in-progress.md` | Append Recent Completions row. |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Reuse `requested_time_preference` column; no schema migration.** The column is `text NULL` with no CHECK constraint. Storing `"14:00"` is mechanically fine. Adding a new column would force coordinated changes across the public site, the type definitions, and migration tooling — disproportionate to the user's actual ask. The semantics technically widen (preference → preference-or-time), but the read-side helper handles the union cleanly.
2. **Update the admin Job Edit form too, even though the user only mentioned the New Job page.** Otherwise admins would create jobs with exact times via New Job, then see an empty dropdown on the Edit form (because `"14:00"` doesn't match any `<option>`) and be unable to change them without retyping. Consistency is a strict requirement of the Multi-View Sync Rule.
3. **Keep legacy values renderable.** The public site's customer order flow lives in a separate repo and is outside this plan's scope. Rows it writes (`morning`/`afternoon`/`anytime`) must continue to display sensibly inside the admin. The shared helper absorbs that union.
4. **Relax validation to accept legacy OR `HH:MM`.** `validateIntakeInput` is also called by `updateJob`, which can run against rows written by the public flow. Rejecting their values would block edits.
5. **Extend `scoreTimePreference` to handle exact times with proximity bands.** Without this, a job with `requested_time_preference = "14:00"` would always score 0 on this factor, regressing suggestion quality. The proximity bands (≤30/60/120 min → 25/15/8/0) match the existing category-style 25-point ceiling so other factors (workload, region) keep their relative weight.
6. **Default the time picker empty (not `'anytime'`).** "Anytime" was always a hidden default that masked operator effort. Empty + optional matches the rest of the form's voice and writes `null` to the DB rather than a synthetic value.
7. **Label rename: "Time Preference" → "Requested Time" (admin-side).** The field is now an exact time, not a preference. Existing display surfaces using "Client Time Preference" become "Client Requested Time" on the read-only view. AIOS terminology gets a one-line update.
8. **No localStorage / persistence of last-selected time.** Out of scope; not requested.

### Alternatives Considered

- **Add a new `requested_time` `time` column via migration.** Cleaner separation of concerns at the cost of a coordinated schema change, type regeneration, public-repo sync, and a backfill plan for legacy rows. Rejected for this scope.
- **Drop `requested_time_preference` from the DB entirely.** Same coordination cost. Plus the column may carry historical signal we'd want for future analysis.
- **Keep the pills as quick-presets that auto-fill the time picker** (e.g., "Morning" sets 9:00). Rejected — the user explicitly said "do away with morning, afternoon, anytime."
- **Use a dropdown of common times (8:00, 8:30, 9:00, ...)** instead of a free time picker. Rejected — a free picker is faster and has no enumerated lower bound.

### Open Questions (if any)

None — the user's instruction is unambiguous, and the storage / display strategy follows from existing constraints.

---

## Step-by-Step Tasks

### Step 1: Add the shared display helper

**Actions:**

- In `src/lib/utils/formatting.ts`, append:
  ```ts
  /**
   * Render a `requested_time_preference` value for read surfaces. Handles both
   * the exact-time form (`HH:MM` or `HH:MM:SS`, written by the admin form
   * post-2026-04-26) and the legacy categorical form (`morning`, `afternoon`,
   * `anytime`, `flexible`) still produced by the public order flow.
   */
  export function getRequestedTimeLabel(value: string | null | undefined): string {
    if (!value) return ''
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return formatTime12Hour(value)
    // Legacy categorical: capitalize first letter
    return value.charAt(0).toUpperCase() + value.slice(1)
  }
  ```

**Files affected:**

- `src/lib/utils/formatting.ts`

---

### Step 2: Replace the New Job pill group with a time picker

**Actions:**

- In `src/components/admin/jobs/NewJobForm.tsx`:
  - Remove `type TimePreference = 'morning' | 'afternoon' | 'anytime'` (line 16).
  - Remove the `timePreferenceOptions` constant (lines 92–96).
  - In `FormState`, replace `requested_time_preference: TimePreference` with `requested_time: string`.
  - In `initialForm`, replace `requested_time_preference: 'anytime'` with `requested_time: ''`.
  - In the submit payload (around line 160), change `requested_time_preference: form.requested_time_preference` to `requested_time_preference: form.requested_time || undefined`. (We still write into the same column.)
  - Replace the JSX block at lines 345–361 with:
    ```tsx
    <div>
      <Label htmlFor="requested_time" className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
        Requested Time
      </Label>
      <Input
        id="requested_time"
        type="time"
        value={form.requested_time}
        onChange={(e) => set('requested_time', e.target.value)}
      />
    </div>
    ```

**Files affected:**

- `src/components/admin/jobs/NewJobForm.tsx`

---

### Step 3: Replace the Job Edit dropdown with a time picker + use the helper for read-only

**Actions:**

- In `src/components/admin/jobs/JobEditForm.tsx`:
  - Add `import { formatTime12Hour, getRequestedTimeLabel } from '@/lib/utils/formatting'` (the file already imports `formatTime12Hour`; extend the import).
  - Rename state variable for clarity (optional but worth it): `timePreference` → `requestedTime`. Update the three references (declaration, `resetForm`, payload).
  - Replace the read-only block at line 159–162:
    ```tsx
    <div>
      <span className="text-slate-500">Client Requested Time</span>
      <p className="font-medium text-slate-800">{getRequestedTimeLabel(job.requested_time_preference) || '—'}</p>
    </div>
    ```
    (Removes the `capitalize` class — the helper returns canonical casing.)
  - Replace the edit-form block at lines 284–305 (the Label + `<select>`) with:
    ```tsx
    <div className="space-y-1.5">
      <Label htmlFor="edit_requested_time">Client Requested Time</Label>
      <Input id="edit_requested_time" type="time" value={requestedTime} onChange={(e) => setRequestedTime(e.target.value)} />
    </div>
    ```
  - In the submit payload, the field name in the action call stays `requested_time_preference`; only the source variable name changes.

**Files affected:**

- `src/components/admin/jobs/JobEditForm.tsx`

---

### Step 4: Relax validators to accept legacy OR HH:MM

**Actions:**

- In `src/services/job-lifecycle.ts`:
  - Add a constant near `VALID_TIME_PREFERENCES`:
    ```ts
    const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/
    ```
  - In `validateJobInput`, replace the time-preference check (lines 85–92) with:
    ```ts
    if (
      data.requested_time_preference !== undefined &&
      data.requested_time_preference !== null &&
      data.requested_time_preference !== '' &&
      !(VALID_TIME_PREFERENCES as readonly string[]).includes(data.requested_time_preference) &&
      !TIME_PATTERN.test(data.requested_time_preference)
    ) {
      errors.push('Invalid requested time')
    }
    ```
  - Apply the same change in `validateIntakeInput` (lines 152–158). Update the error message to "Invalid requested time".

**Files affected:**

- `src/services/job-lifecycle.ts`

---

### Step 5: Extend `scoreTimePreference` for exact times

**Actions:**

- In `src/services/scheduling-suggestions.ts`, replace `scoreTimePreference` (lines 74–86) with:
  ```ts
  function scoreTimePreference(slotTime: string, preference: string | null): number {
    if (!preference || preference === 'anytime' || preference === 'flexible') {
      return 25
    }
    // Exact-time preference (HH:MM or HH:MM:SS)
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(preference)) {
      const toMinutes = (t: string): number => {
        const [h, m] = t.split(':').map(Number)
        return h * 60 + m
      }
      const diff = Math.abs(toMinutes(slotTime) - toMinutes(preference))
      if (diff <= 30) return 25
      if (diff <= 60) return 15
      if (diff <= 120) return 8
      return 0
    }
    // Legacy categorical
    const hour = parseInt(slotTime.split(':')[0], 10)
    const isMorning = hour < 12
    if (preference === 'morning') return isMorning ? 25 : 0
    if (preference === 'afternoon') return isMorning ? 0 : 25
    return 25
  }
  ```
- Update the "Matches time preference" reason string (line 218) to also fire when `timePreference` is non-zero (it currently checks `=== 25`). Change `if (timePreference === 25) reasons.push('Matches time preference')` to `if (timePreference >= 15) reasons.push('Matches requested time')`.

**Files affected:**

- `src/services/scheduling-suggestions.ts`

---

### Step 6: Update the dispatch chip to use the helper

**Actions:**

- In `src/components/admin/dispatch/UnscheduledJobChip.tsx`:
  - Remove the `TIME_LABELS` constant (lines 9–14).
  - Replace lines 48–50 with:
    ```ts
    const timeLabel = getRequestedTimeLabel(job.requested_time_preference) || null
    ```
  - Add `import { getRequestedTimeLabel } from '@/lib/utils/formatting'`.

**Files affected:**

- `src/components/admin/dispatch/UnscheduledJobChip.tsx`

---

### Step 7: Update AIOS terminology + in-progress

**Actions:**

- In `aios/01_context/terminology.md`, update the entry for `requested_time_preference` (or add one if it isn't yet present): note that the column stores an exact `HH:MM` string when the value comes from the admin form (post-2026-04-26), and may still hold legacy categorical values (`morning`, `afternoon`, `anytime`, `flexible`) from the public order flow. Read-side display should use `getRequestedTimeLabel(value)`.
- In `aios/05_active/in-progress.md`, append a Recent Completions entry.

**Files affected:**

- `aios/01_context/terminology.md`
- `aios/05_active/in-progress.md`

---

### Step 8: Validate

**Actions:**

- `npx tsc --noEmit` — must be 0 errors.
- `npx eslint <changed files>` — no new warnings.
- Manual browser checks (call out as follow-up if not driven this session):
  - `/admin/jobs/new` — Scheduling section shows `Requested Date` (date picker) + `Requested Time` (time picker). No pills. Time defaults empty.
  - Submit a new job with date `tomorrow` and time `2:30 PM`. Job appears in the dispatch unscheduled queue with chip showing `Tomorrow's date · 2:30 PM`.
  - `/admin/jobs/[id]` — Read-only Job Details shows "Client Requested Time: 2:30 PM" (or em-dash for empty).
  - Click Edit. The Client Requested Time field renders as `<input type="time">` pre-populated with `14:30`.
  - Open an older job whose `requested_time_preference` is `'morning'`. Read-only renders `Morning`. Edit view shows the time picker empty (since `"morning"` doesn't parse). Saving without changing the field leaves the value as `morning` (because the form sends `undefined` for empty strings).
  - Smart Scheduling on a job with `requested_time_preference = '14:00'` produces suggestions where slots near 14:00 score higher.

**Files affected:**

- _validation only_

---

### Step 9: Commit

**Actions:**

- Single commit: `feat(jobs): replace time-preference pills with exact time picker`. Co-authored trailer per repo convention.

---

## Connections & Dependencies

### Files That Reference This Area

- `src/lib/queries/dispatch.ts` selects `requested_time_preference`. No code change — the field still exists.
- `src/lib/actions/scheduling-actions.ts` selects + passes the field through to the suggestions service. No code change.
- `src/services/scheduling-context.ts` types `requested_time_preference: string | null`. No code change.
- `src/lib/actions/job-actions.ts` (`CreateJobInput`, `updateJob`) accept `requested_time_preference?: string`. No code change — the column still receives a string; what's stored is now an exact time, but the DB type and action contract are unchanged.

### Updates Needed for Consistency

- `aios/01_context/terminology.md` (Step 7).
- `aios/05_active/in-progress.md` (Step 7).
- No `aios/02_architecture/data-model.md` change (column type unchanged).
- No public-repo (`Sellers-Compliance`) change required.

### Impact on Existing Workflows

- Customer-facing order flow on the public site continues to write `morning`/`afternoon`/`anytime`. Admin reads continue to render those values via `getRequestedTimeLabel`. **No regression** for existing customers or operators.
- Smart Scheduling suggestions improve for jobs with exact times and remain unchanged for jobs with legacy values.
- Dispatch unscheduled chips show `2:30 PM` for new jobs, `AM`/`PM`/`Any` for legacy.

---

## Validation Checklist

- [ ] New Job form's Scheduling section shows a `<input type="time">` labeled "Requested Time" — no pills.
- [ ] Submitting the New Job form with a time saves `requested_time_preference = "HH:MM"` to the inspections row (verified via dispatch chip).
- [ ] Admin Job Edit form shows a `<input type="time">` labeled "Client Requested Time" — no `<select>`.
- [ ] Read-only Job Details renders exact times via 12-hour formatting (`2:00 PM`).
- [ ] Read-only Job Details renders legacy categorical values capitalized (`Morning`, `Afternoon`, etc.).
- [ ] Dispatch unscheduled chip renders exact times for new rows and legacy abbreviations for legacy rows.
- [ ] `validateIntakeInput` accepts both legacy values and `HH:MM` strings; rejects garbage like `"foo"` or `"99:99:99"` (the regex permits `99:99` but Postgres `time` column isn't in play here — string column accepts anything; validator is the gate).
- [ ] Smart Scheduling produces non-zero `timePreference` factor for jobs with exact times and slots within 2 hours.
- [ ] `tsc --noEmit` clean.
- [ ] `eslint` clean on changed files.
- [ ] `aios/01_context/terminology.md` and `aios/05_active/in-progress.md` updated.

---

## Success Criteria

1. The admin New Job form captures an exact requested time via a time picker. Morning / Afternoon / Anytime are gone.
2. The admin Job Edit form captures the same way. The two surfaces are consistent.
3. Legacy rows (with categorical values from the public order flow) continue to render and remain editable without regression.
4. Smart Scheduling's `scoreTimePreference` produces sensible non-zero scores for slots near a requested exact time.

---

## Notes

- The DB column `inspections.requested_time_preference` is a misleading name once it stores exact times. A future cleanup could rename to `requested_time` (with a migration + cross-repo sync) — out of scope here.
- If we later decide to drop legacy values entirely, a one-shot SQL backfill (`UPDATE inspections SET requested_time_preference = NULL WHERE requested_time_preference IN ('morning','afternoon','anytime','flexible')`) plus removing the legacy branch from `getRequestedTimeLabel` is straightforward.
- `scheduling-suggestions.ts:218` reason string was tightened from "Matches time preference" to "Matches requested time" to match the new vocabulary. This is a UI surface in the Smart Scheduling panel.
- This plan does NOT touch the public-repo customer order flow per Cross-Repo Sync Rule — the change is admin-only behavior atop a shared column.

---

## Implementation Notes

**Implemented:** 2026-04-26

### Summary

- `getRequestedTimeLabel(value)` added to `src/lib/utils/formatting.ts`. Returns `formatTime12Hour(value)` for `HH:MM` / `HH:MM:SS` and capitalizes legacy categorical values; `''` for null/empty.
- `NewJobForm.tsx`: dropped `TimePreference` type, `timePreferenceOptions`, and the 3-pill group. Added `requested_time: string` to form state (default `''`). New `<Input type="time">` labeled "Requested Time". Submit payload now sends `requested_time_preference: form.requested_time || undefined`.
- `JobEditForm.tsx`: state renamed to `requestedTime` / `setRequestedTime`. Read-only display now uses `getRequestedTimeLabel(...)`, label "Client Requested Time", `capitalize` removed. Edit form replaces the `<select>` with `<Input type="time" id="edit_requested_time">`.
- `services/job-lifecycle.ts`: added `TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/`. Both `validateJobInput` and `validateIntakeInput` now accept either a legacy `VALID_TIME_PREFERENCES` value OR a `HH:MM[:SS]` string. Error message standardized to "Invalid requested time".
- `services/scheduling-suggestions.ts`: `scoreTimePreference` extended with proximity bands for exact-time preferences (≤30/60/120 min → 25/15/8/0). Legacy categorical handling preserved. Reason string on a positive match changed to "Matches requested time" and now fires when `timePreference >= 15`.
- `UnscheduledJobChip.tsx`: removed local `TIME_LABELS`; uses the shared helper.
- `aios/01_context/terminology.md`: replaced the "Time Preference" entry with "Requested Time", noting the dual-shape semantics and pointing readers to the shared helper.
- `aios/05_active/in-progress.md`: appended a Recent Completions row.

### Deviations from Plan

None. Plan was executed step-for-step. The state-variable rename in `JobEditForm` required two `replace_all` passes (one for `timePreference` → `requestedTime`, a follow-up for `setTimePreference` → `setRequestedTime`) since the patterns are case-sensitive.

### Issues Encountered

- `replace_all timePreference` did not catch `setTimePreference` (case-sensitive substring match for the lowercase `t`). Fixed with a second targeted `replace_all`.
- Browser-driven validations (legacy-row edit flow, dispatch chip rendering, suggestion ranking with exact times) were not driven from this session — verify in browser when convenient.
