import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database-complete.types'

// Gottman Method-based template categories
const GOTTMAN_FRAMEWORKS = {
  FOUR_HORSEMEN: {
    name: 'Four Horsemen Prevention',
    description: 'Avoid criticism, contempt, defensiveness, and stonewalling',
    evidenceBase: 'Gottman & Levenson (1992) - Marital processes predictive of later dissolution'
  },
  LOVE_MAPS: {
    name: 'Love Maps',
    description: 'Building intimate knowledge of your partner\'s inner world',
    evidenceBase: 'Gottman (1999) - The Seven Principles for Making Marriage Work'
  },
  EMOTIONAL_BANK_ACCOUNT: {
    name: 'Emotional Bank Account',
    description: 'Making positive deposits in your relationship',
    evidenceBase: 'Gottman & Gottman (2017) - The Science of Trust'
  },
  REPAIR_ATTEMPTS: {
    name: 'Repair Attempts',
    description: 'De-escalating conflict and maintaining connection',
    evidenceBase: 'Gottman (1994) - What Predicts Divorce?'
  },
  DREAMS_WITHIN_CONFLICT: {
    name: 'Dreams Within Conflict',
    description: 'Understanding deeper meaning behind relationship conflicts',
    evidenceBase: 'Gottman & Gottman (2015) - 10 Lessons to Transform Your Marriage'
  }
}

interface PromptTemplate {
  id: string
  category: 'communication' | 'intimacy' | 'goals' | 'appreciation' | 'conflict_resolution' | 'fun' | 'deep_connection' | 'growth'
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  title: string
  templateText: string
  personalizationSlots: string[]
  gottmanFramework: keyof typeof GOTTMAN_FRAMEWORKS
  evidenceBase: string[]
  disclaimerRequired: boolean
  safetyNotes: string[]
  usageCount: number
  effectivenessScore: number
  metadata: {
    estimatedTimeMinutes: number
    targetOutcome: string
    prerequisites?: string[]
    followUpSuggestions?: string[]
  }
}

interface PersonalizationContext {
  userId: string
  partnerName?: string
  userDisplayName?: string
  relationshipStage: 'new' | 'established' | 'long_term'
  userArchetype?: {
    communicationStyle?: string
    loveLangague?: string
    attachmentStyle?: string
    conflictStyle?: string
  }
  relationshipGoals?: string[]
  preferredActivities?: string[]
}

interface PersonalizedPrompt {
  content: string
  templateId: string
  disclaimerText: string
  safetyNotes: string[]
  metadata: {
    personalizationLevel: number // 0-100% how much was personalized
    frameworkUsed: string
    evidenceBase: string[]
    estimatedTimeMinutes: number
  }
}

export class TemplateEngine {
  private supabase = createClientComponentClient<Database>()
  private templates: Map<string, PromptTemplate> = new Map()
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    // Load templates from database or create default ones
    await this.loadTemplates()
    
    // If no templates exist, create the default Gottman-based templates
    if (this.templates.size === 0) {
      await this.createDefaultTemplates()
    }

