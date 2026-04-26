'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isValidTransition, validateIntakeInput, validateJobInput } from '@/services/job-lifecycle'
import type { Database, JobStatus } from '@/types/database'

type CustomerInsert = Database['public']['Tables']['customers']['Insert']
type CustomerUpdate = Database['public']['Tables']['customers']['Update']
type PropertyInsert = Database['public']['Tables']['properties']['Insert']
type PropertyUpdate = Database['public']['Tables']['properties']['Update']
type InspectionInsert = Database['public']['Tables']['inspections']['Insert']
type InspectionUpdate = Database['public']['Tables']['inspections']['Update']
type StatusHistoryInsert = Database['public']['Tables']['inspection_status_history']['Insert']

/**
 * Surface Postgres errors with their code/message in server logs, then
 * re-throw a short user-safe summary so the form banner can display
 * "Database error (23514) during createJob.insertInspection" instead of
 * the production RSC-scrubbed generic string.
 */
function surfacePgError(err: unknown, context: string): never {
  const pg = err as { code?: string; message?: string; details?: string | null }
  if (pg?.code) {
    console.error(`[job-actions:${context}] pg ${pg.code}: ${pg.message}${pg.details ? ` (${pg.details})` : ''}`)
    throw new Error(`Database error (${pg.code}) during ${context}`)
  }
  throw err instanceof Error ? err : new Error(`Unexpected error during ${context}`)
}

/**
 * Ensure a customer row exists for the given name/email and return its id.
 * If email is missing, we synthesize a deterministic placeholder so the NOT NULL
 * constraint is satisfied while keeping lookups stable for later edits.
 *
 * When a row already exists for the email, we return its id as-is and do NOT
 * overwrite customer_type / company_name / phone. Existing-customer wins.
 */
async function ensureCustomer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    full_name: string
    email: string | null
    phone: string | null
    customer_type?: string
    company_name?: string | null
  }
): Promise<string> {
  const resolvedEmail =
    input.email && input.email.length > 0
      ? input.email
      : `walkin+${(input.full_name || 'guest').toLowerCase().replace(/[^a-z0-9]+/g, '-')}@sellerscompliance.local`

  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('email', resolvedEmail)
    .maybeSingle()

  if (existing?.id) return existing.id

  const payload: CustomerInsert = {
    full_name: input.full_name || 'Walk-in',
    email: resolvedEmail,
    phone: input.phone,
    company_name: input.company_name ?? null,
    ...(input.customer_type ? { customer_type: input.customer_type } : {}),
  }
  const { data: inserted, error } = await supabase
    .from('customers')
    .insert(payload)
    .select('id')
    .single()

  if (error || !inserted) surfacePgError(error ?? new Error('Failed to create customer'), 'ensureCustomer')
  return inserted.id
}

/** Create a property record and return its id. */
async function createProperty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    street_address: string
    unit?: string | null
    city: string
    state?: string
    zip_code: string
    property_type?: string
  }
): Promise<string> {
  const payload: PropertyInsert = {
    street_address: input.street_address,
    unit: input.unit ?? null,
    city: input.city,
    state: input.state || 'CA',
    zip_code: input.zip_code,
    ...(input.property_type ? { property_type: input.property_type } : {}),
  }
  const { data, error } = await supabase
    .from('properties')
    .insert(payload)
    .select('id')
    .single()

  if (error || !data) surfacePgError(error ?? new Error('Failed to create property'), 'createProperty')
  return data.id
}

export interface CreateJobInput {
  // Property
  street_address: string
  unit?: string
  city: string
  zip_code: string
  property_type: string

  // Contact
  customer_full_name: string
  customer_email: string
  customer_phone?: string
  customer_type: string
  company_name?: string

  // Scheduling
  requested_date?: string
  requested_time_preference?: string

  // Service
  service_type: string
  includes_installation: boolean

  // Access & notes
  access_instructions?: string
  lockbox_code?: string
  contact_on_site?: string
  listing_agent_name?: string
  public_notes?: string
}

