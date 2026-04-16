-- Seller's Compliance — Production Schema Reference
--
-- This file documents the tables our application code targets. It is NOT a
-- runnable migration — the live database already exists and was created by an
-- earlier effort. Capture the authoritative DDL with `pg_dump` if you need a
-- real migration artifact.
--
-- Tables touched by this application:
--   profiles, customers, properties, inspections, inspection_status_history
--
-- Not managed here but present in the database:
--   activity_log, inspection_items, inspection_photos, time_entries, etc.

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
  roles text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── customers ─────────────────────────────────────────────────────────────
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  company_name text,
  customer_type text not null default 'seller',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── properties ────────────────────────────────────────────────────────────
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  street_address text not null,
  unit text,
  city text not null,
  state text not null default 'CA',
  zip_code text not null,
  county text,
  property_type text not null default 'single_family',
  square_footage integer,
  year_built integer,
  latitude double precision,
  longitude double precision,
  bedrooms integer,
  bathrooms numeric,
  levels integer,
  adu_count integer,
  unit_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── inspections ───────────────────────────────────────────────────────────
-- Core record for a scheduled/completed job.
create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  assigned_inspector_id uuid references public.profiles(id) on delete set null,
  status text not null default 'requested'
    check (status in ('requested','confirmed','in_progress','completed','cancelled','on_hold')),
  requested_date date,
  requested_time_preference text,
  scheduled_date date,
  scheduled_time time,
  scheduled_end time,
  completed_at timestamptz,
  service_type text not null default 'Inspection',
  includes_installation boolean not null default false,
  access_instructions text,
  lockbox_code text,
  contact_on_site text,
  escrow_number text,
  escrow_officer_name text,
  listing_agent_name text,
  price numeric,
  invoice_number text,
  payment_status text,
  admin_notes text,
  public_notes text,
  schedule_notes text,
  estimated_duration_minutes integer not null default 40,
  inspection_labor_cost numeric,
  inspection_travel_cost numeric,
  started_at timestamptz,
  work_started_at timestamptz,
  inspector_outcome text,
  inspector_notes text,
  dispatch_status text not null default 'unscheduled'
    check (dispatch_status in ('unscheduled','scheduled','dispatched','en_route')),
  last_reassigned_by uuid references public.profiles(id) on delete set null,
  last_reassigned_at timestamptz,
  stripe_checkout_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── inspection_status_history ─────────────────────────────────────────────
-- Audit trail of status transitions on an inspection.
create table if not exists public.inspection_status_history (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);
