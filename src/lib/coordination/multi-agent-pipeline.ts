import Anthropic from '@anthropic-ai/sdk'
import { AgentInput, AgentOutput, OrchestrationResult } from '../orchestration/types'
import SwarmLeadCoordinatorAgent from '../agents/swarm-lead-coordinator-agent'
import SafetyValidatorAgent from '../agents/safety-validator-agent'
import RelationshipPsychologyExpertAgent from '../agents/relationship-psychology-expert-agent'
import ComplianceOfficerAgent from '../agents/compliance-officer-agent'
import TechnicalArchitectAgent from '../agents/technical-architect-agent'
import { getGlobalMemoryManager, PersistentMemoryManager } from '../memory/persistent-memory-manager'
import { getGlobalContextManager } from '../context/relationship-context-manager'

export interface PipelineConfig {
  mode: 'swarm-coordinated' | 'safety-first' | 'parallel' | 'sequential'
  timeout: number
  qualityThresholds: Record<string, number>
  memoryIntegration: boolean
  contextIntegration: boolean
  professionalOversight: boolean
}

export interface PipelineMetrics {
  processingTime: number
  agentsInvolved: string[]
  qualityScore: number
  safetyLevel: string
  memoryOperations: number
  contextEnrichments: number
  professionalEscalations: number
}

export class MultiAgentPipeline {
  private anthropic: Anthropic
  private swarmCoordinator: SwarmLeadCoordinatorAgent
  private memoryManager: PersistentMemoryManager
  private contextManager: any
  private config: PipelineConfig
  private metrics: Map<string, PipelineMetrics[]> = new Map()

