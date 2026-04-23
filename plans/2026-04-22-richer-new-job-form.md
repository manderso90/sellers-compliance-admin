# Plan: Richer New Job Form

**Date**: 2026-04-22
**Status**: Draft — awaiting approval
**Owner**: Mo (user) / Claude

## Context

The monolith pre-split (last seen in `~/Projects-clean/Sellers-Compliance-preview/`) had a 17-field Schedule Appointment form that captured property, contact, scheduling, service, and access details in one pass. When this admin repo was extracted on 2026-04-19, the new-job intake was rebuilt as a minimal 7-field `NewJobForm` (job type, address, lockbox, date, time preference, duration, notes). That minimal version is what the user perceived as "the form not rendering fully" today — the form is intact, it's just a reduced-scope rewrite.

The decision (see conversation on 2026-04-22) is: **rewrite the richer form from scratch** against the current schema/types/conventions, using the preview repo as a UX spec rather than a source to port from. Porting loses to rewriting here because schema, types, Next.js version, icon library, and architecture have all moved since Apr 3.

## Goal

Replace `src/components/admin/jobs/NewJobForm.tsx` and its server action with a form that captures the same fields the preview version did, mapped to the current schema, and conforming to the four-layer architecture defined in `aios/04_rules/coding-rules.md`.

## Non-goals (explicitly out of scope for this plan)

