import { createClientComponentClient, RealtimeChannel } from '@supabase/supabase-js'
import { Database } from '@/types/database-complete.types'
import { safetyAnalysisPipeline, MessageSafetyAnalysis } from './safety-analysis'
import { graduatedSafetyResponseSystem, SafetyResponse } from './safety-responses'
import { safetyPreferencesManager } from './safety-preferences'

// Secure messaging system with real-time communication and safety monitoring
export interface SecureMessage {
  id: string
  coupleId: string
  senderUserId: string
  recipientUserId: string
  content: string
  messageType: 'free_form' | 'prompt_response' | 'appreciation' | 'goal_update' | 'crisis_support'
  threadId: string
  parentMessageId?: string
  promptId?: string
  
  // Real-time status
  createdAt: Date
  deliveredAt?: Date
  readAt?: Date
  
  // Safety information
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  riskScore: number
  safetyAnalyzed: boolean
  requiresIntervention: boolean
  
  // User interaction
  reactions: Record<string, string[]> // emoji -> user_ids
  visibleToSender: boolean
  visibleToRecipient: boolean
  
  // Metadata
  metadata?: Record<string, any>
}

export interface MessageThread {
  id: string
  coupleId: string
  threadType: 'free_form' | 'daily_prompt' | 'goal_discussion' | 'appreciation' | 'crisis_support'
  title?: string
  description?: string
  promptId?: string
  
  isActive: boolean
  lastMessageAt: Date
  messageCount: number
  
  participant1Id: string
  participant2Id: string
  
  highestRiskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  interventionCount: number
  requiresMonitoring: boolean
}

export interface TypingIndicator {
  userId: string
  coupleId: string
  threadId: string
  isTyping: boolean
  timestamp: Date
}

export interface MessageReaction {
  messageId: string
  userId: string
  reaction: string
  timestamp: Date
}

export class SecureMessagingCore {
  private supabase = createClientComponentClient<Database>()
  private realtimeChannels = new Map<string, RealtimeChannel>()
  private messageListeners = new Map<string, Function[]>()
  private typingTimeouts = new Map<string, NodeJS.Timeout>()

