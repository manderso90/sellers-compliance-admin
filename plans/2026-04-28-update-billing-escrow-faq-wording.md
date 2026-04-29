# Plan: Update "Do you bill through escrow?" FAQ wording

**Created:** 2026-04-28
**Status:** Implemented
**Request:** Replace the answer text for the "Do you bill through escrow?" FAQ on the public site with new copy. The question wording stays the same.

---

## Overview

### What This Plan Accomplishes

Edits a single FAQ entry on the public marketing site (`/` page) to change the answer text from a brief, transactional line to a warmer, more reassuring one that emphasizes (a) payment is only due after the customer is happy with the work and (b) flexibility on payment method. The question wording is unchanged. This is a one-line copy change in the `FAQ_DATA` array in `Sellers-Compliance/src/app/page.tsx`.

### Why This Matters

The FAQ section on `/` is one of the highest-conversion surfaces of the public site — prospective customers reach it before booking and use it to resolve hesitation. The current answer ("No, we do not bill through escrow. Payment is due upon completion of service. We accept checks or online payment.") is accurate but transactional. The new wording reframes the same facts as a positive proposition ("Billing is simple. Payment is only due once the work is complete and you're happy."), which is on-brand for the rest of the public copy and likely reduces booking friction without changing any underlying business logic.

---

## Current State

### Relevant Existing Structure

- `Sellers-Compliance/src/app/page.tsx:22-70` — `FAQ_DATA` constant, an array of `{ question, answer }` objects rendered into the FAQ accordion section. The "bill through escrow" entry is at lines 61-64:
  ```tsx
  {
    question: 'Do you bill through escrow?',
    answer:
      'No, we do not bill through escrow. Payment is due upon completion of service. We accept checks or online payment.',
  },
  ```
- `Sellers-Compliance/src/app/page.tsx:74+` — `FaqItem` component renders each `{ question, answer }` pair as a click-to-expand accordion. No props or shape change is involved here.
- `Sellers-Compliance/src/app/page.tsx:570-590` — `<section id="faq">` is the FAQ section. `FAQ_DATA.map(...)` drives the render.
- The FAQ entries use straight ASCII apostrophes (`'`) and a mix of en-dashes (`–`) and hyphens (`-`) where appropriate — see the "How quickly can I get an appointment?" entry's `Monday–Friday 9:00 AM – 4:00 PM` for the en-dash precedent.

### Gaps or Problems Being Addressed

- The current answer reads as a brief denial followed by a payment policy. The new wording leads with the same denial but reframes around customer experience ("Billing is simple", "once the work is complete and you're happy", "whichever is easiest for you"). One copy edit; no functional change.
- Nothing else is broken — this is a tone-and-trust improvement, not a bug fix.

---

## Proposed Changes

### Summary of Changes

- Replace the `answer` string at `Sellers-Compliance/src/app/page.tsx:62-63` with the new wording.
- Leave the `question` string unchanged.
- Leave the `FAQ_DATA` array order, `FaqItem` component, and surrounding `<section id="faq">` markup untouched.
- Add a Recent Completions row to `Sellers-Compliance/aios/05_active/in-progress.md` so the change is logged where prior public-repo edits live.

### New Files to Create

None.

| File Path | Purpose |
| --- | --- |
| _(none)_ | _(pure copy edit; no new files)_ |

### Files to Modify

| File Path | Changes |
| --- | --- |
| `Sellers-Compliance/src/app/page.tsx` | L62-63: replace the `answer` string for the "Do you bill through escrow?" entry with the new wording. |
| `Sellers-Compliance/aios/05_active/in-progress.md` | Add a 2026-04-28 row to the Recent Completions table referencing this plan. |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Use the polish version with em-dash and spaces.** User confirmed: replace the literal hyphen between `payments` and `whichever` with an em-dash (`—`, U+2014) flanked by single spaces. Final answer text:

   > No, not at this time. Billing is simple. Payment is only due once the work is complete and you're happy. We accept checks and online payments — whichever is easiest for you.

   The em-dash with spaces matches the typographic style elsewhere in the file (e.g., `Monday–Friday 9:00 AM – 4:00 PM` uses en-dashes for ranges; an em-dash with spaces is the idiomatic mark for the parenthetical pause here).

2. **No structural changes to `FAQ_DATA`.** The order of FAQ entries stays as-is. The "bill through escrow" entry remains the 9th entry. We're touching one string, not reorganizing the section.

3. **Plan file lives in the admin repo's `plans/` directory.** The admin repo has been the canonical home for cross-repo plans (per recent precedent: the `swap-expedited-for-work-service-type` plan also lived there even though it touched both repos). Continuing that convention. The plan file path is `plans/2026-04-28-update-billing-escrow-faq-wording.md` in `sellers-compliance-admin`.

4. **AIOS log entry goes in the public repo only.** This change is wholly within the public repo's surface area — a marketing-page copy edit. Cross-Repo Sync Rule (`aios/CLAUDE.md`) is not triggered: nothing about shared DB schema, shared business logic, or shared terminology is changing. No need to mirror the AIOS log row into the admin repo's `aios/05_active/in-progress.md`.

