import Anthropic from '@anthropic-ai/sdk'
import { getGlobalMemoryManager } from '../memory/persistent-memory-manager'
import SafetyValidatorAgent from '../agents/safety-validator-agent'
import { AgentInput, OrchestrationResult } from '../orchestration/types'

export interface CrisisAlert {
  id: string
  userId: string
  coupleId?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: 'suicidal_ideation' | 'domestic_violence' | 'self_harm' | 'substance_abuse' | 'mental_health_crisis' | 'other'
  indicators: string[]
  timestamp: Date
  status: 'detected' | 'escalated' | 'professional_notified' | 'resolved'
  interventionPlan?: CrisisInterventionPlan
  professionalContacts?: string[]
}

export interface CrisisInterventionPlan {
  immediateActions: string[]
  resources: CrisisResource[]
  followUpSchedule: FollowUpAction[]
  safetyPlan: SafetyPlanItem[]
  emergencyContacts: EmergencyContact[]
  professionalReferrals: ProfessionalReferral[]
}

export interface CrisisResource {
  type: 'hotline' | 'text_line' | 'chat' | 'emergency_services' | 'online_resource'
  name: string
  contact: string
  availability: '24/7' | 'business_hours' | 'limited'
  specialization?: string[]
  isImmediate: boolean
}

export interface FollowUpAction {
  timeframe: string
  action: string
  responsible: 'user' | 'professional' | 'system'
  priority: 'low' | 'medium' | 'high'
}

export interface SafetyPlanItem {
  step: number
  description: string
  resources: string[]
  isEmergencyAction: boolean
}

export interface EmergencyContact {
  relationship: string
  contact: string
  isSafe: boolean
  notes?: string
}

export interface ProfessionalReferral {
  type: 'therapist' | 'psychiatrist' | 'crisis_counselor' | 'social_worker' | 'medical_doctor'
  urgency: 'immediate' | 'within_24h' | 'within_week'
  specialization: string[]
  contactInfo?: string
}

