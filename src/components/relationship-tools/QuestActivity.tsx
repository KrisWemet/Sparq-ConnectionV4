'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { 
  Clock, 
  CheckCircle, 
  Heart, 
  MessageCircle,
  Star,
  ArrowRight,
  ArrowLeft,
  Calendar,
  User,
  Users,
  BookOpen,
  Target,
  Lightbulb,
  Save,
  Send
} from 'lucide-react'

interface QuestDay {
  day: number
  title: string
  description: string
  activity: {
    type: 'reflection' | 'discussion' | 'exercise' | 'observation' | 'practice'
    instructions: string
    prompts: string[]
    timeRequired: number
    materials?: string[]
    tips?: string[]
  }
  learningGoals: string[]
  connectionPoints?: string[]
}

interface QuestActivityProps {
  questId: string
  questTitle: string
  currentDay: number
  totalDays: number
  dayData: QuestDay
  progress: {
    id: string
    daysCompleted: number
    completionPercentage: number
  }
  isPartnerRequired?: boolean
  onComplete: (completionData: any) => void
  onSaveDraft: (draftData: any) => void
  onBack: () => void
}

const activityTypeIcons = {
  reflection: Lightbulb,
  discussion: MessageCircle,
  exercise: Target,
  observation: User,
  practice: Users
}

const activityTypeColors = {
  reflection: 'bg-purple-100 text-purple-700',
  discussion: 'bg-blue-100 text-blue-700', 
  exercise: 'bg-green-100 text-green-700',
  observation: 'bg-orange-100 text-orange-700',
  practice: 'bg-pink-100 text-pink-700'
}

