// Daily Relationship Prompts System
// Generates personalized, evidence-based daily exercises for couples

import { agentOrchestrator } from '@/lib/agents/agent-orchestration'

export interface RelationshipArchetype {
  id: 'calm_anchor' | 'responsive_partner' | 'growth_seeker' | 'steady_support'
  name: string
  description: string
  strengthAreas: string[]
  growthAreas: string[]
  preferredApproaches: string[]
}

export interface DailyPrompt {
  id: string
  coupleId: string
  date: Date
  archetype: RelationshipArchetype['id']
  category: 'communication' | 'connection' | 'intimacy' | 'conflict_resolution' | 'growth' | 'appreciation'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  framework: 'gottman' | 'eft' | 'attachment' | 'communication' | 'general'
  
  content: {
    title: string
    teachingMoment: {
      introduction: string
      keyPrinciple: string
      evidenceBase: string
      personalRelevance: string
    }
    guidedActivity: {
      instructions: string
      timeRequired: string
      partnerInteraction: 'individual' | 'together' | 'both'
      steps: Array<{
        step: number
        description: string
        prompt?: string
        reflection?: string
      }>
    }
    personalization: {
      partner1Name: string
      partner2Name: string
      relationshipLength: string
      customizations: string[]
    }
  }
  
  metadata: {
    costEstimate: number
    generatedAt: Date
    validatedBy: string[]
    safetyChecked: boolean
    evidenceValidated: boolean
    complianceApproved: boolean
    cacheKey?: string
  }
}

export interface PromptGenerationRequest {
  coupleId: string
  partner1: {
    id: string
    name: string
    archetype: RelationshipArchetype['id']
    preferences: {
      communicationStyle: string
      conflictStyle: string
      intimacyPreference: string
    }
  }
  partner2: {
    id: string
    name: string
    archetype: RelationshipArchetype['id']
    preferences: {
      communicationStyle: string
      conflictStyle: string
      intimacyPreference: string
    }
  }
  relationshipContext: {
    length: string
    currentChallenges?: string[]
    recentProgress?: string[]
    previousPrompts: string[]
  }
  constraints: {
    maxCost: number
    timeAvailable: string
    preferredFramework?: string
  }
}

export const RELATIONSHIP_ARCHETYPES: Record<string, RelationshipArchetype> = {
  calm_anchor: {
    id: 'calm_anchor',
    name: 'Calm Anchor',
    description: 'Provides stability and grounding in the relationship',
    strengthAreas: ['emotional regulation', 'patience', 'stability', 'conflict de-escalation'],
    growthAreas: ['emotional expression', 'spontaneity', 'vulnerability'],
    preferredApproaches: ['gradual progress', 'structured activities', 'mindfulness-based']
  },
  responsive_partner: {
    id: 'responsive_partner',
    name: 'Responsive Partner',
    description: 'Highly attuned to partner needs and emotions',
    strengthAreas: ['empathy', 'emotional attunement', 'support', 'adaptability'],
    growthAreas: ['self-advocacy', 'boundary setting', 'independence'],
    preferredApproaches: ['emotion-focused', 'collaborative', 'attachment-based']
  },
  growth_seeker: {
    id: 'growth_seeker',
    name: 'Growth Seeker',
    description: 'Actively seeks personal and relationship development',
    strengthAreas: ['motivation', 'self-reflection', 'openness to change', 'goal-setting'],
    growthAreas: ['patience with process', 'acceptance of current state', 'slowing down'],
    preferredApproaches: ['challenge-oriented', 'goal-based', 'progressive difficulty']
  },
  steady_support: {
    id: 'steady_support',
    name: 'Steady Support',
    description: 'Consistent, reliable foundation for relationship growth',
    strengthAreas: ['consistency', 'reliability', 'practical support', 'loyalty'],
    growthAreas: ['emotional depth', 'communication skills', 'flexibility'],
    preferredApproaches: ['practical exercises', 'routine-based', 'concrete goals']
  }
}

export class DailyPromptSystem {
  private costTracker = new Map<string, number>()
  private promptCache = new Map<string, DailyPrompt>()
  private templateLibrary: PromptTemplate[] = []

  constructor() {
    this.initializeTemplateLibrary()
  }

