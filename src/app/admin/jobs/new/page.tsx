import { NewJobForm } from '@/components/admin/jobs/NewJobForm'

export default function NewJobPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-[24px] font-bold text-[#2B2B2B] tracking-tight">New Job</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Create a new job. It will appear in the unscheduled queue on the dispatch board.
        </p>
      </div>

      <NewJobForm />
    </div>
  )
}
