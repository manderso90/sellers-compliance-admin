'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type CustomerUpdate = Database['public']['Tables']['customers']['Update']

const VALID_CUSTOMER_TYPES = [
  'agent',
  'broker',
  'transaction_coordinator',
  'seller',
  'escrow',
  'other',
] as const

function surfacePgError(err: unknown, context: string): never {
  const pg = err as { code?: string; message?: string; details?: string | null }
  if (pg?.code) {
    console.error(
      `[customer-actions:${context}] pg ${pg.code}: ${pg.message}${pg.details ? ` (${pg.details})` : ''}`
    )
    throw new Error(`Database error (${pg.code}) during ${context}`)
  }
  throw err instanceof Error ? err : new Error(`Unexpected error during ${context}`)
}

export async function updateCustomer(
  customerId: string,
  data: {
    full_name?: string
    email?: string
    phone?: string | null
    company_name?: string | null
    customer_type?: string
  }
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const update: CustomerUpdate = {}
  if (data.full_name !== undefined) {
    const trimmed = data.full_name.trim()
    if (!trimmed) throw new Error('Full name cannot be empty')
    update.full_name = trimmed
  }
  if (data.email !== undefined) {
    const trimmed = data.email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) throw new Error('Valid email is required')
    update.email = trimmed
  }
  if (data.phone !== undefined) {
    update.phone = data.phone ? data.phone.trim() || null : null
  }
  if (data.company_name !== undefined) {
    update.company_name = data.company_name ? data.company_name.trim() || null : null
  }
  if (data.customer_type !== undefined) {
    if (!(VALID_CUSTOMER_TYPES as readonly string[]).includes(data.customer_type)) {
      throw new Error('Invalid customer role')
    }
    update.customer_type = data.customer_type
  }

  if (Object.keys(update).length === 0) return

  const { error } = await supabase.from('customers').update(update).eq('id', customerId)
  if (error) surfacePgError(error, 'updateCustomer')

  revalidatePath('/admin/customers')
}

/**
 * Delete is blocked when the customer has inspections — the inspections.customer_id
 * FK is ON DELETE RESTRICT so the DB would refuse anyway, but we pre-check to
 * return a clear error message instead of a raw Postgres code.
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { count, error: countError } = await supabase
    .from('inspections')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)

  if (countError) surfacePgError(countError, 'deleteCustomer.count')

  if ((count ?? 0) > 0) {
    throw new Error(
      `Cannot delete: ${count} inspection${count === 1 ? '' : 's'} reference this customer. Delete or reassign those first.`
    )
  }

  const { error } = await supabase.from('customers').delete().eq('id', customerId)
  if (error) surfacePgError(error, 'deleteCustomer')

  revalidatePath('/admin/customers')
}
