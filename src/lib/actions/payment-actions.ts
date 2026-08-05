'use server'

import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { getStripe } from '@/lib/stripe'
import { getInspectionPrice } from '@/lib/utils/pricing'

// Post-payment pages live on the public site, not the auth-gated admin domain.
// Customers must land somewhere reachable without an admin session.
const PUBLIC_SITE_URL = 'https://sellerscompliance.com'

export async function addPayment(
  inspectionId: string,
  amount: number,
  method: string,
  note?: string
) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase.from('payments').insert({
    inspection_id: inspectionId,
    amount,
    method,
    note: note || null,
  })

  if (error) throw error

  revalidatePath(`/admin/jobs/${inspectionId}`)
}

/**
 * Set the inspection fee for a job (writes inspections.price). 0 is valid —
 * it waives the fee (work-only jobs). Clamped to >= 0.
 */
export async function updateInspectionFee(inspectionId: string, amount: number) {
  const { supabase } = await requireAdmin()

  const fee = Number(amount)
  if (!Number.isFinite(fee) || fee < 0) throw new Error('Fee must be a non-negative number')

  const { error } = await supabase
    .from('inspections')
    .update({ price: fee })
    .eq('id', inspectionId)

  if (error) throw error

  revalidatePath(`/admin/jobs/${inspectionId}`)
}

export async function deletePayment(paymentId: string, inspectionId: string) {
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)

  if (error) throw error

  revalidatePath(`/admin/jobs/${inspectionId}`)
}

export async function createPaymentLink(
  inspectionId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const { supabase } = await requireAdmin()

  // Fetch inspection with property and customer
  const { data: inspection, error: inspError } = await supabase
    .from('inspections')
    .select('*, customers(*), properties(*)')
    .eq('id', inspectionId)
    .single()

  if (inspError || !inspection) {
    return { success: false, error: 'Inspection not found' }
  }

  // Fetch line items and payments
  const [{ data: lineItems }, { data: payments }] = await Promise.all([
    supabase.from('install_line_items').select('quantity, unit_price').eq('inspection_id', inspectionId),
    supabase.from('payments').select('amount').eq('inspection_id', inspectionId),
  ])

  // Calculate balance
  const inspectionFee = getInspectionPrice(inspection as Parameters<typeof getInspectionPrice>[0])
  const installTotal = (lineItems || []).reduce(
    (sum: number, item: { quantity: number; unit_price: number | string }) =>
      sum + item.quantity * Number(item.unit_price),
    0
  )
  const invoiceTotal = inspectionFee + installTotal
  const totalPaid = (payments || []).reduce(
    (sum: number, p: { amount: number | string }) => sum + Number(p.amount),
    0
  )
  const balanceDue = invoiceTotal - totalPaid

  if (balanceDue <= 0) {
    return { success: false, error: 'No balance due' }
  }

  const property = (inspection as { properties: { street_address: string; unit: string | null; city: string } | null }).properties
  const address = property
    ? `${property.street_address}${property.unit ? ` #${property.unit}` : ''}, ${property.city}`
    : 'Property'

  const customerEmail = (inspection as { customers: { email: string | null } | null }).customers?.email || undefined

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(balanceDue * 100),
            product_data: {
              name: `${inspection.service_type === 'work' ? 'Work Completion' : 'Compliance Inspection'} — ${address}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        inspection_id: inspectionId,
      },
      success_url: `${PUBLIC_SITE_URL}/payment/success`,
      cancel_url: `${PUBLIC_SITE_URL}/payment/cancel`,
    })

    await supabase
      .from('inspections')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', inspectionId)

    revalidatePath(`/admin/jobs/${inspectionId}`)
    return { success: true, url: session.url || undefined }
  } catch (err) {
    console.error('Failed to create payment link:', err)
    return { success: false, error: 'Failed to create Stripe payment link' }
  }
}
