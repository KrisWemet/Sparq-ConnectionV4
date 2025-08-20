import { Agent, AgentType, AgentConfig } from './types'
import { AgentRegistry } from './registry'

// Standard agent implementations
import { StandardSafetyAgent } from '../agents/safety-agent'
import { StandardPsychologyAgent } from '../agents/psychology-agent'
import { StandardComplianceAgent } from '../agents/compliance-agent'
import { StandardTechnicalAgent } from '../agents/technical-agent'

// Claude Flow agent implementations (optional)
let ClaudeFlowSafetyAgent: any
let ClaudeFlowPsychologyAgent: any
let ClaudeFlowComplianceAgent: any
let ClaudeFlowTechnicalAgent: any

// Dynamic import for Claude Flow agents if available
try {
  ClaudeFlowSafetyAgent = require('../agents/claude-flow-safety-agent').ClaudeFlowSafetyAgent
  ClaudeFlowPsychologyAgent = require('../agents/claude-flow-psychology-agent').ClaudeFlowPsychologyAgent
  ClaudeFlowComplianceAgent = require('../agents/claude-flow-compliance-agent').ClaudeFlowComplianceAgent
  ClaudeFlowTechnicalAgent = require('../agents/claude-flow-technical-agent').ClaudeFlowTechnicalAgent
} catch (error) {
  // Claude Flow agents not available, will fall back to standard implementations
  console.log('Claude Flow agents not available, using standard implementations')
}

export class AgentFactory {
  private registry: AgentRegistry
  private claudeFlowAvailable: boolean

  constructor(registry: AgentRegistry) {
    this.registry = registry
    this.claudeFlowAvailable = this.checkClaudeFlowAvailability()
  }

  async initializeAgents(mode: 'claude-flow' | 'standard' | 'hybrid' = 'hybrid'): Promise<void> {
    const defaultConfig: AgentConfig = {
      enabled: true,
      priority: 1,
      timeout: 30000,
      retryAttempts: 2,
      fallbackEnabled: true,
      workerPool: {
        minWorkers: 1,
        maxWorkers: 3,
        idleTimeout: 60000
      }
    }

    // Safety agent (highest priority)
    const safetyAgent = await this.createAgent('safety', mode)
    if (safetyAgent) {
      this.registry.register(safetyAgent, { ...defaultConfig, priority: 10 })
    }

    // Psychology agent
    const psychologyAgent = await this.createAgent('psychology', mode)
    if (psychologyAgent) {
      this.registry.register(psychologyAgent, { ...defaultConfig, priority: 8 })
    }

    // Compliance agent
    const complianceAgent = await this.createAgent('compliance', mode)
    if (complianceAgent) {
      this.registry.register(complianceAgent, { ...defaultConfig, priority: 6 })
    }

    // Technical agent
    const technicalAgent = await this.createAgent('technical', mode)
    if (technicalAgent) {
      this.registry.register(technicalAgent, { ...defaultConfig, priority: 4 })
    }
  }

  private async createAgent(
    type: AgentType, 
    mode: 'claude-flow' | 'standard' | 'hybrid'
  ): Promise<Agent | null> {
    try {
      // Try Claude Flow first if in claude-flow or hybrid mode
      if ((mode === 'claude-flow' || mode === 'hybrid') && this.claudeFlowAvailable) {
        const claudeFlowAgent = await this.createClaudeFlowAgent(type)
        if (claudeFlowAgent) {
          return claudeFlowAgent
        }
      }

      // Fall back to standard implementation
      return this.createStandardAgent(type)
    } catch (error) {
      console.error(`Failed to create ${type} agent:`, error)
      
      // If we're in hybrid mode, try the other implementation
      if (mode === 'hybrid') {
        try {
          return this.createStandardAgent(type)
        } catch (fallbackError) {
          console.error(`Fallback failed for ${type} agent:`, fallbackError)
          return null
        }
      }
      
      return null
    }
  }

  private async createClaudeFlowAgent(type: AgentType): Promise<Agent | null> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY required for Claude Flow agents')
    }

    switch (type) {
      case 'safety':
        return ClaudeFlowSafetyAgent ? new ClaudeFlowSafetyAgent(apiKey) : null
      case 'psychology':
        return ClaudeFlowPsychologyAgent ? new ClaudeFlowPsychologyAgent(apiKey) : null
      case 'compliance':
        return ClaudeFlowComplianceAgent ? new ClaudeFlowComplianceAgent(apiKey) : null
      case 'technical':
        return ClaudeFlowTechnicalAgent ? new ClaudeFlowTechnicalAgent(apiKey) : null
      default:
        return null
    }
  }

  private createStandardAgent(type: AgentType): Agent {
    switch (type) {
      case 'safety':
        return new StandardSafetyAgent()
      case 'psychology':
        return new StandardPsychologyAgent()
      case 'compliance':
        return new StandardComplianceAgent()
      case 'technical':
        return new StandardTechnicalAgent()
      default:
        throw new Error(`Unknown agent type: ${type}`)
    }
  }

  private checkClaudeFlowAvailability(): boolean {
    try {
      // Check if Claude Flow is available and functioning
      return !!(ClaudeFlowSafetyAgent && ClaudeFlowPsychologyAgent && 
               ClaudeFlowComplianceAgent && ClaudeFlowTechnicalAgent)
    } catch {
      return false
    }
  }

  isClaudeFlowAvailable(): boolean {
    return this.claudeFlowAvailable
  }

  async testAgentConnectivity(): Promise<Record<AgentType, boolean>> {
    const results: Record<AgentType, boolean> = {
      safety: false,
      psychology: false,
      compliance: false,
      technical: false
    }

    for (const type of Object.keys(results) as AgentType[]) {
      try {
        const agent = this.registry.getAgent(type)
        if (agent) {
          // Test with minimal input
          const testInput = {
            userId: 'test',
            message: 'test',
            context: 'general' as const
          }
          
          if (this.registry.validateAgentInput(type, testInput)) {
            results[type] = true
          }
        }
      } catch (error) {
        console.error(`Agent ${type} connectivity test failed:`, error)
        results[type] = false
      }
    }

    return results
  }
}