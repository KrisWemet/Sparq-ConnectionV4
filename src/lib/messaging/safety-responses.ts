import { createClientComponentClient } from '@supabase/supabase-js'
import { Database } from '@/types/database-complete.types'
import { MessageSafetyAnalysis } from './safety-analysis'
import { SafetyPreferences } from './safety-preferences'

// Graduated safety response system with transparent user notifications
export interface SafetyResponse {
  interventionType: 'cooling_off_suggestion' | 'reframing_prompt' | 'resource_surfacing' | 
                   'crisis_resource_display' | 'professional_referral' | 'emergency_escalation' |
                   'conversation_pause' | 'guided_reflection' | 'safety_check'
  
  severity: 'gentle' | 'moderate' | 'urgent' | 'emergency'
  
  // User-facing content
  title: string
  message: string
  suggestedActions: Array<{
    action: string
    description: string
    priority: 'low' | 'medium' | 'high'
    type: 'immediate' | 'short_term' | 'ongoing'
  }>
  
  // Resources provided
  resources: Array<{
    name: string
    type: 'crisis_hotline' | 'domestic_violence' | 'mental_health' | 'self_help' | 'professional'
    contactMethod: 'phone' | 'text' | 'chat' | 'website'
    contact: string
    description: string
    availability: string
    discrete?: boolean // For DV resources that need to be accessed privately
  }>
  
  // Transparency information
  explanation: string // Why this intervention was triggered
  triggeredBy: string[] // What specific indicators caused this
  userCanDisable: boolean
  privacyImpact: 'none' | 'low' | 'medium' | 'high'
  
  // Follow-up
  followUpNeeded: boolean
  escalationPath?: string
  reminderSchedule?: 'immediate' | '1_hour' | '24_hours' | '7_days'
}

export interface CrisisResourceSet {
  immediate: Array<{
    name: string
    phone?: string
    text?: string
    chat?: string
    description: string
  }>
  
  local: Array<{
    name: string
    contact: string
    type: 'hotline' | 'center' | 'service'
    description: string
  }>
  
  professional: Array<{
    name: string
    type: 'therapist' | 'counselor' | 'psychiatrist' | 'social_worker'
    contact: string
    specialization: string[]
    description: string
  }>
}

export class GraduatedSafetyResponseSystem {
  private supabase = createClientComponentClient<Database>()

  async generateSafetyResponse(
    analysis: MessageSafetyAnalysis,
    userPreferences: SafetyPreferences,
    userId: string,
    coupleId: string
  ): Promise<SafetyResponse | null> {
    
    // No intervention needed for safe messages
    if (!analysis.requiresIntervention || analysis.riskLevel === 'safe') {
      return null
    }

    // Generate appropriate response based on risk level and user preferences
    const responseGenerator = this.getResponseGenerator(analysis.riskLevel)
    
    const response = await responseGenerator({
      analysis,
      userPreferences,
      userId,
      coupleId
    })

    // Log the intervention for transparency
    await this.logSafetyIntervention(response, analysis, userId, coupleId)

    return response
  }

  private getResponseGenerator(riskLevel: string) {
    switch (riskLevel) {
      case 'low':
        return this.generateLowRiskResponse.bind(this)
      case 'medium':
        return this.generateMediumRiskResponse.bind(this)
      case 'high':
        return this.generateHighRiskResponse.bind(this)
      case 'critical':
        return this.generateCriticalRiskResponse.bind(this)
      default:
        return this.generateLowRiskResponse.bind(this)
    }
  }

