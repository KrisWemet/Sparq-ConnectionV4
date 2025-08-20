import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database-complete.types'

// Budget limits - aggressive cost optimization
const BUDGET_LIMITS = {
  FREE_TIER: {
    dailyUSD: 0.15,    // $0.15 per user per day max
    monthlyUSD: 4.50,  // $4.50 per user per month max
    maxPrompts: 3      // 3 personalized prompts per day for free users
  },
  PREMIUM_TIER: {
    dailyUSD: 1.00,    // $1.00 per user per day max
    monthlyUSD: 30.00, // $30.00 per user per month max
    maxPrompts: -1     // Unlimited prompts for premium users
  }
}

interface UsageRecord {
  modelUsed: string
  tokensUsed: number
  costUSD: number
  operation: 'daily_prompt_generation' | 'assessment_analysis' | 'crisis_support' | 'general_query'
  timestamp: Date
}

interface BudgetStatus {
  hasAvailableBudget: boolean
  remainingBudget: number
  dailyUsed: number
  monthlyUsed: number
  percentUsed: number
  tier: 'free' | 'premium'
  resetTime: Date
  warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical'
}

interface CostOptimizationSuggestion {
  type: 'model_downgrade' | 'cache_increase' | 'template_fallback' | 'usage_limit'
  message: string
  estimatedSavings: number
  impact: 'low' | 'medium' | 'high'
}

export class BudgetTracker {
  private supabase = createClientComponentClient<Database>()

  async checkBudget(userId: string): Promise<BudgetStatus> {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Get user tier information
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw new Error('User not found')
    }

    // Check if user has premium subscription
    const tier = await this.getUserTier(userId)
    const limits = tier === 'premium' ? BUDGET_LIMITS.PREMIUM_TIER : BUDGET_LIMITS.FREE_TIER