export async function createJob(data: CreateJobInput): Promise<{ id: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const validation = validateIntakeInput({
    street_address: data.street_address,
    city: data.city,
    zip_code: data.zip_code,
    property_type: data.property_type,
    customer_full_name: data.customer_full_name,
    customer_email: data.customer_email,
    customer_phone: data.customer_phone,
    customer_type: data.customer_type,
    service_type: data.service_type,
    requested_time_preference: data.requested_time_preference,
  })
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  const customerId = await ensureCustomer(supabase, {
    full_name: data.customer_full_name.trim(),
    email: data.customer_email.trim(),
    phone: data.customer_phone?.trim() || null,
    customer_type: data.customer_type,
    company_name: data.company_name?.trim() || null,
  })

  const propertyId = await createProperty(supabase, {
    street_address: data.street_address.trim(),
    unit: data.unit?.trim() || null,
    city: data.city.trim(),
    zip_code: data.zip_code.trim(),
    property_type: data.property_type,
  })

  const inspectionPayload: InspectionInsert = {
    customer_id: customerId,
    property_id: propertyId,
    status: 'requested',
    dispatch_status: 'unscheduled',
    service_type: data.service_type,
    includes_installation: data.includes_installation,
    requested_date: data.requested_date?.trim() || null,
    requested_time_preference: data.requested_time_preference?.trim() || null,
    access_instructions: data.access_instructions?.trim() || null,
    lockbox_code: data.lockbox_code?.trim() || null,
    contact_on_site: data.contact_on_site?.trim() || null,
    listing_agent_name: data.listing_agent_name?.trim() || null,
    public_notes: data.public_notes?.trim() || null,
  }
  const { data: newInsp, error: inspError } = await supabase
    .from('inspections')
    .insert(inspectionPayload)
    .select('id')
    .single()

  if (inspError || !newInsp) surfacePgError(inspError ?? new Error('Failed to create inspection'), 'createJob.insertInspection')

  const historyPayload: StatusHistoryInsert = {
    inspection_id: newInsp.id,
    changed_by: user.id,
    from_status: null,
    to_status: 'requested',
    note: 'Job created',
  }
  await supabase.from('inspection_status_history').insert(historyPayload)

  revalidatePath('/admin/jobs')
  revalidatePath('/admin/dispatch')

  return { id: newInsp.id }
}

export async function updateJobStatus(jobId: string, newStatus: JobStatus) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Fetch current inspection status
  const { data: current, error: fetchError } = await supabase
    .from('inspections')
    .select('status')
    .eq('id', jobId)
    .single()

  if (fetchError || !current) throw new Error('Inspection not found')

  // Enforce valid transitions via services layer
  const currentStatus = current.status as JobStatus
  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(
      `Cannot transition from "${currentStatus}" to "${newStatus}"`
    )
  }

  const updatePayload: InspectionUpdate = { status: newStatus }
  const { error: updateError } = await supabase
    .from('inspections')
    .update(updatePayload)
    .eq('id', jobId)

  if (updateError) throw updateError

  // Log status change to history
  const historyPayload: StatusHistoryInsert = {
    inspection_id: jobId,
    changed_by: user.id,
    from_status: currentStatus,
    to_status: newStatus,
  }
  await supabase.from('inspection_status_history').insert(historyPayload)

  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/admin/dispatch')
}

