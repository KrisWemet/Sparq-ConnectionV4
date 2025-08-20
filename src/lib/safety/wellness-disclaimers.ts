// Comprehensive safety and disclaimer system for AI-generated relationship content
import { CrisisDetector, CrisisDetectionResult } from '../crisis-detection/detector'

export interface WellnessDisclaimer {
  primary: string
  detailed: string
  crisisResources: CrisisResource[]
  scope: 'educational' | 'wellness' | 'general'
  severity: 'standard' | 'elevated' | 'crisis'
}

export interface CrisisResource {
  name: string
  phone?: string
  text?: string
  website?: string
  description: string
  availability: string
  type: 'crisis_hotline' | 'domestic_violence' | 'mental_health' | 'emergency'
}

export interface SafetyValidationResult {
  isApproved: boolean
  disclaimerLevel: 'standard' | 'enhanced' | 'crisis_override'
  requiredDisclaimer: WellnessDisclaimer
  safetyNotes: string[]
  crisisDetection: CrisisDetectionResult
  professionalReferralRequired: boolean
  requiresHumanReview: boolean
}

// Standard crisis resources always available
const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: 'National Suicide Prevention Lifeline',
    phone: '988',
    description: '24/7 crisis support for suicide prevention',
    availability: '24/7',
    type: 'crisis_hotline'
  },
  {
    name: 'Crisis Text Line',
    text: 'HOME to 741741',
    description: 'Free crisis support via text message',
    availability: '24/7',
    type: 'crisis_hotline'
  },
  {
    name: 'National Domestic Violence Hotline',
    phone: '1-800-799-7233',
    text: 'START to 88788',
    description: 'Support for domestic violence situations',
    availability: '24/7',
    type: 'domestic_violence'
  },
  {
    name: 'SAMHSA National Helpline',
    phone: '1-800-662-4357',
    description: 'Mental health and substance abuse support',
    availability: '24/7',
    type: 'mental_health'
  },
  {
    name: 'Emergency Services',
    phone: '911',
    description: 'Emergency medical, fire, and police services',
    availability: '24/7',
    type: 'emergency'
  }
]

// Standard disclaimers for different content types
const STANDARD_DISCLAIMERS = {
  daily_prompt: {
    primary: "💡 This is an AI-generated wellness suggestion for educational purposes only, not professional relationship advice.",
    detailed: `This platform provides relationship wellness education based on evidence-based research, including principles from the Gottman Method and other established relationship science. This content is:

• For educational and wellness purposes only
• Not intended as a substitute for professional therapy or counseling
• Not medical or psychological advice
• Not appropriate for crisis situations

If you're experiencing relationship distress, consider speaking with a licensed couples therapist. For crisis situations, please contact professional support services immediately.`,
    scope: 'educational' as const
  },
  
  assessment: {
    primary: "📋 This is a wellness assessment for educational self-reflection, not a clinical evaluation.",
    detailed: `This assessment provides educational insights about relationship patterns and is not:

• A clinical diagnosis or evaluation
• A substitute for professional assessment
• Medical or psychological testing
• Appropriate for making major life decisions

Results are for personal reflection and learning. For professional relationship assessment, consult a licensed mental health professional.`,
    scope: 'wellness' as const
  },
  
  guidance: {
    primary: "🌟 This is educational guidance based on relationship research, not professional counseling.",
    detailed: `This guidance is based on evidence-based relationship research and is intended for:

• Educational purposes and skill development
• General relationship wellness information
• Personal growth and reflection

This guidance is not intended as professional therapy, counseling, or crisis intervention. For personalized professional support, please consult with a licensed relationship professional.`,
    scope: 'educational' as const
  }
}

export class WellnessDisclaimerSystem {
  
  /**
   * Validate content for safety and generate appropriate disclaimers
   */
  async validateContentSafety(
    content: string,
    userId: string,
    contentType: 'daily_prompt' | 'assessment' | 'guidance' | 'general',
    coupleId?: string,
    additionalContext?: any
  ): Promise<SafetyValidationResult> {
    
    // Step 1: Run crisis detection on the content
    const crisisDetection = await CrisisDetector.detectCrisis(
      content,
      userId,
      coupleId,
      additionalContext
    )

    // Step 2: Determine safety level and disclaimer requirements
    const disclaimerLevel = this.determinedDisclaimerLevel(crisisDetection)
    const requiredDisclaimer = this.generateDisclaimer(contentType, disclaimerLevel, crisisDetection)

    // Step 3: Check if content should be approved for delivery
    const isApproved = this.shouldApproveContent(crisisDetection)
    
    // Step 4: Determine if professional referral is needed
    const professionalReferralRequired = crisisDetection.severity === 'high' || crisisDetection.severity === 'critical'
    
    // Step 5: Determine if human review is required
    const requiresHumanReview = crisisDetection.requiresImmediateIntervention || 
                                 crisisDetection.severity === 'critical' ||
                                 disclaimerLevel === 'crisis_override'

    // Step 6: Generate safety notes
    const safetyNotes = this.generateSafetyNotes(crisisDetection, contentType)

    return {
      isApproved,
      disclaimerLevel,
      requiredDisclaimer,
      safetyNotes,
      crisisDetection,
      professionalReferralRequired,
      requiresHumanReview
    }
  }

