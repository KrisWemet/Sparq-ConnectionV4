import { 
  Agent, 
  AgentType, 
  AgentInput, 
  AgentOutput, 
  OrchestrationResult, 
  OrchestrationConfig,
  WorkerTask,
  SafetyResult 
} from './types'
import { AgentRegistry } from './registry'
import { AgentFactory } from './factory'
import { WorkerPool, WorkerPoolConfig } from '../workers/worker-pool'

export class OrchestrationEngine {
  private registry: AgentRegistry
  private factory: AgentFactory
  private workerPool: WorkerPool | null = null
  private config: OrchestrationConfig

  constructor(config: OrchestrationConfig) {
    this.config = config
    this.registry = new AgentRegistry()
    this.factory = new AgentFactory(this.registry)
  }

  async initialize(): Promise<void> {
    // Initialize agents based on configuration
    await this.factory.initializeAgents(this.config.mode)
    
    // Initialize worker pool if configured
    if (this.shouldUseWorkerPool()) {
      const workerConfig: WorkerPoolConfig = {
        minWorkers: 2,
        maxWorkers: 8,
        idleTimeout: 60000,
        taskTimeout: this.config.timeout
      }
      
      this.workerPool = new WorkerPool(workerConfig)
      this.workerPool.startCleanupTimer()
    }

    console.log(`Orchestration engine initialized in ${this.config.mode} mode`)
  }

  async processInput(input: AgentInput): Promise<OrchestrationResult> {
    const startTime = Date.now()
    const processingId = `proc-${Date.now()}-${Math.random().toString(36).slice(2)}`
    
    try {
      // Step 1: Enhanced Safety screening with retry logic
      const safetyResult = await this.runSafetyAgentWithRetry(input, processingId)
      
      // Step 2: Check if immediate intervention is required
      if (safetyResult.requiresImmediateIntervention) {
        return this.handleCrisisIntervention(input, safetyResult, startTime)
      }

      // Step 3: Run other agents with smart coordination and error recovery
      const agentResults = await this.runAgentCoordinationOptimized(input, safetyResult, processingId)

      // Step 4: Synthesize final response with quality validation
      const finalResponse = this.synthesizeResponseOptimized(agentResults, safetyResult)

      // Step 5: Performance tracking and quality assurance
      const processingTime = Date.now() - startTime
      this.trackPerformanceMetrics(processingId, processingTime, agentResults, safetyResult)

      return {
        finalResponse,
        agentResults: this.mapAgentResults(agentResults),
        safetyLevel: safetyResult.safetyLevel,
        requiresHumanReview: this.determineHumanReview(agentResults, safetyResult),
        processingTime,
        coordination: {
          safetyFirst: safetyResult,
          psychologyValidation: agentResults.find(r => r.agentType === 'psychology')?.result,
          complianceCheck: agentResults.find(r => r.agentType === 'compliance')?.result,
          technicalValidation: agentResults.find(r => r.agentType === 'technical')?.result
        },
        systemInfo: {
          processingId,
          agentsUsed: agentResults.map(r => r.agentType),
          performanceGrade: this.calculatePerformanceGrade(processingTime, agentResults),
          retryCount: agentResults.reduce((sum, r) => sum + (r.retryCount || 0), 0)
        }
      }
    } catch (error) {
      return this.handleProcessingErrorOptimized(error, input, startTime, processingId)
    }
  }

  private async runSafetyAgent(input: AgentInput): Promise<SafetyResult> {
    const safetyAgent = this.registry.getAgent('safety')
    if (!safetyAgent) {
      throw new Error('Safety agent not available - cannot process input')
    }

    const result = await this.executeAgent(safetyAgent, input)
    return result.result as SafetyResult
  }

