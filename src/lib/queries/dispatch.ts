import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { format } from 'date-fns'

export interface DispatchJob {
  id: string
  status: string
  title: string
  scheduled_time: string | null
  scheduled_end: string | null
  estimated_duration_minutes: number
  dispatch_status: string
  client_name: string
  address: string
  city: string
  zip_code: string
  has_lockbox: boolean
}

export interface DispatchInspector {
  id: string
  full_name: string | null
  jobs: DispatchJob[]
}

export async function getDispatchTimeline(
  supabase: SupabaseClient<Database>,
  date?: string
): Promise<DispatchInspector[]> {
  const targetDate = date || format(new Date(), 'yyyy-MM-dd')

  // Get all active inspectors (profiles with inspector role)
  const { data: inspectors, error: inspectorsError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('is_active', true)
    .contains('roles', ['inspector'])
    .order('full_name')

  if (inspectorsError) throw inspectorsError

  // Get all scheduled inspections for the date, with property and customer joins
  const { data: inspections, error: inspError } = await supabase
    .from('inspections')
    .select('id, status, service_type, includes_installation, scheduled_time, scheduled_end, estimated_duration_minutes, dispatch_status, assigned_inspector_id, lockbox_code, admin_notes, properties(street_address, city, zip_code), customers(full_name)')
    .eq('scheduled_date', targetDate)
    .not('assigned_inspector_id', 'is', null)
    .not('status', 'eq', 'cancelled')
    .order('scheduled_time', { ascending: true, nullsFirst: false })

  if (inspError) throw inspError

  // Group jobs by inspector
  const jobsByInspector = new Map<string, DispatchJob[]>()
  for (const row of inspections ?? []) {
    const inspectorId = row.assigned_inspector_id
    if (!inspectorId) continue
    if (!jobsByInspector.has(inspectorId)) {
      jobsByInspector.set(inspectorId, [])
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prop = (row as any).properties ?? {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cust = (row as any).customers ?? {}
    jobsByInspector.get(inspectorId)!.push({
      id: row.id,
      status: row.status,
      title: row.includes_installation ? 'Work Completion' : 'Inspection',
      scheduled_time: row.scheduled_time,
      scheduled_end: row.scheduled_end ?? null,
      estimated_duration_minutes: row.estimated_duration_minutes ?? 40,
      dispatch_status: row.dispatch_status ?? 'scheduled',
      client_name: cust.full_name ?? '',
      address: prop.street_address ?? '',
      city: prop.city ?? '',
      zip_code: prop.zip_code ?? '',
      has_lockbox: !!row.lockbox_code,
    })
  }

  return (inspectors ?? []).map((inspector) => ({
    id: inspector.id,
    full_name: inspector.full_name,
    jobs: jobsByInspector.get(inspector.id) ?? [],
  }))
}

export interface UnscheduledJob {
  id: string
  status: string
  title: string
  requested_date: string | null
  requested_time_preference: string | null
  notes: string | null
  estimated_duration_minutes: number
  created_at: string
  client_name: string
  address: string
  city: string
  zip_code: string
  has_lockbox: boolean
}

export async function getUnscheduledJobs(supabase: SupabaseClient<Database>): Promise<UnscheduledJob[]> {
  const { data, error } = await supabase
    .from('inspections')
    .select('id, status, service_type, includes_installation, requested_date, requested_time_preference, admin_notes, estimated_duration_minutes, created_at, lockbox_code, assigned_inspector_id, scheduled_date, properties(street_address, city, zip_code), customers(full_name)')
    .in('status', ['requested'])
    .or('scheduled_date.is.null,assigned_inspector_id.is.null')
    .order('requested_date', { ascending: true, nullsFirst: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prop = (row as any).properties ?? {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cust = (row as any).customers ?? {}
    return {
      id: row.id,
      status: row.status,
      title: row.includes_installation ? 'Work Completion' : 'Inspection',
      requested_date: row.requested_date,
      requested_time_preference: row.requested_time_preference,
      notes: row.admin_notes,
      estimated_duration_minutes: row.estimated_duration_minutes,
      created_at: row.created_at,
      client_name: cust.full_name ?? '',
      address: prop.street_address ?? '',
      city: prop.city ?? '',
      zip_code: prop.zip_code ?? '',
      has_lockbox: !!row.lockbox_code,
    }
  })
}