  /**
   * Generate comprehensive disclaimer based on content type and safety level
   */
  private generateDisclaimer(
    contentType: string,
    disclaimerLevel: 'standard' | 'enhanced' | 'crisis_override',
    crisisDetection: CrisisDetectionResult
  ): WellnessDisclaimer {
    
    const baseDisclaimer = STANDARD_DISCLAIMERS[contentType as keyof typeof STANDARD_DISCLAIMERS] || 
                          STANDARD_DISCLAIMERS.daily_prompt

    if (disclaimerLevel === 'crisis_override') {
      return {
        primary: "⚠️ We want to ensure your safety and wellbeing. Please consider reaching out to a mental health professional or crisis support service.",
        detailed: `We've detected indicators that suggest you may be experiencing distress. This platform provides wellness education, not crisis intervention.

For immediate support, please contact:
• Crisis support: 988 (Suicide & Crisis Lifeline)
• Emergency services: 911
• Domestic violence support: 1-800-799-7233

Your safety and wellbeing are our priority. Please reach out to appropriate professional support.`,
        crisisResources: CRISIS_RESOURCES,
        scope: 'wellness',
        severity: 'crisis'
      }
    }

    if (disclaimerLevel === 'enhanced') {
      return {
        primary: baseDisclaimer.primary + " Given your current situation, we especially encourage professional support.",
        detailed: baseDisclaimer.detailed + `

Given the context of your interaction, we particularly recommend considering:
• Speaking with a licensed mental health professional
• Contacting your healthcare provider
• Reaching out to relationship support services

Remember: You deserve support, and help is available.`,
        crisisResources: CRISIS_RESOURCES.filter(r => r.type === 'mental_health' || r.type === 'crisis_hotline'),
        scope: baseDisclaimer.scope,
        severity: 'elevated'
      }
    }

    // Standard disclaimer
    return {
      primary: baseDisclaimer.primary,
      detailed: baseDisclaimer.detailed,
      crisisResources: CRISIS_RESOURCES.filter(r => r.type === 'crisis_hotline'),
      scope: baseDisclaimer.scope,
      severity: 'standard'
    }
  }

  /**
   * Determine the appropriate disclaimer level based on crisis detection
   */
  private determinedDisclaimerLevel(
    crisisDetection: CrisisDetectionResult
  ): 'standard' | 'enhanced' | 'crisis_override' {
    
    if (crisisDetection.requiresImmediateIntervention || crisisDetection.severity === 'critical') {
      return 'crisis_override'
    }

    if (crisisDetection.severity === 'high' || crisisDetection.severity === 'medium') {
      return 'enhanced'
    }

    return 'standard'
  }

  /**
   * Determine if content should be approved for delivery to user
   */
  private shouldApproveContent(crisisDetection: CrisisDetectionResult): boolean {
    // Never approve content if immediate intervention is required
    if (crisisDetection.requiresImmediateIntervention) {
      return false
    }

    // Don't approve regular content for critical situations
    if (crisisDetection.severity === 'critical') {
      return false
    }

    // All other content can be approved with appropriate disclaimers
    return true
  }

  /**
   * Generate safety notes for logging and review
   */
  private generateSafetyNotes(
    crisisDetection: CrisisDetectionResult,
    contentType: string
  ): string[] {
    const notes: string[] = []

    if (crisisDetection.hasCrisisIndicators) {
      notes.push(`Crisis indicators detected: ${crisisDetection.severity} severity`)
      
      for (const indicator of crisisDetection.indicators) {
        notes.push(`${indicator.type}: ${indicator.description} (confidence: ${indicator.confidence})`)
      }
    }

    if (crisisDetection.requiresImmediateIntervention) {
      notes.push('IMMEDIATE INTERVENTION REQUIRED - Content delivery blocked')
    }

    if (crisisDetection.professionalReferralNeeded) {
      notes.push('Professional referral recommended')
    }

    notes.push(`Content type: ${contentType}`)
    notes.push(`Safety validation completed at: ${new Date().toISOString()}`)

    return notes
  }