  private async generateLowRiskResponse(context: {
    analysis: MessageSafetyAnalysis
    userPreferences: SafetyPreferences
    userId: string
    coupleId: string
  }): Promise<SafetyResponse> {
    const { analysis, userPreferences } = context
    
    // Gentle suggestions for minor issues
    const hasToxicity = analysis.toxicityScore > 10
    const hasEmotionalDistress = analysis.emotionalDistressScore > 10

    if (hasToxicity) {
      return {
        interventionType: 'reframing_prompt',
        severity: 'gentle',
        title: 'Communication Suggestion',
        message: 'We noticed your message might come across differently than you intended. Consider taking a moment to reframe your thoughts in a way that builds connection rather than creates distance.',
        suggestedActions: [
          {
            action: 'Take 3 deep breaths before sending',
            description: 'A brief pause can help you communicate more thoughtfully',
            priority: 'medium',
            type: 'immediate'
          },
          {
            action: 'Try using "I" statements',
            description: 'Express your feelings without blame: "I feel..." instead of "You always..."',
            priority: 'medium',
            type: 'immediate'
          },
          {
            action: 'Focus on the specific situation',
            description: 'Address the current issue rather than bringing up past conflicts',
            priority: 'low',
            type: 'immediate'
          }
        ],
        resources: [
          {
            name: 'Gottman Method Communication Tips',
            type: 'self_help',
            contactMethod: 'website',
            contact: '/resources/communication-tips',
            description: 'Evidence-based techniques for healthy relationship communication',
            availability: 'Always available'
          }
        ],
        explanation: 'Your message contained language that might escalate tension. This suggestion helps maintain positive communication.',
        triggeredBy: analysis.triggeredKeywords,
        userCanDisable: true,
        privacyImpact: 'low',
        followUpNeeded: false
      }
    }

    if (hasEmotionalDistress) {
      return {
        interventionType: 'guided_reflection',
        severity: 'gentle',
        title: 'Self-Care Check-In',
        message: 'It sounds like you might be feeling overwhelmed right now. Taking care of yourself helps you show up better in your relationship.',
        suggestedActions: [
          {
            action: 'Take a 5-minute self-care break',
            description: 'Step away from the conversation to center yourself',
            priority: 'high',
            type: 'immediate'
          },
          {
            action: 'Practice grounding techniques',
            description: '5-4-3-2-1: Notice 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste',
            priority: 'medium',
            type: 'immediate'
          },
          {
            action: 'Consider what you need right now',
            description: 'Is it support, space, understanding, or something else?',
            priority: 'low',
            type: 'short_term'
          }
        ],
        resources: [
          {
            name: 'Emotional Wellness Resources',
            type: 'self_help',
            contactMethod: 'website',
            contact: '/resources/emotional-wellness',
            description: 'Coping strategies and self-care techniques for emotional balance',
            availability: 'Always available'
          }
        ],
        explanation: 'Your message suggests you may be experiencing emotional distress. This check-in helps you care for yourself.',
        triggeredBy: ['emotional_distress_indicators'],
        userCanDisable: true,
        privacyImpact: 'low',
        followUpNeeded: false
      }
    }

    // Default low-risk response
    return {
      interventionType: 'cooling_off_suggestion',
      severity: 'gentle',
      title: 'Mindful Communication',
      message: 'Consider taking a moment to reflect before continuing this conversation.',
      suggestedActions: [
        {
          action: 'Pause and breathe',
          description: 'Take a moment to center yourself',
          priority: 'medium',
          type: 'immediate'
        }
      ],
      resources: [],
      explanation: 'Safety systems detected potential communication tension.',
      triggeredBy: analysis.triggeredKeywords,
      userCanDisable: true,
      privacyImpact: 'low',
      followUpNeeded: false
    }
  }

