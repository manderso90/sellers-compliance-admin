import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getJobById, getJobStatusHistory, getActiveInspectors } from '@/lib/queries/jobs'
import { getInspectionFinancials } from '@/lib/queries/payments'
import { getActiveProducts } from '@/lib/queries/product-queries'
import { JobStatusControl } from '@/components/admin/jobs/JobStatusControl'
import { JobEditForm } from '@/components/admin/jobs/JobEditForm'
import { JobHistory } from '@/components/admin/jobs/JobHistory'
import { DeleteJobDialog } from '@/components/admin/jobs/DeleteJobDialog'
import { InspectorAssignment } from '@/components/admin/jobs/InspectorAssignment'
import { ScheduleSuggestionPanel } from '@/components/admin/jobs/ScheduleSuggestionPanel'
import { ScheduleSyncClient } from '@/components/admin/shared/ScheduleSyncClient'
import { PaymentsSection } from '@/components/admin/inspections/PaymentsSection'
import { InstallItemsSection } from '@/components/admin/inspections/InstallItemsSection'
import type { JobStatus } from '@/types/database'
import { TERMINAL_STATUSES } from '@/services/job-lifecycle'
import { ArrowLeft, Calendar, MapPin, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { formatTime12Hour } from '@/lib/utils/formatting'

interface JobDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params

  const supabase = await createClient()
  const [job, history, inspectors, financials, products] = await Promise.all([
    getJobById(id),
    getJobStatusHistory(id),
    getActiveInspectors(),
    getInspectionFinancials(id),
    getActiveProducts(supabase),
  ])

  if (!job) notFound()

  // Glanceable payment state, derived from the same financials the Payments card uses.
  const { balanceDue, totalPaid } = financials
  const paymentBadge =
    balanceDue <= 0
      ? { label: 'PAID', cls: 'bg-green-100 text-green-800 border-green-700' }
      : totalPaid > 0
        ? {
            label: `PARTIAL — $${balanceDue.toFixed(2)} due`,
            cls: 'bg-amber-100 text-amber-800 border-amber-600',
          }
        : {
            label: `OUTSTANDING — $${balanceDue.toFixed(2)}`,
            cls: 'bg-red-100 text-red-700 border-[#C8102E]',
          }

  return (
    <div className="space-y-6 max-w-3xl">
      <ScheduleSyncClient />
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/jobs"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Jobs
          </Link>
          <h1 className="text-[24px] font-bold text-[#2B2B2B] tracking-tight">
            {job.title} — {job.address}
          </h1>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {job.scheduled_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(job.scheduled_date + 'T12:00:00'), 'MMM d, yyyy')}
                {job.scheduled_time && ` at ${formatTime12Hour(job.scheduled_time)}`}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {job.city || 'No city'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {job.estimated_duration_minutes} min
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border-2 neo-shadow-sm whitespace-nowrap ${paymentBadge.cls}`}
          >
            {paymentBadge.label}
          </span>
          <DeleteJobDialog jobId={job.id} jobTitle={`${job.title} — ${job.address}`} />
        </div>
      </div>

      {/* Status + Assignment */}
      <div className="bg-white border-2 border-black rounded-lg p-5 neo-shadow space-y-5">
        <JobStatusControl jobId={job.id} currentStatus={job.status as JobStatus} />

        <div className="border-t border-slate-200 pt-5">
          <InspectorAssignment
            jobId={job.id}
            currentInspectorId={job.assigned_inspector_id}
            currentInspectorName={job.inspector_name}
            inspectors={inspectors}
          />
        </div>

        {/* Dispatch info (read-only) */}
        <div className="border-t border-slate-200 pt-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500">Dispatch Status</span>
            <span className="text-xs px-2 py-1 rounded-md font-medium bg-slate-100 text-slate-600 border border-slate-300">
              {job.dispatch_status}
            </span>
          </div>
        </div>
      </div>

      {/* Smart Scheduling Suggestions */}
      <div className="bg-white border-2 border-black rounded-lg p-5 neo-shadow">
        <ScheduleSuggestionPanel
          jobId={job.id}
          isTerminal={(TERMINAL_STATUSES as readonly string[]).includes(job.status)}
        />
      </div>

      {/* Editable Fields */}
      <div className="bg-white border-2 border-black rounded-lg p-5 neo-shadow">
        <JobEditForm job={job} />
      </div>

      {/* Invoice (inspection fee + install items) */}
      <div className="bg-white border-2 border-black rounded-lg p-5 neo-shadow">
        <InstallItemsSection
          inspectionId={job.id}
          products={products}
          lineItems={financials.lineItems}
          inspectionFee={financials.inspectionFee}
        />
      </div>

      {/* Payments */}
      <div className="bg-white border-2 border-black rounded-lg p-5 neo-shadow">
        <PaymentsSection
          inspectionId={job.id}
          payments={financials.payments}
          balanceDue={financials.balanceDue}
        />
      </div>

      {/* Status History */}
      <div className="bg-white border-2 border-black rounded-lg p-5 neo-shadow">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Status History</h3>
        <JobHistory history={history} />
      </div>
    </div>
  )
}
