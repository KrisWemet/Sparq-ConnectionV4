import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database-complete.types'

// User safety preferences and consent framework
export type ConsentLevel = 'full_safety' | 'basic_safety' | 'manual_mode' | 'privacy_mode'
export type InterventionStyle = 'gentle' | 'direct' | 'minimal'
export type ResourcePreference = 'local_only' | 'national_only' | 'local_and_national'

export interface SafetyPreferences {
  // Core consent
  consentLevel: ConsentLevel
  consentGivenAt: Date
  consentVersion: string
  
  // Feature toggles
  safetyMonitoringEnabled: boolean
  toxicityDetectionEnabled: boolean
  crisisDetectionEnabled: boolean
  dvPatternDetectionEnabled: boolean
  emotionalDistressMonitoring: boolean
  
  // User experience preferences
  interventionStyle: InterventionStyle
  crisisResourcePreference: ResourcePreference
  notificationPreferences: {
    inApp: boolean
    email: boolean
    sms: boolean
  }
  
  // Transparency controls
  showRiskScores: boolean
  showInterventionReasons: boolean
  monthlyTransparencyReports: boolean
  
  // Safety overrides
  allowEmergencyOverride: boolean
  emergencyContactInfo?: {
    name?: string
    phone?: string
    relationship?: string
  }
  
  // Privacy settings
  dataRetentionDays: number
  allowAnonymizedAnalytics: boolean
}

export interface ConsentExplanation {
  level: ConsentLevel
  title: string
  description: string
  features: {
    name: string
    description: string
    enabled: boolean
    canDisable: boolean
    safetyImpact?: 'none' | 'low' | 'medium' | 'high'
  }[]
  warnings: string[]
  benefits: string[]
}

export const CONSENT_EXPLANATIONS: Record<ConsentLevel, ConsentExplanation> = {
  full_safety: {
    level: 'full_safety',
    title: 'Full Safety Monitoring',
    description: 'All safety features enabled to provide comprehensive protection and support.',
    features: [
      {
        name: 'Crisis Detection',
        description: 'Automatic detection of self-harm language and immediate crisis resource surfacing',
        enabled: true,
        canDisable: false,
        safetyImpact: 'high'
      },
      {
        name: 'Domestic Violence Pattern Recognition',
        description: 'Discrete identification of abuse patterns with private resource access',
        enabled: true,
        canDisable: false,
        safetyImpact: 'high'
      },
      {
        name: 'Toxicity Detection',
        description: 'Cooling-off suggestions and communication improvement prompts',
        enabled: true,
        canDisable: true,
        safetyImpact: 'medium'
      },
      {
        name: 'Emotional Distress Monitoring',
        description: 'Proactive wellness check-ins and coping resource suggestions',
        enabled: true,
        canDisable: true,
        safetyImpact: 'low'
      }
    ],
    warnings: [],
    benefits: [
      'Maximum safety protection for both partners',
      'Immediate crisis intervention capabilities',
      'Proactive relationship wellness support',
      'Professional resource connections when needed'
    ]
  },
  
  basic_safety: {
    level: 'basic_safety',
    title: 'Basic Safety Monitoring',
    description: 'Essential safety features only - crisis and domestic violence detection.',
    features: [
      {
        name: 'Crisis Detection',
        description: 'Detection of self-harm language and crisis resource surfacing',
        enabled: true,
        canDisable: false,
        safetyImpact: 'high'
      },
      {
        name: 'Domestic Violence Pattern Recognition',
        description: 'Discrete identification of abuse patterns',
        enabled: true,
        canDisable: false,
        safetyImpact: 'high'
      },
      {
        name: 'Toxicity Detection',
        description: 'Basic hostile language detection',
        enabled: false,
        canDisable: true,
        safetyImpact: 'medium'
      },
      {
        name: 'Emotional Distress Monitoring',
        description: 'Wellness check-ins and resource suggestions',
        enabled: false,
        canDisable: true,
        safetyImpact: 'low'
      }
    ],
    warnings: [
      'Reduced ability to detect relationship communication issues',
      'Less proactive wellness support available'
    ],
    benefits: [
      'Essential safety protection maintained',
      'Reduced system notifications',
      'Focus on critical safety situations only'
    ]
  },
  
  manual_mode: {
    level: 'manual_mode',
    title: 'Manual Safety Mode',
    description: 'Safety features only activated when you specifically request help.',
    features: [
      {
        name: 'Crisis Detection',
        description: 'Available when you click "Safety Check" button',
        enabled: false,
        canDisable: false,
        safetyImpact: 'medium'
      },
      {
        name: 'Domestic Violence Pattern Recognition',
        description: 'Available on request with discrete access',
        enabled: false,
        canDisable: false,
        safetyImpact: 'medium'
      },
      {
        name: 'Toxicity Detection',
        description: 'Manual communication analysis available',
        enabled: false,
        canDisable: true,
        safetyImpact: 'low'
      },
      {
        name: 'Emotional Distress Monitoring',
        description: 'Self-initiated wellness resources',
        enabled: false,
        canDisable: true,
        safetyImpact: 'low'
      }
    ],
    warnings: [
      'No automatic safety detection or intervention',
      'Requires manual activation of safety features',
      'May miss time-sensitive safety situations'
    ],
    benefits: [
      'Complete user control over when safety features activate',
      'No automatic analysis of message content',
      'Safety resources still available when needed'
    ]
  },
  
  privacy_mode: {
    level: 'privacy_mode',
    title: 'Privacy Mode',
    description: 'Minimal safety monitoring with maximum privacy protection.',
    features: [
      {
        name: 'Crisis Detection',
        description: 'Disabled - no automatic content analysis',
        enabled: false,
        canDisable: false,
        safetyImpact: 'high'
      },
      {
        name: 'Domestic Violence Pattern Recognition',
        description: 'Disabled - resources available via manual access only',
        enabled: false,
        canDisable: false,
        safetyImpact: 'high'
      },
      {
        name: 'Toxicity Detection',
        description: 'Completely disabled',
        enabled: false,
        canDisable: false,
        safetyImpact: 'medium'
      },
      {
        name: 'Emotional Distress Monitoring',
        description: 'Completely disabled',
        enabled: false,
        canDisable: false,
        safetyImpact: 'low'
      }
    ],
    warnings: [
      '⚠️ WARNING: This disables automatic safety detection',
      '⚠️ Platform cannot detect or respond to crisis situations',
      '⚠️ You are responsible for accessing safety resources manually',
      '⚠️ Not recommended if you have a history of mental health concerns'
    ],
    benefits: [
      'Maximum message privacy - no content analysis',
      'Minimal data collection and processing',
      'Crisis resources remain accessible via direct navigation'
    ]
  }
}

