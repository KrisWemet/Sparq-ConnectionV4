import Anthropic from '@anthropic-ai/sdk'
import { AgentInput, AgentOutput, ComplianceCheck } from '../orchestration/types'

export interface ComplianceRegulation {
  name: string
  scope: string
  requirements: string[]
  penalties: string[]
  lastUpdated: string
}

export interface PrivacyAssessment {
  dataMinimization: boolean
  userControl: boolean
  transparentProcessing: boolean
  purposeLimitation: boolean
  storageMinimization: boolean
  securityMeasures: string[]
}

export interface EducationalScopeValidation {
  isEducational: boolean
  avoidsMedicalClaims: boolean
  includesDisclaimers: boolean
  professionalReferralLanguage: boolean
  therapeuticBoundaries: boolean
}

export class ComplianceOfficerAgent {
  private anthropic: Anthropic
  private regulations: Map<string, ComplianceRegulation> = new Map()
  private memoryStore: Map<string, any> = new Map()
  private complianceHistory: Map<string, any[]> = new Map()

  constructor(anthropic: Anthropic) {
    this.anthropic = anthropic
    this.initializeRegulations()
    this.loadPersistedMemory()
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now()
    
    try {
      // Pre-compliance review
      await this.preComplianceReview(input)
      
      // Educational scope validation
      const educationalValidation = await this.validateEducationalScope(input)
      
      // Privacy-by-design assessment
      const privacyAssessment = await this.assessPrivacyCompliance(input)
      
      // Regulatory compliance check
      const regulatoryCompliance = await this.checkRegulatoryCompliance(input, educationalValidation, privacyAssessment)
      
      // Safety protocol compliance
      const safetyCompliance = await this.validateSafetyProtocols(input)
      
      // Generate comprehensive compliance result
      const complianceResult = this.synthesizeComplianceResults(
        educationalValidation,
        privacyAssessment,
        regulatoryCompliance,
        safetyCompliance,
        input
      )
      
      // Store compliance results
      await this.storeComplianceResults(input, complianceResult)

      const processingTime = Date.now() - startTime

      return {
        agentType: 'compliance',
        result: complianceResult,
        confidence: complianceResult.compliant ? 0.9 : 0.3,
        requiresReview: !complianceResult.compliant || complianceResult.riskLevel !== 'low',
        processingTime
      }
    } catch (error) {
      return this.createErrorResponse(error, startTime)
    }
  }

  private async preComplianceReview(input: AgentInput): Promise<void> {
    // Load relevant compliance history for this user/couple
    const userComplianceHistory = this.complianceHistory.get(input.userId) || []
    
    // Check for recurring compliance issues
    const recentIssues = userComplianceHistory.filter(
      (entry: any) => Date.now() - entry.timestamp < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    )
    
    if (recentIssues.length > 0) {
      this.memoryStore.set(`compliance-watch-${input.userId}`, {
        recentIssues,
        enhancedMonitoring: true,
        lastReview: Date.now()
      })
    }
  }

  private async validateEducationalScope(input: AgentInput): Promise<EducationalScopeValidation> {
    const message = input.message.toLowerCase()
    
    // Check for medical/therapy claims
    const medicalClaims = [
      'diagnose', 'treat', 'cure', 'therapy', 'medical',
      'clinical treatment', 'therapeutic treatment', 'prescribe',
      'disorder', 'mental illness', 'psychological disorder'
    ]
    
    const hasMedicalClaims = medicalClaims.some(claim => message.includes(claim))
    
    // Check for appropriate educational language
    const educationalLanguage = [
      'education', 'information', 'awareness', 'understanding',
      'learning', 'knowledge', 'insights', 'resources'
    ]
    
    const hasEducationalLanguage = educationalLanguage.some(term => message.includes(term))
    
    // Check for disclaimers
    const hasDisclaimers = message.includes('not therapy') || 
                          message.includes('educational') || 
                          message.includes('wellness') ||
                          input.metadata?.hasDisclaimers === true
    
    // Check for professional referral language
    const hasReferralLanguage = message.includes('professional') ||
                               message.includes('therapist') ||
                               message.includes('counselor') ||
                               message.includes('consult')

    return {
      isEducational: hasEducationalLanguage && !hasMedicalClaims,
      avoidsMedicalClaims: !hasMedicalClaims,
      includesDisclaimers: hasDisclaimers,
      professionalReferralLanguage: hasReferralLanguage,
      therapeuticBoundaries: !hasMedicalClaims && hasReferralLanguage
    }
  }

