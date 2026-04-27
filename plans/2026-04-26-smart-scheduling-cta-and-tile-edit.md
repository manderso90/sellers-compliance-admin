# Plan: Smart Scheduling CTA on collapsed header + Edit shortcut on Scheduled tile

**Created:** 2026-04-26
**Status:** Implemented
**Request:** Two follow-up tweaks to the just-shipped job-detail polish: keep the "Get Suggestions" button visible while the Smart Scheduling card is collapsed (so it's a one-click action), and add a quick-action Edit button inside the SC Gold Scheduled tile that focuses the Scheduled Date input on entry.

---

## Overview

### What This Plan Accomplishes

Removes one click from the Smart Scheduling flow (the yellow CTA is now visible whether the card is collapsed or expanded — clicking it auto-expands and fires the request). Adds a second Edit affordance inside the highlighted Scheduled tile so dispatchers don't have to scroll to the top of Job Details when they want to nudge a date or time. Both changes are localized to two existing components — no new files, no schema, no actions.

### Why This Matters

Per the AIOS scheduling principles ("Speed of scheduling", "Minimal user friction") and the Multi-View Sync Rule, the cost of an extra click compounds across a 60–90 calls/day workflow. Putting the primary CTAs where the operator's eye already is — directly on the Smart Scheduling header and inside the Scheduled tile — is exactly the kind of "every interaction should be fast" tightening the system was built for.

---

## Current State

### Relevant Existing Structure

- `src/components/admin/jobs/ScheduleSuggestionPanel.tsx` (lines 87–123): the panel header is a flex row. Left side is the chevron + Sparkles + "Smart Scheduling" toggle button. Right side is the "Get Suggestions" / "Refresh" button — currently wrapped in `{!isCollapsed && (...)}` so it disappears on collapse.
- `src/components/admin/jobs/JobEditForm.tsx`:
  - Lines 100–113: Read-only header with the "Job Details" title and the existing top-right Edit button (`onClick={() => setIsEditing(true)}`).
  - Lines 154–174 (approximately, post the prior plan): the SC Gold Scheduled tile — a `<div>` containing a small "SCHEDULED" caption and a 2-col grid of Date / Time. No Edit button inside.
  - Edit form input `<Input id="edit_sched_date" type="date" ...>` exists at the top of the highlighted edit-form tile.
- `src/components/ui/button.tsx` — the shared Button component used by the existing top-right Edit button (variant `outline`, size default).
- `lucide-react` provides the `Pencil` icon already imported in `JobEditForm.tsx`.

### Gaps or Problems Being Addressed

1. **Smart Scheduling CTA hidden behind collapse**: today, a dispatcher needs to click the chevron to expand the card and *then* click "Get Suggestions" — two clicks for what should be one. With the panel defaulting to collapsed (current behavior, intentional), the primary action is one click further away than necessary.
2. **No quick edit on Scheduled tile**: the only way to enter edit mode is the top-right Edit button, which sits ~5–7 grid rows above the Scheduled tile on a typical detail page. Operators changing date/time multiple times per shift have to scroll up each time. Putting the action where their eyes already are removes that friction.

---

## Proposed Changes

### Summary of Changes

- Move the "Get Suggestions" / "Refresh" button **out** of the `!isCollapsed` conditional in `ScheduleSuggestionPanel`. The button is now always visible on the header.
- When the user clicks the button while collapsed, automatically expand the panel as part of the click handler so the results appear in place.
- Add an inline Edit button (matching the visual weight of the existing top-right one but smaller) inside the SC Gold Scheduled tile. Clicking it enters edit mode AND focuses the `#edit_sched_date` input after the form mounts.

### New Files to Create

| File Path | Purpose |
|---|---|
| _none_ | Both changes live in existing files. |

### Files to Modify

| File Path | Changes |
|---|---|
| `src/components/admin/jobs/ScheduleSuggestionPanel.tsx` | Remove the `{!isCollapsed && (...)}` wrapper around the Get Suggestions button. Update `handleGenerate` to also call `setIsCollapsed(false)` so a click on the collapsed-state button auto-expands the panel. |
| `src/components/admin/jobs/JobEditForm.tsx` | Add a small Edit button inside the read-only Scheduled tile (top-right of the tile). Add a `focusScheduledOnEdit` boolean state + a `useEffect` that focuses `#edit_sched_date` when `isEditing` flips true with the flag set. The top-right Edit button leaves the flag `false` (current behavior); the in-tile Edit button sets it `true` before flipping `isEditing`. Add `useEffect` to imports. |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Auto-expand on Get Suggestions click.** If the button is visible while collapsed, clicking it should also reveal the results — otherwise the user clicks the button, sees nothing, and has to manually expand. Expanding inside `handleGenerate` is one extra line and keeps the click experience consistent.
2. **Single button, two states.** Keep one "Get Suggestions" / "Refresh" button (label flips based on whether `result` is set) rather than introducing a separate "Quick Generate" button on the collapsed header. Less surface area, same outcome.
3. **In-tile Edit button styled as a small ghost icon button**, not a full `Button variant="outline"`. The existing top-right Edit button is the primary action; the in-tile one is a shortcut. Using a smaller `<button>` with just the `Pencil` icon (or icon + "Edit" in tiny text) keeps the tile uncluttered.
4. **Focus the Scheduled Date input, not the Scheduled Time input.** Date is the more frequently changed field per typical reschedule patterns ("can we move this to Friday?"). The user can tab to time after typing the date.
5. **Use a `useEffect` + DOM focus call rather than `autoFocus`.** `autoFocus` only works on initial mount — but the input *is* mounting fresh when `isEditing` flips, so `autoFocus` would technically work. However, using a flag-driven effect keeps the behavior predictable: the top-right Edit button does NOT auto-focus (preserves current UX), and the in-tile button does. Conditioning `autoFocus` on a flag works either way; the effect is slightly clearer about intent.
6. **No persistence of the collapse state.** The user explicitly asked for default-collapsed; we're not changing that. The Get Suggestions auto-expand is purely a single-click behavior, not a state-persistence change.

### Alternatives Considered

- **Add a separate icon-only "quick generate" button on the collapsed header**, leaving the existing button only on expanded view: rejected — duplicates surface area. The plan keeps one button that always works.
- **Inline-edit Date/Time directly in the read-only tile** (without entering full edit mode): rejected — inconsistent with the rest of the form. Operators expect the "Edit job details" surface with validation, save/cancel. Localized inline edit would also need its own save action and revalidation logic.
- **Auto-focus inside the tile using `autoFocus` on the input**: equivalent in behavior; `useEffect` is slightly more explicit and keeps the top-right Edit button's behavior unchanged without needing a separate `autoFocus` prop on a different field path.

### Open Questions (if any)

None — both changes are mechanical and self-contained.

---

## Step-by-Step Tasks

### Step 1: Make Get Suggestions button always visible + auto-expand on click

**Actions:**

- In `src/components/admin/jobs/ScheduleSuggestionPanel.tsx`:
  - Remove the `{!isCollapsed && (` ... `)}` wrapper around the Get Suggestions button (lines 104–122). The button now renders unconditionally as a sibling of the toggle button inside the header flex row.
  - Update `handleGenerate` (currently lines 25–37) so its first action (before `setError(null)`) is `setIsCollapsed(false)`. This guarantees the body becomes visible to render results, no matter whether the user clicked from collapsed or expanded state.

**Files affected:**

- `src/components/admin/jobs/ScheduleSuggestionPanel.tsx`

---

### Step 2: Add Edit shortcut to the Scheduled tile

**Actions:**

- In `src/components/admin/jobs/JobEditForm.tsx`:
  - Add `useEffect` to the React import line: `import { useEffect, useState, useTransition } from 'react'`.
  - Add a new state slot inside the component: `const [focusScheduledOnEdit, setFocusScheduledOnEdit] = useState(false)`.
  - Add a `useEffect` that runs when `isEditing` or `focusScheduledOnEdit` changes:
    ```ts
    useEffect(() => {
      if (isEditing && focusScheduledOnEdit) {
        const el = document.getElementById('edit_sched_date')
        if (el instanceof HTMLInputElement) el.focus()
        setFocusScheduledOnEdit(false)
      }
    }, [isEditing, focusScheduledOnEdit])
    ```
  - In the read-only Scheduled tile (the `<div className="sm:col-span-2 rounded-lg border-2 border-black bg-[#EFB948]/20 ...">`), restructure the inner header so it contains both the "SCHEDULED" caption (left) and a small Edit button (right):
    ```tsx
    <div className="flex items-center justify-between mb-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
        Scheduled
      </p>
      <button
        type="button"
        onClick={() => {
          setFocusScheduledOnEdit(true)
          setIsEditing(true)
        }}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 underline-offset-2 hover:underline"
        aria-label="Edit scheduled date and time"
      >
        <Pencil className="w-3 h-3" />
        Edit
      </button>
    </div>
    ```
  - Keep the rest of the tile (the 2-col grid with Date / Time) unchanged.
  - The existing top-right Edit button stays as-is — it does NOT touch `focusScheduledOnEdit`, so it continues to enter edit mode without auto-focus.

**Files affected:**

- `src/components/admin/jobs/JobEditForm.tsx`

---

### Step 3: Validate

**Actions:**

- `npx tsc --noEmit` — must be 0 errors.
- `npx eslint src/components/admin/jobs/ScheduleSuggestionPanel.tsx src/components/admin/jobs/JobEditForm.tsx` — no new warnings.
- Manual browser checks (call out non-driven validations as follow-up):
  - Load a job detail page. Smart Scheduling card is collapsed (per the prior plan), and the yellow Get Suggestions button is visible on the right side of the header.
  - Click Get Suggestions while collapsed: panel expands, "Analyzing…" appears, suggestion list renders.
  - With the panel expanded, the same button now reads "Refresh" once results are present; clicking the chevron collapses but keeps the button visible.
  - Scroll to the SC Gold Scheduled tile. There's a small "✏ Edit" link in the top-right of the tile.
  - Click the in-tile Edit button: the form switches to edit mode AND the Scheduled Date input is focused (the date picker can be opened immediately with no extra click).
  - Click the top-right "Edit" button on Job Details (the existing one): edit mode entered, but no field is auto-focused (preserves prior behavior).
- Update `aios/05_active/in-progress.md` with a Recent Completions entry referencing this plan.

**Files affected:**

- `aios/05_active/in-progress.md`

---

### Step 4: Commit

**Actions:**

- Single commit: `feat(jobs): always show Get Suggestions CTA, add inline Edit on Scheduled tile`. Co-authored trailer per repo convention.

---

## Connections & Dependencies

### Files That Reference This Area

- `src/app/admin/jobs/[id]/page.tsx` — hosts both `ScheduleSuggestionPanel` and `JobEditForm`. No code change here.
- `src/lib/actions/scheduling-actions.ts` (`generateSuggestions`, `applySuggestion`) — unchanged. The CTA still calls these.
- `src/lib/actions/job-actions.ts` (`updateJob`) — unchanged. The in-tile Edit button just enters edit mode; saving is the same path.

### Updates Needed for Consistency

- `aios/05_active/in-progress.md` — append a Recent Completions row.
- No `aios/01_context/terminology.md` / `aios/02_architecture/data-model.md` updates (no schema or domain changes).

### Impact on Existing Workflows

- Operators who already click the chevron to expand can still do so — the toggle button is unchanged. The Get Suggestions button is now an additional one-click path.
- Operators who use the top-right Edit button keep their current behavior. The in-tile Edit button is purely additive.

---

## Validation Checklist

- [ ] Get Suggestions / Refresh button is visible on the Smart Scheduling header whether the panel is collapsed or expanded.
- [ ] Clicking Get Suggestions while collapsed auto-expands the panel and triggers the suggestion request.
- [ ] Chevron toggle still collapses/expands; the button stays visible across both states.
- [ ] When a result is present, the button label flips to "Refresh" (existing behavior preserved).
- [ ] SC Gold Scheduled tile (read-only view) shows a small "✏ Edit" affordance in its top-right corner.
- [ ] Clicking the in-tile Edit button enters edit mode AND focuses the Scheduled Date input (`#edit_sched_date`).
- [ ] Clicking the top-right "Edit" Button on Job Details does NOT auto-focus any field — preserves prior behavior.
- [ ] `tsc --noEmit` clean.
- [ ] `eslint` clean on changed files.
- [ ] `aios/05_active/in-progress.md` updated.

---

## Success Criteria

1. Triggering the Smart Scheduling suggestion is a single click from the default (collapsed) state.
2. Editing the scheduled date or time is a single click from the highlighted tile, with the cursor landing on the Scheduled Date input.
3. No regressions: chevron collapse/expand still works; top-right Edit button still works; existing form save flow unchanged.

---

## Notes

- Auto-expand on Get Suggestions click is a deliberate UX shortcut; we are NOT persisting `isCollapsed` to localStorage in this pass.
- The in-tile Edit button uses a small text+icon "Edit" link rather than the heavier `<Button variant="outline">` to keep the tile visually clean. If operators want a more prominent affordance, a follow-up can swap to the full Button component.
- Focus management uses a state flag + `useEffect` rather than `autoFocus` on the input. This keeps the top-right Edit button's behavior unchanged (no auto-focus there) without needing different inputs in different code paths.
- If future work moves toward inline-editing date/time directly in the tile (no full-form edit mode), this plan's in-tile Edit becomes obsolete. Out of scope here.

---

## Implementation Notes

**Implemented:** 2026-04-26

### Summary

- `ScheduleSuggestionPanel`: removed the `!isCollapsed` gate so the yellow Get Suggestions / Refresh button always renders on the header. `handleGenerate` now calls `setIsCollapsed(false)` as its first action so a click from the collapsed state both expands the card and fires the suggestion request.
- `JobEditForm`: added a small "✏ Edit" affordance inside the read-only SC Gold Scheduled tile. Clicking it sets `focusScheduledOnEditRef.current = true` and flips `isEditing` to true. A `useEffect` watching `isEditing` then reads the ref, focuses `#edit_sched_date` once the form mounts, and resets the ref. The top-right Edit button on the Job Details header is unchanged — it does not auto-focus.

### Deviations from Plan

- **Focus flag: ref instead of state.** The plan called for `useState(false)` for `focusScheduledOnEdit`. ESLint's `react-hooks/set-state-in-effect` rule flagged the in-effect reset (`setFocusScheduledOnEdit(false)`). Switched to `useRef(false)` — refs don't trigger re-renders or violate the rule, the effect now only depends on `isEditing`, and behavior is identical from the user's perspective. Cleaner overall.

### Issues Encountered

- ESLint `react-hooks/set-state-in-effect` on the `setFocusScheduledOnEdit(false)` reset call. Resolved by switching to a ref (see Deviations).
- Browser-driven validations (one-click expand from CTA, inline-Edit auto-focuses date input) were not driven from this session — verify in the browser when convenient.
