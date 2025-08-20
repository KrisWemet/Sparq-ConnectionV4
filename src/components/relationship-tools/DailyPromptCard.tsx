'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Heart, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  ArrowRight,
  Phone,
  ExternalLink,
  RotateCcw,
  Star
} from 'lucide-react'

interface DailyPromptCardProps {
  prompt: {
    promptText: string
    promptCategory: string
    difficultyLevel: string
    disclaimerText: string
    safetyCheck: {
      hasCrisisIndicators: boolean
      severity: 'none' | 'low' | 'medium' | 'high' | 'critical'
      requiresImmediateIntervention: boolean
    }
    costInfo: {
      modelUsed: string
      budgetRemaining: number
    }
    cacheInfo: {
      cacheHit: boolean
    }
    metadata: {
      personalizationLevel: 'template' | 'personalized' | 'ai_generated'
      frameworkUsed?: string
      estimatedTimeMinutes?: number
    }
  }
  onComplete?: (completed: boolean, feedback?: string) => void
  onRequestNew?: () => void
  onCrisisHelp?: () => void
  streak?: number
  isLoading?: boolean
}

const categoryColors = {
  communication: 'bg-blue-100 text-blue-800',
  intimacy: 'bg-pink-100 text-pink-800',
  goals: 'bg-purple-100 text-purple-800',
  appreciation: 'bg-green-100 text-green-800',
  conflict_resolution: 'bg-orange-100 text-orange-800',
  fun: 'bg-yellow-100 text-yellow-800',
  deep_connection: 'bg-indigo-100 text-indigo-800',
  growth: 'bg-teal-100 text-teal-800'
}

const difficultyIcons = {
  beginner: '🌱',
  intermediate: '🌳',
  advanced: '🌟'
}

export function DailyPromptCard({ 
  prompt, 
  onComplete, 
  onRequestNew, 
  onCrisisHelp,
  streak = 0,
  isLoading = false 
}: DailyPromptCardProps) {
  const [isCompleted, setIsCompleted] = useState(false)
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false)
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null)

  // Show crisis warning if safety check indicates issues
  const showCrisisWarning = prompt.safetyCheck.severity === 'high' || prompt.safetyCheck.severity === 'critical'

  const handleComplete = (completed: boolean) => {
    setIsCompleted(completed)
    onComplete?.(completed, feedback === 'helpful' ? 'positive' : feedback === 'not_helpful' ? 'negative' : undefined)
  }

  const handleCrisisHelp = () => {
    onCrisisHelp?.()
    // In a real app, this would also trigger crisis intervention
    window.open('tel:988', '_blank') // Suicide & Crisis Lifeline
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Crisis intervention override
  if (showCrisisWarning) {
    return (
      <Card className="w-full max-w-2xl border-red-500 border-2">
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            Safety Check Alert
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              We want to ensure your safety and wellbeing. If you're experiencing distress, please consider reaching out to a mental health professional or crisis support service.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Immediate Support Resources:</h3>
            <div className="grid gap-2">
              <Button 
                onClick={handleCrisisHelp}
                className="bg-red-600 hover:bg-red-700 text-white justify-start"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call 988 - Suicide & Crisis Lifeline
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('https://suicidepreventionlifeline.org/chat/', '_blank')}
                className="justify-start"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Crisis Chat Support
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('tel:911', '_blank')}
                className="justify-start"
              >
                <Phone className="h-4 w-4 mr-2" />
                Emergency Services - 911
              </Button>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            This platform provides wellness education, not crisis intervention. Your safety is our priority.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Today's Connection Prompt
            </CardTitle>
            {streak > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {streak} day streak!
              </Badge>
            )}
          </div>
          
          {/* Personalization indicator */}
          <div className="flex items-center gap-2">
            {prompt.cacheInfo.cacheHit && (
              <Badge variant="outline" className="text-xs">
                Cached
              </Badge>
            )}
            {prompt.metadata.personalizationLevel === 'ai_generated' && (
              <Badge className="bg-purple-100 text-purple-800 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Personalized
              </Badge>
            )}
          </div>
        </div>

        {/* Category and difficulty indicators */}
        <div className="flex items-center gap-2 text-sm">
          <Badge className={categoryColors[prompt.promptCategory as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'}>
            {prompt.promptCategory.replace('_', ' ')}
          </Badge>
          <Badge variant="outline">
            {difficultyIcons[prompt.difficultyLevel as keyof typeof difficultyIcons]} {prompt.difficultyLevel}
          </Badge>
          {prompt.metadata.estimatedTimeMinutes && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {prompt.metadata.estimatedTimeMinutes} min
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main prompt content */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
          <p className="text-gray-800 leading-relaxed">
            {prompt.promptText}
          </p>
        </div>

        {/* Evidence-based framework indicator */}
        {prompt.metadata.frameworkUsed && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <span className="font-medium">Research foundation:</span> {prompt.metadata.frameworkUsed}
          </div>
        )}

        {/* Wellness disclaimer - always visible and prominent */}
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-amber-800">
            <div className="space-y-2">
              <p className="font-medium">Wellness Education Notice:</p>
              <p>{prompt.disclaimerText}</p>
              {!showFullDisclaimer && (
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-amber-700 underline"
                  onClick={() => setShowFullDisclaimer(true)}
                >
                  Read full disclaimer
                </Button>
              )}
              {showFullDisclaimer && (
                <div className="text-sm space-y-2 pt-2 border-t border-amber-200">
                  <p>
                    This platform provides relationship wellness education and is not intended as a substitute for professional therapy, counseling, or medical advice. 
                  </p>
                  <p>
                    If you're experiencing relationship distress, mental health concerns, or crisis situations, please contact:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>A licensed mental health professional</li>
                    <li>Crisis support: 988 (Suicide & Crisis Lifeline)</li>
                    <li>Emergency services: 911</li>
                    <li>Domestic violence support: 1-800-799-7233</li>
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!isCompleted ? (
            <>
              <Button 
                onClick={() => handleComplete(true)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Completed
              </Button>
              <Button 
                variant="outline" 
                onClick={onRequestNew}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Get Different Prompt
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Great job on strengthening your relationship!</span>
                </div>
              </div>

              {/* Feedback collection */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Was this prompt helpful?</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={feedback === 'helpful' ? 'default' : 'outline'}
                    onClick={() => setFeedback('helpful')}
                  >
                    👍 Helpful
                  </Button>
                  <Button
                    size="sm"
                    variant={feedback === 'not_helpful' ? 'default' : 'outline'}
                    onClick={() => setFeedback('not_helpful')}
                  >
                    👎 Not helpful
                  </Button>
                </div>
              </div>

              <Button 
                variant="outline" 
                onClick={onRequestNew}
                className="w-full"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Get Tomorrow's Prompt
              </Button>
            </div>
          )}
        </div>

        {/* Crisis help always accessible */}
        <div className="pt-4 border-t border-gray-100">
          <Button 
            variant="link" 
            onClick={handleCrisisHelp}
            className="text-red-600 hover:text-red-700 p-0 h-auto"
          >
            <Phone className="h-4 w-4 mr-2" />
            Need immediate crisis support? Click here
          </Button>
        </div>

        {/* Budget indicator (for transparency) */}
        {prompt.costInfo.budgetRemaining < 1 && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            💡 Daily AI budget used - showing cached content to keep costs low
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DailyPromptCard