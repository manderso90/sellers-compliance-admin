// SchedulingContext — typed data contract for scheduling services
// Services depend ONLY on this interface, never on Supabase/Next.js/framework code.

/** Minimal inspector shape needed by scheduling services */
export interface SchedulingInspector {
  id: string
  full_name: string
  region: string
}

/** Minimal job shape needed for conflict checking on a given date */
export interface SchedulingExistingJob {
  id: string
  address: string
  scheduled_time: string | null
  scheduled_end: string | null
  estimated_duration_minutes: number
  assigned_to: string
}

/** The job being scheduled — carries all fields the suggestion engine needs */
export interface SchedulingTargetJob {
  id: string
  title: string
  address: string
  city: string
  has_lockbox: boolean
  estimated_duration_minutes: number
  requested_date: string | null
  requested_time_preference: string | null
}

/**
 * Data access contract consumed by scheduling services.
 *
 * The app provides a Supabase-backed implementation via `createSupabaseSchedulingContext()`.
 * A future MCP tool can supply an alternate implementation backed by MCP resources,
 * API calls, or test fixtures — same service logic, different data source.
 */
export interface SchedulingContext {
  /** All active inspectors available for scheduling */
  getActiveInspectors(): Promise<SchedulingInspector[]>

  /** All scheduled (non-cancelled) jobs for a specific date */
  getJobsForDate(date: string): Promise<SchedulingExistingJob[]>
}
