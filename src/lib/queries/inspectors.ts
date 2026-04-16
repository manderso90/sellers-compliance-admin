import { createClient } from '@/lib/supabase/server'
import type { Inspector, Inspection } from '@/types/database'

export async function getInspectors(): Promise<Inspector[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .contains('roles', ['inspector'])
    .order('full_name')

  if (error) throw error
  return (data ?? []) as unknown as Inspector[]
}

export async function getInspectorById(
  inspectorId: string
): Promise<Inspector | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', inspectorId)
    .single()

  if (error || !data) return null
  return data as unknown as Inspector
}

export async function getInspectorJobs(
  inspectorId: string
): Promise<{ total: number; upcoming: Inspection[] }> {
  const supabase = await createClient()

  // All inspections assigned to this inspector (for total count)
  const { data: allInspections, error: allError } = await supabase
    .from('inspections')
    .select('*')
    .eq('assigned_inspector_id', inspectorId)

  if (allError) throw allError

  const inspections = (allInspections ?? []) as unknown as Inspection[]
  const total = inspections.length

  // Upcoming scheduled: have a scheduled_date on or after today
  const today = new Date().toISOString().split('T')[0]
  const upcoming = inspections
    .filter((i) => i.scheduled_date && i.scheduled_date >= today)
    .sort((a, b) => {
      const dateA = a.scheduled_date ?? ''
      const dateB = b.scheduled_date ?? ''
      if (dateA !== dateB) return dateA.localeCompare(dateB)
      return (a.scheduled_time ?? '').localeCompare(b.scheduled_time ?? '')
    })
    .slice(0, 10)

  return { total, upcoming }
}
