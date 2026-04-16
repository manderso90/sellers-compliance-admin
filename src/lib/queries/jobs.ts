import { createClient } from '@/lib/supabase/server'
import type { Job, JobStatusHistory, Inspection, Property, Customer } from '@/types/database'

/**
 * Shape returned by `select('*, properties(*), customers(*)')`. Supabase's type
 * inference can't resolve nested wildcard selects on our schema, so we declare
 * the expected shape and cast at the query boundary.
 */
type InspectionWithJoins = Inspection & {
  properties: Property | null
  customers: Customer | null
}

/** Flatten an inspection row with nested properties/customers into the Job shape components expect */
function flattenInspection(
  row: InspectionWithJoins,
  inspectorName: string | null = null
): Job & { inspector_name: string | null } {
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
    title: row.service_type ?? '',
    has_lockbox: !!row.lockbox_code,
    notes: row.admin_notes ?? null,
    inspector_name: inspectorName,
  }
}

export async function getJobsList(): Promise<(Job & { inspector_name: string | null })[]> {
  const supabase = await createClient()

  const { data: inspections, error: inspError } = await supabase
    .from('inspections')
    .select('*, properties(*), customers(*)')
    .order('created_at', { ascending: false })

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

  return rows.map((row) =>
    flattenInspection(
      row,
      row.assigned_inspector_id ? (inspectorMap[row.assigned_inspector_id] ?? null) : null
    )
  )
}

export async function getJobById(jobId: string): Promise<(Job & { inspector_name: string | null }) | null> {
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
