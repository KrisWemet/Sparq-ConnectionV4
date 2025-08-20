'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Clock, 
  Users, 
  BookOpen, 
  PlayCircle,
  CheckCircle,
  Lock,
  Filter,
  Heart,
  MessageCircle,
  Shield,
  Target,
  CalendarDays,
  Star,
  ArrowRight
} from 'lucide-react'

interface Quest {
  id: string
  title: string
  description: string
  slug: string
  durationDays: number
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  category: 'communication' | 'intimacy' | 'trust' | 'conflict_resolution' | 'shared_activities' | 'future_planning' | 'appreciation' | 'emotional_support'
  suitableForArchetypes: string[]
  minimumRelationshipLengthMonths: number
  learningObjectives: string[]
  estimatedTimePerDayMinutes: number
  prerequisites: Array<{id: string, title: string, slug: string}>
  tags: string[]
  publishDate: string
  availability: {
    available: boolean
    reason: string | null
  }
  progress: {
    started: boolean
    currentDay: number
    daysCompleted: number
    completionPercentage: number
    startedAt: string | null
    completedAt: string | null
    isCompleted: boolean
  }
}

interface QuestDiscoveryProps {
  onStartQuest: (questId: string) => void
  onViewQuest: (questId: string) => void
  onContinueQuest: (questId: string) => void
  userArchetype?: string
}

const categoryIcons = {
  communication: MessageCircle,
  intimacy: Heart,
  trust: Shield,
  conflict_resolution: Target,
  shared_activities: Users,
  future_planning: CalendarDays,
  appreciation: Star,
  emotional_support: Heart
}

const categoryColors = {
  communication: 'bg-blue-100 text-blue-800 border-blue-200',
  intimacy: 'bg-pink-100 text-pink-800 border-pink-200',
  trust: 'bg-green-100 text-green-800 border-green-200',
  conflict_resolution: 'bg-orange-100 text-orange-800 border-orange-200',
  shared_activities: 'bg-purple-100 text-purple-800 border-purple-200',
  future_planning: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  appreciation: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  emotional_support: 'bg-red-100 text-red-800 border-red-200'
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700'
}

