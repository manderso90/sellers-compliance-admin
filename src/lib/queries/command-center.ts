// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { getInspectionPrice, getInspectionProfit } from '@/lib/utils/pricing'

// ---------------------------------------------------------------------------
// Stats for top summary cards
// ---------------------------------------------------------------------------

export interface CommandCenterStats {
  scheduledToday: number
  completedThisWeek: number
  unconfirmedCount: number
  unassignedCount: number
  projectedTodayRevenue: number
  completedRevenueThisWeek: number
  completedProfitThisWeek: number
  revenueAtRisk: number
  unassignedRevenue: number
}

interface InspectionRow {
  id: string
  price: number | null
  inspection_labor_cost: number | null
  inspection_travel_cost: number | null
  properties: {
    property_type: string
    adu_count: number | null
    unit_count: number | null
  } | null
}

function sumRevenue(rows: InspectionRow[]): number {
  return rows.reduce((sum, r) => sum + getInspectionPrice(r), 0)
}

function sumProfit(rows: InspectionRow[]): number {
  return rows.reduce((sum, r) => sum + getInspectionProfit(r), 0)
}

const INSPECTION_FIELDS = `
  id, price, inspection_labor_cost, inspection_travel_cost,
  properties (property_type, adu_count, unit_count)
`

export async function getCommandCenterStats(supabase: AnyClient): Promise<CommandCenterStats> {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const now = new Date()
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const [scheduledRes, completedRes, unconfirmedRes, unassignedRes] = await Promise.all([
    // Scheduled today (not cancelled)
    supabase
      .from('inspections')
      .select(INSPECTION_FIELDS)
      .eq('scheduled_date', todayStr)
      .not('status', 'eq', 'cancelled'),
    // Completed this week
    supabase
      .from('inspections')
      .select(INSPECTION_FIELDS)
      .eq('status', 'completed')
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd),
    // Unconfirmed: not confirmed, not completed, not cancelled
    supabase
      .from('inspections')
      .select(INSPECTION_FIELDS)
      .not('status', 'in', '("confirmed","completed","cancelled")'),
    // Unassigned: no inspector, not cancelled
    supabase
      .from('inspections')
      .select(INSPECTION_FIELDS)
      .is('assigned_inspector_id', null)
      .not('status', 'eq', 'cancelled'),
  ])

  const scheduled = (scheduledRes.data ?? []) as InspectionRow[]
  const completed = (completedRes.data ?? []) as InspectionRow[]
  const unconfirmed = (unconfirmedRes.data ?? []) as InspectionRow[]
  const unassigned = (unassignedRes.data ?? []) as InspectionRow[]

  // Get weekly install revenue for completed inspections
  const installRevenue = await getWeeklyInstallRevenue(supabase, weekStart, weekEnd)

  return {
    scheduledToday: scheduled.length,
    completedThisWeek: completed.length,
    unconfirmedCount: unconfirmed.length,
    unassignedCount: unassigned.length,
    projectedTodayRevenue: sumRevenue(scheduled),
    completedRevenueThisWeek: sumRevenue(completed) + installRevenue.revenue,
    completedProfitThisWeek: sumProfit(completed) + installRevenue.profit,
    revenueAtRisk: sumRevenue(unconfirmed),
    unassignedRevenue: sumRevenue(unassigned),
  }
}

async function getWeeklyInstallRevenue(
  supabase: AnyClient,
  weekStart: string,
  weekEnd: string
): Promise<{ revenue: number; profit: number }> {
  const { data } = await supabase
    .from('install_line_items')
    .select('quantity, unit_price, unit_part_cost, unit_labor_cost')
    .gte('completed_at', weekStart)
    .lte('completed_at', weekEnd + 'T23:59:59.999Z')

  if (!data || data.length === 0) return { revenue: 0, profit: 0 }

  let revenue = 0
  let profit = 0
  for (const item of data as { quantity: number; unit_price: number; unit_part_cost: number; unit_labor_cost: number }[]) {
    const qty = item.quantity ?? 0
    const r = qty * Number(item.unit_price ?? 0)
    const c = qty * Number(item.unit_part_cost ?? 0)
    const l = qty * Number(item.unit_labor_cost ?? 0)
    revenue += r
    profit += r - c - l
  }

  return { revenue, profit }
}

// ---------------------------------------------------------------------------
// Spaces Inspected This Week
// ---------------------------------------------------------------------------

