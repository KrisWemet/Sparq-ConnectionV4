import { Database } from '@/types/database.types'

type CrisisLog = Database['public']['Tables']['crisis_logs']['Row']
type CrisisInsert = Database['public']['Tables']['crisis_logs']['Insert']

export interface CrisisIndicator {
  type: 'keyword' | 'pattern' | 'behavioral' | 'assessment_score'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  confidence: number
  triggeredBy: string
}

export interface CrisisDetectionResult {
  hasCrisisIndicators: boolean
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical'
  indicators: CrisisIndicator[]
  recommendedActions: string[]
  requiresImmediateIntervention: boolean
  professionalReferralNeeded: boolean
  safetyPlan: Record<string, any> | null
}

export class CrisisDetector {
  private static readonly CRISIS_KEYWORDS = {
    critical: [
      'want to die', 'kill myself', 'suicide', 'end it all', 'not worth living',
      'hurt myself', 'can\'t go on', 'better off dead', 'planning to hurt'
    ],
    high: [
      'hopeless', 'worthless', 'can\'t take it', 'giving up', 'no point',
      'everything is falling apart', 'can\'t handle this', 'breaking down'
    ],
    medium: [
      'depressed', 'anxious all the time', 'can\'t sleep', 'lost interest',
      'feeling empty', 'numb', 'disconnected', 'overwhelmed'
    ]
  }

  private static readonly RELATIONSHIP_CRISIS_PATTERNS = {
    domestic_violence: [
      'afraid of partner', 'threatens me', 'hits me', 'controls everything',
      'won\'t let me', 'isolates me', 'monitors my', 'explosive anger'
    ],
    emotional_abuse: [
      'constantly criticized', 'makes me feel worthless', 'gaslighting',
      'manipulative', 'controls my emotions', 'threatens to leave'
    ],
    substance_abuse: [
      'drinking too much', 'using drugs', 'can\'t stop drinking',
      'addiction is ruining', 'blackouts', 'hiding my drinking'
    ]
  }

  static async detectCrisis(
    input: string,
    userId: string,
    coupleId?: string,
    additionalContext?: Record<string, any>
  ): Promise<CrisisDetectionResult> {
    const indicators: CrisisIndicator[] = []
    
    // 1. Keyword-based detection
    const keywordIndicators = this.detectCrisisKeywords(input)
    indicators.push(...keywordIndicators)

    // 2. Pattern-based detection for relationship-specific crises
    const patternIndicators = this.detectRelationshipCrisisPatterns(input)
    indicators.push(...patternIndicators)

    // 3. Behavioral pattern analysis (if context provided)
    if (additionalContext) {
      const behavioralIndicators = this.analyzeBehavioralPatterns(additionalContext)
      indicators.push(...behavioralIndicators)
    }

    // 4. Determine overall severity
    const severity = this.calculateOverallSeverity(indicators)

    // 5. Generate recommendations based on severity
    const recommendedActions = this.generateRecommendations(severity, indicators)

    return {
      hasCrisisIndicators: indicators.length > 0,
      severity,
      indicators,
      recommendedActions,
      requiresImmediateIntervention: severity === 'critical',
      professionalReferralNeeded: severity === 'high' || severity === 'critical',
      safetyPlan: severity === 'high' || severity === 'critical' ? 
        this.generateSafetyPlan(indicators) : null
    }
  }

  private static detectCrisisKeywords(input: string): CrisisIndicator[] {
    const indicators: CrisisIndicator[] = []
    const lowerInput = input.toLowerCase()

    // Check critical keywords
    for (const keyword of this.CRISIS_KEYWORDS.critical) {
      if (lowerInput.includes(keyword)) {
        indicators.push({
          type: 'keyword',
          severity: 'critical',
          description: `Critical keyword detected: "${keyword}"`,
          confidence: 0.95,
          triggeredBy: keyword
        })
      }
    }

    // Check high severity keywords
    for (const keyword of this.CRISIS_KEYWORDS.high) {
      if (lowerInput.includes(keyword)) {
        indicators.push({
          type: 'keyword',
          severity: 'high',
          description: `High-severity emotional distress indicator: "${keyword}"`,
          confidence: 0.8,
          triggeredBy: keyword
        })
      }
    }

    // Check medium severity keywords
    for (const keyword of this.CRISIS_KEYWORDS.medium) {
      if (lowerInput.includes(keyword)) {
        indicators.push({
          type: 'keyword',
          severity: 'medium',
          description: `Emotional distress indicator: "${keyword}"`,
          confidence: 0.6,
          triggeredBy: keyword
        })
      }
    }

    return indicators
  }

