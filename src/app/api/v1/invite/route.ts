import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { withAuth, createAuthenticatedServerClient, AuthContext } from '@/lib/auth/auth-utils'

// Request schema
const CreateInviteSchema = z.object({
  expiresInDays: z.number().min(1).max(30).optional().default(7)
})

// Response schema
const CreateInviteResponse = z.object({
  inviteId: z.string().uuid(),
  link: z.string().url(),
  inviteCode: z.string(),
  expiresAt: z.string().datetime()
})

const postHandler = async (request: NextRequest, authContext: AuthContext) => {
  try {
    const supabase = await createAuthenticatedServerClient(request)
    const user = authContext.user

    // Parse and validate request body
    const body = await request.json()
    const { expiresInDays } = CreateInviteSchema.parse(body)
    
    // Check if user already has an active couple
    const { data: existingCouple, error: coupleError } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', user.userId)
      .single()
    
    if (coupleError && coupleError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing couple:', coupleError)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to check coupling status' } },
        { status: 500 }
      )
    }
    
    if (existingCouple) {
      return NextResponse.json(
        { error: { code: 'ALREADY_PAIRED', message: 'User is already in a couple' } },
        { status: 409 }
      )
    }

    // Check if user already has a pending invite
    const { data: existingInvite, error: inviteCheckError } = await supabase
      .from('partner_invites')
      .select('id, expires_at')
      .eq('inviter_user_id', user.userId)
      .is('consumed_at', null)
      .gte('expires_at', new Date().toISOString())
      .single()
    
    if (inviteCheckError && inviteCheckError.code !== 'PGRST116') {
      console.error('Error checking existing invites:', inviteCheckError)
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to check existing invites' } },
        { status: 500 }
      )
    }
    
    if (existingInvite) {
      return NextResponse.json(
        { error: { code: 'INVITE_EXISTS', message: 'You already have a pending invite' } },
        { status: 409 }
      )
    }

    // Generate invite code and expiry
    const inviteCode = nanoid(12) // Short, user-friendly code
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Create the invite
    const { data: invite, error: createError } = await supabase
      .from('partner_invites')
      .insert({
        inviter_user_id: user.userId,
        invite_code: inviteCode,
        expires_at: expiresAt.toISOString()
      })
      .select('id, invite_code, expires_at')
      .single()

    if (createError) {
      console.error('Error creating invite:', createError)
      return NextResponse.json(
        { error: { code: 'CREATE_FAILED', message: 'Failed to create invite' } },
        { status: 500 }
      )
    }

    // Generate invite link
    const baseUrl = request.nextUrl.origin
    const inviteLink = `${baseUrl}/invite/${inviteCode}`

    const response = {
      inviteId: invite.id,
      link: inviteLink,
      inviteCode: invite.invite_code,
      expiresAt: invite.expires_at
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Invite creation error:', error)
    
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

const getHandler = async (request: NextRequest, authContext: AuthContext) => {
  try {
    const supabase = await createAuthenticatedServerClient(request)
    const user = authContext.user

    // Get user's active invites
    const { data: invites, error: invitesError } = await supabase
      .from('partner_invites')
      .select('id, invite_code, expires_at, created_at')
      .eq('inviter_user_id', user.userId)
      .is('consumed_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (invitesError) {
      console.error('Error fetching invites:', invitesError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch invites' } },
        { status: 500 }
      )
    }

    const baseUrl = request.nextUrl.origin
    const formattedInvites = invites.map((invite: any) => ({
      inviteId: invite.id,
      link: `${baseUrl}/invite/${invite.invite_code}`,
      inviteCode: invite.invite_code,
      expiresAt: invite.expires_at,
      createdAt: invite.created_at
    }))

    return NextResponse.json({ invites: formattedInvites })

  } catch (error) {
    console.error('Get invites error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export const POST = withAuth(postHandler, { 
  requireAuth: true,
  rateLimit: { action: 'create_invite', limit: 10, windowMs: 60000 }
})

export const GET = withAuth(getHandler, { 
  requireAuth: true,
  rateLimit: { action: 'fetch_invites', limit: 100, windowMs: 60000 }
})