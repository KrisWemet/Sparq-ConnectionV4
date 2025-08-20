// Enhanced Safe Messaging System
// Real-time messaging with safety monitoring, mood indicators, and conversation threading

import { CrisisResourceIntegrator } from '@/lib/safety-resources/crisis-integration'
import { agentOrchestrator } from '@/lib/agents/agent-orchestration'
import { UserLocation } from '@/lib/safety-resources/location-matcher'

export interface SafeMessage {
  id: string
  coupleId: string
  senderId: string
  receiverId: string
  content: string
  encryptedContent: string
  
  metadata: {
    sentAt: Date
    threadId?: string
    promptId?: string // If related to daily prompt
    mood?: MoodIndicator
    safetyFlags: SafetyFlag[]
    processingTime: number
  }
  
  safetyAnalysis: {
    riskLevel: 'safe' | 'caution' | 'concern' | 'crisis'
    triggers: string[]
    recommendations: string[]
    resourcesProvided: boolean
    interventionRequired: boolean
    transparencyNote: string
  }
  
  status: 'sending' | 'delivered' | 'read' | 'flagged' | 'blocked'
}

export interface MoodIndicator {
  primary: 'happy' | 'sad' | 'angry' | 'anxious' | 'excited' | 'frustrated' | 'loving' | 'neutral'
  intensity: 1 | 2 | 3 | 4 | 5
  context?: string
  timestamp: Date
}

export interface SafetyFlag {
  type: 'keyword' | 'pattern' | 'escalation' | 'frequency' | 'tone'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  confidence: number
  triggered: Date
}

export interface ConversationThread {
  id: string
  coupleId: string
  title: string
  promptId?: string // If thread started from daily prompt
  startedAt: Date
  lastActivity: Date
  messageCount: number
  participants: string[]
  safetyStatus: 'safe' | 'monitoring' | 'concern' | 'intervention'
  mood: {
    overall: string
    trajectory: 'improving' | 'stable' | 'declining'
    lastUpdated: Date
  }
}

export interface MessagingPreferences {
  userId: string
  safetyMonitoring: {
    enabled: boolean
    level: 'basic' | 'standard' | 'enhanced'
    autoResources: boolean
    partnerNotifications: boolean // Careful with DV scenarios
  }
  privacy: {
    messageRetention: number // days
    searchable: boolean
    exportable: boolean
    shareAnalytics: boolean
  }
  notifications: {
    moodChanges: boolean
    safetyAlerts: boolean
    resourceSuggestions: boolean
    promptReminders: boolean
  }
}

export interface SafetyResponse {
  type: 'suggestion' | 'resource' | 'intervention' | 'escalation'
  message: string
  resources?: Array<{
    title: string
    description: string
    contactMethod: string
    availability: string
  }>
  suggestedActions?: string[]
  followUpRequired: boolean
  documentationRequired: boolean
}

export class EnhancedSafeMessagingSystem {
  private encryptionKey: string
  private safetyCache = new Map<string, any>()
  private moodTracker = new Map<string, MoodIndicator[]>()
  private activeThreads = new Map<string, ConversationThread>()

  constructor(encryptionKey: string) {
    this.encryptionKey = encryptionKey
  }

