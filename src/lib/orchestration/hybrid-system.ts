import { OrchestrationEngine } from './engine'
import { OrchestrationConfig, AgentInput, OrchestrationResult } from './types'

export class HybridOrchestrationSystem {
  private primaryEngine: OrchestrationEngine | null = null
  private fallbackEngine: OrchestrationEngine | null = null
  private config: OrchestrationConfig
  private claudeFlowAvailable = false

  constructor(config: Partial<OrchestrationConfig> = {}) {
    this.config = {
      mode: 'hybrid',
      parallel: true,
      safetyFirst: true,
      timeout: 30000,
      fallbackOnError: true,
      agents: {
        safety: {
          enabled: true,
          priority: 10,
          timeout: 5000,
          retryAttempts: 2,
          fallbackEnabled: true
        },
        psychology: {
          enabled: true,
          priority: 8,
          timeout: 15000,
          retryAttempts: 1,
          fallbackEnabled: true
        },
        compliance: {
          enabled: true,
          priority: 6,
          timeout: 10000,
          retryAttempts: 1,
          fallbackEnabled: true
        },
        technical: {
          enabled: true,
          priority: 4,
          timeout: 10000,
          retryAttempts: 1,
          fallbackEnabled: true
        }
      },
      ...config
    }
  }

  async initialize(): Promise<void> {
    // Check Claude Flow availability
    this.claudeFlowAvailable = await this.checkClaudeFlowAvailability()
    
    if (this.claudeFlowAvailable && (this.config.mode === 'claude-flow' || this.config.mode === 'hybrid')) {
      try {
        // Initialize Claude Flow engine
        this.primaryEngine = new OrchestrationEngine({
          ...this.config,
          mode: 'claude-flow'
        })
        await this.primaryEngine.initialize()
        console.log('✅ Claude Flow engine initialized successfully')
      } catch (error) {
        console.warn('⚠️ Claude Flow initialization failed:', error)
        this.claudeFlowAvailable = false
      }
    }

    // Always initialize fallback engine
    this.fallbackEngine = new OrchestrationEngine({
      ...this.config,
      mode: 'standard',
      parallel: false // Fallback uses sequential processing for reliability
    })
    await this.fallbackEngine.initialize()
    console.log('✅ Standard fallback engine initialized')

    // Log final configuration
    if (this.primaryEngine && this.claudeFlowAvailable) {
      console.log('🚀 Hybrid system ready: Claude Flow primary, Standard fallback')
    } else {
      console.log('🔧 Standard system ready: No Claude Flow available')
    }
  }

  async processInput(input: AgentInput): Promise<OrchestrationResult> {
    const startTime = Date.now()
    
    // Always try primary engine first if available
    if (this.primaryEngine && this.claudeFlowAvailable) {
      try {
        const result = await this.primaryEngine.processInput(input)
        
        // Validate result quality
        if (this.isValidResult(result)) {
          result.processingTime = Date.now() - startTime
          return this.addSystemInfo(result, 'claude-flow', false)
        } else {
          console.warn('⚠️ Claude Flow result failed validation, falling back')
        }
      } catch (error) {
        console.error('❌ Claude Flow processing failed:', error)
        
        // If it's a critical safety issue, don't fallback immediately
        if (input.context === 'crisis') {
          throw new Error('Crisis processing failed in primary system')
        }
      }
    }

    // Fallback to standard engine
    if (!this.fallbackEngine) {
      throw new Error('No fallback engine available')
    }

    try {
      const result = await this.fallbackEngine.processInput(input)
      result.processingTime = Date.now() - startTime
      return this.addSystemInfo(result, 'standard', true)
    } catch (error) {
      // Last resort error handling
      return this.createEmergencyResponse(input, error, startTime)
    }
  }

