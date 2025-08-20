import Anthropic from '@anthropic-ai/sdk'
import { HybridOrchestrationSystem, createHybridSystem } from '../orchestration/hybrid-system'
import { AgentInput, OrchestrationResult } from '../orchestration/types'
import { getGlobalContextManager, RelationshipContextManager } from '../context/relationship-context-manager'

// Claude Flow - Multi-Agent Coordination System for Relationship AI
// Now uses the new hybrid orchestration system with fallback capabilities
export class ClaudeFlow {
  private orchestrationSystem: HybridOrchestrationSystem | null = null
  private anthropic: Anthropic
  private contextManager: RelationshipContextManager
  private initialized = false

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey,
    })
    this.contextManager = getGlobalContextManager()
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      this.orchestrationSystem = await createHybridSystem({
        mode: 'hybrid',
        parallel: true,
        safetyFirst: true,
        timeout: 30000,
        fallbackOnError: true
      })
      this.initialized = true
      console.log('✅ Claude Flow initialized with hybrid orchestration system')
    } catch (error) {
      console.error('❌ Claude Flow initialization failed:', error)
      throw error
    }
  }

  async processUserInput(input: {
    userId: string
    coupleId?: string
    message: string
    context: 'assessment' | 'guidance' | 'crisis' | 'general'
    userHistory?: any[]
    metadata?: Record<string, any>
  }): Promise<OrchestrationResult> {
    if (!this.initialized || !this.orchestrationSystem) {
      await this.initialize()
    }

    if (!this.orchestrationSystem) {
      throw new Error('Orchestration system not available')
    }

    // Enhanced context enrichment with relationship history
    const enrichedMetadata = await this.enrichContextWithHistory(input)

    // Convert to standardized agent input format
    const agentInput: AgentInput = {
      userId: input.userId,
      coupleId: input.coupleId,
      message: input.message,
      context: input.context,
      userHistory: input.userHistory,
      metadata: enrichedMetadata
    }

    // Process through the hybrid orchestration system
    const result = await this.orchestrationSystem.processInput(agentInput)

    // Store interaction for future context (async, don't wait)
    if (input.coupleId) {
      this.storeInteractionContext(input, result).catch(error => 
        console.warn('Failed to store interaction context:', error)
      )
    }

    return result
  }

  async coordinateAgents(task: string, context: any): Promise<OrchestrationResult> {
    if (!this.initialized || !this.orchestrationSystem) {
      await this.initialize()
    }

    if (!this.orchestrationSystem) {
      throw new Error('Orchestration system not available')
    }

    // Convert task-based coordination to input format
    const agentInput: AgentInput = {
      userId: context.userId || 'system',
      message: task,
      context: context.type || 'general',
      metadata: context
    }

    return await this.orchestrationSystem.processInput(agentInput)
  }

  // Legacy method for backward compatibility
  private synthesizeResponse(coordination: any) {
    return {
      response: coordination.relationshipInsight?.response || '',
      safetyLevel: coordination.safetyFirst?.level || 'safe',
      crisisIndicators: coordination.crisisAssessment?.indicators || [],
      professionalReferral: coordination.professionalRecommendation?.referral || null,
      requiresHumanReview: coordination.safetyFirst?.requiresReview || false
    }
  }

  // New methods for hybrid system management
  async getSystemHealth() {
    if (!this.orchestrationSystem) {
      return { status: 'uninitialized' }
    }
    return await this.orchestrationSystem.getSystemHealth()
  }

  async switchToStandardMode(): Promise<void> {
    if (this.orchestrationSystem) {
      await this.orchestrationSystem.switchToFallbackOnly()
    }
  }

  async switchToHybridMode(): Promise<boolean> {
    if (this.orchestrationSystem) {
      return await this.orchestrationSystem.switchToPrimaryEngine()
    }
    return false
  }

  async restart(): Promise<void> {
    if (this.orchestrationSystem) {
      await this.orchestrationSystem.restart()
    } else {
      await this.initialize()
    }
  }

  // Enhanced context management methods
  private async enrichContextWithHistory(input: {
    userId: string
    coupleId?: string
    message: string
    context: 'assessment' | 'guidance' | 'crisis' | 'general'
    userHistory?: any[]
    metadata?: Record<string, any>
  }): Promise<Record<string, any>> {
    const baseMetadata = input.metadata || {}

    if (!input.coupleId) {
      return baseMetadata
    }

    try {
      // Get relationship context
      const relationshipContext = await this.contextManager.getContext(input.coupleId)
      
      if (relationshipContext) {
        // Get recent patterns for better AI analysis
        const recentPatterns = await this.contextManager.getRecentPatterns(input.coupleId, 30)
        
        return {
          ...baseMetadata,
          relationshipContext: {
            communicationPatterns: relationshipContext.patterns.communication_style,
            emotionalPatterns: relationshipContext.patterns.emotional_patterns,
            preferredFramework: relationshipContext.preferences.preferred_framework,
            recentAssessments: relationshipContext.assessment_history.slice(-3),
            safetyHistory: relationshipContext.safety_context.historical_indicators.slice(-2),
            wellnessTrends: {
              satisfactionTrend: relationshipContext.wellness_metrics.relationship_satisfaction_trend.slice(-5),
              communicationImprovement: relationshipContext.wellness_metrics.communication_improvement.slice(-5)
            },
            recentPatterns
          }
        }
      }
    } catch (error) {
      console.warn('Failed to enrich context with relationship history:', error)
    }

    return baseMetadata
  }

  private async storeInteractionContext(
    input: {
      userId: string
      coupleId?: string
      message: string
      context: 'assessment' | 'guidance' | 'crisis' | 'general'
    },
    result: OrchestrationResult
  ): Promise<void> {
    if (!input.coupleId) return

    try {
      // Extract framework used from psychology agent result
      const psychologyResult = Object.values(result.agentResults)
        .find(r => r.agentType === 'psychology')

      const frameworkUsed = psychologyResult?.result?.framework || 'unknown'

      // Store the interaction
      await this.contextManager.addInteraction(
        input.coupleId,
        input.userId,
        input.message,
        input.context,
        {
          type: result.finalResponse.type,
          safetyLevel: result.safetyLevel,
          qualityScore: result.finalResponse.qualityScore,
          processingTime: result.processingTime
        },
        result.safetyLevel,
        frameworkUsed
      )

      // If this was an assessment, store assessment data
      if (input.context === 'assessment' && psychologyResult?.result?.assessmentScore) {
        await this.contextManager.addAssessment(
          input.coupleId,
          'ai_assessment',
          { overall_score: psychologyResult.result.assessmentScore },
          psychologyResult.result.insights ? [psychologyResult.result.insights] : [],
          psychologyResult.result.recommendations || []
        )
      }

      // If safety indicators were detected, record safety event
      if (result.coordination.safetyFirst.crisisIndicators.length > 0) {
        await this.contextManager.recordSafetyEvent(
          input.coupleId,
          result.safetyLevel,
          result.coordination.safetyFirst.crisisIndicators.map(i => i.description),
          false // Not resolved yet
        )
      }
    } catch (error) {
      console.error('Failed to store interaction context:', error)
    }
  }

  // New methods for relationship context management
  async getRelationshipInsights(coupleId: string): Promise<{
    patterns: any
    trends: any
    recommendations: string[]
  } | null> {
    try {
      const context = await this.contextManager.getContext(coupleId)
      if (!context) return null

      const recentPatterns = await this.contextManager.getRecentPatterns(coupleId, 30)
      
      return {
        patterns: context.patterns,
        trends: recentPatterns,
        recommendations: this.generateContextualRecommendations(context, recentPatterns)
      }
    } catch (error) {
      console.error('Failed to get relationship insights:', error)
      return null
    }
  }

  async updateRelationshipPreferences(
    coupleId: string, 
    preferences: Partial<{
      preferred_framework: 'gottman' | 'eft' | 'attachment' | 'communication' | 'auto'
      privacy_level: 'minimal' | 'standard' | 'detailed'
      reminder_frequency: 'daily' | 'weekly' | 'monthly' | 'never'
    }>
  ): Promise<boolean> {
    try {
      const context = await this.contextManager.getContext(coupleId)
      if (!context) return false

      return await this.contextManager.updateContext(coupleId, {
        preferences: {
          ...context.preferences,
          ...preferences
        }
      })
    } catch (error) {
      console.error('Failed to update relationship preferences:', error)
      return false
    }
  }

  private generateContextualRecommendations(
    context: any, 
    recentPatterns: any
  ): string[] {
    const recommendations: string[] = []

    // Analyze communication trends
    if (recentPatterns?.communicationTrends?.includes('gottman')) {
      recommendations.push('Continue practicing Gottman Method techniques')
    }

    // Analyze conflict frequency
    if (recentPatterns?.conflictFrequency > 0.3) {
      recommendations.push('Focus on conflict resolution skills')
    }

    // Analyze positive interaction ratio
    if (recentPatterns?.positiveInteractionRatio < 0.5) {
      recommendations.push('Increase positive interactions and appreciation exercises')
    }

    // Safety considerations
    if (context.safety_context.historical_indicators.length > 0) {
      recommendations.push('Continue monitoring emotional wellbeing')
    }

    return recommendations.length > 0 ? recommendations : [
      'Continue regular relationship check-ins',
      'Practice daily appreciation exercises',
      'Consider relationship education workshops'
    ]
  }

  async shutdown(): Promise<void> {
    if (this.orchestrationSystem) {
      await this.orchestrationSystem.shutdown()
      this.orchestrationSystem = null
    }
    this.initialized = false
  }
}

