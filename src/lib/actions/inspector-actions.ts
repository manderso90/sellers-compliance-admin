'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

/**
 * NOTE: Creating an inspector requires a corresponding auth.users row, which
 * can only be provisioned through Supabase auth flows (invite, signup). The
 * admin UI therefore surfaces this as an informational error rather than a
 * silent no-op. To add inspectors, invite them via Supabase auth and then
 * grant the 'inspector' role via updateInspector.
 */
export async function createInspector(_data: {
  full_name: string
  phone?: string
  email?: string
  notes?: string
}) {
  throw new Error(
    'Inspectors must be invited through Supabase authentication. Add them via the auth provider, then assign the inspector role.'
  )
}

export async function updateInspector(
  inspectorId: string,
  data: {
    full_name?: string
    phone?: string
    email?: string
    is_active?: boolean
    roles?: string[]
  }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  if (data.full_name !== undefined && !data.full_name.trim()) {
    throw new Error('Full name is required')
  }

  const update: ProfileUpdate = {}
  if (data.full_name !== undefined) update.full_name = data.full_name.trim()
  if (data.phone !== undefined) update.phone = data.phone.trim() || null
  if (data.email !== undefined) update.email = data.email.trim()
  if (data.is_active !== undefined) update.is_active = data.is_active
  if (data.roles !== undefined) update.roles = data.roles

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', inspectorId)

  if (error) throw error

  revalidatePath('/admin/inspectors')
  revalidatePath(`/admin/inspectors/${inspectorId}`)
  revalidatePath('/admin/dispatch')
  revalidatePath('/admin/jobs')
}

/**
 * We don't hard-delete profiles (the row FKs to auth.users and may be
 * referenced by historical inspection rows). Instead we deactivate: set
 * is_active = false so the inspector disappears from the active dispatch
 * pool while preserving foreign-key integrity.
 */
export async function deleteInspector(inspectorId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Block deactivation if any active inspections are still assigned
  const { count, error: countError } = await supabase
    .from('inspections')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_inspector_id', inspectorId)
    .not('status', 'in', '("completed","cancelled")')

  if (countError) throw countError

  if (count && count > 0) {
    throw new Error(
      `Cannot deactivate this inspector. ${count} active inspection${count > 1 ? 's are' : ' is'} still assigned. Reassign or clear those first.`
    )
  }

  const update: ProfileUpdate = { is_active: false }
  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', inspectorId)

  if (error) throw error

  revalidatePath('/admin/inspectors')
  revalidatePath('/admin/dispatch')
  revalidatePath('/admin/jobs')
}
