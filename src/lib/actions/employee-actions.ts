'use server'

import { requireAdmin } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function updateEmployee(
  employeeId: string,
  data: {
    full_name?: string
    roles?: string[]
    phone?: string
    is_active?: boolean
  }
) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', employeeId)
  if (error) throw error

  revalidatePath('/admin/settings')
}

export async function deactivateEmployee(employeeId: string): Promise<{ error?: string }> {
  try {
    await updateEmployee(employeeId, { is_active: false })
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to deactivate employee' }
  }
}

export async function deleteEmployee(employeeId: string): Promise<{ error?: string }> {
  try {
    const { user } = await requireAdmin()

    if (employeeId === user.id) {
      return { error: 'Cannot delete your own account' }
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await adminSupabase.auth.admin.deleteUser(employeeId)
    if (error) return { error: error.message }

    revalidatePath('/admin/settings')
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete employee' }
  }
}
