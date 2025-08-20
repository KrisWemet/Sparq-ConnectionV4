import { OrchestrationConfig, AgentConfig } from './types'

// Default configuration for the orchestration system
export const DEFAULT_ORCHESTRATION_CONFIG: OrchestrationConfig = {
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
      fallbackEnabled: true,
      workerPool: {
        minWorkers: 1,
        maxWorkers: 3,
        idleTimeout: 60000
      }
    },
    psychology: {
      enabled: true,
      priority: 8,
      timeout: 15000,
      retryAttempts: 1,
      fallbackEnabled: true,
      workerPool: {
        minWorkers: 1,
        maxWorkers: 2,
        idleTimeout: 60000
      }
    },
    compliance: {
      enabled: true,
      priority: 6,
      timeout: 10000,
      retryAttempts: 1,
      fallbackEnabled: true,
      workerPool: {
        minWorkers: 1,
        maxWorkers: 2,
        idleTimeout: 60000
      }
    },
    technical: {
      enabled: true,
      priority: 4,
      timeout: 10000,
      retryAttempts: 1,
      fallbackEnabled: true,
      workerPool: {
        minWorkers: 1,
        maxWorkers: 2,
        idleTimeout: 60000
      }
    }
  }
}

// Production configuration - more conservative settings
export const PRODUCTION_CONFIG: OrchestrationConfig = {
  ...DEFAULT_ORCHESTRATION_CONFIG,
  mode: 'hybrid',
  parallel: true,
  timeout: 20000,
  agents: {
    safety: {
      ...DEFAULT_ORCHESTRATION_CONFIG.agents.safety,
      timeout: 3000,
      retryAttempts: 3,
      workerPool: {
        minWorkers: 2,
        maxWorkers: 5,
        idleTimeout: 30000
      }
    },
    psychology: {
      ...DEFAULT_ORCHESTRATION_CONFIG.agents.psychology,
      timeout: 10000,
      retryAttempts: 2
    },
    compliance: {
      ...DEFAULT_ORCHESTRATION_CONFIG.agents.compliance,
      timeout: 8000,
      retryAttempts: 2
    },
    technical: {
      ...DEFAULT_ORCHESTRATION_CONFIG.agents.technical,
      timeout: 8000,
      retryAttempts: 1
    }
  }
}

// Development configuration - more lenient for testing
export const DEVELOPMENT_CONFIG: OrchestrationConfig = {
  ...DEFAULT_ORCHESTRATION_CONFIG,
  mode: 'standard',
  parallel: false,
  timeout: 60000,
  agents: {
    safety: {
      ...DEFAULT_ORCHESTRATION_CONFIG.agents.safety,
      timeout: 10000,
      retryAttempts: 1
    },
    psychology: {
      ...DEFAULT_ORCHESTRATION_CONFIG.agents.psychology,
      timeout: 30000,
      retryAttempts: 1
    },
    compliance: {
      ...DEFAULT_ORCHESTRATION_CONFIG.agents.compliance,
      timeout: 20000,
      retryAttempts: 1
    },
    technical: {
      ...DEFAULT_ORCHESTRATION_CONFIG.agents.technical,
      timeout: 20000,
      retryAttempts: 1
    }
  }
}

// Crisis-optimized configuration - fastest response for safety
export const CRISIS_CONFIG: OrchestrationConfig = {
  ...DEFAULT_ORCHESTRATION_CONFIG,
  mode: 'hybrid',
  parallel: true,
  timeout: 10000,
  agents: {
    safety: {
      ...DEFAULT_ORCHESTRATION_CONFIG.agents.safety,
      priority: 10,
      timeout: 2000,
      retryAttempts: 3,
      fallbackEnabled: true,
      workerPool: {
        minWorkers: 3,
        maxWorkers: 8,
        idleTimeout: 15000
      }
    },
    psychology: {
      ...DEFAULT_ORCHESTRATION_CONFIG.agents.psychology,
      enabled: false // Disable for crisis mode to focus on safety
    },
    compliance: {
      ...DEFAULT_ORCHESTRATION_CONFIG.agents.compliance,
      enabled: false // Disable for crisis mode
    },
    technical: {
      ...DEFAULT_ORCHESTRATION_CONFIG.agents.technical,
      enabled: false // Disable for crisis mode
    }
  }
}

// Configuration builder class
export class ConfigurationBuilder {
  private config: OrchestrationConfig

  constructor(baseConfig: OrchestrationConfig = DEFAULT_ORCHESTRATION_CONFIG) {
    this.config = JSON.parse(JSON.stringify(baseConfig)) // Deep clone
  }

  setMode(mode: OrchestrationConfig['mode']): ConfigurationBuilder {
    this.config.mode = mode
    return this
  }

  enableParallel(parallel: boolean = true): ConfigurationBuilder {
    this.config.parallel = parallel
    return this
  }

  setTimeout(timeout: number): ConfigurationBuilder {
    this.config.timeout = timeout
    return this
  }

  enableFallback(fallback: boolean = true): ConfigurationBuilder {
    this.config.fallbackOnError = fallback
    return this
  }

