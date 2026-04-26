import Link from 'next/link'
import { getJobsList, getJobsSummaryCounts } from '@/lib/queries/jobs'
import { JobsTable } from '@/components/admin/jobs/JobsTable'
import { JobsSummaryCards } from '@/components/admin/jobs/JobsSummaryCards'
import { JobsFilters } from '@/components/admin/jobs/JobsFilters'
import { JobsPagination } from '@/components/admin/jobs/JobsPagination'
import { ScheduleSyncClient } from '@/components/admin/shared/ScheduleSyncClient'
import type { JobsListScope } from '@/lib/queries/jobs'

const PAGE_SIZE = 30

const VALID_STATUSES = new Set([
  'requested',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'on_hold',
])

const VALID_SCOPES = new Set(['today', 'week', 'unscheduled'])

interface RawSearchParams {
  status?: string
  scope?: string
  search?: string
  page?: string
}

/**
 * URL parameter vocabulary for /admin/jobs:
 * - `status` — one of the 6 lifecycle states (requested, confirmed, in_progress, completed, cancelled, on_hold). Set by status tabs.
 * - `scope`  — pseudo-filter: 'today' / 'week' (ISO Mon–Sun) / 'unscheduled'. Set by summary cards. Mutually exclusive with `status`.
 * - `search` — case-insensitive substring matched against customer name and street address.
 * - `page`   — 1-indexed page number; defaults to 1.
 */
export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const params = await searchParams

  const status = params.status && VALID_STATUSES.has(params.status) ? params.status : undefined
  const scope =
    params.scope && VALID_SCOPES.has(params.scope) ? (params.scope as JobsListScope) : undefined
  const search = params.search?.trim() ? params.search.trim() : undefined
  const pageRaw = Number.parseInt(params.page ?? '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const [{ jobs, total }, counts] = await Promise.all([
    getJobsList({ status, scope, search, page, pageSize: PAGE_SIZE }),
    getJobsSummaryCounts(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilter = Boolean(status) || Boolean(scope) || Boolean(search)

  // Strip `page` for pagination link generation; everything else is preserved.
  const baseQuery = new URLSearchParams()
  if (status) baseQuery.set('status', status)
  if (scope) baseQuery.set('scope', scope)
  if (search) baseQuery.set('search', search)

  return (
    <div className="space-y-4">
      <ScheduleSyncClient />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#2B2B2B] tracking-tight">Jobs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            All jobs in the system. Create new jobs to populate the dispatch board.
          </p>
        </div>
        <Link
          href="/admin/jobs/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-black bg-[#FDE047] border-2 border-black rounded-md neo-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all"
        >
          + New Job
        </Link>
      </div>

      <JobsSummaryCards
        counts={counts}
        activeScope={scope ?? null}
        activeStatus={status ?? null}
      />

      <JobsFilters
        activeStatus={status ?? null}
        activeScope={scope ?? null}
        activeSearch={search ?? ''}
      />

      {jobs.length === 0 ? (
        <div className="bg-white border-2 border-black rounded-lg neo-shadow px-5 py-12 text-center text-sm text-slate-500">
          {hasFilter
            ? 'No jobs match these filters.'
            : 'No jobs yet. Create your first job to get started.'}
        </div>
      ) : (
        <>
          <JobsTable jobs={jobs} />
          <JobsPagination
            currentPage={page}
            totalPages={totalPages}
            baseQueryString={baseQuery.toString()}
          />
        </>
      )}
    </div>
  )
}