export async function updateJob(
  jobId: string,
  data: {
    title?: string
    client_name?: string
    client_phone?: string
    client_email?: string
    address?: string
    city?: string
    state?: string
    zip_code?: string
    has_lockbox?: boolean
    lockbox_code?: string
    requested_date?: string
    requested_time_preference?: string
    scheduled_date?: string
    scheduled_time?: string
    estimated_duration_minutes?: number
    notes?: string
  }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Validate fields that have rules
  const validation = validateJobInput({
    title: data.title,
    address: data.address,
    estimated_duration_minutes: data.estimated_duration_minutes,
    requested_time_preference: data.requested_time_preference,
  })
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  // Fetch the inspection so we know which property_id / customer_id to update
  const { data: inspection, error: fetchError } = await supabase
    .from('inspections')
    .select('property_id, customer_id')
    .eq('id', jobId)
    .single()

  if (fetchError || !inspection) throw new Error('Inspection not found')

  // --- Customer updates ---
  const customerUpdate: CustomerUpdate = {}
  if (data.client_name !== undefined) customerUpdate.full_name = data.client_name.trim() || 'Walk-in'
  if (data.client_email !== undefined) {
    const trimmed = data.client_email.trim()
    if (trimmed) customerUpdate.email = trimmed
  }
  if (data.client_phone !== undefined) customerUpdate.phone = data.client_phone.trim() || null

  if (Object.keys(customerUpdate).length > 0) {
    const { error: custError } = await supabase
      .from('customers')
      .update(customerUpdate)
      .eq('id', inspection.customer_id)
    if (custError) surfacePgError(custError, 'updateJob.updateCustomer')
  }

  // --- Property updates ---
  const propertyUpdate: PropertyUpdate = {}
  if (data.address !== undefined) propertyUpdate.street_address = data.address.trim()
  if (data.city !== undefined) propertyUpdate.city = data.city.trim() || ''
  if (data.state !== undefined) propertyUpdate.state = data.state.trim() || 'CA'
  if (data.zip_code !== undefined) propertyUpdate.zip_code = data.zip_code.trim() || ''

  if (Object.keys(propertyUpdate).length > 0) {
    const { error: propError } = await supabase
      .from('properties')
      .update(propertyUpdate)
      .eq('id', inspection.property_id)
    if (propError) surfacePgError(propError, 'updateJob.updateProperty')
  }

  // --- Inspection updates ---
  const inspectionUpdate: InspectionUpdate = {}
  if (data.title !== undefined) {
    inspectionUpdate.includes_installation = data.title.trim() === 'Work Completion'
  }
  if (data.has_lockbox !== undefined || data.lockbox_code !== undefined) {
    if (data.lockbox_code !== undefined) {
      const trimmed = data.lockbox_code.trim()
      inspectionUpdate.lockbox_code = trimmed || null
    } else if (data.has_lockbox === false) {
      inspectionUpdate.lockbox_code = null
    } else if (data.has_lockbox === true) {
      inspectionUpdate.lockbox_code = 'TBD'
    }
  }
  if (data.requested_date !== undefined) {
    inspectionUpdate.requested_date = data.requested_date.trim() || null
  }
  if (data.requested_time_preference !== undefined) {
    inspectionUpdate.requested_time_preference = data.requested_time_preference.trim() || null
  }
  if (data.scheduled_date !== undefined) {
    inspectionUpdate.scheduled_date = data.scheduled_date.trim() || null
  }
  if (data.scheduled_time !== undefined) {
    inspectionUpdate.scheduled_time = data.scheduled_time.trim() || null
  }
  if (data.estimated_duration_minutes !== undefined) {
    inspectionUpdate.estimated_duration_minutes = data.estimated_duration_minutes
  }
  if (data.notes !== undefined) inspectionUpdate.admin_notes = data.notes.trim() || null

  if (Object.keys(inspectionUpdate).length > 0) {
    const { error: inspError } = await supabase
      .from('inspections')
      .update(inspectionUpdate)
      .eq('id', jobId)
    if (inspError) surfacePgError(inspError, 'updateJob.updateInspection')
  }

  revalidatePath('/admin')
  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/admin/dispatch')
}

export async function assignInspector(jobId: string, inspectorId: string | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const payload: InspectionUpdate = {
    assigned_inspector_id: inspectorId,
    last_reassigned_by: user.id,
    last_reassigned_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('inspections')
    .update(payload)
    .eq('id', jobId)

  if (error) surfacePgError(error, 'assignInspector')

  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/admin/dispatch')
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('inspections').delete().eq('id', jobId)

  if (error) surfacePgError(error, 'deleteJob')

  revalidatePath('/admin/jobs')
  revalidatePath('/admin/dispatch')
}
