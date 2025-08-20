// Multi-agent orchestration system for Sparq Connection V4
// Coordinates safety, psychology, compliance, and technical validation

import { CrisisDetector, CrisisDetectionResult } from '@/lib/crisis-detection/detector'

export interface AgentResult {
  agentType: 'safety' | 'psychology' | 'compliance' | 'technical'
  result: any
  confidence: number
  processingTime: number
  errors?: string[]
  warnings?: string[]
}

export interface OrchestrationResult {
  success: boolean
  results: AgentResult[]
  finalDecision: {
    approved: boolean
    reasoning: string
    requiredActions: string[]
    restrictions?: string[]
  }
  processingTime: number
  safetyOverride?: boolean
}

export interface OrchestrationConfig {
  mode: 'sequential' | 'parallel' | 'hybrid'
  safetyFirst: boolean
  timeout: number
  fallbackOnError: boolean
  requireAllAgents: boolean
}

export class AgentOrchestrator {
  private config: OrchestrationConfig
  private agents: Map<string, any> = new Map()

  constructor(config: OrchestrationConfig = {
    mode: 'sequential',
    safetyFirst: true,
    timeout: 5000,
    fallbackOnError: true,
    requireAllAgents: false
  }) {
    this.config = config
    this.initializeAgents()
  }

  private initializeAgents() {
    // Register available agents
    this.agents.set('safety', new SafetyValidatorAgent())
    this.agents.set('psychology', new PsychologyExpertAgent())
    this.agents.set('compliance', new ComplianceOfficerAgent())
    this.agents.set('technical', new TechnicalArchitectAgent())
  }

  /**
   * Main orchestration method - coordinates all agents
   */
  async orchestrate(
    input: string,
    context: {
      userId: string
      coupleId?: string
      type: 'assessment' | 'guidance' | 'crisis' | 'general'
      additionalContext?: Record<string, any>
    }
  ): Promise<OrchestrationResult> {
    const startTime = Date.now()
    const results: AgentResult[] = []

    try {
      // Step 1: Always run safety first
      const safetyResult = await this.runSafetyAgent(input, context)
      results.push(safetyResult)

      // Check for crisis - if detected, handle immediately
      if (safetyResult.result.safetyLevel === 'critical' || safetyResult.result.requiresImmediateIntervention) {
        return {
          success: true,
          results,
          finalDecision: {
            approved: true,
            reasoning: 'Crisis detected - immediate intervention required',
            requiredActions: [
              'Activate crisis intervention protocol',
              'Connect to emergency resources',
              'Implement safety plan'
            ]
          },
          processingTime: Date.now() - startTime,
          safetyOverride: true
        }
      }

      // Step 2: Run other agents based on configuration
      const otherAgentResults = await this.runOtherAgents(input, context, safetyResult)
      results.push(...otherAgentResults)

      // Step 3: Synthesize results
      const finalDecision = this.synthesizeResults(results)

      return {
        success: true,
        results,
        finalDecision,
        processingTime: Date.now() - startTime
      }

    } catch (error) {
      console.error('Agent orchestration failed:', error)
      
      // Emergency fallback
      return {
        success: false,
        results,
        finalDecision: {
          approved: false,
          reasoning: 'Agent orchestration failed - requiring manual review',
          requiredActions: ['Manual professional review required'],
          restrictions: ['Block automated processing']
        },
        processingTime: Date.now() - startTime
      }
    }
  }

  private async runSafetyAgent(input: string, context: any): Promise<AgentResult> {
    const startTime = Date.now()
    const safetyAgent = this.agents.get('safety')!
    
    try {
      const result = await safetyAgent.validate(input, context)
      return {
        agentType: 'safety',
        result,
        confidence: result.confidence || 0.8,
        processingTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        agentType: 'safety',
        result: { safetyLevel: 'concern', requiresReview: true },
        confidence: 0.1,
        processingTime: Date.now() - startTime,
        errors: [`Safety agent error: ${error}`]
      }
    }
  }