export class SafetyPreferencesManager {
  private supabase = createClientComponentClient<Database>()

  async getUserSafetyPreferences(userId: string): Promise<SafetyPreferences | null> {
    const { data, error } = await this.supabase
      .from('user_safety_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found, return defaults
        return this.getDefaultSafetyPreferences()
      }
      throw error
    }

    return {
      consentLevel: data.consent_level as ConsentLevel,
      consentGivenAt: new Date(data.consent_given_at),
      consentVersion: data.consent_version,
      safetyMonitoringEnabled: data.safety_monitoring_enabled,
      toxicityDetectionEnabled: data.toxicity_detection_enabled,
      crisisDetectionEnabled: data.crisis_detection_enabled,
      dvPatternDetectionEnabled: data.dv_pattern_detection_enabled,
      emotionalDistressMonitoring: data.emotional_distress_monitoring,
      interventionStyle: data.intervention_style as InterventionStyle,
      crisisResourcePreference: data.crisis_resource_preference as ResourcePreference,
      notificationPreferences: data.notification_preferences as any,
      showRiskScores: data.show_risk_scores,
      showInterventionReasons: data.show_intervention_reasons,
      monthlyTransparencyReports: data.monthly_transparency_reports,
      allowEmergencyOverride: data.allow_emergency_override,
      emergencyContactInfo: data.emergency_contact_info as any,
      dataRetentionDays: data.data_retention_days,
      allowAnonymizedAnalytics: data.allow_anonymized_analytics
    }
  }

  async updateSafetyPreferences(userId: string, preferences: Partial<SafetyPreferences>): Promise<void> {
    // If changing consent level, validate and warn user
    if (preferences.consentLevel) {
      await this.validateConsentChange(userId, preferences.consentLevel)
    }

    const updateData: any = {}

    // Map preferences to database fields
    if (preferences.consentLevel !== undefined) {
      updateData.consent_level = preferences.consentLevel
      updateData.consent_given_at = new Date().toISOString()
      updateData.consent_version = 'v1.0'
    }

    if (preferences.safetyMonitoringEnabled !== undefined) {
      updateData.safety_monitoring_enabled = preferences.safetyMonitoringEnabled
    }

    if (preferences.toxicityDetectionEnabled !== undefined) {
      updateData.toxicity_detection_enabled = preferences.toxicityDetectionEnabled
    }

    if (preferences.crisisDetectionEnabled !== undefined) {
      updateData.crisis_detection_enabled = preferences.crisisDetectionEnabled
    }

    if (preferences.dvPatternDetectionEnabled !== undefined) {
      updateData.dv_pattern_detection_enabled = preferences.dvPatternDetectionEnabled
    }

    if (preferences.emotionalDistressMonitoring !== undefined) {
      updateData.emotional_distress_monitoring = preferences.emotionalDistressMonitoring
    }

    if (preferences.interventionStyle !== undefined) {
      updateData.intervention_style = preferences.interventionStyle
    }

    if (preferences.crisisResourcePreference !== undefined) {
      updateData.crisis_resource_preference = preferences.crisisResourcePreference
    }

    if (preferences.notificationPreferences !== undefined) {
      updateData.notification_preferences = preferences.notificationPreferences
    }

    if (preferences.showRiskScores !== undefined) {
      updateData.show_risk_scores = preferences.showRiskScores
    }

    if (preferences.showInterventionReasons !== undefined) {
      updateData.show_intervention_reasons = preferences.showInterventionReasons
    }

    if (preferences.monthlyTransparencyReports !== undefined) {
      updateData.monthly_transparency_reports = preferences.monthlyTransparencyReports
    }

    if (preferences.allowEmergencyOverride !== undefined) {
      updateData.allow_emergency_override = preferences.allowEmergencyOverride
    }

    if (preferences.emergencyContactInfo !== undefined) {
      updateData.emergency_contact_info = preferences.emergencyContactInfo
    }

    if (preferences.dataRetentionDays !== undefined) {
      updateData.data_retention_days = preferences.dataRetentionDays
    }

    if (preferences.allowAnonymizedAnalytics !== undefined) {
      updateData.allow_anonymized_analytics = preferences.allowAnonymizedAnalytics
    }

    updateData.updated_at = new Date().toISOString()

    const { error } = await this.supabase
      .from('user_safety_preferences')
      .upsert({
        user_id: userId,
        ...updateData
      })

    if (error) {
      throw error
    }

    // Log the preference change for audit trail
    await this.logPreferenceChange(userId, preferences)
  }

  private async validateConsentChange(userId: string, newConsentLevel: ConsentLevel): Promise<void> {
    const currentPrefs = await this.getUserSafetyPreferences(userId)
    
    // Check for potentially unsafe downgrades
    if (currentPrefs && this.isUnsafeDowngrade(currentPrefs.consentLevel, newConsentLevel)) {
      // In a real implementation, this might show additional warnings or require confirmation
      console.warn(`User ${userId} downgrading safety consent from ${currentPrefs.consentLevel} to ${newConsentLevel}`)
    }
  }

  private isUnsafeDowngrade(currentLevel: ConsentLevel, newLevel: ConsentLevel): boolean {
    const levels = ['privacy_mode', 'manual_mode', 'basic_safety', 'full_safety']
    const currentIndex = levels.indexOf(currentLevel)
    const newIndex = levels.indexOf(newLevel)
    
    return newIndex < currentIndex
  }

  private async logPreferenceChange(userId: string, changes: Partial<SafetyPreferences>): Promise<void> {
    try {
      await this.supabase
        .from('audit_log')
        .insert({
          action_type: 'safety_preferences_updated',
          resource_type: 'user_safety_preferences',
          resource_id: userId,
          details: {
            changes,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          },
          environment: 'production'
        })
    } catch (error) {
      console.error('Failed to log preference change:', error)
      // Don't throw - preference change should succeed even if logging fails
    }
  }

  private getDefaultSafetyPreferences(): SafetyPreferences {
    return {
      consentLevel: 'full_safety',
      consentGivenAt: new Date(),
      consentVersion: 'v1.0',
      safetyMonitoringEnabled: true,
      toxicityDetectionEnabled: true,
      crisisDetectionEnabled: true,
      dvPatternDetectionEnabled: true,
      emotionalDistressMonitoring: true,
      interventionStyle: 'gentle',
      crisisResourcePreference: 'local_and_national',
      notificationPreferences: {
        inApp: true,
        email: false,
        sms: false
      },
      showRiskScores: false,
      showInterventionReasons: true,
      monthlyTransparencyReports: true,
      allowEmergencyOverride: true,
      dataRetentionDays: 90,
      allowAnonymizedAnalytics: true
    }
  }

  async initializeUserSafetyPreferences(userId: string): Promise<SafetyPreferences> {
    const defaults = this.getDefaultSafetyPreferences()
    
    const { error } = await this.supabase
      .from('user_safety_preferences')
      .insert({
        user_id: userId,
        consent_level: defaults.consentLevel,
        consent_given_at: defaults.consentGivenAt.toISOString(),
        consent_version: defaults.consentVersion,
        safety_monitoring_enabled: defaults.safetyMonitoringEnabled,
        toxicity_detection_enabled: defaults.toxicityDetectionEnabled,
        crisis_detection_enabled: defaults.crisisDetectionEnabled,
        dv_pattern_detection_enabled: defaults.dvPatternDetectionEnabled,
        emotional_distress_monitoring: defaults.emotionalDistressMonitoring,
        intervention_style: defaults.interventionStyle,
        crisis_resource_preference: defaults.crisisResourcePreference,
        notification_preferences: defaults.notificationPreferences,
        show_risk_scores: defaults.showRiskScores,
        show_intervention_reasons: defaults.showInterventionReasons,
        monthly_transparency_reports: defaults.monthlyTransparencyReports,
        allow_emergency_override: defaults.allowEmergencyOverride,
        emergency_contact_info: defaults.emergencyContactInfo || {},
        data_retention_days: defaults.dataRetentionDays,
        allow_anonymized_analytics: defaults.allowAnonymizedAnalytics
      })

    if (error) {
      throw error
    }

    return defaults
  }

  async getConsentExplanation(level: ConsentLevel): Promise<ConsentExplanation> {
    return CONSENT_EXPLANATIONS[level]
  }

  async shouldAllowSafetyMonitoring(userId: string, monitoringType: keyof SafetyPreferences): Promise<boolean> {
    const preferences = await this.getUserSafetyPreferences(userId)
    
    if (!preferences || !preferences.safetyMonitoringEnabled) {
      return false
    }

    switch (monitoringType) {
      case 'toxicityDetectionEnabled':
        return preferences.toxicityDetectionEnabled
      case 'crisisDetectionEnabled':
        return preferences.crisisDetectionEnabled
      case 'dvPatternDetectionEnabled':
        return preferences.dvPatternDetectionEnabled
      case 'emotionalDistressMonitoring':
        return preferences.emotionalDistressMonitoring
      default:
        return false
    }
  }

  async canOverrideForEmergency(userId: string): Promise<boolean> {
    const preferences = await this.getUserSafetyPreferences(userId)
    return preferences?.allowEmergencyOverride ?? true
  }

  // Get transparency data for user
  async getUserTransparencyData(userId: string, timeframe: 'week' | 'month' = 'month'): Promise<{
    interventionsTriggered: number
    safetyChecksPerformed: number
    crisisResourcesAccessed: number
    preferencesChanged: number
    dataProcessed: {
      messagesAnalyzed: number
      riskScoresGenerated: number
    }
  }> {
    const timeframeDays = timeframe === 'week' ? 7 : 30
    const startDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000)

    // Get intervention count
    const { count: interventionsTriggered } = await this.supabase
      .from('safety_interventions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())

    // Get risk analysis count
    const { count: safetyChecksPerformed } = await this.supabase
      .from('message_risk_scores')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())

    // Get messages analyzed count
    const { count: messagesAnalyzed } = await this.supabase
      .from('secure_messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_user_id', userId)
      .eq('safety_analyzed', true)
      .gte('created_at', startDate.toISOString())

    return {
      interventionsTriggered: interventionsTriggered || 0,
      safetyChecksPerformed: safetyChecksPerformed || 0,
      crisisResourcesAccessed: 0, // Would track via separate analytics
      preferencesChanged: 0, // Would track from audit logs
      dataProcessed: {
        messagesAnalyzed: messagesAnalyzed || 0,
        riskScoresGenerated: safetyChecksPerformed || 0
      }
    }
  }
}

// Export singleton instance
export const safetyPreferencesManager = new SafetyPreferencesManager()

// Export types for other modules
export type { SafetyPreferences, ConsentExplanation }