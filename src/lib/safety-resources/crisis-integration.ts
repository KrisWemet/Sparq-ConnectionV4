// Integration between crisis detection system and comprehensive safety resources
// Provides seamless flow from crisis detection to resource provision

import { CrisisDetector, CrisisDetectionResult, CrisisIndicator } from '@/lib/crisis-detection/detector'
import { globalResourceRegistry, CrisisResource } from './global-resource-registry'
import { locationBasedResourceMatcher, UserLocation, ResourceMatchResult } from './location-matcher'
import { COMPREHENSIVE_LEGAL_CONTEXT, LegalContext } from '@/components/safety-support/LegalSafetyFramework'

export interface CrisisResourceIntegration {
  crisisResult: CrisisDetectionResult
  resourceMatches: ResourceMatchResult[]
  safetyPlanRecommendations: SafetyPlanRecommendation[]
  interventionPlan: InterventionPlan
  legalContext: LegalContext
  followUpSchedule: FollowUpSchedule
}

export interface SafetyPlanRecommendation {
  priority: 'immediate' | 'urgent' | 'high' | 'medium' | 'low'
  category: 'emergency_contacts' | 'safe_places' | 'coping_strategies' | 'warning_signs' | 'professional_support'
  recommendation: string
  reasoning: string
  resourcesNeeded: string[]
}

export interface InterventionPlan {
  immediateActions: Array<{
    action: string
    timeframe: 'immediate' | 'within_1hr' | 'within_24hr'
    responsibility: 'user' | 'platform' | 'professional'
    resources: CrisisResource[]
  }>
  mediumTermActions: Array<{
    action: string
    timeframe: string
    resources: CrisisResource[]
  }>
  monitoring: {
    frequency: 'continuous' | 'hourly' | 'daily' | 'weekly'
    indicators: string[]
    escalationTriggers: string[]
  }
}

export interface FollowUpSchedule {
  checkIns: Array<{
    timeframe: string
    method: 'platform_prompt' | 'resource_referral' | 'professional_contact'
    priority: 'critical' | 'high' | 'medium' | 'low'
  }>
  resourceReviews: Array<{
    timeframe: string
    purpose: string
  }>
}

export class CrisisResourceIntegrator {
  /**
   * Main integration function - combines crisis detection with resource provision
   */
  static async integrateCrisisWithResources(
    input: string,
    userId: string,
    userLocation: UserLocation,
    coupleId?: string,
    additionalContext?: Record<string, any>
  ): Promise<CrisisResourceIntegration> {
    
    // Step 1: Run crisis detection
    const crisisResult = await CrisisDetector.detectCrisis(
      input, 
      userId, 
      coupleId, 
      additionalContext
    )

    // Step 2: Get relevant resources based on crisis type and location
    const resourceMatches = await this.getRelevantResourcesForCrisis(
      crisisResult,
      userLocation
    )

    // Step 3: Generate safety plan recommendations
    const safetyPlanRecommendations = this.generateSafetyPlanRecommendations(
      crisisResult,
      resourceMatches
    )

    // Step 4: Create intervention plan
    const interventionPlan = this.createInterventionPlan(
      crisisResult,
      resourceMatches
    )

    // Step 5: Schedule follow-up
    const followUpSchedule = this.generateFollowUpSchedule(crisisResult)

    // Step 6: Prepare legal context
    const legalContext = this.getLegalContextForCrisis(crisisResult)

    return {
      crisisResult,
      resourceMatches,
      safetyPlanRecommendations,
      interventionPlan,
      legalContext,
      followUpSchedule
    }
  }

