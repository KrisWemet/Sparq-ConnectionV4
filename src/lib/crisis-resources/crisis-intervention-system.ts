import { createClientComponentClient } from '@supabase/supabase-js'
import { Database } from '@/types/database-complete.types'
import { SafetyResponse } from '@/lib/messaging/safety-responses'
import { MessageSafetyAnalysis } from '@/lib/messaging/safety-analysis'

// Comprehensive crisis intervention and resource management system
export interface CrisisIntervention {
  id: string
  userId: string
  coupleId: string
  interventionType: 'immediate_crisis' | 'escalated_concern' | 'follow_up' | 'resource_provision'
  severity: 'low' | 'medium' | 'high' | 'critical'
  
  // Trigger information
  triggeredBy: {
    messageId?: string
    riskLevel: string
    detectedIndicators: string[]
    analysisScore: number
  }
  
  // Intervention details
  intervention: {
    title: string
    description: string
    actions: Array<{
      type: 'resource_display' | 'professional_contact' | 'emergency_escalation'
      description: string
      completed: boolean
      completedAt?: Date
    }>
    resourcesProvided: CrisisResource[]
  }
  
  // Professional oversight
  professionalReview: {
    required: boolean
    assigned: boolean
    reviewerId?: string
    reviewedAt?: Date
    notes?: string
    recommendations?: string[]
  }
  
  // User interaction
  userEngagement: {
    acknowledged: boolean
    acknowledgedAt?: Date
    resourcesAccessed: string[]
    feedback?: 'helpful' | 'not_helpful' | 'inappropriate'
    followUpNeeded: boolean
  }
  
  // System tracking
  createdAt: Date
  resolvedAt?: Date
  status: 'active' | 'resolved' | 'escalated' | 'transferred'
  metadata: Record<string, any>
}

export interface CrisisResource {
  id: string
  name: string
  type: 'crisis_hotline' | 'domestic_violence' | 'mental_health' | 'emergency_services' | 'local_support'
  
  // Contact information
  contactMethods: Array<{
    type: 'phone' | 'text' | 'chat' | 'website' | 'email'
    value: string
    primary: boolean
  }>
  
  // Availability and access
  availability: {
    hours: '24/7' | 'business_hours' | 'limited' | string
    languages: string[]
    accessibility: string[]
  }
  
  // Geographic and demographic targeting
  targeting: {
    geographic: {
      country?: string
      state?: string
      city?: string
      zipCodes?: string[]
    }
    demographic: {
      ageGroups?: string[]
      lgbtqFriendly?: boolean
      culturalSpecialties?: string[]
    }
    crisisTypes: string[]
  }
  
  // Resource details
  description: string
  specializations: string[]
  discreteAccess: boolean // For DV resources that need privacy
  verificationStatus: 'verified' | 'pending' | 'unverified'
  qualityRating: number // 1-5 stars
  
  // System metadata
  isActive: boolean
  lastVerified: Date
  addedBy: 'system' | 'professional' | 'community'
  metadata: Record<string, any>
}

export interface CrisisSafetyPlan {
  id: string
  userId: string
  coupleId?: string
  
  // Warning signs and triggers
  warningSignsPersonal: string[]
  warningSignsRelational: string[]
  triggerSituations: string[]
  
  // Coping strategies
  copingStrategies: Array<{
    category: 'immediate' | 'short_term' | 'long_term'
    strategy: string
    effectiveness: number // 1-5 scale
    lastUsed?: Date
  }>
  
  // Support network
  supportNetwork: Array<{
    name: string
    relationship: string
    contactInfo: string
    role: 'emergency_contact' | 'daily_support' | 'professional' | 'crisis_only'
    available24h: boolean
  }>
  
  // Professional resources
  professionalSupport: Array<{
    name: string
    type: 'therapist' | 'psychiatrist' | 'counselor' | 'social_worker'
    contactInfo: string
    nextAppointment?: Date
  }>
  
  // Safety measures
  safetyMeasures: Array<{
    category: 'environmental' | 'behavioral' | 'technological'
    measure: string
    implemented: boolean
    notes?: string
  }>
  
  // Crisis contacts
  crisisContacts: CrisisResource[]
  
  // Plan metadata
  createdAt: Date
  lastUpdated: Date
  effectivenessRating?: number
  professionallyReviewed: boolean
  reviewedBy?: string
  reviewedAt?: Date
}

export class CrisisInterventionSystem {
  private supabase = createClientComponentClient<Database>()