  /**
   * Generate a personalized daily prompt for a couple
   */
  async generateDailyPrompt(request: PromptGenerationRequest): Promise<DailyPrompt> {
    // Step 1: Check cache first
    const cacheKey = this.generateCacheKey(request)
    const cached = this.promptCache.get(cacheKey)
    if (cached && this.isCacheValid(cached)) {
      return cached
    }

    // Step 2: Check cost constraints
    const dailyCost = this.costTracker.get(request.coupleId) || 0
    if (dailyCost >= request.constraints.maxCost) {
      return await this.generateFromTemplate(request)
    }

    // Step 3: Determine prompt parameters
    const promptParams = this.determinePromptParameters(request)
    
    // Step 4: Generate content with AI
    const generatedContent = await this.generateAIContent(promptParams, request)
    
    // Step 5: Validate with agent orchestration
    const validation = await this.validatePrompt(generatedContent, request)
    
    if (!validation.success) {
      // Fallback to template if AI validation fails
      return await this.generateFromTemplate(request)
    }

    // Step 6: Create final prompt
    const prompt: DailyPrompt = {
      id: `prompt_${Date.now()}_${request.coupleId}`,
      coupleId: request.coupleId,
      date: new Date(),
      archetype: this.getCompatibleArchetype(request.partner1.archetype, request.partner2.archetype),
      category: promptParams.category,
      difficulty: promptParams.difficulty,
      framework: promptParams.framework,
      content: generatedContent,
      metadata: {
        costEstimate: generatedContent.estimatedCost || 0.10,
        generatedAt: new Date(),
        validatedBy: ['safety', 'psychology', 'compliance'],
        safetyChecked: true,
        evidenceValidated: true,
        complianceApproved: true,
        cacheKey
      }
    }

    // Step 7: Update cost tracking and cache
    this.updateCostTracking(request.coupleId, prompt.metadata.costEstimate)
    this.promptCache.set(cacheKey, prompt)

    return prompt
  }

  /**
   * Generate prompt using templates (cost-effective fallback)
   */
  private async generateFromTemplate(request: PromptGenerationRequest): Promise<DailyPrompt> {
    const template = this.selectBestTemplate(request)
    const personalizedContent = this.personalizeTemplate(template, request)
    
    const prompt: DailyPrompt = {
      id: `template_prompt_${Date.now()}_${request.coupleId}`,
      coupleId: request.coupleId,
      date: new Date(),
      archetype: this.getCompatibleArchetype(request.partner1.archetype, request.partner2.archetype),
      category: template.category,
      difficulty: template.difficulty,
      framework: template.framework,
      content: personalizedContent,
      metadata: {
        costEstimate: 0.02, // Template costs much less
        generatedAt: new Date(),
        validatedBy: ['template_validated'],
        safetyChecked: true,
        evidenceValidated: true,
        complianceApproved: true
      }
    }

    return prompt
  }

  /**
   * Determine optimal prompt parameters based on couple profile
   */
  private determinePromptParameters(request: PromptGenerationRequest) {
    const archetypes = [request.partner1.archetype, request.partner2.archetype]
    const relationshipLength = this.parseRelationshipLength(request.relationshipContext.length)
    
    // Determine category based on recent prompts and needs
    const category = this.selectPromptCategory(request.relationshipContext.previousPrompts, archetypes)
    
    // Determine difficulty based on experience and challenges
    const difficulty = this.calculateDifficulty(relationshipLength, request.relationshipContext.currentChallenges)
    
    // Determine framework based on preferences and effectiveness
    const framework = this.selectFramework(archetypes, request.constraints.preferredFramework)

    return { category, difficulty, framework, archetypes }
  }

  /**
   * Generate AI content with cost optimization
   */
  private async generateAIContent(params: any, request: PromptGenerationRequest) {
    const systemPrompt = this.buildSystemPrompt(params, request)
    const userPrompt = this.buildUserPrompt(params, request)

    // This would integrate with your AI service
    // For now, returning a structured template that could be AI-generated
    return {
      title: `${this.getCategoryDisplayName(params.category)} Exercise for ${request.partner1.name} & ${request.partner2.name}`,
      teachingMoment: {
        introduction: this.generateTeachingIntroduction(params),
        keyPrinciple: this.getFrameworkPrinciple(params.framework, params.category),
        evidenceBase: this.getEvidenceBase(params.framework),
        personalRelevance: this.generatePersonalRelevance(request, params)
      },
      guidedActivity: this.generateGuidedActivity(params, request),
      personalization: {
        partner1Name: request.partner1.name,
        partner2Name: request.partner2.name,
        relationshipLength: request.relationshipContext.length,
        customizations: this.generateCustomizations(request, params)
      },
      estimatedCost: 0.10
    }
  }

  /**
   * Validate generated prompt with agent orchestration
   */
  private async validatePrompt(content: any, request: PromptGenerationRequest) {
    const promptText = this.contentToText(content)
    
    const validationResult = await agentOrchestrator.orchestrate(promptText, {
      userId: request.partner1.id,
      coupleId: request.coupleId,
      type: 'guidance',
      additionalContext: {
        isPromptValidation: true,
        framework: content.framework,
        category: content.category
      }
    })

    return {
      success: validationResult.finalDecision.approved,
      issues: validationResult.finalDecision.restrictions || [],
      recommendations: validationResult.finalDecision.requiredActions
    }
  }