  private async generateMediumRiskResponse(context: {
    analysis: MessageSafetyAnalysis
    userPreferences: SafetyPreferences
    userId: string
    coupleId: string
  }): Promise<SafetyResponse> {
    const { analysis, userPreferences } = context
    
    return {
      interventionType: 'conversation_pause',
      severity: 'moderate',
      title: 'Conversation Break Suggested',
      message: 'We noticed this conversation may be getting heated. Taking a break can help both of you approach this discussion more constructively.',
      suggestedActions: [
        {
          action: 'Take a 20-minute break',
          description: 'Step away from the conversation to cool down and gain perspective',
          priority: 'high',
          type: 'immediate'
        },
        {
          action: 'Practice calming techniques',
          description: 'Deep breathing, short walk, or other stress-reduction activities',
          priority: 'high',
          type: 'immediate'
        },
        {
          action: 'Reflect on your underlying needs',
          description: 'What do you really need from this conversation?',
          priority: 'medium',
          type: 'short_term'
        },
        {
          action: 'Return to the conversation with care',
          description: 'When you\'re both ready, restart with empathy and understanding',
          priority: 'medium',
          type: 'short_term'
        }
      ],
      resources: [
        {
          name: 'Conflict De-escalation Guide',
          type: 'self_help',
          contactMethod: 'website',
          contact: '/resources/conflict-resolution',
          description: 'Strategies for managing relationship conflicts constructively',
          availability: 'Always available'
        },
        {
          name: 'Couples Communication Exercises',
          type: 'self_help',
          contactMethod: 'website',
          contact: '/resources/communication-exercises',
          description: 'Structured exercises to improve relationship communication',
          availability: 'Always available'
        }
      ],
      explanation: 'Multiple communication warning signs detected. A break can prevent escalation and improve outcomes.',
      triggeredBy: analysis.triggeredKeywords,
      userCanDisable: true,
      privacyImpact: 'medium',
      followUpNeeded: true,
      reminderSchedule: '1_hour'
    }
  }

  private async generateHighRiskResponse(context: {
    analysis: MessageSafetyAnalysis
    userPreferences: SafetyPreferences
    userId: string
    coupleId: string
  }): Promise<SafetyResponse> {
    const { analysis, userPreferences } = context
    
    const hasDVRisk = analysis.dvRiskScore > 50
    const hasCrisisRisk = analysis.crisisScore > 50

    if (hasDVRisk) {
      return {
        interventionType: 'resource_surfacing',
        severity: 'urgent',
        title: 'Support Resources Available',
        message: 'We want to ensure your safety and wellbeing. Professional support services are available to help you navigate this situation.',
        suggestedActions: [
          {
            action: 'Consider your safety first',
            description: 'Your wellbeing is the most important priority',
            priority: 'high',
            type: 'immediate'
          },
          {
            action: 'Reach out for professional support',
            description: 'Trained professionals can provide guidance tailored to your situation',
            priority: 'high',
            type: 'immediate'
          },
          {
            action: 'Create a safety plan',
            description: 'Having a plan can help you feel more prepared and secure',
            priority: 'medium',
            type: 'short_term'
          }
        ],
        resources: [
          {
            name: 'National Domestic Violence Hotline',
            type: 'domestic_violence',
            contactMethod: 'phone',
            contact: '1-800-799-7233',
            description: '24/7 confidential support for domestic violence situations',
            availability: '24/7',
            discrete: true
          },
          {
            name: 'DV Text Support',
            type: 'domestic_violence',
            contactMethod: 'text',
            contact: 'Text START to 88788',
            description: 'Confidential text-based support',
            availability: '24/7',
            discrete: true
          },
          {
            name: 'Safety Planning Resources',
            type: 'self_help',
            contactMethod: 'website',
            contact: '/resources/safety-planning',
            description: 'Tools and guidance for creating a personal safety plan',
            availability: 'Always available',
            discrete: true
          }
        ],
        explanation: 'Your message contained patterns that may indicate relationship safety concerns. These resources are here to support you.',
        triggeredBy: ['domestic_violence_patterns'],
        userCanDisable: false, // Cannot disable DV detection for safety
        privacyImpact: 'high',
        followUpNeeded: true,
        escalationPath: 'professional_support',
        reminderSchedule: '24_hours'
      }
    }

    if (hasCrisisRisk) {
      return {
        interventionType: 'crisis_resource_display',
        severity: 'urgent',
        title: 'Immediate Support Available',
        message: 'We noticed you may be going through a difficult time. You don\'t have to face this alone - support is available right now.',
        suggestedActions: [
          {
            action: 'Reach out for immediate support',
            description: 'Professional crisis support is available 24/7',
            priority: 'high',
            type: 'immediate'
          },
          {
            action: 'Stay with someone you trust',
            description: 'Being around supportive people can help during difficult times',
            priority: 'high',
            type: 'immediate'
          },
          {
            action: 'Remove access to harmful means',
            description: 'Create a safer environment for yourself',
            priority: 'high',
            type: 'immediate'
          }
        ],
        resources: [
          {
            name: 'National Suicide Prevention Lifeline',
            type: 'crisis_hotline',
            contactMethod: 'phone',
            contact: '988',
            description: '24/7 crisis support and suicide prevention',
            availability: '24/7'
          },
          {
            name: 'Crisis Text Line',
            type: 'crisis_hotline',
            contactMethod: 'text',
            contact: 'Text HOME to 741741',
            description: 'Free crisis support via text message',
            availability: '24/7'
          },
          {
            name: 'Crisis Chat',
            type: 'crisis_hotline',
            contactMethod: 'chat',
            contact: 'https://suicidepreventionlifeline.org/chat/',
            description: 'Online crisis support chat',
            availability: '24/7'
          }
        ],
        explanation: 'Your message contained language that suggests you may be experiencing a crisis. Professional help is available.',
        triggeredBy: analysis.detectedIndicators.map(i => i.description),
        userCanDisable: false, // Cannot disable crisis detection for safety
        privacyImpact: 'high',
        followUpNeeded: true,
        escalationPath: 'crisis_intervention',
        reminderSchedule: '1_hour'
      }
    }

    // Default high-risk response
    return {
      interventionType: 'professional_referral',
      severity: 'urgent',
      title: 'Professional Support Recommended',
      message: 'Based on your recent messages, we recommend speaking with a professional who can provide personalized support.',
      suggestedActions: [
        {
          action: 'Consider professional counseling',
          description: 'A licensed professional can provide specialized support',
          priority: 'high',
          type: 'short_term'
        }
      ],
      resources: [
        {
          name: 'Find Local Mental Health Services',
          type: 'professional',
          contactMethod: 'website',
          contact: '/resources/find-therapist',
          description: 'Directory of local mental health professionals',
          availability: 'Business hours vary'
        }
      ],
      explanation: 'Multiple risk indicators suggest professional support would be beneficial.',
      triggeredBy: analysis.triggeredKeywords,
      userCanDisable: true,
      privacyImpact: 'medium',
      followUpNeeded: true,
      reminderSchedule: '24_hours'
    }
  }