  private async assessPrivacyCompliance(input: AgentInput): Promise<PrivacyAssessment> {
    const message = input.message.toLowerCase()
    const metadata = input.metadata || {}
    
    // Check for data minimization principles
    const unnecessaryDataCollection = [
      'social security', 'financial information', 'medical records',
      'detailed health information', 'employment details'
    ]
    
    const collectsUnnecessaryData = unnecessaryDataCollection.some(term => message.includes(term))
    
    // Check for user control language
    const userControlIndicators = [
      'your choice', 'you decide', 'optional', 'consent',
      'permission', 'control', 'delete', 'modify'
    ]
    
    const providesUserControl = userControlIndicators.some(term => message.includes(term))
    
    // Check for transparent processing
    const transparencyIndicators = [
      'how we use', 'data processing', 'information usage',
      'clear about', 'explain', 'understand how'
    ]
    
    const isTransparent = transparencyIndicators.some(term => message.includes(term))
    
    // Check for purpose limitation
    const purposeLimited = !message.includes('any purpose') && 
                          !message.includes('unlimited use') &&
                          (message.includes('specific purpose') || message.includes('relationship wellness'))

    return {
      dataMinimization: !collectsUnnecessaryData,
      userControl: providesUserControl,
      transparentProcessing: isTransparent,
      purposeLimitation: purposeLimited,
      storageMinimization: metadata.hasRetentionPolicy !== false,
      securityMeasures: this.assessSecurityMeasures(message, metadata)
    }
  }

  private assessSecurityMeasures(message: string, metadata: any): string[] {
    const measures = []
    
    if (message.includes('encrypt') || metadata.encrypted) {
      measures.push('Data encryption')
    }
    if (message.includes('secure') || metadata.secureTransmission) {
      measures.push('Secure transmission')
    }
    if (message.includes('access control') || metadata.accessControls) {
      measures.push('Access controls')
    }
    if (message.includes('audit') || metadata.auditLogging) {
      measures.push('Audit logging')
    }
    
    return measures
  }

  private async checkRegulatoryCompliance(
    input: AgentInput,
    educationalValidation: EducationalScopeValidation,
    privacyAssessment: PrivacyAssessment
  ): Promise<{ regulations: string[], compliant: boolean, issues: string[] }> {
    const issues = []
    const applicableRegulations = []
    
    // GDPR Compliance Check
    if (input.metadata?.userJurisdiction === 'EU' || input.metadata?.gdprApplicable) {
      applicableRegulations.push('GDPR')
      
      if (!privacyAssessment.userControl) {
        issues.push('GDPR: Insufficient user control over personal data')
      }
      if (!privacyAssessment.transparentProcessing) {
        issues.push('GDPR: Processing not sufficiently transparent')
      }
      if (!privacyAssessment.purposeLimitation) {
        issues.push('GDPR: Purpose limitation not adequately defined')
      }
    }
    
    // PIPEDA Compliance Check (Canada)
    if (input.metadata?.userJurisdiction === 'CA' || input.metadata?.pipedaApplicable) {
      applicableRegulations.push('PIPEDA')
      
      if (!privacyAssessment.dataMinimization) {
        issues.push('PIPEDA: Data collection not minimized to necessary purposes')
      }
      if (!privacyAssessment.userControl) {
        issues.push('PIPEDA: Insufficient user consent and control mechanisms')
      }
    }
    
    // Educational/Wellness Compliance
    applicableRegulations.push('educational')
    
    if (!educationalValidation.avoidsMedicalClaims) {
      issues.push('Educational Scope: Contains inappropriate medical/therapy claims')
    }
    if (!educationalValidation.includesDisclaimers) {
      issues.push('Educational Scope: Missing required educational disclaimers')
    }
    if (!educationalValidation.professionalReferralLanguage) {
      issues.push('Educational Scope: Should include professional referral language')
    }
    
    // Privacy-by-Design Compliance
    applicableRegulations.push('privacy')
    
    if (privacyAssessment.securityMeasures.length < 2) {
      issues.push('Privacy: Insufficient security measures described')
    }
    
    return {
      regulations: applicableRegulations,
      compliant: issues.length === 0,
      issues
    }
  }