  /**
   * Send a message with comprehensive safety analysis
   */
  async sendSafeMessage(
    content: string,
    senderId: string,
    receiverId: string,
    coupleId: string,
    options: {
      threadId?: string
      promptId?: string
      mood?: MoodIndicator
      userLocation: UserLocation
      preferences: MessagingPreferences
    }
  ): Promise<{
    message: SafeMessage
    safetyResponse?: SafetyResponse
    blocked: boolean
  }> {
    const startTime = Date.now()

    // Step 1: Create message structure
    const messageId = `msg_${Date.now()}_${senderId}`
    const encryptedContent = await this.encryptMessage(content)

    // Step 2: Safety analysis
    const safetyAnalysis = await this.performSafetyAnalysis(
      content,
      senderId,
      coupleId,
      options.userLocation,
      options.preferences
    )

    // Step 3: Determine if message should be blocked
    const shouldBlock = safetyAnalysis.riskLevel === 'crisis' && 
                       safetyAnalysis.interventionRequired &&
                       options.preferences.safetyMonitoring.enabled

    // Step 4: Create safe message
    const safeMessage: SafeMessage = {
      id: messageId,
      coupleId,
      senderId,
      receiverId,
      content: shouldBlock ? '[Message flagged for review]' : content,
      encryptedContent,
      metadata: {
        sentAt: new Date(),
        threadId: options.threadId,
        promptId: options.promptId,
        mood: options.mood,
        safetyFlags: safetyAnalysis.flags,
        processingTime: Date.now() - startTime
      },
      safetyAnalysis: {
        riskLevel: safetyAnalysis.riskLevel,
        triggers: safetyAnalysis.triggers,
        recommendations: safetyAnalysis.recommendations,
        resourcesProvided: safetyAnalysis.resourcesProvided,
        interventionRequired: safetyAnalysis.interventionRequired,
        transparencyNote: this.generateTransparencyNote(safetyAnalysis)
      },
      status: shouldBlock ? 'flagged' : 'sending'
    }

    // Step 5: Generate safety response if needed
    let safetyResponse: SafetyResponse | undefined

    if (safetyAnalysis.riskLevel !== 'safe') {
      safetyResponse = await this.generateSafetyResponse(
        safetyAnalysis,
        options.userLocation,
        options.preferences
      )
    }

    // Step 6: Update thread and mood tracking
    if (options.threadId) {
      await this.updateConversationThread(options.threadId, safeMessage)
    }

    if (options.mood) {
      this.trackMoodChange(senderId, options.mood)
    }

    // Step 7: Log for transparency
    await this.logSafetyEvent(safeMessage, safetyAnalysis, safetyResponse)

    return {
      message: safeMessage,
      safetyResponse,
      blocked: shouldBlock
    }
  }

  /**
   * Comprehensive safety analysis using agent orchestration
   */
  private async performSafetyAnalysis(
    content: string,
    senderId: string,
    coupleId: string,
    userLocation: UserLocation,
    preferences: MessagingPreferences
  ) {
    try {
      // Use agent orchestration for comprehensive analysis
      const orchestrationResult = await agentOrchestrator.orchestrate(content, {
        userId: senderId,
        coupleId,
        type: 'general',
        additionalContext: {
          messageContext: true,
          recentMoods: this.moodTracker.get(senderId)?.slice(-5),
          preferences
        }
      })

      // Extract safety information from orchestration results
      const safetyResult = orchestrationResult.results.find(r => r.agentType === 'safety')?.result
      const complianceResult = orchestrationResult.results.find(r => r.agentType === 'compliance')?.result

      // Generate safety flags
      const flags: SafetyFlag[] = []
      if (safetyResult?.crisisIndicators) {
        flags.push(...safetyResult.crisisIndicators.map((indicator: any) => ({
          type: indicator.type,
          severity: indicator.severity,
          description: indicator.description,
          confidence: indicator.confidence,
          triggered: new Date()
        })))
      }

      // Determine if crisis resource integration is needed
      let resourcesProvided = false
      if (safetyResult?.safetyLevel === 'crisis' || safetyResult?.safetyLevel === 'concern') {
        const crisisIntegration = await CrisisResourceIntegrator.integrateCrisisWithResources(
          content,
          senderId,
          userLocation,
          coupleId
        )
        resourcesProvided = crisisIntegration.resourceMatches.length > 0
      }

      return {
        riskLevel: this.mapSafetyLevel(safetyResult?.safetyLevel),
        triggers: safetyResult?.crisisIndicators?.map((i: any) => i.triggeredBy) || [],
        recommendations: orchestrationResult.finalDecision.requiredActions,
        flags,
        resourcesProvided,
        interventionRequired: safetyResult?.requiresImmediateIntervention || false,
        complianceIssues: complianceResult?.issues || []
      }

    } catch (error) {
      console.error('Safety analysis failed:', error)
      
      // Fallback safety analysis
      return this.fallbackSafetyAnalysis(content)
    }
  }