  constructor(apiKey: string, config?: Partial<PipelineConfig>) {
    this.anthropic = new Anthropic({ apiKey })
    this.swarmCoordinator = new SwarmLeadCoordinatorAgent(this.anthropic)
    this.memoryManager = getGlobalMemoryManager()
    this.contextManager = getGlobalContextManager()
    
    this.config = {
      mode: 'swarm-coordinated',
      timeout: 30000,
      qualityThresholds: {
        safety: 0.95,
        psychology: 0.85,
        compliance: 0.9,
        technical: 0.8
      },
      memoryIntegration: true,
      contextIntegration: true,
      professionalOversight: true,
      ...config
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
    const startTime = Date.now()
    const processingId = `pipeline-${Date.now()}-${Math.random().toString(36).slice(2)}`
    
    try {
      // Phase 1: Memory and Context Enhancement
      const enhancedInput = await this.enhanceInputWithMemoryAndContext(input, processingId)
      
      // Phase 2: Safety-First Pre-Processing
      const safetyPreCheck = await this.performSafetyPreCheck(enhancedInput, processingId)
      
      // Phase 3: Multi-Agent Coordination
      const coordinatedResult = await this.coordinateAgents(enhancedInput, safetyPreCheck, processingId)
      
      // Phase 4: Professional Oversight (if required)
      const finalResult = await this.applyProfessionalOversight(coordinatedResult, enhancedInput, processingId)
      
      // Phase 5: Memory Storage and Learning
      await this.storeResultsAndLearn(enhancedInput, finalResult, processingId)
      
      // Phase 6: Metrics and Monitoring
      await this.recordMetrics(input.userId, finalResult, startTime, processingId)
      
      return finalResult
    } catch (error) {
      return this.handlePipelineError(error, input, startTime, processingId)
    }
  }

  private async enhanceInputWithMemoryAndContext(
    input: any,
    processingId: string
  ): Promise<AgentInput> {
    let enhancedMetadata = input.metadata || {}
    
    if (this.config.memoryIntegration) {
      // Retrieve relevant memory context
      const psychologyPrinciples = this.memoryManager.getRelationshipPsychologyPrinciples()
      const crisisProtocols = this.memoryManager.getCrisisDetectionProtocols()
      
      // Get user's interaction history across agents
      const userAgentHistory = {
        safety: this.memoryManager.getUserAgentHistory('safety', input.userId, 5),
        psychology: this.memoryManager.getUserAgentHistory('psychology', input.userId, 5),
        compliance: this.memoryManager.getUserAgentHistory('compliance', input.userId, 3),
        technical: this.memoryManager.getUserAgentHistory('technical', input.userId, 3)
      }
      
      enhancedMetadata = {
        ...enhancedMetadata,
        memoryContext: {
          psychologyPrinciples,
          crisisProtocols,
          userAgentHistory,
          processingId
        }
      }
    }
    
    if (this.config.contextIntegration && input.coupleId) {
      // Retrieve relationship context
      const relationshipContext = await this.contextManager.getContext(input.coupleId)
      const recentPatterns = await this.contextManager.getRecentPatterns(input.coupleId, 30)
      
      enhancedMetadata = {
        ...enhancedMetadata,
        relationshipContext: {
          context: relationshipContext,
          recentPatterns,
          processingId
        }
      }
    }
    
    return {
      userId: input.userId,
      coupleId: input.coupleId,
      message: input.message,
      context: input.context,
      userHistory: input.userHistory,
      metadata: enhancedMetadata
    }
  }

  private async performSafetyPreCheck(
    input: AgentInput,
    processingId: string
  ): Promise<{ shouldProceed: boolean; safetyResult?: any; requiresImmediate?: boolean }> {
    // Always perform initial safety check regardless of mode
    const safetyAgent = new SafetyValidatorAgent(this.anthropic)
    
    try {
      const safetyResult = await safetyAgent.process(input)
      
      // Store safety check in memory
      this.memoryManager.storeAgentInteraction('safety', input.userId, input, safetyResult)
      
      if (safetyResult.result?.requiresImmediateIntervention) {
        return {
          shouldProceed: false,
          safetyResult,
          requiresImmediate: true
        }
      }
      
      return {
        shouldProceed: true,
        safetyResult
      }
    } catch (error) {
      console.error('Safety pre-check failed:', error)
      // In case of safety check failure, proceed with extreme caution
      return {
        shouldProceed: true,
        safetyResult: {
          result: {
            safetyLevel: 'concern',
            requiresReview: true,
            reasoning: 'Safety pre-check failed - proceeding with enhanced monitoring'
          }
        }
      }
    }
  }

  private async coordinateAgents(
    input: AgentInput,
    safetyPreCheck: any,
    processingId: string
  ): Promise<OrchestrationResult> {
    // If immediate intervention required, return crisis response
    if (safetyPreCheck.requiresImmediate) {
      return this.createCrisisResponse(input, safetyPreCheck.safetyResult, processingId)
    }
    
    // Choose coordination strategy based on config and context
    switch (this.config.mode) {
      case 'swarm-coordinated':
        return this.runSwarmCoordination(input, processingId)
      
      case 'safety-first':
        return this.runSafetyFirstCoordination(input, processingId)
      
      case 'parallel':
        return this.runParallelCoordination(input, processingId)
      
      case 'sequential':
        return this.runSequentialCoordination(input, processingId)
      
      default:
        return this.runSwarmCoordination(input, processingId)
    }
  }

  private async runSwarmCoordination(
    input: AgentInput,
    processingId: string
  ): Promise<OrchestrationResult> {
    // Use the SwarmLeadCoordinator for full multi-agent orchestration
    const coordinatorResult = await this.swarmCoordinator.process(input)
    
    // Store coordination results in memory
    this.memoryManager.storeCoordinationResult(processingId, {
      type: 'swarm-coordination',
      input,
      result: coordinatorResult,
      timestamp: Date.now()
    })
    
    // Convert to OrchestrationResult format
    return this.convertToOrchestrationResult(coordinatorResult, input, processingId)
  }

  private async runSafetyFirstCoordination(
    input: AgentInput,
    processingId: string
  ): Promise<OrchestrationResult> {
    const agentResults: Record<string, AgentOutput> = {}
    
    // 1. Safety Agent (blocking)
    const safetyAgent = new SafetyValidatorAgent(this.anthropic)
    const safetyResult = await safetyAgent.process(input)
    agentResults.safety = safetyResult
    
    if (safetyResult.result?.requiresImmediateIntervention) {
      return this.createCrisisResponse(input, safetyResult, processingId)
    }
    
    // 2. Psychology Agent (if safe)
    if (safetyResult.result?.safetyLevel === 'safe' || safetyResult.result?.safetyLevel === 'caution') {
      const psychologyAgent = new RelationshipPsychologyExpertAgent(this.anthropic)
      agentResults.psychology = await psychologyAgent.process(input)
    }
    
    // 3. Compliance Agent (if psychology validates)
    if (agentResults.psychology?.result?.isValid) {
      const complianceAgent = new ComplianceOfficerAgent(this.anthropic)
      agentResults.compliance = await complianceAgent.process(input)
    }
    
    // 4. Technical Agent (if compliant)
    if (agentResults.compliance?.result?.compliant) {
      const technicalAgent = new TechnicalArchitectAgent(this.anthropic)
      agentResults.technical = await technicalAgent.process(input)
    }
    
    return this.synthesizeResults(agentResults, input, processingId)
  }

  private async runParallelCoordination(
    input: AgentInput,
    processingId: string
  ): Promise<OrchestrationResult> {
    // Safety check first
    const safetyAgent = new SafetyValidatorAgent(this.anthropic)
    const safetyResult = await safetyAgent.process(input)
    
    if (safetyResult.result?.requiresImmediateIntervention) {
      return this.createCrisisResponse(input, safetyResult, processingId)
    }
    
    // Run other agents in parallel
    const parallelPromises = [
      new RelationshipPsychologyExpertAgent(this.anthropic).process(input),
      new ComplianceOfficerAgent(this.anthropic).process(input),
      new TechnicalArchitectAgent(this.anthropic).process(input)
    ]
    
    const [psychologyResult, complianceResult, technicalResult] = await Promise.allSettled(parallelPromises)
    
    const agentResults: Record<string, AgentOutput> = {
      safety: safetyResult
    }
    
    if (psychologyResult.status === 'fulfilled') {
      agentResults.psychology = psychologyResult.value
    }
    if (complianceResult.status === 'fulfilled') {
      agentResults.compliance = complianceResult.value
    }
    if (technicalResult.status === 'fulfilled') {
      agentResults.technical = technicalResult.value
    }
    
    return this.synthesizeResults(agentResults, input, processingId)
  }

  private async runSequentialCoordination(
    input: AgentInput,
    processingId: string
  ): Promise<OrchestrationResult> {
    const agentResults: Record<string, AgentOutput> = {}
    
    const agents = [
      { type: 'safety', agent: new SafetyValidatorAgent(this.anthropic) },
      { type: 'psychology', agent: new RelationshipPsychologyExpertAgent(this.anthropic) },
      { type: 'compliance', agent: new ComplianceOfficerAgent(this.anthropic) },
      { type: 'technical', agent: new TechnicalArchitectAgent(this.anthropic) }
    ]
    
    for (const { type, agent } of agents) {
      try {
        const result = await agent.process(input)
        agentResults[type] = result
        
        // Store each agent interaction
        this.memoryManager.storeAgentInteraction(type, input.userId, input, result)
        
        // Stop on safety intervention
        if (type === 'safety' && result.result?.requiresImmediateIntervention) {
          return this.createCrisisResponse(input, result, processingId)
        }
        
        // Stop on compliance failure
        if (type === 'compliance' && !result.result?.compliant && result.result?.riskLevel === 'high') {
          break
        }
      } catch (error) {
        console.error(`Agent ${type} failed:`, error)
        agentResults[type] = {
          agentType: type as any,
          result: null,
          confidence: 0.1,
          requiresReview: true,
          processingTime: 0,
          errors: [error.message]
        }
      }
    }
    
    return this.synthesizeResults(agentResults, input, processingId)
  }

  private createCrisisResponse(
    input: AgentInput,
    safetyResult: AgentOutput,
    processingId: string
  ): OrchestrationResult {
    // Get crisis protocols from memory
    const crisisProtocols = this.memoryManager.getCrisisDetectionProtocols()
    const emergencyContacts = crisisProtocols?.crisis_resources?.emergency_contacts || {}
    
    return {
      finalResponse: {
        type: 'emergency_intervention',
        safetyLevel: safetyResult.result?.safetyLevel || 'crisis',
        message: 'Immediate professional intervention required',
        emergencyContacts,
        crisisResources: [
          'National Suicide Prevention Lifeline: 988',
          'Crisis Text Line: Text HOME to 741741',
          'National Domestic Violence Hotline: 1-800-799-7233',
          'Emergency Services: 911'
        ],
        professionalReferralRequired: true
      },
      agentResults: { safety: safetyResult },
      safetyLevel: safetyResult.result?.safetyLevel || 'crisis',
      requiresHumanReview: true,
      processingTime: 0,
      coordination: {
        safetyFirst: safetyResult.result
      },
      systemInfo: {
        processingId,
        agentsUsed: ['safety'],
        performanceGrade: 'A+',
        retryCount: 0,
        engine: 'multi-agent-pipeline',
        wasFallback: false,
        claudeFlowAvailable: true,
        timestamp: new Date().toISOString()
      }
    }
  }

  private convertToOrchestrationResult(
    coordinatorResult: AgentOutput,
    input: AgentInput,
    processingId: string
  ): OrchestrationResult {
    const result = coordinatorResult.result
    
    return {
      finalResponse: result,
      agentResults: result.agentResults || {},
      safetyLevel: result.safetyLevel || 'safe',
      requiresHumanReview: coordinatorResult.requiresReview,
      processingTime: coordinatorResult.processingTime,
      coordination: result.coordination || {
        safetyFirst: result.safetyFirst
      },
      systemInfo: {
        processingId,
        agentsUsed: result.agentsUsed || ['coordinator'],
        performanceGrade: result.performanceGrade || 'B',
        retryCount: result.retryCount || 0,
        engine: 'swarm-coordinator',
        wasFallback: false,
        claudeFlowAvailable: true,
        timestamp: new Date().toISOString()
      }
    }
  }

  private synthesizeResults(
    agentResults: Record<string, AgentOutput>,
    input: AgentInput,
    processingId: string
  ): OrchestrationResult {
    const safetyResult = agentResults.safety?.result
    const psychologyResult = agentResults.psychology?.result
    const complianceResult = agentResults.compliance?.result
    const technicalResult = agentResults.technical?.result
    
    // Calculate overall quality
    const agentConfidences = Object.values(agentResults).map(r => r.confidence)
    const avgConfidence = agentConfidences.length > 0 ? 
      agentConfidences.reduce((sum, c) => sum + c, 0) / agentConfidences.length : 0.5
    
    const finalResponse = {
      type: 'multi_agent_validated_response',
      context: input.context,
      agentConsensus: avgConfidence >= 0.8,
      validated: psychologyResult?.isValid && complianceResult?.compliant,
      qualityScore: avgConfidence
    }
    
    if (psychologyResult?.isValid && complianceResult?.compliant) {
      Object.assign(finalResponse, {
        framework: psychologyResult.framework,
        evidenceBase: psychologyResult.evidenceBase,
        recommendations: psychologyResult.recommendations,
        compliance: {
          status: 'compliant',
          regulations: complianceResult.regulations
        },
        technical: {
          performanceImpact: technicalResult?.performanceImpact || 'medium',
          architecturalRecommendations: technicalResult?.architecturalRecommendations || []
        }
      })
    }
    
    return {
      finalResponse,
      agentResults,
      safetyLevel: safetyResult?.safetyLevel || 'safe',
      requiresHumanReview: avgConfidence < 0.7 || !complianceResult?.compliant,
      processingTime: Math.max(...Object.values(agentResults).map(r => r.processingTime)),
      coordination: {
        safetyFirst: safetyResult,
        psychologyValidation: psychologyResult,
        complianceCheck: complianceResult,
        technicalValidation: technicalResult
      },
      systemInfo: {
        processingId,
        agentsUsed: Object.keys(agentResults),
        performanceGrade: this.calculatePerformanceGrade(avgConfidence, agentResults),
        retryCount: 0,
        engine: 'multi-agent-pipeline',
        wasFallback: false,
        claudeFlowAvailable: true,
        timestamp: new Date().toISOString()
      }
    }
  }

  private calculatePerformanceGrade(avgConfidence: number, agentResults: Record<string, AgentOutput>): string {
    const hasErrors = Object.values(agentResults).some(r => r.errors && r.errors.length > 0)
    
    if (avgConfidence >= 0.95 && !hasErrors) return 'A+'
    if (avgConfidence >= 0.9) return 'A'
    if (avgConfidence >= 0.8) return 'B+'
    if (avgConfidence >= 0.7) return 'B'
    if (avgConfidence >= 0.6) return 'C+'
    if (avgConfidence >= 0.5) return 'C'
    return 'D'
  }

  private async applyProfessionalOversight(
    result: OrchestrationResult,
    input: AgentInput,
    processingId: string
  ): Promise<OrchestrationResult> {
    if (!this.config.professionalOversight) {
      return result
    }
    
    // Check if professional oversight is required
    const requiresOversight = 
      result.safetyLevel === 'crisis' ||
      result.safetyLevel === 'concern' ||
      result.requiresHumanReview ||
      input.context === 'crisis'
    
    if (requiresOversight) {
      // In production, this would notify professional network
      console.log(`Professional oversight required for ${processingId}`)
      
      // Store professional oversight request
      this.memoryManager.store(
        `professional-oversight-${processingId}`,
        'professional-oversight',
        {
          userId: input.userId,
          coupleId: input.coupleId,
          safetyLevel: result.safetyLevel,
          context: input.context,
          result,
          timestamp: Date.now(),
          status: 'pending'
        }
      )
      
      // Add oversight info to result
      result.systemInfo = {
        ...result.systemInfo,
        professionalOversightRequested: true,
        oversightReason: result.safetyLevel === 'crisis' ? 'Crisis detected' : 'Quality review required'
      }
    }
    
    return result
  }

  private async storeResultsAndLearn(
    input: AgentInput,
    result: OrchestrationResult,
    processingId: string
  ): Promise<void> {
    // Store comprehensive processing results
    this.memoryManager.store(
      `processing-result-${processingId}`,
      'processing-results',
      {
        input,
        result,
        timestamp: Date.now(),
        processingId
      }
    )
    
    // Store learning outcomes for each agent
    Object.entries(result.agentResults).forEach(([agentType, agentResult]) => {
      const learningOutcome = {
        agentType,
        confidence: agentResult.confidence,
        success: !agentResult.errors || agentResult.errors.length === 0,
        processingTime: agentResult.processingTime,
        context: input.context,
        timestamp: Date.now()
      }
      
      this.memoryManager.storeLearningOutcome(agentType, learningOutcome)
    })
    
    // Update relationship context if applicable
    if (input.coupleId && this.config.contextIntegration) {
      await this.contextManager.addInteraction(
        input.coupleId,
        input.userId,
        input.message,
        input.context,
        result.finalResponse,
        result.safetyLevel,
        result.coordination.psychologyValidation?.framework
      )
    }
  }

  private async recordMetrics(
    userId: string,
    result: OrchestrationResult,
    startTime: number,
    processingId: string
  ): Promise<void> {
    const metrics: PipelineMetrics = {
      processingTime: Date.now() - startTime,
      agentsInvolved: result.systemInfo?.agentsUsed || [],
      qualityScore: result.finalResponse.qualityScore || 0,
      safetyLevel: result.safetyLevel,
      memoryOperations: 1, // Simplified for demo
      contextEnrichments: 1,
      professionalEscalations: result.systemInfo?.professionalOversightRequested ? 1 : 0
    }
    
    let userMetrics = this.metrics.get(userId) || []
    userMetrics.push(metrics)
    userMetrics = userMetrics.slice(-50) // Keep last 50 interactions
    this.metrics.set(userId, userMetrics)
  }

  private handlePipelineError(
    error: any,
    input: any,
    startTime: number,
    processingId: string
  ): OrchestrationResult {
    console.error('Pipeline error:', error)
    
    const isLikelyCrisis = input.context === 'crisis' || 
                          input.message.toLowerCase().includes('emergency')
    
    return {
      finalResponse: {
        type: 'pipeline_error',
        message: isLikelyCrisis 
          ? 'System error during crisis - immediately contact 988 or 911 if in danger'
          : 'Processing failed - please try again or contact support',
        error: error.message,
        emergencyContacts: isLikelyCrisis ? [
          'National Suicide Prevention Lifeline: 988',
          'Emergency Services: 911'
        ] : undefined
      },
      agentResults: {},
      safetyLevel: isLikelyCrisis ? 'crisis' : 'concern',
      requiresHumanReview: true,
      processingTime: Date.now() - startTime,
      coordination: {
        safetyFirst: {
          safetyLevel: isLikelyCrisis ? 'crisis' : 'concern',
          crisisIndicators: [],
          requiresImmediateIntervention: isLikelyCrisis,
          requiresReview: true,
          reasoning: `Pipeline error: ${error.message}`,
          confidence: 0
        }
      },
      systemInfo: {
        processingId,
        agentsUsed: [],
        performanceGrade: 'F',
        retryCount: 0,
        error: error.message,
        engine: 'multi-agent-pipeline',
        wasFallback: true,
        claudeFlowAvailable: false,
        timestamp: new Date().toISOString()
      }
    }
  }

  // Health check and metrics
  getSystemHealth(): any {
    return {
      pipeline: 'active',
      memoryManager: this.memoryManager.getMemoryStats(),
      swarmCoordinator: this.swarmCoordinator.getAgentHealth(),
      config: this.config,
      userMetrics: this.metrics.size,
      lastProcessing: Date.now()
    }
  }

  getUserMetrics(userId: string): PipelineMetrics[] {
    return this.metrics.get(userId) || []
  }

  async shutdown(): Promise<void> {
    await this.memoryManager.shutdown()
    console.log('Multi-agent pipeline shut down')
  }
}

export default MultiAgentPipeline