'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isValidTransition, validateJobInput } from '@/services/job-lifecycle'
import type { Database, JobStatus } from '@/types/database'

type CustomerInsert = Database['public']['Tables']['customers']['Insert']
type CustomerUpdate = Database['public']['Tables']['customers']['Update']
type PropertyInsert = Database['public']['Tables']['properties']['Insert']
type PropertyUpdate = Database['public']['Tables']['properties']['Update']
type InspectionInsert = Database['public']['Tables']['inspections']['Insert']
type InspectionUpdate = Database['public']['Tables']['inspections']['Update']
type StatusHistoryInsert = Database['public']['Tables']['inspection_status_history']['Insert']

/**
 * Ensure a customer row exists for the given name/email and return its id.
 * If email is missing, we synthesize a deterministic placeholder so the NOT NULL
 * constraint is satisfied while keeping lookups stable for later edits.
 */
async function ensureCustomer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
  email: string | null,
  phone: string | null
): Promise<string> {
  const resolvedEmail =
    email && email.length > 0
      ? email
      : `walkin+${(name || 'guest').toLowerCase().replace(/[^a-z0-9]+/g, '-')}@sellerscompliance.local`

  // Try to find an existing customer first
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('email', resolvedEmail)
    .maybeSingle()

  if (existing?.id) return existing.id

  const payload: CustomerInsert = {
    full_name: name || 'Walk-in',
    email: resolvedEmail,
    phone: phone,
  }
  const { data: inserted, error } = await supabase
    .from('customers')
    .insert(payload)
    .select('id')
    .single()

  if (error || !inserted) throw error ?? new Error('Failed to create customer')
  return inserted.id
}

/** Create a property record and return its id. */
async function createProperty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<string> {
  const payload: PropertyInsert = {
    street_address: address,
    city: city || '',
    state: state || 'CA',
    zip_code: zipCode || '',
  }
  const { data, error } = await supabase
    .from('properties')
    .insert(payload)
    .select('id')
    .single()

  if (error || !data) throw error ?? new Error('Failed to create property')
  return data.id
}

export async function createJob(data: {
  title: string
  client_name?: string
  client_phone?: string
  client_email?: string
  address: string
  city?: string
  state?: string
  zip_code?: string
  has_lockbox?: boolean
  lockbox_code?: string
  requested_date?: string
  requested_time_preference?: string
  estimated_duration_minutes?: number
  notes?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Server-side validation via services layer
  const validation = validateJobInput({
    title: data.title,
    address: data.address,
    estimated_duration_minutes: data.estimated_duration_minutes,
    requested_time_preference: data.requested_time_preference,
  })
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  // Normalize
  const title = data.title.trim()
  const clientName = data.client_name?.trim() || ''
  const clientEmail = data.client_email?.trim() || null
  const clientPhone = data.client_phone?.trim() || null
  const address = data.address.trim()
  const city = data.city?.trim() || ''
  const state = data.state?.trim() || 'CA'
  const zipCode = data.zip_code?.trim() || ''
  const lockboxCode = data.lockbox_code?.trim() || (data.has_lockbox ? 'TBD' : null)
  const requestedDate = data.requested_date?.trim() || null
  const requestedTimePref = data.requested_time_preference?.trim() || null
  const estDuration = data.estimated_duration_minutes ?? 15
  const notes = data.notes?.trim() || null

  // 1. Ensure customer exists (upsert by email)
  const customerId = await ensureCustomer(supabase, clientName, clientEmail, clientPhone)

  // 2. Create property
  const propertyId = await createProperty(supabase, address, city, state, zipCode)

  // 3. Create inspection
  const inspectionPayload: InspectionInsert = {
    customer_id: customerId,
    property_id: propertyId,
    service_type: title,
    status: 'requested',
    dispatch_status: 'unscheduled',
    requested_date: requestedDate,
    requested_time_preference: requestedTimePref,
    estimated_duration_minutes: estDuration,
    lockbox_code: lockboxCode,
    admin_notes: notes,
  }
  const { data: newInsp, error: inspError } = await supabase
    .from('inspections')
    .insert(inspectionPayload)
    .select('id')
    .single()

  if (inspError || !newInsp) throw inspError ?? new Error('Failed to create inspection')

  // 4. Log initial status to history
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
    if (custError) throw custError
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
    if (propError) throw propError
  }

  // --- Inspection updates ---
  const inspectionUpdate: InspectionUpdate = {}
  if (data.title !== undefined) inspectionUpdate.service_type = data.title.trim()
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
    if (inspError) throw inspError
  }

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

  if (error) throw error

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

  if (error) throw error

  revalidatePath('/admin/jobs')
  revalidatePath('/admin/dispatch')
}
