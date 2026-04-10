import { createClient } from '@/lib/supabase/server'
import type { Job } from '@/types/database'

export async function getJobsList(): Promise<(Job & { inspector_name: string | null })[]> {
  const supabase = await createClient()

  // Fetch all jobs ordered by most recent first
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false })

  if (jobsError) throw jobsError

  // Collect unique inspector IDs to batch-fetch names
  const inspectorIds = [
    ...new Set(
      (jobs ?? [])
        .map((j) => j.assigned_to)
        .filter((id): id is string => id !== null)
    ),
  ]

  // Fetch inspector names in a single query
  let inspectorMap: Record<string, string> = {}
  if (inspectorIds.length > 0) {
    const { data: inspectors, error: inspError } = await supabase
      .from('inspectors')
      .select('id, full_name')
      .in('id', inspectorIds)

    if (inspError) throw inspError

    inspectorMap = Object.fromEntries(
      (inspectors ?? []).map((i) => [i.id, i.full_name])
    )
  }

  return (jobs ?? []).map((job) => ({
    ...job,
    inspector_name: job.assigned_to ? (inspectorMap[job.assigned_to] ?? null) : null,
  }))
}
