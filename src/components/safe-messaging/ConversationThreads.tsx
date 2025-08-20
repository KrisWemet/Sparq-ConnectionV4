'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  MessageSquare, 
  Plus, 
  Calendar, 
  Users, 
  AlertTriangle,
  Heart,
  Target,
  Lightbulb,
  Shield,
  Clock,
  Eye,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  secureMessagingCore, 
  MessageThread 
} from '@/lib/messaging/secure-messaging-core'

interface ConversationThreadsProps {
  coupleId: string
  currentUserId: string
  partnerId: string
  onThreadSelect: (threadId: string) => void
  selectedThreadId?: string
  className?: string
}

export function ConversationThreads({
  coupleId,
  currentUserId,
  partnerId,
  onThreadSelect,
  selectedThreadId,
  className
}: ConversationThreadsProps) {
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadThreads()
  }, [coupleId])

  const loadThreads = async () => {
    setLoading(true)
    try {
      const coupleThreads = await secureMessagingCore.getCoupleThreads(coupleId, 20)
      setThreads(coupleThreads)
    } catch (error) {
      console.error('Failed to load conversation threads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNewThread = async (threadType: MessageThread['threadType'] = 'free_form') => {
    try {
      const newThread = await secureMessagingCore.createOrGetThread({
        coupleId,
        participantId: partnerId,
        threadType,
        title: getThreadTypeTitle(threadType)
      })
      
      await loadThreads() // Refresh the list
      onThreadSelect(newThread.id)
    } catch (error) {
      console.error('Failed to create new thread:', error)
    }
  }

  const getThreadTypeTitle = (type: MessageThread['threadType']): string => {
    switch (type) {
      case 'daily_prompt': return 'Daily Connection Prompt'
      case 'goal_discussion': return 'Relationship Goals'
      case 'appreciation': return 'Appreciation & Gratitude'
      case 'crisis_support': return 'Support Conversation'
      case 'free_form': default: return 'Open Conversation'
    }
  }

  const getThreadTypeIcon = (type: MessageThread['threadType']) => {
    switch (type) {
      case 'daily_prompt': return <Lightbulb className="h-4 w-4 text-yellow-600" />
      case 'goal_discussion': return <Target className="h-4 w-4 text-blue-600" />
      case 'appreciation': return <Heart className="h-4 w-4 text-pink-600" />
      case 'crisis_support': return <Shield className="h-4 w-4 text-red-600" />
      case 'free_form': default: return <MessageSquare className="h-4 w-4 text-green-600" />
    }
  }

  const getThreadTypeColor = (type: MessageThread['threadType']) => {
    switch (type) {
      case 'daily_prompt': return 'bg-yellow-50 border-yellow-200'
      case 'goal_discussion': return 'bg-blue-50 border-blue-200'
      case 'appreciation': return 'bg-pink-50 border-pink-200'
      case 'crisis_support': return 'bg-red-50 border-red-200'
      case 'free_form': default: return 'bg-green-50 border-green-200'
    }
  }

  const getRiskLevelBadge = (riskLevel: MessageThread['highestRiskLevel']) => {
    if (riskLevel === 'safe') return null
    
    const colors = {
      low: 'bg-yellow-100 text-yellow-800',
      medium: 'bg-orange-100 text-orange-800',
      high: 'bg-red-100 text-red-800',
      critical: 'bg-red-200 text-red-900'
    }

    return (
      <Badge variant="outline" className={cn("text-xs", colors[riskLevel])}>
        {riskLevel} risk
      </Badge>
    )
  }

  const formatLastMessage = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Conversations
          </CardTitle>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCreateNewThread()}
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      </CardHeader>

      <Separator />

      {/* Quick Thread Creation */}
      <div className="p-4 border-b">
        <div className="text-xs font-medium text-muted-foreground mb-2">Start a conversation:</div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start h-8 text-xs"
            onClick={() => handleCreateNewThread('appreciation')}
          >
            <Heart className="h-3 w-3 mr-1" />
            Appreciate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start h-8 text-xs"
            onClick={() => handleCreateNewThread('goal_discussion')}
          >
            <Target className="h-3 w-3 mr-1" />
            Goals
          </Button>
        </div>
      </div>

      {/* Thread List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              Loading conversations...
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">No conversations yet</div>
              <div className="text-xs">Start your first conversation above</div>
            </div>
          ) : (
            threads.map((thread) => (
              <Card
                key={thread.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50 border-l-4",
                  selectedThreadId === thread.id 
                    ? "ring-2 ring-primary ring-offset-2" 
                    : "",
                  getThreadTypeColor(thread.threadType)
                )}
                onClick={() => onThreadSelect(thread.id)}
              >
                <CardContent className="p-3">
                  <div className="space-y-2">
                    {/* Thread Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getThreadTypeIcon(thread.threadType)}
                        <div>
                          <div className="font-medium text-sm">
                            {thread.title || getThreadTypeTitle(thread.threadType)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {thread.threadType.replace(/_/g, ' ')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {getRiskLevelBadge(thread.highestRiskLevel)}
                        {thread.requiresMonitoring && (
                          <Badge variant="outline" className="text-xs bg-blue-50">
                            <Eye className="h-3 w-3 mr-1" />
                            Monitored
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Thread Description */}
                    {thread.description && (
                      <div className="text-xs text-muted-foreground">
                        {thread.description}
                      </div>
                    )}

                    {/* Thread Stats */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {thread.messageCount} messages
                        </div>
                        
                        {thread.interventionCount > 0 && (
                          <div className="flex items-center gap-1 text-orange-600">
                            <Shield className="h-3 w-3" />
                            {thread.interventionCount} interventions
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatLastMessage(thread.lastMessageAt)}
                      </div>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          thread.isActive ? "bg-green-500" : "bg-gray-400"
                        )} />
                        <span className="text-xs text-muted-foreground">
                          {thread.isActive ? 'Active' : 'Archived'}
                        </span>
                      </div>
                      
                      {selectedThreadId === thread.id && (
                        <Star className="h-3 w-3 text-primary" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer Info */}
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            All conversations monitored for safety
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            Messages visible to both partners
          </div>
        </div>
      </div>
    </Card>
  )
}