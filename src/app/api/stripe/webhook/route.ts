import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const inspectionId = session.metadata?.inspection_id

    if (!inspectionId) {
      console.error('Webhook: No inspection_id in session metadata')
      return NextResponse.json({ received: true })
    }

    const amountDollars = (session.amount_total || 0) / 100

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Record payment
    const { error: paymentError } = await supabase.from('payments').insert({
      inspection_id: inspectionId,
      amount: amountDollars,
      method: 'stripe',
      note: `Stripe payment — Session ${session.id}`,
    })

    if (paymentError) {
      console.error('Webhook: Failed to record payment:', paymentError)
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
    }

    // Recalculate balance to determine payment status
    const { data: inspection } = await supabase
      .from('inspections')
      .select('price, property_id')
      .eq('id', inspectionId)
      .single()

    if (inspection) {
      const typedInspection = inspection as { price: number | null; property_id: string | null }

      const { data: property } = typedInspection.property_id
        ? await supabase
            .from('properties')
            .select('property_type, adu_count, unit_count')
            .eq('id', typedInspection.property_id)
            .single()
        : { data: null }

      const { data: lineItems } = await supabase
        .from('install_line_items')
        .select('quantity, unit_price')
        .eq('inspection_id', inspectionId)

      const { data: allPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('inspection_id', inspectionId)

      const { getInspectionPrice } = await import('@/lib/utils/pricing')
      const inspectionFee = getInspectionPrice({
        price: typedInspection.price,
        properties: property as {
          property_type: string
          adu_count: number | null
          unit_count: number | null
        } | null,
      })
      const installTotal = (lineItems || []).reduce(
        (sum: number, item: { quantity: number; unit_price: number | string }) =>
          sum + item.quantity * Number(item.unit_price),
        0
      )
      const invoiceTotal = inspectionFee + installTotal
      const totalPaid = (allPayments || []).reduce(
        (sum: number, p: { amount: number | string }) => sum + Number(p.amount),
        0
      )

      const newStatus = totalPaid >= invoiceTotal ? 'paid' : 'invoiced'

      await supabase
        .from('inspections')
        .update({ payment_status: newStatus })
        .eq('id', inspectionId)
    }
  }

  return NextResponse.json({ received: true })
}