  private async validateSafetyProtocols(input: AgentInput): Promise<{
    compliant: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const issues = []
    const recommendations = []
    const message = input.message.toLowerCase()
    
    // Check for automated partner notification concerns (DV safety)
    if (message.includes('notify partner') || message.includes('tell partner') || 
        message.includes('automatic notification')) {
      issues.push('Safety Protocol: Potential automated partner notification risk')
      recommendations.push('Remove automated partner notifications for DV safety')
    }
    
    // Check for crisis intervention transparency
    if (input.context === 'crisis' && !message.includes('monitoring')) {
      recommendations.push('Add transparency about crisis monitoring')
    }
    
    // Check for proper crisis resource provision
    if ((message.includes('crisis') || message.includes('emergency')) && 
        !message.includes('hotline') && !message.includes('professional')) {
      issues.push('Safety Protocol: Crisis content missing resource provision')
      recommendations.push('Include crisis resources and professional contacts')
    }
    
    // Check for consent regarding safety monitoring
    if (input.context === 'crisis' && !input.metadata?.crisisConsentProvided) {
      recommendations.push('Ensure informed consent for crisis monitoring')
    }
    
    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    }
  }

  private synthesizeComplianceResults(
    educationalValidation: EducationalScopeValidation,
    privacyAssessment: PrivacyAssessment,
    regulatoryCompliance: any,
    safetyCompliance: any,
    input: AgentInput
  ): ComplianceCheck {
    const allIssues = [
      ...regulatoryCompliance.issues,
      ...safetyCompliance.issues
    ]
    
    const allRecommendations = [
      ...safetyCompliance.recommendations
    ]
    
    // Add educational scope recommendations
    if (!educationalValidation.isEducational) {
      allRecommendations.push('Strengthen educational language and remove medical claims')
    }
    if (!educationalValidation.includesDisclaimers) {
      allRecommendations.push('Add clear educational disclaimers')
    }
    
    // Add privacy recommendations
    if (!privacyAssessment.dataMinimization) {
      allRecommendations.push('Implement data minimization principles')
    }
    if (!privacyAssessment.userControl) {
      allRecommendations.push('Enhance user control and consent mechanisms')
    }
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    
    if (allIssues.some(issue => issue.includes('medical claims') || issue.includes('DV safety'))) {
      riskLevel = 'high'
    } else if (allIssues.length > 2) {
      riskLevel = 'medium'
    }
    
    // Generate audit trail
    const auditTrail = this.generateAuditTrail(
      input,
      educationalValidation,
      privacyAssessment,
      regulatoryCompliance,
      safetyCompliance
    )
    
    return {
      compliant: allIssues.length === 0,
      regulations: regulatoryCompliance.regulations,
      issues: allIssues,
      recommendations: allRecommendations,
      riskLevel,
      auditTrail
    }
  }

  private generateAuditTrail(
    input: AgentInput,
    educational: EducationalScopeValidation,
    privacy: PrivacyAssessment,
    regulatory: any,
    safety: any
  ): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: input.userId,
      coupleId: input.coupleId,
      context: input.context,
      assessments: {
        educational: {
          isEducational: educational.isEducational,
          avoidsMedicalClaims: educational.avoidsMedicalClaims,
          hasDisclaimers: educational.includesDisclaimers
        },
        privacy: {
          dataMinimization: privacy.dataMinimization,
          userControl: privacy.userControl,
          transparent: privacy.transparentProcessing
        },
        regulatory: {
          applicableRegulations: regulatory.regulations,
          compliant: regulatory.compliant
        },
        safety: {
          protocolsCompliant: safety.compliant
        }
      },
      complianceOfficer: 'compliance-officer-agent',
      version: '1.0'
    }, null, 2)
  }

  private async storeComplianceResults(
    input: AgentInput,
    result: ComplianceCheck
  ): Promise<void> {
    const timestamp = Date.now()
    
    // Store in user's compliance history
    let userHistory = this.complianceHistory.get(input.userId) || []
    userHistory.push({
      timestamp,
      compliant: result.compliant,
      riskLevel: result.riskLevel,
      regulations: result.regulations,
      issueCount: result.issues.length
    })
    
    // Keep last 50 compliance checks
    userHistory = userHistory.slice(-50)
    this.complianceHistory.set(input.userId, userHistory)
    
    // Store detailed compliance results for audit
    this.memoryStore.set(`compliance-detail-${timestamp}`, {
      userId: input.userId,
      coupleId: input.coupleId,
      result,
      auditTrail: result.auditTrail,
      complianceOfficer: 'compliance-officer-agent'
    })
    
    // Flag high-risk situations for enhanced monitoring
    if (result.riskLevel === 'high') {
      this.memoryStore.set(`high-risk-compliance-${input.userId}`, {
        timestamp,
        issues: result.issues,
        enhancedMonitoring: true,
        reviewRequired: true
      })
    }
  }

  private createErrorResponse(error: any, startTime: number): AgentOutput {
    return {
      agentType: 'compliance',
      result: {
        compliant: false,
        regulations: ['error'],
        issues: [`Compliance validation failed: ${error.message}`],
        recommendations: ['Require manual compliance review'],
        riskLevel: 'high',
        auditTrail: JSON.stringify({
          error: error.message,
          timestamp: new Date().toISOString(),
          requiresManualReview: true
        })
      },
      confidence: 0.1,
      requiresReview: true,
      processingTime: Date.now() - startTime,
      errors: [error.message]
    }
  }

  private async loadPersistedMemory(): Promise<void> {
    try {
      // Load any persisted compliance data
      // This would connect to compliance databases in production
      console.log('ComplianceOfficer memory loaded')
    } catch (error) {
      console.warn('Could not load persisted memory for ComplianceOfficer:', error)
    }
  }

  private initializeRegulations(): void {
    this.regulations.set('GDPR', {
      name: 'General Data Protection Regulation',
      scope: 'EU residents and EU data processing',
      requirements: [
        'Lawful basis for processing',
        'Data minimization',
        'Purpose limitation',
        'Storage limitation',
        'Accuracy',
        'Integrity and confidentiality',
        'Accountability'
      ],
      penalties: ['Administrative fines up to 4% of annual turnover'],
      lastUpdated: '2018-05-25'
    })

    this.regulations.set('PIPEDA', {
      name: 'Personal Information Protection and Electronic Documents Act',
      scope: 'Canadian privacy law',
      requirements: [
        'Consent for collection, use, and disclosure',
        'Limiting collection to necessary purposes',
        'Limiting use, disclosure, and retention',
        'Accuracy of personal information',
        'Safeguarding personal information',
        'Openness about policies and practices'
      ],
      penalties: ['Administrative monetary penalties up to CAD $100,000'],
      lastUpdated: '2000-04-13'
    })

    this.regulations.set('educational', {
      name: 'Educational Content Standards',
      scope: 'Educational and wellness platforms',
      requirements: [
        'Clear educational disclaimers',
        'Avoid medical or therapy claims',
        'Evidence-based content',
        'Professional referral language',
        'Therapeutic boundary maintenance'
      ],
      penalties: ['Regulatory action, platform restrictions'],
      lastUpdated: '2024-01-01'
    })

    this.regulations.set('privacy', {
      name: 'Privacy-by-Design Principles',
      scope: 'Data privacy best practices',
      requirements: [
        'Privacy as the default',
        'Full functionality - positive sum',
        'End-to-end security',
        'Visibility and transparency',
        'Respect for user privacy'
      ],
      penalties: ['Reputational damage, regulatory scrutiny'],
      lastUpdated: '2010-01-01'
    })
  }

  // Health check and metrics
  getAgentHealth(): any {
    return {
      agentType: 'compliance-officer',
      status: 'active',
      memorySize: this.memoryStore.size,
      regulationsLoaded: this.regulations.size,
      complianceHistoryEntries: Array.from(this.complianceHistory.values()).flat().length,
      lastUpdate: Date.now(),
      configuration: {
        availableRegulations: Array.from(this.regulations.keys()),
        highRiskCases: Array.from(this.memoryStore.keys())
          .filter(key => key.includes('high-risk')).length
      }
    }
  }
}

export default ComplianceOfficerAgent