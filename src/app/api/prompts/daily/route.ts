import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createAuthenticatedServerClient, AuthContext } from '@/lib/auth/auth-utils'
import { AIPromptEngine } from '@/lib/ai-services/prompt-engine'
import { CrisisDetector } from '@/lib/crisis-detection/detector'

// Cost-optimized daily prompt generation API
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as any || 'communication'
    const difficulty = searchParams.get('difficulty') as any || 'beginner'
    const forceNew = searchParams.get('force_new') === 'true'

    // Get user profile and preferences
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        first_name,
        last_name,
        archetype,
        age_range,
        subscription_tier,
        safety_monitoring_enabled
      `)
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get couple information if available
    const { data: coupleData } = await supabase
      .from('couples')
      .select('id, relationship_start_date, relationship_length_months, status')
      .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
      .eq('status', 'active')
      .single()

    // Determine relationship stage
    const relationshipStage = coupleData?.relationship_length_months 
      ? (() => {
          const months = coupleData.relationship_length_months
          if (months < 6) return 'new'
          if (months < 24) return 'established'
          return 'long_term'
        })()
      : 'single'

    // Check if user has already received a prompt today (to prevent spam)
    if (!forceNew) {
      const today = new Date().toISOString().split('T')[0]
      const { data: todayPrompt, error: promptError } = await supabase
        .from('daily_prompts')
        .select('*')
        .eq('couple_id', coupleData?.id || null)
        .eq('prompt_date', today)
        .single()

      if (!promptError && todayPrompt) {
        // Return existing prompt
        return NextResponse.json({
          prompt: {
            id: todayPrompt.id,
            promptText: todayPrompt.personalized_content || JSON.parse(todayPrompt.content as string).title,
            teachingMoment: todayPrompt.teaching_moment,
            guidedActivity: todayPrompt.guided_activity,
            promptCategory: 'relationship_growth',
            difficultyLevel: 'intermediate',
            disclaimerText: "💡 This is a wellness exercise for educational purposes only, not professional relationship advice.",
            safetyCheck: {
              hasCrisisIndicators: false,
              severity: 'none',
              requiresImmediateIntervention: false
            },
            costInfo: {
              modelUsed: todayPrompt.ai_model_used || 'cached',
              costUSD: todayPrompt.generation_cost || 0,
              budgetRemaining: 100
            },
            cacheInfo: {
              cacheHit: true
            },
            metadata: {
              personalizationLevel: 'template',
              frameworkUsed: 'Evidence-based relationship research',
              estimatedTimeMinutes: 15
            }
          },
          alreadyDelivered: true,
          completed: todayPrompt.partner_1_completed || todayPrompt.partner_2_completed
        })
      }
    }

    // Initialize AI Prompt Engine
    const promptEngine = new AIPromptEngine()

    // Build generation configuration
    const generationConfig = {
      userId: user.id,
      coupleId: coupleData?.id,
      promptCategory: category,
      difficultyLevel: difficulty,
      relationshipStage: relationshipStage as any,
      userArchetype: userProfile.archetype,
      userPreferences: {
        firstName: userProfile.first_name,
        ageRange: userProfile.age_range,
        subscriptionTier: userProfile.subscription_tier
      }
    }

    // Generate the daily prompt with cost optimization
    const result = await promptEngine.generateDailyPrompt(generationConfig)

    // Store the prompt in history for tracking
    const { error: historyError } = await supabase
      .from('daily_prompt_history')
      .insert({
        user_id: user.id,
        couple_id: coupleData?.id,
        prompt_text: result.promptText,
        prompt_category: result.promptCategory,
        difficulty_level: result.difficultyLevel,
        generation_method: result.metadata.personalizationLevel,
        personalization_level: result.metadata.personalizationLevel === 'ai_generated' ? 90 :
                                result.metadata.personalizationLevel === 'personalized' ? 60 : 30,
        cost_usd: result.costInfo.costUSD,
        safety_check_passed: !result.safetyCheck.requiresImmediateIntervention,
        safety_notes: result.safetyCheck.indicators,
        metadata: {
          frameworkUsed: result.metadata.frameworkUsed,
          estimatedTimeMinutes: result.metadata.estimatedTimeMinutes,
          cacheHit: result.cacheInfo.cacheHit,
          modelUsed: result.costInfo.modelUsed
        }
      })

    if (historyError) {
      console.error('Failed to store prompt history:', historyError)
      // Don't fail the request, just log the error
    }

    // Update user streak if this is their first prompt today
    if (!forceNew) {
      try {
        await supabase.rpc('update_user_streak', { p_user_id: user.id })
      } catch (streakError) {
        console.error('Failed to update streak:', streakError)
        // Don't fail the request
      }
    }

    return NextResponse.json({
      prompt: result,
      generatedAt: new Date().toISOString(),
      alreadyDelivered: false
    })

  } catch (error) {
    console.error('Daily prompt generation failed:', error)
    
    // Provide fallback response for system errors
    return NextResponse.json({
      prompt: {
        promptText: "Take a moment today to share something you appreciate about your partner with them. Express specifically what they did and how it made you feel.",
        promptCategory: "appreciation",
        difficultyLevel: "beginner",
        disclaimerText: "💡 This is a wellness exercise for educational purposes only, not professional relationship advice. If you're experiencing relationship difficulties, consider speaking with a licensed couples therapist.",
        safetyCheck: {
          hasCrisisIndicators: false,
          severity: 'none',
          requiresImmediateIntervention: false
        },
        costInfo: {
          modelUsed: 'fallback',
          budgetRemaining: 0
        },
        cacheInfo: {
          cacheHit: false
        },
        metadata: {
          personalizationLevel: 'template' as any,
          frameworkUsed: 'Gottman Method - Emotional Bank Account',
          estimatedTimeMinutes: 5
        }
      },
      error: 'System temporarily unavailable - showing fallback content',
      fallback: true
    }, { status: 200 }) // Still return 200 to not break user experience
  }
}

// Mark prompt as completed
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { promptId, completed, feedback, feedbackNotes } = body

    // Find the prompt in history
    const { data: promptHistory, error: findError } = await supabase
      .from('daily_prompt_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', promptId)
      .single()

    if (findError || !promptHistory) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    // Update completion status
    const { error: updateError } = await supabase
      .from('daily_prompt_history')
      .update({
        completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
        user_feedback: feedback,
        feedback_notes: feedbackNotes
      })
      .eq('id', promptHistory.id)

    if (updateError) {
      console.error('Failed to update prompt completion:', updateError)
      return NextResponse.json({ error: 'Failed to update completion status' }, { status: 500 })
    }

    // If completed, update user streak
    if (completed) {
      try {
        await supabase.rpc('update_user_streak', { p_user_id: user.id })
      } catch (streakError) {
        console.error('Failed to update streak on completion:', streakError)
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Prompt completion update failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get user's prompt progress and statistics
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's prompt statistics
    const { data: stats, error: statsError } = await supabase
      .from('daily_prompt_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (statsError) {
      console.error('Failed to get prompt stats:', statsError)
      return NextResponse.json({ error: 'Failed to get statistics' }, { status: 500 })
    }

    // Calculate statistics
    const totalPrompts = stats?.length || 0
    const completedPrompts = stats?.filter(p => p.completed).length || 0
    const currentWeekStart = new Date()
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay())
    
    const thisWeekPrompts = stats?.filter(p => 
      new Date(p.created_at) >= currentWeekStart
    ).length || 0

    const thisWeekCompleted = stats?.filter(p => 
      p.completed && new Date(p.created_at) >= currentWeekStart
    ).length || 0

    // Get current streak from progress tracking
    const { data: progressData } = await supabase
      .from('progress_tracking')
      .select('streak_count, longest_streak')
      .eq('user_id', user.id)
      .eq('metric_name', 'daily_prompt_streak')
      .single()

    // Get cost analytics
    const { data: costData } = await supabase
      .from('ai_generation_costs')
      .select('cost_usd')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

    const totalCostLast30Days = costData?.reduce((sum, record) => sum + (record.cost_usd || 0), 0) || 0

    return NextResponse.json({
      statistics: {
        totalPrompts,
        completedPrompts,
        completionRate: totalPrompts > 0 ? (completedPrompts / totalPrompts) * 100 : 0,
        currentStreak: progressData?.streak_count || 0,
        longestStreak: progressData?.longest_streak || 0,
        thisWeekPrompts,
        thisWeekCompleted,
        totalCostLast30Days: parseFloat(totalCostLast30Days.toFixed(4))
      },
      weeklyGoal: 5, // Default weekly goal
      recentPrompts: stats?.slice(0, 7) || [] // Last 7 prompts
    })

  } catch (error) {
    console.error('Failed to get prompt statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}