export interface WeeklySpaces {
  bedrooms: number
  hallways: number
  bathrooms: number
  waterHeaters: number
}

export async function getWeeklySpacesInspected(supabase: AnyClient): Promise<WeeklySpaces> {
  const now = new Date()
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('inspections')
    .select('properties (bedrooms, bathrooms, levels)')
    .eq('status', 'completed')
    .gte('scheduled_date', weekStart)
    .lte('scheduled_date', weekEnd)

  if (!data || data.length === 0) {
    return { bedrooms: 0, hallways: 0, bathrooms: 0, waterHeaters: 0 }
  }

  let bedrooms = 0
  let hallways = 0
  let bathrooms = 0
  const waterHeaters = data.length // 1 per property

  for (const row of data as { properties: { bedrooms: number | null; bathrooms: number | null; levels: number | null } | null }[]) {
    bedrooms += row.properties?.bedrooms ?? 0
    hallways += row.properties?.levels ?? 0
    bathrooms += row.properties?.bathrooms ?? 0
  }

  return { bedrooms, hallways, bathrooms, waterHeaters }
}

// ---------------------------------------------------------------------------
// Inspection Analysis (Weekly KPIs)
// ---------------------------------------------------------------------------

export interface WeeklyAnalysis {
  totalPropertiesInspected: number
  inspectionRevenue: number
  installRevenue: number
  totalWeeklyRevenue: number
  totalWeeklyProfit: number
  avgRevenuePerProperty: number
  avgInstallRevenuePerInspection: number
  avgProfitPerProperty: number
  totalInstalls: number
  totalSpaces: number
  installsPerProperty: number
  installsPerBedroom: number
}

export async function getWeeklyInspectionAnalysis(supabase: AnyClient): Promise<WeeklyAnalysis> {
  const now = new Date()
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  // Get completed inspections this week with property data
  const { data: inspections } = await supabase
    .from('inspections')
    .select(`
      id, price, inspection_labor_cost, inspection_travel_cost,
      properties (property_type, adu_count, unit_count, bedrooms, bathrooms, levels)
    `)
    .eq('status', 'completed')
    .gte('scheduled_date', weekStart)
    .lte('scheduled_date', weekEnd)

  const rows = (inspections ?? []) as (InspectionRow & {
    properties: {
      property_type: string
      adu_count: number | null
      unit_count: number | null
      bedrooms: number | null
      bathrooms: number | null
      levels: number | null
    } | null
  })[]

  const totalProps = rows.length
  const inspRevenue = sumRevenue(rows)
  const inspProfit = sumProfit(rows)

  // Get install totals for the week
  const { data: installs } = await supabase
    .from('install_line_items')
    .select('quantity, unit_price, unit_part_cost, unit_labor_cost')
    .gte('completed_at', weekStart)
    .lte('completed_at', weekEnd + 'T23:59:59.999Z')

  let installRev = 0
  let installProfit = 0
  let totalInstalls = 0

  for (const item of (installs ?? []) as { quantity: number; unit_price: number; unit_part_cost: number; unit_labor_cost: number }[]) {
    const qty = item.quantity ?? 0
    totalInstalls += qty
    const r = qty * Number(item.unit_price ?? 0)
    const c = qty * Number(item.unit_part_cost ?? 0)
    const l = qty * Number(item.unit_labor_cost ?? 0)
    installRev += r
    installProfit += r - c - l
  }

  const totalRevenue = inspRevenue + installRev
  const totalProfit = inspProfit + installProfit

  // Spaces
  let totalBedrooms = 0
  for (const r of rows) {
    totalBedrooms += r.properties?.bedrooms ?? 0
  }
  const totalSpaces = rows.reduce(
    (sum, r) =>
      sum +
      (r.properties?.bedrooms ?? 0) +
      (r.properties?.levels ?? 0) +
      (r.properties?.bathrooms ?? 0),
    0
  )

  const safe = (num: number, den: number) => (den > 0 ? num / den : 0)

  return {
    totalPropertiesInspected: totalProps,
    inspectionRevenue: inspRevenue,
    installRevenue: installRev,
    totalWeeklyRevenue: totalRevenue,
    totalWeeklyProfit: totalProfit,
    avgRevenuePerProperty: safe(totalRevenue, totalProps),
    avgInstallRevenuePerInspection: safe(installRev, totalProps),
    avgProfitPerProperty: safe(totalProfit, totalProps),
    totalInstalls,
    totalSpaces,
    installsPerProperty: safe(totalInstalls, totalProps),
    installsPerBedroom: safe(totalInstalls, totalBedrooms),
  }
}

