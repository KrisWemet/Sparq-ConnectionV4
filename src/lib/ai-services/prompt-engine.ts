import Anthropic from '@anthropic-ai/sdk'
import { CrisisDetector, CrisisDetectionResult } from '../crisis-detection/detector'
import { BudgetTracker } from './budget-tracker'
import { CacheManager } from './cache-manager'
import { TemplateEngine } from '../relationship-tools/template-engine'

// Cost estimates per 1K tokens (approximate)
const MODEL_COSTS = {
  'claude-3-haiku-20240307': 0.00025, // Ultra-cheap for simple prompts
  'claude-3-sonnet-20240229': 0.003,  // Current model for complex prompts
  'claude-3-5-sonnet-20241022': 0.003 // Latest model for complex prompts
} as const

type ModelName = keyof typeof MODEL_COSTS

interface PromptGenerationConfig {
  userId: string
  coupleId?: string
  promptCategory: 'communication' | 'intimacy' | 'goals' | 'appreciation' | 'conflict_resolution' | 'fun' | 'deep_connection' | 'growth'
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  relationshipStage: 'new' | 'established' | 'long_term'
  userArchetype?: {
    communicationStyle?: string
    loveLangague?: string
    attachmentStyle?: string
  }
  emergencyBudget?: boolean // Allow override for crisis situations
}

interface PromptGenerationResult {
  promptText: string
  promptCategory: string
  difficultyLevel: string
  disclaimerText: string
  safetyCheck: CrisisDetectionResult
  costInfo: {
    modelUsed: ModelName
    tokensUsed: number
    costUSD: number
    budgetRemaining: number
  }
  cacheInfo: {
    cacheHit: boolean
    cacheKey: string
    ttl: number
  }
  metadata: {
    generatedAt: string
    personalizationLevel: 'template' | 'personalized' | 'ai_generated'
    templateId?: string
    A_B_testVariant?: string
  }
}

