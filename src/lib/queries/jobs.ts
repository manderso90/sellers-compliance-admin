import { createClient } from '@/lib/supabase/server'
import { endOfWeek, format, startOfWeek } from 'date-fns'
import type { Job, JobStatus, JobStatusHistory, Inspection, Property, Customer } from '@/types/database'

/**
 * Shape returned by `select('*, properties(*), customers(*)')`. Supabase's type
 * inference can't resolve nested wildcard selects on our schema, so we declare
 * the expected shape and cast at the query boundary.
 */
type InspectionWithJoins = Inspection & {
  properties: Property | null
  customers: Customer | null
}

export type JobWithJoins = Job & { inspector_name: string | null }

export type JobsListScope = 'today' | 'week' | 'unscheduled'

export interface JobsListOptions {
  /** One of the 6-state model values; ignored if not a known status. */
  status?: string
  /** Pseudo-filter: 'today' / 'week' expand to scheduled_date ranges; 'unscheduled' filters dispatch_status. */
  scope?: JobsListScope
  /** Case-insensitive substring matched against customer full_name and property street_address. */
  search?: string
  /** 1-indexed page number; defaults to 1. */
  page?: number
  /** Page size; defaults to 30. */
  pageSize?: number
}

export interface JobsListResult {
  jobs: JobWithJoins[]
  total: number
}

/** Flatten an inspection row with nested properties/customers into the Job shape components expect */
function flattenInspection(
  row: InspectionWithJoins,
  inspectorName: string | null = null
): JobWithJoins {
  const prop = row.properties ?? null
  const cust = row.customers ?? null
  return {
    ...row,
    // Flattened property fields
    address: prop?.street_address ?? '',
    city: prop?.city ?? '',
    state: prop?.state ?? '',
    zip_code: prop?.zip_code ?? '',
    // Flattened customer fields
    client_name: cust?.full_name ?? '',
    client_phone: cust?.phone ?? null,
    client_email: cust?.email ?? null,
    // Mapped fields
    title: row.includes_installation ? 'Work Completion' : 'Inspection',
    has_lockbox: !!row.lockbox_code,
    notes: row.admin_notes ?? null,
    inspector_name: inspectorName,
  }
}

/** ISO week (Mon–Sun) range in `yyyy-MM-dd` form, plus today, anchored to the server clock. */
function dateBoundaries() {
  const now = new Date()
  return {
    today: format(now, 'yyyy-MM-dd'),
    weekStart: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    weekEnd: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }
}

