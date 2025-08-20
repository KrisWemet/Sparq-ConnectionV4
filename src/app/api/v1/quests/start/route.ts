import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, createAuthenticatedServerClient, AuthContext } from '@/lib/auth/auth-utils'

// Schema for starting a quest
const StartQuestSchema = z.object({
  questId: z.string().uuid('Invalid quest ID'),
  difficultyAdjustment: z.enum(['easier', 'same', 'harder']).optional().default('same')
})

// POST /api/v1/quests/start - Start a new quest for a couple
const startHandler = async (request: NextRequest, authContext: AuthContext) => {
  try {
    const supabase = await createAuthenticatedServerClient(request)
    const body = await request.json()
    const { questId, difficultyAdjustment } = StartQuestSchema.parse(body)

    // Get user's couple information
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        couple_members!inner (
          couple_id,
          couples!inner (
            id,
            status
          )
        )
      `)
      .eq('user_id', authContext.user.userId)
      .single()

    if (profileError || !userProfile?.couple_members?.[0]) {
      return NextResponse.json(
        { error: { code: 'NOT_IN_COUPLE', message: 'User is not in an active couple' } },
        { status: 400 }
      )
    }

    const coupleId = userProfile.couple_members[0].couple_id

    // Verify quest exists and is published
    const { data: quest, error: questError } = await supabase
      .from('connection_quests')
      .select(`
        id,
        title,
        slug,
        duration_days,
        difficulty_level,
        category,
        content,
        requires_both_partners,
        prerequisites
      `)
      .eq('id', questId)
      .eq('is_published', true)
      .single()

    if (questError || !quest) {
      return NextResponse.json(
        { error: { code: 'QUEST_NOT_FOUND', message: 'Quest not found or not available' } },
        { status: 404 }
      )
    }

    // Check if quest is available for this couple
    const { data: isAvailable, error: availabilityError } = await supabase
      .rpc('is_quest_available_for_couple', {
        p_quest_id: questId,
        p_couple_id: coupleId
      })

    if (availabilityError || !isAvailable) {
      return NextResponse.json(
        { error: { code: 'QUEST_NOT_AVAILABLE', message: 'Quest is not available for this couple' } },
        { status: 400 }
      )
    }

    // Check if quest is already in progress or completed
    const { data: existingProgress } = await supabase
      .from('quest_progress')
      .select('id, completed_at, started_at')
      .eq('couple_id', coupleId)
      .eq('quest_id', questId)
      .single()

    if (existingProgress) {
      if (existingProgress.completed_at) {
        return NextResponse.json(
          { error: { code: 'QUEST_ALREADY_COMPLETED', message: 'Quest has already been completed' } },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: { code: 'QUEST_IN_PROGRESS', message: 'Quest is already in progress' } },
          { status: 400 }
        )
      }
    }

    // Create quest progress record
    const { data: questProgress, error: progressError } = await supabase
      .from('quest_progress')
      .insert({
        couple_id: coupleId,
        quest_id: questId,
        current_day: 1,
        days_completed: 0,
        difficulty_adjustment: difficultyAdjustment,
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .select(`
        id,
        current_day,
        days_completed,
        started_at,
        last_activity_at
      `)
      .single()

    if (progressError) {
      console.error('Error creating quest progress:', progressError)
      return NextResponse.json(
        { error: { code: 'START_FAILED', message: 'Failed to start quest' } },
        { status: 500 }
      )
    }

    // Log the quest start for analytics
    await supabase
      .from('user_analytics_events')
      .insert({
        user_id: authContext.user.userId,
        event_type: 'quest_started',
        event_data: {
          quest_id: questId,
          quest_title: quest.title,
          quest_category: quest.category,
          difficulty_level: quest.difficulty_level,
          duration_days: quest.duration_days,
          difficulty_adjustment: difficultyAdjustment
        },
        session_id: null, // Will be set by RLS if available
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    // Return quest progress with first day content
    const firstDayContent = quest.content?.days?.[0] || null

    return NextResponse.json({
      message: 'Quest started successfully',
      progress: {
        id: questProgress.id,
        questId: quest.id,
        questTitle: quest.title,
        questSlug: quest.slug,
        currentDay: questProgress.current_day,
        daysCompleted: questProgress.days_completed,
        totalDays: quest.duration_days,
        completionPercentage: 0,
        startedAt: questProgress.started_at,
        lastActivityAt: questProgress.last_activity_at,
        difficultyAdjustment
      },
      nextActivity: firstDayContent ? {
        day: firstDayContent.day,
        title: firstDayContent.title,
        activity: firstDayContent.activity,
        estimatedTimeMinutes: quest.estimated_time_per_day_minutes || 15
      } : null
    }, { status: 201 })

  } catch (error) {
    console.error('Error starting quest:', error)
    
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

export const POST = withAuth(startHandler, { 
  requireAuth: true,
  rateLimit: { action: 'api_general', limit: 20, windowMs: 3600000 }
})