    this.initialized = true
    console.log(`✅ Template engine initialized with ${this.templates.size} templates`)
  }

  async getTemplate(
    category: PromptTemplate['category'], 
    difficultyLevel: PromptTemplate['difficultyLevel']
  ): Promise<PromptTemplate> {
    if (!this.initialized) {
      await this.initialize()
    }

    // Find the best matching template
    const matchingTemplates = Array.from(this.templates.values()).filter(
      t => t.category === category && t.difficultyLevel === difficultyLevel
    )

    if (matchingTemplates.length === 0) {
      // Fallback to any template in the category
      const fallbackTemplates = Array.from(this.templates.values()).filter(
        t => t.category === category
      )
      
      if (fallbackTemplates.length === 0) {
        throw new Error(`No templates found for category: ${category}`)
      }

      return fallbackTemplates[0]
    }

    // Return the template with highest effectiveness score
    return matchingTemplates.sort((a, b) => b.effectivenessScore - a.effectivenessScore)[0]
  }

  async personalizeTemplate(
    template: PromptTemplate, 
    context: PersonalizationContext
  ): Promise<PersonalizedPrompt> {
    let personalizedContent = template.templateText
    let personalizationLevel = 0

    // Replace personalization slots
    for (const slot of template.personalizationSlots) {
      const replacement = this.getSlotReplacement(slot, context)
      if (replacement) {
        const slotPattern = new RegExp(`\\{${slot}\\}`, 'g')
        if (personalizedContent.includes(`{${slot}}`)) {
          personalizedContent = personalizedContent.replace(slotPattern, replacement)
          personalizationLevel += 20 // Each successful personalization adds 20%
        }
      }
    }

    // Add relationship stage specific modifications
    personalizedContent = this.addStageSpecificContent(personalizedContent, context.relationshipStage)

    // Add archetype-specific modifications
    if (context.userArchetype) {
      personalizedContent = this.addArchetypeSpecificContent(personalizedContent, context.userArchetype)
      personalizationLevel += 10
    }

    // Ensure personalization doesn't exceed 100%
    personalizationLevel = Math.min(100, personalizationLevel)

    const disclaimerText = this.generateDisclaimer(template)

    return {
      content: personalizedContent,
      templateId: template.id,
      disclaimerText,
      safetyNotes: template.safetyNotes,
      metadata: {
        personalizationLevel,
        frameworkUsed: GOTTMAN_FRAMEWORKS[template.gottmanFramework].name,
        evidenceBase: template.evidenceBase,
        estimatedTimeMinutes: template.metadata.estimatedTimeMinutes
      }
    }
  }

  private getSlotReplacement(slot: string, context: PersonalizationContext): string | null {
    switch (slot) {
      case 'PARTNER_NAME':
        return context.partnerName || 'your partner'
      
      case 'USER_NAME':
        return context.userDisplayName || 'you'
      
      case 'RELATIONSHIP_STAGE':
        return this.getRelationshipStageText(context.relationshipStage)
      
      case 'COMMUNICATION_STYLE':
        return context.userArchetype?.communicationStyle || 'your natural communication style'
      
      case 'LOVE_LANGUAGE':
        return context.userArchetype?.loveLangague || 'your love language'
      
      case 'ATTACHMENT_STYLE':
        return this.getAttachmentStyleText(context.userArchetype?.attachmentStyle)
      
      case 'CONFLICT_STYLE':
        return context.userArchetype?.conflictStyle || 'your approach to conflict'
      
      case 'RELATIONSHIP_GOALS':
        return context.relationshipGoals?.join(', ') || 'your shared relationship goals'
      
      case 'PREFERRED_ACTIVITIES':
        return context.preferredActivities?.join(', ') || 'activities you both enjoy'
      
      default:
        return null
    }
  }

  private getRelationshipStageText(stage: string): string {
    switch (stage) {
      case 'new':
        return 'as you\'re building your foundation together'
      case 'established':
        return 'in your established relationship'
      case 'long_term':
        return 'in your long-term partnership'
      default:
        return 'in your relationship'
    }
  }

  private getAttachmentStyleText(style?: string): string {
    if (!style) return 'your attachment style'

    switch (style) {
      case 'secure':
        return 'your secure attachment style (comfortable with intimacy and independence)'
      case 'anxious':
        return 'your anxious attachment style (values close connection and reassurance)'
      case 'avoidant':
        return 'your avoidant attachment style (values independence and self-reliance)'
      case 'disorganized':
        return 'your complex attachment patterns'
      default:
        return 'your attachment style'
    }
  }

  private addStageSpecificContent(content: string, stage: string): string {
    const stageModifications = {
      new: {
        prefix: 'As you\'re getting to know each other, ',
        focus: 'building trust and understanding'
      },
      established: {
        prefix: 'In your established relationship, ',
        focus: 'deepening your connection and maintaining growth'
      },
      long_term: {
        prefix: 'After years together, ',
        focus: 'rediscovering each other and keeping love fresh'
      }
    }

    const modification = stageModifications[stage as keyof typeof stageModifications]
    if (modification && !content.includes(modification.prefix)) {
      // Add stage-specific context if not already present
      content = modification.prefix + content.charAt(0).toLowerCase() + content.slice(1)
    }

    return content
  }

  private addArchetypeSpecificContent(content: string, archetype: NonNullable<PersonalizationContext['userArchetype']>): string {
    // Add communication style specific notes
    if (archetype.communicationStyle === 'direct') {
      content += '\n\n💡 Since you prefer direct communication, feel free to express your thoughts clearly and honestly.'
    } else if (archetype.communicationStyle === 'indirect') {
      content += '\n\n💡 Since you prefer gentler communication, take time to find words that feel comfortable for you.'
    }

    // Add conflict style considerations
    if (archetype.conflictStyle === 'avoiding') {
      content += '\n\n🌟 Remember, addressing concerns early often prevents bigger issues later.'
    } else if (archetype.conflictStyle === 'competitive') {
      content += '\n\n🌟 Focus on collaboration rather than winning - you\'re on the same team.'
    }

    return content
  }

  private generateDisclaimer(template: PromptTemplate): string {
    const baseDisclaimer = `💡 This is a wellness exercise based on ${GOTTMAN_FRAMEWORKS[template.gottmanFramework].name} principles for educational purposes only, not professional relationship advice.`
    
    if (template.disclaimerRequired) {
      return baseDisclaimer + ' If you\'re experiencing relationship difficulties, consider speaking with a licensed couples therapist.'
    }

    return baseDisclaimer
  }

  private async loadTemplates(): Promise<void> {
    try {
      const { data: templates, error } = await this.supabase
        .from('content_templates')
        .select('*')
        .eq('template_type', 'daily_prompt')
        .eq('is_active', true)

      if (error) {
        console.warn('Failed to load templates from database:', error)
        return
      }

      for (const templateData of templates || []) {
        const template: PromptTemplate = {
          id: templateData.id,
          category: templateData.category as PromptTemplate['category'],
          difficultyLevel: this.parseDifficultyLevel(templateData.template_name),
          title: templateData.template_name,
          templateText: templateData.content_text,
          personalizationSlots: this.extractPersonalizationSlots(templateData.content_text),
          gottmanFramework: this.determineGottmanFramework(templateData.category),
          evidenceBase: ['Gottman Institute Research'], // Would be stored in DB
          disclaimerRequired: true,
          safetyNotes: [],
          usageCount: templateData.usage_count || 0,
          effectivenessScore: templateData.quality_score || 75,
          metadata: {
            estimatedTimeMinutes: 10,
            targetOutcome: 'Improved relationship connection'
          }
        }

        this.templates.set(template.id, template)
      }

    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  private extractPersonalizationSlots(templateText: string): string[] {
    const slotPattern = /\{([A-Z_]+)\}/g
    const slots: string[] = []
    let match

    while ((match = slotPattern.exec(templateText)) !== null) {
      if (!slots.includes(match[1])) {
        slots.push(match[1])
      }
    }

    return slots
  }

  private parseDifficultyLevel(templateName: string): PromptTemplate['difficultyLevel'] {
    const name = templateName.toLowerCase()
    if (name.includes('advanced') || name.includes('deep') || name.includes('complex')) {
      return 'advanced'
    }
    if (name.includes('intermediate') || name.includes('moderate')) {
      return 'intermediate'
    }
    return 'beginner'
  }

  private determineGottmanFramework(category: string): keyof typeof GOTTMAN_FRAMEWORKS {
    switch (category) {
      case 'communication':
        return 'FOUR_HORSEMEN'
      case 'appreciation':
        return 'EMOTIONAL_BANK_ACCOUNT'
      case 'conflict_resolution':
        return 'REPAIR_ATTEMPTS'
      case 'deep_connection':
        return 'LOVE_MAPS'
      case 'intimacy':
        return 'LOVE_MAPS'
      default:
        return 'EMOTIONAL_BANK_ACCOUNT'
    }
  }

  private async createDefaultTemplates(): Promise<void> {
    const defaultTemplates = this.getDefaultGottmanTemplates()

    for (const template of defaultTemplates) {
      this.templates.set(template.id, template)
      
      // Also store in database
      try {
        await this.supabase
          .from('content_templates')
          .insert({
            id: template.id,
            template_name: template.title,
            template_type: 'daily_prompt',
            category: template.category,
            content_text: template.templateText,
            personalization_variables: template.personalizationSlots,
            target_archetypes: [],
            target_situations: [],
            generated_by_ai: false,
            ai_model_version: 'gottman_method_v1',
            quality_score: template.effectivenessScore,
            usage_count: 0,
            is_active: true,
            human_reviewed: true,
            approved_for_production: true
          })
      } catch (error) {
        console.warn('Failed to store default template:', template.id, error)
      }
    }

    console.log(`Created ${defaultTemplates.length} default Gottman Method templates`)
  }

  private getDefaultGottmanTemplates(): PromptTemplate[] {
    return [
      // Communication - Beginner
      {
        id: 'comm_beginner_001',
        category: 'communication',
        difficultyLevel: 'beginner',
        title: 'Daily Check-In Practice',
        templateText: 'Today, set aside 10 minutes for an uninterrupted conversation with {PARTNER_NAME}. Share one highlight from your day and one thing you\'re looking forward to. Practice active listening by reflecting back what you hear before sharing your own thoughts. {RELATIONSHIP_STAGE}, this simple practice builds your Love Maps - your knowledge of each other\'s daily world.',
        personalizationSlots: ['PARTNER_NAME', 'RELATIONSHIP_STAGE'],
        gottmanFramework: 'LOVE_MAPS',
        evidenceBase: ['Gottman (1999) - The Seven Principles for Making Marriage Work'],
        disclaimerRequired: true,
        safetyNotes: [],
        usageCount: 0,
        effectivenessScore: 85,
        metadata: {
          estimatedTimeMinutes: 10,
          targetOutcome: 'Enhanced daily connection and communication'
        }
      },
      
      // Appreciation - Beginner
      {
        id: 'appr_beginner_001',
        category: 'appreciation',
        difficultyLevel: 'beginner',
        title: 'Specific Appreciation Practice',
        templateText: 'Think of something specific {PARTNER_NAME} did recently that you appreciated. Express your gratitude by mentioning: what they did, how it made you feel, and why it mattered to you. For example: "When you [specific action], I felt [emotion] because [reason]." This makes a positive deposit in your emotional bank account.',
        personalizationSlots: ['PARTNER_NAME'],
        gottmanFramework: 'EMOTIONAL_BANK_ACCOUNT',
        evidenceBase: ['Gottman & Gottman (2017) - The Science of Trust'],
        disclaimerRequired: true,
        safetyNotes: [],
        usageCount: 0,
        effectivenessScore: 90,
        metadata: {
          estimatedTimeMinutes: 5,
          targetOutcome: 'Increased feelings of appreciation and recognition'
        }
      },

      // Conflict Resolution - Intermediate
      {
        id: 'conf_intermediate_001',
        category: 'conflict_resolution',
        difficultyLevel: 'intermediate',
        title: 'Soft Startup Practice',
        templateText: 'If you need to address a concern with {PARTNER_NAME}, practice the "soft startup" approach. Begin with "I feel..." instead of "You always..." or "You never..." State your feelings about a specific situation, express a positive need, and avoid criticism or blame. Remember, {COMMUNICATION_STYLE} can be effective when it starts gently.',
        personalizationSlots: ['PARTNER_NAME', 'COMMUNICATION_STYLE'],
        gottmanFramework: 'FOUR_HORSEMEN',
        evidenceBase: ['Gottman & Levenson (1992) - Marital processes predictive of later dissolution'],
        disclaimerRequired: true,
        safetyNotes: ['If you feel unsafe discussing concerns, seek professional support'],
        usageCount: 0,
        effectivenessScore: 80,
        metadata: {
          estimatedTimeMinutes: 15,
          targetOutcome: 'Constructive conflict discussion skills'
        }
      },

      // Intimacy - Intermediate
      {
        id: 'inti_intermediate_001',
        category: 'intimacy',
        difficultyLevel: 'intermediate',
        title: 'Love Map Building',
        templateText: 'Ask {PARTNER_NAME} about something you\'d like to know about their inner world. Try questions like: "What\'s been on your mind lately?" or "What would make you feel most supported right now?" Listen with curiosity rather than trying to fix or advise. {ATTACHMENT_STYLE} influences how we connect, so be patient with the process.',
        personalizationSlots: ['PARTNER_NAME', 'ATTACHMENT_STYLE'],
        gottmanFramework: 'LOVE_MAPS',
        evidenceBase: ['Gottman (1999) - The Seven Principles for Making Marriage Work'],
        disclaimerRequired: true,
        safetyNotes: [],
        usageCount: 0,
        effectivenessScore: 85,
        metadata: {
          estimatedTimeMinutes: 20,
          targetOutcome: 'Deeper emotional intimacy and understanding'
        }
      },

      // Goals - Advanced
      {
        id: 'goal_advanced_001',
        category: 'goals',
        difficultyLevel: 'advanced',
        title: 'Dreams Within Dreams Exploration',
        templateText: 'Explore a deeper conversation about your dreams and aspirations with {PARTNER_NAME}. Share not just what you want to achieve, but why it matters to you at a core level. Ask about the dreams behind their goals - what values or experiences from their past make certain aspirations meaningful? {RELATIONSHIP_STAGE}, understanding each other\'s deepest dreams creates profound connection.',
        personalizationSlots: ['PARTNER_NAME', 'RELATIONSHIP_STAGE'],
        gottmanFramework: 'DREAMS_WITHIN_CONFLICT',
        evidenceBase: ['Gottman & Gottman (2015) - 10 Lessons to Transform Your Marriage'],
        disclaimerRequired: true,
        safetyNotes: [],
        usageCount: 0,
        effectivenessScore: 75,
        metadata: {
          estimatedTimeMinutes: 30,
          targetOutcome: 'Alignment on life dreams and values'
        }
      },

      // Fun - Beginner
      {
        id: 'fun_beginner_001',
        category: 'fun',
        difficultyLevel: 'beginner',
        title: 'Playful Connection Moment',
        templateText: 'Create a moment of lightness with {PARTNER_NAME} today. Try something silly together - make up a dance to your favorite song, have a conversation using only questions, or create a story together where you each add one sentence at a time. Playfulness strengthens your friendship foundation.',
        personalizationSlots: ['PARTNER_NAME'],
        gottmanFramework: 'EMOTIONAL_BANK_ACCOUNT',
        evidenceBase: ['Gottman & Gottman (2017) - The Science of Trust'],
        disclaimerRequired: true,
        safetyNotes: [],
        usageCount: 0,
        effectivenessScore: 88,
        metadata: {
          estimatedTimeMinutes: 15,
          targetOutcome: 'Increased joy and playfulness in relationship'
        }
      }
    ]
  }

  // Method to track template effectiveness
  async recordTemplateUsage(templateId: string, wasEffective: boolean, userFeedback?: string): Promise<void> {
    const template = this.templates.get(templateId)
    if (!template) return

    // Update usage count
    template.usageCount++

    // Adjust effectiveness score based on feedback
    if (wasEffective) {
      template.effectivenessScore = Math.min(100, template.effectivenessScore + 1)
    } else {
      template.effectivenessScore = Math.max(0, template.effectivenessScore - 2)
    }

    // Update in database
    try {
      await this.supabase
        .from('content_templates')
        .update({
          usage_count: template.usageCount,
          quality_score: template.effectivenessScore,
          last_used_at: new Date().toISOString()
        })
        .eq('id', templateId)

      // Log feedback for analysis
      if (userFeedback) {
        await this.supabase
          .from('template_feedback')
          .insert({
            template_id: templateId,
            was_effective: wasEffective,
            feedback_text: userFeedback,
            created_at: new Date().toISOString()
          })
      }

    } catch (error) {
      console.error('Error recording template usage:', error)
    }
  }

  // Get templates optimized for A/B testing
  async getTemplateVariations(
    category: PromptTemplate['category'], 
    difficultyLevel: PromptTemplate['difficultyLevel'],
    count: number = 2
  ): Promise<PromptTemplate[]> {
    const allMatching = Array.from(this.templates.values()).filter(
      t => t.category === category && t.difficultyLevel === difficultyLevel
    )

    // Return top performing templates for A/B testing
    return allMatching
      .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
      .slice(0, count)
  }
}

// Export types for other modules
export type { PromptTemplate, PersonalizationContext, PersonalizedPrompt }