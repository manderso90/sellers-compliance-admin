// Duration Estimation — pure function, zero framework imports.
// MCP-wrappable as-is.

export interface DurationEstimate {
  estimatedMinutes: number
  basis: 'explicit' | 'rule-based'
  factors: string[]
}

const DEFAULT_DURATION = 15

/**
 * Estimates job duration based on title, lockbox status, and existing duration.
 *
 * Rules:
 * - If the job already has a non-default duration (≠ 15), treat it as an explicit
 *   user override and return it as-is.
 * - Otherwise, apply rule-based estimation:
 *   - "Inspection" → 30 min base
 *   - "Work Completion" → 60 min base
 *   - Other → 45 min base
 *   - No lockbox → add 15 min (may need to wait for access)
 */
export function estimateDuration(job: {
  title: string
  has_lockbox: boolean
  estimated_duration_minutes: number
}): DurationEstimate {
  // Explicit override: user has already set a non-default duration
  if (job.estimated_duration_minutes !== DEFAULT_DURATION) {
    return {
      estimatedMinutes: job.estimated_duration_minutes,
      basis: 'explicit',
      factors: [`User-set duration: ${job.estimated_duration_minutes} min`],
    }
  }

  const factors: string[] = []
  let minutes = 0

  // Base duration by job type
  const titleLower = job.title.toLowerCase()
  if (titleLower === 'inspection') {
    minutes = 30
    factors.push('Inspection: 30 min base')
  } else if (titleLower === 'work completion') {
    minutes = 60
    factors.push('Work Completion: 60 min base')
  } else {
    minutes = 45
    factors.push(`"${job.title}": 45 min base (default)`)
  }

  // Lockbox modifier
  if (!job.has_lockbox) {
    minutes += 15
    factors.push('No lockbox: +15 min (access wait)')
  } else {
    factors.push('Lockbox present: no extra time')
  }

  return {
    estimatedMinutes: minutes,
    basis: 'rule-based',
    factors,
  }
}
