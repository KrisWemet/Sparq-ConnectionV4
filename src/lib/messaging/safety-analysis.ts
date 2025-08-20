import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database-complete.types'
import { CrisisDetector, CrisisDetectionResult } from '../crisis-detection/detector'
import { safetyPreferencesManager, SafetyPreferences } from './safety-preferences'

// Real-time safety analysis pipeline for secure messaging
export interface MessageSafetyAnalysis {
  messageId: string
  overallRiskScore: number // 0-100
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  confidenceScore: number // 0-1
  
  // Detailed risk breakdown
  toxicityScore: number
  crisisScore: number
  dvRiskScore: number
  emotionalDistressScore: number
  
  // Detection details
  detectedIndicators: Array<{
    type: string
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    confidence: number
    triggeredBy: string
  }>
  
  triggeredKeywords: string[]
  patternMatches: Array<{
    pattern: string
    category: string
    confidence: number
  }>
  
  // Context and metadata
  analysisMethod: 'automated' | 'manual_review' | 'hybrid'
  processingTimeMs: number
  modelVersion: string
  requiresIntervention: boolean
  requiresHumanReview: boolean
  
  // User context factors
  userHistoryFactor: number
  relationshipContext: Record<string, any>
  conversationContext: Record<string, any>
}

export interface SafetyAnalysisConfig {
  userId: string
  coupleId: string
  messageContent: string
  messageType: 'free_form' | 'prompt_response' | 'appreciation' | 'goal_update' | 'crisis_support'
  conversationHistory?: Array<{
    content: string
    riskScore: number
    timestamp: Date
  }>
  userPreferences: SafetyPreferences
}

// Enhanced toxicity detection patterns
const TOXICITY_PATTERNS = {
  hostile_language: {
    patterns: [
      'you always', 'you never', 'shut up', 'hate you', 'stupid', 'idiot',
      'worthless', 'useless', 'disgusting', 'pathetic', 'loser'
    ],
    multiplier: 1.2
  },
  
  aggressive_threats: {
    patterns: [
      'gonna hurt', 'make you pay', 'you\'ll regret', 'destroy you',
      'ruin your life', 'get back at you', 'make you suffer'
    ],
    multiplier: 2.0
  },
  
  dismissive_contempt: {
    patterns: [
      'don\'t care', 'whatever', 'doesn\'t matter', 'who cares',
      'roll my eyes', 'ridiculous', 'pathetic attempt', 'waste of time'
    ],
    multiplier: 1.1
  },
  
  emotional_manipulation: {
    patterns: [
      'if you loved me', 'you don\'t care about me', 'you\'re just like',
      'everyone else thinks', 'you\'re making me', 'it\'s your fault'
    ],
    multiplier: 1.3
  }
}

// DV-specific patterns (handled with extreme care)
const DV_RISK_PATTERNS = {
  control_behaviors: [
    'you can\'t', 'not allowed', 'i decide', 'permission', 'check in with me',
    'where were you', 'who were you with', 'prove it', 'don\'t believe you'
  ],
  
  isolation_tactics: [
    'your friends don\'t like', 'your family is', 'don\'t need them',
    'only need me', 'they\'re turning you against', 'choose between'
  ],
  
  financial_control: [
    'can\'t afford', 'money is mine', 'don\'t work', 'quit your job',
    'allowance', 'budget for you', 'spend too much'
  ],
  
  intimidation: [
    'know what happens', 'remember last time', 'don\'t make me',
    'you know what i\'m capable', 'better watch', 'be careful'
  ]
}

export class SafetyAnalysisPipeline {
  private supabase = createClientComponentClient<Database>()

