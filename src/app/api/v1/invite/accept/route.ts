import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, createAuthenticatedServerClient, AuthContext } from '@/lib/auth/auth-utils'

// Request schema
const AcceptInviteSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required')
})

// Response schema  
const AcceptInviteResponse = z.object({
  coupleId: z.string().uuid(),
  partnerId: z.string().uuid(),
  partnerEmail: z.string().email()
})

const acceptHandler = async (request: NextRequest, authContext: AuthContext) => {
  try {
    const supabase = await createAuthenticatedServerClient(request)
    const user = authContext.user
    
    // Parse and validate request body
    const body = await request.json()
    const { inviteCode } = AcceptInviteSchema.parse(body)
    
    // Check if user is already in a couple
    const { data: existingCouple, error: coupleError } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', user.userId)
      .single()
    
    if (coupleError && coupleError.code !== 'PGRST116') {
      console.error('Error checking existing couple:', coupleError)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to check coupling status' } },
        { status: 500 }
      )
    }
    
    if (existingCouple) {
      return NextResponse.json(
        { error: { code: 'ALREADY_PAIRED', message: 'You are already in a couple' } },
        { status: 409 }
      )
    }

    // Find the invite and validate it
    const { data: invite, error: inviteError } = await supabase
      .from('partner_invites')
      .select(`
        id,
        inviter_user_id,
        expires_at,
        consumed_at,
        user_profiles!partner_invites_inviter_user_id_fkey (
          email,
          display_name
        )
      `)
      .eq('invite_code', inviteCode)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: { code: 'INVITE_NOT_FOUND', message: 'Invalid or expired invite code' } },
        { status: 404 }
      )
    }

    // Check if invite is already consumed
    if (invite.consumed_at) {
      return NextResponse.json(
        { error: { code: 'INVITE_CONSUMED', message: 'This invite has already been used' } },
        { status: 409 }
      )
    }

    // Check if invite has expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: { code: 'INVITE_EXPIRED', message: 'This invite has expired' } },
        { status: 410 }
      )
    }

    // Check if user is trying to accept their own invite
    if (invite.inviter_user_id === user.userId) {
      return NextResponse.json(
        { error: { code: 'SELF_INVITE', message: 'You cannot accept your own invite' } },
        { status: 400 }
      )
    }

    // Start transaction to create couple and link users
    const { data: couple, error: createCoupleError } = await supabase
      .from('couples')
      .insert({})
      .select('id')
      .single()

    if (createCoupleError || !couple) {
      console.error('Error creating couple:', createCoupleError)
      return NextResponse.json(
        { error: { code: 'COUPLE_CREATE_FAILED', message: 'Failed to create couple' } },
        { status: 500 }
      )
    }

    // Add both users to the couple
    const { error: membersError } = await supabase
      .from('couple_members')
      .insert([
        {
          couple_id: couple.id,
          user_id: invite.inviter_user_id,
          role: 'member'
        },
        {
          couple_id: couple.id,
          user_id: user.userId,
          role: 'member'
        }
      ])

    if (membersError) {
      console.error('Error adding couple members:', membersError)
      
      // Cleanup: delete the couple if member addition failed
      await supabase
        .from('couples')
        .delete()
        .eq('id', couple.id)
      
      return NextResponse.json(
        { error: { code: 'COUPLE_LINK_FAILED', message: 'Failed to link users to couple' } },
        { status: 500 }
      )
    }

    // Mark invite as consumed
    const { error: consumeError } = await supabase
      .from('partner_invites')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', invite.id)

    if (consumeError) {
      console.error('Error consuming invite:', consumeError)
      // Log the error but don't fail the request since the couple is already created
    }

    // Create initial user schedules for both users
    await supabase
      .from('user_schedules')
      .upsert([
        {
          user_id: invite.inviter_user_id,
          dq_hour: 9, // Default to 9 AM
          dq_minute: 0,
          tz: 'UTC' // Will be updated by user preference
        },
        {
          user_id: user.userId,
          dq_hour: 9,
          dq_minute: 0,
          tz: 'UTC'
        }
      ])

    const response = {
      coupleId: couple.id,
      partnerId: invite.inviter_user_id,
      partnerEmail: (invite.user_profiles as any)?.email || 'unknown'
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Invite acceptance error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.errors } },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export const POST = withAuth(acceptHandler, { 
  requireAuth: true,
  rateLimit: { action: 'accept_invite', limit: 5, windowMs: 60000 }
})