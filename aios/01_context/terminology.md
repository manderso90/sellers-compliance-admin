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
| **Job Status**        | The lifecycle state of a job: `requested` → `confirmed` → `in_progress` → `completed`. Additional states: `cancelled`, `on_hold`.                    |
| **Dispatch Status**   | The scheduling state of a job: `unscheduled` → `scheduled` → `dispatched` → `en_route`.                                                              |
| **Service Type**      | The category of work: `Inspection`, `Work Completion`, `Installation`, etc. Stored as `service_type` on inspections.                                  |
| **Unscheduled Queue** | The list of jobs that have been created but not yet scheduled or assigned to an inspector.                                                            |
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
| **Needs Work**         | An informal designation indicating that additional installation or corrections are required following inspection. Not a formal system status.                                       |
| **On-Site Completion** | When an inspector completes required work immediately during the inspection visit.                                                                                                 |
| **Work Authorization** | Approval (verbal or written) to proceed with installation or corrective work.                                                                                                      |

---

## System & Interface Terms

| Term                | Definition                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Command Center**  | The primary operational dashboard displaying daily jobs, inspector workload, scheduling gaps, and revenue metrics.   |
| **Dispatch Page**   | The interactive scheduling interface used to assign jobs, adjust times, and manage real-time scheduling changes.     |
| **Admin Dashboard** | System-wide view of jobs, customers, performance metrics, and operational data.                                      |
| **Job Detail Page** | The detailed view of a single job (`/admin/jobs/[id]`), showing property details, inspection results, line items, payments, and notes. |
| **Inspector View**  | Mobile-friendly interface used by inspectors to view assigned jobs, input results, upload photos, and complete work. |

---

## Financial & Transaction Terms

| Term                       | Definition                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Invoice**                | An itemized billing record generated for inspection and/or work completion services.                           |
| **Payment Status**         | The state of payment for a job: tracked via the `payments` table (amount, method, paid_at).                    |
| **Escrow Payment**         | Payment processed through escrow, typically via wire, courier, or check.                                       |
| **Online Payment**         | Payment made via credit card or payment link (e.g., Stripe).                                                   |
| **Preferred Partner Rate** | A discounted pricing structure applied to repeat clients or partners, often labeled as a loyalty-based credit. |

---

## Products & Payments

| Term                        | Definition                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Product**                 | A catalog item representing a service or part (e.g., smoke detector, water heater strap). Stored in the `products` table with pricing breakdown (price, part_cost, labor_cost). |
| **Line Item**               | A specific product applied to an inspection with quantity and pricing. Stored in `install_line_items`.             |
| **Payment**                 | A recorded payment against an inspection. Tracks amount, method, and timestamp. Stored in the `payments` table.   |
| **Checkout**                | The Stripe-powered payment flow where customers pay for services online via `/api/stripe/create-checkout`.        |
| **Customer Order**          | A self-service inspection request placed by a customer through the `/order` page.                                 |

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

* Use **”Job”** as the primary unit of work internally (avoid “ticket”)
* Use **”Customer Order”** for public-facing self-service requests via `/order`
* Use **”Inspection”** and **”Work Completion”** to distinguish service types clearly
* Use **”Dispatch”** when referring to scheduling actions
* Use **”Job Detail Page”** for the `/admin/jobs/[id]` screen
* Avoid vague terms like “task” unless explicitly defined