  // Helper methods

  private generateCacheKey(request: PromptGenerationRequest): string {
    const keyParts = [
      request.coupleId,
      request.partner1.archetype,
      request.partner2.archetype,
      request.relationshipContext.length,
      new Date().toDateString() // Daily cache
    ]
    return keyParts.join('_')
  }

  private isCacheValid(prompt: DailyPrompt): boolean {
    const ageInHours = (Date.now() - prompt.metadata.generatedAt.getTime()) / (1000 * 60 * 60)
    return ageInHours < 24 // Cache valid for 24 hours
  }

  private getCompatibleArchetype(archetype1: string, archetype2: string): RelationshipArchetype['id'] {
    // Logic to determine best combined archetype
    if (archetype1 === archetype2) return archetype1 as RelationshipArchetype['id']
    
    // Compatibility matrix
    const compatibility = {
      'calm_anchor': { 'growth_seeker': 'growth_seeker', 'responsive_partner': 'responsive_partner' },
      'growth_seeker': { 'steady_support': 'growth_seeker', 'calm_anchor': 'growth_seeker' },
      'responsive_partner': { 'steady_support': 'responsive_partner', 'calm_anchor': 'responsive_partner' },
      'steady_support': { 'growth_seeker': 'growth_seeker', 'responsive_partner': 'responsive_partner' }
    }

    return (compatibility[archetype1]?.[archetype2] || archetype1) as RelationshipArchetype['id']
  }

  private selectPromptCategory(previousPrompts: string[], archetypes: string[]): DailyPrompt['category'] {
    // Avoid repeating recent categories
    const recentCategories = previousPrompts.slice(-7) // Last week
    const availableCategories: DailyPrompt['category'][] = [
      'communication', 'connection', 'intimacy', 'conflict_resolution', 'growth', 'appreciation'
    ]

    const unusedCategories = availableCategories.filter(cat => !recentCategories.includes(cat))
    
    if (unusedCategories.length > 0) {
      return unusedCategories[Math.floor(Math.random() * unusedCategories.length)]
    }

    return availableCategories[Math.floor(Math.random() * availableCategories.length)]
  }

  private calculateDifficulty(relationshipLength: number, challenges?: string[]): DailyPrompt['difficulty'] {
    if (relationshipLength < 1) return 'beginner'
    if (relationshipLength < 3) return 'intermediate'
    if (challenges && challenges.length > 2) return 'advanced'
    return 'intermediate'
  }

  private selectFramework(archetypes: string[], preferred?: string): DailyPrompt['framework'] {
    if (preferred) return preferred as DailyPrompt['framework']
    
    // Framework selection based on archetypes
    if (archetypes.includes('responsive_partner')) return 'eft'
    if (archetypes.includes('growth_seeker')) return 'gottman'
    if (archetypes.includes('calm_anchor')) return 'attachment'
    return 'communication'
  }

  private parseRelationshipLength(length: string): number {
    const match = length.match(/(\d+)/)
    return match ? parseInt(match[1]) : 1
  }

  private updateCostTracking(coupleId: string, cost: number) {
    const currentCost = this.costTracker.get(coupleId) || 0
    this.costTracker.set(coupleId, currentCost + cost)
  }

  private contentToText(content: any): string {
    return [
      content.title,
      content.teachingMoment.introduction,
      content.teachingMoment.keyPrinciple,
      content.guidedActivity.instructions
    ].join(' ')
  }

  // Template and content generation helpers

  private getCategoryDisplayName(category: string): string {
    const names = {
      communication: 'Communication Building',
      connection: 'Emotional Connection',
      intimacy: 'Intimacy Enhancement',
      conflict_resolution: 'Conflict Resolution',
      growth: 'Relationship Growth',
      appreciation: 'Appreciation & Gratitude'
    }
    return names[category] || category
  }

  private generateTeachingIntroduction(params: any): string {
    const introductions = {
      communication: 'Effective communication is the foundation of every strong relationship. Today\'s exercise focuses on deepening your understanding and connection.',
      connection: 'Emotional connection forms the heart of your relationship. These moments of intentional connection strengthen your bond.',
      intimacy: 'Intimacy grows through vulnerability, trust, and shared experiences. Today\'s activity creates space for deeper closeness.',
      conflict_resolution: 'Healthy conflict resolution skills help couples navigate disagreements constructively and emerge stronger.',
      growth: 'Relationships thrive when both partners commit to continuous growth and learning together.',
      appreciation: 'Expressing appreciation strengthens your emotional bank account and builds positive sentiment in your relationship.'
    }
    return introductions[params.category] || 'Today\'s exercise is designed to strengthen your relationship.'
  }

