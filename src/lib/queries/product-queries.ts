// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

import { startOfWeek, endOfWeek, format } from 'date-fns'
import type { Product } from '@/types/database'

export async function getActiveProducts(supabase: AnyClient): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('product_name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Product[]
}

export interface WeeklyInstallRow {
  product_id: string
  product_name: string
  quantity: number
  revenue: number
  cost: number
  labor: number
  profit: number
}

export async function getWeeklyInstallAggregation(
  supabase: AnyClient
): Promise<WeeklyInstallRow[]> {
  const now = new Date()
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  // Get all install line items completed this week, joined to products
  const { data, error } = await supabase
    .from('install_line_items')
    .select(`
      product_id,
      quantity,
      unit_price,
      unit_part_cost,
      unit_labor_cost,
      products (product_name)
    `)
    .gte('completed_at', weekStart)
    .lte('completed_at', weekEnd + 'T23:59:59.999Z')

  if (error) throw error
  if (!data || data.length === 0) return []

  // Aggregate by product
  const aggregation = new Map<string, WeeklyInstallRow>()

  for (const item of data as {
    product_id: string
    quantity: number
    unit_price: number
    unit_part_cost: number
    unit_labor_cost: number
    products: { product_name: string } | null
  }[]) {
    const existing = aggregation.get(item.product_id)
    const qty = item.quantity ?? 0
    const revenue = qty * Number(item.unit_price ?? 0)
    const cost = qty * Number(item.unit_part_cost ?? 0)
    const labor = qty * Number(item.unit_labor_cost ?? 0)
    const profit = revenue - cost - labor

    if (existing) {
      existing.quantity += qty
      existing.revenue += revenue
      existing.cost += cost
      existing.labor += labor
      existing.profit += profit
    } else {
      aggregation.set(item.product_id, {
        product_id: item.product_id,
        product_name: item.products?.product_name ?? 'Unknown',
        quantity: qty,
        revenue,
        cost,
        labor,
        profit,
      })
    }
  }

  return Array.from(aggregation.values())
}