- Customer autocomplete / dedup-by-name UI (the preview's `CustomerAutocomplete`). Doesn't exist in this repo; v1 uses plain text + dedup-by-email in the server action. Autocomplete is a follow-up plan.
- Listing existing customers (`/admin/customers` route).
- Schedule Appointment as a separate route. We keep `/admin/jobs/new`. Per `aios/01_context/terminology.md`, "Job" is the primary unit internally — don't fork a second intake surface.
- Status machine changes (F4 is tracked under its own plan: `plans/2026-04-22-fix-service-type-check-constraint.md`).
- Pricing / invoice fields (`price`, `invoice_number`). The preview form didn't capture them either.

## Field spec

Five sections, matching the preview layout:

### 1. Property
| Form field | Required | Target column | Notes |
|---|---|---|---|
| `street_address` | ✓ | `properties.street_address` | Use existing `AddressAutocomplete` if API key is configured; else plain `Input` |
| `unit` | — | `properties.unit` | |
| `city` | ✓ | `properties.city` | Auto-filled from Google Places when autocomplete used |
| `zip_code` | ✓ | `properties.zip_code` | 5-digit, `maxLength={5}` |
| `property_type` | ✓ | `properties.property_type` | Radio pills: single_family / condo / townhouse / multi_family / other. Matches DB CHECK exactly. |

State is implicit: `properties.state` defaults to `'CA'` in schema. No UI field needed.

### 2. Contact
| Form field | Required | Target column | Notes |
|---|---|---|---|
| `customer_full_name` | ✓ | `customers.full_name` | Plain text in v1 |
| `customer_email` | ✓ | `customers.email` | DB has `unique` constraint — action dedups on email |
| `customer_phone` | — | `customers.phone` | Format as `(xxx) xxx-xxxx` on input |
| `customer_type` | ✓ | `customers.customer_type` | Radio pills: agent / broker / transaction_coordinator / seller / escrow / other. Matches DB CHECK. |
| `company_name` | — | `customers.company_name` | |

### 3. Scheduling
| Form field | Required | Target column | Notes |
|---|---|---|---|
| `requested_date` | — | `inspections.requested_date` | `<input type="date">` |
| `requested_time_preference` | — | `inspections.requested_time_preference` | Radio pills: morning / afternoon / anytime. DB also allows `flexible` but preview didn't expose it — keep 3 for now. |

### 4. Service
| Form field | Required | Target column | Notes |
|---|---|---|---|
| `service_type` | ✓ | `inspections.service_type` | Radio pills: standard / expedited / reinspection. (Preview only exposed standard + reinspection; we expose all three since `expedited` is a valid DB value and operationally meaningful.) |
| `includes_installation` | — | `inspections.includes_installation` | Checkbox. Orthogonal to service_type per `supabase/schema.sql:86-89` comment. |

### 5. Access & Notes
| Form field | Required | Target column | Notes |
|---|---|---|---|
| `access_instructions` | — | `inspections.access_instructions` | |
| `lockbox_code` | — | `inspections.lockbox_code` | Presence implies lockbox access; we drop the separate `has_lockbox` boolean UI from the current minimal form |
| `contact_on_site` | — | `inspections.contact_on_site` | |
| `listing_agent_name` | — | `inspections.listing_agent_name` | |
| `public_notes` | — | `inspections.public_notes` | Textarea, 2 rows |

Durations and inspector assignment are deliberately absent — both are dispatch-time decisions, not intake-time.

## Architecture mapping (four-layer)

Per `aios/04_rules/coding-rules.md`:

- **Component** (`src/components/admin/jobs/NewJobForm.tsx`, `'use client'`) — form state, validation UX, submit via server action. No direct Supabase access.
- **Action** (`src/lib/actions/job-actions.ts` `createJob`) — `'use server'`, auth guard, normalize, call service validator, upsert customer, insert property, insert inspection, revalidate.
- **Service** (`src/services/job-lifecycle.ts` `validateJobInput`) — extended to validate the new required fields (city, zip, customer full_name, customer_email, customer_type, property_type, service_type). Pure function.
- **Query** — none needed for v1.

## File changes

### New / rewritten
- `src/components/admin/jobs/NewJobForm.tsx` — full rewrite (~350 lines, 5-section card layout, SC Bold styling — bold borders, neo-shadow, warm-white sections).
- `src/lib/actions/job-actions.ts` — rewrite the `createJob` signature and body. Keep `ensureCustomer`, `createProperty`, `surfacePgError` helpers (expand `ensureCustomer` to also set `phone`, `company_name`, `customer_type` when inserting new rows).
- `src/services/job-lifecycle.ts` — expand `validateJobInput` signature to cover new required fields. Keep existing validators.

### Touched (minor)
- `src/types/database.ts` — verify `Customers.Insert`, `Properties.Insert`, `Inspections.Insert` already expose all target columns. Expected: yes (types were regenerated from current schema).
- `src/app/admin/jobs/new/page.tsx` — no change; still renders `<NewJobForm />`.
- `.env.example` — add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` if we wire AddressAutocomplete (see Decision A below).

### Unchanged but referenced
- `src/components/ui/address-autocomplete.tsx` — already present, unused. Wire it in NewJobForm if key is configured.
- `src/components/ui/textarea.tsx` — already present.
- `src/components/ui/input.tsx`, `label.tsx` — already present.

## Decisions to confirm before Step 1

### Decision A: AddressAutocomplete

Two options:

- **A1 (recommended)**: wire `AddressAutocomplete` into the new form. Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in Vercel env + `.env.local`. The component already exists and is idle. ~10 min of extra work.
- **A2**: plain `<Input>` for street address. Wire autocomplete later. No env setup needed.

Need your choice before Step 3.

### Decision B: Duration field

The current minimal form exposes `estimated_duration_minutes`. The preview form does not. Intake-time duration is usually guessed — duration belongs at dispatch/scheduling-time via `src/services/duration-estimation.ts`. **Proposal**: drop the duration field from intake. DB default is 40 min; dispatcher can adjust when scheduling.

Confirm drop, or keep it in a collapsed "Advanced" section?

### Decision C: Post-submit redirect

Preview redirected to `/admin/inspections/${id}`. Admin repo uses `/admin/jobs/${id}`. **Proposal**: redirect to `/admin/jobs/${id}` to match this repo's terminology, matching the existing job detail route.

## Step order

Each step is independently verifiable (`tsc --noEmit` clean, the form still works).

### Step 1 — Service-layer validator
Expand `validateJobInput` in `src/services/job-lifecycle.ts` to accept and validate the new fields. Add `VALID_PROPERTY_TYPES`, `VALID_CUSTOMER_TYPES`, `VALID_SERVICE_TYPES` constants. No callers broken yet (the existing action is still using the old signature — we use function overloading or a new `validateIntakeInput` beside the existing one, then delete the old when the action flips).

**Done when**: `tsc --noEmit` clean.

### Step 2 — Action rewrite
Rewrite `createJob` in `src/lib/actions/job-actions.ts`:
- New input type matching the form's `ScheduleFormData`-shaped payload
- Expand `ensureCustomer` to write `phone`, `company_name`, `customer_type` on insert, and optionally update those fields when the existing row is returned (needs a small ON CONFLICT or a post-lookup update)
- Expand `createProperty` to accept `unit`, `property_type`
- Build the `InspectionInsert` from the new fields (service_type, includes_installation, access_instructions, lockbox_code, contact_on_site, listing_agent_name, public_notes, requested_date, requested_time_preference)
- Keep the status_history write unchanged
- Keep `surfacePgError` and `revalidatePath` calls

**Done when**: `tsc --noEmit` clean; the existing NewJobForm is *temporarily* broken because its payload no longer matches — that is fixed in Step 3.

### Step 3 — Component rewrite
Rewrite `NewJobForm.tsx`:
- Five-section card layout with SC Bold styling (bold border-2 borders, neo-shadow, warm-white `#FFFDF5` section headers, `#C8102E` submit button)
- Local `useState<NewJobFormData>` for form state
- Radio-pill pattern (from preview, matches SC Bold design language)
- `formatPhone` helper matching preview
- `handleSubmit` calls `createJob`, routes to `/admin/jobs/${id}` on success, shows error otherwise
- If Decision A1: wrap in `<APIProvider>`; wire `AddressAutocomplete`. If A2: plain `<Input>`.

**Done when**: `tsc --noEmit` clean; `/admin/jobs/new` renders all five sections in the browser; creating a job succeeds and lands on the detail page.

### Step 4 — Verification
- Start dev server, create a job end-to-end.
- Verify the new row in Supabase: customer exists with correct `customer_type`, property exists with `property_type`, inspection references both.
- Re-create a job with the same email → confirm `customers` row is reused (dedup works).
- Run `tsc --noEmit` and `npm run lint`.
- Update `aios/05_active/in-progress.md` — mark form restoration as complete; note Customers list / Schedule Appointment are still out of scope.
- Update `aios/05_active/known-issues.md` — remove or downgrade anything related to the minimal intake form.

### Step 5 — Commit
One commit: `feat(jobs): expand new-job form to full intake surface`. Include a plan reference in the commit body.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `customers.email` unique constraint trips when user enters an email that's already on file but with a different `customer_type` | Medium | `ensureCustomer` does SELECT-by-email first; on hit, returns existing id without updating customer_type. Document this: existing customer's type wins. |
| Google Maps key not configured in prod → `AddressAutocomplete` silently fails | Low if A1, zero if A2 | If A1, add key to Vercel env *before* deploy. Document in `.env.example`. |
| `service_type='expedited'` or `customer_type='escrow'` — rarely used — breaks something downstream that assumed narrower sets | Low | Those values are already valid in the DB CHECKs. If downstream code hardcodes narrower sets, surface it during tsc / first manual test and fix in-place. |
| Existing callers of `createJob` break on signature change | Zero | The only caller is `NewJobForm.tsx`, which we're rewriting in the same sprint. |
| F4 status-check drift interacts with this work | Zero | New rows insert `status='requested'`, valid under both narrow and broad allow-lists. |

## Validation checklist (paste into commit body or PR)

- [ ] All five sections render
- [ ] Property type pills write `properties.property_type`
- [ ] Customer type pills write `customers.customer_type`
- [ ] Dedup-by-email verified: same email twice → one `customers` row
- [ ] `service_type` + `includes_installation` write independently
- [ ] Access fields (lockbox_code, access_instructions, contact_on_site, listing_agent_name) persist
- [ ] `public_notes` persists (note: admin notes field dropped in v1; if needed, add to Access & Notes section)
- [ ] Submit redirects to `/admin/jobs/${id}` and the detail page renders
- [ ] `tsc --noEmit` clean
- [ ] `npm run lint` clean
- [ ] `plans/` updated with a completion note or follow-up plan reference

## Follow-up plans (not in this one)

1. CustomerAutocomplete — port/rewrite the autocomplete UI with a `/api/customers/search` endpoint or a query against `customers` filtered by the authenticated user. Requires deciding on the dedup UX ("use this customer" vs. "create new").
2. `/admin/customers` list + detail (Step 2 of the broader restore).
3. Dashboard page (Step 3).
4. `/admin/inspections` as a distinct list surface, if warranted after 2 and 3 are done.
