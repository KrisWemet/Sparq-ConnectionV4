import Anthropic from '@anthropic-ai/sdk'
import { AgentInput, AgentOutput, OrchestrationResult } from '../orchestration/types'
import SafetyValidatorAgent from './safety-validator-agent'
import RelationshipPsychologyExpertAgent from './relationship-psychology-expert-agent'
import ComplianceOfficerAgent from './compliance-officer-agent'
import TechnicalArchitectAgent from './technical-architect-agent'

export interface SwarmCoordinationPlan {
  agentOrdering: string[]
  executionStrategy: 'sequential' | 'parallel' | 'hybrid'
  qualityThresholds: Record<string, number>
  failsafeProtocols: string[]
  coordinationTimeout: number
}

export interface QualityOversight {
  overallQuality: number
  agentPerformance: Record<string, number>
  consensusLevel: number
  conflictResolution: string[]
  finalRecommendation: string
}

export class SwarmLeadCoordinatorAgent {
  private anthropic: Anthropic
  private agents: Map<string, any> = new Map()
  private memoryStore: Map<string, any> = new Map()
  private coordinationHistory: any[] = []
  private qualityStandards: Map<string, number> = new Map()

  constructor(anthropic: Anthropic) {
    this.anthropic = anthropic
    this.initializeAgents(anthropic)
    this.initializeQualityStandards()
    this.loadPersistedMemory()
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now()
    
    try {
      // Phase 1: Coordination Planning
      const coordinationPlan = await this.planCoordination(input)
      
      // Phase 2: Agent Orchestration
      const agentResults = await this.orchestrateAgents(input, coordinationPlan)
      
      // Phase 3: Quality Oversight
      const qualityAssessment = await this.assessQuality(agentResults, input)
      
      // Phase 4: Conflict Resolution (if needed)
      const resolvedResults = await this.resolveConflicts(agentResults, qualityAssessment)
      
      // Phase 5: Final Synthesis
      const coordinatedResponse = await this.synthesizeResponse(resolvedResults, qualityAssessment, input)
      
      // Phase 6: Progress Tracking & Learning
      await this.trackCoordinationOutcome(input, coordinatedResponse, agentResults)

      const processingTime = Date.now() - startTime

      return {
        agentType: 'coordinator',
        result: coordinatedResponse,
        confidence: qualityAssessment.overallQuality,
        requiresReview: qualityAssessment.overallQuality < 0.8 || qualityAssessment.conflictResolution.length > 0,
        processingTime
      }
    } catch (error) {
      return this.createErrorResponse(error, startTime)
    }
  }

  private async planCoordination(input: AgentInput): Promise<SwarmCoordinationPlan> {
    // Determine optimal coordination strategy based on context and input
    let executionStrategy: 'sequential' | 'parallel' | 'hybrid' = 'sequential'
    let coordinationTimeout = 30000 // 30 seconds default
    
    // Crisis context requires sequential with safety-first
    if (input.context === 'crisis') {
      executionStrategy = 'sequential'
      coordinationTimeout = 10000 // 10 seconds for crisis
      
      return {
        agentOrdering: ['safety', 'psychology', 'compliance', 'technical'],
        executionStrategy,
        qualityThresholds: {
          safety: 0.95,      // Very high threshold for crisis
          psychology: 0.8,
          compliance: 0.9,   // High compliance for crisis
          technical: 0.7
        },
        failsafeProtocols: [
          'If safety agent fails, escalate immediately to manual crisis intervention',
          'If any agent shows crisis indicators, interrupt and prioritize safety',
          'Maintain emergency contact protocols throughout coordination'
        ],
        coordinationTimeout
      }
    }
    
    // Assessment context can use hybrid approach
    if (input.context === 'assessment') {
      executionStrategy = 'hybrid'
      
      return {
        agentOrdering: ['safety', 'psychology', 'compliance', 'technical'],
        executionStrategy,
        qualityThresholds: {
          safety: 0.9,
          psychology: 0.85,   // High threshold for psychological accuracy
          compliance: 0.8,
          technical: 0.7
        },
        failsafeProtocols: [
          'Safety agent must approve before psychological assessment',
          'Psychology and compliance agents run in parallel',
          'Technical agent validates implementation feasibility'
        ],
        coordinationTimeout: 20000
      }
    }
    
    // General guidance can use parallel processing
    if (input.context === 'general' || input.context === 'guidance') {
      executionStrategy = 'parallel'
      
      return {
        agentOrdering: ['safety', 'psychology', 'compliance', 'technical'],
        executionStrategy,
        qualityThresholds: {
          safety: 0.85,
          psychology: 0.8,
          compliance: 0.8,
          technical: 0.7
        },
        failsafeProtocols: [
          'Safety agent has veto power over all other recommendations',
          'Require 3/4 agent consensus for final recommendations',
          'Escalate conflicts to manual review'
        ],
        coordinationTimeout: 25000
      }
    }
    
    // Default fallback
    return {
      agentOrdering: ['safety', 'psychology', 'compliance', 'technical'],
      executionStrategy: 'sequential',
      qualityThresholds: {
        safety: 0.9,
        psychology: 0.8,
        compliance: 0.8,
        technical: 0.7
      },
      failsafeProtocols: ['Manual review required for all outputs'],
      coordinationTimeout: 30000
    }
  }

