# Business Context

> Adapted for Seller's Compliance — based on GS Retrofit operational foundation.

## Organization Overview

Seller's Compliance is a home compliance inspection service designed to help property owners, real estate agents, and escrow teams meet California point-of-sale safety requirements quickly and efficiently.

Built on the operational experience of GS Retrofit, Seller's Compliance focuses on fast, reliable inspections and optional installation services that ensure properties meet required safety standards before closing.

The company operates as both a field service business and a system-driven workflow, combining streamlined scheduling, rapid inspections, and clear reporting to support high-volume real estate transactions.

### Mission

Eliminate friction in the compliance process by delivering:

* Fast turnaround times (same-day or next-day service)
* Clear, actionable inspection results
* Seamless coordination with agents and escrow
* Optional installation services to resolve issues immediately

Seller's Compliance transforms compliance from a fragmented, confusing process into a predictable and efficient experience.

---

## Products & Services

### Compliance Inspection Service

Visual inspections (typically 10-15 minutes) to verify California safety requirements, including:

* Smoke detectors (bedrooms and hallways)
* Carbon monoxide detectors (each level)
* Water heater strapping and overflow pipe
* Low-flow plumbing fixtures

### Work Completion / Installation Services

Optional services to correct failed items, including:

* Smoke and CO detector installation
* Water heater strapping
* Overflow pipe installation
* Toilet replacement
* Seismic gas shutoff valve installation (where applicable or requested)

### Scheduling & Dispatch System

Internal system designed to:

* Assign inspectors efficiently
* Handle real-time schedule changes
* Support high-volume daily operations
* Enable drag-and-drop rescheduling and reassignment

### Operational Command Center

Centralized visibility into:

* Daily and weekly workload
* Inspector assignments and availability
* Job status (scheduled, completed, at risk)
* Revenue tracking tied to inspections and installations

---

## Pricing

Standard inspection pricing starts at $125. Additional services are priced per the product catalog, which tracks part cost and labor cost per item. The `products` table stores the full catalog with pricing breakdown.

---

## Service Area

Seller's Compliance operates in **Los Angeles County** and **Orange County**, California.

---

## Key Operational Context

* Inspections are designed to be fast and minimally disruptive, often completed in 10-15 minutes
* The system must handle real-world scheduling volatility, including:
  * Frequent rescheduling
  * Same-day requests
  * Inspector reassignment
* Inspectors may complete work on-site immediately when authorized, requiring tight integration between inspection and installation workflows

---

## Technology & Integrations

| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | App Router, server components, server actions |
| **Supabase** | Database, auth, realtime subscriptions, row-level security |
| **Stripe** | Online checkout, payment processing, webhooks |
| **Resend** | Transactional email (employee invites, notifications) |
| **Vercel** | Hosting, deployment, serverless functions |

---

## Customer Channels

* **Phone/email coordination** — Traditional intake via the scheduling coordinator
* **Online self-service ordering** — Customer-facing order form at `/order`
* **Agent/escrow referral pipeline** — Referrals from real estate agents and escrow officers

---

## Development Approach

The platform is being actively developed using Claude Code and the AIOS workspace, with a strong emphasis on:

* Speed of iteration
* Real-world usability
* Operational scalability

---

## Long-Term Goals

* Reduce administrative workload
* Increase scheduling accuracy
* Maximize daily job throughput
* Provide full operational visibility across the business