// Enhanced Safety-First AI Agent - Now integrates with CrisisDetector
class SafetyAgent {
  constructor(private anthropic: Anthropic) {}

  async screenContent(input: any) {
    // First, use the sophisticated CrisisDetector for rapid analysis
    const { CrisisDetector } = await import('../crisis-detection/detector')
    
    const crisisResult = await CrisisDetector.detectCrisis(
      input.message,
      input.userId,
      input.coupleId,
      input.metadata
    )

    // If crisis indicators found, use AI for deeper analysis
    if (crisisResult.hasCrisisIndicators) {
      const enhancedAnalysis = await this.getAIAnalysis(input, crisisResult)
      
      return {
        safetyLevel: this.mapSeverityToSafetyLevel(crisisResult.severity),
        crisisIndicators: crisisResult.indicators,
        requiresImmediateIntervention: crisisResult.requiresImmediateIntervention,
        requiresReview: crisisResult.professionalReferralNeeded,
        reasoning: enhancedAnalysis,
        confidence: Math.max(...crisisResult.indicators.map(i => i.confidence)),
        recommendedActions: crisisResult.recommendedActions,
        safetyPlan: crisisResult.safetyPlan
      }
    }

    // No crisis indicators - standard safety screening
    return {
      safetyLevel: 'safe',
      crisisIndicators: [],
      requiresImmediateIntervention: false,
      requiresReview: false,
      reasoning: 'No crisis indicators detected',
      confidence: 0.95
    }
  }