  /**
   * Get resources specifically relevant to the detected crisis
   */
  private static async getRelevantResourcesForCrisis(
    crisisResult: CrisisDetectionResult,
    userLocation: UserLocation
  ): Promise<ResourceMatchResult[]> {
    
    if (crisisResult.severity === 'critical') {
      // For critical situations, prioritize emergency resources
      return await locationBasedResourceMatcher.getEmergencyResources(userLocation)
    }

    // Determine resource types needed based on crisis indicators
    const neededResourceTypes = this.determineNeededResourceTypes(crisisResult.indicators)
    
    // Get location-based resources for these types
    const resourceMatches = await locationBasedResourceMatcher.findRelevantResources(
      userLocation,
      neededResourceTypes,
      {
        maxResults: 15,
        prioritizeCrisis: crisisResult.severity === 'high',
        includeNational: true,
        includeLocal: true
      }
    )

    // Add specialized resources based on crisis patterns
    const specializedResources = await this.getSpecializedResources(
      crisisResult.indicators,
      userLocation
    )

    // Combine and deduplicate
    const allMatches = [...resourceMatches, ...specializedResources]
    const uniqueMatches = this.deduplicateResources(allMatches)

    // Sort by relevance to crisis
    return this.sortResourcesByCrisisRelevance(uniqueMatches, crisisResult)
  }

  /**
   * Determine what types of resources are needed based on crisis indicators
   */
  private static determineNeededResourceTypes(
    indicators: CrisisIndicator[]
  ): CrisisResource['resourceType'][] {
    const resourceTypes: Set<CrisisResource['resourceType']> = new Set()

    for (const indicator of indicators) {
      switch (indicator.severity) {
        case 'critical':
          resourceTypes.add('crisis_hotline')
          resourceTypes.add('emergency_services')
          break
        case 'high':
          resourceTypes.add('crisis_hotline')
          resourceTypes.add('mental_health')
          break
        case 'medium':
          resourceTypes.add('mental_health')
          resourceTypes.add('relationship_counseling')
          break
      }

      // Check for specific patterns
      if (indicator.triggeredBy.includes('domestic') || 
          indicator.triggeredBy.includes('violence') ||
          indicator.triggeredBy.includes('afraid') ||
          indicator.triggeredBy.includes('threatens')) {
        resourceTypes.add('domestic_violence')
      }

      if (indicator.triggeredBy.includes('drinking') || 
          indicator.triggeredBy.includes('drugs') ||
          indicator.triggeredBy.includes('addiction')) {
        resourceTypes.add('substance_abuse')
      }
    }

    return Array.from(resourceTypes)
  }

  /**
   * Get specialized resources for specific crisis patterns
   */
  private static async getSpecializedResources(
    indicators: CrisisIndicator[],
    userLocation: UserLocation
  ): Promise<ResourceMatchResult[]> {
    const specializedMatches: ResourceMatchResult[] = []

    // Check for domestic violence indicators
    const hasDVIndicators = indicators.some(i => 
      i.triggeredBy.includes('threatens') || 
      i.triggeredBy.includes('hits') ||
      i.triggeredBy.includes('afraid') ||
      i.triggeredBy.includes('controls')
    )

    if (hasDVIndicators) {
      const dvResources = await locationBasedResourceMatcher.getDVResources(userLocation)
      specializedMatches.push(...dvResources)
    }

    return specializedMatches
  }

  /**
   * Generate comprehensive safety plan recommendations
   */
  private static generateSafetyPlanRecommendations(
    crisisResult: CrisisDetectionResult,
    resourceMatches: ResourceMatchResult[]
  ): SafetyPlanRecommendation[] {
    const recommendations: SafetyPlanRecommendation[] = []

    // Emergency contacts based on crisis type
    recommendations.push({
      priority: crisisResult.severity === 'critical' ? 'immediate' : 'urgent',
      category: 'emergency_contacts',
      recommendation: 'Add crisis hotlines to emergency contacts',
      reasoning: `Crisis severity: ${crisisResult.severity}. Immediate access to professional support needed.`,
      resourcesNeeded: resourceMatches
        .filter(m => m.resource.resourceType === 'crisis_hotline')
        .slice(0, 3)
        .map(m => m.resource.name)
    })

    // Warning signs identification
    recommendations.push({
      priority: 'high',
      category: 'warning_signs',
      recommendation: 'Document current crisis indicators',
      reasoning: 'Recognizing early warning signs helps prevent crisis escalation.',
      resourcesNeeded: crisisResult.indicators.map(i => i.description)
    })

    // Coping strategies
    recommendations.push({
      priority: 'high',
      category: 'coping_strategies',
      recommendation: 'Develop immediate coping strategies',
      reasoning: 'Having ready coping strategies reduces crisis intensity and duration.',
      resourcesNeeded: this.generateCopingStrategies(crisisResult.indicators)
    })

    // Professional support
    if (crisisResult.professionalReferralNeeded) {
      recommendations.push({
        priority: 'urgent',
        category: 'professional_support',
        recommendation: 'Schedule professional consultation within 24-48 hours',
        reasoning: 'Professional intervention needed for current crisis level.',
        resourcesNeeded: resourceMatches
          .filter(m => m.resource.professionalStaffed)
          .slice(0, 5)
          .map(m => m.resource.name)
      })
    }

    // Safe places (especially for DV situations)
    const hasDVIndicators = crisisResult.indicators.some(i => 
      i.type === 'pattern' && i.severity === 'critical'
    )

    if (hasDVIndicators) {
      recommendations.push({
        priority: 'immediate',
        category: 'safe_places',
        recommendation: 'Identify multiple safe locations',
        reasoning: 'Safety concerns require readily available safe spaces.',
        resourcesNeeded: resourceMatches
          .filter(m => m.resource.resourceType === 'domestic_violence')
          .map(m => m.resource.name)
      })
    }

    return recommendations
  }

