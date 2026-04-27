// Scheduling Suggestions — generates ranked scheduling slots.
// Depends ONLY on SchedulingContext interface and existing conflict-detection service.
// No Supabase, no Next.js, no framework imports.

import type {
  SchedulingContext,
  SchedulingTargetJob,
  SchedulingExistingJob,
} from '@/services/scheduling-context'
import { checkConflicts } from '@/services/conflict-detection'
import { estimateDuration } from '@/services/duration-estimation'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ScheduleSuggestion {
  inspectorId: string
  inspectorName: string
  inspectorRegion: string | undefined
  date: string
  time: string
  durationMinutes: number
  score: number
  factors: {
    workload: number
    regionMatch: number
    timePreference: number
  }
  reasons: string[]
  existingJobCount: number
}

// ---------------------------------------------------------------------------
// Region matching heuristic
// ---------------------------------------------------------------------------

const VALLEY_CITIES = new Set([
  'van nuys', 'burbank', 'glendale', 'pasadena', 'north hollywood',
  'sherman oaks', 'encino', 'tarzana', 'woodland hills', 'reseda',
  'northridge', 'canoga park', 'chatsworth', 'granada hills',
  'panorama city', 'sun valley', 'sylmar', 'arleta', 'pacoima',
  'lake balboa',
])

function matchRegion(
  inspectorRegion: string | undefined,
  jobCity: string
): 'full' | 'partial' | 'none' {
  if (!inspectorRegion || !jobCity) return 'partial'

  const cityLower = jobCity.toLowerCase().trim()
  const regionLower = inspectorRegion.toLowerCase().trim()

  // Direct region match (inspector.region often IS a city name)
  if (regionLower === cityLower) return 'full'

  // Both are Valley locations
  const jobIsValley = VALLEY_CITIES.has(cityLower)
  const inspectorIsValley = VALLEY_CITIES.has(regionLower)
  if (jobIsValley && inspectorIsValley) return 'full'

  // One is Valley, the other isn't — definite mismatch
  if (jobIsValley !== inspectorIsValley) return 'none'

  // Unrecognised city — give partial credit
  return 'partial'
}

// ---------------------------------------------------------------------------
// Time preference scoring
// ---------------------------------------------------------------------------

function scoreTimePreference(
  slotTime: string,
  preference: string | null
): number {
  if (!preference || preference === 'anytime' || preference === 'flexible') {
    return 25
  }
  // Exact-time preference (HH:MM or HH:MM:SS): proximity bands.
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(preference)) {
    const toMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }
    const diff = Math.abs(toMinutes(slotTime) - toMinutes(preference))
    if (diff <= 30) return 25
    if (diff <= 60) return 15
    if (diff <= 120) return 8
    return 0
  }
  // Legacy categorical (morning / afternoon).
  const hour = parseInt(slotTime.split(':')[0], 10)
  const isMorning = hour < 12
  if (preference === 'morning') return isMorning ? 25 : 0
  if (preference === 'afternoon') return isMorning ? 0 : 25
  return 25
}

// ---------------------------------------------------------------------------
// Workload scoring
// ---------------------------------------------------------------------------

function scoreWorkload(existingJobCount: number): number {
  // 0 jobs → 40, each extra subtracts 8 (min 0)
  return Math.max(0, 40 - existingJobCount * 8)
}

// ---------------------------------------------------------------------------
// Time slot generation
// ---------------------------------------------------------------------------

/** 30-min increments from 09:00 to 16:00 (last slot must end by 17:00) */
function getTimeSlots(durationMinutes: number): string[] {
  const slots: string[] = []
  const startMinute = 9 * 60 // 09:00
  const endMinute = 17 * 60  // 17:00 hard stop

  for (let m = startMinute; m + durationMinutes <= endMinute; m += 30) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0')
    const mm = String(m % 60).padStart(2, '0')
    slots.push(`${hh}:${mm}`)
  }
  return slots
}

// ---------------------------------------------------------------------------
// Business day calculation
// ---------------------------------------------------------------------------