export function QuestActivity({
  questId,
  questTitle,
  currentDay,
  totalDays,
  dayData,
  progress,
  isPartnerRequired = false,
  onComplete,
  onSaveDraft,
  onBack
}: QuestActivityProps) {
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [sharedReflection, setSharedReflection] = useState('')
  const [timeSpent, setTimeSpent] = useState<number | null>(null)
  const [helpfulnessRating, setHelpfulnessRating] = useState<number | null>(null)
  const [visibility, setVisibility] = useState<'private' | 'partner_only' | 'shared_summary'>('partner_only')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startTime] = useState(Date.now())

  const ActivityIcon = activityTypeIcons[dayData.activity.type]
  const completionPercentage = (currentDay / totalDays) * 100

  useEffect(() => {
    // Auto-save draft every 2 minutes
    const interval = setInterval(() => {
      if (Object.keys(responses).length > 0 || sharedReflection.trim()) {
        handleSaveDraft()
      }
    }, 120000)

    return () => clearInterval(interval)
  }, [responses, sharedReflection])

  const handleResponseChange = (promptIndex: number, value: any) => {
    setResponses(prev => ({
      ...prev,
      [`prompt_${promptIndex}`]: value
    }))
  }

  const handleSaveDraft = async () => {
    const draftData = {
      responses,
      sharedReflection,
      visibility,
      lastUpdated: new Date().toISOString()
    }
    
    try {
      await onSaveDraft(draftData)
    } catch (error) {
      console.error('Failed to save draft:', error)
    }
  }

  const handleComplete = async () => {
    if (!validateCompletion()) return

    setIsSubmitting(true)
    
    try {
      const completionData = {
        progressId: progress.id,
        dayNumber: currentDay,
        completionData: {
          responses,
          activity_type: dayData.activity.type,
          completed_at: new Date().toISOString()
        },
        sharedReflection: sharedReflection.trim() || undefined,
        visibility,
        timeSpentMinutes: timeSpent || Math.round((Date.now() - startTime) / 60000),
        helpfulnessRating
      }

      await onComplete(completionData)
    } catch (error) {
      console.error('Failed to complete activity:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const validateCompletion = () => {
    // Check if all required prompts have responses
    const requiredPrompts = dayData.activity.prompts.length
    const completedPrompts = Object.keys(responses).length
    
    return completedPrompts >= requiredPrompts
  }

  const renderPrompt = (prompt: string, index: number) => {
    const isTextResponse = prompt.toLowerCase().includes('describe') || 
                           prompt.toLowerCase().includes('explain') || 
                           prompt.toLowerCase().includes('reflect')
    
    return (
      <div key={index} className="space-y-3">
        <Label className="text-sm font-medium text-gray-700">
          {index + 1}. {prompt}
        </Label>
        
        {isTextResponse ? (
          <Textarea
            placeholder="Share your thoughts..."
            value={responses[`prompt_${index}`] || ''}
            onChange={(e) => handleResponseChange(index, e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={500}
          />
        ) : (
          <div className="space-y-2">
            <RadioGroup 
              value={responses[`prompt_${index}`] || ''} 
              onValueChange={(value) => handleResponseChange(index, value)}
            >
              {['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'].map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${index}-${option}`} />
                  <Label htmlFor={`${index}-${option}`} className="text-sm">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}
        
        {responses[`prompt_${index}`] && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Response saved
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with Progress */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{questTitle}</h1>
                <p className="text-gray-600 mt-1">Day {currentDay} of {totalDays}</p>
              </div>
              <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Quests
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Quest Progress</span>
                <span>{Math.round(completionPercentage)}% complete</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-lg ${activityTypeColors[dayData.activity.type]}`}>
              <ActivityIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">{dayData.title}</CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{dayData.activity.timeRequired} minutes</span>
                </div>
                <Badge variant="outline" className="capitalize">
                  {dayData.activity.type.replace('_', ' ')}
                </Badge>
                {isPartnerRequired && (
                  <Badge variant="outline" className="text-pink-600">
                    <Users className="h-3 w-3 mr-1" />
                    Partner Activity
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Description & Instructions */}
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">{dayData.description}</p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Instructions
              </h4>
              <p className="text-blue-800 text-sm leading-relaxed">
                {dayData.activity.instructions}
              </p>
            </div>
          </div>

          {/* Learning Goals */}
          {dayData.learningGoals.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Today's Learning Goals
              </h4>
              <ul className="text-green-800 text-sm space-y-1">
                {dayData.learningGoals.map((goal, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    {goal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Materials Needed */}
          {dayData.activity.materials && dayData.activity.materials.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-2">Materials Needed:</h4>
              <ul className="text-orange-800 text-sm space-y-1">
                {dayData.activity.materials.map((material, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-orange-600">•</span>
                    {material}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Activity Prompts */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Activity Questions
            </h3>
            
            <div className="space-y-6">
              {dayData.activity.prompts.map((prompt, index) => renderPrompt(prompt, index))}
            </div>
          </div>

          {/* Shared Reflection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Share with Your Partner (Optional)
            </Label>
            <Textarea
              placeholder="What would you like to share about today's activity with your partner?"
              value={sharedReflection}
              onChange={(e) => setSharedReflection(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={500}
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{500 - sharedReflection.length} characters remaining</span>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-sm font-medium text-gray-700">Sharing Preferences</Label>
            <RadioGroup value={visibility} onValueChange={(value: any) => setVisibility(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="text-sm">Keep private to me</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partner_only" id="partner" />
                <Label htmlFor="partner" className="text-sm">Share with my partner</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="shared_summary" id="summary" />
                <Label htmlFor="summary" className="text-sm">Include in relationship summary</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Helpfulness Rating */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-sm font-medium text-gray-700">How helpful was today's activity?</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setHelpfulnessRating(rating)}
                  className={`p-2 rounded-full transition-colors ${
                    helpfulnessRating && rating <= helpfulnessRating
                      ? 'text-yellow-500'
                      : 'text-gray-300 hover:text-yellow-400'
                  }`}
                >
                  <Star className="h-5 w-5 fill-current" />
                </button>
              ))}
              {helpfulnessRating && (
                <span className="text-sm text-gray-600 ml-2">
                  {helpfulnessRating}/5 stars
                </span>
              )}
            </div>
          </div>

          {/* Tips */}
          {dayData.activity.tips && dayData.activity.tips.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Helpful Tips
              </h4>
              <ul className="text-yellow-800 text-sm space-y-1">
                {dayData.activity.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">💡</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
              
              {Object.keys(responses).length > 0 && (
                <div className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Progress saved
                </div>
              )}
            </div>

            <Button
              onClick={handleComplete}
              disabled={!validateCompletion() || isSubmitting}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Completing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Complete Day {currentDay}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 mt-2 text-center">
            💡 Remember: This is educational content. For relationship concerns, consider speaking with a licensed therapist.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default QuestActivity