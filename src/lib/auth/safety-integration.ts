import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database-complete.types'

type SafetyResource = Database['public']['Tables']['safety_resources']['Row']
type CrisisEscalation = Database['public']['Tables']['crisis_escalations']['Row']

export interface SafetyContext {
  userId: string
  isInCrisis: boolean
  crisisLevel?: 'low' | 'medium' | 'high' | 'critical' | 'emergency'
  monitoringEnabled: boolean
  lastSafetyCheck?: string
  emergencyContacts: string[]
  jurisdictionResources: SafetyResource[]
}

export interface SafetySettings {
  monitoringEnabled: boolean
  escalationThreshold: 'self_harm_only' | 'violence_indicators' | 'severe_distress' | 'any_concern'
  allowEmergencyContact: boolean
  allowProfessionalReferral: boolean
  crisisResourcesVisible: boolean
}

export interface EmergencyProtocol {
  immediateActions: string[]
  resourceContacts: SafetyResource[]
  escalationSteps: string[]
  followUpRequired: boolean
}

export class SafetyIntegrator {
  private supabase = createClient()

  /**
   * Get user's current safety context
   */
  async getSafetyContext(userId: string): Promise<SafetyContext> {
    // Get user safety profile and current crisis status
    const { data: userSafety, error: safetyError } = await this.supabase
      .from('users')
      .select(`
        id,
        safety_monitoring_enabled,
        crisis_contact_encrypted,
        user_safety_profile (
          emergency_contact_encrypted,
          crisis_history_count,
          last_safety_check_at
        ),
        crisis_escalations!crisis_escalations_user_id_fkey (
          id,
          status,
          severity_level,
          created_at
        )
      `)
      .eq('id', userId)
      .single()

    if (safetyError) {
      console.error('Error fetching safety context:', safetyError)
      throw new Error('Failed to fetch safety context')
    }

    // Check for active crisis
    const activeCrises = userSafety?.crisis_escalations?.filter(
      (crisis: any) => crisis.status !== 'resolved'
    ) || []

    const isInCrisis = activeCrises.length > 0
    const crisisLevel = isInCrisis 
      ? this.determineCrisisLevel(activeCrises)
      : undefined

    // Get jurisdiction-specific safety resources
    const resources = await this.getJurisdictionResources(userId)

    return {
      userId,
      isInCrisis,
      crisisLevel,
      monitoringEnabled: userSafety?.safety_monitoring_enabled || false,
      lastSafetyCheck: userSafety?.user_safety_profile?.last_safety_check_at,
      emergencyContacts: this.extractEmergencyContacts(userSafety),
      jurisdictionResources: resources
    }
  }

  /**
   * Get safety settings for user
   */
  async getSafetySettings(userId: string): Promise<SafetySettings> {
    const { data, error } = await this.supabase
      .from('users')
      .select(`
        safety_monitoring_enabled,
        user_safety_profile (
          crisis_escalation_threshold,
          allow_emergency_contact,
          allow_professional_referral
        )
      `)
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching safety settings:', error)
      throw new Error('Failed to fetch safety settings')
    }

