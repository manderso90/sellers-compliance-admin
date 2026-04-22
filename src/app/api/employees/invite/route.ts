import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { buildInviteEmailHtml } from '@/lib/email/invite-template'

export async function POST(request: NextRequest) {
  // Verify caller is authenticated admin
  const serverSupabase = await createServerClient()
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await serverSupabase
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()
  const callerRoles: string[] = (profile as any)?.roles ?? []
  if (!callerRoles.includes('admin') && !callerRoles.includes('super_admin')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { email, full_name, roles, phone } = body

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const origin = new URL(request.url).origin

  let isExistingUser = false
  let { data: linkData, error: linkError } =
    await adminSupabase.auth.admin.generateLink({ type: 'invite', email })

  if (linkError && /already (registered|exists)/i.test(linkError.message ?? '')) {
    isExistingUser = true
    const recovery = await adminSupabase.auth.admin.generateLink({
      type: 'recovery',
      email,
    })
    linkData = recovery.data
    linkError = recovery.error
  }

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 400 })
  }

  const userId = linkData?.user?.id
  const hashedToken = linkData?.properties?.hashed_token
  if (!userId || !hashedToken) {
    return NextResponse.json(
      { error: 'Failed to generate invite token' },
      { status: 500 }
    )
  }

  const tokenType = isExistingUser ? 'recovery' : 'invite'
  const setupUrl = `${origin}/auth/setup-account?token_hash=${hashedToken}&type=${tokenType}`

  // Upsert the profile before sending email so a send failure doesn't
  // leave us with an auth user but no profile row.
  const { error: profileError } = await adminSupabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      full_name: full_name || null,
      roles: roles?.length ? roles : ['inspector'],
      phone: phone || null,
      is_active: true,
    }, { onConflict: 'id' })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey === 're_REPLACE_WITH_YOUR_API_KEY') {
    return NextResponse.json(
      { error: 'Email service not configured (RESEND_API_KEY missing)' },
      { status: 500 }
    )
  }

  const resend = new Resend(apiKey)
  const html = buildInviteEmailHtml({
    employeeName: full_name || '',
    setupUrl,
  })

  try {
    await resend.emails.send({
      from: "Seller's Compliance <info@sellerscompliance.com>",
      to: email,
      subject: "You're invited to join Seller's Compliance",
      html,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send invite email'
    return NextResponse.json(
      { error: message, userId, profileCreated: true },
      { status: 502 }
    )
  }

  return NextResponse.json({ success: true, userId })
}