    // Get usage for today and this month
    const { data: usageData, error: usageError } = await this.supabase
      .from('ai_generation_costs')
      .select('cost_usd, created_at, tokens_used')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString())
      .order('created_at', { ascending: false })

    if (usageError) {
      console.error('Error fetching usage data:', usageError)
      throw new Error('Failed to check budget status')
    }

    // Calculate daily and monthly usage
    const dailyUsage = (usageData || [])
      .filter(record => new Date(record.created_at) >= startOfDay)
      .reduce((sum, record) => sum + (record.cost_usd || 0), 0)

    const monthlyUsage = (usageData || [])
      .reduce((sum, record) => sum + (record.cost_usd || 0), 0)

    // Calculate remaining budget
    const remainingDaily = Math.max(0, limits.dailyUSD - dailyUsage)
    const remainingMonthly = Math.max(0, limits.monthlyUSD - monthlyUsage)
    const remainingBudget = Math.min(remainingDaily, remainingMonthly)

    // Determine if budget is available
    const hasAvailableBudget = remainingBudget > 0.01 // At least 1 cent remaining

    // Calculate usage percentage (daily or monthly, whichever is higher)
    const dailyPercent = (dailyUsage / limits.dailyUSD) * 100
    const monthlyPercent = (monthlyUsage / limits.monthlyUSD) * 100
    const percentUsed = Math.max(dailyPercent, monthlyPercent)

    // Determine warning level
    const warningLevel = this.getWarningLevel(percentUsed)

    // Calculate reset time (next day at midnight)
    const resetTime = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    return {
      hasAvailableBudget,
      remainingBudget,
      dailyUsed: dailyUsage,
      monthlyUsed: monthlyUsage,
      percentUsed,
      tier,
      resetTime,
      warningLevel
    }
  }

  async recordUsage(userId: string, usage: UsageRecord): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_generation_costs')
        .insert({
          user_id: userId,
          model_used: usage.modelUsed,
          tokens_used: usage.tokensUsed,
          cost_usd: usage.costUSD,
          operation_type: usage.operation,
          created_at: usage.timestamp.toISOString(),
          metadata: {
            costOptimization: await this.generateCostOptimizationData(userId, usage)
          }
        })

      if (error) {
        console.error('Error recording usage:', error)
        throw new Error('Failed to record usage')
      }

      // Check if user is approaching limits and send warnings
      await this.checkForBudgetWarnings(userId)

    } catch (error) {
      console.error('Failed to record usage:', error)
      // Don't throw here to avoid breaking user experience
      // Log for monitoring and continue
    }
  }

  private async getUserTier(userId: string): Promise<'free' | 'premium'> {
    // Check if user has active premium subscription
    const { data: subscription, error } = await this.supabase
      .from('user_subscriptions')
      .select('tier, status, expires_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !subscription) {
      return 'free'
    }

    return subscription.tier as 'free' | 'premium'
  }

  private getWarningLevel(percentUsed: number): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (percentUsed >= 95) return 'critical'
    if (percentUsed >= 85) return 'high'
    if (percentUsed >= 70) return 'medium'
    if (percentUsed >= 50) return 'low'
    return 'none'
  }

  private async checkForBudgetWarnings(userId: string): Promise<void> {
    const budgetStatus = await this.checkBudget(userId)
    
    // Send notifications based on warning level
    switch (budgetStatus.warningLevel) {
      case 'critical':
        await this.sendBudgetNotification(userId, {
          type: 'critical',
          message: 'You\'ve reached 95% of your daily AI usage limit. Consider upgrading to premium for unlimited access.',
          remainingBudget: budgetStatus.remainingBudget
        })
        break
      case 'high':
        await this.sendBudgetNotification(userId, {
          type: 'warning',
          message: 'You\'ve used 85% of your daily AI budget. Prompts may switch to template-based content soon.',
          remainingBudget: budgetStatus.remainingBudget
        })
        break
      case 'medium':
        // Log for analytics but don't notify user yet
        console.log(`User ${userId} at 70% budget usage`)
        break
    }
  }

  private async sendBudgetNotification(userId: string, notification: any): Promise<void> {
    // In a real implementation, this would send email/push notifications
    // For now, we'll store in a notifications table
    try {
      await this.supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          type: 'budget_warning',
          title: 'AI Usage Budget Alert',
          message: notification.message,
          data: notification,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to send budget notification:', error)
    }
  }

  async getCostOptimizationSuggestions(userId: string): Promise<CostOptimizationSuggestion[]> {
    const budgetStatus = await this.checkBudget(userId)
    const suggestions: CostOptimizationSuggestion[] = []

    // Analyze usage patterns
    const usageAnalysis = await this.analyzeUsagePatterns(userId)

    if (budgetStatus.percentUsed > 80) {
      suggestions.push({
        type: 'template_fallback',
        message: 'Switch to template-based prompts to reduce AI costs while maintaining quality',
        estimatedSavings: budgetStatus.dailyUsed * 0.7,
        impact: 'low'
      })
    }

    if (usageAnalysis.highCostOperations > 5) {
      suggestions.push({
        type: 'model_downgrade',
        message: 'Use Claude Haiku for simpler prompts to reduce token costs',
        estimatedSavings: budgetStatus.dailyUsed * 0.4,
        impact: 'medium'
      })
    }

    if (budgetStatus.tier === 'free' && budgetStatus.monthlyUsed > 3.00) {
      suggestions.push({
        type: 'usage_limit',
        message: 'Upgrade to premium for unlimited AI prompts and advanced features',
        estimatedSavings: 0,
        impact: 'low'
      })
    }

    return suggestions
  }

  private async analyzeUsagePatterns(userId: string): Promise<{
    highCostOperations: number
    cacheHitRate: number
    avgCostPerOperation: number
    mostExpensiveOperationType: string
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const { data: usageData, error } = await this.supabase
      .from('ai_generation_costs')
      .select('cost_usd, operation_type, tokens_used, metadata')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (error || !usageData) {
      return {
        highCostOperations: 0,
        cacheHitRate: 0,
        avgCostPerOperation: 0,
        mostExpensiveOperationType: 'unknown'
      }
    }

    const highCostOperations = usageData.filter(op => (op.cost_usd || 0) > 0.01).length
    const totalOperations = usageData.length
    const avgCostPerOperation = usageData.reduce((sum, op) => sum + (op.cost_usd || 0), 0) / totalOperations

    // Group by operation type to find most expensive
    const operationCosts = usageData.reduce((acc, op) => {
      const type = op.operation_type || 'unknown'
      acc[type] = (acc[type] || 0) + (op.cost_usd || 0)
      return acc
    }, {} as Record<string, number>)

    const mostExpensiveOperationType = Object.keys(operationCosts).reduce((a, b) => 
      operationCosts[a] > operationCosts[b] ? a : b, 'unknown'
    )

    // Calculate cache hit rate from metadata
    const cacheHits = usageData.filter(op => 
      op.metadata && typeof op.metadata === 'object' && 
      'cacheHit' in op.metadata && op.metadata.cacheHit
    ).length
    
    const cacheHitRate = totalOperations > 0 ? (cacheHits / totalOperations) * 100 : 0

    return {
      highCostOperations,
      cacheHitRate,
      avgCostPerOperation,
      mostExpensiveOperationType
    }
  }

  private async generateCostOptimizationData(userId: string, usage: UsageRecord): Promise<any> {
    const budgetStatus = await this.checkBudget(userId)
    
    return {
      costPerToken: usage.costUSD / usage.tokensUsed,
      budgetRemainingAfter: budgetStatus.remainingBudget - usage.costUSD,
      efficiencyScore: this.calculateEfficiencyScore(usage),
      suggestedOptimizations: await this.getCostOptimizationSuggestions(userId)
    }
  }

  private calculateEfficiencyScore(usage: UsageRecord): number {
    // Score based on cost per token and operation type
    const baseCost = 0.003 / 1000 // Cost per token for Sonnet
    const efficiency = baseCost / (usage.costUSD / usage.tokensUsed)
    return Math.min(100, efficiency * 100) // Cap at 100
  }

  // Method to forecast usage and costs
  async forecastUsage(userId: string, daysAhead: number = 30): Promise<{
    estimatedDailyCost: number
    estimatedMonthlyCost: number
    projectedBudgetExhaustion: Date | null
    recommendedTier: 'free' | 'premium'
  }> {
    const usageAnalysis = await this.analyzeUsagePatterns(userId)
    const currentBudget = await this.checkBudget(userId)
    
    const estimatedDailyCost = usageAnalysis.avgCostPerOperation * 3 // Assume 3 operations per day
    const estimatedMonthlyCost = estimatedDailyCost * 30

    // Calculate when budget might be exhausted
    let projectedBudgetExhaustion: Date | null = null
    const dailyLimit = currentBudget.tier === 'premium' ? BUDGET_LIMITS.PREMIUM_TIER.dailyUSD : BUDGET_LIMITS.FREE_TIER.dailyUSD
    
    if (estimatedDailyCost > dailyLimit) {
      // Budget would be exhausted daily
      projectedBudgetExhaustion = new Date() // Today
    } else if (estimatedMonthlyCost > (currentBudget.tier === 'premium' ? BUDGET_LIMITS.PREMIUM_TIER.monthlyUSD : BUDGET_LIMITS.FREE_TIER.monthlyUSD)) {
      // Calculate when monthly budget would be exhausted
      const remainingBudget = currentBudget.remainingBudget
      const daysUntilExhaustion = remainingBudget / estimatedDailyCost
      projectedBudgetExhaustion = new Date(Date.now() + daysUntilExhaustion * 24 * 60 * 60 * 1000)
    }

    // Recommend tier upgrade if free user would benefit
    const recommendedTier = (currentBudget.tier === 'free' && estimatedMonthlyCost > BUDGET_LIMITS.FREE_TIER.monthlyUSD) 
      ? 'premium' 
      : currentBudget.tier

    return {
      estimatedDailyCost,
      estimatedMonthlyCost,
      projectedBudgetExhaustion,
      recommendedTier
    }
  }

  // Reset daily budget (called by cron job)
  async resetDailyBudgets(): Promise<void> {
    // This would be called by a daily cron job to reset counters
    console.log('Daily budget reset completed at', new Date().toISOString())
    
    // Could implement additional logic like:
    // - Send daily usage summaries
    // - Analyze usage trends
    // - Adjust cost optimization strategies
  }
}

// Export types for other modules
export type { BudgetStatus, UsageRecord, CostOptimizationSuggestion }