  /**
   * Create comprehensive intervention plan
   */
  private static createInterventionPlan(
    crisisResult: CrisisDetectionResult,
    resourceMatches: ResourceMatchResult[]
  ): InterventionPlan {
    const plan: InterventionPlan = {
      immediateActions: [],
      mediumTermActions: [],
      monitoring: {
        frequency: 'daily',
        indicators: crisisResult.indicators.map(i => i.description),
        escalationTriggers: []
      }
    }

    // Immediate actions based on severity
    if (crisisResult.severity === 'critical') {
      plan.immediateActions.push({
        action: 'Contact crisis hotline or emergency services',
        timeframe: 'immediate',
        responsibility: 'user',
        resources: resourceMatches.filter(m => m.resource.resourceType === 'crisis_hotline').slice(0, 2).map(m => m.resource)
      })

      plan.immediateActions.push({
        action: 'Remove access to means of harm',
        timeframe: 'immediate',
        responsibility: 'user',
        resources: []
      })

      plan.monitoring.frequency = 'continuous'
    }

    if (crisisResult.severity === 'high' || crisisResult.severity === 'critical') {
      plan.immediateActions.push({
        action: 'Create safety plan using platform tools',
        timeframe: 'within_1hr',
        responsibility: 'user',
        resources: []
      })

      plan.immediateActions.push({
        action: 'Contact professional support within 24 hours',
        timeframe: 'within_24hr',
        responsibility: 'user',
        resources: resourceMatches.filter(m => m.resource.professionalStaffed).slice(0, 3).map(m => m.resource)
      })
    }

    // Medium-term actions
    plan.mediumTermActions.push({
      action: 'Schedule ongoing professional support',
      timeframe: '3-7 days',
      resources: resourceMatches.filter(m => 
        m.resource.resourceType === 'mental_health' || 
        m.resource.resourceType === 'relationship_counseling'
      ).slice(0, 5).map(m => m.resource)
    })

    plan.mediumTermActions.push({
      action: 'Review and update safety plan',
      timeframe: '1 week',
      resources: []
    })

    // Escalation triggers
    plan.monitoring.escalationTriggers = [
      'Increase in crisis indicator frequency',
      'New critical keywords detected',
      'User reports worsening condition',
      'Safety concerns identified'
    ]

    return plan
  }

