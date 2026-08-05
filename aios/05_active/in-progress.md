# In Progress

Active workstreams and their current state. Update this as work moves forward.

## Snapshot

| Field | Value |
|-------|-------|
| **Current branch** | `main` (safety branch `pre-migration-backup` to be created at Phase 1 start) |
| **Current migration phase** | Pre-Phase 1 — AIOS v2 complete, migration plan approved, awaiting implementation |
| **Next file/subsystem** | `src/lib/hooks/use-schedule-sync.ts` → move to `src/hooks/` (Phase 2) |
| **Next action** | Create safety branch, then begin Phase 1 housekeeping |

## Out of Scope (this sprint)

- Test framework setup (Vitest/Playwright — tracked as tech debt T1)
- SMS/notification integration
- Multi-user role-based RLS enforcement
- Mobile/responsive layout work

## Current Sprint: Clean Migration

### Active Workstreams

#### 1. AIOS v2 Structure ✅
**Status**: Complete
**What**: Transform flat `context/` directory into structured `aios/` v2 system.
**Result**: 22 files across 8 directories. All original content preserved.

#### 2. Clean Migration Plan
**Status**: Plan approved, awaiting implementation
**What**: Refactor Seller's Compliance in-place following the same patterns applied to Seller's Compliance.

**Phases (from approved migration plan)**:

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Safety branch + housekeeping (remove old AIOS artifacts) | Pending |
| Phase 2 | Structural fixes (hooks location, proxy.ts, package.json cleanup) | Pending |
| Phase 3 | Services layer creation | Pending |
| Phase 4 | Service adoption pass (refactor actions to use services) | Pending |
| Phase 5 | COMMANDS.md at project root | Pending |
| Phase 6 | Domain & Workflow Map (.docx) | Pending |
| Phase 7 | Validation & commit | Pending |

### Blocked / Waiting

- _None currently._

### Deployment

- **Configured on Vercel**: project `docside/sellers-compliance-admin`. Production domain **admin.sellerscompliance.com** deploys **from `main`** — pushing a feature branch only creates a Preview, not the live site. Verify with `vercel ls --prod`.

## Recent Completions

