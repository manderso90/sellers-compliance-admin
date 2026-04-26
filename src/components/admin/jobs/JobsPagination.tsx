import Link from 'next/link'

interface JobsPaginationProps {
  currentPage: number
  totalPages: number
  /** Current search params with `page` already stripped — we'll re-add it. */
  baseQueryString: string
}

export function JobsPagination({ currentPage, totalPages, baseQueryString }: JobsPaginationProps) {
  if (totalPages <= 1) return null

  const buildHref = (page: number): string => {
    const params = new URLSearchParams(baseQueryString)
    params.set('page', String(page))
    return `/admin/jobs?${params.toString()}`
  }

  const isFirst = currentPage <= 1
  const isLast = currentPage >= totalPages

  const baseBtn =
    'px-3 py-1.5 text-sm font-medium rounded-md border-2 border-black transition-colors'
  const active = 'bg-white text-slate-700 hover:bg-[#FDE047]/30'
  const disabled = 'bg-slate-100 text-slate-300 cursor-not-allowed pointer-events-none'

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-slate-500">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={isFirst ? '#' : buildHref(currentPage - 1)}
          aria-disabled={isFirst}
          className={`${baseBtn} ${isFirst ? disabled : active}`}
        >
          ← Prev
        </Link>
        <Link
          href={isLast ? '#' : buildHref(currentPage + 1)}
          aria-disabled={isLast}
          className={`${baseBtn} ${isLast ? disabled : active}`}
        >
          Next →
        </Link>
      </div>
    </div>
  )
}