  private async runOtherAgents(
    input: string, 
    context: any, 
    safetyResult: AgentResult
  ): Promise<AgentResult[]> {
    const agentTypes = ['psychology', 'compliance', 'technical']
    const results: AgentResult[] = []

    if (this.config.mode === 'parallel') {
      // Run agents in parallel
      const promises = agentTypes.map(type => this.runAgent(type, input, context, safetyResult))
      const parallelResults = await Promise.allSettled(promises)
      
      parallelResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            agentType: agentTypes[index] as any,
            result: { error: 'Agent failed' },
            confidence: 0.1,
            processingTime: 0,
            errors: [`Agent ${agentTypes[index]} failed: ${result.reason}`]
          })
        }
      })
    } else {
      // Run agents sequentially
      for (const agentType of agentTypes) {
        try {
          const result = await this.runAgent(agentType, input, context, safetyResult)
          results.push(result)
          
          // Stop if critical issue found
          if (result.result.critical && !this.config.fallbackOnError) {
            break
          }
        } catch (error) {
          const errorResult: AgentResult = {
            agentType: agentType as any,
            result: { error: 'Agent failed' },
            confidence: 0.1,
            processingTime: 0,
            errors: [`Agent ${agentType} failed: ${error}`]
          }
          results.push(errorResult)
          
          if (this.config.requireAllAgents) {
            break
          }
        }
      }
    }

    return results
  }

  private async runAgent(
    agentType: string, 
    input: string, 
    context: any, 
    safetyResult: AgentResult
  ): Promise<AgentResult> {
    const startTime = Date.now()
    const agent = this.agents.get(agentType)!
    
    const agentContext = {
      ...context,
      safetyResult: safetyResult.result
    }
    
    const result = await agent.validate(input, agentContext)
    
    return {
      agentType: agentType as any,
      result,
      confidence: result.confidence || 0.8,
      processingTime: Date.now() - startTime
    }
  }

  private synthesizeResults(results: AgentResult[]): {
    approved: boolean
    reasoning: string
    requiredActions: string[]
    restrictions?: string[]
  } {
    const safetyResult = results.find(r => r.agentType === 'safety')?.result
    const psychologyResult = results.find(r => r.agentType === 'psychology')?.result
    const complianceResult = results.find(r => r.agentType === 'compliance')?.result
    const technicalResult = results.find(r => r.agentType === 'technical')?.result

    const actions: string[] = []
    const restrictions: string[] = []
    let approved = true
    let reasoning = 'All validations passed'

    // Safety analysis
    if (safetyResult?.safetyLevel === 'concern' || safetyResult?.safetyLevel === 'crisis') {
      actions.push('Enhanced safety monitoring required')
      if (safetyResult.requiresReview) {
        actions.push('Professional review required')
      }
    }

    // Psychology analysis
    if (psychologyResult && !psychologyResult.isValid) {
      approved = false
      reasoning = 'Psychology validation failed'
      restrictions.push('Requires evidence-based content review')
    }

    // Compliance analysis
    if (complianceResult && !complianceResult.compliant) {
      approved = false
      reasoning = 'Compliance validation failed'
      restrictions.push(...(complianceResult.issues || []))
    }

    // Technical analysis
    if (technicalResult?.performanceImpact === 'high') {
      actions.push('Performance optimization required')
    }

    return {
      approved,
      reasoning,
      requiredActions: actions,
      restrictions: restrictions.length > 0 ? restrictions : undefined
    }
  }
}

// Individual Agent Implementations

class SafetyValidatorAgent {
  async validate(input: string, context: any) {
    // Use existing crisis detector
    const crisisResult = await CrisisDetector.detectCrisis(
      input,
      context.userId,
      context.coupleId,
      context.additionalContext
    )

    return {
      safetyLevel: crisisResult.severity,
      requiresImmediateIntervention: crisisResult.requiresImmediateIntervention,
      requiresReview: crisisResult.professionalReferralNeeded,
      crisisIndicators: crisisResult.indicators,
      confidence: Math.max(...crisisResult.indicators.map(i => i.confidence)) || 0.8
    }
  }
}

class PsychologyExpertAgent {
  async validate(input: string, context: any) {
    // Framework detection
    const framework = this.detectFramework(input)
    const evidenceBase = this.validateEvidenceBase(input, framework)
    
    return {
      isValid: evidenceBase.isValid,
      framework,
      evidenceBase: evidenceBase.sources,
      recommendations: this.generateRecommendations(input, framework),
      culturalSensitivity: this.assessCulturalSensitivity(input),
      ethicsCompliance: this.checkEthicsCompliance(input),
      confidence: evidenceBase.isValid ? 0.8 : 0.3
    }
  }

  private detectFramework(content: string) {
    const frameworks = {
      gottman: ['love map', 'four horsemen', 'fondness', 'admiration', 'emotional bank'],
      eft: ['attachment', 'emotional cycle', 'bonding', 'accessible', 'responsive'],
      attachment: ['secure', 'anxious', 'avoidant', 'attachment style'],
      communication: ['active listening', 'i statement', 'nonviolent communication']
    }

    for (const [framework, keywords] of Object.entries(frameworks)) {
      if (keywords.some(keyword => content.toLowerCase().includes(keyword))) {
        return framework
      }
    }

    return 'general'
  }

