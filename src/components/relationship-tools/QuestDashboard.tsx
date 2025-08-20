'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Award, 
  PlayCircle,
  CheckCircle,
  Users,
  Heart,
  Star,
  ArrowRight,
  MessageCircle,
  BookOpen,
  Flame,
  Target
} from 'lucide-react'

interface QuestProgress {
  id: string
  questId: string
  quest: {
    id: string
    title: string
    slug: string
    description: string
    durationDays: number
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
    category: string
    estimatedTimePerDayMinutes: number
  }
  currentDay: number
  daysCompleted: number
  completionPercentage: number
  startedAt: string
  lastActivityAt: string
  completedAt: string | null
  completionRating?: number
  completionFeedback?: string
  participationScores: {
    partner1: number
    partner2: number
  }
  isCompleted: boolean
  dailyCompletions?: Array<{
    id: string
    dayNumber: number
    completedAt: string
    sharedReflection?: string
    helpfulnessRating?: number
  }>
}

interface QuestDashboardProps {
  onStartNewQuest: () => void
  onContinueQuest: (questId: string) => void
  onViewQuestDetails: (questId: string) => void
}

export function QuestDashboard({ 
  onStartNewQuest, 
  onContinueQuest, 
  onViewQuestDetails 
}: QuestDashboardProps) {
  const [questProgress, setQuestProgress] = useState<QuestProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchQuestProgress()
  }, [])

  const fetchQuestProgress = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/quests/progress?includeDetails=true')
      
      if (!response.ok) {
        throw new Error('Failed to fetch quest progress')
      }

      const data = await response.json()
      setQuestProgress(data.progress || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress')
    } finally {
      setLoading(false)
    }
  }

  const getActiveQuests = () => questProgress.filter(q => !q.isCompleted)
  const getCompletedQuests = () => questProgress.filter(q => q.isCompleted)
  
  const getTotalStats = () => {
    const completed = getCompletedQuests().length
    const inProgress = getActiveQuests().length
    const totalDaysCompleted = questProgress.reduce((sum, q) => sum + q.daysCompleted, 0)
    const currentStreak = calculateCurrentStreak()
    
    return { completed, inProgress, totalDaysCompleted, currentStreak }
  }

  const calculateCurrentStreak = () => {
    // Simplified streak calculation - in real app, would be more sophisticated
    const recentCompletions = questProgress
      .flatMap(q => q.dailyCompletions || [])
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    
    if (recentCompletions.length === 0) return 0
    
    let streak = 0
    let lastDate = new Date().setHours(0, 0, 0, 0)
    
    for (const completion of recentCompletions) {
      const completionDate = new Date(completion.completedAt).setHours(0, 0, 0, 0)
      const daysDiff = (lastDate - completionDate) / (1000 * 60 * 60 * 24)
      
      if (daysDiff <= 1) {
        streak++
        lastDate = completionDate
      } else {
        break
      }
    }
    
    return streak
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getDaysUntilNext = (quest: QuestProgress) => {
    if (quest.isCompleted) return null
    
    const lastActivity = new Date(quest.lastActivityAt)
    const nextDay = new Date(lastActivity)
    nextDay.setDate(nextDay.getDate() + 1)
    
    const today = new Date()
    const diffTime = nextDay.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 0) return 'Available now'
    return `Available in ${diffDays} day${diffDays === 1 ? '' : 's'}`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6 text-center">
          <div className="text-red-600">
            <p>Failed to load quest progress</p>
            <p className="text-sm mt-2">{error}</p>
            <Button 
              onClick={fetchQuestProgress}
              variant="outline"
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const stats = getTotalStats()
  const activeQuests = getActiveQuests()
  const completedQuests = getCompletedQuests()

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <PlayCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.inProgress}</div>
                <div className="text-sm text-gray-600">Active Quests</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalDaysCompleted}</div>
                <div className="text-sm text-gray-600">Days Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Flame className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.currentStreak}</div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Quests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-purple-600" />
              Active Quests
            </CardTitle>
            <Button onClick={onStartNewQuest} className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4" />
              Start New Quest
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {activeQuests.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Quests</h3>
              <p className="text-gray-500 mb-4">Start your first quest to begin your relationship journey!</p>
              <Button onClick={onStartNewQuest} className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                Browse Quests
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeQuests.map((quest) => (
                <Card key={quest.id} className="border border-purple-200 bg-purple-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{quest.quest.title}</h3>
                          <Badge variant="outline" className="text-xs capitalize">
                            {quest.quest.category.replace('_', ' ')}
                          </Badge>
                          <Badge className="text-xs capitalize">
                            {quest.quest.difficultyLevel}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-3">
                          {quest.quest.description}
                        </p>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                              Day {quest.currentDay} of {quest.quest.durationDays}
                            </span>
                            <span className="text-gray-500">
                              {quest.completionPercentage}% complete
                            </span>
                          </div>
                          
                          <Progress value={quest.completionPercentage} className="h-2" />
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {quest.quest.estimatedTimePerDayMinutes} min/day
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Started {formatDate(quest.startedAt)}
                              </span>
                            </div>
                            <span>{getDaysUntilNext(quest)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex flex-col gap-2">
                        <Button 
                          size="sm"
                          onClick={() => onContinueQuest(quest.questId)}
                          className="flex items-center gap-2"
                        >
                          <ArrowRight className="h-4 w-4" />
                          Continue
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => onViewQuestDetails(quest.questId)}
                          className="text-xs"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Quests */}
      {completedQuests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              Completed Quests
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="grid gap-4">
              {completedQuests.map((quest) => (
                <Card key={quest.id} className="border border-green-200 bg-green-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <h3 className="font-semibold">{quest.quest.title}</h3>
                          <Badge variant="outline" className="text-xs capitalize">
                            {quest.quest.category.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">Completed</div>
                            <div className="font-medium">
                              {quest.completedAt && formatDate(quest.completedAt)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Duration</div>
                            <div className="font-medium">{quest.quest.durationDays} days</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Days Completed</div>
                            <div className="font-medium">{quest.daysCompleted}/{quest.quest.durationDays}</div>
                          </div>
                          {quest.completionRating && (
                            <div>
                              <div className="text-gray-500">Your Rating</div>
                              <div className="font-medium flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                {quest.completionRating}/5
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {quest.completionFeedback && (
                          <div className="mt-3 p-3 bg-white rounded border">
                            <div className="text-xs text-gray-500 mb-1">Your reflection:</div>
                            <div className="text-sm italic">"{quest.completionFeedback}"</div>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => onViewQuestDetails(quest.questId)}
                        className="flex items-center gap-2"
                      >
                        <BookOpen className="h-4 w-4" />
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Encouraging Message */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6 text-center">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Heart className="h-6 w-6 text-red-500" />
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="font-semibold text-gray-900">Building Stronger Connections</h3>
            <p className="text-sm text-gray-600 max-w-2xl mx-auto">
              Every quest you complete strengthens your relationship foundation. 
              These evidence-based activities are designed to enhance communication, 
              build trust, and deepen your connection over time.
            </p>
            {stats.currentStreak > 0 && (
              <div className="flex items-center justify-center gap-2 text-orange-600 font-medium">
                <Flame className="h-4 w-4" />
                You're on a {stats.currentStreak}-day streak! Keep it going! 🔥
              </div>
            )}
            <p className="text-xs text-gray-500 mt-4">
              💡 Remember: This is wellness education. For relationship concerns, consider speaking with a licensed couples therapist.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default QuestDashboard