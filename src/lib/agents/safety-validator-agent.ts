import Anthropic from '@anthropic-ai/sdk'
import { CrisisDetector } from '../crisis-detection/detector'
import { AgentInput, AgentOutput, SafetyResult } from '../orchestration/types'

export interface SafetyValidatorConfig {
  crisisKeywords: {
    critical: string[]
    high: string[]
    relationshipViolence: string[]
  }
  responseTimeTargets: {
    critical: number // 30 seconds
    high: number     // 5 minutes
    medium: number   // 15 minutes
  }
  emergencyContacts: {
    nationalSuicidePreventionLifeline: string
    crisisTextLine: string
    nationalDomesticViolenceHotline: string
    samhsaNationalHelpline: string
    emergencyServices: string
  }
}

export class SafetyValidatorAgent {
  private anthropic: Anthropic
  private config: SafetyValidatorConfig
  private memoryStore: Map<string, any> = new Map()

  constructor(anthropic: Anthropic) {
    this.anthropic = anthropic
    this.config = this.getDefaultConfig()
    this.loadPersistedMemory()
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now()
    
    try {
      // Pre-operation safety check with memory integration
      await this.preOperationSafetyCheck(input)
      
      // Enhanced crisis detection using existing CrisisDetector
      const crisisResult = await CrisisDetector.detectCrisis(
        input.message,
        input.userId,
        input.coupleId,
        input.metadata
      )

      // AI-enhanced safety validation for complex cases
      let enhancedResult = crisisResult
      if (crisisResult.hasCrisisIndicators || this.requiresDeepAnalysis(input)) {
        enhancedResult = await this.performAIEnhancedValidation(input, crisisResult)
      }

      // Validate against stored safety patterns and history
      const validationResult = await this.validateWithMemory(enhancedResult, input)

      // Store validation results for future learning
      await this.storeValidationResults(input, validationResult)

      const processingTime = Date.now() - startTime

      return {
        agentType: 'safety',
        result: validationResult,
        confidence: validationResult.confidence,
        requiresReview: validationResult.requiresReview || validationResult.requiresImmediateIntervention,
        processingTime
      }
    } catch (error) {
      return this.createErrorResponse(error, startTime)
    }
  }

  private async preOperationSafetyCheck(input: AgentInput): Promise<void> {
    // Load crisis detection protocols from memory
    const protocols = this.memoryStore.get('crisis-detection-protocols') || {}
    
    // Retrieve safety validation history for this user
    const userSafetyHistory = this.memoryStore.get(`safety-history-${input.userId}`) || []
    
    // Check for recurring patterns or escalating concerns
    if (userSafetyHistory.length > 0) {
      const recentConcerns = userSafetyHistory.filter(
        (entry: any) => Date.now() - entry.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
      )
      
      if (recentConcerns.length > 3) {
        // Multiple safety concerns in 24 hours - flag for enhanced monitoring
        await this.flagForEnhancedMonitoring(input.userId, recentConcerns)
      }
    }
  }

