'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'
import type { SchedulingContext, SchedulingTargetJob } from '@/services/scheduling-context'
import { generateScheduleSuggestions, type ScheduleSuggestion } from '@/services/scheduling-suggestions'
import { estimateDuration, type DurationEstimate } from '@/services/duration-estimation'
import { checkConflicts } from '@/services/conflict-detection'
import { buildScheduleUpdate } from '@/services/dispatch-scheduling'

// ---------------------------------------------------------------------------
// Supabase-backed SchedulingContext factory
// ---------------------------------------------------------------------------

function createSupabaseSchedulingContext(): SchedulingContext {
  return {
    async getActiveInspectors() {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('inspectors')
        .select('id, full_name, region')
        .eq('is_active', true)
        .order('full_name')

      if (error) throw error
      return data ?? []
    },

    async getJobsForDate(date: string) {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('jobs')
        .select('id, address, scheduled_time, scheduled_end, estimated_duration_minutes, assigned_to')
        .eq('scheduled_date', date)
        .not('status', 'eq', 'cancelled')

      if (error) throw error
      return (data ?? []).map((j) => ({
        id: j.id,
        address: j.address,
        scheduled_time: j.scheduled_time,
        scheduled_end: j.scheduled_end,
        estimated_duration_minutes: j.estimated_duration_minutes,
        assigned_to: j.assigned_to ?? '',
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

  // Fetch the target job
  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, title, address, city, has_lockbox, estimated_duration_minutes, requested_date, requested_time_preference')
    .eq('id', jobId)
    .single()

  if (error || !job) throw new Error('Job not found')

  const targetJob: SchedulingTargetJob = {
    id: job.id,
    title: job.title,
    address: job.address,
    city: job.city,
    has_lockbox: job.has_lockbox,
    estimated_duration_minutes: job.estimated_duration_minutes,
    requested_date: job.requested_date,
    requested_time_preference: job.requested_time_preference,
  }

  // Build context and generate suggestions
  const context = createSupabaseSchedulingContext()
  const suggestions = await generateScheduleSuggestions(targetJob, context)

  // Also return the duration estimate for UI display
  const durationEstimate = estimateDuration({
    title: job.title,
    has_lockbox: job.has_lockbox,
    estimated_duration_minutes: job.estimated_duration_minutes,
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

  // Fetch current job state (needed by buildScheduleUpdate)
  const { data: currentJob, error: jobError } = await supabase
    .from('jobs')
    .select('status, assigned_to, scheduled_date, scheduled_time, estimated_duration_minutes')
    .eq('id', jobId)
    .single()

  if (jobError || !currentJob) throw new Error('Job not found')

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
    {
      status: currentJob.status,
      assigned_to: currentJob.assigned_to,
      scheduled_date: currentJob.scheduled_date,
      scheduled_time: currentJob.scheduled_time,
      estimated_duration_minutes: currentJob.estimated_duration_minutes,
    },
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
    .from('jobs')
    .update(updateData as Database['public']['Tables']['jobs']['Update'])
    .eq('id', jobId)

  if (updateError) throw updateError

  // Log status change if auto-confirmed
  if (statusChanged && newStatus) {
    await supabase.from('job_status_history').insert({
      job_id: jobId,
      changed_by: user.id,
      from_status: currentJob.status,
      to_status: newStatus,
      note: 'Auto-confirmed via scheduling suggestion',
    })
  }

  // Revalidate all affected paths
  revalidatePath('/admin/dispatch')
  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/admin')
  revalidatePath('/admin/inspectors')

  return { success: true }
}