  configureAgent(
    agentType: keyof OrchestrationConfig['agents'], 
    config: Partial<AgentConfig>
  ): ConfigurationBuilder {
    this.config.agents[agentType] = {
      ...this.config.agents[agentType],
      ...config
    }
    return this
  }

  enableAgent(agentType: keyof OrchestrationConfig['agents']): ConfigurationBuilder {
    this.config.agents[agentType].enabled = true
    return this
  }

  disableAgent(agentType: keyof OrchestrationConfig['agents']): ConfigurationBuilder {
    this.config.agents[agentType].enabled = false
    return this
  }

  setPriority(
    agentType: keyof OrchestrationConfig['agents'], 
    priority: number
  ): ConfigurationBuilder {
    this.config.agents[agentType].priority = priority
    return this
  }

  optimizeForCrisis(): ConfigurationBuilder {
    // Enable only safety agent for fastest response
    this.config.agents.safety.enabled = true
    this.config.agents.safety.priority = 10
    this.config.agents.safety.timeout = 2000
    this.config.agents.safety.retryAttempts = 3

    // Disable other agents for speed
    this.config.agents.psychology.enabled = false
    this.config.agents.compliance.enabled = false
    this.config.agents.technical.enabled = false

    this.config.parallel = true
    this.config.timeout = 5000

    return this
  }

  optimizeForDevelopment(): ConfigurationBuilder {
    this.config.mode = 'standard'
    this.config.parallel = false
    this.config.timeout = 60000
    
    // Longer timeouts for debugging
    Object.keys(this.config.agents).forEach(agentType => {
      this.config.agents[agentType as keyof typeof this.config.agents].timeout *= 3
      this.config.agents[agentType as keyof typeof this.config.agents].retryAttempts = 1
    })

    return this
  }

  optimizeForProduction(): ConfigurationBuilder {
    this.config.mode = 'hybrid'
    this.config.parallel = true
    this.config.fallbackOnError = true
    
    // Conservative timeouts
    this.config.timeout = 20000
    this.config.agents.safety.timeout = 3000
    this.config.agents.safety.retryAttempts = 3

    return this
  }

  build(): OrchestrationConfig {
    return JSON.parse(JSON.stringify(this.config)) // Return deep clone
  }
}

// Environment-based configuration factory
export function getConfigForEnvironment(env: string = process.env.NODE_ENV || 'development'): OrchestrationConfig {
  switch (env.toLowerCase()) {
    case 'production':
      return PRODUCTION_CONFIG
    case 'development':
    case 'dev':
      return DEVELOPMENT_CONFIG
    case 'test':
      return {
        ...DEVELOPMENT_CONFIG,
        timeout: 5000,
        agents: {
          ...DEVELOPMENT_CONFIG.agents,
          safety: { ...DEVELOPMENT_CONFIG.agents.safety, timeout: 1000 },
          psychology: { ...DEVELOPMENT_CONFIG.agents.psychology, timeout: 2000 },
          compliance: { ...DEVELOPMENT_CONFIG.agents.compliance, timeout: 2000 },
          technical: { ...DEVELOPMENT_CONFIG.agents.technical, timeout: 2000 }
        }
      }
    case 'crisis':
      return CRISIS_CONFIG
    default:
      return DEFAULT_ORCHESTRATION_CONFIG
  }
}

// Configuration validation
export function validateConfiguration(config: OrchestrationConfig): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Basic validation
  if (!config.mode || !['claude-flow', 'standard', 'hybrid'].includes(config.mode)) {
    errors.push('Invalid mode: must be claude-flow, standard, or hybrid')
  }

  if (!config.timeout || config.timeout < 1000) {
    errors.push('Timeout must be at least 1000ms')
  }

  if (config.timeout > 300000) {
    warnings.push('Timeout over 5 minutes may cause performance issues')
  }

  // Agent validation
  if (!config.agents.safety.enabled) {
    errors.push('Safety agent must be enabled')
  }

  if (config.agents.safety.priority < 5) {
    warnings.push('Safety agent should have high priority (>=5)')
  }

  // Check for reasonable timeouts
  Object.entries(config.agents).forEach(([agentType, agentConfig]) => {
    if (agentConfig.enabled && agentConfig.timeout > config.timeout) {
      warnings.push(`${agentType} agent timeout exceeds overall timeout`)
    }

    if (agentConfig.enabled && agentConfig.timeout < 500) {
      warnings.push(`${agentType} agent timeout may be too short (<500ms)`)
    }
  })

  // Parallel processing warnings
  if (config.parallel && config.mode === 'standard') {
    warnings.push('Parallel processing with standard mode may not utilize all features')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

// Helper functions for common configuration changes
export function createCrisisConfig(): OrchestrationConfig {
  return new ConfigurationBuilder()
    .optimizeForCrisis()
    .build()
}

export function createDevelopmentConfig(): OrchestrationConfig {
  return new ConfigurationBuilder()
    .optimizeForDevelopment()
    .build()
}

export function createProductionConfig(): OrchestrationConfig {
  return new ConfigurationBuilder()
    .optimizeForProduction()
    .build()
}