    return {
      monitoringEnabled: data?.safety_monitoring_enabled || false,
      escalationThreshold: data?.user_safety_profile?.crisis_escalation_threshold || 'severe_distress',
      allowEmergencyContact: data?.user_safety_profile?.allow_emergency_contact || false,
      allowProfessionalReferral: data?.user_safety_profile?.allow_professional_referral || true,
      crisisResourcesVisible: true // Always visible for safety
    }
  }

  /**
   * Update safety settings
   */
  async updateSafetySettings(
    userId: string, 
    settings: Partial<SafetySettings>
  ): Promise<void> {
    // Update user-level settings
    if (settings.monitoringEnabled !== undefined) {
      await this.supabase
        .from('users')
        .update({ safety_monitoring_enabled: settings.monitoringEnabled })
        .eq('id', userId)
    }

    // Update safety profile settings
    const profileUpdates: any = {}
    if (settings.escalationThreshold) {
      profileUpdates.crisis_escalation_threshold = settings.escalationThreshold
    }
    if (settings.allowEmergencyContact !== undefined) {
      profileUpdates.allow_emergency_contact = settings.allowEmergencyContact
    }
    if (settings.allowProfessionalReferral !== undefined) {
      profileUpdates.allow_professional_referral = settings.allowProfessionalReferral
    }

    if (Object.keys(profileUpdates).length > 0) {
      await this.supabase
        .from('user_safety_profile')
        .upsert({
          user_id: userId,
          ...profileUpdates
        })
    }

    // Log settings change
    await this.supabase
      .from('audit_log')
      .insert({
        user_id: userId,
        action_type: 'safety_settings_updated',
        resource_type: 'safety_profile',
        details: settings
      })
  }

  /**
   * Check if user should see safety warning about disabling monitoring
   */
  shouldShowSafetyWarning(currentSettings: SafetySettings, newSettings: Partial<SafetySettings>): boolean {
    // Show warning if trying to disable monitoring
    if (currentSettings.monitoringEnabled && newSettings.monitoringEnabled === false) {
      return true
    }

    // Show warning if lowering escalation sensitivity significantly
    const thresholdLevels = ['any_concern', 'severe_distress', 'violence_indicators', 'self_harm_only']
    const currentLevel = thresholdLevels.indexOf(currentSettings.escalationThreshold)
    const newLevel = newSettings.escalationThreshold ? thresholdLevels.indexOf(newSettings.escalationThreshold) : currentLevel

    if (newLevel > currentLevel + 1) {
      return true
    }

    return false
  }

  /**
   * Get emergency protocol for crisis level
   */
  async getEmergencyProtocol(
    userId: string, 
    crisisLevel: 'low' | 'medium' | 'high' | 'critical' | 'emergency'
  ): Promise<EmergencyProtocol> {
    const resources = await this.getJurisdictionResources(userId)
    
    const protocolMap = {
      low: {
        immediateActions: [
          'Take a moment to breathe deeply',
          'Consider reaching out to a trusted friend or family member',
          'Review available self-help resources'
        ],
        followUpRequired: false
      },
      medium: {
        immediateActions: [
          'Consider calling a crisis support line',
          'Reach out to your emergency contact if you have one',
          'Review professional support options'
        ],
        followUpRequired: true
      },
      high: {
        immediateActions: [
          'Call a crisis hotline immediately',
          'Contact your emergency contact',
          'Consider visiting a mental health professional',
          'Do not make any major decisions right now'
        ],
        followUpRequired: true
      },
      critical: {
        immediateActions: [
          'Call 911 or your local emergency number immediately',
          'Call the National Suicide Prevention Lifeline: 988',
          'Go to your nearest emergency room',
          'Stay with someone you trust'
        ],
        followUpRequired: true
      },
      emergency: {
        immediateActions: [
          'Call 911 immediately',
          'Go to the emergency room now',
          'Emergency services have been notified',
          'Professional intervention is being arranged'
        ],
        followUpRequired: true
      }
    }

    const baseProtocol = protocolMap[crisisLevel]
    
    return {
      immediateActions: baseProtocol.immediateActions,
      resourceContacts: resources.filter(r => 
        r.crisis_types_supported?.includes('suicidal_ideation') ||
        r.crisis_types_supported?.includes('emotional_distress')
      ),
      escalationSteps: this.getEscalationSteps(crisisLevel),
      followUpRequired: baseProtocol.followUpRequired
    }
  }

  /**
   * Record safety check
   */
  async recordSafetyCheck(
    userId: string,
    checkType: 'manual' | 'automated' | 'partner_requested' | 'professional_requested',
    status: 'safe' | 'concerned' | 'crisis',
    notes?: string
  ): Promise<void> {
    // Update last safety check
    await this.supabase
      .from('user_safety_profile')
      .upsert({
        user_id: userId,
        last_safety_check_at: new Date().toISOString(),
        last_safety_status: status
      })

    // Log the safety check
    await this.supabase
      .from('audit_log')
      .insert({
        user_id: userId,
        action_type: 'safety_check',
        resource_type: 'safety_profile',
        details: {
          check_type: checkType,
          status: status,
          notes: notes
        }
      })

    // If status indicates concern or crisis, trigger appropriate response
    if (status === 'crisis') {
      await this.initiateCrisisResponse(userId, 'safety_check', notes)
    } else if (status === 'concerned') {
      await this.provideSafetyResources(userId, 'concern_detected')
    }
  }

  /**
   * Get safety resources for user's jurisdiction
   */
  async getJurisdictionResources(userId: string): Promise<SafetyResource[]> {
    // Get user's current jurisdiction
    const { data: userJurisdiction } = await this.supabase
      .from('user_jurisdictions')
      .select('jurisdictions(country_code)')
      .eq('user_id', userId)
      .eq('is_current', true)
      .single()

    const countryCode = userJurisdiction?.jurisdictions?.country_code || 'GLOBAL'

    // Get appropriate safety resources
    const { data: resources, error } = await this.supabase
      .from('safety_resources')
      .select('*')
      .or(`country_code.eq.${countryCode},country_code.eq.GLOBAL`)
      .eq('is_active', true)
      .eq('verified', true)
      .order('display_priority', { ascending: true })

    if (error) {
      console.error('Error fetching safety resources:', error)
      return []
    }

    return resources || []
  }

  /**
   * Initiate crisis response
   */
  private async initiateCrisisResponse(
    userId: string,
    triggerSource: string,
    context?: string
  ): Promise<void> {
    // Create crisis escalation
    const { data: escalation, error } = await this.supabase
      .from('crisis_escalations')
      .insert({
        user_id: userId,
        escalation_type: 'safety_concern',
        severity_level: 'high',
        trigger_source: triggerSource,
        context_data: { trigger_context: context },
        status: 'active'
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating crisis escalation:', error)
      return
    }

    // Initialize crisis workflow if available
    try {
      await this.supabase.rpc('initialize_crisis_workflow', {
        p_crisis_escalation_id: escalation.id
      })
    } catch (workflowError) {
      console.error('Error initializing crisis workflow:', workflowError)
    }
  }

  /**
   * Provide safety resources to user
   */
  private async provideSafetyResources(
    userId: string,
    reason: string
  ): Promise<void> {
    const resources = await this.getJurisdictionResources(userId)
    
    // Log resource provision
    await this.supabase
      .from('audit_log')
      .insert({
        user_id: userId,
        action_type: 'safety_resources_provided',
        resource_type: 'safety_resources',
        details: {
          reason: reason,
          resources_count: resources.length,
          resource_types: resources.map(r => r.resource_type)
        }
      })
  }

  /**
   * Check if authentication should include safety context
   */
  async shouldIncludeSafetyContext(userId: string): Promise<boolean> {
    const context = await this.getSafetyContext(userId)
    return context.isInCrisis || context.monitoringEnabled
  }

  // Private helper methods

  private determineCrisisLevel(crises: any[]): 'low' | 'medium' | 'high' | 'critical' | 'emergency' {
    const severityLevels = crises.map(c => c.severity_level)
    
    if (severityLevels.includes('emergency')) return 'emergency'
    if (severityLevels.includes('critical')) return 'critical'
    if (severityLevels.includes('high')) return 'high'
    if (severityLevels.includes('medium')) return 'medium'
    return 'low'
  }

  private extractEmergencyContacts(userData: any): string[] {
    const contacts = []
    if (userData?.crisis_contact_encrypted) {
      contacts.push(userData.crisis_contact_encrypted)
    }
    if (userData?.user_safety_profile?.emergency_contact_encrypted) {
      contacts.push(userData.user_safety_profile.emergency_contact_encrypted)
    }
    return contacts
  }

  private getEscalationSteps(crisisLevel: string): string[] {
    const stepMap = {
      low: [
        'Self-help resources provided',
        'Optional check-in scheduled',
        'Professional resources available'
      ],
      medium: [
        'Crisis resources provided',
        'Professional referral offered',
        'Follow-up check-in scheduled'
      ],
      high: [
        'Immediate crisis support activated',
        'Professional referral initiated',
        'Emergency contacts notified (if consented)',
        'Daily check-ins scheduled'
      ],
      critical: [
        'Emergency services contacted',
        'Professional intervention arranged',
        'Continuous monitoring activated',
        'Safety plan implemented'
      ],
      emergency: [
        'Emergency services dispatched',
        'Professional crisis team activated',
        'Emergency contacts notified',
        'Immediate intervention in progress'
      ]
    }

    return stepMap[crisisLevel as keyof typeof stepMap] || []
  }
}

export const safetyIntegrator = new SafetyIntegrator()