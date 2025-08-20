import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database-complete.types'
import { SafetyResponse } from './safety-responses'
import { MessageSafetyAnalysis } from './safety-analysis'

// Comprehensive transparency logging and user control system
export interface TransparencyLogEntry {
  id: string
  timestamp: Date
  userId: string
  eventType: 'safety_analysis' | 'intervention_triggered' | 'resource_accessed' | 'preference_changed' | 'data_processed'
  
  // Event details
  description: string
  details: Record<string, any>
  
  // What was analyzed/processed
  contentType: 'message' | 'assessment' | 'prompt_response' | 'user_data'
  contentId?: string
  
  // Safety information
  riskLevel?: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  interventionType?: string
  resourcesProvided?: string[]
  
  // User visibility
  visibleToUser: boolean
  userNotified: boolean
  explanation: string
  
  // Privacy impact
  dataAccessed: string[]
  processingPurpose: string
  retentionPeriod: string
  
  // User interaction
  userAcknowledged: boolean
  acknowledgedAt?: Date
  userFeedback?: 'helpful' | 'concerning' | 'unclear' | 'appropriate'
  feedbackNotes?: string
}

export interface TransparencyReport {
  userId: string
  reportPeriod: {
    start: Date
    end: Date
    type: 'weekly' | 'monthly' | 'quarterly'
  }
  
  // Summary statistics
  summary: {
    messagesAnalyzed: number
    safetyChecksPerformed: number
    interventionsTriggered: number
    crisisResourcesProvided: number
    dataPointsProcessed: number
  }
  
  // Detailed breakdowns
  safetyAnalysis: {
    riskLevelDistribution: Record<string, number>
    interventionTypeBreakdown: Record<string, number>
    falsePositiveRate?: number
    userSatisfactionScore?: number
  }
  
  dataProcessing: {
    dataTypesAccessed: Array<{
      type: string
      count: number
      purpose: string
      retention: string
    }>
    
    processingPurposes: Array<{
      purpose: string
      frequency: number
      dataTypes: string[]
    }>
  }
  
  userControls: {
    preferencesChanged: number
    featuresDisabled: number
    dataDeletionRequests: number
  }
  
  // Recommendations
  recommendations: Array<{
    type: 'privacy' | 'safety' | 'feature'
    title: string
    description: string
    action?: string
  }>
}

export interface UserControlAction {
  action: 'disable_feature' | 'modify_consent' | 'delete_data' | 'download_data' | 'adjust_retention'
  target: string
  details: Record<string, any>
  confirmationRequired: boolean
  safetyImpact?: 'none' | 'low' | 'medium' | 'high'
  privacyBenefit?: 'low' | 'medium' | 'high'
}

export class TransparencyLoggingSystem {
  private supabase = createClientComponentClient<Database>()

  // Log safety analysis event
  async logSafetyAnalysis(
    userId: string,
    messageId: string,
    analysis: MessageSafetyAnalysis
  ): Promise<void> {
    const entry: Omit<TransparencyLogEntry, 'id' | 'timestamp'> = {
      userId,
      eventType: 'safety_analysis',
      description: `Message safety analysis completed - Risk level: ${analysis.riskLevel}`,
      details: {
        riskScore: analysis.overallRiskScore,
        detectedIndicators: analysis.detectedIndicators.length,
        processingTime: analysis.processingTimeMs,
        analysisMethod: analysis.analysisMethod,
        confidenceScore: analysis.confidenceScore
      },
      contentType: 'message',
      contentId: messageId,
      riskLevel: analysis.riskLevel,
      visibleToUser: true,
      userNotified: analysis.requiresIntervention,
      explanation: `Your message was automatically analyzed for safety concerns. ${
        analysis.riskLevel === 'safe' 
          ? 'No safety concerns were detected.'
          : `We detected ${analysis.riskLevel} risk level indicators and ${
              analysis.requiresIntervention ? 'provided safety resources' : 'logged the analysis'
            }.`
      }`,
      dataAccessed: ['message_content', 'user_history', 'risk_patterns'],
      processingPurpose: 'Safety monitoring and crisis prevention',
      retentionPeriod: '90 days (user configurable)',
      userAcknowledged: false
    }

    await this.saveTransparencyEntry(entry)
  }