  private static detectRelationshipCrisisPatterns(input: string): CrisisIndicator[] {
    const indicators: CrisisIndicator[] = []
    const lowerInput = input.toLowerCase()

    // Check for domestic violence indicators
    for (const pattern of this.RELATIONSHIP_CRISIS_PATTERNS.domestic_violence) {
      if (lowerInput.includes(pattern)) {
        indicators.push({
          type: 'pattern',
          severity: 'critical',
          description: `Potential domestic violence indicator: "${pattern}"`,
          confidence: 0.9,
          triggeredBy: pattern
        })
      }
    }

    // Check for emotional abuse indicators
    for (const pattern of this.RELATIONSHIP_CRISIS_PATTERNS.emotional_abuse) {
      if (lowerInput.includes(pattern)) {
        indicators.push({
          type: 'pattern',
          severity: 'high',
          description: `Potential emotional abuse indicator: "${pattern}"`,
          confidence: 0.8,
          triggeredBy: pattern
        })
      }
    }

    // Check for substance abuse indicators
    for (const pattern of this.RELATIONSHIP_CRISIS_PATTERNS.substance_abuse) {
      if (lowerInput.includes(pattern)) {
        indicators.push({
          type: 'pattern',
          severity: 'high',
          description: `Substance abuse indicator: "${pattern}"`,
          confidence: 0.75,
          triggeredBy: pattern
        })
      }
    }

    return indicators
  }

  private static analyzeBehavioralPatterns(context: Record<string, any>): CrisisIndicator[] {
    const indicators: CrisisIndicator[] = []

    // Example: Check assessment scores
    if (context.recentAssessmentScores) {
      const scores = context.recentAssessmentScores
      if (scores.relationshipSatisfaction < 3) {
        indicators.push({
          type: 'assessment_score',
          severity: 'medium',
          description: 'Low relationship satisfaction score detected',
          confidence: 0.7,
          triggeredBy: 'assessment_score'
        })
      }
    }

    // Example: Check frequency of negative interactions
    if (context.recentInteractionPattern) {
      const pattern = context.recentInteractionPattern
      if (pattern.negativeToPositiveRatio > 3) {
        indicators.push({
          type: 'behavioral',
          severity: 'medium',
          description: 'High ratio of negative to positive interactions',
          confidence: 0.6,
          triggeredBy: 'interaction_pattern'
        })
      }
    }

    return indicators
  }

  private static calculateOverallSeverity(indicators: CrisisIndicator[]): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (indicators.length === 0) return 'none'

    const hasCritical = indicators.some(i => i.severity === 'critical')
    if (hasCritical) return 'critical'

    const hasHigh = indicators.some(i => i.severity === 'high')
    if (hasHigh) return 'high'

    const hasMedium = indicators.some(i => i.severity === 'medium')
    if (hasMedium) return 'medium'