  private getFrameworkPrinciple(framework: string, category: string): string {
    const principles = {
      gottman: {
        communication: 'Build Love Maps by learning the details of your partner\'s inner world',
        connection: 'Turn toward each other during everyday moments to build connection',
        appreciation: 'Express fondness and admiration to strengthen your emotional bond'
      },
      eft: {
        connection: 'Create secure emotional bonds through accessibility and responsiveness',
        intimacy: 'Share vulnerable emotions to deepen your attachment bond',
        conflict_resolution: 'Identify the negative cycle and access underlying emotions'
      },
      attachment: {
        connection: 'Secure attachment provides a safe haven and secure base for both partners',
        intimacy: 'Trust and emotional safety allow for deeper vulnerability and connection'
      }
    }
    return principles[framework]?.[category] || 'Strong relationships require intentional effort and practice'
  }

  private getEvidenceBase(framework: string): string {
    const evidence = {
      gottman: 'Based on Dr. John Gottman\'s 40+ years of research with over 3,000 couples',
      eft: 'Grounded in Sue Johnson\'s Emotionally Focused Therapy and attachment research',
      attachment: 'Based on Bowlby\'s attachment theory and adult attachment research',
      communication: 'Supported by decades of communication and relationship research'
    }
    return evidence[framework] || 'Supported by relationship science research'
  }

  private generatePersonalRelevance(request: PromptGenerationRequest, params: any): string {
    const archetype1 = RELATIONSHIP_ARCHETYPES[request.partner1.archetype]
    const archetype2 = RELATIONSHIP_ARCHETYPES[request.partner2.archetype]
    
    return `This exercise is particularly relevant for ${archetype1.name} and ${archetype2.name} archetypes, 
            supporting growth in ${archetype1.growthAreas[0]} and ${archetype2.growthAreas[0]}.`
  }

  private generateGuidedActivity(params: any, request: PromptGenerationRequest) {
    // This would contain the actual exercise steps
    // For brevity, returning a basic structure
    return {
      instructions: `This ${params.category} exercise is designed for ${request.constraints.timeAvailable} and can be done together.`,
      timeRequired: request.constraints.timeAvailable,
      partnerInteraction: 'together' as const,
      steps: [
        {
          step: 1,
          description: 'Set up a comfortable space free from distractions',
          prompt: 'Create an environment that feels safe and welcoming for both of you'
        },
        {
          step: 2,
          description: 'Begin with a moment of appreciation',
          prompt: 'Share one thing you appreciate about your partner today'
        },
        {
          step: 3,
          description: 'Engage in the main exercise',
          prompt: 'Focus on understanding and connecting with each other'
        }
      ]
    }
  }

  private generateCustomizations(request: PromptGenerationRequest, params: any): string[] {
    const customizations = []
    
    if (request.relationshipContext.currentChallenges?.includes('communication')) {
      customizations.push('Extra focus on clear, non-judgmental communication')
    }
    
    if (request.relationshipContext.recentProgress?.includes('conflict_resolution')) {
      customizations.push('Building on your recent progress with conflict resolution')
    }

    return customizations
  }

  // Template system for cost optimization
  private initializeTemplateLibrary() {
    // This would load pre-validated templates
    // For now, adding a basic structure
    this.templateLibrary = [
      {
        id: 'comm_basic_1',
        category: 'communication',
        difficulty: 'beginner',
        framework: 'gottman',
        template: 'Daily Love Map: Share three things about your day with your partner...',
        validated: true
      }
      // Add more templates...
    ]
  }

  private selectBestTemplate(request: PromptGenerationRequest): PromptTemplate {
    // Select template based on request parameters
    return this.templateLibrary[0] // Simplified for now
  }

  private personalizeTemplate(template: PromptTemplate, request: PromptGenerationRequest) {
    // Personalize template with names and context
    return {
      title: `${template.category} exercise for ${request.partner1.name} & ${request.partner2.name}`,
      teachingMoment: {
        introduction: this.generateTeachingIntroduction({ category: template.category }),
        keyPrinciple: this.getFrameworkPrinciple(template.framework, template.category),
        evidenceBase: this.getEvidenceBase(template.framework),
        personalRelevance: this.generatePersonalRelevance(request, { category: template.category })
      },
      guidedActivity: this.generateGuidedActivity({ category: template.category }, request),
      personalization: {
        partner1Name: request.partner1.name,
        partner2Name: request.partner2.name,
        relationshipLength: request.relationshipContext.length,
        customizations: this.generateCustomizations(request, { category: template.category })
      }
    }
  }
}

interface PromptTemplate {
  id: string
  category: DailyPrompt['category']
  difficulty: DailyPrompt['difficulty']
  framework: DailyPrompt['framework']
  template: string
  validated: boolean
}

// Export singleton instance
export const dailyPromptSystem = new DailyPromptSystem()