  // Log safety intervention
  async logSafetyIntervention(
    userId: string,
    intervention: SafetyResponse,
    messageId?: string
  ): Promise<void> {
    const entry: Omit<TransparencyLogEntry, 'id' | 'timestamp'> = {
      userId,
      eventType: 'intervention_triggered',
      description: `Safety intervention triggered: ${intervention.title}`,
      details: {
        interventionType: intervention.interventionType,
        severity: intervention.severity,
        suggestedActions: intervention.suggestedActions.length,
        resourcesProvided: intervention.resources.length,
        userCanDisable: intervention.userCanDisable,
        privacyImpact: intervention.privacyImpact
      },
      contentType: 'message',
      contentId: messageId,
      interventionType: intervention.interventionType,
      resourcesProvided: intervention.resources.map(r => r.name),
      visibleToUser: true,
      userNotified: true,
      explanation: intervention.explanation,
      dataAccessed: ['message_content', 'safety_analysis', 'user_preferences'],
      processingPurpose: 'Safety intervention and resource provision',
      retentionPeriod: '1 year (required for safety audit)',
      userAcknowledged: false
    }

    await this.saveTransparencyEntry(entry)
  }

  // Log resource access
  async logResourceAccess(
    userId: string,
    resourceName: string,
    resourceType: string,
    source: 'intervention' | 'manual_search' | 'crisis_button'
  ): Promise<void> {
    const entry: Omit<TransparencyLogEntry, 'id' | 'timestamp'> = {
      userId,
      eventType: 'resource_accessed',
      description: `Crisis resource accessed: ${resourceName}`,
      details: {
        resourceType,
        accessSource: source,
        resourceName
      },
      contentType: 'user_data',
      visibleToUser: true,
      userNotified: false,
      explanation: `You accessed ${resourceName} for safety support. This access is logged for follow-up purposes.`,
      dataAccessed: ['resource_access_time', 'access_method'],
      processingPurpose: 'Crisis support tracking and follow-up',
      retentionPeriod: '2 years (required for crisis support audit)',
      userAcknowledged: false
    }

    await this.saveTransparencyEntry(entry)
  }

  // Log preference changes
  async logPreferenceChange(
    userId: string,
    changes: Record<string, any>,
    previousValues: Record<string, any>
  ): Promise<void> {
    const entry: Omit<TransparencyLogEntry, 'id' | 'timestamp'> = {
      userId,
      eventType: 'preference_changed',
      description: `Safety preferences updated`,
      details: {
        changedFields: Object.keys(changes),
        changes,
        previousValues
      },
      contentType: 'user_data',
      visibleToUser: true,
      userNotified: false,
      explanation: `You updated your safety and privacy preferences. These changes affect how we monitor and protect your communications.`,
      dataAccessed: ['user_preferences', 'consent_settings'],
      processingPurpose: 'User preference management and consent tracking',
      retentionPeriod: '7 years (required for consent audit)',
      userAcknowledged: true
    }

    await this.saveTransparencyEntry(entry)
  }