    return 'low'
  }

  private static generateRecommendations(
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical',
    indicators: CrisisIndicator[]
  ): string[] {
    const recommendations: string[] = []

    switch (severity) {
      case 'critical':
        recommendations.push(
          'Immediate professional intervention required',
          'Contact crisis hotline: 988 (Suicide & Crisis Lifeline)',
          'Do not leave user alone if possible',
          'Contact emergency services if immediate danger',
          'Provide crisis resources and safety planning'
        )
        break

      case 'high':
        recommendations.push(
          'Strong recommendation for professional counseling',
          'Provide crisis resources and hotline numbers',
          'Develop safety plan with user',
          'Consider couples therapy with licensed professional',
          'Follow up within 24 hours'
        )
        break

      case 'medium':
        recommendations.push(
          'Recommend professional counseling',
          'Provide supportive resources and coping strategies',
          'Monitor for escalation',
          'Encourage open communication with partner',
          'Follow up within 48-72 hours'
        )
        break

      case 'low':
        recommendations.push(
          'Provide supportive guidance and resources',
          'Encourage continued engagement with platform',
          'Monitor for changes in emotional state'
        )
        break
    }

    return recommendations
  }

  private static generateSafetyPlan(indicators: CrisisIndicator[]): Record<string, any> {
    const plan: Record<string, any> = {
      emergencyContacts: {
        'National Suicide Prevention Lifeline': '988',
        'Crisis Text Line': 'Text HOME to 741741',
        'Emergency Services': '911'
      },
      warningSignsIdentified: indicators.map(i => i.description),
      copingStrategies: [
        'Deep breathing exercises',
        'Contact trusted friend or family member',
        'Use grounding techniques (5-4-3-2-1 sensory method)',
        'Remove access to harmful means if applicable'
      ],
      supportNetwork: [],
      professionalContacts: [],
      safeEnvironment: {
        'Remove potential means of harm': true,
        'Stay with trusted person': true,
        'Avoid isolation': true
      }
    }

    // Add specific recommendations based on crisis type
    const hasDomesticViolence = indicators.some(i => 
      i.triggeredBy.includes('threatens') || 
      i.triggeredBy.includes('hits') ||
      i.triggeredBy.includes('afraid')
    )

    if (hasDomesticViolence) {
      plan.emergencyContacts['National Domestic Violence Hotline'] = '1-800-799-7233'
      plan.safetySpecific = {
        'Have escape plan ready': true,
        'Keep important documents accessible': true,
        'Identify safe places to go': true,
        'Consider temporary separation': true
      }
    }

    return plan
  }

  static async logCrisisEvent(
    coupleId: string,
    detectionResult: CrisisDetectionResult,
    detectedBy: 'ai_system' | 'user_report' | 'assessment' | 'professional' = 'ai_system'
  ): Promise<CrisisInsert> {
    const primaryIndicator = detectionResult.indicators[0]
    
    return {
      couple_id: coupleId,
      detected_by: detectedBy,
      severity_level: detectionResult.severity as any,
      crisis_type: this.categorizeCrisis(detectionResult.indicators),
      description: primaryIndicator?.description || 'Crisis indicators detected',
      ai_analysis: {
        indicators: detectionResult.indicators,
        confidence: Math.max(...detectionResult.indicators.map(i => i.confidence)),
        detectionMethod: detectionResult.indicators.map(i => i.type)
      },
      intervention_taken: {
        recommendations: detectionResult.recommendedActions,
        safetyPlan: detectionResult.safetyPlan,
        professionalReferral: detectionResult.professionalReferralNeeded
      },
      professional_contacted: detectionResult.requiresImmediateIntervention,
      resolution_status: 'open'
    }
  }

  private static categorizeCrisis(indicators: CrisisIndicator[]): 'emotional_distress' | 'relationship_conflict' | 'safety_concern' | 'mental_health' | 'substance_abuse' {
    // Prioritize safety concerns
    if (indicators.some(i => i.triggeredBy.includes('hurt') || i.triggeredBy.includes('violence'))) {
      return 'safety_concern'
    }

    // Check for substance abuse
    if (indicators.some(i => i.triggeredBy.includes('drinking') || i.triggeredBy.includes('drugs'))) {
      return 'substance_abuse'
    }

    // Check for mental health crisis
    if (indicators.some(i => i.severity === 'critical' && i.type === 'keyword')) {
      return 'mental_health'
    }

    // Check for relationship-specific issues
    if (indicators.some(i => i.type === 'pattern')) {
      return 'relationship_conflict'
    }

    // Default to emotional distress
    return 'emotional_distress'
  }
}