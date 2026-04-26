import Link from 'next/link'

interface JobsSummaryCardsProps {
  counts: {
    today: number
    week: number
    unscheduled: number
    needsReview: number
  }
  activeScope: 'today' | 'week' | 'unscheduled' | null
  activeStatus: string | null
}

interface CardDef {
  key: 'today' | 'week' | 'unscheduled' | 'needsReview'
  label: string
  count: number
  href: string
  isActive: boolean
}

export function JobsSummaryCards({ counts, activeScope, activeStatus }: JobsSummaryCardsProps) {
  const cards: CardDef[] = [
    {
      key: 'today',
      label: 'Today',
      count: counts.today,
      href: '/admin/jobs?scope=today',
      isActive: activeScope === 'today',
    },
    {
      key: 'week',
      label: 'This Week',
      count: counts.week,
      href: '/admin/jobs?scope=week',
      isActive: activeScope === 'week',
    },
    {
      key: 'unscheduled',
      label: 'Unscheduled',
      count: counts.unscheduled,
      href: '/admin/jobs?scope=unscheduled',
      isActive: activeScope === 'unscheduled',
    },
    {
      key: 'needsReview',
      label: 'Needs Review',
      count: counts.needsReview,
      href: '/admin/jobs?status=on_hold',
      isActive: activeStatus === 'on_hold',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.href}
          className={[
            'block border-2 border-black rounded-lg px-4 py-3 neo-shadow-sm',
            'transition-all hover:translate-y-0.5 hover:shadow-none',
            card.isActive ? 'bg-[#FDE047]' : 'bg-white',
          ].join(' ')}
          aria-current={card.isActive ? 'page' : undefined}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {card.label}
          </div>
          <div className="text-[28px] font-bold text-[#2B2B2B] tracking-tight leading-none mt-1">
            {card.count}
          </div>
        </Link>
      ))}
    </div>
  )
}
