import { createClient } from '@/lib/supabase/server'
import type { Customer } from '@/types/database'

export type CustomerWithCount = Customer & { inspection_count: number }

/**
 * Fetch customers with a derived inspection_count. Two queries in parallel,
 * aggregate in JS. Cheap at current volumes; move to a DB view if we ever
 * cross tens of thousands of customers.
 */
export async function getCustomersWithInspectionCount(limit = 500): Promise<CustomerWithCount[]> {
  const supabase = await createClient()

  const [customersRes, countsRes] = await Promise.all([
    supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase.from('inspections').select('customer_id'),
  ])

  if (customersRes.error) throw customersRes.error
  if (countsRes.error) throw countsRes.error

  const countByCustomer: Record<string, number> = {}
  for (const row of countsRes.data ?? []) {
    if (row.customer_id) {
      countByCustomer[row.customer_id] = (countByCustomer[row.customer_id] ?? 0) + 1
    }
  }

  return (customersRes.data ?? []).map((c) => ({
    ...c,
    inspection_count: countByCustomer[c.id] ?? 0,
  }))
}
