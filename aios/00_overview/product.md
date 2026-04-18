# Product Overview

## What Is Seller’s Compliance?

Seller’s Compliance is a compliance inspection and operations platform designed to support high-volume real estate transactions across Los Angeles and Orange Counties.

It is both:

* A **field service business** (inspections + installation work)
* A **system-driven operational platform** (scheduling, dispatch, workflow, and revenue tracking)

Seller’s Compliance is built on the foundation of GS Retrofit, but evolves it into a more streamlined, scalable, and systemized operation focused on speed, clarity, and execution.

---

## Core Value Proposition

Transform compliance from a fragmented, manual process into a **fast, predictable, and system-driven workflow**.

* Reduce scheduling and coordination time dramatically
* Deliver inspections in **10–15 minutes**
* Enable same-day or next-day service at scale
* Provide clear outcomes and immediate paths to completion

The goal is to turn compliance into a **frictionless step in the transaction**, not a bottleneck.

---

## Primary Users

### Scheduling & Dispatch Coordinator

Responsible for managing all incoming jobs, assigning inspectors, and handling real-time schedule changes.

### Inspectors (Field Technicians)

Execute inspections and complete work in the field using a mobile interface.

### Admin / Operations

Oversee system performance, workload distribution, and revenue tracking.

---

## Product Principles

* **Speed**
  Every interaction should be fast. Scheduling, dispatching, and updating jobs should take seconds.

* **Simplicity**
  The system should be intuitive and require little to no training.

* **Clarity**
  The full state of operations — jobs, inspectors, and workload — should be visible at a glance.

* **Operational Efficiency**
  Reduce clicks, eliminate unnecessary steps, and automate repeatable workflows.

* **Real-World Flexibility**
  The system must handle constant change: reschedules, reassignments, and same-day adjustments.

---

## Key Features

### Dispatch Timeline

* Visual drag-and-drop scheduling interface
* Organized by inspector
* Supports real-time rescheduling and reassignment
* Live updates via Supabase realtime subscriptions

---

### Job Management

* Create, edit, and track jobs through their lifecycle
* Job types:

  * **Inspection**
  * **Work Completion**
* Status tracking:
  `requested → confirmed → in_progress → completed → cancelled → on_hold`
* Property access tracking (lockbox vs. coordination required)

---

### Inspector Management

* Maintain inspector roster
* View daily workload and availability
* Assign and reassign inspectors dynamically
* Support real-time schedule balancing

---

### Unscheduled Jobs Queue

* Central queue of jobs awaiting scheduling
* Drag-and-drop directly onto the dispatch timeline
* Designed for rapid intake → assignment workflow

---

### Command Center (Operations Dashboard)

* High-level view of daily and weekly operations
* Inspector workload distribution
* Job status tracking
* Revenue visibility tied to jobs and services

---

### Customer Ordering

* Public-facing order form at `/order`
* Customers can request inspections directly (self-service)
* Order confirmation flow at `/order/confirmation`
* Creates inspection record in the system for coordinator review

---

### Payments & Invoicing

* Stripe-powered checkout for online payments (`/api/stripe/create-checkout`)
* Webhook-based payment confirmation (`/api/stripe/webhook`)
* Product catalog with part cost / labor cost breakdown (`products` table)
* Line item tracking per inspection (`install_line_items` table)
* Payment recording and status tracking (`payments` table)

---

### Employee Management

* Invite employees via email (Resend integration)
* Role-based access: admin, inspector, coordinator
* SC-branded invite email templates

---

### Workflow Automation

* Standardized scheduling and dispatch logic
* Scheduling suggestions engine with conflict detection
* Duration estimation for time blocking
* Reduced manual decision-making
* Faster job-to-completion cycle
* Immediate transition from inspection → work completion

---

## Service Integration (What the Product Supports)

Seller’s Compliance is tightly integrated with real-world services:

* Compliance inspections (10–15 minutes)
* On-site work completion
* Follow-up scheduling when needed
* Invoice generation and payment tracking

The platform is designed to support both **inspection-only workflows** and **inspection + installation workflows** seamlessly.

---

## Design Language — SC Bold

The SC Bold design system prioritizes clarity, speed, and operational readability:

* **Inter font** across all admin pages (set at layout level, inherited automatically)
* **True black sidebar** (`#000000`) with SC logo and inline SVG icons
* **Gold/red accent colors** — SC Gold (`#EFB948`), SC Red (`#C8102E`), Yellow highlight (`#FDE047`)
* **Warm white background** (`#FFFDF5`) with high-contrast cards and panels
* **Consistent page titles**: `text-[24px] font-bold text-[#2B2B2B] tracking-tight`
* **Pill-shaped user badge** with black/gold avatar and role label
* **Neo-shadow** CSS classes for bold card styling
* Desktop-optimized dispatch interface; mobile inspector view planned

---

## System Positioning

Seller’s Compliance is not just a scheduling tool — it is:

* A **dispatch system**
* A **field operations platform**
* A **revenue engine tied to real estate transactions**

---

## Long-Term Vision

* Reduce administrative workload significantly
* Increase daily job throughput
* Enable scalable multi-area operations
* Create a system that can eventually support franchising or expansion
* Become the **standard compliance workflow layer** in real estate transactions