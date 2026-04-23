import type { JobStatus } from '@/types/database'

export const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  requested: ['confirmed', 'cancelled', 'on_hold'],
  confirmed: ['in_progress', 'cancelled', 'on_hold', 'requested'],
  in_progress: ['completed', 'cancelled', 'on_hold'],
  completed: [],
  cancelled: ['requested'],
  on_hold: ['requested'],
}

export const TERMINAL_STATUSES = ['completed', 'cancelled'] as const

export function isValidTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export function shouldAutoConfirm(job: {
  status: string
  assigned_inspector_id: string | null
  scheduled_date: string | null
  scheduled_time: string | null
}): boolean {
  return (
    job.status === 'requested' &&
    job.assigned_inspector_id !== null &&
    job.scheduled_date !== null &&
    job.scheduled_time !== null
  )
}

/**
 * Returns the list of valid next statuses for a given current status.
 * Used by UI to populate status dropdown options.
 */
export function getNextStatuses(currentStatus: JobStatus): JobStatus[] {
  return VALID_TRANSITIONS[currentStatus]
}

// --- Job Input Validation ---

const VALID_TITLES = ['Inspection', 'Work Completion'] as const
const VALID_TIME_PREFERENCES = ['morning', 'afternoon', 'anytime', 'flexible'] as const
const VALID_PROPERTY_TYPES = ['single_family', 'condo', 'townhouse', 'multi_family', 'other'] as const
const VALID_CUSTOMER_TYPES = ['agent', 'broker', 'transaction_coordinator', 'seller', 'escrow', 'other'] as const
const VALID_SERVICE_TYPES = ['standard', 'expedited', 'reinspection'] as const
const MIN_DURATION_MINUTES = 15

export type PropertyType = typeof VALID_PROPERTY_TYPES[number]
export type CustomerType = typeof VALID_CUSTOMER_TYPES[number]
export type ServiceType = typeof VALID_SERVICE_TYPES[number]

export interface JobInputErrors {
  valid: boolean
  errors: string[]
}

/**
 * Validates job creation input. Returns { valid: true, errors: [] } on success,
 * or { valid: false, errors: [...] } with all validation failures.
 */
export function validateJobInput(data: {
  title?: string
  address?: string
  estimated_duration_minutes?: number
  requested_time_preference?: string | null
}): JobInputErrors {
  const errors: string[] = []

  if (!data.title || !(VALID_TITLES as readonly string[]).includes(data.title)) {
    errors.push('Title must be "Inspection" or "Work Completion"')
  }

  if (!data.address || data.address.trim().length === 0) {
    errors.push('Address is required')
  }

  if (
    data.estimated_duration_minutes !== undefined &&
    data.estimated_duration_minutes < MIN_DURATION_MINUTES
  ) {
    errors.push(`Duration must be at least ${MIN_DURATION_MINUTES} minutes`)
  }

  if (
    data.requested_time_preference !== undefined &&
    data.requested_time_preference !== null &&
    data.requested_time_preference !== '' &&
    !(VALID_TIME_PREFERENCES as readonly string[]).includes(data.requested_time_preference)
  ) {
    errors.push('Invalid time preference')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Full intake-form validation. Checks required fields and CHECK-constraint
 * enum values so we surface problems before hitting Postgres. Mirrors the
 * CHECK constraints in supabase/schema.sql for customers, properties, and
 * inspections.
 */
export function validateIntakeInput(data: {
  street_address?: string
  city?: string
  zip_code?: string
  property_type?: string
  customer_full_name?: string
  customer_email?: string
  customer_phone?: string | null
  customer_type?: string
  service_type?: string
  requested_time_preference?: string | null
}): JobInputErrors {
  const errors: string[] = []

  if (!data.street_address || data.street_address.trim().length === 0) {
    errors.push('Street address is required')
  }
  if (!data.city || data.city.trim().length === 0) {
    errors.push('City is required')
  }
  if (!data.zip_code || !/^\d{5}$/.test(data.zip_code.trim())) {
    errors.push('Zip code must be 5 digits')
  }
  if (
    !data.property_type ||
    !(VALID_PROPERTY_TYPES as readonly string[]).includes(data.property_type)
  ) {
    errors.push('Invalid property type')
  }

  if (!data.customer_full_name || data.customer_full_name.trim().length === 0) {
    errors.push('Customer full name is required')
  }
  if (!data.customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer_email.trim())) {
    errors.push('Valid customer email is required')
  }
  if (
    !data.customer_type ||
    !(VALID_CUSTOMER_TYPES as readonly string[]).includes(data.customer_type)
  ) {
    errors.push('Invalid customer role')
  }

  if (
    !data.service_type ||
    !(VALID_SERVICE_TYPES as readonly string[]).includes(data.service_type)
  ) {
    errors.push('Invalid service type')
  }

  if (
    data.requested_time_preference !== undefined &&
    data.requested_time_preference !== null &&
    data.requested_time_preference !== '' &&
    !(VALID_TIME_PREFERENCES as readonly string[]).includes(data.requested_time_preference)
  ) {
    errors.push('Invalid time preference')
  }

  return { valid: errors.length === 0, errors }
}