  async analyzeMessageSafety(config: SafetyAnalysisConfig): Promise<MessageSafetyAnalysis> {
    const startTime = Date.now()
    
    // Check if user has consented to safety monitoring
    if (!this.shouldAnalyze(config.userPreferences)) {
      return this.createMinimalAnalysis(config.messageContent, startTime)
    }

    try {
      // Run parallel analysis components
      const [
        crisisAnalysis,
        toxicityAnalysis,
        dvRiskAnalysis,
        emotionalDistressAnalysis,
        contextualFactors
      ] = await Promise.all([
        this.analyzeCrisisContent(config),
        this.analyzeToxicity(config),
        this.analyzeDVRisk(config),
        this.analyzeEmotionalDistress(config),
        this.calculateContextualFactors(config)
      ])

      // Combine all analyses
      const combinedAnalysis = this.combineAnalyses({
        crisisAnalysis,
        toxicityAnalysis,
        dvRiskAnalysis,
        emotionalDistressAnalysis,
        contextualFactors,
        config,
        processingTimeMs: Date.now() - startTime
      })

      // Store the analysis results
      await this.storeAnalysisResults(config, combinedAnalysis)

      return combinedAnalysis

    } catch (error) {
      console.error('Safety analysis failed:', error)
      
      // Return conservative analysis in case of failure
      return this.createFailsafeAnalysis(config.messageContent, startTime)
    }
  }

  private shouldAnalyze(preferences: SafetyPreferences): boolean {
    // Always analyze if user has full safety or basic safety enabled
    if (preferences.consentLevel === 'full_safety' || preferences.consentLevel === 'basic_safety') {
      return true
    }
    
    // Don't analyze if user is in privacy mode
    if (preferences.consentLevel === 'privacy_mode') {
      return false
    }
    
    // Manual mode only analyzes when explicitly requested
    if (preferences.consentLevel === 'manual_mode') {
      return false
    }
    
    return preferences.safetyMonitoringEnabled
  }

  private async analyzeCrisisContent(config: SafetyAnalysisConfig): Promise<{
    crisisScore: number
    crisisDetection: CrisisDetectionResult
  }> {
    if (!config.userPreferences.crisisDetectionEnabled) {
      return {
        crisisScore: 0,
        crisisDetection: {
          hasCrisisIndicators: false,
          severity: 'none',
          indicators: [],
          recommendedActions: [],
          requiresImmediateIntervention: false,
          professionalReferralNeeded: false,
          safetyPlan: null
        }
      }
    }

    const crisisDetection = await CrisisDetector.detectCrisis(
      config.messageContent,
      config.userId,
      config.coupleId,
      {
        messageType: config.messageType,
        conversationHistory: config.conversationHistory
      }
    )

    const crisisScore = this.mapSeverityToScore(crisisDetection.severity)

    return { crisisScore, crisisDetection }
  }

  private async analyzeToxicity(config: SafetyAnalysisConfig): Promise<{
    toxicityScore: number
    detectedPatterns: Array<{ pattern: string; category: string; confidence: number }>
    triggeredKeywords: string[]
  }> {
    if (!config.userPreferences.toxicityDetectionEnabled) {
      return { toxicityScore: 0, detectedPatterns: [], triggeredKeywords: [] }
    }

    const content = config.messageContent.toLowerCase()
    let toxicityScore = 0
    const detectedPatterns: Array<{ pattern: string; category: string; confidence: number }> = []
    const triggeredKeywords: string[] = []

    // Analyze each toxicity category
    for (const [category, data] of Object.entries(TOXICITY_PATTERNS)) {
      for (const pattern of data.patterns) {
        if (content.includes(pattern.toLowerCase())) {
          const baseScore = 15 // Base toxicity score per pattern
          const adjustedScore = baseScore * data.multiplier
          toxicityScore += adjustedScore
          
          detectedPatterns.push({
            pattern,
            category,
            confidence: 0.8
          })
          
          triggeredKeywords.push(pattern)
        }
      }
    }

    // Cap toxicity score at 100
    toxicityScore = Math.min(100, toxicityScore)

    return { toxicityScore, detectedPatterns, triggeredKeywords }
  }

  private async analyzeDVRisk(config: SafetyAnalysisConfig): Promise<{
    dvRiskScore: number
    detectedPatterns: Array<{ pattern: string; category: string; confidence: number }>
  }> {
    if (!config.userPreferences.dvPatternDetectionEnabled) {
      return { dvRiskScore: 0, detectedPatterns: [] }
    }

    const content = config.messageContent.toLowerCase()
    let dvRiskScore = 0
    const detectedPatterns: Array<{ pattern: string; category: string; confidence: number }> = []

    // Analyze DV risk patterns with high sensitivity
    for (const [category, patterns] of Object.entries(DV_RISK_PATTERNS)) {
      for (const pattern of patterns) {
        if (content.includes(pattern.toLowerCase())) {
          dvRiskScore += 25 // High weight for DV indicators
          
          detectedPatterns.push({
            pattern,
            category,
            confidence: 0.75 // Conservative confidence for DV detection
          })
        }
      }
    }

    // DV risk patterns are serious - cap at 100 but weight heavily
    dvRiskScore = Math.min(100, dvRiskScore)

    return { dvRiskScore, detectedPatterns }
  }