  private async generateCriticalRiskResponse(context: {
    analysis: MessageSafetyAnalysis
    userPreferences: SafetyPreferences
    userId: string
    coupleId: string
  }): Promise<SafetyResponse> {
    const { analysis } = context
    
    return {
      interventionType: 'emergency_escalation',
      severity: 'emergency',
      title: 'Immediate Help Available',
      message: 'We\'re concerned about your safety and wellbeing. Please reach out for immediate professional support - you don\'t have to go through this alone.',
      suggestedActions: [
        {
          action: 'Call 988 or 911 immediately',
          description: 'Professional crisis support is available right now',
          priority: 'high',
          type: 'immediate'
        },
        {
          action: 'Go to your nearest emergency room',
          description: 'If you\'re having thoughts of self-harm, seek immediate medical attention',
          priority: 'high',
          type: 'immediate'
        },
        {
          action: 'Stay with someone you trust',
          description: 'Don\'t isolate yourself during this difficult time',
          priority: 'high',
          type: 'immediate'
        },
        {
          action: 'Remove access to harmful means',
          description: 'Create a safer environment for yourself right now',
          priority: 'high',
          type: 'immediate'
        }
      ],
      resources: [
        {
          name: 'National Suicide Prevention Lifeline',
          type: 'crisis_hotline',
          contactMethod: 'phone',
          contact: '988',
          description: 'Immediate crisis support and suicide prevention - call now',
          availability: '24/7'
        },
        {
          name: 'Emergency Services',
          type: 'crisis_hotline',
          contactMethod: 'phone',
          contact: '911',
          description: 'Emergency medical and crisis response',
          availability: '24/7'
        },
        {
          name: 'Crisis Text Line',
          type: 'crisis_hotline',
          contactMethod: 'text',
          contact: 'Text HOME to 741741',
          description: 'Immediate crisis support via text',
          availability: '24/7'
        }
      ],
      explanation: 'Critical safety indicators detected. Your safety is our highest priority and immediate professional help is recommended.',
      triggeredBy: analysis.detectedIndicators.map(i => i.description),
      userCanDisable: false,
      privacyImpact: 'high',
      followUpNeeded: true,
      escalationPath: 'emergency_services',
      reminderSchedule: 'immediate'
    }
  }

