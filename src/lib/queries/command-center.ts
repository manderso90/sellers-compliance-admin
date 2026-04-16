import { createClient } from '@/lib/supabase/server'
import type { JobStatus, DispatchStatus } from '@/types/database'

export interface RiskJob {
  id: string
  title: string
  address: string
  status: JobStatus
  dispatch_status: DispatchStatus
  assigned_to: string | null
  inspector_name: string | null
  scheduled_date: string | null
}

export interface InspectorWorkloadItem {
  id: string
  full_name: string | null
  is_active: boolean
  totalAssigned: number
  todayCount: number
}

export interface CommandCenterData {
  // Summary counts
  totalActiveJobs: number
  byStatus: Record<string, number>
  unassignedPendingCount: number
  todayScheduledCount: number
  onHoldCount: number

  // At-risk jobs grouped by severity
  critical: {
    confirmedUnscheduled: RiskJob[]
    inactiveInspector: RiskJob[]
    overdueUnconfirmed: RiskJob[]
  }
  needsAttention: {
    unassignedPending: RiskJob[]
    onHold: RiskJob[]
    assignedNoSchedule: RiskJob[]
  }

  // Inspector workload
  inspectorWorkload: InspectorWorkloadItem[]
}

export async function getCommandCenterData(): Promise<CommandCenterData> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Three parallel queries
  const [inspectionsResult, inspectorsResult, todayCountResult] = await Promise.all([
    // All non-terminal inspections with property join for address
    supabase
      .from('inspections')
      .select('id, service_type, status, dispatch_status, assigned_inspector_id, scheduled_date, properties(street_address)')
      .not('status', 'in', '("completed","cancelled")'),
    // All inspector profiles
    supabase
      .from('profiles')
      .select('id, full_name, is_active')
      .contains('roles', ['inspector']),
    // Today's scheduled count
    supabase
      .from('inspections')
      .select('id', { count: 'exact', head: true })
      .eq('scheduled_date', today)
      .not('status', 'in', '("completed","cancelled")'),
  ])

  if (inspectionsResult.error) throw inspectionsResult.error
  if (inspectorsResult.error) throw inspectorsResult.error

  const inspections = inspectionsResult.data ?? []
  const inspectors = inspectorsResult.data ?? []
  const todayScheduledCount = todayCountResult.count ?? 0

  // Build inspector lookup
  const inspectorMap = new Map(inspectors.map((i) => [i.id, i]))
  const inactiveIds = new Set(
    inspectors.filter((i) => !i.is_active).map((i) => i.id)
  )

  // --- Summary counts ---
  const byStatus: Record<string, number> = {}
  for (const insp of inspections) {
    byStatus[insp.status] = (byStatus[insp.status] ?? 0) + 1
  }

  const unassignedPendingCount = inspections.filter(
    (i) => i.status === 'requested' && !i.assigned_inspector_id
  ).length

  const onHoldCount = byStatus['on_hold'] ?? 0

  // Helper to convert to RiskJob shape
  function toRiskJob(row: typeof inspections[number]): RiskJob {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prop = (row as any).properties ?? {}
    return {
      id: row.id,
      title: row.service_type,
      address: prop.street_address ?? '',
      status: row.status as JobStatus,
      dispatch_status: row.dispatch_status as DispatchStatus,
      assigned_to: row.assigned_inspector_id,
      inspector_name: row.assigned_inspector_id
        ? (inspectorMap.get(row.assigned_inspector_id)?.full_name ?? null)
        : null,
      scheduled_date: row.scheduled_date,
    }
  }

  // --- At-risk: Critical ---
  const confirmedUnscheduled = inspections
    .filter((i) => i.status === 'confirmed' && (!i.scheduled_date || !i.assigned_inspector_id))
    .map(toRiskJob)

  const inactiveInspector = inspections
    .filter((i) => i.assigned_inspector_id && inactiveIds.has(i.assigned_inspector_id))
    .map(toRiskJob)

  const overdueUnconfirmed = inspections
    .filter(
      (i) =>
        i.status === 'requested' &&
        i.scheduled_date !== null &&
        i.scheduled_date < today
    )
    .map(toRiskJob)

  // --- At-risk: Needs Attention ---
  const unassignedPending = inspections
    .filter((i) => i.status === 'requested' && !i.assigned_inspector_id)
    .map(toRiskJob)

  const onHold = inspections
    .filter((i) => i.status === 'on_hold')
    .map(toRiskJob)

  const assignedNoSchedule = inspections
    .filter((i) => i.assigned_inspector_id && !i.scheduled_date)
    .map(toRiskJob)

  // --- Inspector workload ---
  const workloadMap = new Map<string, { totalAssigned: number; todayCount: number }>()
  for (const inspector of inspectors) {
    workloadMap.set(inspector.id, { totalAssigned: 0, todayCount: 0 })
  }
  for (const insp of inspections) {
    if (!insp.assigned_inspector_id) continue
    const entry = workloadMap.get(insp.assigned_inspector_id)
    if (entry) {
      entry.totalAssigned++
      if (insp.scheduled_date === today) entry.todayCount++
    }
  }

  const inspectorWorkload: InspectorWorkloadItem[] = inspectors
    .map((i) => {
      const w = workloadMap.get(i.id) ?? { totalAssigned: 0, todayCount: 0 }
      return {
        id: i.id,
        full_name: i.full_name,
        is_active: i.is_active,
        totalAssigned: w.totalAssigned,
        todayCount: w.todayCount,
      }
    })
    .sort((a, b) => b.totalAssigned - a.totalAssigned)

  return {
    totalActiveJobs: inspections.length,
    byStatus,
    unassignedPendingCount,
    todayScheduledCount,
    onHoldCount,
    critical: { confirmedUnscheduled, inactiveInspector, overdueUnconfirmed },
    needsAttention: { unassignedPending, onHold, assignedNoSchedule },
    inspectorWorkload,
  }
}
