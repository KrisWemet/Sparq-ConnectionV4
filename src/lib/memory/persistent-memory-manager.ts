import fs from 'fs/promises'
import path from 'path'

export interface MemoryEntry {
  id: string
  namespace: string
  data: any
  timestamp: number
  ttl?: number
  metadata?: Record<string, any>
}

export interface MemoryQuery {
  namespace?: string
  pattern?: string
  limit?: number
  before?: number
  after?: number
}

export class PersistentMemoryManager {
  private memoryStore: Map<string, MemoryEntry> = new Map()
  private namespaceIndexes: Map<string, Set<string>> = new Map()
  private basePath: string
  private autoSaveInterval: NodeJS.Timeout | null = null

  constructor(basePath: string = '/Users/chrisouimet/Sparq-ConnectionV4/memory') {
    this.basePath = basePath
    this.initializeMemory()
    this.startAutoSave()
  }

  async initializeMemory(): Promise<void> {
    try {
      // Load relationship psychology principles
      await this.loadJSONMemory(
        'relationship-psychology-principles',
        'relationship-psychology-principles.json'
      )

      // Load crisis detection protocols
      await this.loadJSONMemory(
        'crisis-detection-protocols',
        'crisis-detection-protocols.json'
      )

      // Load claude flow data
      await this.loadJSONMemory(
        'claude-flow-data',
        'claude-flow-data.json'
      )

      // Load agent-specific memory if it exists
      await this.loadAgentMemories()

      console.log(`Persistent memory initialized with ${this.memoryStore.size} entries`)
    } catch (error) {
      console.error('Failed to initialize persistent memory:', error)
    }
  }

  private async loadJSONMemory(namespace: string, filename: string): Promise<void> {
    try {
      const filePath = path.join(this.basePath, filename)
      const data = await fs.readFile(filePath, 'utf-8')
      const parsedData = JSON.parse(data)

      const memoryId = `${namespace}-main`
      this.store(memoryId, namespace, parsedData, { source: 'json-file', filename })

      console.log(`Loaded ${namespace} from ${filename}`)
    } catch (error) {
      console.warn(`Could not load ${namespace} from ${filename}:`, error.message)
    }
  }

  private async loadAgentMemories(): Promise<void> {
    try {
      const agentsPath = path.join(this.basePath, 'agents')
      const agentDirs = await fs.readdir(agentsPath, { withFileTypes: true })

      for (const dirent of agentDirs) {
        if (dirent.isDirectory()) {
          await this.loadAgentMemory(dirent.name)
        }
      }
    } catch (error) {
      console.warn('Could not load agent memories:', error.message)
    }
  }

  private async loadAgentMemory(agentId: string): Promise<void> {
    try {
      const agentPath = path.join(this.basePath, 'agents', agentId)
      
      // Load agent state
      const statePath = path.join(agentPath, 'state.json')
      try {
        const stateData = await fs.readFile(statePath, 'utf-8')
        const state = JSON.parse(stateData)
        this.store(`agent-${agentId}-state`, `agents/${agentId}`, state, { type: 'state' })
      } catch (error) {
        // State file doesn't exist, which is okay
      }

      // Load agent knowledge
      const knowledgePath = path.join(agentPath, 'knowledge.md')
      try {
        const knowledgeData = await fs.readFile(knowledgePath, 'utf-8')
        this.store(`agent-${agentId}-knowledge`, `agents/${agentId}`, { knowledge: knowledgeData }, { type: 'knowledge' })
      } catch (error) {
        // Knowledge file doesn't exist, which is okay
      }

      // Load agent tasks
      const tasksPath = path.join(agentPath, 'tasks.json')
      try {
        const tasksData = await fs.readFile(tasksPath, 'utf-8')
        const tasks = JSON.parse(tasksData)
        this.store(`agent-${agentId}-tasks`, `agents/${agentId}`, tasks, { type: 'tasks' })
      } catch (error) {
        // Tasks file doesn't exist, which is okay
      }

      console.log(`Loaded memory for agent ${agentId}`)
    } catch (error) {
      console.warn(`Could not load memory for agent ${agentId}:`, error.message)
    }
  }

  store(id: string, namespace: string, data: any, metadata?: Record<string, any>): void {
    const entry: MemoryEntry = {
      id,
      namespace,
      data,
      timestamp: Date.now(),
      metadata
    }

    this.memoryStore.set(id, entry)

    // Update namespace index
    if (!this.namespaceIndexes.has(namespace)) {
      this.namespaceIndexes.set(namespace, new Set())
    }
    this.namespaceIndexes.get(namespace)!.add(id)
  }

  retrieve(id: string): any | null {
    const entry = this.memoryStore.get(id)
    if (!entry) return null

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.delete(id)
      return null
    }

