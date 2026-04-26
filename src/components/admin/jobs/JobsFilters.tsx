'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const STATUS_TABS: Array<{ value: string | null; label: string }> = [
  { value: null, label: 'All' },
  { value: 'requested', label: 'Requested' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'on_hold', label: 'On Hold' },
]

interface JobsFiltersProps {
  /** Current `?status=` value, or null when the All tab is active. */
  activeStatus: string | null
  /** Current `?scope=` value, surfaced so we can show the Clear filters link. */
  activeScope: string | null
  /** Current `?search=` value, used as the initial value of the input. */
  activeSearch: string
}

export function JobsFilters({ activeStatus, activeScope, activeSearch }: JobsFiltersProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(activeSearch)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync the input when the URL changes from outside (back/forward, card click).
  useEffect(() => {
    setSearchInput(activeSearch)
  }, [activeSearch])

  function buildTabHref(value: string | null): string {
    const params = new URLSearchParams(searchParams.toString())
    // Tabs write `status` and clear `scope` (per plan: scope and status are
    // mutually exclusive directional filters). Page resets to 1.
    params.delete('scope')
    params.delete('page')
    if (value === null) {
      params.delete('status')
    } else {
      params.set('status', value)
    }
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setSearchInput(next)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('page')
      const trimmed = next.trim()
      if (trimmed) {
        params.set('search', trimmed)
      } else {
        params.delete('search')
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    }, 300)
  }

  // Cleanup pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const hasActiveFilter =
    Boolean(activeStatus) || Boolean(activeScope) || Boolean(activeSearch)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.value && !activeScope
          return (
            <Link
              key={tab.label}
              href={buildTabHref(tab.value)}
              className={[
                'px-3 py-1.5 text-sm font-medium rounded-md border-2 border-black transition-colors',
                isActive
                  ? 'bg-[#FDE047] text-[#2B2B2B]'
                  : 'bg-white text-slate-700 hover:bg-[#FDE047]/30',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="search"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search by customer name or address..."
            className="w-full px-3 py-2 text-sm border-2 border-black rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#FDE047]"
          />
        </div>
        {hasActiveFilter && (
          <Link
            href={pathname}
            className="text-sm text-slate-500 hover:text-[#C8102E] underline underline-offset-2"
          >
            Clear filters
          </Link>
        )}
      </div>
    </div>
  )
}
