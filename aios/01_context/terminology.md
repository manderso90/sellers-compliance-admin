# Terminology

A glossary of domain-specific terms used throughout Seller’s Compliance operations and system.

## Business Terms

| Term                       | Definition                                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Compliance Inspection**  | A visual inspection of a property to verify California point-of-sale safety requirements. Typically completed in 10–15 minutes. This is the core service of Seller’s Compliance. |
| **Inspector**              | A field technician who performs on-site inspections and may complete installation work. Inspectors operate on daily schedules and are assigned jobs through dispatch.            |
| **Dispatcher / Scheduler** | The person responsible for coordinating job assignments, managing schedules, and handling real-time changes. This role ensures efficient routing and time slot management.       |
| **Service Area**           | Geographic coverage zone for operations. Primary areas include **Los Angeles County** and **Orange County**.                                                                     |
| **Lockbox Access**         | A method of property entry using a lockbox. Jobs with lockbox access do not require the property owner or agent to be present.                                                   |

---

## Job & Scheduling Terms

| Term                  | Definition                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Job**               | A single unit of work in the system. Can be an inspection, a work completion, or both combined into one visit.                                       |
| **Job Type**          | Either `Inspection` (initial compliance check) or `Work Completion` (installation or correction of failed items).                                    |
| **Job Status**        | The lifecycle state of a job: `new` → `scheduled` → `in_progress` → `completed`. Additional states include `cancelled`, `on_hold`, and `needs_work`. |
| **Dispatch Status**   | The scheduling state of a job: `unassigned` → `scheduled` → `dispatched` → `en_route`.                                                               |
| **Unassigned Queue**  | The list of jobs that have been created but not yet scheduled or assigned to an inspector.                                                           |
| **Dispatch Timeline** | The visual scheduling interface showing a day’s workload by inspector, allowing drag-and-drop scheduling and real-time adjustments.                  |
| **Time Preference**   | A customer’s requested time window: `morning`, `afternoon`, `anytime`, or `flexible`.                                                                |
| **Reschedule**        | Changing the date or time of an existing job.                                                                                                        |
| **Reassignment**      | Changing the assigned inspector for a job.                                                                                                           |

---

## Inspection & Compliance Terms

| Term                   | Definition                                                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Compliance Items**   | Required safety features evaluated during inspection, including smoke detectors, carbon monoxide detectors, water heater strapping, overflow pipe, and low-flow plumbing fixtures. |
| **Passed Inspection**  | All compliance items meet requirements; no additional work needed.                                                                                                                 |
| **Failed Inspection**  | One or more compliance items do not meet requirements and must be corrected.                                                                                                       |
| **Needs Work**         | A job status indicating that additional installation or corrections are required following inspection.                                                                             |
| **On-Site Completion** | When an inspector completes required work immediately during the inspection visit.                                                                                                 |
| **Work Authorization** | Approval (verbal or written) to proceed with installation or corrective work.                                                                                                      |

---

## System & Interface Terms

| Term                | Definition                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Command Center**  | The primary operational dashboard displaying daily jobs, inspector workload, scheduling gaps, and revenue metrics.   |
| **Dispatch Page**   | The interactive scheduling interface used to assign jobs, adjust times, and manage real-time scheduling changes.     |
| **Admin Dashboard** | System-wide view of jobs, customers, performance metrics, and operational data.                                      |
| **Overview Page**   | The detailed view of a single job, including property details, inspection results, invoices, payments, and notes.    |
| **Inspector View**  | Mobile-friendly interface used by inspectors to view assigned jobs, input results, upload photos, and complete work. |

---

## Financial & Transaction Terms

| Term                       | Definition                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Invoice**                | An itemized billing record generated for inspection and/or work completion services.                           |
| **Payment Status**         | The state of payment for a job: `unpaid`, `paid`, or `pending`.                                                |
| **Escrow Payment**         | Payment processed through escrow, typically via wire, courier, or check.                                       |
| **Online Payment**         | Payment made via credit card or payment link (e.g., Stripe).                                                   |
| **Preferred Partner Rate** | A discounted pricing structure applied to repeat clients or partners, often labeled as a loyalty-based credit. |

---

## Technical Terms

| Term                      | Definition                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Server Action**         | A Next.js server-side function (`'use server'`) used for mutations (create, update, delete). Typically located in `src/lib/actions/`.   |
| **Query**                 | A read-only function that retrieves data from the database (Supabase). Located in `src/lib/queries/`.                                   |
| **Service Layer**         | A module that orchestrates multi-step business logic and workflows. Typically located in `src/services/`.                               |
| **Realtime Subscription** | A Supabase listener that streams live database updates to the UI (used for dispatch and command center updates).                        |
| **DnD (Drag and Drop)**   | Interaction powered by libraries such as `@dnd-kit`, used for scheduling and reassigning jobs visually.                                 |
| **System of Views**       | The architectural pattern separating the platform into Command Center, Dispatch, Admin, and Overview views for clarity and scalability. |

---

## Internal Language Guidelines

* Use **“Job”** as the primary unit of work (avoid “order” or “ticket”)
* Use **“Inspection”** and **“Work Completion”** to distinguish service types clearly
* Use **“Dispatch”** when referring to scheduling actions
* Use **“Overview Page”** for job detail screens
* Avoid vague terms like “task” unless explicitly defined