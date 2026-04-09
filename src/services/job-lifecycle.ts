import type { JobStatus } from '@/types/database'

export const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending: ['confirmed', 'cancelled', 'on_hold'],
  confirmed: ['in_progress', 'cancelled', 'on_hold', 'pending'],
  in_progress: ['completed', 'cancelled', 'on_hold'],
  completed: [],
  cancelled: ['pending'],
  on_hold: ['pending'],
}

export const TERMINAL_STATUSES = ['completed', 'cancelled'] as const

export function isValidTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export function shouldAutoConfirm(job: {
  status: string
  assigned_to: string | null
  scheduled_date: string | null
  scheduled_time: string | null
}): boolean {
  return (
    job.status === 'pending' &&
    job.assigned_to !== null &&
    job.scheduled_date !== null &&
    job.scheduled_time !== null
  )
}
