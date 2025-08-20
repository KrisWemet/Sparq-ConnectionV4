import { Agent, AgentType, AgentInput, AgentOutput, PsychologyValidation } from '../orchestration/types'

export class StandardPsychologyAgent implements Agent {
  type: AgentType = 'psychology'
  name = 'Standard Psychology Validator'
  description = 'Evidence-based relationship psychology validation using established frameworks'
  capabilities = [
    'psychology-validation',
    'evidence-base-checking',
    'framework-compliance',
    'clinical-appropriateness'
  ]
  priority = 8

  private frameworks = {
    gottman: {
      name: 'Gottman Method',
      principles: [
        'Build Love Maps',
        'Nurture fondness and admiration', 
        'Turn toward each other',
        'Accept influence',
        'Solve solvable problems',
        'Overcome gridlock',
        'Create shared meaning'
      ],
      fourHorsemen: ['Criticism', 'Contempt', 'Defensiveness', 'Stonewalling'],
      antidotes: ['Use I statements', 'Express appreciation', 'Take responsibility', 'Self-soothe']
    },
    eft: {
      name: 'Emotionally Focused Therapy',
      principles: [
        'Identify negative cycles',
        'Access underlying emotions',
        'Restructure interactions', 
        'Create new bonding experiences'
      ]
    },
    attachment: {
      name: 'Attachment Theory',
      styles: ['Secure', 'Anxious', 'Avoidant', 'Disorganized']
    },
    communication: {
      name: 'Communication Research',
      techniques: ['Active listening', 'Nonviolent communication', 'Conflict resolution']
    }
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now()
    
    try {
      const validation = await this.validatePsychologyContent(input)
      
      return {
        agentType: this.type,
        result: validation,
        confidence: validation.confidence,
        requiresReview: !validation.isValid || validation.confidence < 0.8,
        processingTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        agentType: this.type,
        result: this.getFailsafeValidation(),
        confidence: 0,
        requiresReview: true,
        processingTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  validate(input: AgentInput): boolean {
    return !!(input.userId && input.message)
  }

  private async validatePsychologyContent(input: AgentInput): Promise<PsychologyValidation> {
    const content = input.message.toLowerCase()
    
    // Detect which framework applies
    const framework = this.detectFramework(content)
    
    // Validate against evidence base
    const evidenceValidation = this.validateEvidenceBase(content, framework)
    
    // Check cultural sensitivity
    const culturalCheck = this.checkCulturalSensitivity(content)
    
    // Ethics compliance check
    const ethicsCheck = this.checkEthicsCompliance(content, input.context)
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(content, framework)
    
    const confidence = this.calculateValidationConfidence(
      evidenceValidation,
      culturalCheck,
      ethicsCheck
    )

    return {
      isValid: evidenceValidation.isValid && culturalCheck.isValid && ethicsCheck.isValid,
      framework,
      evidenceBase: evidenceValidation.sources,
      recommendations,
      culturalSensitivity: culturalCheck.assessment,
      ethicsCompliance: ethicsCheck.assessment,
      confidence
    }
  }

  private detectFramework(content: string): PsychologyValidation['framework'] {
    // Check for Gottman Method indicators
    const gottmanKeywords = ['love map', 'four horsemen', 'fondness', 'admiration', 'influence', 'gridlock']
    if (gottmanKeywords.some(keyword => content.includes(keyword))) {
      return 'gottman'
    }

    // Check for EFT indicators
    const eftKeywords = ['attachment', 'emotional cycle', 'bonding', 'accessibility', 'responsiveness']
    if (eftKeywords.some(keyword => content.includes(keyword))) {
      return 'eft'
    }

    // Check for attachment theory
    const attachmentKeywords = ['secure', 'anxious', 'avoidant', 'attachment style']
    if (attachmentKeywords.some(keyword => content.includes(keyword))) {
      return 'attachment'
    }

    // Check for communication research
    const commKeywords = ['active listening', 'communication', 'conflict resolution', 'i statement']
    if (commKeywords.some(keyword => content.includes(keyword))) {
      return 'communication'
    }

    return 'general'
  }

  private validateEvidenceBase(content: string, framework: string): {
    isValid: boolean
    sources: string[]
  } {
    // In a real implementation, this would check against a database of 
    // peer-reviewed research and established therapeutic practices
    
    const sources: string[] = []
    let isValid = true

    // Check for harmful or non-evidence-based content
    const harmfulPatterns = [
      'just get over it',
      'all men/women are',
      'you should just leave',
      'relationship is doomed',
      'can\'t change'
    ]

    if (harmfulPatterns.some(pattern => content.includes(pattern))) {
      isValid = false
    }

    // Add relevant research sources based on framework
    switch (framework) {
      case 'gottman':
        sources.push(
          'Gottman, J. M. (1999). The Marriage Clinic',
          'Gottman, J. M. & Levenson, R. W. (1992). Marital processes predictive of later dissolution'
        )
        break
      case 'eft':
        sources.push(
          'Johnson, S. M. (2019). Attachment in Psychotherapy',
          'Johnson, S. M. & Greenberg, L. S. (1985). Emotionally focused couples therapy'
        )
        break
      case 'attachment':
        sources.push(
          'Bowlby, J. (1988). A Secure Base',
          'Hazan, C. & Shaver, P. (1987). Romantic love conceptualized as an attachment process'
        )
        break
      case 'communication':
        sources.push(
          'Markman, H. J. et al. (2010). Fighting for Your Marriage',
          'Rosenberg, M. B. (2003). Nonviolent Communication'
        )
        break
    }

    return { isValid, sources }
  }

  private checkCulturalSensitivity(content: string): {
    isValid: boolean
    assessment: string
  } {
    // Check for culturally insensitive content
    const problematicTerms = [
      'all cultures',
      'traditional roles',
      'normal families',
      'proper relationships'
    ]

    const hasProblematic = problematicTerms.some(term => content.includes(term))

    return {
      isValid: !hasProblematic,
      assessment: hasProblematic 
        ? 'Content may contain cultural assumptions that need review'
        : 'Content appears culturally sensitive'
    }
  }

  private checkEthicsCompliance(content: string, context: string): {
    isValid: boolean
    assessment: string
  } {
    // Check for ethical violations
    const ethicalConcerns = [
      'force',
      'manipulate',
      'control',
      'threaten',
      'punish'
    ]

    const hasEthicalConcerns = ethicalConcerns.some(concern => content.includes(concern))

    // Additional checks for crisis context
    if (context === 'crisis' && !content.includes('professional help')) {
      return {
        isValid: false,
        assessment: 'Crisis context requires professional referral mention'
      }
    }

    return {
      isValid: !hasEthicalConcerns,
      assessment: hasEthicalConcerns
        ? 'Content may contain ethically problematic suggestions'
        : 'Content meets ethical guidelines'
    }
  }

  private generateRecommendations(content: string, framework: string): string[] {
    const recommendations: string[] = []

    // Framework-specific recommendations
    switch (framework) {
      case 'gottman':
        recommendations.push('Reference specific Gottman research studies')
        recommendations.push('Include antidotes to the Four Horsemen')
        break
      case 'eft':
        recommendations.push('Focus on emotional accessibility and responsiveness')
        recommendations.push('Address attachment needs in the relationship')
        break
      case 'attachment':
        recommendations.push('Explain attachment styles without pathologizing')
        recommendations.push('Emphasize earned security possibilities')
        break
      case 'communication':
        recommendations.push('Provide specific communication techniques')
        recommendations.push('Include active listening practices')
        break
    }

    // General recommendations
    if (!content.includes('research') && !content.includes('study')) {
      recommendations.push('Add research citations to support claims')
    }

    if (!content.includes('individual differences')) {
      recommendations.push('Acknowledge individual and cultural differences')
    }

    return recommendations
  }

  private calculateValidationConfidence(
    evidenceValidation: any,
    culturalCheck: any,
    ethicsCheck: any
  ): number {
    let confidence = 0.5 // Base confidence

    if (evidenceValidation.isValid) confidence += 0.3
    if (culturalCheck.isValid) confidence += 0.1
    if (ethicsCheck.isValid) confidence += 0.1

    // Boost confidence if we have good evidence base
    if (evidenceValidation.sources.length > 0) {
      confidence += evidenceValidation.sources.length * 0.05
    }

    return Math.min(confidence, 0.99)
  }

  private getFailsafeValidation(): PsychologyValidation {
    return {
      isValid: false,
      framework: 'general',
      evidenceBase: [],
      recommendations: ['Content requires professional psychology review'],
      culturalSensitivity: 'Unable to assess - requires manual review',
      ethicsCompliance: 'Unable to assess - requires manual review',
      confidence: 0
    }
  }

  // Helper methods for specific psychology validations
  getFrameworkPrinciples(framework: string): string[] {
    switch (framework) {
      case 'gottman':
        return this.frameworks.gottman.principles
      case 'eft':
        return this.frameworks.eft.principles
      default:
        return []
    }
  }

  validateAgainstGottmanPrinciples(content: string): {
    alignedPrinciples: string[]
    violations: string[]
  } {
    const alignedPrinciples: string[] = []
    const violations: string[] = []

    // Check alignment with Gottman principles
    if (content.includes('know') && content.includes('partner')) {
      alignedPrinciples.push('Build Love Maps')
    }

    // Check for Four Horsemen violations
    if (content.includes('you always') || content.includes('you never')) {
      violations.push('Contains criticism patterns')
    }

    if (content.includes('contempt') || content.includes('eye roll')) {
      violations.push('Contains contempt patterns')
    }

    return { alignedPrinciples, violations }
  }
}