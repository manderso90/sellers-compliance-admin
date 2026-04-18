import { getInspectors } from '@/lib/queries/inspectors'
import { InspectorTable } from '@/components/admin/inspectors/InspectorTable'
import { InspectorFormDialog } from '@/components/admin/inspectors/InspectorFormDialog'

export default async function InspectorsPage() {
  const inspectors = await getInspectors()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#2B2B2B] tracking-tight">
            Inspectors
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your inspection team. Click a row to see details and workload.
          </p>
        </div>
        <InspectorFormDialog />
      </div>

      <InspectorTable inspectors={inspectors} />
    </div>
  )
}