5. **Smart quotes vs. straight quotes.** The new copy contains an apostrophe in "you're". Use a straight ASCII apostrophe (`'`) inside the JS string literal, matching the existing entries in `FAQ_DATA` (e.g., the existing entries already contain "California's" with a straight apostrophe). Reason: the source file uses single-quoted JS string literals (`'...'`); a smart quote (`'`) would render fine but introduces an unnecessary mixed-quoting style in this file.

6. **JS string-literal escaping for apostrophes.** Because the source uses single-quoted JS strings (`'...'`), the apostrophe inside `you're` would conflict with the literal's delimiter. Two equivalent fixes: (a) keep the single-quoted literal and escape the apostrophe as `\'`, or (b) switch this single string to a double-quoted literal (`"..."`). Decision: **switch this one string to a double-quoted literal**. Rationale: it reads cleaner and does not require diff readers to mentally undo the escape. Other entries in the array stay single-quoted; mixed quoting in JS literals is fine and idiomatic when the alternative is escape clutter. (For reference: the React/JS conventions in the rest of the file already mix `'...'`, `"..."`, and template literals freely.)

### Alternatives Considered

- **A. Preserve the literal hyphen as the user typed it (`payments-whichever`).** Rejected after the user confirmed the polish version (em-dash with spaces) is preferred. The em-dash matches the typographic style of the rest of the file.
- **B. Reorder FAQ entries** so this question moves up in the list (closer to the booking-related questions). Rejected — out of scope; the user only asked to edit the wording.
- **C. Split the question into two FAQs** (one about escrow, one about general payment terms). Rejected — the user's new copy reads as a single coherent answer, and splitting would dilute it.
- **D. Mirror the FAQ change into the admin repo somewhere.** Rejected — the admin app does not surface a customer-facing FAQ. Nothing to mirror.

### Open Questions

None. User confirmed the polish version (em-dash with spaces).

---

## Step-by-Step Tasks

### Step 1: Read the current FAQ block and confirm line numbers

Read-only verification before editing.

**Actions:**

- Read `Sellers-Compliance/src/app/page.tsx` lines 22-70. Confirm the `FAQ_DATA` array is intact and the "Do you bill through escrow?" entry is at the expected position (currently L61-64).
- If line numbers have drifted (a recent commit could have added or removed entries), use the entry's `question` string `'Do you bill through escrow?'` as the anchor for the edit, not absolute line numbers.

**Files affected:**

- _(read-only)_

---

### Step 2: Replace the answer text

Edit `Sellers-Compliance/src/app/page.tsx`.

**Actions:**

Replace this exact block:

```tsx
  {
    question: 'Do you bill through escrow?',
    answer:
      'No, we do not bill through escrow. Payment is due upon completion of service. We accept checks or online payment.',
  },
```

with this exact block:

```tsx
  {
    question: 'Do you bill through escrow?',
    answer:
      "No, not at this time. Billing is simple. Payment is only due once the work is complete and you're happy. We accept checks and online payments — whichever is easiest for you.",
  },
```

Notes on this string:

- It uses a double-quoted JS string literal (per Design Decisions §6) so the apostrophe in `you're` does not need escaping.
- The dash between `payments` and `whichever` is a real Unicode em-dash (`—`, U+2014) flanked by single spaces, **not** two hyphens (`--`) and not a literal `-`.
- The `question` line stays single-quoted and unchanged. No trailing-comma changes; no other edits.

**Files affected:**

- `Sellers-Compliance/src/app/page.tsx`

---

### Step 3: Type-check the public repo

**Actions:**

