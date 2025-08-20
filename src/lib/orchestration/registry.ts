import { Agent, AgentType, AgentConfig } from './types'

export class AgentRegistry {
  private agents = new Map<AgentType, Agent>()
  private configs = new Map<AgentType, AgentConfig>()
  
  register(agent: Agent, config: AgentConfig): void {
    this.agents.set(agent.type, agent)
    this.configs.set(agent.type, config)
  }

  unregister(type: AgentType): void {
    this.agents.delete(type)
    this.configs.delete(type)
  }

  getAgent(type: AgentType): Agent | undefined {
    return this.agents.get(type)
  }

  getConfig(type: AgentType): AgentConfig | undefined {
    return this.configs.get(type)
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values())
  }

  getEnabledAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(agent => {
      const config = this.configs.get(agent.type)
      return config?.enabled ?? true
    })
  }

  getAgentsByPriority(): Agent[] {
    return this.getEnabledAgents().sort((a, b) => {
      const configA = this.configs.get(a.type)
      const configB = this.configs.get(b.type)
      return (configB?.priority ?? 0) - (configA?.priority ?? 0)
    })
  }

  updateConfig(type: AgentType, config: Partial<AgentConfig>): void {
    const currentConfig = this.configs.get(type)
    if (currentConfig) {
      this.configs.set(type, { ...currentConfig, ...config })
    }
  }

  isAgentAvailable(type: AgentType): boolean {
    const agent = this.agents.get(type)
    const config = this.configs.get(type)
    return agent !== undefined && (config?.enabled ?? true)
  }

  getAgentCapabilities(type: AgentType): string[] {
    const agent = this.agents.get(type)
    return agent?.capabilities ?? []
  }

  validateAgentInput(type: AgentType, input: any): boolean {
    const agent = this.agents.get(type)
    if (!agent || !agent.validate) {
      return true // No validation function means we accept input
    }
    return agent.validate(input)
  }
}