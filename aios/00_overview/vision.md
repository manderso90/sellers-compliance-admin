# Vision & Strategy

> Adapted for Seller’s Compliance — aligned with GS Retrofit operations and AIOS v2 system architecture.

## Current Focus Period

**Q2 2026 — Post-MVP Hardening & Scaling**

The core platform is built and deployed. This phase focuses on reliability, real data, operational polish, and closing feature gaps:

* Hardening dispatch and scheduling for daily use
* Revenue integration (Stripe payments live, product catalog active)
* Customer self-service ordering (`/order` flow live)
* Design system consolidation (SC Bold applied across all admin pages)
* Preparing for Inspector View (mobile-first field interface)

---

## Strategic Priorities

### 1. Operational System (Built)

The core platform is live, unifying:

* Job intake (admin + customer self-service via `/order`)
* Scheduling & dispatch (drag-and-drop timeline)
* Command Center (operations + revenue visibility)
* Product catalog and line item tracking
* Stripe payment processing

This system is now the **primary operating layer**.

---

### 2. Reduce Scheduling Time & Cognitive Load

Minimize the time and mental effort required to:

* Schedule jobs
* Assign inspectors
* Handle reschedules and changes

Target outcome:

* Scheduling becomes **fast, repeatable, and system-assisted**
* Administrative workload is significantly reduced

---

### 3. Enable Real-Time Operational Flexibility

Design the system to handle real-world volatility:

* Frequent rescheduling
* Inspector reassignment
* Same-day job additions
* On-the-fly changes during field execution

All updates should propagate instantly across:

* Dispatch
* Command Center
* Inspector View
* Overview Pages

---

### 4. Establish a Scheduling & Dispatch Logic Engine

Define and implement consistent system logic for:

* Inspector assignment (location, workload, efficiency)
* Time estimation (inspection + work scope)
* Route optimization
* Workload balancing across inspectors

This creates a **predictable, scalable scheduling framework**.

---

### 5. Build the Command Center (Operations + Revenue Engine)

Create a centralized operational dashboard that provides:

* Daily and weekly job visibility
* Inspector workload distribution
* Job status tracking
* Revenue tied directly to jobs and services

The Command Center should act as the **control panel for the entire business**.

---

### 6. AI-Assisted Operations (Foundation Built)

Intelligent system support is active:

* Scheduling suggestions engine (`src/services/scheduling-suggestions.ts`)
* Conflict detection (`src/services/conflict-detection.ts`)
* Duration estimation (`src/services/duration-estimation.ts`)
* Scheduling context management (`src/services/scheduling-context.ts`)

Current mode: **AI as an assistant, not full automation**. Dispatcher retains final decision authority.

---

### 7. Revenue Integration

Stripe checkout is live, product catalog exists, payment tracking built.

Next: close the loop on escrow payments (wire, check, courier) and revenue reporting.

---

### 8. Public Site & Customer Self-Service

The `/order` flow is live — customers can request inspections directly.

Next: order status tracking, customer portal for viewing results and paying online.

---

## What Success Looks Like

* Scheduling and dispatch can be managed in **a fraction of the current time**
* Jobs are assigned quickly with minimal manual coordination
* Schedule changes are handled in **seconds, not minutes**
* Inspector workload is balanced and clearly visible
* Unassigned jobs are reduced to near zero
* The system becomes the **central operating interface for the business**
* Inspection → Work Completion → Payment flows are seamlessly connected

---

## Key Decisions (Resolved)

### 1. Manual vs. System-Driven Control
**Resolved**: Hybrid approach. Drag-and-drop scheduling with system-assisted suggestions (scheduling suggestions engine built in `src/services/scheduling-suggestions.ts`). Dispatcher retains full control over final decisions.

### 2. Level of AI Involvement
**Resolved**: Assistant mode. System provides scheduling suggestions, conflict detection, and duration estimation. Dispatcher makes final decisions. No auto-scheduling.

### 3. Dispatch Interface Design
**Resolved**: Timeline-based with unscheduled queue. Horizontal 9AM-5PM timeline by inspector with drag-and-drop, plus collapsible unscheduled jobs queue at the bottom.

### 4. Handling Scheduling Volatility
**Resolved**: Supabase realtime subscriptions propagate changes instantly across all views. Drag-and-drop with immediate database updates. All connected browsers see changes in real-time.

### 5. Integration Across the System
**Resolved**: Shared Supabase tables. All views query the same `inspections`, `profiles`, `properties`, `customers` tables. Realtime sync keeps views consistent. One system, not disconnected tools.

---

## Strategic Direction

Seller’s Compliance is evolving into:

* A **dispatch and scheduling engine**
* A **field operations platform**
* A **revenue-driven system tied to real estate transactions**

This is not just software — it is the **operating system of the business**.

---

## Next Horizons

Concrete near-term priorities for the next phase of development:

1. **Inspector View** — Mobile-friendly interface for inspectors to see daily assignments, input results, upload photos, and update job status from the field. This is the largest missing piece for field operations.

2. **Escrow & Payment Reconciliation** — Close the loop on escrow payments (wire, check, courier) alongside Stripe online payments. Full revenue visibility per inspection.

3. **Customer Portal** — Post-order status tracking for customers. View inspection results, pay online, request follow-up work.

4. **Reporting & Analytics** — Weekly/monthly operational reports: job throughput, revenue by period, inspector utilization, average completion time.

---

## Long-Term Vision

* Standardize compliance workflows across real estate transactions
* Expand beyond Los Angeles and Orange County
* Enable multi-team scaling
* Support franchise or licensing models
* Deepen AI automation (auto-scheduling, predictive workload balancing)
* Position Seller’s Compliance as the **default compliance layer in real estate**

---

## AIOS Alignment

This document supports AIOS v2 as:

* **Source of truth for priorities**
* **Guidance for Claude Code development decisions**
* **Framework for feature sequencing and system design**

---

*Update this document as priorities evolve. This drives system direction, feature development, and operational decisions.*