  private async performAIEnhancedValidation(
    input: AgentInput,
    crisisResult: any
  ): Promise<SafetyResult> {
    const prompt = `
    CRITICAL SAFETY VALIDATION REQUIRED

    Crisis Detection Results:
    - Severity: ${crisisResult.severity}
    - Indicators: ${crisisResult.indicators.map((i: any) => i.description).join(', ')}
    - Immediate Intervention Required: ${crisisResult.requiresImmediateIntervention}

    User Context:
    - Message: "${input.message}"
    - Context: ${input.context}
    - User ID: ${input.userId}
    - Couple ID: ${input.coupleId || 'Individual'}

    As a crisis intervention specialist AI, provide enhanced safety analysis:

    1. IMMEDIATE DANGER ASSESSMENT:
       - Physical safety risk level (0-10)
       - Emotional safety risk level (0-10)
       - Self-harm risk indicators
       - Domestic violence risk indicators

    2. INTERVENTION REQUIREMENTS:
       - Does this require immediate professional intervention? (YES/NO)
       - Should emergency services be contacted? (YES/NO)
       - What specific professional resources are needed?

    3. SAFETY PLAN ELEMENTS:
       - Immediate safety steps for the user
       - Crisis resources to provide
       - Follow-up monitoring requirements

    4. PROFESSIONAL ESCALATION:
       - Which specialists should be contacted?
       - What information should be shared?
       - What is the urgency level?

    Focus on user safety above all else. When in doubt, escalate to professional intervention.
    `

    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a crisis intervention specialist AI. Your primary goal is user safety. Always err on the side of caution and professional intervention when dealing with potential crises.'
    })

    // Parse AI response and integrate with crisis detection results
    return this.parseAIValidationResponse(response.content, crisisResult)
  }

  private parseAIValidationResponse(aiResponse: any, crisisResult: any): SafetyResult {
    // Extract AI analysis (simplified for demo - would be more sophisticated)
    const content = Array.isArray(aiResponse) ? aiResponse[0]?.text || '' : aiResponse

    const requiresImmediateIntervention = 
      content.toLowerCase().includes('immediate professional intervention? (yes)') ||
      content.toLowerCase().includes('emergency services be contacted? (yes)') ||
      crisisResult.requiresImmediateIntervention

    const enhancedConfidence = Math.min(
      crisisResult.indicators.length > 0 ? 
        Math.max(...crisisResult.indicators.map((i: any) => i.confidence)) : 0.8,
      0.95
    )

    return {
      safetyLevel: this.determineSafetyLevel(crisisResult.severity, content),
      crisisIndicators: crisisResult.indicators,
      requiresImmediateIntervention,
      requiresReview: requiresImmediateIntervention || crisisResult.severity !== 'none',
      reasoning: `AI-Enhanced Analysis: ${content.substring(0, 500)}...`,
      confidence: enhancedConfidence,
      recommendedActions: this.extractRecommendedActions(content),
      safetyPlan: this.generateSafetyPlan(content, crisisResult)
    }
  }

  private determineSafetyLevel(severity: string, aiContent: string): SafetyResult['safetyLevel'] {
    if (aiContent.toLowerCase().includes('immediate') || severity === 'critical') {
      return 'crisis'
    }
    if (severity === 'high' || aiContent.toLowerCase().includes('professional intervention')) {
      return 'concern'
    }
    if (severity === 'medium') {
      return 'caution'
    }
    return 'safe'
  }

  private extractRecommendedActions(aiContent: string): string[] {
    const actions = []
    
    if (aiContent.toLowerCase().includes('crisis hotline')) {
      actions.push('Provide crisis hotline numbers')
    }
    if (aiContent.toLowerCase().includes('emergency services')) {
      actions.push('Consider emergency services contact')
    }
    if (aiContent.toLowerCase().includes('professional')) {
      actions.push('Connect with mental health professional')
    }
    if (aiContent.toLowerCase().includes('safety plan')) {
      actions.push('Develop safety plan')
    }
    if (aiContent.toLowerCase().includes('monitoring')) {
      actions.push('Enhanced monitoring required')
    }

    return actions.length > 0 ? actions : ['Standard safety resources']
  }

  private generateSafetyPlan(aiContent: string, crisisResult: any): Record<string, any> {
    return {
      emergencyContacts: this.config.emergencyContacts,
      immediateSteps: [
        'If in immediate danger, call 911',
        'Contact National Suicide Prevention Lifeline: 988',
        'Reach out to trusted support person',
        'Remove immediate means of harm if applicable'
      ],
      resources: [
        'Crisis Text Line: Text HOME to 741741',
        'National Domestic Violence Hotline: 1-800-799-7233',
        'SAMHSA National Helpline: 1-800-662-4357'
      ],
      followUpRequired: crisisResult.severity !== 'none',
      monitoringLevel: this.determineMonitoringLevel(crisisResult.severity)
    }
  }

  private determineMonitoringLevel(severity: string): string {
    switch (severity) {
      case 'critical': return 'immediate-continuous'
      case 'high': return 'frequent-daily'
      case 'medium': return 'regular-weekly'
      case 'low': return 'standard-monthly'
      default: return 'standard'
    }
  }

  private async validateWithMemory(
    result: SafetyResult,
    input: AgentInput
  ): Promise<SafetyResult> {
    // Check against user's safety history for patterns
    const userHistory = this.memoryStore.get(`safety-history-${input.userId}`) || []
    
    // Look for escalating patterns
    if (userHistory.length > 2) {
      const recentEntries = userHistory.slice(-3)
      const severityLevels = ['safe', 'caution', 'concern', 'crisis', 'critical']
      
      const isEscalating = recentEntries.every((entry: any, index: number) => {
        if (index === 0) return true
        const prevSeverity = severityLevels.indexOf(recentEntries[index - 1].safetyLevel)
        const currSeverity = severityLevels.indexOf(entry.safetyLevel)
        return currSeverity >= prevSeverity
      })

      if (isEscalating && result.safetyLevel !== 'crisis') {
        result.requiresReview = true
        result.reasoning += ' [PATTERN: Escalating safety concerns detected]'
        result.recommendedActions.push('Enhanced monitoring due to escalating pattern')
      }
    }

    return result
  }

  private async storeValidationResults(input: AgentInput, result: SafetyResult): Promise<void> {
    const timestamp = Date.now()
    
    // Store in user's safety history
    const userHistory = this.memoryStore.get(`safety-history-${input.userId}`) || []
    userHistory.push({
      timestamp,
      safetyLevel: result.safetyLevel,
      confidence: result.confidence,
      context: input.context,
      requiresIntervention: result.requiresImmediateIntervention
    })
    
    // Keep last 50 entries
    this.memoryStore.set(`safety-history-${input.userId}`, userHistory.slice(-50))

    // Store validation details for analysis
    this.memoryStore.set(`safety-validation-${timestamp}`, {
      userId: input.userId,
      coupleId: input.coupleId,
      result,
      validatorAgent: 'safety-validator'
    })
  }

  private async flagForEnhancedMonitoring(userId: string, concerns: any[]): Promise<void> {
    const monitoringPlan = {
      userId,
      startDate: Date.now(),
      concerns,
      monitoringLevel: 'enhanced',
      checkInFrequency: 'daily',
      alertsEnabled: true,
      professionalNotification: true
    }

    this.memoryStore.set(`enhanced-monitoring-${userId}`, monitoringPlan)
    
    // This would trigger notification to professional network in production
    console.log(`Enhanced monitoring activated for user ${userId}`)
  }

  private requiresDeepAnalysis(input: AgentInput): boolean {
    // Check if this type of input typically requires enhanced AI analysis
    return (
      input.context === 'crisis' ||
      input.message.length > 500 || // Long messages may contain complex situations
      this.memoryStore.has(`enhanced-monitoring-${input.userId}`) // User is under enhanced monitoring
    )
  }

  private createErrorResponse(error: any, startTime: number): AgentOutput {
    return {
      agentType: 'safety',
      result: {
        safetyLevel: 'concern', // Default to concern level on error
        crisisIndicators: [],
        requiresImmediateIntervention: false,
        requiresReview: true,
        reasoning: `Safety validation error: ${error.message}`,
        confidence: 0.1
      },
      confidence: 0.1,
      requiresReview: true,
      processingTime: Date.now() - startTime,
      errors: [error.message]
    }
  }

  private async loadPersistedMemory(): Promise<void> {
    try {
      // Load crisis detection protocols from JSON file
      const fs = await import('fs/promises')
      const protocolsData = await fs.readFile(
        '/Users/chrisouimet/Sparq-ConnectionV4/memory/crisis-detection-protocols.json',
        'utf-8'
      )
      this.memoryStore.set('crisis-detection-protocols', JSON.parse(protocolsData))
    } catch (error) {
      console.warn('Could not load persisted memory for SafetyValidator:', error)
    }
  }

  private getDefaultConfig(): SafetyValidatorConfig {
    return {
      crisisKeywords: {
        critical: [
          'want to die', 'kill myself', 'suicide', 'end it all',
          'not worth living', 'hurt myself', 'can\'t go on',
          'better off dead', 'planning to hurt'
        ],
        high: [
          'hopeless', 'worthless', 'can\'t take it', 'giving up',
          'no point', 'everything is falling apart', 'can\'t handle this',
          'breaking down'
        ],
        relationshipViolence: [
          'afraid of partner', 'threatens me', 'hits me',
          'controls everything', 'won\'t let me', 'isolates me',
          'monitors my', 'explosive anger'
        ]
      },
      responseTimeTargets: {
        critical: 30000,  // 30 seconds
        high: 300000,     // 5 minutes
        medium: 900000    // 15 minutes
      },
      emergencyContacts: {
        nationalSuicidePreventionLifeline: '988',
        crisisTextLine: 'Text HOME to 741741',
        nationalDomesticViolenceHotline: '1-800-799-7233',
        samhsaNationalHelpline: '1-800-662-4357',
        emergencyServices: '911'
      }
    }
  }

  // Health check and metrics
  getAgentHealth(): any {
    return {
      agentType: 'safety-validator',
      status: 'active',
      memorySize: this.memoryStore.size,
      lastUpdate: Date.now(),
      configuration: {
        responseTimeTargets: this.config.responseTimeTargets,
        emergencyContactsConfigured: Object.keys(this.config.emergencyContacts).length
      }
    }
  }
}

export default SafetyValidatorAgent