# System Design

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| UI Library | React | 19.2.3 |
| Styling | Tailwind CSS v4 | ^4 |
| CSS Pipeline | @tailwindcss/postcss | ^4 |
| Component Primitives | @base-ui/react | ^1.2.0 |
| Database / Auth | Supabase (SSR) | ^2.98.0 |
| Drag & Drop | @dnd-kit/core | ^6.3.1 |
| Date Utilities | date-fns | ^4.1.0 |
| Icons | lucide-react | ^0.577.0 |
| Animations | tw-animate-css | ^1.4.0 |
| Utility | clsx, tailwind-merge, class-variance-authority | latest |
| TypeScript | ^5 | |

## Architecture Layers

Seller's Compliance follows a four-layer architecture:

```
┌──────────────────────────────┐
│        Components            │  React UI (client + server)
│  src/components/             │
├──────────────────────────────┤
│        Queries               │  Read-only data fetching
│  src/lib/queries/            │  Server-side Supabase reads
├──────────────────────────────┤
│        Actions               │  Mutations / Server Actions
│  src/lib/actions/            │  'use server' functions
├──────────────────────────────┤
│        Services              │  Orchestration layer
│  src/services/               │  Plain TS, no directives
├──────────────────────────────┤
│        Supabase              │  Client factories
│  src/lib/supabase/           │  client.ts + server.ts
└──────────────────────────────┘
```

### Queries (`src/lib/queries/`)
Read-only functions that fetch data from Supabase. No mutations, no side effects.
- `dispatch.ts` — getDispatchTimeline, getUnscheduledJobs
- `jobs.ts` — getJobsList
- `inspectors.ts` — getInspectors

### Actions (`src/lib/actions/`)
Server actions that perform mutations. Each is marked `'use server'`.
- `job-actions.ts` — createJob, updateJobStatus, deleteJob
- `dispatch-actions.ts` — scheduleFromDispatch, updateJobTime
- `inspector-actions.ts` — createInspector, updateInspector, deleteInspector
- `employee-actions.ts` — updateEmployee, deactivateEmployee, deleteEmployee
- `schedule-mutations.ts` — updateSchedule (with auto-confirm logic)

### Services (`src/services/`)
Orchestration modules for multi-step business logic. Plain TypeScript — no `'use server'`, no `'use client'`. Importable from either context.
- `job-lifecycle.ts` — Status validation and transitions
- `scheduling-context.ts` — Scheduling context management
- `scheduling-suggestions.ts` — AI/heuristic scheduling suggestions
- `dispatch-scheduling.ts` — Dispatch logic
- `conflict-detection.ts` — Schedule conflict detection
- `duration-estimation.ts` — Job duration estimation

### Supabase (`src/lib/supabase/`)
Client factories for browser and server contexts:
- `client.ts` — Browser Supabase client
- `server.ts` — Server-side Supabase client (uses cookies)

## Database Schema

Four tables in Supabase:

### team_members
Team members with role-based access.
- Roles: `admin`, `dispatcher`, `field_tech`
- Linked to Supabase auth via `auth.users(id)`

### inspectors
Field technicians who perform inspections.
- Region assignment: `Valley` or `Los Angeles`
- Active/inactive toggle

### jobs
Core entity — a single schedulable unit of work.
- Job types: `Inspection`, `Work` (stored in `title` field)
- Status lifecycle: `requested` → `confirmed` → `in_progress` → `completed` | `cancelled` | `on_hold`
- Dispatch status: `unscheduled` → `scheduled` → `dispatched` → `en_route`
- `has_lockbox` flag for property access
- `assigned_to` references an inspector
- Database triggers auto-compute `scheduled_end` from `scheduled_time + estimated_duration_minutes`

### job_status_history
Audit log tracking every status transition for a job.
- Records `from_status`, `to_status`, `changed_by`, and optional `note`

## Realtime

Jobs table has realtime enabled via `supabase_realtime` publication. The `use-schedule-sync` hook subscribes to `postgres_changes` on the jobs table to push live updates to the dispatch timeline.

## Authentication

Supabase Auth with SSR cookie management. Routes:
- `/api/auth/callback` — OAuth callback handler
- `/api/auth/logout` — Session termination
- `/login` — Login page
- `src/proxy.ts` — Middleware for auth protection
