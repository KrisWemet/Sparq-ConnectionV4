'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  Send, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Eye, 
  EyeOff,
  Heart,
  Smile,
  ThumbsUp,
  Settings,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  secureMessagingCore, 
  SecureMessage, 
  TypingIndicator, 
  MessageReaction 
} from '@/lib/messaging/secure-messaging-core'
import { SafetyResponse } from '@/lib/messaging/safety-responses'
import { RiskDetectionAlert } from './RiskDetectionAlert'
import { SafetyTransparencyLog } from './SafetyTransparencyLog'
import { CrisisResourcesModal } from './CrisisResourcesModal'

interface SafeMessagingInterfaceProps {
  coupleId: string
  partnerId: string
  currentUserId: string
  threadId?: string
  className?: string
}

export function SafeMessagingInterface({
  coupleId,
  partnerId,
  currentUserId,
  threadId,
  className
}: SafeMessagingInterfaceProps) {
  // State management
  const [messages, setMessages] = useState<SecureMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [safetyResponse, setSafetyResponse] = useState<SafetyResponse | null>(null)
  const [showTransparencyLog, setShowTransparencyLog] = useState(false)
  const [showCrisisResources, setShowCrisisResources] = useState(false)
  const [showRiskScores, setShowRiskScores] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load initial messages
  useEffect(() => {
    if (threadId) {
      loadMessages()
    }
  }, [threadId])

  // Subscribe to real-time messages
  useEffect(() => {
    const unsubscribe = secureMessagingCore.subscribeToMessages(
      coupleId,
      handleNewMessage,
      handleTypingIndicator,
      handleReaction
    )

    return () => {
      unsubscribe()
    }
  }, [coupleId])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const loadMessages = async () => {
    if (!threadId) return
    
    try {
      const threadMessages = await secureMessagingCore.getThreadMessages(threadId, 50)
      setMessages(threadMessages)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleNewMessage = useCallback((message: SecureMessage) => {
    setMessages(prev => [...prev, message])
    
    // Mark as read if it's from partner
    if (message.senderUserId !== currentUserId) {
      secureMessagingCore.markMessageAsRead(message.id).catch(console.error)
    }
  }, [currentUserId])

  const handleTypingIndicator = useCallback((typing: TypingIndicator) => {
    if (typing.userId !== currentUserId) {
      setPartnerTyping(typing.isTyping)
    }
  }, [currentUserId])

  const handleReaction = useCallback((reaction: MessageReaction) => {
    setMessages(prev => prev.map(msg => 
      msg.id === reaction.messageId
        ? {
            ...msg,
            reactions: {
              ...msg.reactions,
              [reaction.reaction]: [
                ...(msg.reactions[reaction.reaction] || []).filter(id => id !== reaction.userId),
                reaction.userId
              ]
            }
          }
        : msg
    ))
  }, [])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    setSafetyResponse(null)

    try {
      const result = await secureMessagingCore.sendMessage({
        coupleId,
        recipientUserId: partnerId,
        content: newMessage,
        threadId
      })

      // Clear the message
      setNewMessage('')
      
      // Handle safety response if intervention was triggered
      if (result.interventionTriggered && result.safetyResponse) {
        setSafetyResponse(result.safetyResponse)
      }

      // Update messages
      setMessages(prev => [...prev, result.message])

    } catch (error) {
      console.error('Failed to send message:', error)
      // Show error to user
    } finally {
      setIsSending(false)
    }
  }

  const handleTyping = useCallback((value: string) => {
    setNewMessage(value)

    // Send typing indicator
    if (value.length > 0 && !isTyping) {
      setIsTyping(true)
      secureMessagingCore.sendTypingIndicator(coupleId, threadId || '', true)
    } else if (value.length === 0 && isTyping) {
      setIsTyping(false)
      secureMessagingCore.sendTypingIndicator(coupleId, threadId || '', false)
    }

    // Auto-stop typing after delay
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false)
        secureMessagingCore.sendTypingIndicator(coupleId, threadId || '', false)
      }
    }, 2000)
  }, [coupleId, threadId, isTyping])

  const handleReactToMessage = async (messageId: string, reaction: string) => {
    try {
      await secureMessagingCore.addMessageReaction(messageId, reaction)
    } catch (error) {
      console.error('Failed to add reaction:', error)
    }
  }

  const getRiskLevelColor = (riskLevel: SecureMessage['riskLevel']) => {
    switch (riskLevel) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      case 'safe': return 'outline'
      default: return 'outline'
    }
  }

  const getRiskLevelIcon = (riskLevel: SecureMessage['riskLevel']) => {
    switch (riskLevel) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-3 w-3" />
      case 'medium':
        return <Info className="h-3 w-3" />
      case 'low':
        return <Eye className="h-3 w-3" />
      case 'safe':
      default:
        return <CheckCircle className="h-3 w-3" />
    }
  }

  return (
    <div className={cn("flex flex-col h-[600px] max-w-4xl mx-auto", className)}>
      <Card className="flex-1 flex flex-col">
        {/* Header */}
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-green-600" />
              Safe Messaging
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRiskScores(!showRiskScores)}
              >
                {showRiskScores ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Risk Scores
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTransparencyLog(true)}
              >
                <Settings className="h-4 w-4" />
                Privacy Log
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Your messages are monitored for safety with your explicit consent.
          </div>
        </CardHeader>

        <Separator />

        {/* Safety Response Alert */}
        {safetyResponse && (
          <div className="p-4 border-b">
            <RiskDetectionAlert 
              safetyResponse={safetyResponse}
              onDismiss={() => setSafetyResponse(null)}
              onAccessCrisisResources={() => setShowCrisisResources(true)}
            />
          </div>
        )}

        {/* Messages Area */}
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col gap-2",
                    message.senderUserId === currentUserId ? "items-end" : "items-start"
                  )}
                >
                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg px-4 py-2 text-sm",
                      message.senderUserId === currentUserId
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
                    {/* Message Metadata */}
                    <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                      <span>
                        {message.createdAt.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      
                      {showRiskScores && message.riskLevel !== 'safe' && (
                        <Badge 
                          variant={getRiskLevelColor(message.riskLevel)}
                          className="text-xs px-1 py-0 h-4"
                        >
                          {getRiskLevelIcon(message.riskLevel)}
                          {message.riskLevel}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Reactions */}
                  {Object.keys(message.reactions).length > 0 && (
                    <div className="flex items-center gap-1 ml-2">
                      {Object.entries(message.reactions).map(([emoji, userIds]) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleReactToMessage(message.id, emoji)}
                        >
                          {emoji} {userIds.length}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Quick Reactions */}
                  {message.senderUserId !== currentUserId && (
                    <div className="flex items-center gap-1 ml-2 opacity-50 hover:opacity-100">
                      {['❤️', '👍', '😊'].map((emoji) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-xs"
                          onClick={() => handleReactToMessage(message.id, emoji)}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Partner Typing Indicator */}
              {partnerTyping && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  Partner is typing...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>

        <Separator />

        {/* Message Input */}
        <div className="p-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                placeholder="Type a message... (monitored for safety)"
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                className="min-h-[60px] resize-none"
                disabled={isSending}
              />
              
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>Messages are analyzed for safety with your consent</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowCrisisResources(true)}
                  >
                    Need help?
                  </Button>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              size="lg"
              className="self-end"
            >
              {isSending ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <SafetyTransparencyLog
        open={showTransparencyLog}
        onClose={() => setShowTransparencyLog(false)}
        userId={currentUserId}
      />

      <CrisisResourcesModal
        open={showCrisisResources}
        onClose={() => setShowCrisisResources(false)}
        userId={currentUserId}
      />
    </div>
  )
}