  private async checkClaudeFlowAvailability(): Promise<boolean> {
    try {
      // Check if Claude Flow packages are available
      const hasClaudeFlow = await import('../ai-services/claude-flow')
        .then(() => true)
        .catch(() => false)

      if (!hasClaudeFlow) {
        return false
      }

      // Check if API key is available
      if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('⚠️ ANTHROPIC_API_KEY not found, Claude Flow unavailable')
        return false
      }

      // Test basic connectivity (could add a simple API call here)
      return true
    } catch (error) {
      console.warn('⚠️ Claude Flow availability check failed:', error)
      return false
    }
  }

  private isValidResult(result: OrchestrationResult): boolean {
    // Basic validation of orchestration result
    if (!result || !result.finalResponse) {
      return false
    }

    // Safety validation is critical
    if (!result.coordination?.safetyFirst) {
      return false
    }

    // Check for reasonable processing time (not hanging)
    if (result.processingTime > this.config.timeout) {
      return false
    }

    // Crisis responses must have proper escalation
    if (result.safetyLevel === 'critical' || result.safetyLevel === 'crisis') {
      if (!result.requiresHumanReview) {
        return false
      }
    }

    return true
  }

  private addSystemInfo(
    result: OrchestrationResult, 
    engine: 'claude-flow' | 'standard',
    wasFallback: boolean
  ): OrchestrationResult {
    return {
      ...result,
      systemInfo: {
        engine,
        wasFallback,
        claudeFlowAvailable: this.claudeFlowAvailable,
        timestamp: new Date().toISOString()
      }
    }
  }

  private createEmergencyResponse(
    input: AgentInput, 
    error: any, 
    startTime: number
  ): OrchestrationResult {
    // Emergency failsafe response
    const isLikelyCrisis = input.context === 'crisis' || 
                          input.message.toLowerCase().includes('crisis') ||
                          input.message.toLowerCase().includes('emergency')

    return {
      finalResponse: {
        type: 'emergency_response',
        message: isLikelyCrisis 
          ? 'We\'re experiencing technical difficulties. If this is an emergency, please contact 988 (Suicide & Crisis Lifeline) or 911 immediately.'
          : 'We\'re experiencing technical difficulties. Please try again in a moment or contact support.',
        error: 'System processing failed',
        resources: isLikelyCrisis ? {
          'National Suicide Prevention Lifeline': '988',
          'Crisis Text Line': 'Text HOME to 741741',
          'Emergency Services': '911'
        } : undefined
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
          reasoning: 'System failure - emergency response activated',
          confidence: 0
        }
      },
      systemInfo: {
        engine: 'emergency',
        wasFallback: true,
        claudeFlowAvailable: this.claudeFlowAvailable,
        timestamp: new Date().toISOString(),
        error: error.message
      }
    }
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    claudeFlowAvailable: boolean
    primaryEngine: any
    fallbackEngine: any
    configuration: OrchestrationConfig
  }> {
    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      claudeFlowAvailable: this.claudeFlowAvailable,
      primaryEngine: null as any,
      fallbackEngine: null as any,
      configuration: this.config
    }

    // Check primary engine health
    if (this.primaryEngine) {
      try {
        health.primaryEngine = await this.primaryEngine.getHealthStatus()
        if (health.primaryEngine.status === 'unhealthy') {
          health.status = 'degraded'
        }
      } catch (error) {
        health.status = 'degraded'
        health.primaryEngine = { status: 'unhealthy', error: error.message }
      }
    }

    // Check fallback engine health
    if (this.fallbackEngine) {
      try {
        health.fallbackEngine = await this.fallbackEngine.getHealthStatus()
        if (health.fallbackEngine.status === 'unhealthy') {
          health.status = health.status === 'healthy' ? 'degraded' : 'unhealthy'
        }
      } catch (error) {
        health.status = 'unhealthy'
        health.fallbackEngine = { status: 'unhealthy', error: error.message }
      }
    } else {
      health.status = 'unhealthy'
    }

    return health
  }

  async switchToPrimaryEngine(): Promise<boolean> {
    if (!this.claudeFlowAvailable) {
      const available = await this.checkClaudeFlowAvailability()
      if (!available) {
        return false
      }
      this.claudeFlowAvailable = true
    }

    if (!this.primaryEngine) {
      try {
        this.primaryEngine = new OrchestrationEngine({
          ...this.config,
          mode: 'claude-flow'
        })
        await this.primaryEngine.initialize()
        console.log('✅ Switched to Claude Flow engine')
        return true
      } catch (error) {
        console.error('❌ Failed to switch to Claude Flow:', error)
        return false
      }
    }

    return true
  }

  async switchToFallbackOnly(): Promise<void> {
    if (this.primaryEngine) {
      await this.primaryEngine.shutdown()
      this.primaryEngine = null
    }
    this.claudeFlowAvailable = false
    console.log('🔧 Switched to fallback-only mode')
  }

  getConfiguration(): OrchestrationConfig {
    return { ...this.config }
  }

  updateConfiguration(newConfig: Partial<OrchestrationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('⚙️ Configuration updated')
  }

  async restart(): Promise<void> {
    console.log('🔄 Restarting hybrid orchestration system...')
    
    // Shutdown existing engines
    if (this.primaryEngine) {
      await this.primaryEngine.shutdown()
    }
    if (this.fallbackEngine) {
      await this.fallbackEngine.shutdown()
    }

    // Reinitialize
    await this.initialize()
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down hybrid orchestration system...')
    
    if (this.primaryEngine) {
      await this.primaryEngine.shutdown()
    }
    if (this.fallbackEngine) {
      await this.fallbackEngine.shutdown()
    }

    this.primaryEngine = null
    this.fallbackEngine = null
  }
}

// Factory function for easy initialization
export async function createHybridSystem(config?: Partial<OrchestrationConfig>): Promise<HybridOrchestrationSystem> {
  const system = new HybridOrchestrationSystem(config)
  await system.initialize()
  return system
}

// Singleton instance for global use
let globalHybridSystem: HybridOrchestrationSystem | null = null

export async function getGlobalHybridSystem(): Promise<HybridOrchestrationSystem> {
  if (!globalHybridSystem) {
    globalHybridSystem = await createHybridSystem()
  }
  return globalHybridSystem
}

export async function initializeGlobalSystem(config?: Partial<OrchestrationConfig>): Promise<void> {
  if (globalHybridSystem) {
    await globalHybridSystem.shutdown()
  }
  globalHybridSystem = await createHybridSystem(config)
}