export async function getJobsList(opts: JobsListOptions = {}): Promise<JobsListResult> {
  const supabase = await createClient()

  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.max(1, opts.pageSize ?? 30)
  const search = opts.search?.trim() ?? ''

  let query = supabase
    .from('inspections')
    .select('*, properties(*), customers(*)', { count: 'exact' })

  if (opts.status) {
    // Caller is responsible for restricting to the 6-state model; the column
    // is typed JobStatus but we accept a free-form string at this boundary.
    query = query.eq('status', opts.status as JobStatus)
  }

  if (opts.scope) {
    const { today, weekStart, weekEnd } = dateBoundaries()
    if (opts.scope === 'today') {
      query = query.eq('scheduled_date', today)
    } else if (opts.scope === 'week') {
      query = query.gte('scheduled_date', weekStart).lte('scheduled_date', weekEnd)
    } else if (opts.scope === 'unscheduled') {
      query = query.eq('dispatch_status', 'unscheduled')
    }
  }

  // Search: PostgREST can't OR-ilike across two foreign tables in one call, so
  // pre-resolve matching customer/property IDs and constrain the inspections
  // query with .in() on each FK. Two extra small queries; volume is low.
  if (search) {
    const pattern = `%${search}%`
    const [custIdsRes, propIdsRes] = await Promise.all([
      supabase.from('customers').select('id').ilike('full_name', pattern),
      supabase.from('properties').select('id').ilike('street_address', pattern),
    ])
    if (custIdsRes.error) throw custIdsRes.error
    if (propIdsRes.error) throw propIdsRes.error

    const customerIds = (custIdsRes.data ?? []).map((r) => r.id)
    const propertyIds = (propIdsRes.data ?? []).map((r) => r.id)

    if (customerIds.length === 0 && propertyIds.length === 0) {
      return { jobs: [], total: 0 }
    }

    const orParts: string[] = []
    if (customerIds.length > 0) orParts.push(`customer_id.in.(${customerIds.join(',')})`)
    if (propertyIds.length > 0) orParts.push(`property_id.in.(${propertyIds.join(',')})`)
    query = query.or(orParts.join(','))
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: inspections, error: inspError, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (inspError) throw inspError

  const rows = (inspections ?? []) as unknown as InspectionWithJoins[]

  // Collect unique inspector IDs to batch-fetch names
  const inspectorIds = [
    ...new Set(
      rows
        .map((i) => i.assigned_inspector_id)
        .filter((id): id is string => id !== null)
    ),
  ]

  let inspectorMap: Record<string, string> = {}
  if (inspectorIds.length > 0) {
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', inspectorIds)

    if (profError) throw profError

    const profileRows = (profiles ?? []) as unknown as Array<{ id: string; full_name: string | null }>
    inspectorMap = Object.fromEntries(
      profileRows.map((p) => [p.id, p.full_name ?? p.id])
    )
  }

  const jobs = rows.map((row) =>
    flattenInspection(
      row,
      row.assigned_inspector_id ? (inspectorMap[row.assigned_inspector_id] ?? null) : null
    )
  )

  return { jobs, total: count ?? jobs.length }
}

/**
 * Counts powering the four summary cards on /admin/jobs. Predicates here must
 * stay in sync with the `scope` / `status` branches in `getJobsList`, otherwise
 * a card count and the row count it links to will drift.
 */
export async function getJobsSummaryCounts(): Promise<{
  today: number
  week: number
  unscheduled: number
  needsReview: number
}> {
  const supabase = await createClient()
  const { today, weekStart, weekEnd } = dateBoundaries()

  const [todayRes, weekRes, unscheduledRes, needsReviewRes] = await Promise.all([
    supabase.from('inspections').select('id', { count: 'exact', head: true }).eq('scheduled_date', today),
    supabase.from('inspections').select('id', { count: 'exact', head: true }).gte('scheduled_date', weekStart).lte('scheduled_date', weekEnd),
    supabase.from('inspections').select('id', { count: 'exact', head: true }).eq('dispatch_status', 'unscheduled'),
    supabase.from('inspections').select('id', { count: 'exact', head: true }).eq('status', 'on_hold'),
  ])

  return {
    today: todayRes.count ?? 0,
    week: weekRes.count ?? 0,
    unscheduled: unscheduledRes.count ?? 0,
    needsReview: needsReviewRes.count ?? 0,
  }
}

export async function getJobById(jobId: string): Promise<JobWithJoins | null> {
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('inspections')
    .select('*, properties(*), customers(*)')
    .eq('id', jobId)
    .single()

  if (error || !row) return null

  const inspection = row as unknown as InspectionWithJoins

  let inspectorName: string | null = null
  if (inspection.assigned_inspector_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', inspection.assigned_inspector_id)
      .single()

    inspectorName = (profile as unknown as { full_name: string | null } | null)?.full_name ?? null
  }

  return flattenInspection(inspection, inspectorName)
}

export async function getJobStatusHistory(jobId: string): Promise<(JobStatusHistory & { changed_by_name: string | null })[]> {
  const supabase = await createClient()

  const { data: history, error } = await supabase
    .from('inspection_status_history')
    .select('*')
    .eq('inspection_id', jobId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const historyRows = (history ?? []) as unknown as JobStatusHistory[]

  // Batch-fetch profile names for changed_by
  const changerIds = [
    ...new Set(
      historyRows
        .map((h) => h.changed_by)
        .filter((id): id is string => id !== null)
    ),
  ]

  let changerMap: Record<string, string> = {}
  if (changerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', changerIds)

    const profileRows = (profiles ?? []) as unknown as Array<{ id: string; full_name: string | null; email: string }>
    changerMap = Object.fromEntries(
      profileRows.map((p) => [p.id, p.full_name ?? p.email ?? 'Unknown'])
    )
  }

  return historyRows.map((h) => ({
    ...h,
    changed_by_name: h.changed_by ? (changerMap[h.changed_by] ?? null) : null,
  }))
}

export async function getActiveInspectors(): Promise<{ id: string; full_name: string | null }[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('is_active', true)
    .contains('roles', ['inspector'])
    .order('full_name')

  if (error) throw error
  return (data ?? []) as unknown as { id: string; full_name: string | null }[]
}
