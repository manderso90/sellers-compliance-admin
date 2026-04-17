import { createClient } from '@/lib/supabase/server'
import {
  getCommandCenterStats,
  getInspectorWorkloads,
  getComputedAlerts,
  getWeeklySpacesInspected,
  getWeeklyInspectionAnalysis,
} from '@/lib/queries/command-center'
import { getActiveProducts, getWeeklyInstallAggregation } from '@/lib/queries/product-queries'
import { CommandCenterShell } from '@/components/admin/command/CommandCenterShell'
import { CommandMetricsRow } from '@/components/admin/command/CommandMetricsRow'
import { AlertsBanner } from '@/components/admin/command/AlertsBanner'
import { SpacesInspectedCard } from '@/components/admin/command/SpacesInspectedCard'
import { InspectionAnalysisCard } from '@/components/admin/command/InspectionAnalysisCard'
import { ProductPricingCard } from '@/components/admin/command/ProductPricingCard'
import { InstallsThisWeekCard } from '@/components/admin/command/InstallsThisWeekCard'
import { InspectorWorkloadSnapshot } from '@/components/admin/command/InspectorWorkloadSnapshot'
import { ScheduleSyncClient } from '@/components/admin/shared/ScheduleSyncClient'

export default async function AdminPage() {
  const supabase = await createClient()

  const [stats, workloads, alerts, products, weeklyInstalls, spaces, analysis] =
    await Promise.all([
      getCommandCenterStats(supabase),
      getInspectorWorkloads(supabase),
      getComputedAlerts(supabase),
      getActiveProducts(supabase),
      getWeeklyInstallAggregation(supabase),
      getWeeklySpacesInspected(supabase),
      getWeeklyInspectionAnalysis(supabase),
    ])

  return (
    <CommandCenterShell>
      <div className="space-y-5">
        <ScheduleSyncClient />
        {/* Page header */}
        <div>
          <h1 className="text-3xl display-font font-bold text-[#2B2B2B] tracking-tight">Command Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Operations &amp; revenue intelligence
          </p>
        </div>

        {/* Alerts banner */}
        <AlertsBanner alerts={alerts} />

        {/* Row 1: Top summary cards */}
        <CommandMetricsRow stats={stats} />

        {/* Row 2: Spaces Inspected + Inspection Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpacesInspectedCard spaces={spaces} />
          <InspectionAnalysisCard analysis={analysis} />
        </div>

        {/* Row 3: Product Pricing + Installs This Week */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProductPricingCard products={products} />
          <InstallsThisWeekCard products={products} weeklyInstalls={weeklyInstalls} />
        </div>

        {/* Row 4: Inspector Workload */}
        <InspectorWorkloadSnapshot workloads={workloads} />
      </div>
    </CommandCenterShell>
  )
}
