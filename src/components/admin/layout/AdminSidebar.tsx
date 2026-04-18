'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UnassignedBadge } from '@/components/admin/shared/UnassignedBadge'
import type { ReactNode } from 'react'

/* ── Inline SVG icons ──────────────────────────────────────────────
   24×24 viewBox, stroke-only, stroke-width 1.75,
   round caps & joins, fill: none, stroke: currentColor.
   Displayed at 17×17px via the icon wrapper. */

const svgProps = {
  width: 17,
  height: 17,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function IconBolt() {
  return (
    <svg {...svgProps}>
      <path d="M13 2 L3 14 h9 l-1 8 L21 10 h-9 l1-8 z" />
    </svg>
  )
}

function IconTimeline() {
  return (
    <svg {...svgProps}>
      <path d="M3 3v18h18" />
      <path d="M7 16h4" />
      <path d="M11 12h5" />
      <path d="M9 8h8" />
    </svg>
  )
}

function IconClipboard() {
  return (
    <svg {...svgProps}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  )
}

function IconUserCheck() {
  return (
    <svg {...svgProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  )
}

function IconGear() {
  return (
    <svg {...svgProps}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/* ── Nav data ──────────────────────────────────────────────────── */

interface NavItem {
  label: string
  href: string
  icon: () => ReactNode
  badge?: boolean
}

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operations',
    items: [
      { label: 'Command Center', href: '/admin', icon: IconBolt, badge: true },
      { label: 'Dispatch', href: '/admin/dispatch', icon: IconTimeline, badge: true },
    ],
  },
  {
    label: 'Records',
    items: [
      { label: 'Jobs', href: '/admin/jobs', icon: IconClipboard },
      { label: 'Inspectors', href: '/admin/inspectors', icon: IconUserCheck },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/admin/settings', icon: IconGear },
    ],
  },
]

/* ── Component ─────────────────────────────────────────────────── */

export function AdminSidebar({ unassignedCount = 0 }: { unassignedCount?: number }) {
  const pathname = usePathname()

  function renderNavItem(item: NavItem) {
    const isActive =
      item.href === '/admin'
        ? pathname === '/admin'
        : pathname === item.href || pathname.startsWith(item.href + '/')

    const Icon = item.icon

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
          isActive
            ? 'text-[#C8102E] font-bold'
            : 'text-white/65 hover:text-white/80 hover:bg-white/5'
        )}
      >
        <span className={cn('shrink-0 transition-opacity', isActive ? 'opacity-100' : 'opacity-85')}>
          <Icon />
        </span>
        <span className="flex-1">{item.label}</span>
        {item.badge && <UnassignedBadge count={unassignedCount} />}
      </Link>
    )
  }

  return (
    <aside className="w-60 min-h-screen bg-black border-r-2 border-[#2B2B2B] flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10">
        <Link href="/admin" className="block">
          <Image
            src="/sc-logo.svg"
            alt="Seller's Compliance"
            width={200}
            height={141}
            className="w-full h-auto rounded-lg"
            priority
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p
              className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 py-2 mt-2 first:mt-0"
            >
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
