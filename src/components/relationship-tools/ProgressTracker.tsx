'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  Star, 
  TrendingUp, 
  Heart, 
  Award,
  Flame,
  Target,
  Users
} from 'lucide-react'

interface ProgressTrackerProps {
  currentStreak: number
  longestStreak: number
  totalPromptsCompleted: number
  weeklyGoal: number
  completedThisWeek: number
  milestones: Array<{
    id: string
    title: string
    description: string
    achieved: boolean
    achievedAt?: string
    requiredCount: number
  }>
  partnerProgress?: {
    currentStreak: number
    totalCompleted: number
    isShareEnabled: boolean
  }
  celebrationMoments?: Array<{
    id: string
    type: 'streak' | 'milestone' | 'weekly_goal'
    title: string
    date: string
    description: string
  }>
}

const milestoneIcons = {
  3: '🎉',
  7: '🔥',
  14: '⭐',
  30: '🏆',
  50: '💎',
  100: '👑'
}

export function ProgressTracker({
  currentStreak,
  longestStreak,
  totalPromptsCompleted,
  weeklyGoal,
  completedThisWeek,
  milestones,
  partnerProgress,
  celebrationMoments = []
}: ProgressTrackerProps) {
  const weeklyProgress = (completedThisWeek / weeklyGoal) * 100
  const isWeeklyGoalMet = completedThisWeek >= weeklyGoal

  const getStreakMessage = () => {
    if (currentStreak === 0) {
      return "Start your connection journey today! 🌱"
    } else if (currentStreak < 3) {
      return "Building momentum! Keep going! 💪"
    } else if (currentStreak < 7) {
      return "Great consistency! You're on fire! 🔥"
    } else if (currentStreak < 30) {
      return "Amazing dedication! This is becoming a habit! ⭐"
    } else {
      return "You're a relationship wellness champion! 👑"
    }
  }

  const getNextMilestone = () => {
    const unachieved = milestones.filter(m => !m.achieved)
    return unachieved.sort((a, b) => a.requiredCount - b.requiredCount)[0]
  }

  const nextMilestone = getNextMilestone()

  return (
    <div className="space-y-6">
      {/* Current Streak - Hero Section */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Flame className="h-8 w-8 text-orange-500" />
              <span className="text-3xl font-bold text-gray-900">{currentStreak}</span>
              <span className="text-lg text-gray-600">day streak</span>
            </div>
            <p className="text-gray-700 font-medium">{getStreakMessage()}</p>
            
            {currentStreak > 0 && (
              <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  <span>Best: {longestStreak} days</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  <span>Total: {totalPromptsCompleted} prompts</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            This Week's Goal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {completedThisWeek} of {weeklyGoal} prompts completed
            </span>
            {isWeeklyGoalMet && (
              <Badge className="bg-green-100 text-green-800">
                🎯 Goal achieved!
              </Badge>
            )}
          </div>
          
          <Progress 
            value={Math.min(weeklyProgress, 100)} 
            className="h-3"
          />
          
          {!isWeeklyGoalMet && (
            <p className="text-sm text-gray-600">
              {weeklyGoal - completedThisWeek} more prompt{weeklyGoal - completedThisWeek === 1 ? '' : 's'} to reach your weekly goal!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Partner Progress (if sharing enabled) */}
      {partnerProgress?.isShareEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-pink-500" />
              Together Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-gray-900">{currentStreak}</div>
                <div className="text-sm text-gray-600">Your streak</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-gray-900">{partnerProgress.currentStreak}</div>
                <div className="text-sm text-gray-600">Partner's streak</div>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <div className="text-lg font-semibold text-gray-900">
                {totalPromptsCompleted + partnerProgress.totalCompleted}
              </div>
              <div className="text-sm text-gray-600">
                Total prompts completed together 💕
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Milestones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Next milestone progress */}
          {nextMilestone && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-900">Next milestone:</span>
                <span className="text-2xl">
                  {milestoneIcons[nextMilestone.requiredCount as keyof typeof milestoneIcons] || '🎯'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{nextMilestone.title}</span>
                  <span className="text-blue-700 font-medium">
                    {totalPromptsCompleted}/{nextMilestone.requiredCount}
                  </span>
                </div>
                <Progress 
                  value={(totalPromptsCompleted / nextMilestone.requiredCount) * 100} 
                  className="h-2"
                />
                <p className="text-sm text-blue-700">
                  {nextMilestone.requiredCount - totalPromptsCompleted} more prompt{nextMilestone.requiredCount - totalPromptsCompleted === 1 ? '' : 's'} to unlock!
                </p>
              </div>
            </div>
          )}

          {/* Achieved milestones */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {milestones
              .filter(m => m.achieved)
              .sort((a, b) => b.requiredCount - a.requiredCount)
              .slice(0, 6)
              .map((milestone) => (
                <div key={milestone.id} className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl mb-1">
                    {milestoneIcons[milestone.requiredCount as keyof typeof milestoneIcons] || '🏅'}
                  </div>
                  <div className="text-sm font-medium text-green-800">{milestone.title}</div>
                  <div className="text-xs text-green-600">
                    {milestone.achievedAt && new Date(milestone.achievedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Celebrations */}
      {celebrationMoments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Recent Celebrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {celebrationMoments.slice(0, 3).map((moment) => (
                <div key={moment.id} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="text-xl">
                    {moment.type === 'streak' && '🔥'}
                    {moment.type === 'milestone' && '🏆'}
                    {moment.type === 'weekly_goal' && '🎯'}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-yellow-900">{moment.title}</div>
                    <div className="text-sm text-yellow-700">{moment.description}</div>
                    <div className="text-xs text-yellow-600 mt-1">
                      {new Date(moment.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Encouragement Section */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-6 text-center">
          <div className="space-y-2">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto" />
            <h3 className="font-semibold text-gray-900">Keep Growing Together</h3>
            <p className="text-sm text-gray-600">
              Every prompt you complete is an investment in your relationship's future. 
              Small, consistent actions create lasting positive change.
            </p>
            <p className="text-xs text-gray-500 mt-3">
              💡 Remember: This is wellness education. For relationship concerns, consider speaking with a licensed couples therapist.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProgressTracker