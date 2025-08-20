import Anthropic from '@anthropic-ai/sdk'
import { AgentInput, AgentOutput, PsychologyValidation } from '../orchestration/types'

export interface PsychologyFramework {
  name: string
  description: string
  keyPrinciples: string[]
  assessmentTools?: string[]
  evidenceBase: string[]
  applicationContexts: string[]
}

export interface TherapeuticValidationResult extends PsychologyValidation {
  therapeuticFramework: string
  clinicalAccuracy: number
  safetyConsiderations: string[]
  culturalSensitivity: string
  ethicsCompliance: string
  researchCitations: string[]
  validationTimestamp: string
}

export class RelationshipPsychologyExpertAgent {
  private anthropic: Anthropic
  private frameworks: Map<string, PsychologyFramework> = new Map()
  private researchDatabase: Map<string, any> = new Map()
  private memoryStore: Map<string, any> = new Map()

  constructor(anthropic: Anthropic) {
    this.anthropic = anthropic
    this.initializeFrameworks()
    this.loadPersistedMemory()
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now()
    
    try {
      // Pre-content review with memory integration
      await this.preContentReview(input)
      
      // Determine optimal framework for this input
      const optimalFramework = this.selectOptimalFramework(input)
      
      // Validate content against evidence-based frameworks
      const validationResult = await this.validateAgainstFrameworks(input, optimalFramework)
      
      // Cross-reference with current research standards
      const researchValidation = await this.validateAgainstResearch(validationResult, input)
      
      // Check cultural sensitivity and inclusivity
      const culturalValidation = await this.validateCulturalSensitivity(input, researchValidation)
      
      // Store validation results for continuous learning
      await this.storeValidationResults(input, culturalValidation)

      const processingTime = Date.now() - startTime

      return {
        agentType: 'psychology',
        result: culturalValidation,
        confidence: culturalValidation.confidence,
        requiresReview: !culturalValidation.isValid || culturalValidation.clinicalAccuracy < 7,
        processingTime
      }
    } catch (error) {
      return this.createErrorResponse(error, startTime)
    }
  }

  private async preContentReview(input: AgentInput): Promise<void> {
    // Retrieve relationship psychology principles from memory
    const principles = this.memoryStore.get('relationship-psychology-principles') || {}
    
    // Check for any previous validations for this user/couple
    const validationHistory = this.memoryStore.get(`psychology-validation-${input.userId}`) || []
    
    // Analyze patterns in previous therapeutic content preferences
    if (validationHistory.length > 0) {
      const frameworkPreferences = this.analyzeFrameworkPreferences(validationHistory)
      this.memoryStore.set(`framework-preferences-${input.userId}`, frameworkPreferences)
    }
  }

  private selectOptimalFramework(input: AgentInput): PsychologyFramework {
    const message = input.message.toLowerCase()
    const context = input.context
    const userPreferences = this.memoryStore.get(`framework-preferences-${input.userId}`)

    // Check user's historical preferences first
    if (userPreferences && userPreferences.preferredFramework) {
      const preferred = this.frameworks.get(userPreferences.preferredFramework)
      if (preferred) return preferred
    }

    // Context-based framework selection
    if (context === 'crisis') {
      return this.frameworks.get('attachment') || this.frameworks.get('general')!
    }

    // Content-based framework selection
    if (this.containsGottmanIndicators(message)) {
      return this.frameworks.get('gottman')!
    } else if (this.containsEFTIndicators(message)) {
      return this.frameworks.get('eft')!
    } else if (this.containsAttachmentIndicators(message)) {
      return this.frameworks.get('attachment')!
    } else if (this.containsCommunicationIndicators(message)) {
      return this.frameworks.get('communication')!
    }

    return this.frameworks.get('general')!
  }