| Date | Item |
|------|------|
| 2026-08-05 | CHECK-constraint audit (follow-up to the requested-time fix): compared all 17 live CHECKs against every write path in both repos. One bug found and fixed — DB `inspections_status_check` allowed `hold` but code writes `on_hold`, so the On Hold action on the job detail page always failed with pg 23514. Renamed the DB value to `on_hold` via Management API (0 rows in either state; live statuses are only confirmed/completed/cancelled), `schema.sql` updated. All other CHECKs verified clean: customer_type / property_type / service_type match both repos' enums exactly; payment_status only written by the public Stripe webhook (`paid`/`invoiced`, both allowed); inspector_outcome never written (Inspector View unbuilt); profiles.roles UI options equal the DB allow-list; dispatch_status has no DB CHECK (app-only); activity_log / inspection_items / inspection_photos / inspection_work_items untouched by app code. F4's broader 11-vs-6 status-model drift remains open in known-issues.md. |
| 2026-08-05 | Fixed job creation failing on `/admin/jobs/new` whenever an exact Requested Time was set. Root cause: live DB `inspections_requested_time_preference_check` still only allowed the legacy categorical values (`morning`/`afternoon`/`anytime`/`flexible`), but the 2026-04-26 exact-time-picker change made admin forms send `HH:MM` — every such insert failed with pg 23514 (found via `vercel logs`; the form only showed the generic scrubbed RSC error). Fix 1 (DB, applied via Supabase Management API `database/query`): widened the CHECK to also accept `^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$`, mirroring `TIME_PATTERN` in `services/job-lifecycle.ts`; verified existing 45 rows all legacy-valued, `schema.sql` hand-edited to match. Fix 2 (code): `createJob` now returns `{ id } \| { error }` instead of throwing — production Next.js scrubs messages thrown across the server-action boundary, so the form banner could never show the real error; `NewJobForm` renders `result.error`. Gotcha for other CHECK-widening work: the `updateJob` path writes `requested_time_preference` too and is covered by the same widened CHECK. |
| 2026-06-09 | Made Stripe payments reflect on the job detail page. Root cause they weren't: the **public repo's** Vercel **production** Stripe env was still test-mode (`sk_test` + the test webhook signing secret), so live `checkout.session.completed` events failed signature verification in the webhook (`Sellers-Compliance/src/app/api/stripe/webhook/route.ts`) and were dropped (`pending_webhooks: 1`, nothing written to `payments`). Fix was **config, not code**: set public prod `STRIPE_SECRET_KEY` → live and `STRIPE_WEBHOOK_SECRET` → the live endpoint's `whsec` (Vercel marks both Sensitive now → unreadable via `vercel env pull`, confirm via `vercel env ls`), redeployed the public site, and resent the two failed live events via Stripe CLI (`stripe events resend <evt> --webhook-endpoint we_1TMtmk... --live`). Verified: both `cs_live_` payments now recorded with `payment_status='paid'`. The webhook (already covering admin links via `metadata.inspection_id`) and the admin display were both already correct. Admin side: added a glanceable **PAID / PARTIAL / OUTSTANDING** badge to the job detail header (`app/admin/jobs/[id]/page.tsx`, commit `2606c18`), driven by existing `getInspectionFinancials`. **Follow-ups (resolved 2026-06-09):** Made the webhook idempotent — skips insert if a `payments` row already references the session id in its `note`, so Stripe's at-least-once delivery / resends can't create duplicate rows (public repo commit `1f57181`, verified by resending an already-recorded event → row count stayed 1). Investigated `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: it's **dead config** — not referenced anywhere in the public repo (`/order` checkout is server-side via secret key, redirects through `session.url`, no Stripe.js), so flipping it to `pk_live` is a no-op; the public order flow was already live once the prod secret key was. Removed the unused var from the public project (Production; preview/dev never had it). |
| 2026-06-09 | Fixed Stripe payment link post-payment redirect. Root cause of the original "card didn't process" report was a **stale test-mode link** (`cs_test_`) sent before the live key (`sk_live`) was active in Vercel Production — real cards never process on test links. Live key now verified in Production (account `acct_1THnX3...`, `charges_enabled: true`, generates `cs_live_` sessions). Separately, `createPaymentLink` (`lib/actions/payment-actions.ts`) pointed `success_url`/`cancel_url` at `/payment/{success,cancel}` on the **auth-gated admin domain** where those routes 404. Repointed both to the public site `https://sellerscompliance.com/payment/{success,cancel}` (static pages already exist in the `Sellers-Compliance` repo); dropped the host-derivation logic + `next/headers` import and the unused `session_id` param. Shipped to `main` (`0367bb2`), deployed prod. Verified live: two successful payments (Apple Pay + credit card), both `cs_live_`. |
| 2026-06-04 | Record install line items on the job/inspection detail page (plan: `plans/2026-06-04-inspection-install-line-items.md`). New write path for `install_line_items` (read already existed via `getInspectionFinancials`). Added `lib/actions/line-item-actions.ts` (`addLineItem`/`updateLineItem`/`deleteLineItem`, `requireAdmin`-guarded) that snapshots `unit_price`/`unit_part_cost`/`unit_labor_cost`/`item_name` from the chosen product on add and stamps `completed_at = now` (counts in weekly rollups). New `components/admin/inspections/InstallItemsSection.tsx` (mirrors `PaymentsSection`): catalog picker via reused `getActiveProducts` (discounts excluded), adjustable qty/unit price, running Install Total. Wired into `app/admin/jobs/[id]/page.tsx` above the Payments card. No schema change → no cross-repo mirror. `tsc` 0 errors; new files lint-clean. Shipped for the first real inspection. |
| 2026-04-28 | Retire `Expedited` and add `Work` service type (plan: `plans/2026-04-28-swap-expedited-for-work-service-type.md`). Backfilled existing `expedited` rows to `standard` (41 rows total now on `standard`), dropped/re-added the `inspections.service_type` CHECK to `('standard','reinspection','work')`, refreshed `supabase/schema.sql` (hand-edited the two literal occurrences), swapped the pill in `NewJobForm.tsx`, narrowed `VALID_SERVICE_TYPES` in `services/job-lifecycle.ts`, and tightened the public-repo Zod enum at `Sellers-Compliance/src/app/api/inspections/route.ts`. New `Work` value is admin-entry-only — public order form (`/order`) untouched. |
| 2026-04-28 | Fix `/admin/dashboard` 404 on Command Center metric cards (plan: `plans/2026-04-28-fix-dashboard-404-metric-card-links.md`). Repointed all four `BoldMetricCard` hrefs in `CommandMetricsRow.tsx` from the non-existent `/admin/dashboard?...` to `/admin/jobs?...` using the existing `scope` / `status` URL vocabulary. No new routes; no schema or service changes. |
| 2026-04-26 | Replace Time Preference pills with exact-time picker on admin forms (plan: `plans/2026-04-26-replace-time-preference-with-time-picker.md`). New Job + Job Edit forms now use `<input type="time">`; column reused, no schema migration. New shared `getRequestedTimeLabel` helper handles HH:MM and legacy categorical values. `validateJobInput`/`validateIntakeInput` accept legacy OR HH:MM. `scoreTimePreference` extended with proximity bands for exact times. `UnscheduledJobChip` uses the helper. Public order flow untouched. |
| 2026-04-26 | Job detail quick-actions (plan: `plans/2026-04-26-smart-scheduling-cta-and-tile-edit.md`). Smart Scheduling "Get Suggestions" button now visible on the collapsed header (single-click expand + fire). Inline "✏ Edit" affordance added inside the SC Gold Scheduled tile; clicking it enters edit mode and focuses `#edit_sched_date` via a ref-driven `useEffect`. |
| 2026-04-26 | Job detail polish + schedule propagation (plan: `plans/2026-04-26-job-detail-polish-and-schedule-propagation.md`). (1) `getInspectorWorkloads` now filters profiles by `roles` containing `inspector` — admin-only profiles no longer appear in Command Center workload. (2) Smart Scheduling card on `/admin/jobs/[id]` is collapsible, default collapsed. (3) Job Details (read + edit) now anchor Scheduled Date/Time/Duration in an SC Gold (`#EFB948`/20) tile at the bottom of the section, below client preferences. (4) Time renders as 12-hour everywhere on the detail page; new shared `formatTime12Hour` helper in `lib/utils/formatting.ts`. (5) `JobEditForm` calls `router.refresh()` after save; `updateJob` now revalidates `/admin`; `<ScheduleSyncClient />` mounted on `/admin/jobs` and `/admin/jobs/[id]` for cross-tab realtime. |
| 2026-04-26 | `/admin/jobs` upgraded with summary cards, status tabs, search, and pagination (plan: `plans/2026-04-22-jobs-list-upgrade.md`). New components: `JobsSummaryCards`, `JobsFilters`, `JobsPagination`. `getJobsList` now accepts `{status, scope, search, page, pageSize}` and returns `{jobs, total}`; new `getJobsSummaryCounts` powers the cards. URL vocabulary: `status`, `scope`, `search`, `page`. |
| 2026-04-22 | `/admin/customers` restored: list with inspection counts, 3-tab filter (All/Agents/Sellers), search, inline edit and block-delete dialogs, sidebar link between Jobs and Inspectors (plan: `plans/2026-04-22-customers-list-and-detail.md`). Delete is blocked when inspections reference the customer. |
| 2026-04-22 | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` rotated in Google Cloud; new value pushed to Vercel Dev + Prod. Preview not yet set due to Vercel CLI v50.40.0 bug — needs CLI upgrade or one-time dashboard add. |
| 2026-04-22 | New-job intake form expanded to 17 fields across 5 sections (plan: `plans/2026-04-22-richer-new-job-form.md`). `validateIntakeInput` added to services layer. `createJob` action rewritten to handle full intake payload. Prereq: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` must be set in Vercel + `.env.local` for Places autocomplete; form falls back to plain input if missing. |
| 2026-04-08 | AIOS v2 refined to 22-file elite structure |
| 2026-04-08 | AIOS v2 structure created (initial 13 files) |
| 2026-04-08 | Full codebase audit completed (57 source files, all config, all context) |
| 2026-04-08 | TypeScript verification: 0 errors |
| 2026-04-06 | All 6 implementation plans executed (dispatch, inspectors, theme, etc.) |
