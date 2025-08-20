import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth, createAuthenticatedServerClient, AuthContext } from '@/lib/auth/auth-utils'

// Schema for quest filtering and search
const QuestFiltersSchema = z.object({
  category: z.enum(['communication', 'intimacy', 'trust', 'conflict_resolution', 'shared_activities', 'future_planning', 'appreciation', 'emotional_support']).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  duration: z.enum(['short', 'medium', 'long']).optional(), // 1-7, 8-14, 15+ days
  archetype: z.string().optional(),
  completed: z.boolean().optional(),
  search: z.string().optional()
})

// GET /api/v1/quests - Get available quests for a couple
const getHandler = async (request: NextRequest, authContext: AuthContext) => {
  try {
    const supabase = await createAuthenticatedServerClient(request)
    const { searchParams } = new URL(request.url)
    
    // Parse filters
    const filters = QuestFiltersSchema.parse({
      category: searchParams.get('category') || undefined,
      difficulty: searchParams.get('difficulty') || undefined,
      duration: searchParams.get('duration') || undefined,
      archetype: searchParams.get('archetype') || undefined,
      completed: searchParams.get('completed') === 'true',
      search: searchParams.get('search') || undefined
    })

    // Get user's couple information
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        archetype,
        couple_members!inner (
          couple_id,
          couples!inner (
            id,
            created_at,
            status
          )
        )
      `)
      .eq('user_id', authContext.user.userId)
      .single()

    if (!userProfile?.couple_members?.[0]) {
      return NextResponse.json({
        message: 'User is not in a couple',
        quests: [],
        filters: filters
      })
    }

    const coupleId = userProfile.couple_members[0].couple_id

    // Build quest query with filters
    let questQuery = supabase
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
        learning_objectives,
        estimated_time_per_day_minutes,
        prerequisites,
        tags,
        created_at
      `)
      .eq('is_published', true)

    // Apply filters
    if (filters.category) {
      questQuery = questQuery.eq('category', filters.category)
    }

    if (filters.difficulty) {
      questQuery = questQuery.eq('difficulty_level', filters.difficulty)
    }

    if (filters.duration) {
      switch (filters.duration) {
        case 'short':
          questQuery = questQuery.lte('duration_days', 7)
          break
        case 'medium':
          questQuery = questQuery.gte('duration_days', 8).lte('duration_days', 14)
          break
        case 'long':
          questQuery = questQuery.gte('duration_days', 15)
          break
      }
    }

    if (filters.search) {
      questQuery = questQuery.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,tags.cs.{${filters.search}}`)
    }

    const { data: quests, error: questsError } = await questQuery.order('created_at', { ascending: false })

    if (questsError) {
      console.error('Error fetching quests:', questsError)
      return NextResponse.json(
        { error: { code: 'FETCH_FAILED', message: 'Failed to fetch quests' } },
        { status: 500 }
      )
    }

    // Get quest progress for this couple
    const { data: questProgress } = await supabase
      .from('quest_progress')
      .select('quest_id, current_day, days_completed, completed_at, started_at')
      .eq('couple_id', coupleId)

    // Create progress map for quick lookup
    const progressMap = new Map(
      questProgress?.map(p => [p.quest_id, p]) || []
    )

    // Filter and enhance quests with availability and progress
    const availableQuests = []
    
    for (const quest of quests || []) {
      const progress: any = progressMap.get(quest.id)
      
      // Check if quest is available for this couple
      const { data: isAvailable } = await supabase
        .rpc('is_quest_available_for_couple', {
          p_quest_id: quest.id,
          p_couple_id: coupleId
        })

      // Skip if filtering by completed status
      if (filters.completed === true && !progress?.completed_at) continue
      if (filters.completed === false && progress?.completed_at) continue

      // Skip if filtering by archetype and quest doesn't match
      if (filters.archetype && quest.suitable_for_archetypes.length > 0) {
        if (!quest.suitable_for_archetypes.includes(filters.archetype)) continue
      }

      availableQuests.push({
        ...quest,
        availability: {
          available: isAvailable || false,
          reason: !isAvailable ? 'Prerequisites not met or already completed' : null
        },
        progress: progress ? {
          started: true,
          currentDay: progress.current_day,
          daysCompleted: progress.days_completed,
          completionPercentage: Math.round((progress.days_completed / quest.duration_days) * 100),
          startedAt: progress.started_at,
          completedAt: progress.completed_at,
          isCompleted: !!progress.completed_at
        } : {
          started: false,
          currentDay: 0,
          daysCompleted: 0,
          completionPercentage: 0,
          startedAt: null,
          completedAt: null,
          isCompleted: false
        }
      })
    }

    return NextResponse.json({
      quests: availableQuests,
      filters,
      totalCount: availableQuests.length,
      coupleId
    })

  } catch (error) {
    console.error('Error fetching quests:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid filters', details: error.errors } },
        { status: 400 }
      )
    }

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