  private async analyzeEmotionalDistress(config: SafetyAnalysisConfig): Promise<{
    emotionalDistressScore: number
    detectedIndicators: Array<{ type: string; description: string; confidence: number }>
  }> {
    if (!config.userPreferences.emotionalDistressMonitoring) {
      return { emotionalDistressScore: 0, detectedIndicators: [] }
    }

    const content = config.messageContent.toLowerCase()
    let distressScore = 0
    const detectedIndicators: Array<{ type: string; description: string; confidence: number }> = []

    // Emotional distress indicators
    const distressPatterns = [
      { pattern: 'overwhelmed', weight: 10, description: 'Expressed feeling overwhelmed' },
      { pattern: 'exhausted', weight: 8, description: 'Expressed emotional exhaustion' },
      { pattern: 'can\'t cope', weight: 15, description: 'Difficulty coping expressed' },
      { pattern: 'breaking down', weight: 20, description: 'Emotional breakdown language' },
      { pattern: 'falling apart', weight: 15, description: 'Loss of emotional control' },
      { pattern: 'nothing helps', weight: 12, description: 'Expressed hopelessness about solutions' }
    ]

    for (const { pattern, weight, description } of distressPatterns) {
      if (content.includes(pattern)) {
        distressScore += weight
        detectedIndicators.push({
          type: 'emotional_language',
          description,
          confidence: 0.7
        })
      }
    }

    // Cap emotional distress score
    distressScore = Math.min(100, distressScore)

    return { emotionalDistressScore: distressScore, detectedIndicators }
  }

