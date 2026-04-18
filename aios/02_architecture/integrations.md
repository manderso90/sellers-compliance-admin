# Integrations

External services, APIs, and systems that Seller's Compliance connects to or may integrate with in the future.

## Current Integrations

### Supabase
**Status**: Active — core dependency

| Capability | Usage |
|-----------|-------|
| **Database** | PostgreSQL via Supabase client. 8 tables (profiles, inspections, properties, customers, inspection_status_history, payments, products, install_line_items). |
| **Auth** | Email/password + OAuth. SSR cookie management. |
| **Realtime** | postgres_changes subscription on `jobs` table. |
| **RLS** | Row Level Security on all tables. |

**Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anonymous/public key

**Client factories**: `src/lib/supabase/server.ts` (server) and `src/lib/supabase/client.ts` (browser).

### Google Fonts (Inter)
**Status**: Active — design dependency

Fonts loaded via `next/font/google` in `src/app/layout.tsx`:
- **Inter** — all UI text (body, headings, labels)

Part of the SC Bold design system.

### Vercel
**Status**: Active — production deployment

Seller's Compliance is deployed on Vercel. Next.js App Router with serverless functions.

### Stripe
**Status**: Active — payment processing

| Capability | Usage |
|-----------|-------|
| **Checkout** | Online payment for inspections via `/api/stripe/create-checkout` |
| **Webhooks** | Payment confirmation via `/api/stripe/webhook` |

**Environment Variables**:
- `STRIPE_SECRET_KEY` — Server-side API key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Client-side key
- `STRIPE_WEBHOOK_SECRET` — Webhook signature verification

### Resend
**Status**: Active — transactional email

Used for employee invite emails via `/api/employees/invite`. SC-branded HTML templates.

**Environment Variables**:
- `RESEND_API_KEY` — API key for sending emails

## Planned Integrations

### Seller's Compliance Platform
**Priority**: Medium
**Purpose**: Share inspection data between dispatch and compliance tracking.
**Open question**: Should this be a shared Supabase project, API integration, or separate databases with sync?

### Phone System / Call Analytics
**Priority**: Medium-High
**Purpose**: Auto-create jobs from incoming call data. Track call-to-scheduled conversion.
**Data needed**: Caller info, call duration, call outcome.

### CRM / Customer Intake
**Priority**: Medium
**Purpose**: Pull customer requests from web forms directly into the unscheduled queue.
**Current state**: Jobs are created manually through the admin UI.

### SMS / Notification Service
**Priority**: High
**Purpose**: Send appointment confirmations, reminders, and schedule changes to clients and inspectors.
**Candidates**: Twilio, Resend (already in use for email).

### Geocoding / Route Optimization
**Priority**: Low
**Purpose**: Optimize inspector routes based on job addresses. Reduce travel time between appointments.
**Note**: Seller's Compliance already has `geocodeProperty` in `@/lib/utils/geocoding` — potential to share.

## Integration Rules

1. **All external API keys go in `.env.local`** — never committed to git.
2. **Server-side only** — API calls to external services happen in server actions or API routes, never in client components.
3. **Graceful degradation** — If an integration is down, the core dispatch workflow must still function.
4. **No tight coupling** — Integrations should be behind service modules so they can be swapped without changing business logic.