  private async orchestrateAgents(
    input: AgentInput,
    plan: SwarmCoordinationPlan
  ): Promise<Record<string, AgentOutput>> {
    const results: Record<string, AgentOutput> = {}
    
    if (plan.executionStrategy === 'sequential') {
      // Sequential execution with safety-first priority
      for (const agentType of plan.agentOrdering) {
        const agent = this.agents.get(agentType)
        if (agent) {
          try {
            const result = await this.executeAgentWithTimeout(agent, input, plan.coordinationTimeout)
            results[agentType] = result
            
            // Check for safety-critical failures
            if (agentType === 'safety' && !this.meetsQualityThreshold(result, plan.qualityThresholds.safety)) {
              // Safety agent failed - implement failsafe
              await this.triggerSafetyFailsafe(input, result)
              break
            }
            
            // Check for crisis indicators that should interrupt normal processing
            if (result.result?.requiresImmediateIntervention || result.result?.safetyLevel === 'crisis') {
              // Interrupt and switch to crisis mode
              await this.switchToCrisisMode(input, results)
              break
            }
          } catch (error) {
            results[agentType] = this.createAgentErrorResponse(agentType, error)
          }
        }
      }
    } else if (plan.executionStrategy === 'parallel') {
      // Parallel execution (after safety check)
      const safetyAgent = this.agents.get('safety')
      if (safetyAgent) {
        const safetyResult = await this.executeAgentWithTimeout(safetyAgent, input, plan.coordinationTimeout)
        results.safety = safetyResult
        
        if (safetyResult.result?.requiresImmediateIntervention) {
          return { safety: safetyResult } // Only return safety result for crisis
        }
      }
      
      // Run other agents in parallel
      const otherAgents = plan.agentOrdering.filter(type => type !== 'safety')
      const parallelPromises = otherAgents.map(async (agentType) => {
        const agent = this.agents.get(agentType)
        if (agent) {
          try {
            const result = await this.executeAgentWithTimeout(agent, input, plan.coordinationTimeout)
            return { agentType, result }
          } catch (error) {
            return { agentType, result: this.createAgentErrorResponse(agentType, error) }
          }
        }
        return null
      })
      
      const parallelResults = await Promise.allSettled(parallelPromises)
      parallelResults.forEach(settledResult => {
        if (settledResult.status === 'fulfilled' && settledResult.value) {
          const { agentType, result } = settledResult.value
          results[agentType] = result
        }
      })
    } else {
      // Hybrid execution: Safety first, then parallel for others
      const safetyAgent = this.agents.get('safety')
      if (safetyAgent) {
        const safetyResult = await this.executeAgentWithTimeout(safetyAgent, input, plan.coordinationTimeout)
        results.safety = safetyResult
        
        if (safetyResult.result?.requiresImmediateIntervention) {
          return { safety: safetyResult }
        }
      }
      
      // Run psychology and compliance in parallel, then technical
      const psychologyAgent = this.agents.get('psychology')
      const complianceAgent = this.agents.get('compliance')
      
      const parallelResults = await Promise.allSettled([
        psychologyAgent ? this.executeAgentWithTimeout(psychologyAgent, input, plan.coordinationTimeout) : null,
        complianceAgent ? this.executeAgentWithTimeout(complianceAgent, input, plan.coordinationTimeout) : null
      ])
      
      if (parallelResults[0].status === 'fulfilled' && parallelResults[0].value) {
        results.psychology = parallelResults[0].value
      }
      if (parallelResults[1].status === 'fulfilled' && parallelResults[1].value) {
        results.compliance = parallelResults[1].value
      }
      
      // Finally run technical agent
      const technicalAgent = this.agents.get('technical')
      if (technicalAgent) {
        try {
          results.technical = await this.executeAgentWithTimeout(technicalAgent, input, plan.coordinationTimeout)
        } catch (error) {
          results.technical = this.createAgentErrorResponse('technical', error)
        }
      }
    }
    
    return results
  }