  /**
   * Generate follow-up schedule based on crisis severity
   */
  private static generateFollowUpSchedule(crisisResult: CrisisDetectionResult): FollowUpSchedule {
    const schedule: FollowUpSchedule = {
      checkIns: [],
      resourceReviews: []
    }

    switch (crisisResult.severity) {
      case 'critical':
        schedule.checkIns = [
          { timeframe: '2 hours', method: 'platform_prompt', priority: 'critical' },
          { timeframe: '6 hours', method: 'platform_prompt', priority: 'critical' },
          { timeframe: '24 hours', method: 'resource_referral', priority: 'critical' },
          { timeframe: '3 days', method: 'professional_contact', priority: 'high' }
        ]
        break

      case 'high':
        schedule.checkIns = [
          { timeframe: '6 hours', method: 'platform_prompt', priority: 'high' },
          { timeframe: '24 hours', method: 'platform_prompt', priority: 'high' },
          { timeframe: '3 days', method: 'resource_referral', priority: 'medium' },
          { timeframe: '1 week', method: 'platform_prompt', priority: 'medium' }
        ]
        break

      case 'medium':
        schedule.checkIns = [
          { timeframe: '24 hours', method: 'platform_prompt', priority: 'medium' },
          { timeframe: '3 days', method: 'platform_prompt', priority: 'medium' },
          { timeframe: '1 week', method: 'resource_referral', priority: 'low' }
        ]
        break

      default:
        schedule.checkIns = [
          { timeframe: '3 days', method: 'platform_prompt', priority: 'low' }
        ]
    }

    // Resource reviews
    schedule.resourceReviews = [
      { timeframe: '1 week', purpose: 'Verify resource contacts and availability' },
      { timeframe: '1 month', purpose: 'Update resource preferences and effectiveness' }
    ]

    return schedule
  }

  /**
   * Get appropriate legal context based on crisis type
   */
  private static getLegalContextForCrisis(crisisResult: CrisisDetectionResult): LegalContext {
    const baseContext = { ...COMPREHENSIVE_LEGAL_CONTEXT }

    // Modify context based on crisis severity
    if (crisisResult.severity === 'critical') {
      baseContext.emergencyNote = 'IMMEDIATE EMERGENCY: If you are in immediate danger, call 911 now. This platform cannot provide emergency intervention.'
      baseContext.disclaimer = 'CRITICAL: This platform provides resource information only. For immediate crisis intervention, contact emergency services or crisis hotlines directly.'
    }

    // Add specific notices for domestic violence
    const hasDVIndicators = crisisResult.indicators.some(i => 
      i.triggeredBy.includes('threatens') || 
      i.triggeredBy.includes('violence') ||
      i.triggeredBy.includes('afraid')
    )

    if (hasDVIndicators) {
      baseContext.privacyNotice += ' SAFETY NOTE: Your browsing history and data usage may be monitored by others. Use discrete access methods and consider using a safe device.'
      baseContext.noAutomation += ' We will never contact your partner or family members, as this could potentially increase your risk.'
    }

    return baseContext
  }

  /**
   * Helper functions
   */
  private static generateCopingStrategies(indicators: CrisisIndicator[]): string[] {
    const strategies = [
      'Deep breathing exercises (4-7-8 technique)',
      'Grounding techniques (5-4-3-2-1 sensory method)',
      'Progressive muscle relaxation',
      'Call a trusted friend or family member',
      'Write in a journal',
      'Listen to calming music',
      'Take a warm bath or shower',
      'Go for a walk in a safe area'
    ]

    // Add specific strategies for specific crisis types
    const hasAnxietyIndicators = indicators.some(i => 
      i.triggeredBy.includes('anxious') || i.triggeredBy.includes('panic')
    )

    if (hasAnxietyIndicators) {
      strategies.push(
        'Practice box breathing',
        'Use mindfulness meditation apps',
        'Try gentle stretching or yoga'
      )
    }

    const hasDepressionIndicators = indicators.some(i => 
      i.triggeredBy.includes('hopeless') || i.triggeredBy.includes('worthless')
    )

    if (hasDepressionIndicators) {
      strategies.push(
        'Engage in small, achievable activities',
        'Spend time in natural light',
        'Practice self-compassion exercises',
        'Connect with supportive people'
      )
    }

    return strategies
  }

  private static deduplicateResources(matches: ResourceMatchResult[]): ResourceMatchResult[] {
    const seen = new Set<string>()
    return matches.filter(match => {
      if (seen.has(match.resource.id)) {
        return false
      }
      seen.add(match.resource.id)
      return true
    })
  }

