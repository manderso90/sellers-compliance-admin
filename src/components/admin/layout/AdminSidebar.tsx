'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UnassignedBadge } from '@/components/admin/shared/UnassignedBadge'
import {
  GanttChart,
  ClipboardList,
  Settings,
  UserCheck,
  Zap,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: typeof Zap
  badge?: boolean
}

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Command Center', href: '/admin', icon: Zap, badge: true },
      { label: 'Dispatch', href: '/admin/dispatch', icon: GanttChart, badge: true },
    ],
  },
  {
    label: 'Records',
    items: [
      { label: 'Jobs', href: '/admin/jobs', icon: ClipboardList },
      { label: 'Inspectors', href: '/admin/inspectors', icon: UserCheck },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
]

export function AdminSidebar({ unassignedCount = 0 }: { unassignedCount?: number }) {
  const pathname = usePathname()

  function renderNavItem(item: NavItem) {
    const isActive =
      item.href === '/admin'
        ? pathname === '/admin'
        : pathname === item.href || pathname.startsWith(item.href + '/')

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
          isActive
            ? 'bg-[#C8102E] text-white font-bold'
            : 'text-white/50 hover:text-white/80 hover:bg-white/5'
        )}
      >
        <item.icon className="w-[18px] h-[18px] shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badge && <UnassignedBadge count={unassignedCount} />}
      </Link>
    )
  }

  return (
    <aside className="w-60 min-h-screen bg-[#4A4543] border-r-2 border-[#2B2B2B] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#C8102E] rounded-full border-2 border-[#C8102E] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs" style={{ fontFamily: "var(--font-syne, 'Syne', sans-serif)" }}>SC</span>
          </div>
          <div>
            <p className="text-white text-sm font-bold tracking-tight leading-tight">
              Seller&apos;s Compliance
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 py-2 mt-2 first:mt-0">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map(renderNavItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#D4AF37] rounded-full border-2 border-[#D4AF37] flex items-center justify-center shrink-0">
            <span className="text-[#2B2B2B] text-xs font-bold">SC</span>
          </div>
          <div>
            <p className="text-sm text-white/80 font-medium">Admin</p>
            <p className="text-[10px] text-white/30">Seller&apos;s Compliance</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