  private async assessQuality(
    agentResults: Record<string, AgentOutput>,
    input: AgentInput
  ): Promise<QualityOversight> {
    const agentPerformance: Record<string, number> = {}
    let totalQuality = 0
    let agentCount = 0
    
    // Assess each agent's performance
    Object.entries(agentResults).forEach(([agentType, result]) => {
      const performance = this.assessAgentPerformance(agentType, result, input)
      agentPerformance[agentType] = performance
      totalQuality += performance
      agentCount++
    })
    
    const overallQuality = agentCount > 0 ? totalQuality / agentCount : 0
    
    // Check for consensus among agents
    const consensusLevel = this.calculateConsensus(agentResults)
    
    // Identify conflicts that need resolution
    const conflictResolution = this.identifyConflicts(agentResults)
    
    // Generate final recommendation
    const finalRecommendation = await this.generateFinalRecommendation(
      agentResults,
      overallQuality,
      consensusLevel,
      input
    )
    
    return {
      overallQuality,
      agentPerformance,
      consensusLevel,
      conflictResolution,
      finalRecommendation
    }
  }

  private assessAgentPerformance(agentType: string, result: AgentOutput, input: AgentInput): number {
    let score = result.confidence || 0.5
    
    // Adjust score based on agent-specific criteria
    switch (agentType) {
      case 'safety':
        // Safety agent performance is critical
        if (input.context === 'crisis' && result.confidence < 0.9) {
          score *= 0.5 // Heavily penalize low confidence in crisis
        }
        if (result.result?.requiresImmediateIntervention && result.confidence > 0.8) {
          score = Math.min(score + 0.1, 1.0) // Bonus for high-confidence crisis detection
        }
        break
        
      case 'psychology':
        // Psychology agent should have evidence-based validation
        if (result.result?.isValid === false) {
          score *= 0.6
        }
        if (result.result?.evidenceBase?.length > 2) {
          score = Math.min(score + 0.05, 1.0) // Bonus for strong evidence base
        }
        break
        
      case 'compliance':
        // Compliance agent failures are serious
        if (result.result?.compliant === false) {
          score *= 0.3
        }
        if (result.result?.riskLevel === 'high') {
          score *= 0.5
        }
        break
        
      case 'technical':
        // Technical agent should identify performance issues
        if (result.result?.performanceImpact === 'critical' && result.confidence > 0.8) {
          score = Math.min(score + 0.05, 1.0)
        }
        break
    }
    
    // Penalize errors
    if (result.errors && result.errors.length > 0) {
      score *= 0.7
    }
    
    return Math.max(0.1, Math.min(1.0, score))
  }

