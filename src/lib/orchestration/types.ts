// Core types for the orchestration system

export interface AgentInput {
  userId: string
  coupleId?: string
  message: string
  context: 'assessment' | 'guidance' | 'crisis' | 'general'
  userHistory?: any[]
  metadata?: Record<string, any>
}

export interface AgentOutput {
  agentType: AgentType
  result: any
  confidence: number
  requiresReview: boolean
  processingTime: number
  errors?: string[]
  retryCount?: number
  processingId?: string
}

export interface SafetyResult {
  safetyLevel: 'safe' | 'caution' | 'concern' | 'crisis' | 'critical'
  crisisIndicators: CrisisIndicator[]
  requiresImmediateIntervention: boolean
  requiresReview: boolean
  reasoning: string
  confidence: number
  retryCount?: number
  recommendedActions?: string[]
  safetyPlan?: Record<string, any>
}

export interface CrisisIndicator {
  type: 'keyword' | 'pattern' | 'behavioral' | 'assessment_score'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  confidence: number
  triggeredBy: string
}

export interface PsychologyValidation {
  isValid: boolean
  framework: 'gottman' | 'eft' | 'attachment' | 'communication' | 'general'
  evidenceBase: string[]
  recommendations: string[]
  culturalSensitivity: string
  ethicsCompliance: string
  confidence: number
}

export interface ComplianceCheck {
  compliant: boolean
  regulations: ('GDPR' | 'PIPEDA' | 'privacy' | 'educational')[]
  issues: string[]
  recommendations: string[]
  riskLevel: 'low' | 'medium' | 'high'
  auditTrail: string
}

export interface TechnicalValidation {
  performanceImpact: 'low' | 'medium' | 'high'
  securityConsiderations: string[]
  scalabilityAssessment: string
  architecturalRecommendations: string[]
  resourceRequirements: Record<string, any>
}

export type AgentType = 'safety' | 'psychology' | 'compliance' | 'technical'

export interface Agent {
  type: AgentType
  name: string
  description: string
  capabilities: string[]
  process(input: AgentInput): Promise<AgentOutput>
  validate?(input: AgentInput): boolean
  priority: number
}

export interface OrchestrationResult {
  finalResponse: any
  agentResults: Record<AgentType, AgentOutput>
  safetyLevel: SafetyResult['safetyLevel']
  requiresHumanReview: boolean
  processingTime: number
  coordination: {
    safetyFirst: SafetyResult
    psychologyValidation?: PsychologyValidation
    complianceCheck?: ComplianceCheck
    technicalValidation?: TechnicalValidation
  }
  systemInfo?: {
    processingId?: string
    agentsUsed?: AgentType[]
    performanceGrade?: string
    retryCount?: number
    error?: string
    engine?: string
    wasFallback?: boolean
    claudeFlowAvailable?: boolean
    timestamp?: string
  }
}

export interface AgentConfig {
  enabled: boolean
  priority: number
  timeout: number
  retryAttempts: number
  fallbackEnabled: boolean
  workerPool?: {
    minWorkers: number
    maxWorkers: number
    idleTimeout: number
  }
}

export interface OrchestrationConfig {
  mode: 'claude-flow' | 'standard' | 'hybrid'
  agents: Record<AgentType, AgentConfig>
  parallel: boolean
  safetyFirst: boolean
  timeout: number
  fallbackOnError: boolean
}

export interface WorkerTask {
  id: string
  agentType: AgentType
  input: AgentInput
  priority: number
  created: Date
  timeout?: number
}

export interface WorkerResult {
  taskId: string
  agentType: AgentType
  output: AgentOutput
  duration: number
  error?: Error
}