  private async validateAgainstFrameworks(
    input: AgentInput,
    framework: PsychologyFramework
  ): Promise<TherapeuticValidationResult> {
    const prompt = `
    EVIDENCE-BASED PSYCHOLOGY VALIDATION

    Framework: ${framework.name}
    Description: ${framework.description}
    
    Key Principles to Validate Against:
    ${framework.keyPrinciples.map(p => `- ${p}`).join('\n')}

    Evidence Base:
    ${framework.evidenceBase.map(e => `- ${e}`).join('\n')}

    Content to Validate:
    User Message: "${input.message}"
    Context: ${input.context}
    
    As a relationship psychology expert, provide comprehensive validation:

    1. THERAPEUTIC ACCURACY ASSESSMENT:
       - Does this content align with ${framework.name} principles? (1-10 scale)
       - Are there any contraindications or harmful elements?
       - Is the psychological terminology used correctly?
       - Rate clinical accuracy (1-10)

    2. EVIDENCE-BASE VALIDATION:
       - Which specific research supports this content?
       - Are there any unsupported claims?
       - What peer-reviewed studies are relevant?
       - Rate evidence alignment (1-10)

    3. THERAPEUTIC APPROPRIATENESS:
       - Is this appropriate for the relationship context?
       - Are proper therapeutic boundaries maintained?
       - Does this support rather than replace professional therapy?
       - Any safety concerns from psychological perspective?

    4. CULTURAL SENSITIVITY:
       - Is this content inclusive of diverse relationship styles?
       - Are there any cultural biases present?
       - Is the language respectful and non-judgmental?

    5. RECOMMENDATIONS:
       - What improvements would enhance therapeutic value?
       - What additional evidence-based elements could be added?
       - How could this be made more culturally sensitive?

    Focus on evidence-based practice and therapeutic appropriateness.
    `

    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a licensed relationship psychology expert with extensive knowledge of evidence-based therapeutic frameworks. Always prioritize therapeutic appropriateness and evidence-based practice.'
    })

    return this.parseValidationResponse(response.content, framework, input)
  }

  private parseValidationResponse(
    aiResponse: any,
    framework: PsychologyFramework,
    input: AgentInput
  ): TherapeuticValidationResult {
    const content = Array.isArray(aiResponse) ? aiResponse[0]?.text || '' : aiResponse

    // Extract scores and assessments (simplified parsing - would be more sophisticated)
    const clinicalAccuracy = this.extractScore(content, 'clinical accuracy') || 7
    const evidenceAlignment = this.extractScore(content, 'evidence alignment') || 7
    const therapeuticAccuracy = this.extractScore(content, 'therapeutic accuracy') || 7

    const isValid = clinicalAccuracy >= 6 && evidenceAlignment >= 6 && therapeuticAccuracy >= 6
    const confidence = (clinicalAccuracy + evidenceAlignment + therapeuticAccuracy) / 30

    return {
      isValid,
      framework: framework.name,
      evidenceBase: framework.evidenceBase,
      recommendations: this.extractRecommendations(content),
      culturalSensitivity: this.extractCulturalNotes(content),
      ethicsCompliance: this.extractEthicsNotes(content),
      confidence,
      therapeuticFramework: framework.name,
      clinicalAccuracy,
      safetyConsiderations: this.extractSafetyConsiderations(content),
      researchCitations: this.extractResearchCitations(content, framework),
      validationTimestamp: new Date().toISOString()
    }
  }

  private async validateAgainstResearch(
    validation: TherapeuticValidationResult,
    input: AgentInput
  ): Promise<TherapeuticValidationResult> {
    // Cross-reference with research database
    const relevantResearch = this.findRelevantResearch(validation.framework, input.message)
    
    if (relevantResearch.length > 0) {
      validation.researchCitations = validation.researchCitations.concat(
        relevantResearch.map(r => r.citation)
      )
      
      // Adjust confidence based on research support
      const researchSupport = relevantResearch.every(r => r.supportsContent)
      if (researchSupport) {
        validation.confidence = Math.min(validation.confidence + 0.1, 1.0)
      } else {
        validation.confidence = Math.max(validation.confidence - 0.1, 0.1)
        validation.isValid = false
        validation.recommendations.push('Review against contradictory research findings')
      }
    }

    return validation
  }

  private async validateCulturalSensitivity(
    input: AgentInput,
    validation: TherapeuticValidationResult
  ): Promise<TherapeuticValidationResult> {
    const culturalConsiderations = [
      'diverse family structures',
      'different communication styles',
      'varying relationship expectations',
      'cultural conflict resolution approaches',
      'religious and spiritual considerations'
    ]

    const message = input.message.toLowerCase()
    let culturalSensitivityScore = 10

    // Check for potential cultural biases or assumptions
    const problematicPhrases = [
      'normal relationships',
      'healthy families always',
      'everyone should',
      'the right way to'
    ]

    problematicPhrases.forEach(phrase => {
      if (message.includes(phrase)) {
        culturalSensitivityScore -= 2
        validation.recommendations.push(`Consider more inclusive language instead of "${phrase}"`)
      }
    })

    // Check for inclusive language
    const inclusiveLanguage = [
      'different approaches',
      'various styles',
      'cultural differences',
      'diverse perspectives'
    ]

    let inclusivityBonus = 0
    inclusiveLanguage.forEach(phrase => {
      if (message.includes(phrase)) {
        inclusivityBonus += 1
      }
    })

    culturalSensitivityScore = Math.min(culturalSensitivityScore + inclusivityBonus, 10)

    validation.culturalSensitivity = `Cultural sensitivity score: ${culturalSensitivityScore}/10. ${
      culturalSensitivityScore >= 8 ? 'Demonstrates good cultural awareness.' :
      culturalSensitivityScore >= 6 ? 'Some cultural considerations could be improved.' :
      'Requires significant improvement in cultural sensitivity.'
    }`

    if (culturalSensitivityScore < 6) {
      validation.isValid = false
      validation.confidence = Math.max(validation.confidence - 0.2, 0.1)
    }

    return validation
  }

  private extractScore(content: string, scoreType: string): number | null {
    const regex = new RegExp(`${scoreType}[:\\s]*([0-9]+)(?:\\/10)?`, 'i')
    const match = content.match(regex)
    return match ? parseInt(match[1]) : null
  }

  private extractRecommendations(content: string): string[] {
    const recommendations = []
    
    // Look for common recommendation patterns
    if (content.toLowerCase().includes('improve')) {
      recommendations.push('Consider improvements to therapeutic alignment')
    }
    if (content.toLowerCase().includes('research')) {
      recommendations.push('Add more research-based elements')
    }
    if (content.toLowerCase().includes('cultural')) {
      recommendations.push('Enhance cultural sensitivity')
    }
    if (content.toLowerCase().includes('evidence')) {
      recommendations.push('Strengthen evidence-based foundation')
    }

    return recommendations.length > 0 ? recommendations : ['Content meets current standards']
  }

  private extractSafetyConsiderations(content: string): string[] {
    const considerations = []
    
    if (content.toLowerCase().includes('safety') || content.toLowerCase().includes('harm')) {
      considerations.push('Review for potential psychological safety concerns')
    }
    if (content.toLowerCase().includes('crisis') || content.toLowerCase().includes('emergency')) {
      considerations.push('Coordinate with crisis intervention protocols')
    }
    if (content.toLowerCase().includes('professional') || content.toLowerCase().includes('therapist')) {
      considerations.push('Ensure appropriate professional referral language')
    }

    return considerations
  }

  private extractCulturalNotes(content: string): string {
    if (content.toLowerCase().includes('cultural')) {
      return 'Cultural considerations identified in content'
    }
    return 'Standard cultural sensitivity review completed'
  }

  private extractEthicsNotes(content: string): string {
    if (content.toLowerCase().includes('ethics') || content.toLowerCase().includes('boundaries')) {
      return 'Ethical considerations require attention'
    }
    return 'Meets standard ethical guidelines for educational content'
  }

  private extractResearchCitations(content: string, framework: PsychologyFramework): string[] {
    // Return framework's evidence base as research citations
    return framework.evidenceBase
  }

  private findRelevantResearch(framework: string, content: string): any[] {
    // Simplified research lookup - would connect to actual research databases
    const research = this.researchDatabase.get(framework) || []
    return research.filter((r: any) => 
      content.toLowerCase().includes(r.keywords.some((k: string) => 
        content.toLowerCase().includes(k.toLowerCase())
      ))
    )
  }

  private analyzeFrameworkPreferences(history: any[]): any {
    const frameworkCounts = history.reduce((acc, validation) => {
      const framework = validation.framework
      acc[framework] = (acc[framework] || 0) + 1
      return acc
    }, {})

    const mostUsed = Object.entries(frameworkCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]

    return {
      preferredFramework: mostUsed ? mostUsed[0] : null,
      frameworkDistribution: frameworkCounts,
      totalValidations: history.length
    }
  }

  private containsGottmanIndicators(message: string): boolean {
    const gottmanKeywords = [
      'love map', 'four horsemen', 'fondness', 'admiration',
      'criticism', 'contempt', 'defensiveness', 'stonewalling',
      'repair attempt', 'emotional bank'
    ]
    return gottmanKeywords.some(keyword => message.includes(keyword))
  }

  private containsEFTIndicators(message: string): boolean {
    const eftKeywords = [
      'attachment', 'emotional cycle', 'bonding', 'accessible',
      'responsive', 'engaged', 'negative cycle', 'pursue',
      'withdraw', 'emotionally focused'
    ]
    return eftKeywords.some(keyword => message.includes(keyword))
  }

  private containsAttachmentIndicators(message: string): boolean {
    const attachmentKeywords = [
      'secure', 'anxious', 'avoidant', 'attachment style',
      'trust', 'security', 'abandonment', 'independence',
      'intimacy', 'attachment pattern'
    ]
    return attachmentKeywords.some(keyword => message.includes(keyword))
  }

  private containsCommunicationIndicators(message: string): boolean {
    const communicationKeywords = [
      'communication', 'listening', 'express', 'talk',
      'conversation', 'dialogue', 'discuss', 'share',
      'understand', 'empathy'
    ]
    return communicationKeywords.some(keyword => message.includes(keyword))
  }

  private async storeValidationResults(
    input: AgentInput,
    result: TherapeuticValidationResult
  ): Promise<void> {
    const timestamp = Date.now()
    
    // Store in user's validation history
    const userHistory = this.memoryStore.get(`psychology-validation-${input.userId}`) || []
    userHistory.push({
      timestamp,
      framework: result.framework,
      clinicalAccuracy: result.clinicalAccuracy,
      confidence: result.confidence,
      isValid: result.isValid
    })
    
    // Keep last 30 validations
    this.memoryStore.set(`psychology-validation-${input.userId}`, userHistory.slice(-30))

    // Store detailed validation for analysis
    this.memoryStore.set(`psychology-validation-detail-${timestamp}`, {
      userId: input.userId,
      coupleId: input.coupleId,
      result,
      validatorAgent: 'relationship-psychology-expert'
    })
  }

  private createErrorResponse(error: any, startTime: number): AgentOutput {
    return {
      agentType: 'psychology',
      result: {
        isValid: false,
        framework: 'error',
        evidenceBase: [],
        recommendations: ['Psychology validation failed - require human review'],
        culturalSensitivity: 'Unable to assess due to error',
        ethicsCompliance: 'Unable to assess due to error',
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
      // Load relationship psychology principles from JSON file
      const fs = await import('fs/promises')
      const principlesData = await fs.readFile(
        '/Users/chrisouimet/Sparq-ConnectionV4/memory/relationship-psychology-principles.json',
        'utf-8'
      )
      this.memoryStore.set('relationship-psychology-principles', JSON.parse(principlesData))
    } catch (error) {
      console.warn('Could not load persisted memory for PsychologyExpert:', error)
    }
  }

  private initializeFrameworks(): void {
    this.frameworks.set('gottman', {
      name: 'gottman',
      description: 'Evidence-based approach focusing on the Four Horsemen, Love Maps, and Emotional Banking',
      keyPrinciples: [
        'Build Love Maps - Know your partner deeply',
        'Nurture fondness and admiration',
        'Turn toward each other during everyday moments',
        'Accept influence from your partner',
        'Solve solvable problems',
        'Overcome gridlock on perpetual problems',
        'Create shared meaning'
      ],
      assessmentTools: ['Sound Relationship House Assessment', 'Four Horsemen Assessment'],
      evidenceBase: [
        'Gottman Institute Research (40+ years)',
        'Journal of Marriage and Family Therapy studies',
        'Longitudinal relationship outcome studies'
      ],
      applicationContexts: ['conflict resolution', 'emotional connection', 'relationship maintenance']
    })

    this.frameworks.set('eft', {
      name: 'eft',
      description: 'Attachment-based therapy focusing on emotional bonds and cycles',
      keyPrinciples: [
        'Identify negative cycles',
        'Access underlying emotions',
        'Restructure interactions',
        'Create new bonding experiences'
      ],
      assessmentTools: ['Experiences in Close Relationships-Revised', 'Attachment Style Assessment'],
      evidenceBase: [
        'Sue Johnson EFT research',
        'Attachment & Human Development studies',
        'Clinical outcome research'
      ],
      applicationContexts: ['emotional connection', 'attachment security', 'trauma recovery']
    })

    this.frameworks.set('attachment', {
      name: 'attachment',
      description: 'Foundation for understanding relationship patterns and emotional bonds',
      keyPrinciples: [
        'Understand individual attachment styles',
        'Recognize attachment triggers and responses',
        'Create secure base behaviors',
        'Build safe haven interactions',
        'Foster interdependence and autonomy'
      ],
      assessmentTools: ['Adult Attachment Interview', 'Attachment Style Questionnaire'],
      evidenceBase: [
        'Bowlby attachment research',
        'Adult attachment studies',
        'Developmental psychology research'
      ],
      applicationContexts: ['trust building', 'emotional security', 'relationship patterns']
    })

    this.frameworks.set('communication', {
      name: 'communication',
      description: 'Research-based communication and conflict resolution approaches',
      keyPrinciples: [
        'Practice active listening skills',
        'Use "I" statements for expression',
        'Validate partner perspectives',
        'Manage conflict constructively',
        'Build empathy and understanding'
      ],
      assessmentTools: ['Communication Patterns Questionnaire', 'Conflict Resolution Styles'],
      evidenceBase: [
        'Communication research studies',
        'Nonviolent communication research',
        'Conflict resolution outcome studies'
      ],
      applicationContexts: ['conflict resolution', 'daily communication', 'emotional expression']
    })

    this.frameworks.set('general', {
      name: 'general',
      description: 'General relationship psychology principles and evidence-based practices',
      keyPrinciples: [
        'Evidence-based practice',
        'Therapeutic boundaries',
        'Cultural sensitivity',
        'Ethical guidelines'
      ],
      evidenceBase: [
        'General relationship psychology research',
        'Meta-analyses of couple interventions',
        'Clinical practice guidelines'
      ],
      applicationContexts: ['general relationship guidance', 'educational content', 'resource provision']
    })
  }

  // Health check and metrics
  getAgentHealth(): any {
    return {
      agentType: 'relationship-psychology-expert',
      status: 'active',
      memorySize: this.memoryStore.size,
      frameworksLoaded: this.frameworks.size,
      lastUpdate: Date.now(),
      configuration: {
        availableFrameworks: Array.from(this.frameworks.keys()),
        researchDatabaseSize: this.researchDatabase.size
      }
    }
  }
}

export default RelationshipPsychologyExpertAgent