// ---------------------------------------------------------------------------
// Inspector Workloads
// ---------------------------------------------------------------------------

export interface InspectorWorkload {
  id: string
  full_name: string | null
  jobCount: number
  totalMinutes: number
  firstJobTime: string | null
  lastJobEnd: string | null
}

export async function getInspectorWorkloads(
  supabase: AnyClient,
  date?: string
): Promise<InspectorWorkload[]> {
  const targetDate = date || format(new Date(), 'yyyy-MM-dd')

  const { data: inspectors, error: inspError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name')

  if (inspError) throw inspError

  const { data: jobs, error: jobsError } = await supabase
    .from('inspections')
    .select('assigned_inspector_id, scheduled_time, scheduled_end, estimated_duration_minutes')
    .eq('scheduled_date', targetDate)
    .not('assigned_inspector_id', 'is', null)
    .not('status', 'eq', 'cancelled')

  if (jobsError) throw jobsError

  type JobRow = {
    assigned_inspector_id: string
    scheduled_time: string | null
    scheduled_end: string | null
    estimated_duration_minutes: number | null
  }

  const inspectorMap = new Map<string, {
    count: number
    totalMinutes: number
    firstJobTime: string | null
    lastJobEnd: string | null
  }>()

  for (const job of (jobs ?? []) as JobRow[]) {
    const id = job.assigned_inspector_id
    const existing = inspectorMap.get(id) ?? {
      count: 0,
      totalMinutes: 0,
      firstJobTime: null,
      lastJobEnd: null,
    }

    existing.count++
    existing.totalMinutes += job.estimated_duration_minutes ?? 0

    if (job.scheduled_time) {
      if (!existing.firstJobTime || job.scheduled_time < existing.firstJobTime) {
        existing.firstJobTime = job.scheduled_time
      }
    }
    if (job.scheduled_end) {
      if (!existing.lastJobEnd || job.scheduled_end > existing.lastJobEnd) {
        existing.lastJobEnd = job.scheduled_end
      }
    }

    inspectorMap.set(id, existing)
  }

  return (inspectors ?? []).map((inspector: { id: string; full_name: string | null }) => {
    const data = inspectorMap.get(inspector.id)
    return {
      id: inspector.id,
      full_name: inspector.full_name,
      jobCount: data?.count ?? 0,
      totalMinutes: data?.totalMinutes ?? 0,
      firstJobTime: data?.firstJobTime ?? null,
      lastJobEnd: data?.lastJobEnd ?? null,
    }
  })
}

// ---------------------------------------------------------------------------
// Computed Alerts
// ---------------------------------------------------------------------------

export interface ComputedAlert {
  type: 'overdue' | 'unassigned' | 'no_inspector'
  severity: 'warning' | 'critical'
  message: string
  count: number
  inspectionIds?: string[]
}

export async function getComputedAlerts(supabase: AnyClient): Promise<ComputedAlert[]> {
  const alerts: ComputedAlert[] = []
  const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd')

  const { data: overdue, count: overdueCount } = await supabase
    .from('inspections')
    .select('id', { count: 'exact' })
    .eq('status', 'requested')
    .lt('requested_date', twoDaysAgo)

  if ((overdueCount ?? 0) > 0) {
    alerts.push({
      type: 'overdue',
      severity: 'critical',
      message: `${overdueCount} inspection${overdueCount === 1 ? '' : 's'} overdue (requested > 2 days)`,
      count: overdueCount ?? 0,
      inspectionIds: (overdue ?? []).map((o: { id: string }) => o.id),
    })
  }

  // Per Step 1 findings: 'awaiting_confirmation' is NOT a valid status in this schema.
  // Use 'requested' only.
  const { count: unassignedCount } = await supabase
    .from('inspections')
    .select('id', { count: 'exact', head: true })
    .is('assigned_inspector_id', null)
    .eq('status', 'requested')

  if ((unassignedCount ?? 0) > 0) {
    alerts.push({
      type: 'unassigned',
      severity: (unassignedCount ?? 0) > 5 ? 'critical' : 'warning',
      message: `${unassignedCount} inspection${unassignedCount === 1 ? '' : 's'} unassigned`,
      count: unassignedCount ?? 0,
    })
  }

  return alerts
}