- Run `(cd /Users/morrisanderson/Projects-clean/Sellers-Compliance && npx tsc --noEmit)` — must report 0 errors. (A pure string swap shouldn't introduce errors, but per project policy, every code change is type-checked before commit.)

**Files affected:**

- _(verification only)_

---

### Step 4: Manual smoke test

**Actions:**

- `cd Sellers-Compliance && npm run dev` (or whatever the public repo's dev script is named — confirm via `cat Sellers-Compliance/package.json | grep '"dev"'` if uncertain).
- Open `http://localhost:3000/` (or whichever port the dev server reports).
- Scroll to the FAQ section near the bottom of the page.
- Find the "Do you bill through escrow?" question. Click it to expand.
- Confirm the answer reads:

  > No, not at this time. Billing is simple. Payment is only due once the work is complete and you're happy. We accept checks and online payments — whichever is easiest for you.

- Visually verify: no console errors, the apostrophe in "you're" renders correctly, the em-dash renders as `—` (not as two hyphens or a tofu glyph), no broken accordion behavior, no layout shift.
- Stop the dev server.

**Files affected:**

- _(test only)_

---

### Step 5: Update AIOS active state in the public repo

Add a Recent Completions row to `Sellers-Compliance/aios/05_active/in-progress.md`.

**Actions:**

- Read `Sellers-Compliance/aios/05_active/in-progress.md`.
- Insert a new row at the top of the Recent Completions table, immediately above the existing 2026-04-28 row from the `swap-expedited-for-work-service-type` plan:
  ```
  | 2026-04-28 | Update "Do you bill through escrow?" FAQ wording on public `/` page (plan in admin repo: `plans/2026-04-28-update-billing-escrow-faq-wording.md`). One-line copy edit in `src/app/page.tsx`. Question unchanged; answer rephrased to lead with "Billing is simple" and emphasize that payment is only due once the customer is happy with the work. No structural change. |
  ```

**Files affected:**

- `Sellers-Compliance/aios/05_active/in-progress.md`

---

## Connections & Dependencies

### Files That Reference This Area

- `Sellers-Compliance/src/components/public/PublicHeader.tsx:67,108` — site nav links include `'FAQ'` which scrolls to `id="faq"`. The anchor and section markup are unchanged; the nav continues to work.
- No other file consumes `FAQ_DATA`. `FaqItem` is a private component in `page.tsx` and renders the `{ question, answer }` shape directly.

### Updates Needed for Consistency

- `Sellers-Compliance/aios/05_active/in-progress.md` — add the Recent Completions row (Step 5).
- No other AIOS file requires updating: `aios/01_context/terminology.md`, `00_overview/product.md`, `00_overview/vision.md`, `01_context/business.md`, `01_context/users.md` — none reference billing/escrow language verbatim and the Living Document Protocol triggers (new enum, new role, new feature, new integration, pricing/business-logic change) are not met by a marketing-copy rephrase.
- No mirror needed in the admin repo. The admin app does not display a public FAQ.

### Impact on Existing Workflows

- **Public site:** New FAQ wording renders for all visitors after the next deploy. No URL changes, no anchor changes, no layout changes.
- **Admin / internal flows:** No impact. Nothing in the admin app, the order flow, or the API surface depends on the FAQ text.
- **SEO:** Minor — the FAQ section is part of the home page's indexable content. The answer string changes; the question string does not, so the question continues to match search-snippet patterns. Net neutral.

---

## Validation Checklist

How to verify the implementation is complete and correct:

- [ ] `Sellers-Compliance/src/app/page.tsx` shows the new `answer` text exactly as specified, with the double-quoted JS literal and the unchanged `question`.
- [ ] `grep -n "Billing is simple" Sellers-Compliance/src/app/page.tsx` returns exactly one match.
- [ ] `grep -n "payments — whichever" Sellers-Compliance/src/app/page.tsx` returns exactly one match (confirms the em-dash, not a hyphen, was committed).
- [ ] `grep -n "Payment is due upon completion" Sellers-Compliance/src/app/page.tsx` returns zero matches (the old phrase is gone).
- [ ] `npx tsc --noEmit` passes with 0 errors in the public repo.
- [ ] The dev server renders the new wording on the FAQ accordion when the question is expanded.
- [ ] No console errors on the FAQ page.
- [ ] `Sellers-Compliance/aios/05_active/in-progress.md` has the 2026-04-28 entry referencing this plan.

---

## Success Criteria

The implementation is complete when:

1. The "Do you bill through escrow?" FAQ entry on the public site renders the new answer text exactly as specified.
2. The old answer phrasing ("Payment is due upon completion of service. We accept checks or online payment.") no longer appears anywhere in the codebase.
3. The public repo's AIOS log records the change.
4. Type check passes; no other surfaces broken.

---

## Notes

- Near-zero-risk change: one string in one file plus an AIOS log row.
- The edit is on the marketing site's `/` route, which is statically rendered (or close to it). The change will be visible immediately after deploy.
- The em-dash uses Unicode U+2014 (`—`), not the typewriter convention of two hyphens. Verify in the diff before commit.

---

## Implementation Notes

**Implemented:** 2026-04-28

### Summary

- Replaced the `answer` string in the "Do you bill through escrow?" entry of `FAQ_DATA` at `Sellers-Compliance/src/app/page.tsx:62-63`. The string is now a double-quoted JS literal containing the polished copy with a Unicode em-dash (U+2014) flanked by single spaces between `payments` and `whichever`.
- The `question` line was untouched. No other FAQ entries were modified. No structural changes.
- Added a Recent Completions row to `Sellers-Compliance/aios/05_active/in-progress.md`.
- `npx tsc --noEmit` clean in the public repo.
- Grep confirms the new phrase `Billing is simple` and the em-dash `payments — whichever` are present; the old phrase `Payment is due upon completion` is gone.

### Deviations from Plan

- **Step 4 (manual smoke test) not executed.** That's an operator action requiring `npm run dev` + browser. Validation Checklist items requiring runtime verification remain unchecked pending manual smoke test.

### Issues Encountered

None.
- A future copy-pass across the entire FAQ block could harmonize tone across all entries (some are still terse). Out of scope for this plan; the user only asked about the escrow question.
