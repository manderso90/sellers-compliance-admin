-- Seller's Compliance — Authoritative Schema Reference
--
-- Generated from the live database on 2026-04-22 via the Supabase Management
-- API (information_schema.columns + pg_constraint + pg_indexes). This file is
-- the source of truth for table layout, CHECK allow-lists, PK/FK/UNIQUE
-- constraints, and btree indexes for the tables our application reads or
-- writes.
--
-- Out of scope of this file (documented elsewhere / not yet captured):
--   - Triggers (e.g. scheduled_end computation, updated_at touch)
--   - RLS policies
--   - Functions / stored procedures
--   - Tables present in the DB but not touched by this app (activity_log,
--     inspection_items, inspection_photos, time_entries, …)
--
-- To refresh: re-run the Management API queries documented in
-- plans/2026-04-22-fix-service-type-check-constraint.md Step 0.

-- ─── profiles ───────────────────────────────────────────────────────────────
-- 1:1 with auth.users. `roles` is an array so a single profile can hold
-- multiple roles (e.g. ['admin', 'dispatcher']).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  is_active boolean not null default true,
  avatar_url text,
  home_latitude double precision,
  home_longitude double precision,
  roles text[] not null default array['inspector'::text],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_roles_check
    check (roles <@ array['super_admin','admin','inspector','worker','external','agent','escrow','coordinator']),
  constraint profiles_roles_not_empty
    check (array_length(roles, 1) > 0)
);

-- ─── customers ─────────────────────────────────────────────────────────────
create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text not null unique,
  phone text,
  company_name text,
  customer_type text not null default 'agent'
    check (customer_type in ('agent','broker','transaction_coordinator','seller','escrow','other')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_email on public.customers (email);

-- ─── properties ────────────────────────────────────────────────────────────
create table if not exists public.properties (
  id uuid primary key default uuid_generate_v4(),
  street_address text not null,
  unit text,
  city text not null,
  state text not null default 'CA',
  zip_code text not null,
  county text,
  property_type text not null default 'single_family'
    check (property_type in ('single_family','condo','townhouse','multi_family','other')),
  square_footage integer,
  year_built integer,
  latitude double precision,
  longitude double precision,
  bedrooms integer,
  bathrooms integer,
  levels integer default 1,
  adu_count integer default 0,
  unit_count integer default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_properties_geo
  on public.properties (latitude, longitude)
  where latitude is not null;

-- ─── inspections ───────────────────────────────────────────────────────────
-- Core record for a scheduled/completed job.
--
-- Important column semantics:
--   service_type              — tier: 'standard' | 'reinspection' | 'work'
--   includes_installation     — boolean distinguishing Inspection from Work
--                               Completion (NOT service_type)
--   status                    — lifecycle state (see CHECK for full allow-list;
--                               live DB accepts 11 values, broader than the
--                               6-state model in aios/03_workflows and
--                               services/job-lifecycle.ts — drift tracked
--                               separately)
--   dispatch_status           — scheduling state; NO CHECK constraint in live
--                               DB. Application-level validation only.
create table if not exists public.inspections (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  assigned_inspector_id uuid references public.profiles(id) on delete set null,
  status text not null default 'requested'
    check (status in (
      'requested',
      'awaiting_confirmation',
      'alternatives_offered',
      'confirmed',
      'in_progress',
      'work_in_progress',
      'completed',
      'no_show',
      'hold',
      'needs_rescheduling',
      'cancelled'
    )),
  requested_date date,
  requested_time_preference text
    check (requested_time_preference in ('morning','afternoon','anytime','flexible')),
  scheduled_date date,
  scheduled_time time,
  scheduled_end time,
  completed_at timestamptz,
  service_type text not null default 'standard'
    check (service_type in ('standard','reinspection','work')),
  includes_installation boolean not null default false,
  access_instructions text,
  lockbox_code text,
  contact_on_site text,
  escrow_number text,
  escrow_officer_name text,
  listing_agent_name text,
  price numeric,
  invoice_number text,
  payment_status text default 'unpaid'
    check (payment_status in ('unpaid','invoiced','paid','waived')),
  admin_notes text,
  public_notes text,
  schedule_notes text,
  estimated_duration_minutes integer not null default 40,
  inspection_labor_cost numeric default 0,
  inspection_travel_cost numeric default 0,
  started_at timestamptz,
  work_started_at timestamptz,
  inspector_outcome text
    check (inspector_outcome in (
      'completed_no_work',
      'completed_with_work',
      'work_needed_future',
      'reinspection_required',
      'unable_to_complete'
    )),
  inspector_notes text,
  dispatch_status text not null default 'unscheduled',
  last_reassigned_by uuid references public.profiles(id) on delete set null,
  last_reassigned_at timestamptz,
  stripe_checkout_session_id text,
  listing_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inspections_assigned_inspector on public.inspections (assigned_inspector_id);
create index if not exists idx_inspections_created_at        on public.inspections (created_at desc);
create index if not exists idx_inspections_customer_id       on public.inspections (customer_id);
create index if not exists idx_inspections_listing_id        on public.inspections (listing_id) where listing_id is not null;
create index if not exists idx_inspections_property_id       on public.inspections (property_id);
create index if not exists idx_inspections_scheduled_date    on public.inspections (scheduled_date);
create index if not exists idx_inspections_status            on public.inspections (status);

-- ─── inspection_status_history ─────────────────────────────────────────────
-- Append-only audit trail of status transitions on an inspection.
create table if not exists public.inspection_status_history (
  id uuid primary key default uuid_generate_v4(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);
