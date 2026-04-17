import { formatCurrency } from '@/lib/utils/formatting'
import type { Product } from '@/types/database'
import type { WeeklyInstallRow } from '@/lib/queries/product-queries'

interface Props {
  products: Product[]
  weeklyInstalls: WeeklyInstallRow[]
}

export function InstallsThisWeekCard({ products, weeklyInstalls }: Props) {
  const installMap = new Map(weeklyInstalls.map((r) => [r.product_id, r]))

  const rows = products.map((product) => {
    const install = installMap.get(product.id)
    return {
      product_name: product.product_name,
      quantity: install?.quantity ?? 0,
      revenue: install?.revenue ?? 0,
      cost: install?.cost ?? 0,
      labor: install?.labor ?? 0,
      profit: install?.profit ?? 0,
    }
  })

  const totals = rows.reduce(
    (acc, r) => ({
      quantity: acc.quantity + r.quantity,
      revenue: acc.revenue + r.revenue,
      cost: acc.cost + r.cost,
      labor: acc.labor + r.labor,
      profit: acc.profit + r.profit,
    }),
    { quantity: 0, revenue: 0, cost: 0, labor: 0, profit: 0 }
  )

  return (
    <div className="bg-white border-2 border-[#2B2B2B] rounded-xl neo-shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b-2 border-[#2B2B2B]">
        <h3 className="display-font text-lg font-bold text-[#2B2B2B] tracking-tight">Installs This Week</h3>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Weekly install performance</p>
      </div>

      {products.length === 0 ? (
        <div className="px-5 py-8">
          <p className="text-sm text-[#A1A1AA] text-center">No products configured yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#FFFDF5] border-b-2 border-[#2B2B2B]/10">
                <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">Product</th>
                <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 w-14">Qty</th>
                <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 w-20">Revenue</th>
                <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 w-20">Cost</th>
                <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 w-20">Labor</th>
                <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 w-20">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B2B2B]/5">
              {rows.map((row) => (
                <tr key={row.product_name} className="hover:bg-[#FFFDF5] transition-colors">
                  <td className="px-3 py-2.5 font-medium text-[#2B2B2B]">{row.product_name}</td>
                  <td className="px-3 py-2.5 text-right text-[#2B2B2B] tabular-nums">{row.quantity}</td>
                  <td className="px-3 py-2.5 text-right text-[#2B2B2B] tabular-nums">{formatCurrency(row.revenue)}</td>
                  <td className="px-3 py-2.5 text-right text-[#71717A] tabular-nums">{formatCurrency(row.cost)}</td>
                  <td className="px-3 py-2.5 text-right text-[#71717A] tabular-nums">{formatCurrency(row.labor)}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-[#16a34a] tabular-nums">{formatCurrency(row.profit)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#2B2B2B]/10 bg-[#FFFDF5] font-semibold">
                <td className="px-3 py-2.5 text-[#2B2B2B]">Totals</td>
                <td className="px-3 py-2.5 text-right text-[#2B2B2B] tabular-nums">{totals.quantity}</td>
                <td className="px-3 py-2.5 text-right text-[#2B2B2B] tabular-nums">{formatCurrency(totals.revenue)}</td>
                <td className="px-3 py-2.5 text-right text-[#71717A] tabular-nums">{formatCurrency(totals.cost)}</td>
                <td className="px-3 py-2.5 text-right text-[#71717A] tabular-nums">{formatCurrency(totals.labor)}</td>
                <td className="px-3 py-2.5 text-right text-[#16a34a] tabular-nums">{formatCurrency(totals.profit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