  /**
   * Generate appropriate safety response based on analysis
   */
  private async generateSafetyResponse(
    safetyAnalysis: any,
    userLocation: UserLocation,
    preferences: MessagingPreferences
  ): Promise<SafetyResponse> {
    
    if (safetyAnalysis.riskLevel === 'crisis') {
      // Crisis response with immediate resources
      const crisisIntegration = await CrisisResourceIntegrator.integrateCrisisWithResources(
        'crisis detected in messaging',
        'current_user',
        userLocation
      )

      return {
        type: 'intervention',
        message: 'We\'ve detected concerning content in your message. Immediate support resources are available.',
        resources: crisisIntegration.resourceMatches.slice(0, 3).map(match => ({
          title: match.resource.name,
          description: match.resource.description,
          contactMethod: match.resource.contactMethods[0]?.label || 'Contact available',
          availability: match.resource.availability.schedule
        })),
        suggestedActions: [
          'Consider reaching out to a crisis professional',
          'Use the safety planning tools if helpful',
          'Remember that support is available 24/7'
        ],
        followUpRequired: true,
        documentationRequired: true
      }
    }

    if (safetyAnalysis.riskLevel === 'concern') {
      return {
        type: 'resource',
        message: 'We noticed some concerning patterns. Here are some resources that might be helpful.',
        resources: [
          {
            title: 'Crisis Text Line',
            description: '24/7 crisis support via text',
            contactMethod: 'Text HOME to 741741',
            availability: '24/7'
          },
          {
            title: 'Relationship Support',
            description: 'Professional relationship counseling resources',
            contactMethod: 'View directory',
            availability: 'Varies'
          }
        ],
        suggestedActions: [
          'Consider taking a break from the conversation',
          'Practice some grounding techniques',
          'Reach out to support if needed'
        ],
        followUpRequired: false,
        documentationRequired: true
      }
    }

    // Caution level - gentle suggestions
    return {
      type: 'suggestion',
      message: 'It might be helpful to take a moment to breathe and reflect before continuing this conversation.',
      suggestedActions: [
        'Try using "I" statements to express feelings',
        'Consider your partner\'s perspective',
        'Take a break if emotions are high'
      ],
      followUpRequired: false,
      documentationRequired: false
    }
  }

  /**
   * Create or update conversation thread
   */
  async createOrUpdateThread(
    coupleId: string,
    title: string,
    promptId?: string
  ): Promise<ConversationThread> {
    const threadId = `thread_${Date.now()}_${coupleId}`
    
    const thread: ConversationThread = {
      id: threadId,
      coupleId,
      title,
      promptId,
      startedAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      participants: [], // Will be populated when messages are sent
      safetyStatus: 'safe',
      mood: {
        overall: 'neutral',
        trajectory: 'stable',
        lastUpdated: new Date()
      }
    }

    this.activeThreads.set(threadId, thread)
    return thread
  }

  /**
   * Update conversation thread with new message
   */
  private async updateConversationThread(threadId: string, message: SafeMessage) {
    const thread = this.activeThreads.get(threadId)
    if (!thread) return

    thread.lastActivity = new Date()
    thread.messageCount++
    
    if (!thread.participants.includes(message.senderId)) {
      thread.participants.push(message.senderId)
    }

    // Update safety status based on message
    if (message.safetyAnalysis.riskLevel === 'crisis') {
      thread.safetyStatus = 'intervention'
    } else if (message.safetyAnalysis.riskLevel === 'concern') {
      thread.safetyStatus = 'concern'
    } else if (message.safetyAnalysis.riskLevel === 'caution') {
      thread.safetyStatus = 'monitoring'
    }

    // Update mood trajectory
    if (message.metadata.mood) {
      this.updateThreadMood(thread, message.metadata.mood)
    }

    this.activeThreads.set(threadId, thread)
  }

  /**
   * Track mood changes for pattern analysis
   */
  private trackMoodChange(userId: string, mood: MoodIndicator) {
    const userMoods = this.moodTracker.get(userId) || []
    userMoods.push(mood)
    
    // Keep only last 50 mood entries
    if (userMoods.length > 50) {
      userMoods.splice(0, userMoods.length - 50)
    }
    
    this.moodTracker.set(userId, userMoods)
  }

  /**
   * Update thread mood based on message mood
   */
  private updateThreadMood(thread: ConversationThread, mood: MoodIndicator) {
    const positiveMoods = ['happy', 'excited', 'loving']
    const negativeMoods = ['sad', 'angry', 'frustrated', 'anxious']
    
    if (positiveMoods.includes(mood.primary)) {
      thread.mood.trajectory = 'improving'
    } else if (negativeMoods.includes(mood.primary) && mood.intensity >= 3) {
      thread.mood.trajectory = 'declining'
    } else {
      thread.mood.trajectory = 'stable'
    }
    
    thread.mood.lastUpdated = new Date()
  }

  /**
   * Search messages with privacy controls
   */
  async searchMessages(
    coupleId: string,
    query: string,
    userId: string,
    options: {
      dateRange?: { start: Date; end: Date }
      threadId?: string
      moodFilter?: string
      safetyLevel?: string
    }
  ): Promise<SafeMessage[]> {
    // This would implement the actual search functionality
    // For now, returning empty array with privacy note
    console.log('Searching messages with privacy controls:', {
      coupleId,
      query,
      userId,
      options,
      privacyNote: 'Search results filtered based on user privacy preferences'
    })
    
    return []
  }

