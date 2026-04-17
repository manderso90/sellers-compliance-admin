import { CalendarCheck, CheckCircle, AlertTriangle, UserX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/formatting'
import type { CommandCenterStats } from '@/lib/queries/command-center'
import type { LucideIcon } from 'lucide-react'

function BoldMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  variant = 'default',
  href,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  variant?: 'default' | 'warning' | 'danger'
  href?: string
}) {
  const Wrapper = href ? 'a' : 'div'

  return (
    <Wrapper
      {...(href ? { href } : {})}
      className={cn(
        'bg-white rounded-xl px-5 py-4 text-left',
        'border-2 border-[#2B2B2B]',
        variant === 'default' && 'neo-shadow-sm neo-shadow-hover',
        variant === 'warning' && 'border-[#D4AF37] neo-shadow-gold bg-[#FFF8E1]',
        variant === 'danger' && 'border-[#C8102E] neo-shadow-red bg-[#C8102E]/5',
        href && 'cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <p
            className={cn(
              'display-font text-4xl font-bold tracking-tight mt-1',
              variant === 'danger' ? 'text-[#C8102E]' : 'text-[#2B2B2B]'
            )}
          >
            {value}
          </p>
          <p className="text-xs text-[#71717A] mt-0.5">{subtitle}</p>
        </div>
        <div
          className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2 border-[#2B2B2B]',
            iconBg
          )}
        >
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
      </div>
    </Wrapper>
  )
}

export function CommandMetricsRow({ stats }: { stats: CommandCenterStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      <BoldMetricCard
        title="Scheduled Today"
        value={stats.scheduledToday}
        subtitle={`${formatCurrency(stats.projectedTodayRevenue)} projected`}
        icon={CalendarCheck}
        iconColor="text-[#3b82f6]"
        iconBg="bg-blue-50"
        href="/admin/dashboard?dateRange=today"
      />
      <BoldMetricCard
        title="This Week (Completed)"
        value={stats.completedThisWeek}
        subtitle={`${formatCurrency(stats.completedRevenueThisWeek)} earned`}
        icon={CheckCircle}
        iconColor="text-[#16a34a]"
        iconBg="bg-green-50"
        href="/admin/dashboard?status=completed"
      />
      <BoldMetricCard
        title="Unconfirmed"
        value={stats.unconfirmedCount}
        subtitle={`${formatCurrency(stats.revenueAtRisk)} at risk`}
        icon={AlertTriangle}
        iconColor={stats.unconfirmedCount > 0 ? 'text-[#D4AF37]' : 'text-[#A1A1AA]'}
        iconBg={stats.unconfirmedCount > 0 ? 'bg-[#FFF8E1]' : 'bg-[#FFFDF5]'}
        variant={stats.unconfirmedCount > 0 ? 'warning' : 'default'}
        href="/admin/dashboard?status=requested"
      />
      <BoldMetricCard
        title="Unassigned"
        value={stats.unassignedCount}
        subtitle={`${formatCurrency(stats.unassignedRevenue)} unassigned`}
        icon={UserX}
        iconColor={stats.unassignedCount > 0 ? 'text-[#C8102E]' : 'text-[#A1A1AA]'}
        iconBg={stats.unassignedCount > 0 ? 'bg-[#C8102E]/5' : 'bg-[#FFFDF5]'}
        variant={stats.unassignedCount > 0 ? 'danger' : 'default'}
        href="/admin/dashboard?status=requested"
      />
    </div>
  )
}