function getBusinessDays(fromDate: string, count: number): string[] {
  const days: string[] = []
  const d = new Date(fromDate + 'T12:00:00')

  while (days.length < count) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) {
      days.push(d.toISOString().slice(0, 10))
    }
    d.setDate(d.getDate() + 1)
  }
  return days
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function generateScheduleSuggestions(
  job: SchedulingTargetJob,
  context: SchedulingContext
): Promise<ScheduleSuggestion[]> {
  // 1. Estimate duration (may upgrade from default 15)
  const durationEst = estimateDuration({
    title: job.title,
    has_lockbox: job.has_lockbox,
    estimated_duration_minutes: job.estimated_duration_minutes,
  })
  const duration = durationEst.estimatedMinutes

  // 2. Determine candidate dates
  const today = new Date().toISOString().slice(0, 10)
  let candidateDates: string[]
  if (job.requested_date && job.requested_date >= today) {
    // Use the requested date as the primary candidate, plus next 2 business days
    candidateDates = [job.requested_date, ...getBusinessDays(job.requested_date, 3).slice(1)]
    // Deduplicate in case requested_date is already in the business days list
    candidateDates = [...new Set(candidateDates)].slice(0, 3)
  } else {
    candidateDates = getBusinessDays(today, 3)
  }

  // 3. Fetch inspectors once
  const inspectors = await context.getActiveInspectors()
  if (inspectors.length === 0) return []

  // 4. Fetch jobs per candidate date (all inspectors' jobs on that date)
  const jobsByDate = new Map<string, SchedulingExistingJob[]>()
  await Promise.all(
    candidateDates.map(async (date) => {
      const jobs = await context.getJobsForDate(date)
      jobsByDate.set(date, jobs)
    })
  )

  // 5. Generate and score all candidate slots
  const timeSlots = getTimeSlots(duration)
  const candidates: ScheduleSuggestion[] = []

  for (const date of candidateDates) {
    const dateJobs = jobsByDate.get(date) ?? []

    for (const inspector of inspectors) {
      // Partition date jobs to this inspector
      const inspectorDateJobs = dateJobs.filter(
        (j) => j.assigned_to === inspector.id
      )
      const inspectorJobCount = inspectorDateJobs.length

      for (const time of timeSlots) {
        // Conflict check (pass/fail gate)
        const conflicts = checkConflicts(
          inspectorDateJobs,
          time,
          duration,
          job.id // exclude current job from conflicts (reschedule case)
        )
        if (conflicts.length > 0) continue

        // Score factors
        const workload = scoreWorkload(inspectorJobCount)
        const regionResult = matchRegion(inspector.region, job.city)
        const regionMatch = regionResult === 'full' ? 35
          : regionResult === 'partial' ? 15
          : 0
        const timePreference = scoreTimePreference(time, job.requested_time_preference)

        const score = workload + regionMatch + timePreference

        // Build reasons array for explainability
        const reasons: string[] = []
        if (workload >= 32) reasons.push(`Light workload (${inspectorJobCount} jobs on ${date})`)
        else if (workload >= 16) reasons.push(`Moderate workload (${inspectorJobCount} jobs on ${date})`)
        else reasons.push(`Heavy workload (${inspectorJobCount} jobs on ${date})`)

        if (regionResult === 'full') reasons.push(`Region match: ${inspector.region}`)
        else if (regionResult === 'partial') reasons.push('Unrecognised city — partial region credit')
        else reasons.push(`Region mismatch: ${inspector.region} vs ${job.city}`)

        if (timePreference >= 15) reasons.push('Matches requested time')
        else reasons.push('Outside preferred time window')

        candidates.push({
          inspectorId: inspector.id,
          inspectorName: inspector.full_name,
          inspectorRegion: inspector.region,
          date,
          time,
          durationMinutes: duration,
          score,
          factors: { workload, regionMatch, timePreference },
          reasons,
          existingJobCount: inspectorJobCount,
        })
      }
    }
  }

  // 6. Sort by score descending, return top 5
  candidates.sort((a, b) => b.score - a.score)
  return candidates.slice(0, 5)
}
