'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'
import type { SchedulingContext, SchedulingTargetJob } from '@/services/scheduling-context'
import { generateScheduleSuggestions, type ScheduleSuggestion } from '@/services/scheduling-suggestions'
import { estimateDuration, type DurationEstimate } from '@/services/duration-estimation'
import { checkConflicts } from '@/services/conflict-detection'
import { buildScheduleUpdate } from '@/services/dispatch-scheduling'

type InspectionUpdate = Database['public']['Tables']['inspections']['Update']
type StatusHistoryInsert = Database['public']['Tables']['inspection_status_history']['Insert']

// ---------------------------------------------------------------------------
// Supabase-backed SchedulingContext factory
// ---------------------------------------------------------------------------

function createSupabaseSchedulingContext(): SchedulingContext {
  return {
    async getActiveInspectors() {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true)
        .contains('roles', ['inspector'])
        .order('full_name')

      if (error) throw error
      return (data ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name ?? '',
      }))
    },

    async getJobsForDate(date: string) {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('inspections')
        .select('id, scheduled_time, scheduled_end, estimated_duration_minutes, assigned_inspector_id, properties(street_address)')
        .eq('scheduled_date', date)
        .not('status', 'eq', 'cancelled')

      if (error) throw error
      return (data ?? []).map((row) => ({
        id: row.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        address: ((row as any).properties?.street_address as string | undefined) ?? '',
        scheduled_time: row.scheduled_time,
        scheduled_end: row.scheduled_end,
        estimated_duration_minutes: row.estimated_duration_minutes,
        assigned_to: row.assigned_inspector_id ?? '',
      }))
    },
  }
}

// ---------------------------------------------------------------------------
// Generate suggestions — server action
// ---------------------------------------------------------------------------

export interface SuggestionResult {
  suggestions: ScheduleSuggestion[]
  durationEstimate: DurationEstimate
}

export async function generateSuggestions(jobId: string): Promise<SuggestionResult> {
  const supabase = await createClient()

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Fetch the target inspection with property join (for address/city)
  const { data: inspection, error } = await supabase
    .from('inspections')
    .select('id, service_type, includes_installation, lockbox_code, estimated_duration_minutes, requested_date, requested_time_preference, properties(street_address, city)')
    .eq('id', jobId)
    .single()

  if (error || !inspection) throw new Error('Inspection not found')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prop = (inspection as any).properties ?? {}

  const targetJob: SchedulingTargetJob = {
    id: inspection.id,
    title: inspection.includes_installation ? 'Work Completion' : 'Inspection',
    address: prop.street_address ?? '',
    city: prop.city ?? '',
    has_lockbox: !!inspection.lockbox_code,
    estimated_duration_minutes: inspection.estimated_duration_minutes,
    requested_date: inspection.requested_date,
    requested_time_preference: inspection.requested_time_preference,
  }

  // Build context and generate suggestions
  const context = createSupabaseSchedulingContext()
  const suggestions = await generateScheduleSuggestions(targetJob, context)

  // Also return the duration estimate for UI display
  const durationEstimate = estimateDuration({
    title: targetJob.title,
    has_lockbox: targetJob.has_lockbox,
    estimated_duration_minutes: targetJob.estimated_duration_minutes,
  })

  return { suggestions, durationEstimate }
}

// ---------------------------------------------------------------------------
// Apply suggestion — server action with conflict recheck
// ---------------------------------------------------------------------------

export async function applySuggestion(
  jobId: string,
  inspectorId: string,
  date: string,
  time: string,
  durationMinutes: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Fetch current inspection state (needed by buildScheduleUpdate)
  const { data: currentInspection, error: inspError } = await supabase
    .from('inspections')
    .select('status, assigned_inspector_id, scheduled_date, scheduled_time, estimated_duration_minutes')
    .eq('id', jobId)
    .single()

  if (inspError || !currentInspection) throw new Error('Inspection not found')

  // --- Apply-time conflict recheck (required by plan) ---
  const context = createSupabaseSchedulingContext()
  const dateJobs = await context.getJobsForDate(date)
  const inspectorDateJobs = dateJobs.filter((j) => j.assigned_to === inspectorId)

  const conflicts = checkConflicts(
    inspectorDateJobs,
    time,
    durationMinutes,
    jobId // exclude current job
  )

  if (conflicts.length > 0) {
    const conflictAddresses = conflicts.map((c) => c.address).join(', ')
    return {
      success: false,
      error: `Conflict detected with: ${conflictAddresses}. This slot is no longer available. Please refresh suggestions.`,
    }
  }

  // --- Build the schedule update using existing service ---
  const { updateData, statusChanged, newStatus } = buildScheduleUpdate(
    currentInspection,
    {
      assignedTo: inspectorId,
      scheduledDate: date,
      scheduledTime: time,
      estimatedDurationMinutes: durationMinutes,
    },
    user.id
  )

  // Write to DB
  const { error: updateError } = await supabase
    .from('inspections')
    .update(updateData as InspectionUpdate)
    .eq('id', jobId)

  if (updateError) throw updateError

  // Log status change if auto-confirmed
  if (statusChanged && newStatus) {
    const historyPayload: StatusHistoryInsert = {
      inspection_id: jobId,
      changed_by: user.id,
      from_status: currentInspection.status,
      to_status: newStatus,
      note: 'Auto-confirmed via scheduling suggestion',
    }
    await supabase.from('inspection_status_history').insert(historyPayload)
  }

  // Revalidate all affected paths
  revalidatePath('/admin/dispatch')
  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/admin')
  revalidatePath('/admin/inspectors')

  return { success: true }
}