  private validateEvidenceBase(content: string, framework: string) {
    // Check for harmful patterns
    const harmfulPatterns = [
      'just get over it',
      'all men are',
      'all women are',
      'you should leave them',
      'couples should never fight'
    ]

    const isHarmful = harmfulPatterns.some(pattern => 
      content.toLowerCase().includes(pattern)
    )

    const evidenceSources = {
      gottman: ['Gottman Institute Research', 'Journal of Marriage and Family Therapy'],
      eft: ['Sue Johnson EFT Research', 'Attachment & Human Development'],
      attachment: ['Bowlby Attachment Theory', 'Adult Attachment Research'],
      communication: ['Nonviolent Communication Research', 'Active Listening Studies']
    }

    return {
      isValid: !isHarmful,
      sources: evidenceSources[framework] || ['General relationship research']
    }
  }

  private generateRecommendations(content: string, framework: string) {
    const recommendations = []

    if (framework === 'gottman') {
      recommendations.push('Consider Gottman Method exercises')
      recommendations.push('Focus on building Love Maps')
    } else if (framework === 'eft') {
      recommendations.push('Explore attachment patterns')
      recommendations.push('Practice emotional accessibility')
    }

    return recommendations
  }

  private assessCulturalSensitivity(content: string) {
    // Basic cultural sensitivity check
    const insensitiveTerms = ['normal family', 'traditional values', 'real men', 'real women']
    const hasIssues = insensitiveTerms.some(term => content.toLowerCase().includes(term))
    
    return hasIssues ? 'Requires cultural sensitivity review' : 'Culturally appropriate'
  }

  private checkEthicsCompliance(content: string) {
    // Check for ethical issues
    const ethicalIssues = ['guaranteed results', 'cure relationship', 'fix your partner']
    const hasIssues = ethicalIssues.some(issue => content.toLowerCase().includes(issue))
    
    return hasIssues ? 'Ethics concerns identified' : 'Ethically appropriate'
  }
}

class ComplianceOfficerAgent {
  async validate(input: string, context: any) {
    const educationalScope = this.validateEducationalScope(input)
    const privacyCompliance = this.validatePrivacyCompliance(input)
    const safetyProtocols = this.validateSafetyProtocols(input, context.safetyResult)

    const allCompliant = educationalScope.compliant && 
                        privacyCompliance.compliant && 
                        safetyProtocols.compliant

    return {
      compliant: allCompliant,
      regulations: ['GDPR', 'PIPEDA', 'privacy', 'educational'],
      issues: [
        ...educationalScope.issues,
        ...privacyCompliance.issues,
        ...safetyProtocols.issues
      ],
      recommendations: [
        ...educationalScope.recommendations,
        ...privacyCompliance.recommendations,
        ...safetyProtocols.recommendations
      ],
      riskLevel: allCompliant ? 'low' : 'medium',
      auditTrail: `Compliance check performed at ${new Date().toISOString()}`
    }
  }

  private validateEducationalScope(content: string) {
    const medicalClaims = ['diagnose', 'treat', 'cure', 'therapy session', 'medical advice']
    const therapeuticClaims = ['licensed therapy', 'clinical treatment', 'psychological treatment']
    
    const hasMedicalClaims = medicalClaims.some(claim => 
      content.toLowerCase().includes(claim)
    )
    const hasTherapeuticClaims = therapeuticClaims.some(claim =>
      content.toLowerCase().includes(claim)
    )

    const issues = []
    const recommendations = []

    if (hasMedicalClaims) {
      issues.push('Contains medical claims')
      recommendations.push('Use educational language instead of medical terminology')
    }

    if (hasTherapeuticClaims) {
      issues.push('Contains therapeutic claims')
      recommendations.push('Clarify that this is educational content, not therapy')
    }

    return {
      compliant: !hasMedicalClaims && !hasTherapeuticClaims,
      issues,
      recommendations
    }
  }

  private validatePrivacyCompliance(content: string) {
    const phiClaims = ['hipaa compliant', 'protected health information', 'medical records']
    const privacyIssues = ['we store your health data', 'medical information sharing']
    
    const hasPhiClaims = phiClaims.some(claim => content.toLowerCase().includes(claim))
    const hasPrivacyIssues = privacyIssues.some(issue => content.toLowerCase().includes(issue))

    const issues = []
    const recommendations = []

    if (hasPhiClaims) {
      issues.push('Contains PHI claims')
      recommendations.push('Remove health information claims')
    }

    if (hasPrivacyIssues) {
      issues.push('Privacy concerns identified')
      recommendations.push('Clarify wellness-only data processing')
    }

    return {
      compliant: !hasPhiClaims && !hasPrivacyIssues,
      issues,
      recommendations
    }
  }