  private async logSafetyIntervention(
    response: SafetyResponse,
    analysis: MessageSafetyAnalysis,
    userId: string,
    coupleId: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('safety_interventions')
        .insert({
          user_id: userId,
          couple_id: coupleId,
          intervention_type: response.interventionType,
          risk_level_triggered: analysis.riskLevel,
          intervention_severity: response.severity,
          intervention_title: response.title,
          intervention_message: response.message,
          suggested_actions: response.suggestedActions,
          resources_provided: response.resources,
          triggered_by_keywords: analysis.triggeredKeywords,
          detection_confidence: analysis.confidenceScore,
          explanation_provided: response.explanation,
          user_can_disable: response.userCanDisable,
          follow_up_needed: response.followUpNeeded,
          escalation_triggered: response.severity === 'emergency',
          intervention_metadata: {
            privacyImpact: response.privacyImpact,
            escalationPath: response.escalationPath,
            reminderSchedule: response.reminderSchedule
          }
        })
    } catch (error) {
      console.error('Failed to log safety intervention:', error)
      // Don't throw - intervention should proceed even if logging fails
    }
  }

  // Method to get location-appropriate crisis resources
  async getLocalizedCrisisResources(userId: string): Promise<CrisisResourceSet> {
    // Get user's location (in a real implementation, this would use IP geolocation or user-provided location)
    // For now, we'll return default US resources
    
    const { data: crisisResources } = await this.supabase
      .from('crisis_resources_local')
      .select('*')
      .eq('country_code', 'US')
      .eq('is_active', true)
      .order('priority_order')

    const immediate = [
      {
        name: 'National Suicide Prevention Lifeline',
        phone: '988',
        description: '24/7 crisis support for suicide prevention'
      },
      {
        name: 'Crisis Text Line',
        text: 'HOME to 741741',
        description: 'Free crisis support via text message'
      }
    ]

    const local = crisisResources?.filter(r => r.resource_type === 'crisis_hotline' && r.region_state).map(r => ({
      name: r.resource_name,
      contact: r.phone_number || r.website_url || '',
      type: 'hotline' as const,
      description: r.description
    })) || []

    const professional = [
      {
        name: 'Licensed Therapist Directory',
        type: 'therapist' as const,
        contact: '/resources/find-therapist',
        specialization: ['couples_therapy', 'crisis_intervention'],
        description: 'Find local mental health professionals'
      }
    ]

    return { immediate, local, professional }
  }

  // Method for user to acknowledge intervention
  async acknowledgeIntervention(interventionId: string, feedback?: string): Promise<void> {
    const { error } = await this.supabase
      .from('safety_interventions')
      .update({
        user_acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        user_feedback: feedback as any
      })
      .eq('id', interventionId)

    if (error) {
      throw error
    }
  }

  // Method to disable specific intervention types (where allowed)
  async disableInterventionType(
    userId: string,
    interventionType: SafetyResponse['interventionType']
  ): Promise<boolean> {
    // Check if this intervention type can be disabled
    const disableableTypes = [
      'cooling_off_suggestion',
      'reframing_prompt',
      'guided_reflection',
      'conversation_pause'
    ]

    if (!disableableTypes.includes(interventionType)) {
      return false // Cannot disable safety-critical interventions
    }

    // Update user preferences to disable this intervention type
    // This would be implemented based on specific preference structure
    console.log(`User ${userId} disabled intervention type: ${interventionType}`)
    
    return true
  }
}

// Export singleton instance
export const graduatedSafetyResponseSystem = new GraduatedSafetyResponseSystem()

// Export types for other modules
export type { SafetyResponse, CrisisResourceSet }