import { Agent, AgentType, AgentInput, AgentOutput, SafetyResult } from '../orchestration/types'
import { CrisisDetector } from '../crisis-detection/detector'

export class StandardSafetyAgent implements Agent {
  type: AgentType = 'safety'
  name = 'Standard Safety Validator'
  description = 'Crisis detection and safety screening using rule-based algorithms'
  capabilities = [
    'crisis-detection',
    'safety-screening', 
    'emergency-escalation',
    'risk-assessment'
  ]
  priority = 10 // Highest priority

  async process(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now()
    
    try {
      // Use our existing crisis detection system
      const crisisResult = await CrisisDetector.detectCrisis(
        input.message,
        input.userId,
        input.coupleId,
        input.metadata
      )

      const safetyResult: SafetyResult = {
        safetyLevel: crisisResult.severity,
        crisisIndicators: crisisResult.indicators,
        requiresImmediateIntervention: crisisResult.requiresImmediateIntervention,
        requiresReview: crisisResult.professionalReferralNeeded,
        reasoning: `Detected ${crisisResult.indicators.length} crisis indicators`,
        confidence: this.calculateConfidence(crisisResult.indicators)
      }

      return {
        agentType: this.type,
        result: safetyResult,
        confidence: safetyResult.confidence,
        requiresReview: safetyResult.requiresReview,
        processingTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        agentType: this.type,
        result: this.getFailsafeResult(),
        confidence: 0,
        requiresReview: true,
        processingTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  validate(input: AgentInput): boolean {
    return !!(input.userId && input.message && typeof input.message === 'string')
  }

  private calculateConfidence(indicators: any[]): number {
    if (indicators.length === 0) return 0.95 // High confidence in safety
    
    // Calculate confidence based on indicator types and severity
    const avgConfidence = indicators.reduce((sum, indicator) => 
      sum + (indicator.confidence || 0.5), 0
    ) / indicators.length
    
    return Math.min(avgConfidence, 0.99) // Cap at 99%
  }

  private getFailsafeResult(): SafetyResult {
    // In case of any error, assume the worst for safety
    return {
      safetyLevel: 'concern',
      crisisIndicators: [],
      requiresImmediateIntervention: false,
      requiresReview: true,
      reasoning: 'Safety analysis failed - requires human review',
      confidence: 0
    }
  }

  // Additional safety-specific methods
  async escalateToHuman(safetyResult: SafetyResult, input: AgentInput): Promise<void> {
    // Log the escalation
    console.log(`Safety escalation for user ${input.userId}:`, {
      level: safetyResult.safetyLevel,
      indicators: safetyResult.crisisIndicators.length,
      timestamp: new Date().toISOString()
    })

    // In a real implementation, this would:
    // 1. Alert human moderators
    // 2. Create incident ticket
    // 3. Potentially contact emergency services
    // 4. Update user's safety status in database
  }

  async generateSafetyPlan(safetyResult: SafetyResult, input: AgentInput): Promise<any> {
    if (safetyResult.safetyLevel === 'safe') {
      return null
    }

    // Generate safety plan based on crisis indicators
    const plan = {
      emergencyContacts: {
        'National Suicide Prevention Lifeline': '988',
        'Crisis Text Line': 'Text HOME to 741741',
        'National Domestic Violence Hotline': '1-800-799-7233',
        'Emergency Services': '911'
      },
      warningSignsIdentified: safetyResult.crisisIndicators.map(i => i.description),
      copingStrategies: this.getCopingStrategies(safetyResult.crisisIndicators),
      professionalReferrals: this.getProfessionalReferrals(safetyResult.safetyLevel),
      followUpRequired: safetyResult.requiresReview
    }

    return plan
  }

  private getCopingStrategies(indicators: any[]): string[] {
    const strategies = [
      'Deep breathing exercises (4-7-8 technique)',
      'Contact a trusted friend or family member',
      'Use grounding techniques (5-4-3-2-1 sensory method)',
      'Take a walk in a safe environment',
      'Listen to calming music',
      'Practice mindfulness or meditation'
    ]

    // Add specific strategies based on indicators
    const hasViolenceIndicators = indicators.some(i => 
      i.triggeredBy.includes('violence') || i.triggeredBy.includes('threat')
    )
    
    if (hasViolenceIndicators) {
      strategies.unshift('Remove yourself from unsafe situations immediately')
      strategies.unshift('Have an escape plan ready')
    }

    return strategies
  }

  private getProfessionalReferrals(safetyLevel: string): string[] {
    const baseReferrals = [
      'Licensed therapist or counselor',
      'Mental health professional',
      'Employee Assistance Program (if available)'
    ]

    if (safetyLevel === 'crisis' || safetyLevel === 'critical') {
      baseReferrals.unshift('Emergency room or crisis center')
      baseReferrals.unshift('Crisis intervention team')
    }

    return baseReferrals
  }
}