  private calculateConsensus(agentResults: Record<string, AgentOutput>): number {
    // Simplified consensus calculation based on agent agreement
    const agents = Object.values(agentResults)
    if (agents.length < 2) return 1.0
    
    let agreements = 0
    let comparisons = 0
    
    // Check if safety and psychology agents agree on risk level
    if (agentResults.safety && agentResults.psychology) {
      const safetyLevel = agentResults.safety.result?.safetyLevel || 'safe'
      const psychologyRisk = agentResults.psychology.result?.isValid ? 'safe' : 'concern'
      
      if ((safetyLevel === 'safe' && psychologyRisk === 'safe') ||
          (safetyLevel !== 'safe' && psychologyRisk !== 'safe')) {
        agreements++
      }
      comparisons++
    }
    
    // Check if compliance and technical agents agree on implementation feasibility
    if (agentResults.compliance && agentResults.technical) {
      const complianceOk = agentResults.compliance.result?.compliant
      const technicalOk = agentResults.technical.result?.performanceImpact !== 'critical'
      
      if (complianceOk === technicalOk) {
        agreements++
      }
      comparisons++
    }
    
    return comparisons > 0 ? agreements / comparisons : 1.0
  }

  private identifyConflicts(agentResults: Record<string, AgentOutput>): string[] {
    const conflicts = []
    
    // Safety vs Psychology conflicts
    if (agentResults.safety && agentResults.psychology) {
      const safetyLevel = agentResults.safety.result?.safetyLevel
      const psychologyValid = agentResults.psychology.result?.isValid
      
      if (safetyLevel === 'safe' && psychologyValid === false) {
        conflicts.push('Safety agent reports safe but psychology agent reports invalid content')
      }
      if (safetyLevel !== 'safe' && psychologyValid === true) {
        conflicts.push('Psychology agent validates content but safety agent reports concerns')
      }
    }
    
    // Compliance vs Technical conflicts
    if (agentResults.compliance && agentResults.technical) {
      const compliant = agentResults.compliance.result?.compliant
      const technicalFeasible = agentResults.technical.result?.performanceImpact !== 'critical'
      
      if (compliant && !technicalFeasible) {
        conflicts.push('Compliance requirements may not be technically feasible')
      }
    }
    
    // High confidence disagreements
    Object.entries(agentResults).forEach(([agentType, result]) => {
      if (result.confidence > 0.8 && result.requiresReview) {
        conflicts.push(`${agentType} agent has high confidence but requires manual review`)
      }
    })
    
    return conflicts
  }

  private async resolveConflicts(
    agentResults: Record<string, AgentOutput>,
    qualityAssessment: QualityOversight
  ): Promise<Record<string, AgentOutput>> {
    if (qualityAssessment.conflictResolution.length === 0) {
      return agentResults // No conflicts to resolve
    }
    
    // Safety always wins conflicts
    if (agentResults.safety?.result?.requiresImmediateIntervention) {
      return { safety: agentResults.safety }
    }
    
    // For other conflicts, use weighted resolution based on confidence and context
    const resolvedResults = { ...agentResults }
    
    qualityAssessment.conflictResolution.forEach(conflict => {
      if (conflict.includes('Safety') && conflict.includes('Psychology')) {
        // Safety takes precedence in safety vs psychology conflicts
        if (agentResults.safety?.confidence > agentResults.psychology?.confidence) {
          resolvedResults.psychology = {
            ...resolvedResults.psychology,
            requiresReview: true,
            result: {
              ...resolvedResults.psychology.result,
              note: 'Deferred to safety agent assessment'
            }
          }
        }
      }
    })
    
    return resolvedResults
  }