  private async getAIAnalysis(input: any, crisisResult: any) {
    const prompt = `
    CRISIS DETECTED - Enhanced Analysis Required
    
    Crisis Detection Results:
    - Severity: ${crisisResult.severity}
    - Indicators: ${crisisResult.indicators.map(i => i.description).join(', ')}
    - Type: ${crisisResult.indicators[0]?.type}
    
    User Input: "${input.message}"
    Context: ${input.context}
    
    Provide enhanced psychological safety analysis:
    1. Validate the crisis indicators
    2. Assess immediate danger level
    3. Recommend specific intervention approach
    4. Consider relationship dynamics (if couples context)
    5. Provide compassionate response guidance
    
    Focus on user safety and evidence-based crisis intervention.
    `

    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a crisis intervention specialist AI. Prioritize immediate safety, provide compassionate guidance, and recommend appropriate professional resources.'
    })

    return response.content
  }

  private mapSeverityToSafetyLevel(severity: string): string {
    switch (severity) {
      case 'critical': return 'crisis'
      case 'high': return 'concern'
      case 'medium': return 'caution'
      case 'low': return 'caution'
      default: return 'safe'
    }
  }

  async evaluate(context: any) {
    // Enhanced evaluation using CrisisDetector
    const { CrisisDetector } = await import('../crisis-detection/detector')
    
    const analysis = await CrisisDetector.detectCrisis(
      context.message || '',
      context.userId,
      context.coupleId,
      context
    )

    return {
      level: this.mapSeverityToSafetyLevel(analysis.severity),
      indicators: analysis.indicators,
      requiresReview: analysis.professionalReferralNeeded,
      interventionNeeded: analysis.requiresImmediateIntervention,
      confidence: analysis.indicators.length > 0 ? 
        Math.max(...analysis.indicators.map(i => i.confidence)) : 0.95
    }
  }
}

