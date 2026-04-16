import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { getInspectionPrice } from '@/lib/utils/pricing'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let body: { inspectionId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { inspectionId } = body
  if (!inspectionId) {
    return NextResponse.json({ error: 'inspectionId is required' }, { status: 400 })
  }

  // Fetch inspection with relations
  const { data: inspection, error: inspError } = await supabase
    .from('inspections')
    .select(`
      *,
      customers(*),
      properties(*)
    `)
    .eq('id', inspectionId)
    .single()

  if (inspError || !inspection) {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
  }

  // Fetch install line items
  const { data: lineItems } = await supabase
    .from('install_line_items')
    .select('quantity, unit_price')
    .eq('inspection_id', inspectionId)

  // Fetch existing payments
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('inspection_id', inspectionId)

  // Calculate balance due
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
    return NextResponse.json({ error: 'No balance due' }, { status: 400 })
  }

  // Build description from address
  const property = (inspection as { properties: { street_address: string; unit: string | null; city: string } | null }).properties
  const address = property
    ? `${property.street_address}${property.unit ? ` #${property.unit}` : ''}, ${property.city}`
    : 'Property'

  // Determine base URL for redirects
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const customerEmail = (inspection as { customers: { email: string | null } | null }).customers?.email || undefined

  // Create Stripe Checkout Session
  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(balanceDue * 100), // cents
          product_data: {
            name: `Compliance Inspection — ${address}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      inspection_id: inspectionId,
    },
    success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/payment/cancel`,
  })

  // Save checkout session ID to inspection
  await supabase
    .from('inspections')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', inspectionId)

  return NextResponse.json({ url: session.url, sessionId: session.id })
}