    return entry.data
  }

  search(query: MemoryQuery): MemoryEntry[] {
    const results: MemoryEntry[] = []

    for (const [id, entry] of this.memoryStore) {
      // Check TTL first
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        this.delete(id)
        continue
      }

      // Namespace filter
      if (query.namespace && entry.namespace !== query.namespace) {
        continue
      }

      // Pattern filter (simple string matching)
      if (query.pattern) {
        const searchText = JSON.stringify(entry.data).toLowerCase()
        if (!searchText.includes(query.pattern.toLowerCase())) {
          continue
        }
      }

      // Time filters
      if (query.before && entry.timestamp >= query.before) {
        continue
      }
      if (query.after && entry.timestamp <= query.after) {
        continue
      }

      results.push(entry)
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp)

    // Apply limit
    if (query.limit) {
      return results.slice(0, query.limit)
    }

    return results
  }

  delete(id: string): boolean {
    const entry = this.memoryStore.get(id)
    if (!entry) return false

    this.memoryStore.delete(id)

    // Update namespace index
    const namespaceSet = this.namespaceIndexes.get(entry.namespace)
    if (namespaceSet) {
      namespaceSet.delete(id)
      if (namespaceSet.size === 0) {
        this.namespaceIndexes.delete(entry.namespace)
      }
    }

    return true
  }

  getNamespaces(): string[] {
    return Array.from(this.namespaceIndexes.keys())
  }

  getNamespaceEntries(namespace: string): MemoryEntry[] {
    const entryIds = this.namespaceIndexes.get(namespace)
    if (!entryIds) return []

    return Array.from(entryIds)
      .map(id => this.memoryStore.get(id))
      .filter(entry => entry !== undefined) as MemoryEntry[]
  }

  // Specialized methods for agent access
  getRelationshipPsychologyPrinciples(): any | null {
    return this.retrieve('relationship-psychology-principles-main')
  }

  getCrisisDetectionProtocols(): any | null {
    return this.retrieve('crisis-detection-protocols-main')
  }

  getClaudeFlowData(): any | null {
    return this.retrieve('claude-flow-data-main')
  }

  // Agent memory methods
  getAgentState(agentId: string): any | null {
    return this.retrieve(`agent-${agentId}-state`)
  }

  setAgentState(agentId: string, state: any): void {
    this.store(`agent-${agentId}-state`, `agents/${agentId}`, state, { type: 'state' })
  }

  getAgentKnowledge(agentId: string): any | null {
    return this.retrieve(`agent-${agentId}-knowledge`)
  }

  setAgentKnowledge(agentId: string, knowledge: any): void {
    this.store(`agent-${agentId}-knowledge`, `agents/${agentId}`, knowledge, { type: 'knowledge' })
  }

  getAgentTasks(agentId: string): any | null {
    return this.retrieve(`agent-${agentId}-tasks`)
  }

  setAgentTasks(agentId: string, tasks: any): void {
    this.store(`agent-${agentId}-tasks`, `agents/${agentId}`, tasks, { type: 'tasks' })
  }

  // Store agent interaction results
  storeAgentInteraction(agentType: string, userId: string, input: any, output: any): void {
    const interactionId = `interaction-${agentType}-${userId}-${Date.now()}`
    this.store(interactionId, `interactions/${agentType}`, {
      userId,
      input,
      output,
      timestamp: Date.now()
    }, { type: 'interaction', agentType })
  }

  // Get user's interaction history with specific agent
  getUserAgentHistory(agentType: string, userId: string, limit: number = 10): any[] {
    const interactions = this.search({
      namespace: `interactions/${agentType}`,
      limit: limit * 2 // Get more to filter
    })

    return interactions
      .filter(entry => entry.data.userId === userId)
      .slice(0, limit)
      .map(entry => entry.data)
  }

  // Store cross-agent coordination results
  storeCoordinationResult(coordinationId: string, result: any): void {
    this.store(coordinationId, 'coordination', result, { type: 'coordination' })
  }

  // Get recent coordination patterns
  getCoordinationPatterns(limit: number = 20): any[] {
    const results = this.search({
      namespace: 'coordination',
      limit
    })

    return results.map(entry => entry.data)
  }

  // Store learning outcomes for agents
  storeLearningOutcome(agentType: string, outcome: any): void {
    const learningId = `learning-${agentType}-${Date.now()}`
    this.store(learningId, `learning/${agentType}`, outcome, { type: 'learning' })
  }

  // Get learning history for agent improvement
  getLearningHistory(agentType: string, limit: number = 50): any[] {
    const results = this.search({
      namespace: `learning/${agentType}`,
      limit
    })

    return results.map(entry => entry.data)
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [id, entry] of this.memoryStore) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        toDelete.push(id)
      }
    }

    toDelete.forEach(id => this.delete(id))

    if (toDelete.length > 0) {
      console.log(`Cleaned up ${toDelete.length} expired memory entries`)
    }
  }

  // Auto-save functionality
  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(async () => {
      await this.saveAgentStates()
      this.cleanup()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  private async saveAgentStates(): Promise<void> {
    try {
      for (const [namespace, entryIds] of this.namespaceIndexes) {
        if (namespace.startsWith('agents/')) {
          const agentId = namespace.split('/')[1]
          await this.saveAgentMemory(agentId)
        }
      }
    } catch (error) {
      console.error('Failed to auto-save agent states:', error)
    }
  }

  private async saveAgentMemory(agentId: string): Promise<void> {
    try {
      const agentPath = path.join(this.basePath, 'agents', agentId)
      
      // Ensure agent directory exists
      await fs.mkdir(agentPath, { recursive: true })

      // Save agent state
      const state = this.getAgentState(agentId)
      if (state) {
        const statePath = path.join(agentPath, 'state.json')
        await fs.writeFile(statePath, JSON.stringify(state, null, 2))
      }

      // Save agent tasks
      const tasks = this.getAgentTasks(agentId)
      if (tasks) {
        const tasksPath = path.join(agentPath, 'tasks.json')
        await fs.writeFile(tasksPath, JSON.stringify(tasks, null, 2))
      }

      // Save agent knowledge as markdown
      const knowledge = this.getAgentKnowledge(agentId)
      if (knowledge?.knowledge) {
        const knowledgePath = path.join(agentPath, 'knowledge.md')
        await fs.writeFile(knowledgePath, knowledge.knowledge)
      }
    } catch (error) {
      console.warn(`Failed to save memory for agent ${agentId}:`, error)
    }
  }

  // Session management
  async saveSession(sessionId: string): Promise<void> {
    try {
      const sessionPath = path.join(this.basePath, 'sessions', `${sessionId}.json`)
      await fs.mkdir(path.dirname(sessionPath), { recursive: true })

      const sessionData = {
        sessionId,
        timestamp: Date.now(),
        memoryEntries: Array.from(this.memoryStore.entries())
          .filter(([id]) => id.includes(sessionId))
          .map(([id, entry]) => ({ id, ...entry }))
      }

      await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2))
      console.log(`Session ${sessionId} saved`)
    } catch (error) {
      console.error(`Failed to save session ${sessionId}:`, error)
    }
  }

  async loadSession(sessionId: string): Promise<boolean> {
    try {
      const sessionPath = path.join(this.basePath, 'sessions', `${sessionId}.json`)
      const data = await fs.readFile(sessionPath, 'utf-8')
      const sessionData = JSON.parse(data)

      // Restore session memory entries
      sessionData.memoryEntries.forEach((entryData: any) => {
        const { id, ...entry } = entryData
        this.memoryStore.set(id, entry)
        
        // Update namespace index
        if (!this.namespaceIndexes.has(entry.namespace)) {
          this.namespaceIndexes.set(entry.namespace, new Set())
        }
        this.namespaceIndexes.get(entry.namespace)!.add(id)
      })

      console.log(`Session ${sessionId} loaded with ${sessionData.memoryEntries.length} entries`)
      return true
    } catch (error) {
      console.warn(`Failed to load session ${sessionId}:`, error)
      return false
    }
  }

  // Statistics and monitoring
  getMemoryStats(): any {
    const stats = {
      totalEntries: this.memoryStore.size,
      namespaces: this.namespaceIndexes.size,
      namespaceBreakdown: {} as Record<string, number>,
      memoryUsage: process.memoryUsage(),
      oldestEntry: 0,
      newestEntry: 0
    }

    // Calculate namespace breakdown
    for (const [namespace, entryIds] of this.namespaceIndexes) {
      stats.namespaceBreakdown[namespace] = entryIds.size
    }

    // Find oldest and newest entries
    if (this.memoryStore.size > 0) {
      const timestamps = Array.from(this.memoryStore.values()).map(entry => entry.timestamp)
      stats.oldestEntry = Math.min(...timestamps)
      stats.newestEntry = Math.max(...timestamps)
    }

    return stats
  }

  // Shutdown cleanup
  async shutdown(): Promise<void> {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
    }

    await this.saveAgentStates()
    console.log('Persistent memory manager shut down')
  }
}

// Global instance
let globalMemoryManager: PersistentMemoryManager | null = null

export function getGlobalMemoryManager(): PersistentMemoryManager {
  if (!globalMemoryManager) {
    globalMemoryManager = new PersistentMemoryManager()
  }
  return globalMemoryManager
}

export default PersistentMemoryManager