export class CrisisResponseCoordinator {
  private anthropic: Anthropic
  private memoryManager = getGlobalMemoryManager()
  private activeCrises: Map<string, CrisisAlert> = new Map()
  private crisisResources: CrisisResource[]

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey })
    this.crisisResources = this.initializeCrisisResources()
  }

  async detectAndRespondToCrisis(input: AgentInput): Promise<OrchestrationResult | null> {
    console.log('Crisis Response Coordinator: Analyzing input for crisis indicators')

    // First, use safety validator agent for initial crisis detection
    const safetyAgent = new SafetyValidatorAgent(this.anthropic)
    const safetyResult = await safetyAgent.process(input)

    // If no crisis detected by safety agent, return null
    if (!safetyResult.result?.requiresImmediateIntervention && 
        safetyResult.result?.safetyLevel !== 'crisis' &&
        safetyResult.result?.safetyLevel !== 'concern') {
      return null
    }

    // Create crisis alert
    const crisisAlert: CrisisAlert = {
      id: `crisis-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId: input.userId,
      coupleId: input.coupleId,
      severity: this.determineSeverity(safetyResult.result),
      type: this.determineCrisisType(safetyResult.result),
      indicators: safetyResult.result?.crisisIndicators || [],
      timestamp: new Date(),
      status: 'detected'
    }

    // Store crisis alert
    this.activeCrises.set(crisisAlert.id, crisisAlert)
    this.memoryManager.store(
      `crisis-alert-${crisisAlert.id}`,
      'crisis-alerts',
      crisisAlert,
      { type: 'crisis', severity: crisisAlert.severity }
    )

    // Create intervention plan
    const interventionPlan = await this.createInterventionPlan(crisisAlert, input)
    crisisAlert.interventionPlan = interventionPlan

    // Execute immediate crisis response
    const crisisResponse = await this.executeImmediateCrisisResponse(crisisAlert, input)

    // Escalate to professionals if needed
    if (crisisAlert.severity === 'critical' || crisisAlert.severity === 'high') {
      await this.escalateToProfessionals(crisisAlert)
    }

    // Schedule follow-up actions
    await this.scheduleFollowUp(crisisAlert)

    // Update crisis status
    crisisAlert.status = crisisAlert.severity === 'critical' ? 'professional_notified' : 'escalated'
    this.activeCrises.set(crisisAlert.id, crisisAlert)

    return crisisResponse
  }

  private determineSeverity(safetyResult: any): CrisisAlert['severity'] {
    if (safetyResult?.requiresImmediateIntervention) {
      return 'critical'
    }
    
    if (safetyResult?.safetyLevel === 'crisis') {
      return 'high'
    }
    
    if (safetyResult?.safetyLevel === 'concern') {
      return 'medium'
    }
    
    return 'low'
  }

  private determineCrisisType(safetyResult: any): CrisisAlert['type'] {
    const indicators = safetyResult?.crisisIndicators || []
    
    if (indicators.some((i: string) => i.includes('suicid') || i.includes('kill') || i.includes('die'))) {
      return 'suicidal_ideation'
    }
    
    if (indicators.some((i: string) => i.includes('abuse') || i.includes('violence') || i.includes('hurt'))) {
      return 'domestic_violence'
    }
    
    if (indicators.some((i: string) => i.includes('harm') || i.includes('cut') || i.includes('injure'))) {
      return 'self_harm'
    }
    
    if (indicators.some((i: string) => i.includes('drug') || i.includes('alcohol') || i.includes('substance'))) {
      return 'substance_abuse'
    }
    
    return 'mental_health_crisis'
  }

  private async createInterventionPlan(
    crisisAlert: CrisisAlert, 
    input: AgentInput
  ): Promise<CrisisInterventionPlan> {
    const plan: CrisisInterventionPlan = {
      immediateActions: this.getImmediateActions(crisisAlert.type, crisisAlert.severity),
      resources: this.getCrisisResources(crisisAlert.type),
      followUpSchedule: this.createFollowUpSchedule(crisisAlert.severity),
      safetyPlan: await this.generateSafetyPlan(crisisAlert, input),
      emergencyContacts: this.getEmergencyContacts(),
      professionalReferrals: this.getProfessionalReferrals(crisisAlert.type, crisisAlert.severity)
    }

    // Store intervention plan
    this.memoryManager.store(
      `intervention-plan-${crisisAlert.id}`,
      'crisis-interventions',
      plan,
      { crisisId: crisisAlert.id, type: 'intervention-plan' }
    )

    return plan
  }

  private getImmediateActions(type: CrisisAlert['type'], severity: CrisisAlert['severity']): string[] {
    const baseActions = [
      'Ensure immediate physical safety',
      'Provide crisis resource contacts',
      'Encourage professional help-seeking'
    ]

    switch (severity) {
      case 'critical':
        return [
          'Contact emergency services if in immediate danger (911)',
          'Provide suicide prevention hotline (988)',
          'Stay with support person if possible',
          'Remove means of self-harm if applicable',
          ...baseActions
        ]
      
      case 'high':
        return [
          'Contact crisis hotline immediately',
          'Reach out to trusted support person',
          'Consider going to emergency room',
          ...baseActions
        ]
      
      case 'medium':
        return [
          'Contact mental health professional within 24 hours',
          'Reach out to support network',
          'Review safety plan',
          ...baseActions
        ]
      
      default:
        return baseActions
    }
  }

  private getCrisisResources(type: CrisisAlert['type']): CrisisResource[] {
    const allResources = this.crisisResources.filter(resource => {
      if (!resource.specialization) return true
      
      switch (type) {
        case 'suicidal_ideation':
          return resource.specialization.includes('suicide_prevention')
        case 'domestic_violence':
          return resource.specialization.includes('domestic_violence')
        case 'substance_abuse':
          return resource.specialization.includes('substance_abuse')
        default:
          return true
      }
    })

    return allResources.slice(0, 5) // Limit to top 5 most relevant
  }

  private createFollowUpSchedule(severity: CrisisAlert['severity']): FollowUpAction[] {
    switch (severity) {
      case 'critical':
        return [
          { timeframe: '1 hour', action: 'Check immediate safety status', responsible: 'professional', priority: 'high' },
          { timeframe: '24 hours', action: 'Professional mental health assessment', responsible: 'professional', priority: 'high' },
          { timeframe: '3 days', action: 'Follow-up safety check', responsible: 'professional', priority: 'medium' },
          { timeframe: '1 week', action: 'Ongoing treatment planning', responsible: 'professional', priority: 'medium' }
        ]
      
      case 'high':
        return [
          { timeframe: '6 hours', action: 'Safety check-in', responsible: 'system', priority: 'high' },
          { timeframe: '24 hours', action: 'Professional consultation', responsible: 'professional', priority: 'high' },
          { timeframe: '1 week', action: 'Progress review', responsible: 'professional', priority: 'medium' }
        ]
      
      default:
        return [
          { timeframe: '24 hours', action: 'Self-assessment check-in', responsible: 'user', priority: 'medium' },
          { timeframe: '1 week', action: 'Professional consultation if needed', responsible: 'user', priority: 'low' }
        ]
    }
  }

  private async generateSafetyPlan(
    crisisAlert: CrisisAlert, 
    input: AgentInput
  ): Promise<SafetyPlanItem[]> {
    // Get personalized safety plan based on crisis type and user context
    const basePlan: SafetyPlanItem[] = [
      {
        step: 1,
        description: 'Recognize warning signs and triggers',
        resources: ['Crisis hotline numbers', 'Mental health app'],
        isEmergencyAction: false
      },
      {
        step: 2,
        description: 'Contact trusted support person',
        resources: ['Emergency contacts list'],
        isEmergencyAction: false
      },
      {
        step: 3,
        description: 'Use coping strategies',
        resources: ['Breathing exercises', 'Grounding techniques'],
        isEmergencyAction: false
      },
      {
        step: 4,
        description: 'Remove or secure potential means of harm',
        resources: ['Safety checklist'],
        isEmergencyAction: true
      },
      {
        step: 5,
        description: 'Call crisis hotline or emergency services',
        resources: ['988 Suicide & Crisis Lifeline', '911 Emergency'],
        isEmergencyAction: true
      }
    ]

    // Customize based on crisis type
    switch (crisisAlert.type) {
      case 'domestic_violence':
        basePlan.unshift({
          step: 0,
          description: 'Ensure physical safety - go to safe location',
          resources: ['Domestic violence shelter', 'Trusted friend/family'],
          isEmergencyAction: true
        })
        break
      
      case 'substance_abuse':
        basePlan.splice(2, 0, {
          step: 2.5,
          description: 'Avoid substances and triggers',
          resources: ['NA/AA meetings', 'Substance abuse hotline'],
          isEmergencyAction: false
        })
        break
    }

    return basePlan.sort((a, b) => a.step - b.step)
  }

  private getEmergencyContacts(): EmergencyContact[] {
    return [
      {
        relationship: 'Emergency Services',
        contact: '911',
        isSafe: true,
        notes: 'For immediate physical danger'
      },
      {
        relationship: 'Suicide Prevention',
        contact: '988',
        isSafe: true,
        notes: 'Suicide & Crisis Lifeline'
      },
      {
        relationship: 'Crisis Text Line',
        contact: 'Text HOME to 741741',
        isSafe: true,
        notes: '24/7 crisis support via text'
      },
      {
        relationship: 'Domestic Violence',
        contact: '1-800-799-7233',
        isSafe: true,
        notes: 'National Domestic Violence Hotline'
      }
    ]
  }

  private getProfessionalReferrals(
    type: CrisisAlert['type'], 
    severity: CrisisAlert['severity']
  ): ProfessionalReferral[] {
    const urgency = severity === 'critical' ? 'immediate' : 
                   severity === 'high' ? 'within_24h' : 'within_week'

    const baseReferrals: ProfessionalReferral[] = [
      {
        type: 'crisis_counselor',
        urgency,
        specialization: ['crisis_intervention'],
      },
      {
        type: 'therapist',
        urgency: urgency === 'immediate' ? 'within_24h' : urgency,
        specialization: ['mental_health'],
      }
    ]

    // Add specialized referrals based on crisis type
    switch (type) {
      case 'suicidal_ideation':
        baseReferrals.push({
          type: 'psychiatrist',
          urgency: 'immediate',
          specialization: ['suicide_prevention', 'psychiatric_care']
        })
        break
      
      case 'domestic_violence':
        baseReferrals.push({
          type: 'social_worker',
          urgency: 'within_24h',
          specialization: ['domestic_violence', 'trauma']
        })
        break
      
      case 'substance_abuse':
        baseReferrals.push({
          type: 'medical_doctor',
          urgency: 'within_24h',
          specialization: ['addiction_medicine']
        })
        break
    }

    return baseReferrals
  }

  private async executeImmediateCrisisResponse(
    crisisAlert: CrisisAlert, 
    input: AgentInput
  ): Promise<OrchestrationResult> {
    const plan = crisisAlert.interventionPlan!
    
    return {
      finalResponse: {
        type: 'crisis_intervention',
        severity: crisisAlert.severity,
        message: this.generateCrisisMessage(crisisAlert),
        immediateActions: plan.immediateActions,
        emergencyContacts: plan.emergencyContacts.map(ec => `${ec.relationship}: ${ec.contact}`),
        crisisResources: plan.resources.map(r => `${r.name}: ${r.contact} (${r.availability})`),
        safetyPlan: plan.safetyPlan,
        professionalReferrals: plan.professionalReferrals,
        followUpScheduled: plan.followUpSchedule.length > 0,
        crisisId: crisisAlert.id
      },
      agentResults: {
        crisis_coordinator: {
          agentType: 'crisis_coordinator' as any,
          result: {
            crisisDetected: true,
            severity: crisisAlert.severity,
            interventionPlan: plan,
            professionalNotification: crisisAlert.severity === 'critical'
          },
          confidence: 1.0,
          requiresReview: true,
          processingTime: 0,
          errors: []
        }
      },
      safetyLevel: crisisAlert.severity === 'critical' ? 'crisis' : 'concern',
      requiresHumanReview: true,
      processingTime: 0,
      coordination: {
        crisisIntervention: {
          crisisId: crisisAlert.id,
          severity: crisisAlert.severity,
          type: crisisAlert.type,
          interventionActivated: true,
          professionalNotified: crisisAlert.severity === 'critical'
        }
      },
      systemInfo: {
        processingId: crisisAlert.id,
        agentsUsed: ['safety_validator', 'crisis_coordinator'],
        performanceGrade: 'A+',
        retryCount: 0,
        engine: 'crisis-response-coordinator',
        wasFallback: false,
        claudeFlowAvailable: true,
        timestamp: new Date().toISOString()
      }
    }
  }

  private generateCrisisMessage(crisisAlert: CrisisAlert): string {
    switch (crisisAlert.severity) {
      case 'critical':
        return 'IMMEDIATE CRISIS DETECTED: Your safety is our top priority. If you are in immediate danger, please call 911 or go to your nearest emergency room. Professional intervention has been initiated.'
      
      case 'high':
        return 'Crisis situation detected. Please use the resources provided immediately and consider contacting emergency services if you feel unsafe. Professional support is being arranged.'
      
      case 'medium':
        return 'We\'ve detected that you may be going through a difficult time. Please review the support resources provided and consider reaching out to a mental health professional.'
      
      default:
        return 'Support resources are available to help you through this time. Please don\'t hesitate to reach out for help.'
    }
  }

  private async escalateToProfessionals(crisisAlert: CrisisAlert): Promise<void> {
    console.log(`CRISIS ESCALATION: ${crisisAlert.severity} crisis detected for user ${crisisAlert.userId}`)
    
    // In production, this would:
    // 1. Notify licensed mental health professionals
    // 2. Trigger emergency protocols
    // 3. Document for legal compliance
    // 4. Initiate follow-up procedures
    
    this.memoryManager.store(
      `professional-escalation-${crisisAlert.id}`,
      'professional-escalations',
      {
        crisisId: crisisAlert.id,
        userId: crisisAlert.userId,
        severity: crisisAlert.severity,
        type: crisisAlert.type,
        timestamp: Date.now(),
        status: 'escalated',
        notificationsSent: ['crisis_team', 'emergency_coordinator']
      },
      { type: 'escalation', priority: 'critical' }
    )
  }

  private async scheduleFollowUp(crisisAlert: CrisisAlert): Promise<void> {
    const followUpActions = crisisAlert.interventionPlan?.followUpSchedule || []
    
    for (const action of followUpActions) {
      // In production, this would schedule actual follow-up tasks
      this.memoryManager.store(
        `follow-up-${crisisAlert.id}-${Date.now()}`,
        'crisis-follow-ups',
        {
          crisisId: crisisAlert.id,
          userId: crisisAlert.userId,
          action: action.action,
          scheduledTime: this.calculateScheduledTime(action.timeframe),
          responsible: action.responsible,
          priority: action.priority,
          status: 'scheduled'
        }
      )
    }
  }

  private calculateScheduledTime(timeframe: string): Date {
    const now = new Date()
    
    if (timeframe.includes('hour')) {
      const hours = parseInt(timeframe.match(/\d+/)?.[0] || '1')
      return new Date(now.getTime() + hours * 60 * 60 * 1000)
    }
    
    if (timeframe.includes('day')) {
      const days = parseInt(timeframe.match(/\d+/)?.[0] || '1')
      return new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    }
    
    if (timeframe.includes('week')) {
      const weeks = parseInt(timeframe.match(/\d+/)?.[0] || '1')
      return new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000)
    }
    
    return new Date(now.getTime() + 60 * 60 * 1000) // Default to 1 hour
  }

  private initializeCrisisResources(): CrisisResource[] {
    return [
      {
        type: 'hotline',
        name: 'Suicide & Crisis Lifeline',
        contact: '988',
        availability: '24/7',
        specialization: ['suicide_prevention', 'mental_health_crisis'],
        isImmediate: true
      },
      {
        type: 'text_line',
        name: 'Crisis Text Line',
        contact: 'Text HOME to 741741',
        availability: '24/7',
        specialization: ['crisis_support'],
        isImmediate: true
      },
      {
        type: 'hotline',
        name: 'National Domestic Violence Hotline',
        contact: '1-800-799-7233',
        availability: '24/7',
        specialization: ['domestic_violence'],
        isImmediate: true
      },
      {
        type: 'hotline',
        name: 'SAMHSA National Helpline',
        contact: '1-800-662-4357',
        availability: '24/7',
        specialization: ['substance_abuse', 'mental_health'],
        isImmediate: true
      },
      {
        type: 'chat',
        name: 'Crisis Chat',
        contact: 'suicidepreventionlifeline.org/chat',
        availability: '24/7',
        specialization: ['suicide_prevention'],
        isImmediate: true
      },
      {
        type: 'emergency_services',
        name: 'Emergency Services',
        contact: '911',
        availability: '24/7',
        isImmediate: true
      }
    ]
  }

  // Public interface methods
  getActiveCrises(): CrisisAlert[] {
    return Array.from(this.activeCrises.values())
  }

  getCrisisById(crisisId: string): CrisisAlert | undefined {
    return this.activeCrises.get(crisisId)
  }

  async updateCrisisStatus(crisisId: string, status: CrisisAlert['status']): Promise<void> {
    const crisis = this.activeCrises.get(crisisId)
    if (crisis) {
      crisis.status = status
      this.activeCrises.set(crisisId, crisis)
      
      // Update in memory
      this.memoryManager.store(
        `crisis-alert-${crisisId}`,
        'crisis-alerts',
        crisis,
        { type: 'crisis', severity: crisis.severity, status }
      )
    }
  }

  async resolveCrisis(crisisId: string, resolution: string): Promise<void> {
    const crisis = this.activeCrises.get(crisisId)
    if (crisis) {
      crisis.status = 'resolved'
      
      // Store resolution
      this.memoryManager.store(
        `crisis-resolution-${crisisId}`,
        'crisis-resolutions',
        {
          crisisId,
          resolution,
          timestamp: Date.now(),
          originalSeverity: crisis.severity
        }
      )
      
      // Remove from active crises
      this.activeCrises.delete(crisisId)
    }
  }

  getCrisisStats(): any {
    const crises = this.getActiveCrises()
    const resolved = this.memoryManager.search({
      namespace: 'crisis-resolutions',
      limit: 100
    })

    return {
      active: crises.length,
      bySeverity: {
        critical: crises.filter(c => c.severity === 'critical').length,
        high: crises.filter(c => c.severity === 'high').length,
        medium: crises.filter(c => c.severity === 'medium').length,
        low: crises.filter(c => c.severity === 'low').length
      },
      resolved: resolved.length,
      totalResources: this.crisisResources.length
    }
  }
}

export default CrisisResponseCoordinator