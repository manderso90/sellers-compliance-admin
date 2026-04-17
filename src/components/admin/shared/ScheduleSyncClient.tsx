'use client'

import { useScheduleSync } from '@/hooks/use-schedule-sync'

/**
 * Minimal client component that subscribes to schedule changes
 * and triggers router.refresh() for cross-tab / cross-user sync.
 * Drop this into any Server Component page that displays scheduling data.
 */
export function ScheduleSyncClient() {
  useScheduleSync()
  return null
}
