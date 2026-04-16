import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { format } from 'date-fns'
import { geocodeAddress, formatPropertyAddress } from '@/lib/utils/geocoding'
import { buildOrderNotificationHtml } from '@/lib/email/order-notification-template'

const orderSchema = z.object({
  // Customer fields
  customer_full_name: z.string().min(2, 'Name is required'),
  customer_email: z.string().email('Valid email required'),
  customer_phone: z.string().optional(),
  customer_type: z.enum(['agent', 'broker', 'transaction_coordinator', 'seller', 'escrow', 'other']),
  company_name: z.string().optional(),
  // Property fields
  street_address: z.string().min(5, 'Street address is required'),
  unit: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  zip_code: z.string().regex(/^\d{5}$/, 'Enter a valid 5-digit zip code'),
  county: z.string().optional(),
  property_type: z.enum(['single_family', 'condo', 'townhouse', 'multi_family', 'other']),
  // Scheduling
  requested_date: z.string().min(1, 'Preferred date is required'),
  requested_time_preference: z.enum(['morning', 'afternoon', 'anytime', 'flexible']),
  // Service
  service_type: z.enum(['standard', 'expedited', 'reinspection']).default('standard'),
  includes_installation: z.boolean().default(false),
  access_instructions: z.string().optional(),
  lockbox_code: z.string().optional(),
  contact_on_site: z.string().optional(),
  public_notes: z.string().optional(),
  // Transaction
  listing_agent_name: z.string().optional(),
  escrow_number: z.string().optional(),
})

export async function POST(req: NextRequest) {
  // Use service role key — bypasses RLS for public form submission
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data

  try {
    // 1. Upsert customer by email (prevents duplicates for repeat agents)
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .upsert(
        {
          email: data.customer_email,
          full_name: data.customer_full_name,
          phone: data.customer_phone || null,
          customer_type: data.customer_type,
          company_name: data.company_name || null,
        },
        { onConflict: 'email', ignoreDuplicates: false }
      )
      .select()
      .single()

    if (customerError || !customer) {
      console.error('Customer upsert error:', customerError)
      return NextResponse.json({ error: 'Failed to save customer' }, { status: 500 })
    }

    // 2. Insert property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert({
        street_address: data.street_address,
        unit: data.unit || null,
        city: data.city,
        state: 'CA',
        zip_code: data.zip_code,
        county: data.county || null,
        property_type: data.property_type,
      })
      .select()
      .single()

    if (propertyError || !property) {
      console.error('Property insert error:', propertyError)
      return NextResponse.json({ error: 'Failed to save property' }, { status: 500 })
    }

    // 2b. Geocode the property address (non-blocking — don't fail if geocoding fails)
    try {
      const address = formatPropertyAddress({
        street_address: data.street_address,
        unit: data.unit || null,
        city: data.city,
        state: 'CA',
        zip_code: data.zip_code,
      })
      const coords = await geocodeAddress(address)
      if (coords) {
        await supabase
          .from('properties')
          .update({ latitude: coords.lat, longitude: coords.lng })
          .eq('id', property.id)
      }
    } catch (geoErr) {
      console.warn('Geocoding failed (non-blocking):', geoErr)
    }

    // 3. Insert inspection
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .insert({
        customer_id: customer.id,
        property_id: property.id,
        status: 'requested',
        requested_date: data.requested_date || null,
        requested_time_preference: data.requested_time_preference || null,
        service_type: data.service_type,
        includes_installation: data.includes_installation,
        access_instructions: data.access_instructions || null,
        lockbox_code: data.lockbox_code || null,
        contact_on_site: data.contact_on_site || null,
        public_notes: data.public_notes || null,
        listing_agent_name: data.listing_agent_name || null,
        escrow_number: data.escrow_number || null,
      })
      .select()
      .single()

    if (inspectionError || !inspection) {
      console.error('Inspection insert error:', inspectionError)
      return NextResponse.json({ error: 'Failed to submit inspection request' }, { status: 500 })
    }

    // Send internal notification email (non-blocking)
    try {
      const apiKey = process.env.RESEND_API_KEY
      if (apiKey && apiKey !== 're_REPLACE_WITH_YOUR_API_KEY') {
        const resend = new Resend(apiKey)

        let formattedDate = data.requested_date
        try {
          formattedDate = format(new Date(data.requested_date + 'T00:00:00'), 'MMMM d, yyyy')
        } catch {
          // keep raw date string if parsing fails
        }

        const html = buildOrderNotificationHtml({
          confirmationNumber: inspection.id.slice(0, 8).toUpperCase(),
          customerName: data.customer_full_name,
          customerEmail: data.customer_email,
          customerPhone: data.customer_phone || undefined,
          customerType: data.customer_type,
          companyName: data.company_name || undefined,
          streetAddress: data.street_address,
          unit: data.unit || undefined,
          city: data.city,
          zipCode: data.zip_code,
          propertyType: data.property_type,
          requestedDate: formattedDate,
          timePreference: data.requested_time_preference,
          serviceType: data.service_type,
          includesInstallation: data.includes_installation,
          accessInstructions: data.access_instructions || undefined,
          lockboxCode: data.lockbox_code || undefined,
          contactOnSite: data.contact_on_site || undefined,
          listingAgentName: data.listing_agent_name || undefined,
          publicNotes: data.public_notes || undefined,
          escrowNumber: data.escrow_number || undefined,
        })

        await resend.emails.send({
          from: "Seller's Compliance <results@sellerscompliance.com>",
          to: 'info@sellerscompliance.com',
          subject: `New Inspection Request — ${data.street_address}, ${data.city}`,
          html,
        })
      }
    } catch (emailErr) {
      console.error('Order notification email failed (non-blocking):', emailErr)
    }

    return NextResponse.json({
      success: true,
      inspectionId: inspection.id,
      confirmationNumber: inspection.id.slice(0, 8).toUpperCase(),
      address: `${data.street_address}${data.unit ? ` #${data.unit}` : ''}, ${data.city}, CA ${data.zip_code}`,
      requestedDate: data.requested_date || null,
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected error occurred' }, { status: 500 })
  }
}