export class AIPromptEngine {
  private anthropic: Anthropic
  private budgetTracker: BudgetTracker
  private cacheManager: CacheManager
  private templateEngine: TemplateEngine

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required')
    }
    
    this.anthropic = new Anthropic({ apiKey })
    this.budgetTracker = new BudgetTracker()
    this.cacheManager = new CacheManager()
    this.templateEngine = new TemplateEngine()
  }

  async generateDailyPrompt(config: PromptGenerationConfig): Promise<PromptGenerationResult> {
    const startTime = Date.now()
    
    // Step 1: Check budget constraints (unless emergency override)
    if (!config.emergencyBudget) {
      const budgetCheck = await this.budgetTracker.checkBudget(config.userId)
      if (!budgetCheck.hasAvailableBudget) {
        // Fallback to cached template-based content
        return await this.generateFromTemplate(config, budgetCheck)
      }
    }

    // Step 2: Try cache first for personalized content
    const cacheKey = this.generateCacheKey(config)
    const cachedResult = await this.cacheManager.get(cacheKey)
    if (cachedResult) {
      return this.addCacheMetadata(cachedResult, true, cacheKey)
    }

    // Step 3: Select appropriate model based on complexity and budget
    const modelChoice = await this.selectOptimalModel(config)
    
    // Step 4: Generate content using AI with safety-first approach
    try {
      const aiResult = await this.generateWithAI(config, modelChoice)
      
      // Step 5: Safety check ALL AI content
      const safetyCheck = await CrisisDetector.detectCrisis(
        aiResult.promptText,
        config.userId,
        config.coupleId,
        { context: 'daily_prompt_generation' }
      )

      // Step 6: Handle safety concerns
      if (safetyCheck.requiresImmediateIntervention) {
        // Log crisis event and return safety-focused response
        await this.handleCrisisInGeneration(config, safetyCheck)
        return await this.generateCrisisResponse(config, safetyCheck)
      }

      // Step 7: Add mandatory wellness disclaimers
      const resultWithDisclaimer = this.addWellnessDisclaimers(aiResult)

      // Step 8: Cache the result for future use
      await this.cacheManager.set(cacheKey, resultWithDisclaimer, 3600) // 1 hour TTL

      // Step 9: Track costs and update budget
      await this.budgetTracker.recordUsage(config.userId, {
        modelUsed: modelChoice,
        tokensUsed: aiResult.costInfo.tokensUsed,
        costUSD: aiResult.costInfo.costUSD,
        operation: 'daily_prompt_generation'
      })

      return {
        ...resultWithDisclaimer,
        safetyCheck,
        cacheInfo: {
          cacheHit: false,
          cacheKey,
          ttl: 3600
        },
        metadata: {
          ...resultWithDisclaimer.metadata,
          generatedAt: new Date().toISOString(),
          personalizationLevel: 'ai_generated'
        }
      }

    } catch (error) {
      console.error('AI generation failed:', error)
      
      // Fallback to template-based generation
      const budgetInfo = await this.budgetTracker.checkBudget(config.userId)
      return await this.generateFromTemplate(config, budgetInfo)
    }
  }

  private async selectOptimalModel(config: PromptGenerationConfig): Promise<ModelName> {
    // Start with budget-conscious model selection
    const budgetInfo = await this.budgetTracker.checkBudget(config.userId)
    
    // For basic prompts or users near budget limit, use Haiku
    if (config.difficultyLevel === 'beginner' || budgetInfo.percentUsed > 80) {
      return 'claude-3-haiku-20240307'
    }

    // For intermediate prompts with good budget, use Sonnet
    if (config.difficultyLevel === 'intermediate' && budgetInfo.percentUsed < 60) {
      return 'claude-3-sonnet-20240229'
    }

    // For advanced prompts with available budget, use latest Sonnet
    if (config.difficultyLevel === 'advanced' && budgetInfo.percentUsed < 40) {
      return 'claude-3-5-sonnet-20241022'
    }

    // Default fallback to Haiku for cost control
    return 'claude-3-haiku-20240307'
  }

  private async generateWithAI(config: PromptGenerationConfig, model: ModelName): Promise<Partial<PromptGenerationResult>> {
    // Create personalized prompt based on Gottman Method principles
    const systemPrompt = this.createSystemPrompt(config)
    const userPrompt = this.createPersonalizedPrompt(config)

    const startTime = Date.now()
    
    const response = await this.anthropic.messages.create({
      model,
      max_tokens: config.difficultyLevel === 'beginner' ? 150 : 
                  config.difficultyLevel === 'intermediate' ? 250 : 350,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt
    })

    const processingTime = Date.now() - startTime
    const promptText = response.content[0].type === 'text' ? response.content[0].text : ''
    
    // Estimate token usage (rough approximation)
    const estimatedTokens = Math.ceil((userPrompt.length + promptText.length) / 4)
    const estimatedCost = (estimatedTokens / 1000) * MODEL_COSTS[model]

    return {
      promptText: promptText.trim(),
      promptCategory: config.promptCategory,
      difficultyLevel: config.difficultyLevel,
      costInfo: {
        modelUsed: model,
        tokensUsed: estimatedTokens,
        costUSD: estimatedCost,
        budgetRemaining: 0 // Will be updated later
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        personalizationLevel: 'ai_generated'
      }
    }
  }

  private createSystemPrompt(config: PromptGenerationConfig): string {
    return `You are a wellness-focused relationship content generator based on the Gottman Method and evidence-based relationship science.

CRITICAL SAFETY REQUIREMENTS:
- You are providing educational wellness content, NOT therapy or medical advice
- All content must include clear disclaimers about professional support
- Never provide advice for crisis situations - refer to professionals
- Focus on evidence-based relationship education and skill-building

CONTENT GUIDELINES:
- Base all suggestions on research from Gottman Institute, EFT, and attachment theory
- Use positive, growth-oriented language
- Encourage communication and emotional connection
- Respect diverse relationship styles and cultural backgrounds
- Keep content appropriate for ${config.difficultyLevel} level users

PERSONALIZATION CONTEXT:
- Relationship stage: ${config.relationshipStage}
- Category focus: ${config.promptCategory}
- User archetype: ${JSON.stringify(config.userArchetype || {})}

Generate a thoughtful, evidence-based daily prompt that helps couples strengthen their relationship while clearly maintaining educational boundaries.`
  }

  private createPersonalizedPrompt(config: PromptGenerationConfig): string {
    const categoryPrompts = {
      communication: "Create a communication exercise that helps couples practice active listening and expressing needs constructively.",
      intimacy: "Suggest an intimacy-building activity that focuses on emotional connection and vulnerability sharing.",
      goals: "Generate a goal-setting prompt that helps couples align their future aspirations and support each other's growth.",
      appreciation: "Create an appreciation exercise that helps couples notice and express gratitude for each other.",
      conflict_resolution: "Suggest a constructive conflict resolution practice based on Gottman's research on successful couples.",
      fun: "Generate a fun, playful activity that helps couples maintain joy and lightness in their relationship.",
      deep_connection: "Create a deep conversation starter that helps couples explore their values, dreams, and emotional worlds.",
      growth: "Suggest a personal/relationship growth activity that encourages learning and development together."
    }

    const difficultyModifiers = {
      beginner: "Keep it simple, accessible, and non-threatening. Focus on easy, concrete actions.",
      intermediate: "Include some emotional depth while maintaining approachability. Encourage moderate vulnerability.",
      advanced: "Include deeper emotional exploration and more challenging relationship concepts."
    }

    return `${categoryPrompts[config.promptCategory]}

${difficultyModifiers[config.difficultyLevel]}

Format as a clear, actionable prompt (2-3 sentences) that couples can easily implement today.

Include:
1. A specific action or conversation starter
2. Brief guidance on how to approach it
3. What positive outcome to expect

Remember: This is wellness education, not therapy. Include appropriate disclaimers.`
  }

  private async generateFromTemplate(config: PromptGenerationConfig, budgetInfo: any): Promise<PromptGenerationResult> {
    // Fallback to template-based generation when budget is exhausted
    const template = await this.templateEngine.getTemplate(config.promptCategory, config.difficultyLevel)
    const personalizedPrompt = await this.templateEngine.personalizeTemplate(template, {
      userId: config.userId,
      relationshipStage: config.relationshipStage,
      userArchetype: config.userArchetype
    })

    // Even template content needs safety checking
    const safetyCheck = await CrisisDetector.detectCrisis(
      personalizedPrompt.content,
      config.userId,
      config.coupleId,
      { context: 'template_generation' }
    )

    return {
      promptText: personalizedPrompt.content,
      promptCategory: config.promptCategory,
      difficultyLevel: config.difficultyLevel,
      disclaimerText: this.getStandardDisclaimer(),
      safetyCheck,
      costInfo: {
        modelUsed: 'claude-3-haiku-20240307', // Placeholder for template usage
        tokensUsed: 0,
        costUSD: 0,
        budgetRemaining: budgetInfo.remainingBudget
      },
      cacheInfo: {
        cacheHit: false,
        cacheKey: personalizedPrompt.templateId,
        ttl: 86400 // Templates cached for 24 hours
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        personalizationLevel: 'template',
        templateId: template.id
      }
    }
  }

  private generateCacheKey(config: PromptGenerationConfig): string {
    const keyParts = [
      'daily_prompt',
      config.promptCategory,
      config.difficultyLevel,
      config.relationshipStage,
      JSON.stringify(config.userArchetype || {}),
    ]
    return keyParts.join(':')
  }

  private addWellnessDisclaimers(result: Partial<PromptGenerationResult>): Partial<PromptGenerationResult> {
    const disclaimer = this.getStandardDisclaimer()
    
    return {
      ...result,
      disclaimerText: disclaimer,
      promptText: `${result.promptText}\n\n${disclaimer}`
    }
  }

  private getStandardDisclaimer(): string {
    return `💡 This is an AI-generated wellness suggestion for educational purposes only, not professional advice. If you're experiencing relationship distress, consider speaking with a licensed couples therapist. In crisis situations, contact 988 (Suicide & Crisis Lifeline) or your local emergency services.`
  }

  private async handleCrisisInGeneration(config: PromptGenerationConfig, safetyCheck: CrisisDetectionResult): Promise<void> {
    // Log the crisis event for professional review
    console.error('Crisis indicators detected in AI prompt generation:', {
      userId: config.userId,
      coupleId: config.coupleId,
      indicators: safetyCheck.indicators,
      severity: safetyCheck.severity
    })

    // This would trigger professional notification in production
    // await notifyProfessionalTeam(config.userId, safetyCheck)
  }

  private async generateCrisisResponse(config: PromptGenerationConfig, safetyCheck: CrisisDetectionResult): Promise<PromptGenerationResult> {
    // Return a safety-focused response with immediate resources
    return {
      promptText: "We want to ensure your safety and wellbeing. Please consider reaching out to a mental health professional or crisis support service.",
      promptCategory: 'safety',
      difficultyLevel: 'beginner',
      disclaimerText: "This platform provides wellness education, not crisis intervention. Please contact professionals for immediate support.",
      safetyCheck,
      costInfo: {
        modelUsed: 'claude-3-haiku-20240307',
        tokensUsed: 0,
        costUSD: 0,
        budgetRemaining: 0
      },
      cacheInfo: {
        cacheHit: false,
        cacheKey: 'crisis_response',
        ttl: 0
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        personalizationLevel: 'template'
      }
    }
  }

  private addCacheMetadata(cachedResult: any, cacheHit: boolean, cacheKey: string): PromptGenerationResult {
    return {
      ...cachedResult,
      cacheInfo: {
        cacheHit,
        cacheKey,
        ttl: 3600
      },
      metadata: {
        ...cachedResult.metadata,
        retrievedAt: new Date().toISOString()
      }
    }
  }

  // Public method for A/B testing different prompts
  async generateVariations(config: PromptGenerationConfig, variations: number = 2): Promise<PromptGenerationResult[]> {
    const results = []
    
    for (let i = 0; i < variations; i++) {
      const variantConfig = {
        ...config,
        emergencyBudget: true // Allow variations for testing
      }
      
      const result = await this.generateDailyPrompt(variantConfig)
      result.metadata.A_B_testVariant = `variant_${i + 1}`
      results.push(result)
    }

    return results
  }

  // Method to pre-generate content for popular combinations
  async preGeneratePopularContent(): Promise<void> {
    const popularCombinations = [
      { category: 'communication', difficulty: 'beginner', stage: 'new' },
      { category: 'appreciation', difficulty: 'beginner', stage: 'established' },
      { category: 'intimacy', difficulty: 'intermediate', stage: 'long_term' },
      // Add more popular combinations based on usage analytics
    ]

    for (const combo of popularCombinations) {
      const config: PromptGenerationConfig = {
        userId: 'system_pregeneration',
        promptCategory: combo.category as any,
        difficultyLevel: combo.difficulty as any,
        relationshipStage: combo.stage as any,
        emergencyBudget: true
      }

      try {
        await this.generateDailyPrompt(config)
        console.log(`Pre-generated content for ${combo.category}/${combo.difficulty}/${combo.stage}`)
      } catch (error) {
        console.error('Pre-generation failed:', combo, error)
      }
    }
  }
}

// Export factory function for easy initialization
export async function createPromptEngine(): Promise<AIPromptEngine> {
  const engine = new AIPromptEngine()
  return engine
}

// Export types for other modules
export type { PromptGenerationConfig, PromptGenerationResult, ModelName }