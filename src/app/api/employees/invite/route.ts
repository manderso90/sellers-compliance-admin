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

  // Use service role client for admin auth operations
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sellerscompliance.com'

  // Step 1: Create the user (or find existing)
  let userId: string | undefined
  let isExistingUser = false

  const { data: createData, error: createError } =
    await adminSupabase.auth.admin.createUser({
      email,
      email_confirm: true,
    })

  if (createError) {
    // User may already exist — check if it's a duplicate error
    if (createError.message?.toLowerCase().includes('already been registered') ||
        createError.message?.toLowerCase().includes('already exists')) {
      // Look up existing user
      const { data: listData } = await adminSupabase.auth.admin.listUsers()
      const existingUser = listData?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      )
      if (existingUser) {
        userId = existingUser.id
        isExistingUser = true
      } else {
        return NextResponse.json({ error: createError.message }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }
  } else {
    userId = createData.user?.id
  }

  // Step 2: Generate a link to get the token
  // For existing users, use 'recovery' since 'invite' fails on confirmed users
  const linkType = isExistingUser ? 'recovery' : 'invite'
  const { data: linkData, error: linkError } =
    await adminSupabase.auth.admin.generateLink({
      type: linkType,
      email,
    })

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 400 })
  }

  const hashedToken = linkData?.properties?.hashed_token
  if (!hashedToken) {
    return NextResponse.json(
      { error: 'Failed to generate invite token' },
      { status: 500 }
    )
  }

  // Step 3: Send branded invite email via Resend
  const tokenType = isExistingUser ? 'recovery' : 'invite'
  const setupUrl = `${siteUrl}/auth/setup-account?token_hash=${hashedToken}&type=${tokenType}`

  const apiKey = process.env.RESEND_API_KEY
  if (apiKey && apiKey !== 're_REPLACE_WITH_YOUR_API_KEY') {
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
      console.error('Failed to send invite email:', err)
      // Don't fail the whole invite — user is created, admin can re-send
    }
  } else {
    console.warn('Resend API key not configured — invite email not sent')
  }

  // Step 4: Upsert the profile with provided details
  // Uses upsert so re-inviting a user whose profile was deleted still works
  if (userId) {
    await adminSupabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: full_name || null,
        roles: roles?.length ? roles : ['inspector'],
        phone: phone || null,
        is_active: true,
      }, { onConflict: 'id' })
  }

  return NextResponse.json({ success: true, userId })
}