  /**
   * Generate crisis intervention response (used when content is blocked)
   */
  generateCrisisResponse(crisisDetection: CrisisDetectionResult): {
    title: string
    message: string
    resources: CrisisResource[]
    immediateActions: string[]
  } {
    
    const resourcesNeeded = this.selectCrisisResources(crisisDetection)
    
    return {
      title: 'Safety Support Available',
      message: 'We want to ensure your safety and wellbeing. If you\'re experiencing distress, please consider reaching out to a mental health professional or crisis support service.',
      resources: resourcesNeeded,
      immediateActions: [
        'Contact a crisis support service if you\'re in immediate distress',
        'Reach out to a trusted friend, family member, or professional',
        'Consider contacting your healthcare provider',
        'Remember: You deserve support, and help is available'
      ]
    }
  }

  /**
   * Select appropriate crisis resources based on detected indicators
   */
  private selectCrisisResources(crisisDetection: CrisisDetectionResult): CrisisResource[] {
    const selectedResources: CrisisResource[] = []

    // Always include suicide prevention for critical situations
    if (crisisDetection.severity === 'critical' || crisisDetection.requiresImmediateIntervention) {
      selectedResources.push(
        CRISIS_RESOURCES.find(r => r.name === 'National Suicide Prevention Lifeline')!,
        CRISIS_RESOURCES.find(r => r.name === 'Crisis Text Line')!,
        CRISIS_RESOURCES.find(r => r.name === 'Emergency Services')!
      )
    }

    // Check for domestic violence indicators
    const hasDVIndicators = crisisDetection.indicators.some(indicator => 
      indicator.description.toLowerCase().includes('violence') ||
      indicator.description.toLowerCase().includes('abuse') ||
      indicator.triggeredBy.includes('threatens') ||
      indicator.triggeredBy.includes('afraid')
    )

    if (hasDVIndicators) {
      selectedResources.push(
        CRISIS_RESOURCES.find(r => r.name === 'National Domestic Violence Hotline')!
      )
    }

    // Add mental health resources for medium/high severity
    if (crisisDetection.severity === 'high' || crisisDetection.severity === 'medium') {
      selectedResources.push(
        CRISIS_RESOURCES.find(r => r.name === 'SAMHSA National Helpline')!
      )
    }

    // Ensure we always have at least basic crisis support
    if (selectedResources.length === 0) {
      selectedResources.push(
        CRISIS_RESOURCES.find(r => r.name === 'National Suicide Prevention Lifeline')!,
        CRISIS_RESOURCES.find(r => r.name === 'Crisis Text Line')!
      )
    }

    return selectedResources
  }

  /**
   * Format disclaimer for UI display
   */
  formatDisclaimerForUI(disclaimer: WellnessDisclaimer, compact: boolean = false): {
    text: string
    resources: CrisisResource[]
    severity: string
  } {
    
    const text = compact ? disclaimer.primary : disclaimer.detailed
    
    return {
      text,
      resources: disclaimer.crisisResources,
      severity: disclaimer.severity
    }
  }

  /**
   * Log safety validation for audit and improvement
   */
  async logSafetyValidation(
    validationResult: SafetyValidationResult,
    userId: string,
    contentType: string,
    content: string
  ): Promise<void> {
    
    // In a real implementation, this would log to the audit system
    const logEntry = {
      userId,
      contentType,
      timestamp: new Date().toISOString(),
      safetyResult: {
        approved: validationResult.isApproved,
        disclaimerLevel: validationResult.disclaimerLevel,
        crisisSeverity: validationResult.crisisDetection.severity,
        requiresReview: validationResult.requiresHumanReview,
        professionalReferral: validationResult.professionalReferralRequired
      },
      indicators: validationResult.crisisDetection.indicators.map(i => ({
        type: i.type,
        severity: i.severity,
        confidence: i.confidence
      })),
      contentHash: this.hashContent(content) // Don't log actual content for privacy
    }

    console.log('Safety validation logged:', logEntry)
    
    // In production, this would be stored in the audit_log table
    // await supabase.from('audit_log').insert({
    //   action_type: 'safety_validation',
    //   resource_type: 'ai_content',
    //   details: logEntry,
    //   environment: 'production'
    // })
  }

  private hashContent(content: string): string {
    // Simple hash for content identification without storing actual content
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }
}

// Export singleton instance
export const wellnessDisclaimerSystem = new WellnessDisclaimerSystem()

// Export utility functions
export function getStandardDisclaimer(contentType: string): string {
  const disclaimer = STANDARD_DISCLAIMERS[contentType as keyof typeof STANDARD_DISCLAIMERS]
  return disclaimer?.primary || STANDARD_DISCLAIMERS.daily_prompt.primary
}

export function getCrisisResources(types?: CrisisResource['type'][]): CrisisResource[] {
  if (!types) return CRISIS_RESOURCES
  return CRISIS_RESOURCES.filter(resource => types.includes(resource.type))
}

// Export types for other modules
export type { WellnessDisclaimer, CrisisResource, SafetyValidationResult }