// Enhanced Relationship Psychology Agent with Specialized Frameworks
class RelationshipAgent {
  constructor(private anthropic: Anthropic) {}

  async processAssessment(input: any, safetyCheck: any) {
    // Determine the best psychological framework based on context
    const framework = this.selectOptimalFramework(input, safetyCheck)
    
    const prompt = `
    As a relationship psychology AI specialist using ${framework.name}, analyze this assessment:
    
    User input: "${input.message}"
    Safety level: ${safetyCheck.safetyLevel}
    Context: ${input.context}
    Couple ID: ${input.coupleId || 'Individual'}
    
    Apply ${framework.name} principles:
    ${framework.principles.join('\n')}
    
    Provide evidence-based analysis including:
    1. Primary relationship patterns identified
    2. Strengths to build upon
    3. Growth areas with specific interventions
    4. Educational resources for couple learning
    5. Assessment metrics using validated scales
    
    Focus on wellness education, not therapy.
    `

    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      system: `You are a relationship psychology AI specializing in ${framework.name}. Provide educational insights based on peer-reviewed research. This is wellness education, not therapy.`
    })

    return {
      framework: framework.name,
      evidenceBase: framework.evidenceBase,
      insights: response.content,
      recommendations: this.generateRecommendations(framework, input),
      assessmentScore: this.calculateWellnessScore(input),
      growthAreas: framework.commonGrowthAreas,
      strengths: this.identifyStrengths(input),
      isValid: true
    }
  }

  private selectOptimalFramework(input: any, safetyCheck: any) {
    // Select framework based on input patterns and context
    const inputText = input.message.toLowerCase()
    
    if (inputText.includes('conflict') || inputText.includes('argument') || inputText.includes('fight')) {
      return this.getGottmanFramework()
    } else if (inputText.includes('connect') || inputText.includes('close') || inputText.includes('emotional')) {
      return this.getEFTFramework()
    } else if (inputText.includes('attachment') || inputText.includes('trust') || inputText.includes('security')) {
      return this.getAttachmentFramework()
    } else {
      return this.getCommunicationFramework()
    }
  }

  private getGottmanFramework() {
    return {
      name: 'gottman',
      principles: [
        'Enhance love maps and emotional connection',
        'Nurture fondness and admiration',
        'Turn toward each other during everyday moments',
        'Accept influence from your partner',
        'Solve solvable problems effectively',
        'Overcome gridlock through understanding',
        'Create shared meaning together'
      ],
      evidenceBase: ['Gottman Institute Research', 'Four Horsemen Studies', 'Love Lab findings'],
      commonGrowthAreas: ['conflict resolution', 'emotional awareness', 'fondness building']
    }
  }

  private getEFTFramework() {
    return {
      name: 'eft',
      principles: [
        'Identify negative emotional cycles',
        'Access underlying emotions and attachment needs',
        'Restructure interactions between partners',
        'Create new positive cycles of connection',
        'Consolidate new patterns of interaction'
      ],
      evidenceBase: ['EFT research studies', 'Attachment theory', 'Johnson & Greenberg findings'],
      commonGrowthAreas: ['emotional awareness', 'vulnerability', 'secure attachment']
    }
  }

  private getAttachmentFramework() {
    return {
      name: 'attachment',
      principles: [
        'Understand individual attachment styles',
        'Recognize attachment triggers and responses',
        'Create secure base behaviors',
        'Build safe haven interactions',
        'Foster interdependence and autonomy'
      ],
      evidenceBase: ['Bowlby attachment research', 'Adult attachment studies', 'Hazan & Shaver findings'],
      commonGrowthAreas: ['emotional regulation', 'trust building', 'secure communication']
    }
  }

  private getCommunicationFramework() {
    return {
      name: 'communication',
      principles: [
        'Practice active listening skills',
        'Use "I" statements for expression',
        'Validate partner perspectives',
        'Manage conflict constructively',
        'Build empathy and understanding'
      ],
      evidenceBase: ['Communication research', 'Nonviolent communication', 'Relationship education studies'],
      commonGrowthAreas: ['listening skills', 'emotional expression', 'conflict management']
    }
  }

  private generateRecommendations(framework: any, input: any): string[] {
    const baseRecommendations = [
      `Explore ${framework.name} educational resources`,
      'Practice daily relationship connection rituals',
      'Consider couples education workshops'
    ]

    // Add framework-specific recommendations
    switch (framework.name) {
      case 'gottman':
        return baseRecommendations.concat([
          'Practice the Gottman Card Decks for deeper connection',
          'Learn about the Four Horsemen patterns',
          'Implement weekly State of the Union meetings'
        ])
      case 'eft':
        return baseRecommendations.concat([
          'Practice emotional awareness exercises',
          'Learn about attachment needs and fears',
          'Explore vulnerability-building activities'
        ])
      case 'attachment':
        return baseRecommendations.concat([
          'Take attachment style assessments',
          'Practice secure base behaviors',
          'Learn about attachment triggers'
        ])
      default:
        return baseRecommendations.concat([
          'Practice active listening exercises',
          'Learn "I" statement communication',
          'Implement daily check-ins'
        ])
    }
  }

  private calculateWellnessScore(input: any): number {
    // Simple wellness scoring based on input sentiment and context
    // This would be more sophisticated in production
    let score = 7 // Base neutral score

    const inputText = input.message.toLowerCase()
    const positiveIndicators = ['love', 'appreciate', 'grateful', 'happy', 'connected']
    const negativeIndicators = ['frustrated', 'angry', 'disconnect', 'hurt', 'lonely']

    positiveIndicators.forEach(word => {
      if (inputText.includes(word)) score += 0.5
    })

    negativeIndicators.forEach(word => {
      if (inputText.includes(word)) score -= 0.5
    })

    return Math.max(1, Math.min(10, score))
  }

  private identifyStrengths(input: any): string[] {
    // Identify relationship strengths from input
    const strengths = []
    const inputText = input.message.toLowerCase()

    if (inputText.includes('communicate') || inputText.includes('talk')) {
      strengths.push('open communication')
    }
    if (inputText.includes('care') || inputText.includes('love')) {
      strengths.push('emotional connection')
    }
    if (inputText.includes('work together') || inputText.includes('team')) {
      strengths.push('collaboration')
    }
    if (inputText.includes('understand') || inputText.includes('listen')) {
      strengths.push('empathy and understanding')
    }

    return strengths.length > 0 ? strengths : ['commitment to growth', 'seeking improvement']
  }

  async provideGuidance(input: any, safetyCheck: any) {
    const framework = this.selectOptimalFramework(input, safetyCheck)
    
    return {
      guidance: `Based on ${framework.name} principles, here are educational insights for your relationship journey...`,
      exercises: this.getFrameworkExercises(framework),
      resources: this.getEducationalResources(framework),
      followUpQuestions: this.generateFollowUpQuestions(framework)
    }
  }

  private getFrameworkExercises(framework: any): string[] {
    switch (framework.name) {
      case 'gottman':
        return [
          'Love Maps: Share three things about your partner\'s inner world',
          'Appreciation Practice: Express one thing you admire about your partner',
          'Daily Connection Ritual: Share highlights and challenges from your day'
        ]
      case 'eft':
        return [
          'Emotion Identification: Notice and name your feelings during conversations',
          'Needs Expression: Share your attachment needs clearly and kindly',
          'Hold Me Tight Exercise: Practice vulnerable emotional sharing'
        ]
      case 'attachment':
        return [
          'Attachment Style Reflection: Discuss your attachment patterns together',
          'Safe Haven Practice: Create comfort rituals for stressed moments',
          'Secure Base Building: Support each other\'s individual growth'
        ]
      default:
        return [
          'Active Listening Practice: Reflect back what you hear before responding',
          'I-Statement Practice: Express feelings without blame',
          'Daily Check-in: Share thoughts and feelings from the day'
        ]
    }
  }

  private getEducationalResources(framework: any): string[] {
    switch (framework.name) {
      case 'gottman':
        return [
          'The Gottman Institute educational materials',
          '"The Seven Principles for Making Marriage Work" book',
          'Gottman Card Decks for relationship building'
        ]
      case 'eft':
        return [
          'EFT educational resources',
          '"Hold Me Tight" by Sue Johnson',
          'Attachment and emotional connection worksheets'
        ]
      case 'attachment':
        return [
          'Adult attachment theory educational materials',
          '"Attached" by Amir Levine and Rachel Heller',
          'Attachment style assessment tools'
        ]
      default:
        return [
          'Communication skills educational materials',
          'Active listening training resources',
          'Conflict resolution educational guides'
        ]
    }
  }

  private generateFollowUpQuestions(framework: any): string[] {
    return [
      'What specific aspect of your relationship would you like to focus on next?',
      'How do you and your partner typically handle conflicts?',
      'What are your relationship\'s greatest strengths?',
      'What educational topics would be most helpful for your growth?'
    ]
  }

  async handleGeneralInquiry(input: any, safetyCheck: any) {
    return {
      response: 'I can help provide educational insights about relationship patterns and growth opportunities.',
      additionalResources: this.getGeneralResources(),
      suggestedNextSteps: [
        'Consider taking a relationship assessment',
        'Explore evidence-based relationship education',
        'Practice daily connection rituals'
      ]
    }
  }

  private getGeneralResources(): string[] {
    return [
      'Relationship education courses',
      'Communication skills workshops',
      'Couples enrichment programs',
      'Evidence-based relationship books',
      'Professional couples therapy referrals'
    ]
  }

  async analyze(context: any) {
    const framework = this.selectOptimalFramework(context, { safetyLevel: 'safe' })
    
    return {
      response: `Educational analysis using ${framework.name} principles`,
      insights: framework.principles,
      recommendations: this.generateRecommendations(framework, context)
    }
  }
}