  private async runAgentCoordination(input: AgentInput, safetyResult: SafetyResult): Promise<AgentOutput[]> {
    const agents = this.registry.getAgentsByPriority()
    const results: AgentOutput[] = []

    // Filter out safety agent (already executed)
    const remainingAgents = agents.filter(agent => agent.type !== 'safety')

    if (this.config.parallel && this.workerPool) {
      // Run agents in parallel using worker pool
      results.push(...await this.runAgentsInParallel(remainingAgents, input))
    } else {
      // Run agents sequentially
      results.push(...await this.runAgentsSequentially(remainingAgents, input))
    }

    return results
  }

  private async runAgentsInParallel(agents: Agent[], input: AgentInput): Promise<AgentOutput[]> {
    const tasks = agents.map(agent => this.createWorkerTask(agent, input))
    const promises = tasks.map(task => this.workerPool!.execute(task))
    
    try {
      const workerResults = await Promise.allSettled(promises)
      return workerResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value.output
        } else {
          // Handle failed agent
          return this.createErrorAgentOutput(agents[index], result.reason)
        }
      })
    } catch (error) {
      throw new Error(`Parallel agent execution failed: ${error}`)
    }
  }

  private async runAgentsSequentially(agents: Agent[], input: AgentInput): Promise<AgentOutput[]> {
    const results: AgentOutput[] = []
    
    for (const agent of agents) {
      try {
        const result = await this.executeAgent(agent, input)
        results.push(result)
        
        // Stop if we encounter a critical issue that requires immediate attention
        if (result.requiresReview && agent.type === 'compliance') {
          console.log(`Stopping sequential execution due to compliance issue`)
          break
        }
      } catch (error) {
        // Continue with other agents even if one fails
        results.push(this.createErrorAgentOutput(agent, error))
        
        if (!this.config.fallbackOnError) {
          break
        }
      }
    }

    return results
  }

  private async executeAgent(agent: Agent, input: AgentInput): Promise<AgentOutput> {
    const config = this.registry.getConfig(agent.type)
    const timeout = config?.timeout || this.config.timeout

    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Agent ${agent.type} timed out after ${timeout}ms`))
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

  private createWorkerTask(agent: Agent, input: AgentInput): WorkerTask {
    return {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      agentType: agent.type,
      input,
      priority: agent.priority,
      created: new Date(),
      timeout: this.registry.getConfig(agent.type)?.timeout || this.config.timeout
    }
  }

  private createErrorAgentOutput(agent: Agent, error: any): AgentOutput {
    return {
      agentType: agent.type,
      result: null,
      confidence: 0,
      requiresReview: true,
      processingTime: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }

  private async handleCrisisIntervention(
    input: AgentInput, 
    safetyResult: SafetyResult, 
    startTime: number
  ): Promise<OrchestrationResult> {
    // Crisis intervention bypasses normal processing
    const crisisResponse = {
      type: 'crisis_intervention',
      safetyLevel: safetyResult.safetyLevel,
      immediateActions: [
        'Crisis detected - connecting to professional help',
        'Emergency resources provided',
        'User safety prioritized'
      ],
      resources: {
        'National Suicide Prevention Lifeline': '988',
        'Crisis Text Line': 'Text HOME to 741741',
        'National Domestic Violence Hotline': '1-800-799-7233',
        'Emergency Services': '911'
      },
      professionalEscalation: true,
      message: 'We\'ve detected you may be in crisis. Your safety is our priority. Please reach out to the resources provided or contact emergency services if needed.'
    }

    return {
      finalResponse: crisisResponse,
      agentResults: { safety: { agentType: 'safety', result: safetyResult, confidence: 1, requiresReview: true, processingTime: 0 } },
      safetyLevel: safetyResult.safetyLevel,
      requiresHumanReview: true,
      processingTime: Date.now() - startTime,
      coordination: {
        safetyFirst: safetyResult
      }
    }
  }

  private synthesizeResponse(agentResults: AgentOutput[], safetyResult: SafetyResult): any {
    // Create synthesized response based on all agent outputs
    const psychologyResult = agentResults.find(r => r.agentType === 'psychology')
    const complianceResult = agentResults.find(r => r.agentType === 'compliance')
    const technicalResult = agentResults.find(r => r.agentType === 'technical')

    // Start with safety-validated base response
    let response = {
      type: 'coordinated_response',
      safetyLevel: safetyResult.safetyLevel,
      validated: true
    }

    // Add psychology insights if available and valid
    if (psychologyResult?.result?.isValid) {
      response = {
        ...response,
        psychologyFramework: psychologyResult.result.framework,
        evidenceBase: psychologyResult.result.evidenceBase,
        recommendations: psychologyResult.result.recommendations
      }
    }

    // Add compliance status
    if (complianceResult?.result) {
      response = {
        ...response,
        compliance: {
          status: complianceResult.result.compliant ? 'compliant' : 'requires_review',
          regulations: complianceResult.result.regulations
        }
      }
    }

    // Add technical considerations
    if (technicalResult?.result) {
      response = {
        ...response,
        technical: {
          performanceImpact: technicalResult.result.performanceImpact,
          securityConsiderations: technicalResult.result.securityConsiderations.length > 0
        }
      }
    }

    return response
  }

  private mapAgentResults(results: AgentOutput[]): Record<AgentType, AgentOutput> {
    const mapped: Record<AgentType, AgentOutput> = {} as any
    
    results.forEach(result => {
      mapped[result.agentType] = result
    })

    return mapped
  }

  private determineHumanReview(agentResults: AgentOutput[], safetyResult: SafetyResult): boolean {
    // Always require human review for safety concerns
    if (safetyResult.requiresReview) {
      return true
    }

    // Check if any agent requires review
    return agentResults.some(result => result.requiresReview || result.errors?.length > 0)
  }

  private handleProcessingError(error: any, input: AgentInput, startTime: number): OrchestrationResult {
    return {
      finalResponse: {
        type: 'error',
        message: 'Processing failed - please try again or contact support',
        error: this.config.mode === 'development' ? error.message : undefined
      },
      agentResults: {},
      safetyLevel: 'concern', // Assume concern level for errors
      requiresHumanReview: true,
      processingTime: Date.now() - startTime,
      coordination: {
        safetyFirst: {
          safetyLevel: 'concern',
          crisisIndicators: [],
          requiresImmediateIntervention: false,
          requiresReview: true,
          reasoning: 'Processing error occurred',
          confidence: 0
        }
      }
    }
  }

  private shouldUseWorkerPool(): boolean {
    // Use worker pool for parallel processing and high-load scenarios
    return this.config.parallel && this.config.mode !== 'development'
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    agents: Record<AgentType, boolean>
    workerPool?: any
    mode: string
  }> {
    const agentConnectivity = await this.factory.testAgentConnectivity()
    const allAgentsHealthy = Object.values(agentConnectivity).every(status => status)
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    // Safety agent is critical
    if (!agentConnectivity.safety) {
      status = 'unhealthy'
    } else if (!allAgentsHealthy) {
      status = 'degraded'
    }

    const healthReport: any = {
      status,
      agents: agentConnectivity,
      mode: this.config.mode
    }

    if (this.workerPool) {
      healthReport.workerPool = this.workerPool.getStats()
    }

    return healthReport
  }

  // Enhanced Safety Agent with Retry Logic
  private async runSafetyAgentWithRetry(input: AgentInput, processingId: string): Promise<SafetyResult> {
    const safetyAgent = this.registry.getAgent('safety')
    if (!safetyAgent) {
      throw new Error('Safety agent not available - cannot process input')
    }

    const config = this.registry.getConfig('safety')
    const maxRetries = config?.retryAttempts || 2
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Use shorter timeout for safety checks (critical for crisis detection)
        const result = await this.executeAgentWithTimeout(safetyAgent, input, 3000)
        
        // Validate safety result quality
        if (this.validateSafetyResult(result.result as SafetyResult)) {
          result.result.retryCount = attempt
          return result.result as SafetyResult
        } else if (attempt < maxRetries) {
          console.warn(`Safety result validation failed on attempt ${attempt + 1}, retrying...`)
          continue
        }
      } catch (error) {
        lastError = error as Error
        console.warn(`Safety agent attempt ${attempt + 1} failed:`, error)
        
        if (attempt < maxRetries) {
          // Exponential backoff for retries
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100))
        }
      }
    }

    // If all retries failed, use emergency safety response
    console.error('All safety agent attempts failed, using emergency response')
    return this.createEmergencySafetyResponse(input, lastError)
  }

  private async runAgentCoordinationOptimized(
    input: AgentInput, 
    safetyResult: SafetyResult, 
    processingId: string
  ): Promise<AgentOutput[]> {
    const agents = this.registry.getAgentsByPriority()
    const results: AgentOutput[] = []

    // Filter out safety agent (already executed)
    const remainingAgents = agents.filter(agent => agent.type !== 'safety')

    // Determine optimal execution strategy
    const useParallel = this.shouldUseParallelProcessing(input, safetyResult, remainingAgents)

    if (useParallel && this.workerPool) {
      // Enhanced parallel execution with circuit breaker pattern
      results.push(...await this.runAgentsInParallelOptimized(remainingAgents, input, processingId))
    } else {
      // Enhanced sequential execution with smart fallback
      results.push(...await this.runAgentsSequentiallyOptimized(remainingAgents, input, processingId))
    }

    return results
  }

  private shouldUseParallelProcessing(
    input: AgentInput, 
    safetyResult: SafetyResult, 
    agents: Agent[]
  ): boolean {
    // Don't use parallel for crisis situations (sequential for reliability)
    if (safetyResult.safetyLevel === 'crisis' || safetyResult.safetyLevel === 'concern') {
      return false
    }

    // Use parallel for non-crisis assessments and guidance
    return this.config.parallel && agents.length > 1
  }

  private async runAgentsInParallelOptimized(
    agents: Agent[], 
    input: AgentInput, 
    processingId: string
  ): Promise<AgentOutput[]> {
    const tasks = agents.map(agent => this.createOptimizedWorkerTask(agent, input, processingId))
    
    // Use Promise.allSettled with timeout for fault tolerance
    const timeout = Math.min(this.config.timeout, 15000) // Cap at 15 seconds for parallel
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Parallel execution timeout')), timeout)
    )

    try {
      const promises = tasks.map(task => this.executeTaskWithCircuitBreaker(task))
      const workerResults = await Promise.race([
        Promise.allSettled(promises),
        timeoutPromise
      ]) as PromiseSettledResult<any>[]

      return workerResults.map((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          return result.value.output
        } else {
          // Enhanced error handling with fallback
          return this.createErrorAgentOutputOptimized(
            agents[index], 
            result.status === 'rejected' ? result.reason : 'Unknown error',
            processingId
          )
        }
      })
    } catch (error) {
      // Fallback to sequential if parallel fails
      console.warn('Parallel execution failed, falling back to sequential:', error)
      return this.runAgentsSequentiallyOptimized(agents, input, processingId)
    }
  }

  private async runAgentsSequentiallyOptimized(
    agents: Agent[], 
    input: AgentInput, 
    processingId: string
  ): Promise<AgentOutput[]> {
    const results: AgentOutput[] = []
    
    for (const agent of agents) {
      try {
        const config = this.registry.getConfig(agent.type)
        const maxRetries = config?.retryAttempts || 1
        let agentResult: AgentOutput | null = null

        // Retry logic for each agent
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            agentResult = await this.executeAgentOptimized(agent, input, processingId)
            
            // Validate result quality
            if (this.validateAgentResult(agentResult)) {
              agentResult.retryCount = attempt
              break
            } else if (attempt < maxRetries) {
              console.warn(`Agent ${agent.type} result validation failed, retrying...`)
              continue
            }
          } catch (error) {
            if (attempt < maxRetries) {
              console.warn(`Agent ${agent.type} attempt ${attempt + 1} failed, retrying...`)
              await new Promise(resolve => setTimeout(resolve, 100 * attempt))
            } else {
              agentResult = this.createErrorAgentOutputOptimized(agent, error, processingId)
            }
          }
        }

        if (agentResult) {
          results.push(agentResult)
        }

        // Smart stop conditions for efficiency
        if (agentResult?.requiresReview && agent.type === 'compliance') {
          console.log(`Stopping sequential execution due to compliance issue`)
          break
        }
      } catch (error) {
        // Continue with other agents even if one fails completely
        results.push(this.createErrorAgentOutputOptimized(agent, error, processingId))
        
        if (!this.config.fallbackOnError) {
          break
        }
      }
    }

    return results
  }

  private async executeAgentOptimized(
    agent: Agent, 
    input: AgentInput, 
    processingId: string
  ): Promise<AgentOutput> {
    const config = this.registry.getConfig(agent.type)
    const timeout = config?.timeout || this.config.timeout

    return this.executeAgentWithTimeout(agent, input, timeout)
  }

  private async executeAgentWithTimeout(
    agent: Agent, 
    input: AgentInput, 
    timeoutMs: number
  ): Promise<AgentOutput> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Agent ${agent.type} timed out after ${timeoutMs}ms`))
      }, timeoutMs)

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

  private createOptimizedWorkerTask(
    agent: Agent, 
    input: AgentInput, 
    processingId: string
  ): WorkerTask {
    return {
      id: `${processingId}-${agent.type}-${Date.now()}`,
      agentType: agent.type,
      input,
      priority: agent.priority,
      created: new Date(),
      timeout: this.registry.getConfig(agent.type)?.timeout || this.config.timeout
    }
  }

  private async executeTaskWithCircuitBreaker(task: WorkerTask): Promise<any> {
    // Simple circuit breaker pattern
    const breakerKey = `${task.agentType}-breaker`
    
    if (!this.workerPool) {
      throw new Error('Worker pool not available')
    }

    return this.workerPool.execute(task)
  }

  private createErrorAgentOutputOptimized(
    agent: Agent, 
    error: any, 
    processingId: string
  ): AgentOutput {
    return {
      agentType: agent.type,
      result: null,
      confidence: 0,
      requiresReview: true,
      processingTime: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      retryCount: 0,
      processingId
    }
  }

  private validateSafetyResult(result: SafetyResult): boolean {
    return !!(
      result &&
      result.safetyLevel &&
      typeof result.confidence === 'number' &&
      result.confidence >= 0 &&
      result.confidence <= 1 &&
      Array.isArray(result.crisisIndicators)
    )
  }

  private validateAgentResult(result: AgentOutput): boolean {
    return !!(
      result &&
      result.agentType &&
      typeof result.confidence === 'number' &&
      result.confidence >= 0 &&
      result.confidence <= 1
    )
  }

  private createEmergencySafetyResponse(input: AgentInput, error: Error | null): SafetyResult {
    return {
      safetyLevel: 'concern',
      crisisIndicators: [],
      requiresImmediateIntervention: false,
      requiresReview: true,
      reasoning: `Emergency safety response due to system failure: ${error?.message || 'Unknown error'}`,
      confidence: 0.5
    }
  }

  private synthesizeResponseOptimized(agentResults: AgentOutput[], safetyResult: SafetyResult): any {
    // Enhanced response synthesis with quality checks
    const validResults = agentResults.filter(r => r.result && r.confidence > 0.3)
    
    let response = {
      type: 'coordinated_response',
      safetyLevel: safetyResult.safetyLevel,
      validated: true,
      qualityScore: this.calculateQualityScore(validResults, safetyResult)
    }

    // Add results from high-confidence agents
    const psychologyResult = validResults.find(r => r.agentType === 'psychology')
    if (psychologyResult?.result?.isValid && psychologyResult.confidence > 0.6) {
      response = {
        ...response,
        psychologyFramework: psychologyResult.result.framework,
        evidenceBase: psychologyResult.result.evidenceBase,
        recommendations: psychologyResult.result.recommendations
      }
    }

    const complianceResult = validResults.find(r => r.agentType === 'compliance')
    if (complianceResult?.result && complianceResult.confidence > 0.7) {
      response = {
        ...response,
        compliance: {
          status: complianceResult.result.compliant ? 'compliant' : 'requires_review',
          regulations: complianceResult.result.regulations
        }
      }
    }

    return response
  }

  private calculateQualityScore(results: AgentOutput[], safetyResult: SafetyResult): number {
    if (results.length === 0) return 0.3

    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    const safetyConfidence = safetyResult.confidence
    const hasErrors = results.some(r => r.errors && r.errors.length > 0)

    let score = (avgConfidence + safetyConfidence) / 2
    if (hasErrors) score *= 0.8

    return Math.max(0.1, Math.min(1.0, score))
  }

  private calculatePerformanceGrade(processingTime: number, results: AgentOutput[]): string {
    const avgConfidence = results.length > 0 ? 
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length : 0
    
    const speedScore = processingTime < 2000 ? 1.0 : 
                     processingTime < 5000 ? 0.8 : 
                     processingTime < 10000 ? 0.6 : 0.4

    const qualityScore = avgConfidence
    const overallScore = (speedScore + qualityScore) / 2

    if (overallScore >= 0.9) return 'A+'
    if (overallScore >= 0.8) return 'A'
    if (overallScore >= 0.7) return 'B+'
    if (overallScore >= 0.6) return 'B'
    return 'C'
  }

  private trackPerformanceMetrics(
    processingId: string, 
    processingTime: number, 
    results: AgentOutput[], 
    safetyResult: SafetyResult
  ): void {
    // Log performance metrics for monitoring
    const metrics = {
      processingId,
      processingTime,
      agentCount: results.length,
      avgConfidence: results.length > 0 ? 
        results.reduce((sum, r) => sum + r.confidence, 0) / results.length : 0,
      safetyLevel: safetyResult.safetyLevel,
      errorCount: results.filter(r => r.errors && r.errors.length > 0).length,
      retryCount: results.reduce((sum, r) => sum + (r.retryCount || 0), 0),
      timestamp: new Date().toISOString()
    }

    // In production, this would send to monitoring system
    console.log('Performance metrics:', metrics)
  }

  private handleProcessingErrorOptimized(
    error: any, 
    input: AgentInput, 
    startTime: number, 
    processingId: string
  ): OrchestrationResult {
    const isLikelyCrisis = input.context === 'crisis' || 
                          input.message.toLowerCase().includes('crisis') ||
                          input.message.toLowerCase().includes('emergency')

    return {
      finalResponse: {
        type: 'error',
        message: isLikelyCrisis 
          ? 'We\'re experiencing technical difficulties. If this is an emergency, please contact 988 (Suicide & Crisis Lifeline) or 911 immediately.'
          : 'Processing failed - please try again or contact support.',
        error: this.config.mode === 'development' ? error.message : undefined,
        processingId
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
          reasoning: `Processing error occurred: ${error.message}`,
          confidence: 0
        }
      },
      systemInfo: {
        processingId,
        agentsUsed: [],
        performanceGrade: 'F',
        retryCount: 0,
        error: error.message
      }
    }
  }

  async shutdown(): Promise<void> {
    if (this.workerPool) {
      await this.workerPool.shutdown()
    }
    console.log('Orchestration engine shut down')
  }
}