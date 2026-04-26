# Plan: Inspector Workload Filter, Job Detail UX Polish, Schedule Propagation

**Created:** 2026-04-26
**Status:** Implemented
**Request:** Filter Inspector Workload to inspector role only; make Smart Scheduling collapsible; reorder + highlight scheduled date/time on the job detail page; render time in 12-hour format; ensure schedule edits propagate to Dispatch, Command Center, and Jobs list.

---

## Overview

### What This Plan Accomplishes

Tightens four operator-visible papercuts on top of the recent jobs-list upgrade: the Command Center stops listing admin-only profiles in the inspector workload panel; the Smart Scheduling card on `/admin/jobs/[id]` becomes collapsible; the scheduled date/time becomes a clearly-flagged "frequently-edited" tile at the bottom of Job Details (with 12-hour time everywhere it's read); and an edit on the detail page reliably propagates to every other surface that reads schedule state.

### Why This Matters

These are all friction the dispatcher hits during the same minute-to-minute work — confirming who's actually on shift, finding the cell to move a time, and trusting that what they just typed is reflected on the dispatch board and overview before the next call. Per AIOS scheduling principles ("Schedule changes must propagate instantly", "Inspector workload must be visible") and the Multi-View Sync Rule, the cost of fixing all four together is lower than scattering them across separate sprints.

---

## Current State

### Relevant Existing Structure

- `src/lib/queries/command-center.ts` — `getInspectorWorkloads` at lines 289–363. Pulls every active profile, joins inspections-of-the-day. **Does not** filter by the `inspector` role.
- `src/components/admin/command/InspectorWorkloadSnapshot.tsx` — renders the "Inspector Workload" card at the bottom of the Command Center; has its own local `formatTimeShort` helper.
- `src/app/admin/jobs/[id]/page.tsx` — wraps Smart Scheduling, Job Details, Payments, History. Header at lines 49–55 shows scheduled time as `slice(0, 5)` (military).
- `src/components/admin/jobs/ScheduleSuggestionPanel.tsx` — Smart Scheduling. Always-rendered; no collapse affordance.
- `src/components/admin/jobs/JobEditForm.tsx` — both the read-only and edit views. Read-only field order at lines 110–162 puts Scheduled Date/Time mid-grid; line 147 prints time as `slice(0, 5)` (military). Edit view at lines 244–281 puts the dispatch-schedule grid above the client-preferences grid. Submit handler at lines 60–93 does **not** call `router.refresh()` after success.
- `src/lib/actions/job-actions.ts` — `updateJob` at lines 263–385 already revalidates `/admin/jobs`, `/admin/jobs/[id]`, `/admin/dispatch`. **Does not** revalidate `/admin` (Command Center).
- `src/hooks/use-schedule-sync.ts` + `src/components/admin/shared/ScheduleSyncClient.tsx` — realtime subscription that calls `router.refresh()` on inspections-table changes. Already mounted on `/admin` (Command Center) and `/admin/dispatch`. **Not** mounted on `/admin/jobs` or `/admin/jobs/[id]`.
- `src/lib/utils/formatting.ts` — currency/number helpers. No time helper today; four duplicate ad-hoc formatters live in `InspectorWorkloadSnapshot`, `ScheduleSuggestionPanel`, `JobBlock`, and inline strings on the detail page.

### Gaps or Problems Being Addressed

1. **Workload bug**: Cynthia Anderson is a profile with `is_active = true` but `roles = ['admin']` only. She shows up as an "inspector" on Command Center.
2. **No collapse on Smart Scheduling**: the card is permanently expanded; on a long detail page this pushes Job Details below the fold.
3. **Job Details ergonomics**:
   - Scheduled Date / Scheduled Time are buried in the middle of the grid; dispatcher can't visually anchor on them when re-scheduling.
   - Time is displayed in military format (`14:00`) on both the read-only Job Details row and the page header; everywhere else in the UI uses 12-hour.
4. **Propagation**:
   - After editing scheduled date/time on the detail page, the form returns to read-only mode but renders stale `job` props until the user manually navigates away (no `router.refresh()`).
   - `/admin` (Command Center) is not in `updateJob`'s revalidate list. The realtime hook covers most cases, but a defensive `revalidatePath('/admin')` closes the gap when realtime is delayed or disconnected.
   - `/admin/jobs` (list) and `/admin/jobs/[id]` (detail) have no realtime subscription — a change in another tab (or by another user) won't reflect until manual reload.

---

## Proposed Changes

### Summary of Changes

- Filter `getInspectorWorkloads` to profiles whose `roles` array contains `inspector`.
- Make `ScheduleSuggestionPanel` collapsible with a chevron toggle in its header. **Default collapsed** — title row only on first paint; user expands on demand.
- Reorder Job Details (read-only) and the Edit Job form so Scheduled Date / Scheduled Time / Duration appear at the bottom of the section as a single highlighted tile (SC Gold accent), below Client Requested Date / Client Time Preference.
- Add a shared `formatTime12Hour` helper in `src/lib/utils/formatting.ts`. Use it in the read-only Job Details row and the detail-page header. Leave the `<input type="time">` controls alone (browser-localized).
- Mount `<ScheduleSyncClient />` on `/admin/jobs/page.tsx` and `/admin/jobs/[id]/page.tsx` so the list and detail pages auto-refresh on any inspections-table change.
- Add `router.refresh()` to the `JobEditForm` submit handler on success so the local view rehydrates after an edit.
- Add `revalidatePath('/admin')` to `updateJob` (defensive, alongside existing revalidations).

### New Files to Create

| File Path | Purpose |
|---|---|
| _none_ | All work lives in existing files. |

### Files to Modify

| File Path | Changes |
|---|---|
| `src/lib/queries/command-center.ts` | `getInspectorWorkloads`: add `.contains('roles', ['inspector'])` to the profiles query. |
| `src/components/admin/jobs/ScheduleSuggestionPanel.tsx` | Add `isCollapsed` state (default `true`) and a chevron toggle in the header. Wrap the body (error / applied / duration / suggestions) and the Get Suggestions / Refresh button in a conditional render. |
| `src/components/admin/jobs/JobEditForm.tsx` | Reorder read-only fields so Scheduled Date/Time are at the bottom. Add a highlighted tile (border-2 border-black, bg `#EFB948`/20 SC Gold accent, neo-shadow-sm) wrapping that pair. Reorder edit-form sections: Client preferences row → highlighted Scheduled-Date/Time/Duration row → Notes. Replace `slice(0, 5)` with `formatTime12Hour(...)` in the read-only Scheduled Time row. Call `router.refresh()` after a successful `updateJob`. |
| `src/app/admin/jobs/[id]/page.tsx` | Replace `${job.scheduled_time.slice(0, 5)}` in the header (line 53) with `formatTime12Hour(job.scheduled_time)`. Mount `<ScheduleSyncClient />` at the top of the returned tree. |
| `src/app/admin/jobs/page.tsx` | Mount `<ScheduleSyncClient />` so the upgraded list page picks up cross-tab edits. |
| `src/lib/utils/formatting.ts` | Export `formatTime12Hour(time: string \| null): string`. Returns `''` for null/empty input; accepts `HH:MM` or `HH:MM:SS`; emits `h:MM AM/PM` (e.g., `2:00 PM`). |
| `src/lib/actions/job-actions.ts` | In `updateJob`, add `revalidatePath('/admin')` alongside the existing three revalidations. |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Filter inspectors via `roles` contains `inspector`, not via a separate `inspectors` table.** The codebase has converged on `profiles.roles[]` as the source of truth (see `getActiveInspectors` in `src/lib/queries/jobs.ts`). Mirroring that keeps the Command Center consistent with the inspector picker on the job detail page.
2. **Collapse Smart Scheduling, default collapsed.** Operators rarely need the suggestions panel — most schedule edits happen via direct date/time entry. Collapsing by default keeps Job Details visible above the fold; users can expand on demand.
3. **Highlight the Scheduled tile, not the individual fields.** A single yellow-bordered card around `(Scheduled Date, Scheduled Time, Duration)` reads as one anchor in both the read-only and edit views. Highlighting the inputs alone would be visually noisy.
4. **Keep Duration with Scheduled Date/Time.** The user's request specifically named date and time, but Duration is functionally part of the same edit — moving it elsewhere would split a logical group. Bundling all three preserves the current 3-column grid structure in the edit form.
5. **Shared `formatTime12Hour` in `formatting.ts`, not a new file.** That module already houses currency formatters; one more presentation helper fits there. We'll only migrate the two surfaces with documented military-time complaints; the other three ad-hoc formatters (`InspectorWorkloadSnapshot`, `ScheduleSuggestionPanel`, `JobBlock`) keep their local helpers in this plan to limit blast radius. A future cleanup can dedupe.
6. **Use existing `ScheduleSyncClient` on jobs pages, not a bespoke wrapper.** The component is already shared and battle-tested on Dispatch and Command Center. Mount-and-go.
7. **Add both `router.refresh()` and `revalidatePath('/admin')`.** Belt-and-suspenders: `router.refresh()` is the same-tab fast-path; `revalidatePath` is the safety net for any RSC cache; the realtime subscription handles cross-tab. Each layer is cheap.
8. **No DB schema changes.** All four issues are presentation/behavior fixes against the existing schema.

### Alternatives Considered

- **Add a separate `is_inspector` boolean on `profiles`**: rejected — the role array is the existing convention and adding a column requires a migration plus a backfill plan plus updates to every role-aware query. Out of scope for a UX fix.
- **Collapse the entire detail-page card containing Smart Scheduling** (instead of collapsing inside `ScheduleSuggestionPanel`): rejected — keeping the toggle inside the component keeps the page-level layout simple and means any future host of `ScheduleSuggestionPanel` inherits the affordance.
- **Move Duration out of the highlighted tile** to keep the highlight focused on date/time: rejected — see Decision 4.
- **Force 12-hour display in the `<input type="time">` widgets**: rejected — there's no portable way to do that. Browsers honor user locale; on US locales the picker is already 12-hour.
- **Add `revalidatePath('/admin')` to every action that touches `inspections`** (status change, assignment, etc.): out of scope. This plan does only `updateJob` since that's the action surfaced by the user complaint. A broader audit can follow.

### Open Questions (if any)

_Resolved before implementation:_

- **Smart Scheduling default state** → collapsed.
- **Scheduled-tile highlight color** → SC Gold (`#EFB948`) at 20% opacity over a black border, neo-shadow-sm. Matches the SC Bold brand palette without overpowering the warm-white page background.

---

## Step-by-Step Tasks

Execute in order. Each step should leave `tsc --noEmit` and `eslint` clean.

### Step 1: Filter inspector workload by role

**Actions:**

- Edit `getInspectorWorkloads` in `src/lib/queries/command-center.ts`. Update the profiles query (currently `eq('is_active', true)`) to also include `.contains('roles', ['inspector'])`.
- No call-site changes needed — `InspectorWorkloadSnapshot` already handles a shorter list and an empty state.

**Files affected:**

- `src/lib/queries/command-center.ts`

---

### Step 2: Add a 12-hour time helper

**Actions:**

- In `src/lib/utils/formatting.ts`, export:
  ```ts
  export function formatTime12Hour(time: string | null | undefined): string {
    if (!time) return ''
    const [hRaw, mRaw] = time.split(':')
    const h = Number.parseInt(hRaw ?? '', 10)
    if (!Number.isFinite(h)) return ''
    const minute = (mRaw ?? '00').padStart(2, '0').slice(0, 2)
    const period = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return `${hour12}:${minute} ${period}`
  }
  ```
- Accepts `HH:MM` and `HH:MM:SS` (Postgres `time` round-trips as the latter). Returns `''` for empty / non-parseable input so callers can `|| '—'`.

**Files affected:**

- `src/lib/utils/formatting.ts`

---

### Step 3: Make Smart Scheduling collapsible

**Actions:**

- In `src/components/admin/jobs/ScheduleSuggestionPanel.tsx`:
  - Import `ChevronDown`, `ChevronRight` from `lucide-react`.
  - Add `const [isCollapsed, setIsCollapsed] = useState(true)` — default collapsed.
  - Restructure the header row: the `<h3>` becomes a `<button type="button">` that toggles `isCollapsed` and shows the chevron based on state (`ChevronRight` when collapsed, `ChevronDown` when expanded). Keep `Sparkles` as the heading icon. Keep the "Get Suggestions" / "Refresh" button on the right side, but **only render it when expanded** (so a collapsed card is just the title row).
  - Wrap the body (error block, applied success, duration estimate, empty state, suggestion list) in `{!isCollapsed && (<>…</>)}`.
  - The `isTerminal` short-circuit at line 23 stays as-is.

**Files affected:**

- `src/components/admin/jobs/ScheduleSuggestionPanel.tsx`

---

### Step 4: Reorder + highlight Scheduled tile (read-only view)

**Actions:**

- In `src/components/admin/jobs/JobEditForm.tsx`, in the `if (!isEditing)` branch (lines 95–166):
  - Remove the existing Scheduled Date / Scheduled Time `<div>`s from their current position (lines 141–148).
  - Keep Type, Lockbox, Client, Phone, Email, Duration, Address.
  - Keep Client Requested Date and Client Time Preference (they currently appear at lines 149–156).
  - After Client Time Preference, add a highlighted tile that spans the full grid (`sm:col-span-2`) and contains a 2-column inner grid of Scheduled Date and Scheduled Time:
    ```tsx
    <div className="sm:col-span-2 rounded-lg border-2 border-black bg-[#EFB948]/20 neo-shadow-sm p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-2">
        Scheduled
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <span className="text-slate-600">Date</span>
          <p className="font-medium text-slate-900">
            {job.scheduled_date
              ? format(new Date(job.scheduled_date + 'T12:00:00'), 'MMM d, yyyy')
              : '—'}
          </p>
        </div>
        <div>
          <span className="text-slate-600">Time</span>
          <p className="font-medium text-slate-900">
            {formatTime12Hour(job.scheduled_time) || '—'}
          </p>
        </div>
      </div>
    </div>
    ```
  - Notes stays last (`sm:col-span-2`).
  - Import `format` from `date-fns` and `formatTime12Hour` from `@/lib/utils/formatting` at the top of the file.

**Files affected:**

- `src/components/admin/jobs/JobEditForm.tsx`

---

### Step 5: Reorder + highlight Scheduled tile (edit view)

**Actions:**

- In the same `JobEditForm.tsx` `<form>` branch (lines 168–315):
  - **Move** the existing "Client preferences" grid (currently lines 261–281: Client Requested Date + Client Time Preference) to appear **before** the schedule grid.
  - **Replace** the existing "Dispatch schedule" grid (lines 245–258) with a highlighted wrapper:
    ```tsx
    <div className="rounded-lg border-2 border-black bg-[#EFB948]/20 neo-shadow-sm p-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
        Scheduled (frequently edited)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit_sched_date">Scheduled Date</Label>
          <Input id="edit_sched_date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit_sched_time">Scheduled Time</Label>
          <Input id="edit_sched_time" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit_duration">Duration (min)</Label>
          <Input id="edit_duration" type="number" min="15" step="15" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
      </div>
    </div>
    ```
  - Keep Notes after this block.
  - Final order in edit mode: Job Type → Client info → Address → Lockbox → Client preferences → **Scheduled (highlighted)** → Notes → submit row.

**Files affected:**

- `src/components/admin/jobs/JobEditForm.tsx`

---

### Step 6: Refresh local view after submit

**Actions:**

- At the top of `JobEditForm.tsx`, import `useRouter` from `next/navigation` and call `const router = useRouter()` inside the component.
- In `handleSubmit`'s success path (after `await updateJob(...)` resolves and before `setIsEditing(false)`), call `router.refresh()`. The component will re-render with fresh `job` props on the next server response, picking up any trigger-computed fields (e.g., `scheduled_end`).

**Files affected:**

- `src/components/admin/jobs/JobEditForm.tsx`

---

### Step 7: Use the 12-hour helper in the detail page header

**Actions:**

- In `src/app/admin/jobs/[id]/page.tsx`:
  - Import `formatTime12Hour` from `@/lib/utils/formatting`.
  - Replace `{job.scheduled_time && \` at ${job.scheduled_time.slice(0, 5)}\`}` (line 53) with:
    ```tsx
    {job.scheduled_time && ` at ${formatTime12Hour(job.scheduled_time)}`}
    ```

**Files affected:**

- `src/app/admin/jobs/[id]/page.tsx`

---

### Step 8: Mount realtime sync on jobs list and detail

**Actions:**

- In `src/app/admin/jobs/page.tsx`, import `ScheduleSyncClient` from `@/components/admin/shared/ScheduleSyncClient` and render `<ScheduleSyncClient />` once at the top of the returned tree (e.g., right before the header `<div>`).
- In `src/app/admin/jobs/[id]/page.tsx`, do the same — mount `<ScheduleSyncClient />` once at the top of the returned `<div className="space-y-6 max-w-3xl">`.

**Files affected:**

- `src/app/admin/jobs/page.tsx`
- `src/app/admin/jobs/[id]/page.tsx`

---

### Step 9: Revalidate Command Center on `updateJob`

**Actions:**

- In `src/lib/actions/job-actions.ts`, in the `updateJob` function (lines 263–385), add `revalidatePath('/admin')` next to the existing `revalidatePath('/admin/jobs')` / `revalidatePath('/admin/jobs/${jobId}')` / `revalidatePath('/admin/dispatch')` calls.

**Files affected:**

- `src/lib/actions/job-actions.ts`

---

### Step 10: Validate

**Actions:**

- Run `npx tsc --noEmit` — must be 0 errors.
- Run `npx eslint src/lib/queries/command-center.ts src/lib/utils/formatting.ts src/lib/actions/job-actions.ts src/components/admin/jobs/ScheduleSuggestionPanel.tsx src/components/admin/jobs/JobEditForm.tsx src/app/admin/jobs/page.tsx src/app/admin/jobs/[id]/page.tsx` — no new warnings.
- Manual browser checks (note inability to drive in this session — list as follow-up):
  - Command Center → Inspector Workload contains only inspectors; Cynthia Anderson is gone.
  - `/admin/jobs/[id]`: Smart Scheduling header now has a chevron; clicking it collapses/expands the card body.
  - Job Details (read-only): Scheduled tile is at the bottom, yellow-bordered, time renders as `2:00 PM`.
  - Edit Job: Scheduled grid is at the bottom, yellow-bordered, with date/time/duration.
  - Edit a job's scheduled date or time → Save. Local read-only view reflects the new value without a manual reload. Open `/admin/dispatch` and `/admin` and `/admin/jobs` in other tabs → all three update within ~1 second.
- Update `aios/05_active/in-progress.md` with a Recent Completions row.

**Files affected:**

- `aios/05_active/in-progress.md`

---

### Step 11: Commit

**Actions:**

- Single commit: `feat(jobs): collapse smart scheduling, highlight scheduled tile, propagate edits`. Co-authored trailer per repo convention.

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/admin/page.tsx` — Command Center page; imports `getInspectorWorkloads` and `InspectorWorkloadSnapshot`. No code change here, but its rendered output changes as a result of Step 1.
- `src/components/admin/dispatch/DispatchClient.tsx` — already mounts `useScheduleSync()` directly. Continues to work unchanged.
- `src/lib/actions/dispatch-actions.ts` (`scheduleFromDispatch`, `updateJobTime`) — also writes scheduled_time. **Out of scope** for this plan but a candidate for the same `revalidatePath('/admin')` follow-up.
- `src/components/admin/dispatch/JobBlock.tsx`, `src/components/admin/jobs/ScheduleSuggestionPanel.tsx`, `src/components/admin/command/InspectorWorkloadSnapshot.tsx` — each contains a local `formatTime12Hour`-equivalent. We do **not** migrate them in this plan to limit blast radius; a follow-up cleanup can dedupe against `formatting.ts`.

### Updates Needed for Consistency

- `aios/05_active/in-progress.md` — append a "Recent Completions" row noting the four changes.
- No `aios/02_architecture/data-model.md` changes (no schema impact).
- No `aios/01_context/terminology.md` changes (no new domain terms).

### Impact on Existing Workflows

- `/prime` and `/implement` are unaffected.
- `/admin/dispatch` continues to drive realtime via its own `useScheduleSync`. Adding `<ScheduleSyncClient />` to two more routes adds two more channel subscriptions per active session, which is well within Supabase realtime limits.

---

## Validation Checklist

- [ ] `getInspectorWorkloads` filters by `roles` containing `inspector`.
- [ ] Cynthia Anderson (admin-only) no longer appears in the Command Center inspector workload list.
- [ ] Smart Scheduling card on `/admin/jobs/[id]` is **collapsed on first paint** (title row only).
- [ ] Clicking the chevron in the Smart Scheduling header expands the body; clicking again collapses it.
- [ ] When collapsed, the "Get Suggestions" button is hidden (only the title row is visible).
- [ ] Highlighted Scheduled tile uses SC Gold (`#EFB948`) at 20% opacity, with `border-2 border-black` and `neo-shadow-sm`.
- [ ] Job Details (read-only) lists fields in this order: Type, Lockbox, Client, Phone, Email, Duration, Address, Client Requested Date, Client Time Preference, **highlighted Scheduled tile**, Notes.
- [ ] Edit Job (form) lists sections in this order: Job Type, Client info, Address, Lockbox, Client preferences, **highlighted Scheduled grid (Date / Time / Duration)**, Notes, Submit.
- [ ] Read-only Scheduled Time renders as `2:00 PM`, not `14:00`.
- [ ] Detail-page header subtitle ("at HH:MM") renders 12-hour format.
- [ ] Saving a job edit triggers `router.refresh()`; the read-only view shows the new values without a manual page reload.
- [ ] `updateJob` revalidates `/admin` (Command Center) in addition to its existing three paths.
- [ ] `<ScheduleSyncClient />` is mounted on `/admin/jobs` and `/admin/jobs/[id]`.
- [ ] In a second tab, editing the schedule on the detail page propagates to the dispatch board, the Command Center inspector workload counts, and the jobs list within ~1s.
- [ ] `tsc --noEmit` clean.
- [ ] `eslint` clean on all changed files.
- [ ] `aios/05_active/in-progress.md` updated with a Recent Completions entry.

---

## Success Criteria

1. The Command Center inspector workload list is restricted to profiles whose `roles` contain `inspector` — no admin-only profiles slip through.
2. Dispatchers can collapse the Smart Scheduling card to keep Job Details above the fold.
3. Scheduled Date and Scheduled Time are visually anchored at the bottom of Job Details (both read-only and edit) and time renders in 12-hour format on every read surface inside the detail page.
4. Editing scheduled date or scheduled time on the detail page is reflected in (a) the same page's read-only view immediately, (b) the Dispatch board, (c) the Command Center, and (d) the Jobs list — without manual reload.

---

## Notes

- The realtime hook subscribes to **all** column changes on `inspections` and only refreshes when one of the seven `SCHEDULING_FIELDS` changes (`use-schedule-sync.ts:7-15`). Edits to non-scheduling columns (e.g., `admin_notes`) won't cause unrelated refresh storms.
- The four ad-hoc 12-hour formatters scattered across `JobBlock`, `ScheduleSuggestionPanel`, `InspectorWorkloadSnapshot`, and `JobEditForm` are now functionally duplicated by `formatting.formatTime12Hour`. A follow-up cleanup plan should dedupe — out of scope here.
- If we ever switch the default Smart Scheduling state to collapsed, persist the toggle in `localStorage` so power-users keep their preference between visits. Out of scope for v1.
- F4 (status enum drift) is unrelated to these changes and is tracked separately.

---

## Implementation Notes

**Implemented:** 2026-04-26

### Summary

All four asks landed in one pass without touching the schema:

- **Inspector Workload**: added `.contains('roles', ['inspector'])` to `getInspectorWorkloads` in `command-center.ts`. Admin-only profiles (e.g., Cynthia Anderson) are now excluded.
- **Smart Scheduling collapse**: `ScheduleSuggestionPanel` now starts collapsed (chevron-right + title row only). Clicking the title toggles `isCollapsed`; the Get Suggestions / Refresh button and the body (errors, applied, duration, suggestions) only render when expanded.
- **Job Details reorder + highlight + 12-hour time**: in both the read-only and edit views, Scheduled Date/Time (+ Duration in edit) now live in a SC Gold tile (`bg-[#EFB948]/20`, `border-2 border-black`, `neo-shadow-sm`) at the bottom of the section, below Client Requested Date / Client Time Preference. Read-only Time uses the new `formatTime12Hour` helper. The detail-page header subtitle ("at HH:MM") also uses the helper.
- **Propagation**: `JobEditForm.handleSubmit` calls `router.refresh()` after a successful `updateJob`. `updateJob` now revalidates `/admin` alongside its existing three paths. `<ScheduleSyncClient />` is mounted on `/admin/jobs` and `/admin/jobs/[id]` so cross-tab realtime sync covers both pages (Dispatch and Command Center already had it).
- **Shared helper**: `formatTime12Hour(time)` lives in `src/lib/utils/formatting.ts`; accepts `HH:MM` or `HH:MM:SS`, returns `''` for null/empty/non-parseable input.

### Deviations from Plan

None. Plan was followed step-for-step. Decisions confirmed mid-plan: Smart Scheduling defaults collapsed; tile uses SC Gold (`#EFB948` at 20% opacity) over a black border with neo-shadow-sm.

### Issues Encountered

- The `posttooluse-validate: nextjs` hook flagged `params.status` / `params.scope` on `/admin/jobs/page.tsx` as needing `await` — false positive. The `params` variable is the result of `await searchParams` on the line above; the validator pattern-matches the name `params` without seeing the prior `await`. Skipped per same precedent as the prior implementation session.
- Browser-driven validations from the plan's checklist (collapsed-on-first-paint, cross-tab realtime propagation, mobile breakpoint) were not driven from this session — verify in the browser when convenient.
