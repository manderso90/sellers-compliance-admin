# Data Model

> Adapted for Seller’s Compliance — operational data structure for inspections, dispatch, and workflow management. 

Complete reference for core entities, relationships, and system behavior within Seller’s Compliance.

---

## Entity Relationship Overview

```
┌─────────────────┐       ┌──────────────────┐
│  team_members    │       │    inspectors     │
│─────────────────│       │──────────────────│
│ id (PK, FK→auth)│       │ id (PK, uuid)    │
│ email            │       │ full_name         │
│ full_name        │       │ phone             │
│ role             │       │ email             │
│ phone            │       │ is_active         │
│ is_active        │       │ service_area      │
│ avatar_url       │       │ notes             │
│ created_at       │       │ created_at        │
│ updated_at       │       │ updated_at        │
└────────┬────────┘       └────────┬──────────┘
         │ changed_by              │ assigned_to
         ▼                         ▼
┌──────────────────────────────────────────────┐
│                    jobs                       │
│──────────────────────────────────────────────│
│ id (PK, uuid)                                │
│ job_type                                     │
│ client_name, client_phone, client_email      │
│ address, city, state, zip_code               │
│ status, dispatch_status                      │
│ assigned_to (FK → inspectors.id)             │
│ requested_date, time_preference              │
│ scheduled_date, scheduled_time, scheduled_end│
│ estimated_duration_minutes                   │
│ has_lockbox                                  │
│ notes, schedule_notes                        │
│ last_reassigned_by, last_reassigned_at       │
│ created_at, updated_at                       │
└──────────────────┬───────────────────────────┘
                   │ job_id
                   ▼
┌──────────────────────────────────────────────┐
│            job_status_history                 │
│──────────────────────────────────────────────│
│ id (PK, uuid)                                │
│ job_id (FK → jobs.id, CASCADE)               │
│ changed_by (FK → team_members.id, SET NULL)  │
│ from_status, to_status                       │
│ note                                         │
│ created_at                                   │
└──────────────────────────────────────────────┘
```

---

## Table Details

### team_members

Internal system users (Admin, Dispatch, Operations).

| Column     | Type        | Constraints                               | Notes                               |
| ---------- | ----------- | ----------------------------------------- | ----------------------------------- |
| id         | uuid        | PK, FK → auth.users(id) ON DELETE CASCADE | Linked to authentication            |
| email      | text        | NOT NULL                                  |                                     |
| full_name  | text        | nullable                                  |                                     |
| role       | text        | NOT NULL                                  | `admin`, `dispatcher`, `operations` |
| phone      | text        | nullable                                  |                                     |
| is_active  | boolean     | NOT NULL                                  | Default: true                       |
| avatar_url | text        | nullable                                  |                                     |
| created_at | timestamptz | NOT NULL                                  | Default: now()                      |
| updated_at | timestamptz | NOT NULL                                  | Auto-updated                        |

---

### inspectors

Field technicians executing inspections and work.

| Column       | Type        | Constraints | Notes                                |
| ------------ | ----------- | ----------- | ------------------------------------ |
| id           | uuid        | PK          | Default: gen_random_uuid()           |
| full_name    | text        | NOT NULL    |                                      |
| phone        | text        | nullable    |                                      |
| email        | text        | nullable    |                                      |
| is_active    | boolean     | NOT NULL    | Default: true                        |
| service_area | text        | NOT NULL    | e.g., `Los Angeles`, `Orange County` |
| notes        | text        | nullable    |                                      |
| created_at   | timestamptz | NOT NULL    | Default: now()                       |
| updated_at   | timestamptz | NOT NULL    | Auto-updated                         |

**Key distinction**: Inspectors are not system-authenticated users. They are managed resources within dispatch.

---

### jobs

Core operational entity representing all work performed.

