import { Agent, AgentType, AgentInput, AgentOutput, ComplianceCheck } from '../orchestration/types'

export class StandardComplianceAgent implements Agent {
  type: AgentType = 'compliance'
  name = 'Standard Compliance Officer'
  description = 'Privacy-by-design and educational platform compliance validation'
  capabilities = [
    'privacy-compliance',
    'educational-scope-validation',
    'data-protection-assessment',
    'regulatory-alignment'
  ]
  priority = 6

  private regulations = {
    GDPR: {
      name: 'General Data Protection Regulation',
      principles: [
        'lawfulness-fairness-transparency',
        'purpose-limitation',
        'data-minimization',
        'accuracy',
        'storage-limitation',
        'integrity-confidentiality',
        'accountability'
      ]
    },
    PIPEDA: {
      name: 'Personal Information Protection and Electronic Documents Act',
      principles: [
        'accountability',
        'identifying-purposes',
        'consent',
        'limiting-collection',
        'limiting-use-disclosure',
        'accuracy',
        'safeguards',
        'openness',
        'individual-access',
        'challenging-compliance'
      ]
    }
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now()
    
    try {
      const complianceCheck = await this.validateCompliance(input)
      
      return {
        agentType: this.type,
        result: complianceCheck,
        confidence: this.calculateComplianceConfidence(complianceCheck),
        requiresReview: !complianceCheck.compliant || complianceCheck.riskLevel === 'high',
        processingTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        agentType: this.type,
        result: this.getFailsafeComplianceCheck(),
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

  private async validateCompliance(input: AgentInput): Promise<ComplianceCheck> {
    const content = input.message.toLowerCase()
    const context = input.context
    
    // Check educational scope compliance
    const scopeCompliance = this.validateEducationalScope(content, context)
    
    // Check privacy compliance
    const privacyCompliance = this.validatePrivacyCompliance(content, input)
    
    // Check data handling compliance
    const dataHandlingCompliance = this.validateDataHandling(content, input)
    
    // Check for regulatory alignment
    const regulatoryCompliance = this.validateRegulatoryAlignment(content)
    
    // Aggregate results
    const allCompliant = scopeCompliance.compliant && 
                        privacyCompliance.compliant && 
                        dataHandlingCompliance.compliant &&
                        regulatoryCompliance.compliant

    const allIssues = [
      ...scopeCompliance.issues,
      ...privacyCompliance.issues,
      ...dataHandlingCompliance.issues,
      ...regulatoryCompliance.issues
    ]

    const allRecommendations = [
      ...scopeCompliance.recommendations,
      ...privacyCompliance.recommendations,
      ...dataHandlingCompliance.recommendations,
      ...regulatoryCompliance.recommendations
    ]

    const riskLevel = this.calculateRiskLevel(allIssues)

    return {
      compliant: allCompliant,
      regulations: ['GDPR', 'PIPEDA', 'privacy', 'educational'],
      issues: allIssues,
      recommendations: allRecommendations,
      riskLevel,
      auditTrail: this.generateAuditTrail(input, allCompliant, allIssues)
    }
  }

  private validateEducationalScope(content: string, context: string): {
    compliant: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check for medical/therapy claims
    const medicalClaims = [
      'diagnose',
      'treat',
      'cure',
      'therapy',
      'medical advice',
      'clinical treatment',
      'psychiatric'
    ]

    medicalClaims.forEach(claim => {
      if (content.includes(claim)) {
        issues.push(`Contains medical/therapy claim: "${claim}"`)
        recommendations.push('Replace with educational language or professional referral')
      }
    })

    // Check for proper educational disclaimers
    if (context === 'assessment' && !content.includes('educational')) {
      recommendations.push('Add educational disclaimer to assessment content')
    }

    // Check for wellness/education positioning
    if (!content.includes('wellness') && !content.includes('education') && !content.includes('information')) {
      recommendations.push('Emphasize wellness/education nature of content')
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    }
  }

  private validatePrivacyCompliance(content: string, input: AgentInput): {
    compliant: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check for PHI processing claims
    const phiClaims = [
      'protected health information',
      'medical records',
      'hipaa compliant',
      'health data'
    ]

    phiClaims.forEach(claim => {
      if (content.includes(claim)) {
        issues.push(`Contains PHI processing claim: "${claim}"`)
        recommendations.push('Remove PHI claims - platform does not process PHI')
      }
    })

    // Check for proper consent language
    if (content.includes('data') && !content.includes('consent')) {
      recommendations.push('Include informed consent language for data processing')
    }

    // Check for privacy-by-design principles
    if (content.includes('collect') || content.includes('store')) {
      if (!content.includes('minimal') && !content.includes('necessary')) {
        recommendations.push('Emphasize data minimization principles')
      }
    }

    // Validate user control mentions
    if (content.includes('your data') && !content.includes('control')) {
      recommendations.push('Emphasize user control over their data')
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    }
  }

  private validateDataHandling(content: string, input: AgentInput): {
    compliant: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check for automated partner notifications (especially for DV)
    if (content.includes('notify partner') || content.includes('alert partner')) {
      issues.push('Contains automated partner notification - violates DV safety protocols')
      recommendations.push('Remove automated partner notifications for user safety')
    }

    // Check for proper data retention language
    if (content.includes('forever') || content.includes('permanently')) {
      issues.push('Contains indefinite data retention language')
      recommendations.push('Specify limited data retention periods')
    }

    // Check for proper security language
    if (content.includes('secure') && !content.includes('encryption')) {
      recommendations.push('Specify encryption and security measures')
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    }
  }

  private validateRegulatoryAlignment(content: string): {
    compliant: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check for GDPR compliance language
    if (content.includes('european') || content.includes('eu users')) {
      if (!content.includes('gdpr')) {
        recommendations.push('Add GDPR compliance reference for EU users')
      }
    }

    // Check for Canadian compliance
    if (content.includes('canadian') || content.includes('canada')) {
      if (!content.includes('pipeda')) {
        recommendations.push('Add PIPEDA compliance reference for Canadian users')
      }
    }

    // Check for proper regulatory scope
    const regulatoryOverreach = [
      'hipaa compliance',
      'medical device',
      'fda approved',
      'clinical trial'
    ]

    regulatoryOverreach.forEach(term => {
      if (content.includes(term)) {
        issues.push(`Regulatory overreach: "${term}"`)
        recommendations.push('Remove medical regulatory claims')
      }
    })

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    }
  }

  private calculateRiskLevel(issues: string[]): 'low' | 'medium' | 'high' {
    if (issues.length === 0) return 'low'
    
    const highRiskPatterns = [
      'medical',
      'therapy',
      'phi',
      'hipaa',
      'partner notification'
    ]

    const hasHighRiskIssues = issues.some(issue => 
      highRiskPatterns.some(pattern => issue.toLowerCase().includes(pattern))
    )

    if (hasHighRiskIssues) return 'high'
    if (issues.length > 3) return 'medium'
    return 'low'
  }

  private calculateComplianceConfidence(check: ComplianceCheck): number {
    let confidence = 0.5

    if (check.compliant) confidence += 0.4
    if (check.riskLevel === 'low') confidence += 0.2
    if (check.issues.length === 0) confidence += 0.2
    if (check.recommendations.length < 3) confidence += 0.1

    return Math.min(confidence, 0.99)
  }

  private generateAuditTrail(
    input: AgentInput, 
    compliant: boolean, 
    issues: string[]
  ): string {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      userId: input.userId,
      context: input.context,
      compliant,
      issueCount: issues.length,
      riskFactors: issues.filter(issue => 
        ['medical', 'therapy', 'phi', 'partner notification'].some(risk => 
          issue.toLowerCase().includes(risk)
        )
      )
    }

    return JSON.stringify(auditEntry)
  }

  private getFailsafeComplianceCheck(): ComplianceCheck {
    return {
      compliant: false,
      regulations: ['privacy'],
      issues: ['Compliance validation failed - requires manual review'],
      recommendations: ['Manual compliance review required'],
      riskLevel: 'high',
      auditTrail: JSON.stringify({
        timestamp: new Date().toISOString(),
        status: 'validation_failed',
        requiresReview: true
      })
    }
  }

  // Additional compliance-specific methods
  async generatePrivacyImpactAssessment(input: AgentInput): Promise<any> {
    return {
      dataTypes: this.identifyDataTypes(input.message),
      legalBasis: 'consent',
      purposes: ['wellness education', 'relationship support'],
      retention: '24 months maximum',
      thirdPartySharing: false,
      userRights: [
        'access',
        'rectification', 
        'erasure',
        'portability',
        'objection'
      ],
      riskMitigation: [
        'data minimization',
        'encryption at rest and in transit',
        'access controls',
        'audit logging'
      ]
    }
  }

  private identifyDataTypes(content: string): string[] {
    const dataTypes: string[] = []
    
    if (content.includes('relationship') || content.includes('partner')) {
      dataTypes.push('relationship information')
    }
    
    if (content.includes('emotion') || content.includes('feeling')) {
      dataTypes.push('emotional state data')
    }
    
    if (content.includes('communication') || content.includes('conversation')) {
      dataTypes.push('communication patterns')
    }

    return dataTypes
  }

  validateConsentFlow(consentData: any): {
    valid: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    if (!consentData.explicit) {
      issues.push('Consent is not explicit')
    }

    if (!consentData.informed) {
      issues.push('Consent is not informed')
    }

    if (!consentData.withdrawable) {
      issues.push('Consent withdrawal mechanism not provided')
    }

    if (!consentData.granular) {
      recommendations.push('Provide granular consent options')
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    }
  }
}