  private async synthesizeResponse(
    agentResults: Record<string, AgentOutput>,
    qualityAssessment: QualityOversight,
    input: AgentInput
  ): Promise<OrchestrationResult> {
    // Create comprehensive coordinated response
    const finalResponse = {
      type: 'coordinated_swarm_response',
      context: input.context,
      coordinationQuality: qualityAssessment.overallQuality,
      consensusLevel: qualityAssessment.consensusLevel,
      agentConsensus: qualityAssessment.overallQuality >= 0.8 && qualityAssessment.consensusLevel >= 0.7
    }
    
    // Safety-first synthesis
    const safetyResult = agentResults.safety?.result
    if (safetyResult?.requiresImmediateIntervention) {
      return {
        finalResponse: {
          ...finalResponse,
          type: 'emergency_intervention',
          safetyLevel: safetyResult.safetyLevel,
          crisisResources: safetyResult.safetyPlan,
          emergencyContacts: true,
          message: 'Immediate professional intervention required. Crisis resources provided.'
        },
        agentResults: { safety: agentResults.safety },
        safetyLevel: safetyResult.safetyLevel,
        requiresHumanReview: true,
        processingTime: 0,
        coordination: {
          safetyFirst: safetyResult
        }
      }
    }
    
    // Comprehensive synthesis for non-crisis situations
    const psychologyResult = agentResults.psychology?.result
    const complianceResult = agentResults.compliance?.result
    const technicalResult = agentResults.technical?.result
    
    if (psychologyResult?.isValid && complianceResult?.compliant) {
      return {
        finalResponse: {
          ...finalResponse,
          type: 'validated_guidance',
          framework: psychologyResult.framework,
          evidenceBase: psychologyResult.evidenceBase,
          recommendations: psychologyResult.recommendations,
          compliance: {
            status: 'compliant',
            regulations: complianceResult.regulations
          },
          technical: {
            performanceImpact: technicalResult?.performanceImpact || 'low',
            architecturalRecommendations: technicalResult?.architecturalRecommendations || []
          }
        },
        agentResults,
        safetyLevel: safetyResult?.safetyLevel || 'safe',
        requiresHumanReview: qualityAssessment.overallQuality < 0.8,
        processingTime: 0,
        coordination: {
          safetyFirst: safetyResult,
          psychologyValidation: psychologyResult,
          complianceCheck: complianceResult,
          technicalValidation: technicalResult
        }
      }
    }
    
    // Fallback for validation failures
    return {
      finalResponse: {
        ...finalResponse,
        type: 'requires_review',
        message: 'Content requires manual review due to validation concerns',
        qualityIssues: qualityAssessment.conflictResolution
      },
      agentResults,
      safetyLevel: safetyResult?.safetyLevel || 'concern',
      requiresHumanReview: true,
      processingTime: 0,
      coordination: {
        safetyFirst: safetyResult,
        qualityAssessment
      }
    }
  }

  private async generateFinalRecommendation(
    agentResults: Record<string, AgentOutput>,
    overallQuality: number,
    consensusLevel: number,
    input: AgentInput
  ): Promise<string> {
    if (overallQuality >= 0.9 && consensusLevel >= 0.8) {
      return 'High-quality response with strong agent consensus. Approved for delivery.'
    }
    
    if (overallQuality >= 0.7 && consensusLevel >= 0.6) {
      return 'Acceptable quality with moderate consensus. Consider manual review for optimization.'
    }
    
    if (agentResults.safety?.result?.requiresImmediateIntervention) {
      return 'Crisis situation detected. Immediate professional intervention required.'
    }
    
    return 'Quality or consensus concerns detected. Manual review required before delivery.'
  }

