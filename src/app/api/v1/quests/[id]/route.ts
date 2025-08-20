import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createAuthenticatedServerClient, AuthContext } from '@/lib/auth/auth-utils'

// GET /api/v1/quests/[id] - Get detailed quest information
const getHandler = async (request: NextRequest, authContext: AuthContext) => {
  try {
    const supabase = await createAuthenticatedServerClient(request)
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const questId = pathSegments[pathSegments.length - 1]
    const { searchParams } = new URL(request.url)
    const includeContent = searchParams.get('includeContent') !== 'false' // Default to true

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(questId)) {
      return NextResponse.json(
        { error: { code: 'INVALID_ID', message: 'Invalid quest ID format' } },
        { status: 400 }
      )
    }

    // Get user's couple information
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        couple_members (
          couple_id,
          couples (
            id,
            created_at,
            status
          )
        )
      `)
      .eq('user_id', authContext.user.userId)
      .single()

    const coupleId = userProfile?.couple_members?.[0]?.couple_id

    // Get quest details
    const { data: quest, error: questError } = await supabase
      .from('connection_quests')
      .select(`
        id,
        title,
        description,
        slug,
        duration_days,
        difficulty_level,
        category,
        suitable_for_archetypes,
        minimum_relationship_length_months,
        requires_both_partners,
        content,
        evidence_base,
        learning_objectives,
        estimated_time_per_day_minutes,
        prerequisites,
        tags,
        created_at,
        publish_date
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

    // Check availability for the user's couple (if they have one)
    let availability = { available: true, reason: null as string | null }
    let progress = null

    if (coupleId) {
      // Check if quest is available for this couple
      const { data: isAvailable, error: availabilityError } = await supabase
        .rpc('is_quest_available_for_couple', {
          p_quest_id: questId,
          p_couple_id: coupleId
        })

      if (!availabilityError && isAvailable !== null) {
        availability = {
          available: isAvailable,
          reason: !isAvailable ? 'Prerequisites not met or already completed' : null
        }
      }

      // Get progress if exists
      const { data: questProgress } = await supabase
        .from('quest_progress')
        .select(`
          id,
          current_day,
          days_completed,
          started_at,
          last_activity_at,
          completed_at,
          completion_rating,
          completion_feedback,
          difficulty_adjustment
        `)
        .eq('couple_id', coupleId)
        .eq('quest_id', questId)
        .single()

      if (questProgress) {
        progress = {
          id: questProgress.id,
          started: true,
          currentDay: questProgress.current_day,
          daysCompleted: questProgress.days_completed,
          completionPercentage: Math.round((questProgress.days_completed / quest.duration_days) * 100),
          startedAt: questProgress.started_at,
          lastActivityAt: questProgress.last_activity_at,
          completedAt: questProgress.completed_at,
          completionRating: questProgress.completion_rating,
          completionFeedback: questProgress.completion_feedback,
          difficultyAdjustment: questProgress.difficulty_adjustment,
          isCompleted: !!questProgress.completed_at
        }
      }
    }

    // Get prerequisite quest details if any
    let prerequisiteQuests: Array<{id: string, title: string, slug: string}> = []
    if (quest.prerequisites && quest.prerequisites.length > 0) {
      const { data: prereqQuests } = await supabase
        .from('connection_quests')
        .select('id, title, slug')
        .in('id', quest.prerequisites)
        .eq('is_published', true)

      prerequisiteQuests = prereqQuests || []
    }

    // Prepare response
    const response: any = {
      id: quest.id,
      title: quest.title,
      description: quest.description,
      slug: quest.slug,
      durationDays: quest.duration_days,
      difficultyLevel: quest.difficulty_level,
      category: quest.category,
      suitableForArchetypes: quest.suitable_for_archetypes,
      minimumRelationshipLengthMonths: quest.minimum_relationship_length_months,
      requiresBothPartners: quest.requires_both_partners,
      evidenceBase: quest.evidence_base,
      learningObjectives: quest.learning_objectives,
      estimatedTimePerDayMinutes: quest.estimated_time_per_day_minutes,
      prerequisites: prerequisiteQuests,
      tags: quest.tags,
      publishDate: quest.publish_date,
      availability,
      progress: progress || {
        started: false,
        currentDay: 0,
        daysCompleted: 0,
        completionPercentage: 0,
        startedAt: null,
        lastActivityAt: null,
        completedAt: null,
        isCompleted: false
      }
    }

    // Include full content if requested and user has access
    if (includeContent && (availability.available || progress?.started)) {
      response.content = quest.content
      
      // Include current day activity if in progress
      if (progress?.started && !progress.isCompleted && quest.content?.days) {
        const currentDayActivity = quest.content.days.find((day: any) => day.day === progress.currentDay)
        response.currentActivity = currentDayActivity || null
        
        // Include next day preview if available
        const nextDayActivity = quest.content.days.find((day: any) => day.day === progress.currentDay + 1)
        response.nextActivity = nextDayActivity || null
      }
    } else if (!includeContent) {
      // Provide just basic content structure without full details
      response.contentPreview = {
        totalDays: quest.content?.days?.length || quest.duration_days,
        hasStructuredActivities: !!(quest.content?.days && quest.content.days.length > 0),
        sampleDay: quest.content?.days?.[0] ? {
          day: quest.content.days[0].day,
          title: quest.content.days[0].title
        } : null
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching quest details:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getHandler, { 
  requireAuth: true,
  rateLimit: { action: 'api_general', limit: 100, windowMs: 3600000 }
})