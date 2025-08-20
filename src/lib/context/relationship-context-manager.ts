import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

type SupabaseClient = ReturnType<typeof createClient<Database>>

export interface RelationshipContext {
  couple_id: string
  interaction_history: Array<{
    timestamp: string
    user_id: string
    message: string
    context: 'assessment' | 'guidance' | 'crisis' | 'general'
    ai_response?: any
    safety_level?: string
    framework_used?: string
  }>
  assessment_history: Array<{
    timestamp: string
    type: string
    scores: Record<string, number>
    insights: string[]
    recommendations: string[]
  }>
  patterns: {
    communication_style: string[]
    conflict_resolution: string[]
    emotional_patterns: string[]
    growth_areas: string[]
    strengths: string[]
  }
  preferences: {
    preferred_framework: 'gottman' | 'eft' | 'attachment' | 'communication' | 'auto'
    privacy_level: 'minimal' | 'standard' | 'detailed'
    reminder_frequency: 'daily' | 'weekly' | 'monthly' | 'never'
  }
  safety_context: {
    last_crisis_check: string
    historical_indicators: Array<{
      timestamp: string
      severity: string
      indicators: string[]
      resolved: boolean
    }>
    safe_words: string[]
    emergency_contacts: Array<{
      name: string
      relationship: string
      phone: string
    }>
  }
  wellness_metrics: {
    relationship_satisfaction_trend: number[]
    communication_improvement: number[]
    conflict_frequency: number[]
    positive_interaction_ratio: number[]
  }
  created_at: string
  updated_at: string
  ttl_hours?: number
}

export class RelationshipContextManager {
  private supabase: SupabaseClient
  private memoryCache: Map<string, RelationshipContext> = new Map()
  private cacheTimeouts: Map<string, NodeJS.Timeout> = new Map()

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async getContext(coupleId: string): Promise<RelationshipContext | null> {
    try {
      // Check memory cache first
      if (this.memoryCache.has(coupleId)) {
        return this.memoryCache.get(coupleId)!
      }

      // Fetch from Supabase
      const { data, error } = await this.supabase
        .from('relationship_contexts')
        .select('*')
        .eq('couple_id', coupleId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching relationship context:', error)
        return null
      }

      if (!data) {
        // Create new context for new couples
        return this.createNewContext(coupleId)
      }

      const context = this.parseContextData(data)
      this.setCacheWithTTL(coupleId, context)

      return context
    } catch (error) {
      console.error('Failed to get relationship context:', error)
      return null
    }
  }

  async updateContext(
    coupleId: string, 
    updates: Partial<RelationshipContext>
  ): Promise<boolean> {
    try {
      const existingContext = await this.getContext(coupleId) || 
                              await this.createNewContext(coupleId)

      const updatedContext: RelationshipContext = {
        ...existingContext,
        ...updates,
        couple_id: coupleId,
        updated_at: new Date().toISOString()
      }

      // Update Supabase
      const { error } = await this.supabase
        .from('relationship_contexts')
        .upsert({
          couple_id: coupleId,
          context_data: updatedContext,
          updated_at: updatedContext.updated_at
        })

      if (error) {
        console.error('Error updating relationship context:', error)
        return false
      }

      // Update cache
      this.setCacheWithTTL(coupleId, updatedContext)

      return true
    } catch (error) {
      console.error('Failed to update relationship context:', error)
      return false
    }
  }

  async addInteraction(
    coupleId: string,
    userId: string,
    message: string,
    context: 'assessment' | 'guidance' | 'crisis' | 'general',
    aiResponse?: any,
    safetyLevel?: string,
    frameworkUsed?: string
  ): Promise<boolean> {
    try {
      const relationshipContext = await this.getContext(coupleId)
      if (!relationshipContext) {
        console.error('Failed to get relationship context for interaction')
        return false
      }

      const interaction = {
        timestamp: new Date().toISOString(),
        user_id: userId,
        message,
        context,
        ai_response: aiResponse,
        safety_level: safetyLevel,
        framework_used: frameworkUsed
      }

      const updatedHistory = [
        ...relationshipContext.interaction_history,
        interaction
      ].slice(-50) // Keep last 50 interactions

      // Update patterns based on interaction
      const updatedPatterns = this.analyzeInteractionPatterns(
        updatedHistory, 
        relationshipContext.patterns
      )

      return await this.updateContext(coupleId, {
        interaction_history: updatedHistory,
        patterns: updatedPatterns
      })
    } catch (error) {
      console.error('Failed to add interaction:', error)
      return false
    }
  }