  private async calculateContextualFactors(config: SafetyAnalysisConfig): Promise<{
    userHistoryFactor: number
    relationshipContext: Record<string, any>
    conversationContext: Record<string, any>
  }> {
    // Get user's recent risk history
    const { data: recentRiskScores } = await this.supabase
      .from('message_risk_scores')
      .select('overall_risk_score, created_at')
      .eq('user_id', config.userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('created_at', { ascending: false })
      .limit(10)

    // Calculate user history factor
    let userHistoryFactor = 1.0
    
    if (recentRiskScores && recentRiskScores.length > 0) {
      const avgRecentRisk = recentRiskScores.reduce((sum, score) => sum + (score.overall_risk_score || 0), 0) / recentRiskScores.length
      
      // Adjust factor based on recent risk history
      if (avgRecentRisk > 70) {
        userHistoryFactor = 1.3 // Increase sensitivity for high-risk users
      } else if (avgRecentRisk > 40) {
        userHistoryFactor = 1.1 // Slight increase for medium-risk users
      }
    }

    const conversationContext: Record<string, any> = {}
    
    if (config.conversationHistory && config.conversationHistory.length > 0) {
      const recentMessages = config.conversationHistory.slice(-5) // Last 5 messages
      conversationContext.recentRiskTrend = recentMessages.map(m => m.riskScore)
      conversationContext.escalationDetected = this.detectEscalation(recentMessages)
    }

    return {
      userHistoryFactor,
      relationshipContext: {}, // Could include relationship duration, past conflicts, etc.
      conversationContext
    }
  }

  private detectEscalation(messages: Array<{ riskScore: number; timestamp: Date }>): boolean {
    if (messages.length < 3) return false
    
    // Check if risk scores are increasing over time
    let escalatingCount = 0
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].riskScore > messages[i-1].riskScore) {
        escalatingCount++
      }
    }
    
    return escalatingCount >= 2 // At least 2 increases in a row
  }

  private combineAnalyses(data: {
    crisisAnalysis: any
    toxicityAnalysis: any
    dvRiskAnalysis: any
    emotionalDistressAnalysis: any
    contextualFactors: any
    config: SafetyAnalysisConfig
    processingTimeMs: number
  }): MessageSafetyAnalysis {
    const {
      crisisAnalysis,
      toxicityAnalysis,
      dvRiskAnalysis,
      emotionalDistressAnalysis,
      contextualFactors,
      config,
      processingTimeMs
    } = data

    // Calculate weighted overall risk score
    const crisisWeight = 0.4
    const dvWeight = 0.3
    const toxicityWeight = 0.2
    const distressWeight = 0.1

    let overallRiskScore = 
      (crisisAnalysis.crisisScore * crisisWeight) +
      (dvRiskAnalysis.dvRiskScore * dvWeight) +
      (toxicityAnalysis.toxicityScore * toxicityWeight) +
      (emotionalDistressAnalysis.emotionalDistressScore * distressWeight)

    // Apply contextual factors
    overallRiskScore *= contextualFactors.userHistoryFactor

    // Cap at 100
    overallRiskScore = Math.min(100, Math.round(overallRiskScore))

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(overallRiskScore)

    // Combine all detected indicators
    const detectedIndicators = [
      ...crisisAnalysis.crisisDetection.indicators.map((ind: any) => ({
        type: ind.type,
        description: ind.description,
        severity: ind.severity,
        confidence: ind.confidence,
        triggeredBy: ind.triggeredBy
      })),
      ...emotionalDistressAnalysis.detectedIndicators.map((ind: any) => ({
        type: ind.type,
        description: ind.description,
        severity: 'medium' as const,
        confidence: ind.confidence,
        triggeredBy: 'emotional_analysis'
      }))
    ]

    // Combine pattern matches
    const patternMatches = [
      ...toxicityAnalysis.detectedPatterns,
      ...dvRiskAnalysis.detectedPatterns
    ]

    return {
      messageId: '', // Will be set when message is created
      overallRiskScore,
      riskLevel,
      confidenceScore: this.calculateConfidence(detectedIndicators),
      toxicityScore: toxicityAnalysis.toxicityScore,
      crisisScore: crisisAnalysis.crisisScore,
      dvRiskScore: dvRiskAnalysis.dvRiskScore,
      emotionalDistressScore: emotionalDistressAnalysis.emotionalDistressScore,
      detectedIndicators,
      triggeredKeywords: toxicityAnalysis.triggeredKeywords,
      patternMatches,
      analysisMethod: 'automated',
      processingTimeMs,
      modelVersion: 'v1.0',
      requiresIntervention: riskLevel === 'high' || riskLevel === 'critical' || crisisAnalysis.crisisDetection.requiresImmediateIntervention,
      requiresHumanReview: riskLevel === 'critical' || crisisAnalysis.crisisDetection.requiresImmediateIntervention,
      userHistoryFactor: contextualFactors.userHistoryFactor,
      relationshipContext: contextualFactors.relationshipContext,
      conversationContext: contextualFactors.conversationContext
    }
  }

  private calculateRiskLevel(score: number): 'safe' | 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 90) return 'critical'
    if (score >= 70) return 'high'
    if (score >= 40) return 'medium'
    if (score >= 15) return 'low'
    return 'safe'
  }

  private calculateConfidence(indicators: any[]): number {
    if (indicators.length === 0) return 1.0
    
    const avgConfidence = indicators.reduce((sum, ind) => sum + ind.confidence, 0) / indicators.length
    return Math.round(avgConfidence * 100) / 100
  }

  private mapSeverityToScore(severity: string): number {
    switch (severity) {
      case 'critical': return 95
      case 'high': return 75
      case 'medium': return 45
      case 'low': return 20
      case 'none': return 0
      default: return 0
    }
  }

  private createMinimalAnalysis(content: string, startTime: number): MessageSafetyAnalysis {
    return {
      messageId: '',
      overallRiskScore: 0,
      riskLevel: 'safe',
      confidenceScore: 1.0,
      toxicityScore: 0,
      crisisScore: 0,
      dvRiskScore: 0,
      emotionalDistressScore: 0,
      detectedIndicators: [],
      triggeredKeywords: [],
      patternMatches: [],
      analysisMethod: 'automated',
      processingTimeMs: Date.now() - startTime,
      modelVersion: 'v1.0-minimal',
      requiresIntervention: false,
      requiresHumanReview: false,
      userHistoryFactor: 1.0,
      relationshipContext: {},
      conversationContext: {}
    }
  }

  private createFailsafeAnalysis(content: string, startTime: number): MessageSafetyAnalysis {
    // Conservative analysis when main analysis fails
    const hasObviousCrisisWords = /\b(suicide|kill myself|want to die|end it all)\b/i.test(content)
    const hasObviousDVWords = /\b(hits me|threatens me|afraid of|controls everything)\b/i.test(content)
    
    const riskScore = hasObviousCrisisWords ? 95 : hasObviousDVWords ? 80 : 0
    const riskLevel = hasObviousCrisisWords ? 'critical' : hasObviousDVWords ? 'high' : 'safe'

    return {
      messageId: '',
      overallRiskScore: riskScore,
      riskLevel,
      confidenceScore: 0.6, // Lower confidence for failsafe
      toxicityScore: 0,
      crisisScore: hasObviousCrisisWords ? 95 : 0,
      dvRiskScore: hasObviousDVWords ? 80 : 0,
      emotionalDistressScore: 0,
      detectedIndicators: [],
      triggeredKeywords: [],
      patternMatches: [],
      analysisMethod: 'automated',
      processingTimeMs: Date.now() - startTime,
      modelVersion: 'v1.0-failsafe',
      requiresIntervention: riskScore > 50,
      requiresHumanReview: riskScore > 80,
      userHistoryFactor: 1.0,
      relationshipContext: {},
      conversationContext: {}
    }
  }

  private async storeAnalysisResults(config: SafetyAnalysisConfig, analysis: MessageSafetyAnalysis): Promise<void> {
    try {
      await this.supabase
        .from('message_risk_scores')
        .insert({
          user_id: config.userId,
          couple_id: config.coupleId,
          overall_risk_score: analysis.overallRiskScore,
          risk_level: analysis.riskLevel,
          confidence_score: analysis.confidenceScore,
          toxicity_score: analysis.toxicityScore,
          crisis_score: analysis.crisisScore,
          dv_risk_score: analysis.dvRiskScore,
          emotional_distress_score: analysis.emotionalDistressScore,
          detected_indicators: analysis.detectedIndicators,
          triggered_keywords: analysis.triggeredKeywords,
          pattern_matches: analysis.patternMatches,
          analysis_model_version: analysis.modelVersion,
          processing_time_ms: analysis.processingTimeMs,
          analysis_method: analysis.analysisMethod,
          conversation_context: analysis.conversationContext,
          user_history_factor: analysis.userHistoryFactor,
          relationship_context: analysis.relationshipContext
        })
    } catch (error) {
      console.error('Failed to store safety analysis results:', error)
      // Don't throw - analysis should succeed even if storage fails
    }
  }

  // Method for manual safety check (when user requests analysis)
  async performManualSafetyCheck(userId: string, messageContent: string): Promise<MessageSafetyAnalysis> {
    const userPreferences = await safetyPreferencesManager.getUserSafetyPreferences(userId)
    
    if (!userPreferences) {
      throw new Error('User preferences not found')
    }

    // Get couple information
    const { data: coupleData } = await this.supabase
      .from('couples')
      .select('id')
      .or(`partner_1_id.eq.${userId},partner_2_id.eq.${userId}`)
      .eq('is_active', true)
      .single()

    const config: SafetyAnalysisConfig = {
      userId,
      coupleId: coupleData?.id || '',
      messageContent,
      messageType: 'free_form',
      userPreferences: {
        ...userPreferences,
        // Override to enable all checks for manual analysis
        safetyMonitoringEnabled: true,
        toxicityDetectionEnabled: true,
        crisisDetectionEnabled: true,
        dvPatternDetectionEnabled: true,
        emotionalDistressMonitoring: true
      }
    }

    return await this.analyzeMessageSafety(config)
  }
}

// Export singleton instance
export const safetyAnalysisPipeline = new SafetyAnalysisPipeline()

// Export types for other modules
export type { MessageSafetyAnalysis, SafetyAnalysisConfig }