  /**
   * Export messages for data portability
   */
  async exportMessages(
    coupleId: string,
    userId: string,
    preferences: MessagingPreferences
  ): Promise<{
    data: any[]
    format: 'json' | 'csv'
    privacyNote: string
  }> {
    if (!preferences.privacy.exportable) {
      throw new Error('Message export is disabled in privacy settings')
    }

    // This would implement the actual export functionality
    return {
      data: [],
      format: 'json',
      privacyNote: 'Export includes only messages you have permission to export'
    }
  }

  // Helper methods

  private async encryptMessage(content: string): Promise<string> {
    // Implement actual encryption
    // For now, returning base64 encoding as placeholder
    return Buffer.from(content).toString('base64')
  }

  private async decryptMessage(encryptedContent: string): Promise<string> {
    // Implement actual decryption
    // For now, returning base64 decoding as placeholder
    return Buffer.from(encryptedContent, 'base64').toString()
  }

  private mapSafetyLevel(aiLevel: string): SafeMessage['safetyAnalysis']['riskLevel'] {
    switch (aiLevel) {
      case 'critical': return 'crisis'
      case 'high': return 'concern'
      case 'medium': return 'caution'
      default: return 'safe'
    }
  }

  private generateTransparencyNote(safetyAnalysis: any): string {
    if (safetyAnalysis.riskLevel === 'safe') {
      return 'Your message was analyzed for safety and no concerns were detected.'
    }

    return `Your message was analyzed for safety. We detected ${safetyAnalysis.riskLevel} level indicators and ${
      safetyAnalysis.resourcesProvided ? 'provided relevant resources' : 'are monitoring the situation'
    }. This analysis helps us provide appropriate support when needed.`
  }

  private fallbackSafetyAnalysis(content: string) {
    // Basic keyword-based fallback analysis
    const criticalKeywords = ['want to die', 'kill myself', 'suicide', 'end it all']
    const concernKeywords = ['hopeless', 'worthless', 'can\'t take it', 'giving up']
    
    const hasCritical = criticalKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    )
    const hasConcern = concernKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    )

    return {
      riskLevel: hasCritical ? 'crisis' : hasConcern ? 'concern' : 'safe',
      triggers: hasCritical ? criticalKeywords.filter(k => content.includes(k)) : 
                hasConcern ? concernKeywords.filter(k => content.includes(k)) : [],
      recommendations: hasCritical ? ['Immediate professional support needed'] : 
                       hasConcern ? ['Consider reaching out for support'] : [],
      flags: [],
      resourcesProvided: false,
      interventionRequired: hasCritical,
      complianceIssues: []
    }
  }

  private async logSafetyEvent(
    message: SafeMessage,
    safetyAnalysis: any,
    safetyResponse?: SafetyResponse
  ) {
    // Log safety events for transparency and monitoring
    const logEntry = {
      messageId: message.id,
      timestamp: new Date(),
      riskLevel: safetyAnalysis.riskLevel,
      triggersDetected: safetyAnalysis.triggers.length,
      responseProvided: !!safetyResponse,
      interventionRequired: safetyAnalysis.interventionRequired,
      resourcesProvided: safetyAnalysis.resourcesProvided
    }

    console.log('Safety event logged:', logEntry)
    
    // In a real implementation, this would be stored in the database
    // with appropriate privacy protections
  }
}

// Mood indicator helpers
export const MOOD_INDICATORS = {
  happy: { color: '#22c55e', description: 'Feeling happy and positive' },
  sad: { color: '#3b82f6', description: 'Feeling sad or down' },
  angry: { color: '#ef4444', description: 'Feeling angry or frustrated' },
  anxious: { color: '#f59e0b', description: 'Feeling anxious or worried' },
  excited: { color: '#8b5cf6', description: 'Feeling excited and energetic' },
  frustrated: { color: '#f97316', description: 'Feeling frustrated or annoyed' },
  loving: { color: '#ec4899', description: 'Feeling loving and affectionate' },
  neutral: { color: '#6b7280', description: 'Feeling neutral or calm' }
}

export function createMoodIndicator(
  primary: MoodIndicator['primary'],
  intensity: MoodIndicator['intensity'],
  context?: string
): MoodIndicator {
  return {
    primary,
    intensity,
    context,
    timestamp: new Date()
  }
}

// Export factory function
export function createSafeMessagingSystem(encryptionKey: string) {
  return new EnhancedSafeMessagingSystem(encryptionKey)
}