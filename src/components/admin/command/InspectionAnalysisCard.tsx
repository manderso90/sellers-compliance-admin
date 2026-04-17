import { formatCurrency, formatNumber } from '@/lib/utils/formatting'
import type { WeeklyAnalysis } from '@/lib/queries/command-center'

function StatRow({
  label,
  value,
  bold,
  color,
}: {
  label: string
  value: string
  bold?: boolean
  color?: string
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-sm ${bold ? 'font-semibold text-[#2B2B2B]' : 'text-[#71717A]'}`}>
        {label}
      </span>
      {color === 'text-[#16a34a]' ? (
        <span className="bg-green-50 border-2 border-green-200 rounded-full px-2 py-0.5 text-sm font-bold tabular-nums text-[#16a34a]">
          {value}
        </span>
      ) : (
        <span
          className={`text-sm tabular-nums ${
            bold ? 'font-bold' : 'font-medium'
          } ${color ?? 'text-[#2B2B2B]'}`}
        >
          {value}
        </span>
      )}
    </div>
  )
}

export function InspectionAnalysisCard({ analysis }: { analysis: WeeklyAnalysis }) {
  const empty = analysis.totalPropertiesInspected === 0

  return (
    <div className="bg-white border-2 border-[#2B2B2B] rounded-xl neo-shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-[#2B2B2B]">
        <h3 className="display-font text-lg font-bold text-[#2B2B2B] tracking-tight">Inspection Analysis</h3>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Weekly business KPIs</p>
      </div>

      {empty ? (
        <div className="px-5 py-8">
          <p className="text-sm text-[#A1A1AA] text-center">No completed inspections this week</p>
        </div>
      ) : (
        <div className="px-5 py-4 divide-y divide-[#2B2B2B]/10">
          <div className="space-y-0 pb-1.5">
            <StatRow label="Properties Inspected" value={String(analysis.totalPropertiesInspected)} />
            <StatRow label="Inspection Revenue" value={formatCurrency(analysis.inspectionRevenue)} />
            <StatRow label="Install Revenue" value={formatCurrency(analysis.installRevenue)} />
            <StatRow
              label="Total Revenue"
              value={formatCurrency(analysis.totalWeeklyRevenue)}
              bold
            />
            <StatRow
              label="Total Profit"
              value={formatCurrency(analysis.totalWeeklyProfit)}
              bold
              color="text-[#16a34a]"
            />
          </div>

          <div className="space-y-0 py-1.5">
            <StatRow
              label="Avg Revenue / Property"
              value={formatCurrency(analysis.avgRevenuePerProperty)}
            />
            <StatRow
              label="Avg Install Rev / Inspection"
              value={formatCurrency(analysis.avgInstallRevenuePerInspection)}
            />
            <StatRow
              label="Avg Profit / Property"
              value={formatCurrency(analysis.avgProfitPerProperty)}
              color="text-[#16a34a]"
            />
          </div>

          <div className="space-y-0 pt-1.5">
            <StatRow label="Total Installs" value={String(analysis.totalInstalls)} />
            <StatRow label="Installs / Property" value={formatNumber(analysis.installsPerProperty)} />
            <StatRow label="Installs / Bedroom" value={formatNumber(analysis.installsPerBedroom)} />
          </div>
        </div>
      )}
    </div>
  )
}