// Crisis Intervention Agent
class CrisisAgent {
  constructor(private anthropic: Anthropic) {}

  async handleCrisisIntervention(input: any, safetyCheck: any) {
    // Immediate crisis intervention protocol
    return {
      immediateActions: [
        'Connect with crisis hotline',
        'Provide emergency resources',
        'Alert professional network'
      ],
      resources: this.getCrisisResources(),
      followUpRequired: true,
      escalationLevel: 'immediate'
    }
  }

  async handleCrisisSupport(input: any, safetyCheck: any) {
    // Crisis support (non-immediate)
    return {
      supportResponse: '',
      copingStrategies: [],
      professionalReferrals: [],
      safetyPlan: {}
    }
  }

  async assess(context: any) {
    // Crisis assessment logic
    return {
      indicators: [],
      severity: 'low' | 'medium' | 'high' | 'critical',
      recommendedAction: ''
    }
  }

  private getCrisisResources() {
    return {
      'National Suicide Prevention Lifeline': '988',
      'Crisis Text Line': 'Text HOME to 741741',
      'National Domestic Violence Hotline': '1-800-799-7233',
      'SAMHSA National Helpline': '1-800-662-4357'
    }
  }
}

// Professional Network Agent
class ProfessionalAgent {
  constructor(private anthropic: Anthropic) {}

  async recommend(context: any) {
    // Professional recommendation logic
    return {
      referral: null,
      therapistMatch: null,
      urgencyLevel: 'low',
      specialization: []
    }
  }
}

// Factory function for creating ClaudeFlow instance with hybrid orchestration
export async function createClaudeFlow(): Promise<ClaudeFlow> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('⚠️ ANTHROPIC_API_KEY not found - Claude Flow will use standard mode only')
  }
  
  const claudeFlow = new ClaudeFlow(apiKey || 'fallback')
  await claudeFlow.initialize()
  return claudeFlow
}

// Export the legacy agent classes for backward compatibility
export type { SafetyAgent, RelationshipAgent, CrisisAgent, ProfessionalAgent }

// Export the new orchestration types
export type { 
  AgentInput, 
  OrchestrationResult, 
  OrchestrationConfig 
} from '../orchestration/types'

// Export the hybrid system for direct use
export { 
  HybridOrchestrationSystem, 
  createHybridSystem,
  getGlobalHybridSystem 
} from '../orchestration/hybrid-system'