  async addAssessment(
    coupleId: string,
    type: string,
    scores: Record<string, number>,
    insights: string[],
    recommendations: string[]
  ): Promise<boolean> {
    try {
      const context = await this.getContext(coupleId)
      if (!context) return false

      const assessment = {
        timestamp: new Date().toISOString(),
        type,
        scores,
        insights,
        recommendations
      }

      const updatedHistory = [
        ...context.assessment_history,
        assessment
      ].slice(-20) // Keep last 20 assessments

      // Update wellness metrics
      const updatedMetrics = this.updateWellnessMetrics(
        context.wellness_metrics,
        scores
      )

      return await this.updateContext(coupleId, {
        assessment_history: updatedHistory,
        wellness_metrics: updatedMetrics
      })
    } catch (error) {
      console.error('Failed to add assessment:', error)
      return false
    }
  }

  async recordSafetyEvent(
    coupleId: string,
    severity: string,
    indicators: string[],
    resolved: boolean = false
  ): Promise<boolean> {
    try {
      const context = await this.getContext(coupleId)
      if (!context) return false

      const safetyEvent = {
        timestamp: new Date().toISOString(),
        severity,
        indicators,
        resolved
      }

      const updatedSafetyContext = {
        ...context.safety_context,
        last_crisis_check: new Date().toISOString(),
        historical_indicators: [
          ...context.safety_context.historical_indicators,
          safetyEvent
        ].slice(-10) // Keep last 10 safety events
      }

      return await this.updateContext(coupleId, {
        safety_context: updatedSafetyContext
      })
    } catch (error) {
      console.error('Failed to record safety event:', error)
      return false
    }
  }

  async getRecentPatterns(coupleId: string, days: number = 30): Promise<{
    communicationTrends: string[]
    emotionalPatterns: string[]
    conflictFrequency: number
    positiveInteractionRatio: number
  } | null> {
    try {
      const context = await this.getContext(coupleId)
      if (!context) return null

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const recentInteractions = context.interaction_history.filter(
        interaction => new Date(interaction.timestamp) > cutoffDate
      )

      return {
        communicationTrends: this.analyzeCommunicationTrends(recentInteractions),
        emotionalPatterns: this.analyzeEmotionalPatterns(recentInteractions),
        conflictFrequency: this.calculateConflictFrequency(recentInteractions),
        positiveInteractionRatio: this.calculatePositiveRatio(recentInteractions)
      }
    } catch (error) {
      console.error('Failed to get recent patterns:', error)
      return null
    }
  }