  private static sortResourcesByCrisisRelevance(
    matches: ResourceMatchResult[],
    crisisResult: CrisisDetectionResult
  ): ResourceMatchResult[] {
    return matches.sort((a, b) => {
      // Prioritize resources that match crisis severity
      if (crisisResult.severity === 'critical') {
        if (a.resource.crisisSpecific && !b.resource.crisisSpecific) return -1
        if (!a.resource.crisisSpecific && b.resource.crisisSpecific) return 1
      }

      // Prioritize 24/7 availability for higher severity
      if (crisisResult.severity === 'high' || crisisResult.severity === 'critical') {
        const aIs24h = a.resource.availability.schedule === '24/7'
        const bIs24h = b.resource.availability.schedule === '24/7'
        if (aIs24h && !bIs24h) return -1
        if (!aIs24h && bIs24h) return 1
      }

      // Then sort by relevance score
      return b.relevanceScore - a.relevanceScore
    })
  }
}

/**
 * Crisis response coordinator - orchestrates the complete response workflow
 */
export class CrisisResponseCoordinator {
  static async handleCrisisDetection(
    input: string,
    userId: string,
    userLocation: UserLocation,
    coupleId?: string,
    additionalContext?: Record<string, any>
  ): Promise<{
    integration: CrisisResourceIntegration
    recommendedActions: Array<{
      type: 'immediate' | 'urgent' | 'medium_term'
      action: string
      resources: CrisisResource[]
    }>
    userInterface: {
      showEmergencyResources: boolean
      showSafetyPlanBuilder: boolean
      showResourceDirectory: boolean
      showDiscreteAccess: boolean
      emergencyExitAvailable: boolean
    }
  }> {
    
    // Get comprehensive integration
    const integration = await CrisisResourceIntegrator.integrateCrisisWithResources(
      input,
      userId,
      userLocation,
      coupleId,
      additionalContext
    )

    // Determine recommended actions
    const recommendedActions = this.generateUserActions(integration)

    // Determine UI state
    const userInterface = this.determineUIState(integration.crisisResult)

    // Log crisis event (existing functionality)
    if (coupleId && integration.crisisResult.hasCrisisIndicators) {
      await CrisisDetector.logCrisisEvent(
        coupleId,
        integration.crisisResult,
        'ai_system'
      )
    }

    return {
      integration,
      recommendedActions,
      userInterface
    }
  }

  private static generateUserActions(
    integration: CrisisResourceIntegration
  ): Array<{
    type: 'immediate' | 'urgent' | 'medium_term'
    action: string
    resources: CrisisResource[]
  }> {
    const actions = []

    // Map intervention plan to user actions
    for (const immediateAction of integration.interventionPlan.immediateActions) {
      actions.push({
        type: immediateAction.timeframe === 'immediate' ? 'immediate' : 'urgent',
        action: immediateAction.action,
        resources: immediateAction.resources
      })
    }

    for (const mediumAction of integration.interventionPlan.mediumTermActions) {
      actions.push({
        type: 'medium_term' as const,
        action: mediumAction.action,
        resources: mediumAction.resources
      })
    }

    return actions
  }

  private static determineUIState(crisisResult: CrisisDetectionResult): {
    showEmergencyResources: boolean
    showSafetyPlanBuilder: boolean
    showResourceDirectory: boolean
    showDiscreteAccess: boolean
    emergencyExitAvailable: boolean
  } {
    return {
      showEmergencyResources: crisisResult.severity === 'critical' || crisisResult.severity === 'high',
      showSafetyPlanBuilder: crisisResult.severity === 'high' || crisisResult.severity === 'critical',
      showResourceDirectory: crisisResult.hasCrisisIndicators,
      showDiscreteAccess: crisisResult.indicators.some(i => 
        i.triggeredBy.includes('threatens') || 
        i.triggeredBy.includes('violence') ||
        i.triggeredBy.includes('afraid')
      ),
      emergencyExitAvailable: crisisResult.severity === 'high' || crisisResult.severity === 'critical'
    }
  }
}

// Export main integration function for easy use
export async function detectCrisisAndProvideResources(
  input: string,
  userId: string,
  userLocation: UserLocation,
  coupleId?: string,
  additionalContext?: Record<string, any>
) {
  return await CrisisResponseCoordinator.handleCrisisDetection(
    input,
    userId,
    userLocation,
    coupleId,
    additionalContext
  )
}