| Column                     | Type        | Constraints         | Notes                             |
| -------------------------- | ----------- | ------------------- | --------------------------------- |
| id                         | uuid        | PK                  | Default: gen_random_uuid()        |
| job_type                   | text        | NOT NULL            | `Inspection` or `Work Completion` |
| client_name                | text        | NOT NULL            |                                   |
| client_phone               | text        | nullable            |                                   |
| client_email               | text        | nullable            |                                   |
| address                    | text        | NOT NULL            |                                   |
| city                       | text        | NOT NULL            |                                   |
| state                      | text        | NOT NULL            | Default: `CA`                     |
| zip_code                   | text        | NOT NULL            |                                   |
| status                     | text        | NOT NULL            | Lifecycle state                   |
| dispatch_status            | text        | NOT NULL            | Scheduling state                  |
| assigned_to                | uuid        | FK → inspectors(id) | nullable                          |
| requested_date             | date        | nullable            | Customer preference               |
| time_preference            | text        | nullable            | `morning`, `afternoon`, etc.      |
| scheduled_date             | date        | nullable            | Confirmed date                    |
| scheduled_time             | time        | nullable            | Start time                        |
| scheduled_end              | time        | auto-computed       | Based on duration                 |
| estimated_duration_minutes | integer     | NOT NULL            | Based on scope                    |
| has_lockbox                | boolean     | NOT NULL            | Default: false                    |
| notes                      | text        | nullable            | General notes                     |
| schedule_notes             | text        | nullable            | Dispatch notes                    |
| last_reassigned_by         | uuid        | nullable            |                                   |
| last_reassigned_at         | timestamptz | nullable            |                                   |
| created_at                 | timestamptz | NOT NULL            |                                   |
| updated_at                 | timestamptz | NOT NULL            |                                   |

---

### job_status_history

Tracks all job state changes for audit and visibility.

| Column      | Type        | Constraints           | Notes          |
| ----------- | ----------- | --------------------- | -------------- |
| id          | uuid        | PK                    |                |
| job_id      | uuid        | FK → jobs(id)         | CASCADE delete |
| changed_by  | uuid        | FK → team_members(id) | nullable       |
| from_status | text        | nullable              |                |
| to_status   | text        | NOT NULL              |                |
| note        | text        | nullable              |                |
| created_at  | timestamptz | NOT NULL              |                |

**Important**: This table is **append-only** and never updated.

---

## Database Triggers

### compute_scheduled_end

Automatically calculates:

* `scheduled_end = scheduled_time + estimated_duration_minutes`

Ensures accurate time blocking for dispatch and scheduling.

---

### update_updated_at

Applies to:

* jobs
* team_members
* inspectors

Automatically updates `updated_at` on every change.

---

## Row Level Security (RLS)

All tables have RLS enabled.

**Current State**:

* Authenticated users can read/write all records

**Future Direction**:

* Role-based restrictions:

  * Admin → full access
  * Dispatcher → scheduling + jobs
  * Inspector → limited job visibility

---

## Realtime

* Realtime updates enabled for **jobs table only**
* Powers:

  * Dispatch Timeline updates
  * Command Center live data
  * Multi-user synchronization

---

## Enum Values (Application-Level)

```typescript
type TeamMemberRole = 'admin' | 'dispatcher' | 'operations'

type JobType = 'Inspection' | 'Work Completion'

type JobStatus =
  | 'requested'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'on_hold'

type DispatchStatus =
  | 'unscheduled'
  | 'scheduled'
  | 'dispatched'
  | 'en_route'

type TimePreference =
  | 'morning'
  | 'afternoon'
  | 'anytime'
  | 'flexible'
```

---

## Key Design Principles

* **Jobs are the central unit of the system**
* **Dispatch state and job state are separate but connected**
* **Inspectors are resources, not users**
* **All scheduling is time-block driven**
* **System must support real-time updates and high volatility**

---

## Future Extensions (Planned)

* Invoice + payments table (linked to jobs)
* Work scope / line items (for installations)
* Route optimization layer
* AI scheduling recommendation engine
* Multi-area scaling support