  async clearContext(coupleId: string): Promise<boolean> {
    try {
      // Remove from cache
      this.memoryCache.delete(coupleId)
      const timeout = this.cacheTimeouts.get(coupleId)
      if (timeout) {
        clearTimeout(timeout)
        this.cacheTimeouts.delete(coupleId)
      }

      // Remove from Supabase
      const { error } = await this.supabase
        .from('relationship_contexts')
        .delete()
        .eq('couple_id', coupleId)

      if (error) {
        console.error('Error clearing relationship context:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to clear context:', error)
      return false
    }
  }

  private createNewContext(coupleId: string): RelationshipContext {
    return {
      couple_id: coupleId,
      interaction_history: [],
      assessment_history: [],
      patterns: {
        communication_style: [],
        conflict_resolution: [],
        emotional_patterns: [],
        growth_areas: [],
        strengths: []
      },
      preferences: {
        preferred_framework: 'auto',
        privacy_level: 'standard',
        reminder_frequency: 'weekly'
      },
      safety_context: {
        last_crisis_check: new Date().toISOString(),
        historical_indicators: [],
        safe_words: [],
        emergency_contacts: []
      },
      wellness_metrics: {
        relationship_satisfaction_trend: [],
        communication_improvement: [],
        conflict_frequency: [],
        positive_interaction_ratio: []
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ttl_hours: 168 // 7 days default
    }
  }

  private parseContextData(data: any): RelationshipContext {
    // Parse the context_data JSON field from Supabase
    if (typeof data.context_data === 'string') {
      return JSON.parse(data.context_data)
    }
    return data.context_data
  }

  private setCacheWithTTL(coupleId: string, context: RelationshipContext): void {
    this.memoryCache.set(coupleId, context)

    // Clear existing timeout
    const existingTimeout = this.cacheTimeouts.get(coupleId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new timeout (default 1 hour)
    const ttlMs = (context.ttl_hours || 1) * 60 * 60 * 1000
    const timeout = setTimeout(() => {
      this.memoryCache.delete(coupleId)
      this.cacheTimeouts.delete(coupleId)
    }, ttlMs)

    this.cacheTimeouts.set(coupleId, timeout)
  }

  private analyzeInteractionPatterns(
    interactions: any[], 
    currentPatterns: RelationshipContext['patterns']
  ): RelationshipContext['patterns'] {
    // Simple pattern analysis - in production this would be more sophisticated
    const recentInteractions = interactions.slice(-10)
    
    const communicationStyles = recentInteractions
      .filter(i => i.framework_used)
      .map(i => i.framework_used)

    const emotionalPatterns = recentInteractions
      .filter(i => i.context === 'crisis' || i.safety_level !== 'safe')
      .map(i => i.safety_level || 'emotional_distress')

    return {
      ...currentPatterns,
      communication_style: [...new Set([
        ...currentPatterns.communication_style,
        ...communicationStyles
      ])].slice(-5),
      emotional_patterns: [...new Set([
        ...currentPatterns.emotional_patterns,
        ...emotionalPatterns
      ])].slice(-5)
    }
  }

  private updateWellnessMetrics(
    currentMetrics: RelationshipContext['wellness_metrics'],
    newScores: Record<string, number>
  ): RelationshipContext['wellness_metrics'] {
    const satisfaction = newScores.relationship_satisfaction || 
                        newScores.overall_satisfaction || 7

    return {
      relationship_satisfaction_trend: [
        ...currentMetrics.relationship_satisfaction_trend,
        satisfaction
      ].slice(-20),
      communication_improvement: [
        ...currentMetrics.communication_improvement,
        newScores.communication || 7
      ].slice(-20),
      conflict_frequency: currentMetrics.conflict_frequency,
      positive_interaction_ratio: currentMetrics.positive_interaction_ratio
    }
  }

  private analyzeCommunicationTrends(interactions: any[]): string[] {
    // Analyze communication patterns from recent interactions
    const frameworks = interactions
      .filter(i => i.framework_used)
      .map(i => i.framework_used)

    const frequency = frameworks.reduce((acc, framework) => {
      acc[framework] = (acc[framework] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([framework]) => framework)
  }

  private analyzeEmotionalPatterns(interactions: any[]): string[] {
    const emotions = interactions
      .filter(i => i.safety_level && i.safety_level !== 'safe')
      .map(i => i.safety_level)

    return [...new Set(emotions)].slice(-5)
  }

  private calculateConflictFrequency(interactions: any[]): number {
    const conflicts = interactions.filter(i => 
      i.message.toLowerCase().includes('conflict') ||
      i.message.toLowerCase().includes('argument') ||
      i.message.toLowerCase().includes('fight')
    )

    return conflicts.length / Math.max(interactions.length, 1)
  }

  private calculatePositiveRatio(interactions: any[]): number {
    const positiveWords = ['love', 'appreciate', 'grateful', 'happy', 'good', 'better']
    const negativeWords = ['angry', 'frustrated', 'hurt', 'sad', 'upset', 'mad']

    let positiveCount = 0
    let negativeCount = 0

    interactions.forEach(interaction => {
      const message = interaction.message.toLowerCase()
      
      positiveWords.forEach(word => {
        if (message.includes(word)) positiveCount++
      })
      
      negativeWords.forEach(word => {
        if (message.includes(word)) negativeCount++
      })
    })

    if (negativeCount === 0) return positiveCount > 0 ? 1 : 0.5
    return positiveCount / (positiveCount + negativeCount)
  }
}

// Factory function to create context manager with Supabase client
export function createRelationshipContextManager(): RelationshipContextManager {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)
  return new RelationshipContextManager(supabase)
}

// Global instance for use across the application
let globalContextManager: RelationshipContextManager | null = null

export function getGlobalContextManager(): RelationshipContextManager {
  if (!globalContextManager) {
    globalContextManager = createRelationshipContextManager()
  }
  return globalContextManager
}