  private validateSafetyProtocols(content: string, safetyResult: any) {
    const automationClaims = [
      'we will call emergency services',
      'automatic partner notification',
      'we will contact your family'
    ]

    const hasAutomationClaims = automationClaims.some(claim =>
      content.toLowerCase().includes(claim)
    )

    const issues = []
    const recommendations = []

    if (hasAutomationClaims) {
      issues.push('Contains automated intervention claims')
      recommendations.push('Clarify user-initiated support model')
    }

    // Special handling for DV scenarios
    if (safetyResult?.crisisIndicators?.some((i: any) => 
      i.triggeredBy?.includes('violence') || i.triggeredBy?.includes('afraid')
    )) {
      if (content.includes('notify partner') || content.includes('tell your partner')) {
        issues.push('DV safety concern - automated partner notification')
        recommendations.push('Remove partner notification for DV scenarios')
      }
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    }
  }
}

class TechnicalArchitectAgent {
  async validate(input: string, context: any) {
    const performanceImpact = this.analyzePerformanceImpact(input, context)
    const securityConsiderations = this.identifySecurityNeeds(input, context)
    const scalabilityAssessment = this.assessScalability(input, context)

    return {
      performanceImpact,
      securityConsiderations,
      scalabilityAssessment,
      architecturalRecommendations: this.generateArchitecturalRecommendations(
        performanceImpact, securityConsiderations, scalabilityAssessment
      ),
      resourceRequirements: this.calculateResourceRequirements(performanceImpact, context),
      confidence: 0.8
    }
  }

  private analyzePerformanceImpact(input: string, context: any) {
    if (context.type === 'crisis') return 'high'
    
    const heavyOperations = [
      'real-time', 'ai processing', 'video', 'large file',
      'complex analysis', 'machine learning'
    ]
    
    const hasHeavyOps = heavyOperations.some(op => 
      input.toLowerCase().includes(op)
    )

    return hasHeavyOps ? 'medium' : 'low'
  }

  private identifySecurityNeeds(input: string, context: any) {
    const considerations = []

    if (input.includes('personal') || input.includes('relationship') || input.includes('private')) {
      considerations.push('Data encryption required')
      considerations.push('Access control needed')
      considerations.push('Audit logging required')
    }

    if (context.safetyResult?.safetyLevel === 'crisis') {
      considerations.push('Emergency response security protocols')
      considerations.push('Crisis data handling procedures')
    }

    if (input.includes('payment') || input.includes('billing')) {
      considerations.push('PCI compliance required')
      considerations.push('Financial data encryption')
    }

    return considerations
  }

  private assessScalability(input: string, context: any) {
    if (context.type === 'crisis') {
      return 'High availability required - crisis response must scale immediately'
    }

    if (input.includes('real-time') || input.includes('concurrent')) {
      return 'Horizontal scaling pattern needed for concurrent access'
    }

    return 'Standard scaling patterns sufficient'
  }

  private generateArchitecturalRecommendations(
    performanceImpact: string,
    securityConsiderations: string[],
    scalabilityAssessment: string
  ) {
    const recommendations = []

    if (performanceImpact === 'high') {
      recommendations.push('Implement caching strategy')
      recommendations.push('Consider async processing')
      recommendations.push('Add performance monitoring')
    }

    if (securityConsiderations.length > 0) {
      recommendations.push('Implement zero-trust security model')
      recommendations.push('Add comprehensive audit logging')
    }

    if (scalabilityAssessment.includes('High availability')) {
      recommendations.push('Multi-region deployment')
      recommendations.push('Auto-scaling configuration')
      recommendations.push('Circuit breaker patterns')
    }

    return recommendations
  }

  private calculateResourceRequirements(performanceImpact: string, context: any) {
    const baseRequirements = {
      cpu: 'standard',
      memory: 'standard',
      storage: 'standard',
      network: 'standard'
    }

    if (performanceImpact === 'high') {
      baseRequirements.cpu = 'high'
      baseRequirements.memory = 'high'
    }

    if (context.type === 'crisis') {
      baseRequirements.network = 'high'
      baseRequirements.storage = 'high' // For audit logging
    }

    return baseRequirements
  }
}

// Export the orchestrator for use in the application
export const agentOrchestrator = new AgentOrchestrator()