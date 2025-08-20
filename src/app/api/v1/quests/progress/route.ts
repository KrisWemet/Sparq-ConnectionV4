import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, createAuthenticatedServerClient, AuthContext } from '@/lib/auth/auth-utils'

// Schema for completing a quest day
const CompleteQuestDaySchema = z.object({
  progressId: z.string().uuid('Invalid progress ID'),
  dayNumber: z.number().min(1).max(30),
  completionData: z.record(z.any()).optional(), // Flexible data structure for answers/reflections
  timeSpentMinutes: z.number().min(1).max(240).optional(),
  sharedReflection: z.string().max(500).optional(),
  visibility: z.enum(['private', 'partner_only', 'shared_summary']).default('partner_only'),
  helpfulnessRating: z.number().min(1).max(5).optional(),
  engagementScore: z.number().min(0).max(1).optional()
})

// Schema for quest completion
const CompleteQuestSchema = z.object({
  progressId: z.string().uuid('Invalid progress ID'),
  completionRating: z.number().min(1).max(5),
  completionFeedback: z.string().max(1000).optional()
})

// GET /api/v1/quests/progress - Get current quest progress for user's couple
const getHandler = async (request: NextRequest, authContext: AuthContext) => {
  try {
    const supabase = await createAuthenticatedServerClient(request)
    const { searchParams } = new URL(request.url)
    const questId = searchParams.get('questId')
    const includeDetails = searchParams.get('includeDetails') === 'true'

    // Get user's couple information
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        couple_members!inner (couple_id)
      `)
      .eq('user_id', authContext.user.userId)
      .single()

    if (!userProfile?.couple_members?.[0]) {
      return NextResponse.json({
        message: 'User is not in a couple',
        progress: []
      })
    }

    const coupleId = userProfile.couple_members[0].couple_id

    // Build progress query
    let progressQuery = supabase
      .from('quest_progress')
      .select(`
        id,
        quest_id,
        current_day,
        days_completed,
        started_at,
        last_activity_at,
        completed_at,
        completion_rating,
        completion_feedback,
        difficulty_adjustment,
        partner1_participation_score,
        partner2_participation_score,
        connection_quests!inner (
          id,
          title,
          slug,
          description,
          duration_days,
          difficulty_level,
          category,
          estimated_time_per_day_minutes
        )
      `)
      .eq('couple_id', coupleId)

    if (questId) {
      progressQuery = progressQuery.eq('quest_id', questId)
    }

    progressQuery = progressQuery.order('started_at', { ascending: false })

    const { data: progressData, error: progressError } = await progressQuery

    if (progressError) {
      console.error('Error fetching quest progress:', progressError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch progress' } },
        { status: 500 }
      )
    }

    // If including details, get daily completions
    const enhancedProgress = []
    
    for (const progress of progressData || []) {
      let dayCompletions: any[] = []
      
      if (includeDetails) {
        const { data: completions } = await supabase
          .from('quest_day_completions')
          .select(`
            id,
            day_number,
            completed_by_user_id,
            completion_data,
            time_spent_minutes,
            shared_reflection,
            visibility,
            engagement_score,
            helpfulness_rating,
            completed_at,
            user_profiles!quest_day_completions_completed_by_user_id_fkey (
              display_name
            )
          `)
          .eq('progress_id', progress.id)
          .order('day_number', { ascending: true })

        dayCompletions = completions || []
      }

      const questData = Array.isArray(progress.connection_quests) ? progress.connection_quests[0] : progress.connection_quests
      const completionPercentage = Math.round(
        (progress.days_completed / questData.duration_days) * 100
      )

      enhancedProgress.push({
        id: progress.id,
        questId: progress.quest_id,
        quest: {
          id: questData.id,
          title: questData.title,
          slug: questData.slug,
          description: questData.description,
          durationDays: questData.duration_days,
          difficultyLevel: questData.difficulty_level,
          category: questData.category,
          estimatedTimePerDayMinutes: questData.estimated_time_per_day_minutes
        },
        currentDay: progress.current_day,
        daysCompleted: progress.days_completed,
        completionPercentage,
        startedAt: progress.started_at,
        lastActivityAt: progress.last_activity_at,
        completedAt: progress.completed_at,
        completionRating: progress.completion_rating,
        completionFeedback: progress.completion_feedback,
        difficultyAdjustment: progress.difficulty_adjustment,
        participationScores: {
          partner1: progress.partner1_participation_score,
          partner2: progress.partner2_participation_score
        },
        isCompleted: !!progress.completed_at,
        dailyCompletions: dayCompletions
      })
    }

    return NextResponse.json({
      progress: enhancedProgress,
      coupleId
    })

  } catch (error) {
    console.error('Error fetching quest progress:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

// POST /api/v1/quests/progress - Complete a quest day or entire quest
const postHandler = async (request: NextRequest, authContext: AuthContext) => {
  try {
    const supabase = await createAuthenticatedServerClient(request)
    const body = await request.json()
    
    // Determine if completing a day or entire quest
    if ('dayNumber' in body) {
      return await completeQuestDay(supabase, authContext, body)
    } else if ('completionRating' in body) {
      return await completeQuest(supabase, authContext, body)
    } else {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request: specify either dayNumber or completionRating' } },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error processing quest progress:', error)
    
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

// Complete a single day of a quest
async function completeQuestDay(supabase: any, authContext: AuthContext, body: any) {
  const {
    progressId,
    dayNumber,
    completionData,
    timeSpentMinutes,
    sharedReflection,
    visibility,
    helpfulnessRating,
    engagementScore
  } = CompleteQuestDaySchema.parse(body)

  // Verify progress belongs to user's couple
  const { data: progress, error: progressError } = await supabase
    .from('quest_progress')
    .select(`
      id,
      couple_id,
      quest_id,
      current_day,
      connection_quests!inner (duration_days),
      couple_members!quest_progress_couple_id_fkey!inner (
        user_id
      )
    `)
    .eq('id', progressId)
    .single()

  if (progressError || !progress) {
    return NextResponse.json(
      { error: { code: 'PROGRESS_NOT_FOUND', message: 'Quest progress not found' } },
      { status: 404 }
    )
  }

  // Verify user is part of this couple
  const userInCouple = progress.couple_members.some((member: any) => member.user_id === authContext.user.userId)
  if (!userInCouple) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'User not authorized to complete this quest' } },
      { status: 403 }
    )
  }

  // Verify day number is valid
  if (dayNumber > progress.connection_quests.duration_days) {
    return NextResponse.json(
      { error: { code: 'INVALID_DAY', message: 'Invalid day number for this quest' } },
      { status: 400 }
    )
  }

  // Check if day is already completed by this user
  const { data: existingCompletion } = await supabase
    .from('quest_day_completions')
    .select('id')
    .eq('progress_id', progressId)
    .eq('day_number', dayNumber)
    .eq('completed_by_user_id', authContext.user.userId)
    .single()

  if (existingCompletion) {
    return NextResponse.json(
      { error: { code: 'DAY_ALREADY_COMPLETED', message: 'Day already completed by this user' } },
      { status: 400 }
    )
  }

  // Create day completion record
  const { data: dayCompletion, error: completionError } = await supabase
    .from('quest_day_completions')
    .insert({
      progress_id: progressId,
      day_number: dayNumber,
      completed_by_user_id: authContext.user.userId,
      completion_data: completionData,
      time_spent_minutes: timeSpentMinutes,
      shared_reflection: sharedReflection,
      visibility,
      engagement_score: engagementScore,
      helpfulness_rating: helpfulnessRating,
      completed_at: new Date().toISOString()
    })
    .select('id, completed_at')
    .single()

  if (completionError) {
    console.error('Error creating day completion:', completionError)
    return NextResponse.json(
      { error: { code: 'COMPLETION_FAILED', message: 'Failed to complete quest day' } },
      { status: 500 }
    )
  }

  // Update quest progress will be handled by trigger

  // Log analytics event
  await supabase
    .from('user_analytics_events')
    .insert({
      user_id: authContext.user.userId,
      event_type: 'quest_day_completed',
      event_data: {
        progress_id: progressId,
        quest_id: progress.quest_id,
        day_number: dayNumber,
        time_spent_minutes: timeSpentMinutes,
        helpfulness_rating: helpfulnessRating,
        engagement_score: engagementScore
      },
      created_at: new Date().toISOString()
    })

  return NextResponse.json({
    message: 'Quest day completed successfully',
    completion: {
      id: dayCompletion.id,
      dayNumber,
      completedAt: dayCompletion.completed_at
    }
  }, { status: 201 })
}

// Complete an entire quest
async function completeQuest(supabase: any, authContext: AuthContext, body: any) {
  const { progressId, completionRating, completionFeedback } = CompleteQuestSchema.parse(body)

  // Verify progress and check if quest can be completed
  const { data: progress, error: progressError } = await supabase
    .from('quest_progress')
    .select(`
      id,
      couple_id,
      quest_id,
      days_completed,
      completed_at,
      connection_quests!inner (duration_days),
      couple_members!quest_progress_couple_id_fkey!inner (user_id)
    `)
    .eq('id', progressId)
    .single()

  if (progressError || !progress) {
    return NextResponse.json(
      { error: { code: 'PROGRESS_NOT_FOUND', message: 'Quest progress not found' } },
      { status: 404 }
    )
  }

  // Verify user is part of this couple
  const userInCouple = progress.couple_members.some((member: any) => member.user_id === authContext.user.userId)
  if (!userInCouple) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'User not authorized to complete this quest' } },
      { status: 403 }
    )
  }

  // Check if quest is already completed
  if (progress.completed_at) {
    return NextResponse.json(
      { error: { code: 'ALREADY_COMPLETED', message: 'Quest is already completed' } },
      { status: 400 }
    )
  }

  // Check if enough days are completed (at least 80% or all days)
  const completionThreshold = Math.max(1, Math.floor(progress.connection_quests.duration_days * 0.8))
  if (progress.days_completed < completionThreshold) {
    return NextResponse.json(
      { error: { 
        code: 'INSUFFICIENT_PROGRESS', 
        message: `At least ${completionThreshold} days must be completed to finish this quest` 
      } },
      { status: 400 }
    )
  }

  // Update quest progress to completed
  const { error: updateError } = await supabase
    .from('quest_progress')
    .update({
      completed_at: new Date().toISOString(),
      completion_rating: completionRating,
      completion_feedback: completionFeedback
    })
    .eq('id', progressId)

  if (updateError) {
    console.error('Error completing quest:', updateError)
    return NextResponse.json(
      { error: { code: 'COMPLETION_FAILED', message: 'Failed to complete quest' } },
      { status: 500 }
    )
  }

  // Log analytics event
  await supabase
    .from('user_analytics_events')
    .insert({
      user_id: authContext.user.userId,
      event_type: 'quest_completed',
      event_data: {
        progress_id: progressId,
        quest_id: progress.quest_id,
        completion_rating: completionRating,
        days_completed: progress.days_completed,
        total_days: progress.connection_quests.duration_days
      },
      created_at: new Date().toISOString()
    })

  return NextResponse.json({
    message: 'Quest completed successfully',
    completedAt: new Date().toISOString(),
    completionRating
  })
}

export const GET = withAuth(getHandler, { 
  requireAuth: true,
  rateLimit: { action: 'api_general', limit: 100, windowMs: 3600000 }
})

export const POST = withAuth(postHandler, { 
  requireAuth: true,
  rateLimit: { action: 'api_general', limit: 50, windowMs: 3600000 }
})