  // Create a crisis intervention record
  async createCrisisIntervention(
    analysis: MessageSafetyAnalysis,
    safetyResponse: SafetyResponse,
    userId: string,
    coupleId: string
  ): Promise<CrisisIntervention> {
    const intervention: Omit<CrisisIntervention, 'id'> = {
      userId,
      coupleId,
      interventionType: this.getInterventionType(safetyResponse.interventionType),
      severity: this.mapSeverity(safetyResponse.severity),
      
      triggeredBy: {
        messageId: analysis.messageId,
        riskLevel: analysis.riskLevel,
        detectedIndicators: analysis.detectedIndicators.map(i => i.description),
        analysisScore: analysis.overallRiskScore
      },
      
      intervention: {
        title: safetyResponse.title,
        description: safetyResponse.message,
        actions: safetyResponse.suggestedActions.map(action => ({
          type: this.getActionType(action.action),
          description: action.description,
          completed: false
        })),
        resourcesProvided: safetyResponse.resources.map(this.mapSafetyResourceToCrisisResource)
      },
      
      professionalReview: {
        required: analysis.requiresHumanReview,
        assigned: false
      },
      
      userEngagement: {
        acknowledged: false,
        resourcesAccessed: [],
        followUpNeeded: safetyResponse.followUpNeeded
      },
      
      createdAt: new Date(),
      status: 'active',
      metadata: {
        privacyImpact: safetyResponse.privacyImpact,
        userCanDisable: safetyResponse.userCanDisable,
        analysisMethod: analysis.analysisMethod
      }
    }

    // Store in database
    const { data, error } = await this.supabase
      .from('crisis_interventions')
      .insert({
        user_id: intervention.userId,
        couple_id: intervention.coupleId,
        intervention_type: intervention.interventionType,
        severity_level: intervention.severity,
        triggered_by_message_id: intervention.triggeredBy.messageId,
        risk_level_detected: intervention.triggeredBy.riskLevel,
        detected_indicators: intervention.triggeredBy.detectedIndicators,
        analysis_score: intervention.triggeredBy.analysisScore,
        intervention_title: intervention.intervention.title,
        intervention_description: intervention.intervention.description,
        suggested_actions: intervention.intervention.actions,
        resources_provided: intervention.intervention.resourcesProvided,
        professional_review_required: intervention.professionalReview.required,
        user_acknowledged: intervention.userEngagement.acknowledged,
        follow_up_needed: intervention.userEngagement.followUpNeeded,
        status: intervention.status,
        metadata: intervention.metadata
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      id: data.id,
      ...intervention
    }
  }

  // Get crisis resources based on user location and crisis type
  async getCrisisResources(
    userId: string,
    crisisTypes: string[],
    includeLocalResources: boolean = true
  ): Promise<CrisisResource[]> {
    let query = this.supabase
      .from('crisis_resources_local')
      .select('*')
      .eq('is_active', true)
      .order('priority_order')

    // Filter by crisis types
    if (crisisTypes.length > 0) {
      query = query.contains('crisis_types_supported', crisisTypes)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    // Convert database records to CrisisResource format
    const resources: CrisisResource[] = (data || []).map(record => ({
      id: record.id,
      name: record.resource_name,
      type: record.resource_type as CrisisResource['type'],
      contactMethods: [
        ...(record.phone_number ? [{
          type: 'phone' as const,
          value: record.phone_number,
          primary: true
        }] : []),
        ...(record.text_number ? [{
          type: 'text' as const,
          value: record.text_number,
          primary: false
        }] : []),
        ...(record.website_url ? [{
          type: 'website' as const,
          value: record.website_url,
          primary: false
        }] : [])
      ],
      availability: {
        hours: record.availability_hours || '24/7',
        languages: record.languages_supported || ['English'],
        accessibility: record.accessibility_features || []
      },
      targeting: {
        geographic: {
          country: record.country_code || 'US',
          state: record.region_state,
          city: record.city
        },
        demographic: {
          lgbtqFriendly: record.lgbtq_friendly || false,
          culturalSpecialties: record.cultural_specialties || []
        },
        crisisTypes: record.crisis_types_supported || []
      },
      description: record.description,
      specializations: record.specializations || [],
      discreteAccess: record.discrete_access || false,
      verificationStatus: 'verified',
      qualityRating: record.quality_rating || 5,
      isActive: record.is_active,
      lastVerified: new Date(record.last_verified || record.created_at),
      addedBy: 'system',
      metadata: record.additional_metadata || {}
    }))

    // Always include national crisis resources
    const nationalResources = this.getNationalCrisisResources()
    
    return [...nationalResources, ...resources]
  }

  // Create or update a safety plan for a user
  async createOrUpdateSafetyPlan(
    userId: string,
    planData: Partial<CrisisSafetyPlan>,
    coupleId?: string
  ): Promise<CrisisSafetyPlan> {
    const existingPlan = await this.getUserSafetyPlan(userId)
    
    const safetyPlan: Omit<CrisisSafetyPlan, 'id'> = {
      userId,
      coupleId,
      warningSignsPersonal: planData.warningSignsPersonal || existingPlan?.warningSignsPersonal || [],
      warningSignsRelational: planData.warningSignsRelational || existingPlan?.warningSignsRelational || [],
      triggerSituations: planData.triggerSituations || existingPlan?.triggerSituations || [],
      copingStrategies: planData.copingStrategies || existingPlan?.copingStrategies || [],
      supportNetwork: planData.supportNetwork || existingPlan?.supportNetwork || [],
      professionalSupport: planData.professionalSupport || existingPlan?.professionalSupport || [],
      safetyMeasures: planData.safetyMeasures || existingPlan?.safetyMeasures || [],
      crisisContacts: planData.crisisContacts || existingPlan?.crisisContacts || await this.getCrisisResources(userId, ['crisis', 'suicide', 'emergency']),
      createdAt: existingPlan?.createdAt || new Date(),
      lastUpdated: new Date(),
      effectivenessRating: planData.effectivenessRating || existingPlan?.effectivenessRating,
      professionallyReviewed: planData.professionallyReviewed || existingPlan?.professionallyReviewed || false,
      reviewedBy: planData.reviewedBy || existingPlan?.reviewedBy,
      reviewedAt: planData.reviewedAt || existingPlan?.reviewedAt
    }

    // Store or update in database
    if (existingPlan) {
      const { data, error } = await this.supabase
        .from('crisis_safety_plans')
        .update({
          warning_signs_personal: safetyPlan.warningSignsPersonal,
          warning_signs_relational: safetyPlan.warningSignsRelational,
          trigger_situations: safetyPlan.triggerSituations,
          coping_strategies: safetyPlan.copingStrategies,
          support_network: safetyPlan.supportNetwork,
          professional_support: safetyPlan.professionalSupport,
          safety_measures: safetyPlan.safetyMeasures,
          crisis_contacts: safetyPlan.crisisContacts,
          last_updated: safetyPlan.lastUpdated.toISOString(),
          effectiveness_rating: safetyPlan.effectivenessRating,
          professionally_reviewed: safetyPlan.professionallyReviewed,
          reviewed_by: safetyPlan.reviewedBy,
          reviewed_at: safetyPlan.reviewedAt?.toISOString()
        })
        .eq('id', existingPlan.id)
        .select()
        .single()

      if (error) throw error
      return { id: data.id, ...safetyPlan }
    } else {
      const { data, error } = await this.supabase
        .from('crisis_safety_plans')
        .insert({
          user_id: safetyPlan.userId,
          couple_id: safetyPlan.coupleId,
          warning_signs_personal: safetyPlan.warningSignsPersonal,
          warning_signs_relational: safetyPlan.warningSignsRelational,
          trigger_situations: safetyPlan.triggerSituations,
          coping_strategies: safetyPlan.copingStrategies,
          support_network: safetyPlan.supportNetwork,
          professional_support: safetyPlan.professionalSupport,
          safety_measures: safetyPlan.safetyMeasures,
          crisis_contacts: safetyPlan.crisisContacts,
          created_at: safetyPlan.createdAt.toISOString(),
          last_updated: safetyPlan.lastUpdated.toISOString(),
          effectiveness_rating: safetyPlan.effectivenessRating,
          professionally_reviewed: safetyPlan.professionallyReviewed
        })
        .select()
        .single()

      if (error) throw error
      return { id: data.id, ...safetyPlan }
    }
  }

  // Get user's existing safety plan
  async getUserSafetyPlan(userId: string): Promise<CrisisSafetyPlan | null> {
    const { data, error } = await this.supabase
      .from('crisis_safety_plans')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No plan found
      throw error
    }

    return {
      id: data.id,
      userId: data.user_id,
      coupleId: data.couple_id,
      warningSignsPersonal: data.warning_signs_personal || [],
      warningSignsRelational: data.warning_signs_relational || [],
      triggerSituations: data.trigger_situations || [],
      copingStrategies: data.coping_strategies || [],
      supportNetwork: data.support_network || [],
      professionalSupport: data.professional_support || [],
      safetyMeasures: data.safety_measures || [],
      crisisContacts: data.crisis_contacts || [],
      createdAt: new Date(data.created_at),
      lastUpdated: new Date(data.last_updated),
      effectivenessRating: data.effectiveness_rating,
      professionallyReviewed: data.professionally_reviewed,
      reviewedBy: data.reviewed_by,
      reviewedAt: data.reviewed_at ? new Date(data.reviewed_at) : undefined
    }
  }

  // Schedule follow-up for crisis intervention
  async scheduleFollowUp(
    interventionId: string,
    followUpType: 'check_in' | 'resource_confirmation' | 'professional_review',
    scheduledFor: Date
  ): Promise<void> {
    await this.supabase
      .from('crisis_follow_ups')
      .insert({
        intervention_id: interventionId,
        follow_up_type: followUpType,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending'
      })
  }

  // Track resource access for transparency
  async trackResourceAccess(
    userId: string,
    resourceId: string,
    accessMethod: 'phone' | 'text' | 'website' | 'chat',
    interventionId?: string
  ): Promise<void> {
    await this.supabase
      .from('resource_access_log')
      .insert({
        user_id: userId,
        resource_id: resourceId,
        access_method: accessMethod,
        intervention_id: interventionId,
        accessed_at: new Date().toISOString()
      })
  }

  // Private helper methods
  private getInterventionType(responseType: SafetyResponse['interventionType']): CrisisIntervention['interventionType'] {
    switch (responseType) {
      case 'emergency_escalation':
      case 'crisis_resource_display':
        return 'immediate_crisis'
      case 'professional_referral':
        return 'escalated_concern'
      case 'resource_surfacing':
        return 'resource_provision'
      default:
        return 'follow_up'
    }
  }

  private mapSeverity(severity: SafetyResponse['severity']): CrisisIntervention['severity'] {
    switch (severity) {
      case 'emergency': return 'critical'
      case 'urgent': return 'high'
      case 'moderate': return 'medium'
      case 'gentle': return 'low'
      default: return 'low'
    }
  }

  private getActionType(actionText: string): 'resource_display' | 'professional_contact' | 'emergency_escalation' {
    if (actionText.toLowerCase().includes('call 911') || actionText.toLowerCase().includes('emergency')) {
      return 'emergency_escalation'
    } else if (actionText.toLowerCase().includes('professional') || actionText.toLowerCase().includes('therapist')) {
      return 'professional_contact'
    } else {
      return 'resource_display'
    }
  }

  private mapSafetyResourceToCrisisResource(resource: SafetyResponse['resources'][0]): CrisisResource {
    return {
      id: `safety-resource-${Date.now()}`,
      name: resource.name,
      type: resource.type as CrisisResource['type'],
      contactMethods: [{
        type: resource.contactMethod,
        value: resource.contact,
        primary: true
      }],
      availability: {
        hours: resource.availability,
        languages: ['English'],
        accessibility: []
      },
      targeting: {
        geographic: {},
        demographic: {},
        crisisTypes: []
      },
      description: resource.description,
      specializations: [],
      discreteAccess: resource.discrete || false,
      verificationStatus: 'verified',
      qualityRating: 5,
      isActive: true,
      lastVerified: new Date(),
      addedBy: 'system',
      metadata: {}
    }
  }

  private getNationalCrisisResources(): CrisisResource[] {
    return [
      {
        id: 'national-suicide-prevention',
        name: 'National Suicide Prevention Lifeline',
        type: 'crisis_hotline',
        contactMethods: [
          { type: 'phone', value: '988', primary: true },
          { type: 'chat', value: 'https://suicidepreventionlifeline.org/chat/', primary: false }
        ],
        availability: {
          hours: '24/7',
          languages: ['English', 'Spanish'],
          accessibility: ['TTY', 'Video Relay']
        },
        targeting: {
          geographic: { country: 'US' },
          demographic: {},
          crisisTypes: ['suicide', 'crisis', 'mental_health']
        },
        description: '24/7 crisis support and suicide prevention',
        specializations: ['suicide_prevention', 'crisis_intervention'],
        discreteAccess: false,
        verificationStatus: 'verified',
        qualityRating: 5,
        isActive: true,
        lastVerified: new Date(),
        addedBy: 'system',
        metadata: {}
      },
      {
        id: 'national-domestic-violence',
        name: 'National Domestic Violence Hotline',
        type: 'domestic_violence',
        contactMethods: [
          { type: 'phone', value: '1-800-799-7233', primary: true },
          { type: 'text', value: 'START to 88788', primary: false }
        ],
        availability: {
          hours: '24/7',
          languages: ['English', 'Spanish', '200+ languages via interpreters'],
          accessibility: ['TTY']
        },
        targeting: {
          geographic: { country: 'US' },
          demographic: { lgbtqFriendly: true },
          crisisTypes: ['domestic_violence', 'abuse', 'stalking']
        },
        description: '24/7 confidential support for domestic violence situations',
        specializations: ['domestic_violence', 'safety_planning'],
        discreteAccess: true,
        verificationStatus: 'verified',
        qualityRating: 5,
        isActive: true,
        lastVerified: new Date(),
        addedBy: 'system',
        metadata: {}
      }
    ]
  }
}

// Export singleton instance
export const crisisInterventionSystem = new CrisisInterventionSystem()

// Export types for other modules
export type {
  CrisisIntervention,
  CrisisResource,
  CrisisSafetyPlan
}