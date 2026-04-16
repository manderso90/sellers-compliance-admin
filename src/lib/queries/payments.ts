import { createClient } from '@/lib/supabase/server'
import { getInspectionPrice } from '@/lib/utils/pricing'
import type { Payment, InstallLineItem } from '@/types/database'

type PropertyPricing = {
  property_type: string
  adu_count: number | null
  unit_count: number | null
}

type InspectionPricing = {
  price: number | null
  properties: PropertyPricing | null
}

export async function getInspectionFinancials(inspectionId: string): Promise<{
  payments: Payment[]
  lineItems: InstallLineItem[]
  balanceDue: number
  totalPaid: number
  invoiceTotal: number
}> {
  const supabase = await createClient()

  const [{ data: inspection }, { data: payments }, { data: lineItems }] = await Promise.all([
    supabase
      .from('inspections')
      .select('price, properties(property_type, adu_count, unit_count)')
      .eq('id', inspectionId)
      .single(),
    supabase
      .from('payments')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('paid_at', { ascending: false }),
    supabase
      .from('install_line_items')
      .select('*')
      .eq('inspection_id', inspectionId),
  ])

  const paymentRows = (payments ?? []) as unknown as Payment[]
  const lineItemRows = (lineItems ?? []) as unknown as InstallLineItem[]
  const inspectionRow = inspection as unknown as InspectionPricing | null

  const inspectionFee = inspectionRow
    ? getInspectionPrice({
        price: inspectionRow.price,
        properties: inspectionRow.properties,
      })
    : 125

  const installTotal = lineItemRows.reduce(
    (sum, item) => sum + item.quantity * Number(item.unit_price),
    0
  )
  const invoiceTotal = inspectionFee + installTotal
  const totalPaid = paymentRows.reduce((sum, p) => sum + Number(p.amount), 0)
  const balanceDue = invoiceTotal - totalPaid

  return {
    payments: paymentRows,
    lineItems: lineItemRows,
    balanceDue,
    totalPaid,
    invoiceTotal,
  }
}
