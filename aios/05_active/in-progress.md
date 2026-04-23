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

- Deployment to Vercel (no project configured yet)
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

- **Git push from sandbox**: Cannot push from sandbox environment. Must push from local machine.
- **Deployment**: No Vercel project configured yet. Not blocking development.

## Recent Completions

| Date | Item |
|------|------|
| 2026-04-22 | `/admin/customers` restored: list with inspection counts, 3-tab filter (All/Agents/Sellers), search, inline edit and block-delete dialogs, sidebar link between Jobs and Inspectors (plan: `plans/2026-04-22-customers-list-and-detail.md`). Delete is blocked when inspections reference the customer. |
| 2026-04-22 | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` rotated in Google Cloud; new value pushed to Vercel Dev + Prod. Preview not yet set due to Vercel CLI v50.40.0 bug — needs CLI upgrade or one-time dashboard add. |
| 2026-04-22 | New-job intake form expanded to 17 fields across 5 sections (plan: `plans/2026-04-22-richer-new-job-form.md`). `validateIntakeInput` added to services layer. `createJob` action rewritten to handle full intake payload. Prereq: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` must be set in Vercel + `.env.local` for Places autocomplete; form falls back to plain input if missing. |
| 2026-04-08 | AIOS v2 refined to 22-file elite structure |
| 2026-04-08 | AIOS v2 structure created (initial 13 files) |
| 2026-04-08 | Full codebase audit completed (57 source files, all config, all context) |
| 2026-04-08 | TypeScript verification: 0 errors |
| 2026-04-06 | All 6 implementation plans executed (dispatch, inspectors, theme, etc.) |
