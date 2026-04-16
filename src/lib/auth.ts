import { createClient } from '@/lib/supabase/server'

const ADMIN_ROLES = ['admin', 'super_admin']

/** Check if a roles array includes any of the required roles */
export function hasAnyRole(roles: string[], ...required: string[]): boolean {
  return required.some((r) => roles.includes(r))
}

/**
 * Require the current user to have an admin or super_admin role.
 * Throws if not authenticated or not an admin.
 * Returns the supabase client, user, and profile for downstream use.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('roles, is_active')
    .eq('id', user.id)
    .single()

  const typed = profile as { roles: string[] | null; is_active: boolean | null } | null

  if (!typed || !typed.is_active || !hasAnyRole(typed.roles ?? [], ...ADMIN_ROLES)) {
    throw new Error('Admin access required')
  }

  return { supabase, user, profile: typed }
}
