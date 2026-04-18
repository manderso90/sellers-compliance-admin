import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { InspectorWorkload } from '@/lib/queries/command-center'

function formatTimeShort(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export function InspectorWorkloadSnapshot({ workloads }: { workloads: InspectorWorkload[] }) {
  if (workloads.length === 0) {
    return (
      <div className="bg-white border-2 border-[#2B2B2B] rounded-xl neo-shadow-sm p-6">
        <h3 className="text-lg font-bold text-[#2B2B2B] tracking-tight mb-3">Inspector Workload</h3>
        <p className="text-sm text-[#A1A1AA] text-center py-4">No active inspectors</p>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-[#2B2B2B] rounded-xl neo-shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-[#2B2B2B]">
        <h3 className="text-lg font-bold text-[#2B2B2B] tracking-tight">Inspector Workload</h3>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Today&apos;s assignments</p>
      </div>

      <div className="divide-y divide-[#2B2B2B]/5">
        {workloads.map((inspector) => {
          const isOverloaded = inspector.totalMinutes > 360
          const isIdle = inspector.jobCount === 0
          const timeRange =
            inspector.firstJobTime && inspector.lastJobEnd
              ? `${formatTimeShort(inspector.firstJobTime)} – ${formatTimeShort(inspector.lastJobEnd)}`
              : null

          return (
            <Link
              key={inspector.id}
              href="/admin/dispatch"
              className="group flex items-center gap-3 px-5 py-3 hover:bg-[#FFFDF5] transition-colors"
            >
              {/* Status dot */}
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full shrink-0 border-2',
                  isOverloaded
                    ? 'bg-[#C8102E] border-[#C8102E]'
                    : inspector.jobCount > 0
                      ? 'bg-[#16a34a] border-[#16a34a]'
                      : 'bg-[#E8E8E8] border-[#2B2B2B]/20'
                )}
              />

              {/* Name + time range */}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-[#2B2B2B] font-bold truncate block">
                  {inspector.full_name || 'Unknown'}
                </span>
                {timeRange && (
                  <span className="text-xs text-[#A1A1AA]">{timeRange}</span>
                )}
              </div>

              {/* Job count + minutes */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={cn(
                    'text-[11px] font-semibold px-2.5 py-1 rounded-full transition-transform',
                    'group-hover:translate-x-[-2px] group-hover:translate-y-[-2px]',
                    isOverloaded
                      ? 'bg-[#C8102E]/10 text-[#C8102E] border-2 border-[#C8102E] neo-shadow-sm'
                      : inspector.jobCount > 4
                        ? 'bg-[#C8102E]/10 text-[#C8102E] border-2 border-[#C8102E] neo-shadow-sm'
                        : isIdle
                          ? 'bg-slate-100 text-slate-400 border-2 border-slate-200'
                          : 'bg-blue-50 text-blue-700 border-2 border-[#2B2B2B] neo-shadow-sm'
                  )}
                >
                  {inspector.jobCount} {inspector.jobCount === 1 ? 'job' : 'jobs'}
                  {inspector.totalMinutes > 0 && ` · ${inspector.totalMinutes}min`}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