export function QuestDiscovery({ 
  onStartQuest, 
  onViewQuest, 
  onContinueQuest,
  userArchetype 
}: QuestDiscoveryProps) {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    difficulty: '',
    duration: '',
    completed: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchQuests()
  }, [filters])

  const fetchQuests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filters.category) params.set('category', filters.category)
      if (filters.difficulty) params.set('difficulty', filters.difficulty)
      if (filters.duration) params.set('duration', filters.duration)
      if (filters.completed) params.set('completed', filters.completed)
      if (filters.search) params.set('search', filters.search)
      if (userArchetype) params.set('archetype', userArchetype)

      const response = await fetch(`/api/v1/quests?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch quests')
      }

      const data = await response.json()
      setQuests(data.quests || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quests')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      difficulty: '',
      duration: '',
      completed: ''
    })
  }

  const getQuestAction = (quest: Quest) => {
    if (quest.progress.isCompleted) {
      return {
        text: 'View Results',
        action: () => onViewQuest(quest.id),
        icon: CheckCircle,
        variant: 'outline' as const,
        className: 'border-green-200 text-green-700 hover:bg-green-50'
      }
    } else if (quest.progress.started) {
      return {
        text: 'Continue',
        action: () => onContinueQuest(quest.id),
        icon: ArrowRight,
        variant: 'default' as const,
        className: 'bg-blue-600 hover:bg-blue-700'
      }
    } else if (quest.availability.available) {
      return {
        text: 'Start Quest',
        action: () => onStartQuest(quest.id),
        icon: PlayCircle,
        variant: 'default' as const,
        className: 'bg-purple-600 hover:bg-purple-700'
      }
    } else {
      return {
        text: 'Locked',
        action: () => onViewQuest(quest.id),
        icon: Lock,
        variant: 'outline' as const,
        className: 'border-gray-300 text-gray-500 cursor-not-allowed'
      }
    }
  }

  const getDurationText = (days: number) => {
    if (days <= 7) return `${days} day${days === 1 ? '' : 's'}`
    if (days <= 14) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'}`
    return `${Math.floor(days / 7)} weeks`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6 text-center">
          <div className="text-red-600">
            <p>Failed to load quests</p>
            <p className="text-sm mt-2">{error}</p>
            <Button 
              onClick={fetchQuests}
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

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search quests..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-4 border-t">
                <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                    <SelectItem value="intimacy">Intimacy</SelectItem>
                    <SelectItem value="trust">Trust</SelectItem>
                    <SelectItem value="conflict_resolution">Conflict Resolution</SelectItem>
                    <SelectItem value="shared_activities">Shared Activities</SelectItem>
                    <SelectItem value="future_planning">Future Planning</SelectItem>
                    <SelectItem value="appreciation">Appreciation</SelectItem>
                    <SelectItem value="emotional_support">Emotional Support</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.difficulty} onValueChange={(value) => handleFilterChange('difficulty', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.duration} onValueChange={(value) => handleFilterChange('duration', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any Duration</SelectItem>
                    <SelectItem value="short">Short (1-7 days)</SelectItem>
                    <SelectItem value="medium">Medium (8-14 days)</SelectItem>
                    <SelectItem value="long">Long (15+ days)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.completed} onValueChange={(value) => handleFilterChange('completed', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Quests</SelectItem>
                    <SelectItem value="false">Available</SelectItem>
                    <SelectItem value="true">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <div className="md:col-span-4 flex justify-end">
                  <Button variant="ghost" onClick={clearFilters} className="text-sm">
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quest Grid */}
      <div className="grid gap-6">
        {quests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No quests found</h3>
              <p className="text-gray-500">Try adjusting your filters or check back later for new quests.</p>
            </CardContent>
          </Card>
        ) : (
          quests.map((quest) => {
            const CategoryIcon = categoryIcons[quest.category] || BookOpen
            const action = getQuestAction(quest)
            const ActionIcon = action.icon

            return (
              <Card 
                key={quest.id} 
                className={`transition-all duration-200 hover:shadow-md ${
                  quest.progress.started && !quest.progress.isCompleted 
                    ? 'ring-2 ring-blue-200' 
                    : quest.progress.isCompleted 
                    ? 'bg-green-50' 
                    : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${categoryColors[quest.category]}`}>
                            <CategoryIcon className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-lg text-gray-900 leading-tight">
                              {quest.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span>{getDurationText(quest.durationDays)}</span>
                              <span>•</span>
                              <span>{quest.estimatedTimePerDayMinutes} min/day</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {quest.description}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar (if started) */}
                    {quest.progress.started && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">
                            Day {quest.progress.currentDay} of {quest.durationDays}
                          </span>
                          <span className="text-gray-500">
                            {quest.progress.completionPercentage}% complete
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              quest.progress.isCompleted 
                                ? 'bg-green-500' 
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${quest.progress.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Tags and Metadata */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={difficultyColors[quest.difficultyLevel]}>
                          {quest.difficultyLevel}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {quest.category.replace('_', ' ')}
                        </Badge>
                        {quest.prerequisites.length > 0 && (
                          <Badge variant="outline" className="text-xs text-orange-600">
                            Requires prerequisites
                          </Badge>
                        )}
                      </div>
                      
                      <Button
                        onClick={action.action}
                        variant={action.variant}
                        size="sm"
                        className={`flex items-center gap-2 ${action.className}`}
                        disabled={!quest.availability.available && !quest.progress.started}
                      >
                        <ActionIcon className="h-4 w-4" />
                        {action.text}
                      </Button>
                    </div>

                    {/* Learning Objectives Preview */}
                    {quest.learningObjectives.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">What you'll learn:</p>
                        <p className="text-xs text-gray-600">
                          {quest.learningObjectives.slice(0, 2).join(' • ')}
                          {quest.learningObjectives.length > 2 && ' • ...'}
                        </p>
                      </div>
                    )}

                    {/* Unavailable Reason */}
                    {!quest.availability.available && quest.availability.reason && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-yellow-800">
                          <Lock className="h-4 w-4" />
                          <span>{quest.availability.reason}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Wellness Disclaimer */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Wellness & Educational Purpose</p>
              <p className="text-blue-700">
                These quests provide evidence-based relationship education and wellness activities. 
                They are not therapy or medical treatment. For relationship concerns, consider speaking 
                with a licensed couples therapist.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default QuestDiscovery