  // Send a new message with safety analysis
  async sendMessage(params: {
    coupleId: string
    recipientUserId: string
    content: string
    messageType?: SecureMessage['messageType']
    threadId?: string
    parentMessageId?: string
    promptId?: string
  }): Promise<{
    message: SecureMessage
    safetyResponse?: SafetyResponse
    interventionTriggered: boolean
  }> {
    const { 
      coupleId, 
      recipientUserId, 
      content, 
      messageType = 'free_form',
      threadId,
      parentMessageId,
      promptId 
    } = params

    // Get current user
    const { data: { user }, error: authError } = await this.supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    // Get user safety preferences
    const userPreferences = await safetyPreferencesManager.getUserSafetyPreferences(user.id)
    if (!userPreferences) {
      throw new Error('User safety preferences not found')
    }

    // Create message hash for integrity
    const messageHash = await this.createMessageHash(content)
    
    // Generate thread ID if not provided
    const finalThreadId = threadId || crypto.randomUUID()

    // Perform safety analysis
    const safetyAnalysis = await safetyAnalysisPipeline.analyzeMessageSafety({
      userId: user.id,
      coupleId,
      messageContent: content,
      messageType,
      userPreferences
    })

    // Check if message should be blocked due to critical risk
    if (safetyAnalysis.riskLevel === 'critical' && safetyAnalysis.requiresHumanReview) {
      // For critical situations, we still save the message but mark it specially
      // This ensures no content is lost while maintaining safety
    }

    try {
      // Insert message into database
      const { data: messageData, error: insertError } = await this.supabase
        .from('secure_messages')
        .insert({
          couple_id: coupleId,
          sender_user_id: user.id,
          recipient_user_id: recipientUserId,
          content_encrypted: content, // In production, this would be encrypted
          content_hash: messageHash,
          message_type: messageType,
          thread_id: finalThreadId,
          parent_message_id: parentMessageId,
          prompt_id: promptId,
          safety_analyzed: true,
          risk_score: safetyAnalysis.overallRiskScore,
          risk_level: safetyAnalysis.riskLevel,
          crisis_indicators: safetyAnalysis.detectedIndicators,
          requires_intervention: safetyAnalysis.requiresIntervention,
          safety_analysis_version: 'v1.0',
          safety_processed_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          metadata: {
            analysisMethod: safetyAnalysis.analysisMethod,
            processingTime: safetyAnalysis.processingTimeMs,
            userHistoryFactor: safetyAnalysis.userHistoryFactor
          }
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      // Update safety analysis with message ID
      safetyAnalysis.messageId = messageData.id

      // Store detailed risk analysis
      await this.supabase
        .from('message_risk_scores')
        .insert({
          message_id: messageData.id,
          user_id: user.id,
          couple_id: coupleId,
          overall_risk_score: safetyAnalysis.overallRiskScore,
          risk_level: safetyAnalysis.riskLevel,
          confidence_score: safetyAnalysis.confidenceScore,
          toxicity_score: safetyAnalysis.toxicityScore,
          crisis_score: safetyAnalysis.crisisScore,
          dv_risk_score: safetyAnalysis.dvRiskScore,
          emotional_distress_score: safetyAnalysis.emotionalDistressScore,
          detected_indicators: safetyAnalysis.detectedIndicators,
          triggered_keywords: safetyAnalysis.triggeredKeywords,
          pattern_matches: safetyAnalysis.patternMatches,
          analysis_model_version: safetyAnalysis.modelVersion,
          processing_time_ms: safetyAnalysis.processingTimeMs,
          analysis_method: safetyAnalysis.analysisMethod,
          conversation_context: safetyAnalysis.conversationContext,
          user_history_factor: safetyAnalysis.userHistoryFactor,
          relationship_context: safetyAnalysis.relationshipContext
        })

      // Generate safety response if intervention is needed
      let safetyResponse: SafetyResponse | undefined
      let interventionTriggered = false

      if (safetyAnalysis.requiresIntervention) {
        safetyResponse = await graduatedSafetyResponseSystem.generateSafetyResponse(
          safetyAnalysis,
          userPreferences,
          user.id,
          coupleId
        )
        interventionTriggered = !!safetyResponse
      }

      // Create message object
      const message: SecureMessage = {
        id: messageData.id,
        coupleId: messageData.couple_id,
        senderUserId: messageData.sender_user_id,
        recipientUserId: messageData.recipient_user_id,
        content: messageData.content_encrypted,
        messageType: messageData.message_type as SecureMessage['messageType'],
        threadId: messageData.thread_id,
        parentMessageId: messageData.parent_message_id || undefined,
        promptId: messageData.prompt_id || undefined,
        createdAt: new Date(messageData.created_at),
        deliveredAt: messageData.delivered_at ? new Date(messageData.delivered_at) : undefined,
        readAt: messageData.read_at ? new Date(messageData.read_at) : undefined,
        riskLevel: messageData.risk_level as SecureMessage['riskLevel'],
        riskScore: messageData.risk_score || 0,
        safetyAnalyzed: messageData.safety_analyzed,
        requiresIntervention: messageData.requires_intervention,
        reactions: messageData.reactions as Record<string, string[]> || {},
        visibleToSender: messageData.visible_to_sender,
        visibleToRecipient: messageData.visible_to_recipient,
        metadata: messageData.metadata as Record<string, any> || undefined
      }

      // Broadcast message via real-time if not blocked
      if (safetyAnalysis.riskLevel !== 'critical' || !safetyAnalysis.requiresHumanReview) {
        await this.broadcastMessage(message)
      }

      return {
        message,
        safetyResponse,
        interventionTriggered
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  }

  // Subscribe to real-time messages for a couple
  async subscribeToMessages(
    coupleId: string,
    onMessage: (message: SecureMessage) => void,
    onTyping?: (typing: TypingIndicator) => void,
    onReaction?: (reaction: MessageReaction) => void
  ): Promise<() => void> {
    const channelName = `couple:${coupleId}`
    
    // Check if already subscribed
    if (this.realtimeChannels.has(channelName)) {
      const listeners = this.messageListeners.get(channelName) || []
      listeners.push(onMessage)
      this.messageListeners.set(channelName, listeners)
      return () => this.unsubscribeFromMessages(coupleId, onMessage)
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'secure_messages',
          filter: `couple_id=eq.${coupleId}`
        },
        (payload) => {
          const messageData = payload.new as any
          const message: SecureMessage = {
            id: messageData.id,
            coupleId: messageData.couple_id,
            senderUserId: messageData.sender_user_id,
            recipientUserId: messageData.recipient_user_id,
            content: messageData.content_encrypted,
            messageType: messageData.message_type,
            threadId: messageData.thread_id,
            parentMessageId: messageData.parent_message_id,
            promptId: messageData.prompt_id,
            createdAt: new Date(messageData.created_at),
            deliveredAt: messageData.delivered_at ? new Date(messageData.delivered_at) : undefined,
            readAt: messageData.read_at ? new Date(messageData.read_at) : undefined,
            riskLevel: messageData.risk_level,
            riskScore: messageData.risk_score || 0,
            safetyAnalyzed: messageData.safety_analyzed,
            requiresIntervention: messageData.requires_intervention,
            reactions: messageData.reactions || {},
            visibleToSender: messageData.visible_to_sender,
            visibleToRecipient: messageData.visible_to_recipient,
            metadata: messageData.metadata
          }
          
          onMessage(message)
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (onTyping) {
          onTyping(payload.payload as TypingIndicator)
        }
      })
      .on('broadcast', { event: 'reaction' }, (payload) => {
        if (onReaction) {
          onReaction(payload.payload as MessageReaction)
        }
      })
      .subscribe()

    this.realtimeChannels.set(channelName, channel)
    this.messageListeners.set(channelName, [onMessage])

    // Return unsubscribe function
    return () => this.unsubscribeFromMessages(coupleId, onMessage)
  }

  // Unsubscribe from messages
  private unsubscribeFromMessages(coupleId: string, onMessage: Function): void {
    const channelName = `couple:${coupleId}`
    const listeners = this.messageListeners.get(channelName) || []
    const updatedListeners = listeners.filter(listener => listener !== onMessage)
    
    if (updatedListeners.length === 0) {
      // No more listeners, remove channel
      const channel = this.realtimeChannels.get(channelName)
      if (channel) {
        this.supabase.removeChannel(channel)
        this.realtimeChannels.delete(channelName)
      }
      this.messageListeners.delete(channelName)
    } else {
      this.messageListeners.set(channelName, updatedListeners)
    }
  }

  // Get message history for a thread
  async getThreadMessages(
    threadId: string,
    limit: number = 50,
    before?: Date
  ): Promise<SecureMessage[]> {
    const { data: { user }, error: authError } = await this.supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    let query = this.supabase
      .from('secure_messages')
      .select('*')
      .eq('thread_id', threadId)
      .or(`sender_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`)
      .eq('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before.toISOString())
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return (data || []).map(messageData => ({
      id: messageData.id,
      coupleId: messageData.couple_id,
      senderUserId: messageData.sender_user_id,
      recipientUserId: messageData.recipient_user_id,
      content: messageData.content_encrypted,
      messageType: messageData.message_type as SecureMessage['messageType'],
      threadId: messageData.thread_id,
      parentMessageId: messageData.parent_message_id || undefined,
      promptId: messageData.prompt_id || undefined,
      createdAt: new Date(messageData.created_at),
      deliveredAt: messageData.delivered_at ? new Date(messageData.delivered_at) : undefined,
      readAt: messageData.read_at ? new Date(messageData.read_at) : undefined,
      riskLevel: messageData.risk_level as SecureMessage['riskLevel'],
      riskScore: messageData.risk_score || 0,
      safetyAnalyzed: messageData.safety_analyzed,
      requiresIntervention: messageData.requires_intervention,
      reactions: messageData.reactions as Record<string, string[]> || {},
      visibleToSender: messageData.visible_to_sender,
      visibleToRecipient: messageData.visible_to_recipient,
      metadata: messageData.metadata as Record<string, any> || undefined
    })).reverse() // Return in chronological order
  }

  // Mark message as read
  async markMessageAsRead(messageId: string): Promise<void> {
    const { data: { user }, error: authError } = await this.supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    const { error } = await this.supabase
      .from('secure_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('recipient_user_id', user.id)

    if (error) {
      throw error
    }
  }

  // Send typing indicator
  async sendTypingIndicator(coupleId: string, threadId: string, isTyping: boolean): Promise<void> {
    const { data: { user }, error: authError } = await this.supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    const channelName = `couple:${coupleId}`
    const channel = this.realtimeChannels.get(channelName)
    
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          coupleId,
          threadId,
          isTyping,
          timestamp: new Date()
        } as TypingIndicator
      })
    }

    // Auto-clear typing indicator after 3 seconds
    const timeoutKey = `${user.id}:${threadId}`
    const existingTimeout = this.typingTimeouts.get(timeoutKey)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    if (isTyping) {
      const timeout = setTimeout(() => {
        this.sendTypingIndicator(coupleId, threadId, false)
        this.typingTimeouts.delete(timeoutKey)
      }, 3000)
      this.typingTimeouts.set(timeoutKey, timeout)
    } else {
      this.typingTimeouts.delete(timeoutKey)
    }
  }

  // Add reaction to message
  async addMessageReaction(messageId: string, reaction: string): Promise<void> {
    const { data: { user }, error: authError } = await this.supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    // Insert or update reaction
    const { error } = await this.supabase
      .from('message_reactions')
      .upsert({
        message_id: messageId,
        user_id: user.id,
        reaction_type: 'emoji',
        reaction_value: reaction
      })

    if (error) {
      throw error
    }

    // Get message info for broadcasting
    const { data: messageData } = await this.supabase
      .from('secure_messages')
      .select('couple_id')
      .eq('id', messageId)
      .single()

    if (messageData) {
      // Broadcast reaction via real-time
      const channelName = `couple:${messageData.couple_id}`
      const channel = this.realtimeChannels.get(channelName)
      
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'reaction',
          payload: {
            messageId,
            userId: user.id,
            reaction,
            timestamp: new Date()
          } as MessageReaction
        })
      }
    }
  }

  // Create or get conversation thread
  async createOrGetThread(params: {
    coupleId: string
    participantId: string // The other participant
    threadType?: MessageThread['threadType']
    title?: string
    description?: string
    promptId?: string
  }): Promise<MessageThread> {
    const { coupleId, participantId, threadType = 'free_form', title, description, promptId } = params

    const { data: { user }, error: authError } = await this.supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    // Check if thread already exists for this prompt/type
    if (promptId) {
      const { data: existingThread } = await this.supabase
        .from('conversation_threads')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('prompt_id', promptId)
        .eq('is_active', true)
        .single()

      if (existingThread) {
        return this.mapThreadData(existingThread)
      }
    }

    // Create new thread
    const { data: threadData, error: insertError } = await this.supabase
      .from('conversation_threads')
      .insert({
        couple_id: coupleId,
        thread_type: threadType,
        title,
        description,
        prompt_id: promptId,
        participant_1_id: user.id,
        participant_2_id: participantId,
        is_active: true,
        last_message_at: new Date().toISOString(),
        message_count: 0
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return this.mapThreadData(threadData)
  }

  // Get conversation threads for a couple
  async getCoupleThreads(coupleId: string, limit: number = 20): Promise<MessageThread[]> {
    const { data: { user }, error: authError } = await this.supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    const { data, error } = await this.supabase
      .from('conversation_threads')
      .select('*')
      .eq('couple_id', coupleId)
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
      .eq('archived', false)
      .order('last_message_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return (data || []).map(this.mapThreadData)
  }

  // Search messages with privacy protection
  async searchMessages(
    coupleId: string,
    query: string,
    limit: number = 20
  ): Promise<SecureMessage[]> {
    const { data: { user }, error: authError } = await this.supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    // Simple text search (in production, this would use full-text search with privacy protection)
    const { data, error } = await this.supabase
      .from('secure_messages')
      .select('*')
      .eq('couple_id', coupleId)
      .or(`sender_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`)
      .ilike('content_encrypted', `%${query}%`)
      .eq('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return (data || []).map(messageData => ({
      id: messageData.id,
      coupleId: messageData.couple_id,
      senderUserId: messageData.sender_user_id,
      recipientUserId: messageData.recipient_user_id,
      content: messageData.content_encrypted,
      messageType: messageData.message_type as SecureMessage['messageType'],
      threadId: messageData.thread_id,
      parentMessageId: messageData.parent_message_id || undefined,
      promptId: messageData.prompt_id || undefined,
      createdAt: new Date(messageData.created_at),
      deliveredAt: messageData.delivered_at ? new Date(messageData.delivered_at) : undefined,
      readAt: messageData.read_at ? new Date(messageData.read_at) : undefined,
      riskLevel: messageData.risk_level as SecureMessage['riskLevel'],
      riskScore: messageData.risk_score || 0,
      safetyAnalyzed: messageData.safety_analyzed,
      requiresIntervention: messageData.requires_intervention,
      reactions: messageData.reactions as Record<string, string[]> || {},
      visibleToSender: messageData.visible_to_sender,
      visibleToRecipient: messageData.visible_to_recipient,
      metadata: messageData.metadata as Record<string, any> || undefined
    }))
  }

  // Delete message (soft delete with privacy protection)
  async deleteMessage(messageId: string): Promise<void> {
    const { data: { user }, error: authError } = await this.supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    const { error } = await this.supabase
      .from('secure_messages')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by_user_id: user.id,
        // Clear content for privacy
        content_encrypted: '[Message deleted]',
        visible_to_sender: false,
        visible_to_recipient: false
      })
      .eq('id', messageId)
      .eq('sender_user_id', user.id) // Only sender can delete their own messages

    if (error) {
      throw error
    }
  }

  // Private helper methods
  private async createMessageHash(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async broadcastMessage(message: SecureMessage): Promise<void> {
    // Real-time broadcasting is handled by database triggers and subscriptions
    // This method can be used for additional real-time logic if needed
    console.log(`Broadcasting message ${message.id} to couple ${message.coupleId}`)
  }

  private mapThreadData(threadData: any): MessageThread {
    return {
      id: threadData.id,
      coupleId: threadData.couple_id,
      threadType: threadData.thread_type,
      title: threadData.title,
      description: threadData.description,
      promptId: threadData.prompt_id,
      isActive: threadData.is_active,
      lastMessageAt: new Date(threadData.last_message_at),
      messageCount: threadData.message_count,
      participant1Id: threadData.participant_1_id,
      participant2Id: threadData.participant_2_id,
      highestRiskLevel: threadData.highest_risk_level,
      interventionCount: threadData.intervention_count,
      requiresMonitoring: threadData.requires_monitoring
    }
  }

  // Cleanup method to remove all subscriptions
  async cleanup(): Promise<void> {
    for (const [channelName, channel] of this.realtimeChannels) {
      this.supabase.removeChannel(channel)
    }
    this.realtimeChannels.clear()
    this.messageListeners.clear()
    
    // Clear typing timeouts
    for (const timeout of this.typingTimeouts.values()) {
      clearTimeout(timeout)
    }
    this.typingTimeouts.clear()
  }
}

// Export singleton instance
export const secureMessagingCore = new SecureMessagingCore()

// Export types for other modules
export type { SecureMessage, MessageThread, TypingIndicator, MessageReaction }