  private async executeAgentWithTimeout(
    agent: any,
    input: AgentInput,
    timeout: number
  ): Promise<AgentOutput> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Agent execution timed out after ${timeout}ms`))
      }, timeout)

      try {
        const result = await agent.process(input)
        clearTimeout(timeoutId)
        resolve(result)
      } catch (error) {
        clearTimeout(timeoutId)
        reject(error)
      }
    })
  }

  private meetsQualityThreshold(result: AgentOutput, threshold: number): boolean {
    return result.confidence >= threshold && (!result.errors || result.errors.length === 0)
  }

  private async triggerSafetyFailsafe(input: AgentInput, safetyResult: AgentOutput): Promise<void> {
    // Emergency protocol for safety agent failure
    console.error('SAFETY FAILSAFE TRIGGERED - Manual intervention required')
    
    this.memoryStore.set(`safety-failsafe-${Date.now()}`, {
      userId: input.userId,
      coupleId: input.coupleId,
      context: input.context,
      safetyResult,
      timestamp: new Date().toISOString(),
      manualInterventionRequired: true
    })
  }

  private async switchToCrisisMode(
    input: AgentInput,
    partialResults: Record<string, AgentOutput>
  ): Promise<void> {
    console.log('SWITCHING TO CRISIS MODE - Priority to safety protocols')
    
    this.memoryStore.set(`crisis-mode-${Date.now()}`, {
      userId: input.userId,
      coupleId: input.coupleId,
      triggerResults: partialResults,
      timestamp: new Date().toISOString(),
      crisisModeActivated: true
    })
  }

  private async trackCoordinationOutcome(
    input: AgentInput,
    response: OrchestrationResult,
    agentResults: Record<string, AgentOutput>
  ): Promise<void> {
    const outcome = {
      timestamp: Date.now(),
      userId: input.userId,
      coupleId: input.coupleId,
      context: input.context,
      overallQuality: response.coordination?.qualityAssessment?.overallQuality || 0,
      agentCount: Object.keys(agentResults).length,
      requiresReview: response.requiresHumanReview,
      safetyLevel: response.safetyLevel,
      processingTime: response.processingTime
    }
    
    this.coordinationHistory.push(outcome)
    
    // Keep last 100 coordination outcomes
    if (this.coordinationHistory.length > 100) {
      this.coordinationHistory = this.coordinationHistory.slice(-100)
    }
    
    // Store detailed outcome for analysis
    this.memoryStore.set(`coordination-outcome-${outcome.timestamp}`, {
      ...outcome,
      agentResults,
      fullResponse: response
    })
  }

  private createAgentErrorResponse(agentType: string, error: any): AgentOutput {
    return {
      agentType: agentType as any,
      result: null,
      confidence: 0.1,
      requiresReview: true,
      processingTime: 0,
      errors: [error.message]
    }
  }

  private createErrorResponse(error: any, startTime: number): AgentOutput {
    return {
      agentType: 'coordinator',
      result: {
        type: 'coordination_error',
        message: 'Swarm coordination failed',
        error: error.message,
        requiresManualReview: true
      },
      confidence: 0.1,
      requiresReview: true,
      processingTime: Date.now() - startTime,
      errors: [error.message]
    }
  }

  private async loadPersistedMemory(): Promise<void> {
    try {
      // Load coordination history and patterns
      console.log('SwarmLeadCoordinator memory loaded')
    } catch (error) {
      console.warn('Could not load persisted memory for SwarmLeadCoordinator:', error)
    }
  }

  private initializeAgents(anthropic: Anthropic): void {
    this.agents.set('safety', new SafetyValidatorAgent(anthropic))
    this.agents.set('psychology', new RelationshipPsychologyExpertAgent(anthropic))
    this.agents.set('compliance', new ComplianceOfficerAgent(anthropic))
    this.agents.set('technical', new TechnicalArchitectAgent(anthropic))
  }

  private initializeQualityStandards(): void {
    this.qualityStandards.set('safety', 0.95)      // Highest standard for safety
    this.qualityStandards.set('psychology', 0.85)  // High standard for psychology
    this.qualityStandards.set('compliance', 0.9)   // High standard for compliance
    this.qualityStandards.set('technical', 0.8)    // Good standard for technical
  }

  // Health check and metrics
  getAgentHealth(): any {
    return {
      agentType: 'swarm-lead-coordinator',
      status: 'active',
      memorySize: this.memoryStore.size,
      coordinationHistorySize: this.coordinationHistory.length,
      managedAgents: Array.from(this.agents.keys()),
      qualityStandards: Object.fromEntries(this.qualityStandards),
      lastCoordination: this.coordinationHistory[this.coordinationHistory.length - 1]?.timestamp,
      lastUpdate: Date.now()
    }
  }

  // Get coordination metrics for monitoring
  getCoordinationMetrics(): any {
    const recentOutcomes = this.coordinationHistory.slice(-20)
    
    return {
      averageQuality: recentOutcomes.reduce((sum, o) => sum + o.overallQuality, 0) / recentOutcomes.length,
      crisisHandled: recentOutcomes.filter(o => o.safetyLevel === 'crisis').length,
      manualReviewRate: recentOutcomes.filter(o => o.requiresReview).length / recentOutcomes.length,
      averageProcessingTime: recentOutcomes.reduce((sum, o) => sum + o.processingTime, 0) / recentOutcomes.length,
      agentParticipation: recentOutcomes.reduce((sum, o) => sum + o.agentCount, 0) / recentOutcomes.length
    }
  }
}

export default SwarmLeadCoordinatorAgent