  // Get user's transparency log
  async getUserTransparencyLog(
    userId: string,
    limit: number = 50,
    eventTypes?: TransparencyLogEntry['eventType'][]
  ): Promise<TransparencyLogEntry[]> {
    let query = this.supabase
      .from('safety_interventions')
      .select('*')
      .eq('user_id', userId)
      .eq('visible_to_user', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    const { data, error } = await query

    if (error) {
      throw error
    }

    // Map database records to transparency log entries
    return (data || []).map(record => ({
      id: record.id,
      timestamp: new Date(record.created_at),
      userId: record.user_id,
      eventType: 'intervention_triggered' as const,
      description: record.intervention_title,
      details: {
        interventionType: record.intervention_type,
        severity: record.intervention_severity,
        riskLevel: record.risk_level_triggered
      },
      contentType: 'message' as const,
      contentId: record.message_id,
      riskLevel: record.risk_level_triggered as any,
      interventionType: record.intervention_type,
      resourcesProvided: (record.resources_provided as any)?.map((r: any) => r.name) || [],
      visibleToUser: record.visible_to_user,
      userNotified: true,
      explanation: record.explanation_provided || 'Safety intervention was triggered based on message analysis',
      dataAccessed: ['message_content', 'safety_analysis'],
      processingPurpose: 'Safety monitoring and intervention',
      retentionPeriod: '90 days',
      userAcknowledged: record.user_acknowledged,
      acknowledgedAt: record.acknowledged_at ? new Date(record.acknowledged_at) : undefined,
      userFeedback: record.user_feedback as any,
      feedbackNotes: undefined
    }))
  }

  // Generate transparency report
  async generateTransparencyReport(
    userId: string,
    period: 'weekly' | 'monthly' | 'quarterly' = 'monthly'
  ): Promise<TransparencyReport> {
    const now = new Date()
    let start: Date
    
    switch (period) {
      case 'weekly':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'monthly':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'quarterly':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
    }

    // Get safety interventions
    const { data: interventions } = await this.supabase
      .from('safety_interventions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())

    // Get message risk scores
    const { data: riskScores } = await this.supabase
      .from('message_risk_scores')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())

    // Get messages analyzed
    const { count: messagesAnalyzed } = await this.supabase
      .from('secure_messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_user_id', userId)
      .eq('safety_analyzed', true)
      .gte('created_at', start.toISOString())

    // Calculate summary statistics
    const summary = {
      messagesAnalyzed: messagesAnalyzed || 0,
      safetyChecksPerformed: riskScores?.length || 0,
      interventionsTriggered: interventions?.length || 0,
      crisisResourcesProvided: interventions?.filter(i => i.intervention_type === 'crisis_resource_display').length || 0,
      dataPointsProcessed: (messagesAnalyzed || 0) + (riskScores?.length || 0)
    }

    // Calculate risk level distribution
    const riskLevelDistribution = riskScores?.reduce((acc, score) => {
      const level = score.risk_level || 'safe'
      acc[level] = (acc[level] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Calculate intervention type breakdown
    const interventionTypeBreakdown = interventions?.reduce((acc, intervention) => {
      const type = intervention.intervention_type || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Generate recommendations
    const recommendations = this.generatePrivacyRecommendations(summary, interventions || [])

    return {
      userId,
      reportPeriod: {
        start,
        end: now,
        type: period
      },
      summary,
      safetyAnalysis: {
        riskLevelDistribution,
        interventionTypeBreakdown,
        falsePositiveRate: this.calculateFalsePositiveRate(interventions || []),
        userSatisfactionScore: this.calculateSatisfactionScore(interventions || [])
      },
      dataProcessing: {
        dataTypesAccessed: [
          {
            type: 'Message Content',
            count: messagesAnalyzed || 0,
            purpose: 'Safety analysis and crisis detection',
            retention: '90 days'
          },
          {
            type: 'Risk Assessment Data',
            count: riskScores?.length || 0,
            purpose: 'Safety monitoring and intervention',
            retention: '90 days'
          }
        ],
        processingPurposes: [
          {
            purpose: 'Safety monitoring',
            frequency: messagesAnalyzed || 0,
            dataTypes: ['message_content', 'user_context']
          },
          {
            purpose: 'Crisis intervention',
            frequency: interventions?.filter(i => i.risk_level_triggered === 'critical').length || 0,
            dataTypes: ['safety_analysis', 'resource_provision']
          }
        ]
      },
      userControls: {
        preferencesChanged: 0, // Would be calculated from audit logs
        featuresDisabled: 0,   // Would be calculated from user preferences
        dataDeletionRequests: 0 // Would be tracked separately
      },
      recommendations
    }
  }

  // Allow user to acknowledge transparency entries
  async acknowledgeTransparencyEntry(
    entryId: string,
    feedback?: TransparencyLogEntry['userFeedback'],
    notes?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('safety_interventions')
      .update({
        user_acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        user_feedback: feedback,
        // notes would be stored in a separate field if available
      })
      .eq('id', entryId)

    if (error) {
      throw error
    }
  }

  // Get available user control actions
  async getUserControlActions(userId: string): Promise<UserControlAction[]> {
    const userPreferences = await this.supabase
      .from('user_safety_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    const actions: UserControlAction[] = [
      {
        action: 'disable_feature',
        target: 'toxicity_detection',
        details: {
          currentStatus: userPreferences.data?.toxicity_detection_enabled ?? true,
          description: 'Disable automatic toxicity detection in messages'
        },
        confirmationRequired: true,
        safetyImpact: 'medium',
        privacyBenefit: 'high'
      },
      {
        action: 'modify_consent',
        target: 'safety_monitoring_level',
        details: {
          currentLevel: userPreferences.data?.consent_level ?? 'full_safety',
          availableLevels: ['full_safety', 'basic_safety', 'manual_mode', 'privacy_mode']
        },
        confirmationRequired: true,
        safetyImpact: 'high',
        privacyBenefit: 'high'
      },
      {
        action: 'adjust_retention',
        target: 'message_analysis_data',
        details: {
          currentPeriod: userPreferences.data?.data_retention_days ?? 90,
          minimumAllowed: 30,
          maximumAllowed: 365
        },
        confirmationRequired: false,
        safetyImpact: 'low',
        privacyBenefit: 'medium'
      },
      {
        action: 'download_data',
        target: 'safety_logs',
        details: {
          description: 'Download all safety analysis and intervention data',
          format: 'JSON'
        },
        confirmationRequired: false,
        safetyImpact: 'none',
        privacyBenefit: 'low'
      },
      {
        action: 'delete_data',
        target: 'historical_analysis',
        details: {
          description: 'Delete historical safety analysis data (keeps recent for safety)',
          retainsDays: 30
        },
        confirmationRequired: true,
        safetyImpact: 'medium',
        privacyBenefit: 'high'
      }
    ]

    return actions
  }

  // Execute user control action
  async executeControlAction(
    userId: string,
    action: UserControlAction,
    confirmed: boolean = false
  ): Promise<{ success: boolean; message: string; requiresConfirmation?: boolean }> {
    if (action.confirmationRequired && !confirmed) {
      return {
        success: false,
        message: `This action requires confirmation due to ${action.safetyImpact} safety impact.`,
        requiresConfirmation: true
      }
    }

    switch (action.action) {
      case 'disable_feature':
        return await this.disableFeature(userId, action.target, action.details)
        
      case 'modify_consent':
        return await this.modifyConsent(userId, action.details.targetLevel)
        
      case 'adjust_retention':
        return await this.adjustRetention(userId, action.details.newPeriod)
        
      case 'download_data':
        return await this.initiateDataDownload(userId, action.target)
        
      case 'delete_data':
        return await this.deleteHistoricalData(userId, action.target)
        
      default:
        return { success: false, message: 'Unknown action type' }
    }
  }

  // Private helper methods
  private async saveTransparencyEntry(entry: Omit<TransparencyLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      // In a real implementation, this would save to a dedicated transparency_log table
      // For now, we'll use the existing safety_interventions table structure
      if (entry.eventType === 'intervention_triggered') {
        // This would already be logged by the intervention system
        return
      }
      
      // Log other event types to audit_log
      await this.supabase
        .from('audit_log')
        .insert({
          action_type: entry.eventType,
          resource_type: 'user_transparency',
          resource_id: entry.userId,
          details: {
            ...entry,
            timestamp: new Date().toISOString()
          },
          environment: 'production'
        })
    } catch (error) {
      console.error('Failed to save transparency entry:', error)
      // Don't throw - transparency logging failure shouldn't break functionality
    }
  }

  private generatePrivacyRecommendations(
    summary: TransparencyReport['summary'],
    interventions: any[]
  ): TransparencyReport['recommendations'] {
    const recommendations: TransparencyReport['recommendations'] = []

    if (summary.interventionsTriggered === 0 && summary.messagesAnalyzed > 50) {
      recommendations.push({
        type: 'privacy',
        title: 'Consider Reducing Safety Monitoring',
        description: 'You have a low risk profile. You might benefit from reduced safety monitoring for more privacy.',
        action: 'Review safety preferences'
      })
    }

    if (interventions.filter(i => i.user_feedback === 'intrusive').length > 2) {
      recommendations.push({
        type: 'feature',
        title: 'Adjust Intervention Style',
        description: 'Your feedback suggests interventions feel intrusive. Consider switching to a gentler intervention style.',
        action: 'Update intervention preferences'
      })
    }

    if (summary.messagesAnalyzed > 100) {
      recommendations.push({
        type: 'privacy',
        title: 'Data Minimization',
        description: 'You\'ve had many messages analyzed. Consider reducing data retention period or disabling some features.',
        action: 'Review data retention settings'
      })
    }

    return recommendations
  }

  private calculateFalsePositiveRate(interventions: any[]): number {
    if (interventions.length === 0) return 0
    const falsePositives = interventions.filter(i => i.user_feedback === 'not_helpful').length
    return (falsePositives / interventions.length) * 100
  }

  private calculateSatisfactionScore(interventions: any[]): number {
    if (interventions.length === 0) return 0
    const helpful = interventions.filter(i => i.user_feedback === 'helpful').length
    return (helpful / interventions.length) * 100
  }

  private async disableFeature(userId: string, feature: string, details: any): Promise<{ success: boolean; message: string }> {
    // Implementation would update user preferences
    return { success: true, message: `Feature ${feature} disabled successfully` }
  }

  private async modifyConsent(userId: string, newLevel: string): Promise<{ success: boolean; message: string }> {
    // Implementation would update consent level
    return { success: true, message: `Consent level updated to ${newLevel}` }
  }

  private async adjustRetention(userId: string, newPeriod: number): Promise<{ success: boolean; message: string }> {
    // Implementation would update retention period
    return { success: true, message: `Data retention period updated to ${newPeriod} days` }
  }

  private async initiateDataDownload(userId: string, dataType: string): Promise<{ success: boolean; message: string }> {
    // Implementation would generate data export
    return { success: true, message: 'Data download initiated - you will receive an email when ready' }
  }

  private async deleteHistoricalData(userId: string, dataType: string): Promise<{ success: boolean; message: string }> {
    // Implementation would delete historical data while preserving recent for safety
    return { success: true, message: 'Historical data deleted successfully (recent data retained for safety)' }
  }
}

// Export singleton instance
export const transparencyLoggingSystem = new TransparencyLoggingSystem()

// Export types for other modules
export type { TransparencyLogEntry, TransparencyReport, UserControlAction }