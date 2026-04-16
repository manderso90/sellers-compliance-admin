'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkConflicts } from '@/services/conflict-detection'
import { buildScheduleUpdate, buildUnscheduleUpdate } from '@/services/dispatch-scheduling'
import type { Database } from '@/types/database'

type InspectionUpdate = Database['public']['Tables']['inspections']['Update']
type StatusHistoryInsert = Database['public']['Tables']['inspection_status_history']['Insert']

export interface ScheduleUpdate {
  jobId: string
  assignedTo?: string | null
  scheduledDate?: string | null
  scheduledTime?: string | null
  estimatedDurationMinutes?: number
  scheduleNotes?: string
}

export interface ScheduleResult {
  success: boolean
  jobId: string
  statusChanged?: boolean
  newStatus?: string
}

export async function updateSchedule(update: ScheduleUpdate): Promise<ScheduleResult> {
  // 1. Auth guard
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  // 2. Fetch current inspection state
  const { data: currentInspection, error: inspError } = await supabase
    .from('inspections')
    .select('status, assigned_inspector_id, scheduled_date, scheduled_time, estimated_duration_minutes')
    .eq('id', update.jobId)
    .single()
  if (inspError || !currentInspection) throw new Error('Inspection not found')

  // 3. Determine if this is an unschedule operation
  const isUnschedule = 'assignedTo' in update && update.assignedTo === null

  let updateData: Record<string, unknown>
  let statusChanged: boolean
  let newStatus: string | undefined

  if (isUnschedule) {
    const result = buildUnscheduleUpdate(currentInspection, user.id)
    updateData = result.updateData
    statusChanged = result.statusChanged
    newStatus = result.newStatus
  } else {
    const effectiveInspectorId = 'assignedTo' in update ? update.assignedTo : currentInspection.assigned_inspector_id
    const effectiveDate = 'scheduledDate' in update ? update.scheduledDate : currentInspection.scheduled_date
    const effectiveTime = 'scheduledTime' in update ? update.scheduledTime : currentInspection.scheduled_time
    const effectiveDuration = update.estimatedDurationMinutes ?? currentInspection.estimated_duration_minutes

    if (effectiveInspectorId && effectiveDate && effectiveTime) {
      // Fetch existing inspections for conflict check
      const { data: existingInspections } = await supabase
        .from('inspections')
        .select('id, scheduled_time, scheduled_end, estimated_duration_minutes, properties(street_address)')
        .eq('assigned_inspector_id', effectiveInspectorId)
        .eq('scheduled_date', effectiveDate)
        .neq('status', 'cancelled')

      const conflictInput = (existingInspections ?? []).map((r) => ({
        id: r.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        address: ((r as any).properties?.street_address as string | undefined) ?? '',
        scheduled_time: r.scheduled_time,
        scheduled_end: r.scheduled_end,
        estimated_duration_minutes: r.estimated_duration_minutes,
      }))

      const conflicts = checkConflicts(
        conflictInput,
        effectiveTime,
        effectiveDuration,
        update.jobId
      )

      if (conflicts.length > 0) {
        const c = conflicts[0]
        throw new Error(
          `Schedule conflict: overlaps with job at ${c.address} by ${c.overlapMinutes} minutes`
        )
      }
    }

    const result = buildScheduleUpdate(currentInspection, update, user.id)
    updateData = result.updateData
    statusChanged = result.statusChanged
    newStatus = result.newStatus
  }

  // 7. Persist to Supabase
  const { error: updateError } = await supabase
    .from('inspections')
    .update(updateData as InspectionUpdate)
    .eq('id', update.jobId)
  if (updateError) throw new Error('Failed to update inspection')

  // 8. Log status change to history
  if (statusChanged && newStatus) {
    await supabase.from('inspection_status_history').insert({
      inspection_id: update.jobId,
      changed_by: user.id,
      from_status: currentInspection.status,
      to_status: newStatus,
      note: isUnschedule ? 'Status reverted on unschedule' : 'Auto-confirmed on schedule',
    } satisfies StatusHistoryInsert)
  }

  // 9. Revalidate
  revalidatePath('/admin/dispatch')
  revalidatePath('/admin/jobs')

  return {
    success: true,
    jobId: update.jobId,
    statusChanged,
    newStatus,
  }
}
