// Background job system for AI prompt cost optimization and cache management
import { createClient } from '@supabase/supabase-js'
import { AIPromptEngine } from '@/lib/ai-services/prompt-engine'
import { CacheManager } from '@/lib/ai-services/cache-manager'
import { BudgetTracker } from '@/lib/ai-services/budget-tracker'
import { Database } from '@/types/database-complete.types'

// Initialize Supabase client for background jobs
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class PromptOptimizationJobs {
  private cacheManager = new CacheManager()
  private budgetTracker = new BudgetTracker()

  // Daily budget reset job (run at midnight)
  async resetDailyBudgets(): Promise<void> {
    console.log('🔄 Starting daily budget reset job...')
    
    try {
      // Call the database function to reset budgets
      const { error } = await supabase.rpc('reset_daily_ai_budgets')
      
      if (error) {
        throw error
      }

      // Reset budget tracker internal state
      await this.budgetTracker.resetDailyBudgets()

      console.log('✅ Daily budget reset completed successfully')
      
      // Log the operation
      await this.logJobExecution('reset_daily_budgets', 'success', {
        executedAt: new Date().toISOString(),
        usersAffected: 'all_active_users'
      })

    } catch (error) {
      console.error('❌ Daily budget reset failed:', error)
      
      await this.logJobExecution('reset_daily_budgets', 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date().toISOString()
      })
      
      throw error
    }
  }

  // Cache cleanup job (run every hour)
  async cleanupExpiredCache(): Promise<void> {
    console.log('🧹 Starting cache cleanup job...')
    
    try {
      const cleanedCount = await this.cacheManager.cleanupExpired()
      
      console.log(`✅ Cache cleanup completed - removed ${cleanedCount} expired entries`)
      
      await this.logJobExecution('cache_cleanup', 'success', {
        entriesRemoved: cleanedCount,
        executedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('❌ Cache cleanup failed:', error)
      
      await this.logJobExecution('cache_cleanup', 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date().toISOString()
      })
    }
  }

  // Pre-generate popular content (run every 6 hours during off-peak)
  async preGeneratePopularContent(): Promise<void> {
    console.log('🏭 Starting popular content pre-generation...')
    
    try {
      const promptEngine = new AIPromptEngine()
      await promptEngine.preGeneratePopularContent()
      
      console.log('✅ Popular content pre-generation completed')
      
      await this.logJobExecution('pregenerate_content', 'success', {
        executedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('❌ Popular content pre-generation failed:', error)
      
      await this.logJobExecution('pregenerate_content', 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date().toISOString()
      })
    }
  }

  // Cache performance optimization (run daily)
  async optimizeCachePerformance(): Promise<void> {
    console.log('⚡ Starting cache performance optimization...')
    
    try {
      const efficiencyReport = await this.cacheManager.getEfficiencyReport()
      
      // Log efficiency metrics
      console.log(`Cache efficiency: ${efficiencyReport.overallEfficiency}%`)
      console.log(`Recommendations: ${efficiencyReport.recommendations.join(', ')}`)
      
      // Identify underperforming cache keys for invalidation
      const underperformingThreshold = 10 // Less than 10% hit rate
      const keysToInvalidate = efficiencyReport.underperformingKeys
        .filter(key => key.hitRate < underperformingThreshold)
        .map(key => key.key)

      if (keysToInvalidate.length > 0) {
        console.log(`Invalidating ${keysToInvalidate.length} underperforming cache keys`)
        
        for (const key of keysToInvalidate) {
          await this.cacheManager.invalidate(key)
        }
      }

      await this.logJobExecution('optimize_cache_performance', 'success', {
        efficiency: efficiencyReport.overallEfficiency,
        keysInvalidated: keysToInvalidate.length,
        recommendations: efficiencyReport.recommendations,
        executedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('❌ Cache performance optimization failed:', error)
      
      await this.logJobExecution('optimize_cache_performance', 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date().toISOString()
      })
    }
  }

  // Generate cost optimization reports (run weekly)
  async generateCostOptimizationReport(): Promise<void> {
    console.log('📊 Generating cost optimization report...')
    
    try {
      // Get usage analytics for the past week
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      
      const { data: usageData, error: usageError } = await supabase
        .from('ai_generation_costs')
        .select('*')
        .gte('created_at', weekAgo.toISOString())

      if (usageError) {
        throw usageError
      }

      // Calculate metrics
      const totalCost = usageData?.reduce((sum, record) => sum + (record.cost_usd || 0), 0) || 0
      const totalOperations = usageData?.length || 0
      const avgCostPerOperation = totalOperations > 0 ? totalCost / totalOperations : 0
      
      const cacheHits = usageData?.filter(record => record.cache_hit).length || 0
      const cacheHitRate = totalOperations > 0 ? (cacheHits / totalOperations) * 100 : 0
      
      const costByModel = usageData?.reduce((acc, record) => {
        const model = record.model_used || 'unknown'
        acc[model] = (acc[model] || 0) + (record.cost_usd || 0)
        return acc
      }, {} as Record<string, number>) || {}

      const costByOperation = usageData?.reduce((acc, record) => {
        const operation = record.operation_type || 'unknown'
        acc[operation] = (acc[operation] || 0) + (record.cost_usd || 0)
        return acc
      }, {} as Record<string, number>) || {}

      // Get cache statistics
      const cacheStats = await this.cacheManager.getStats('week')

      const report = {
        period: {
          start: weekAgo.toISOString(),
          end: new Date().toISOString()
        },
        usage: {
          totalCost: parseFloat(totalCost.toFixed(4)),
          totalOperations,
          avgCostPerOperation: parseFloat(avgCostPerOperation.toFixed(6)),
          cacheHitRate: parseFloat(cacheHitRate.toFixed(2))
        },
        breakdown: {
          costByModel,
          costByOperation
        },
        cache: {
          hitRate: cacheStats.hitRate,
          totalEntries: cacheStats.totalEntries,
          costSavings: cacheStats.costSavingsUSD
        },
        optimizations: {
          potentialSavings: totalCost * 0.3, // Estimate 30% potential savings
          recommendations: this.generateOptimizationRecommendations(cacheHitRate, totalCost, costByModel)
        }
      }

      // Store the report
      await supabase
        .from('audit_log')
        .insert({
          action_type: 'cost_optimization_report',
          resource_type: 'ai_prompt_system',
          details: report,
          environment: 'production'
        })

      console.log('✅ Cost optimization report generated successfully')
      console.log(`Total cost: $${totalCost.toFixed(4)}`)
      console.log(`Cache hit rate: ${cacheHitRate.toFixed(2)}%`)
      console.log(`Cost savings from cache: $${cacheStats.costSavingsUSD.toFixed(4)}`)

      await this.logJobExecution('cost_optimization_report', 'success', {
        totalCost: totalCost,
        cacheHitRate: cacheHitRate,
        costSavings: cacheStats.costSavingsUSD,
        executedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('❌ Cost optimization report generation failed:', error)
      
      await this.logJobExecution('cost_optimization_report', 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date().toISOString()
      })
    }
  }

  // Send budget warnings to users approaching limits
  async sendBudgetWarnings(): Promise<void> {
    console.log('⚠️ Checking for users approaching budget limits...')
    
    try {
      // Get users who have used > 80% of their daily budget
      const { data: userPrefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select(`
          user_id,
          ai_budget_used_today,
          max_daily_ai_prompts,
          users!inner(display_name, email_encrypted)
        `)
        .gt('ai_budget_used_today', 0.12) // 80% of $0.15 free tier limit

      if (prefsError) {
        throw prefsError
      }

      let warningsSent = 0

      for (const userPref of userPrefs || []) {
        const dailyUsagePercent = (userPref.ai_budget_used_today / 0.15) * 100

        if (dailyUsagePercent >= 90) {
          // Send critical warning
          await this.sendBudgetNotification(userPref.user_id, {
            type: 'critical',
            title: 'AI Budget Nearly Exhausted',
            message: `You've used ${dailyUsagePercent.toFixed(0)}% of your daily AI budget. Consider upgrading to premium for unlimited prompts.`,
            data: {
              usagePercent: dailyUsagePercent,
              budgetRemaining: 0.15 - userPref.ai_budget_used_today
            }
          })
          warningsSent++
        } else if (dailyUsagePercent >= 80) {
          // Send warning
          await this.sendBudgetNotification(userPref.user_id, {
            type: 'warning',
            title: 'Approaching AI Budget Limit',
            message: `You've used ${dailyUsagePercent.toFixed(0)}% of your daily AI budget. Future prompts may use cached content.`,
            data: {
              usagePercent: dailyUsagePercent,
              budgetRemaining: 0.15 - userPref.ai_budget_used_today
            }
          })
          warningsSent++
        }
      }

      console.log(`✅ Budget warning check completed - sent ${warningsSent} warnings`)

      await this.logJobExecution('budget_warnings', 'success', {
        usersChecked: userPrefs?.length || 0,
        warningsSent,
        executedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('❌ Budget warning check failed:', error)
      
      await this.logJobExecution('budget_warnings', 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date().toISOString()
      })
    }
  }

  private async sendBudgetNotification(userId: string, notification: any): Promise<void> {
    await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        type: 'budget_warning',
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.type === 'critical' ? 'high' : 'normal'
      })
  }

  private generateOptimizationRecommendations(
    cacheHitRate: number, 
    totalCost: number, 
    costByModel: Record<string, number>
  ): string[] {
    const recommendations: string[] = []

    if (cacheHitRate < 60) {
      recommendations.push('Increase cache TTL for template-based content to improve hit rate')
    }

    if (cacheHitRate < 40) {
      recommendations.push('Pre-generate more popular content combinations during off-peak hours')
    }

    const haikuCost = costByModel['claude-3-haiku-20240307'] || 0
    const sonnetCost = costByModel['claude-3-sonnet-20240229'] || 0
    
    if (sonnetCost > haikuCost * 2) {
      recommendations.push('Consider using Claude Haiku for simpler prompts to reduce costs')
    }

    if (totalCost > 50) {
      recommendations.push('Review user tier distribution - encourage premium upgrades for heavy users')
    }

    if (recommendations.length === 0) {
      recommendations.push('Cost optimization is performing well - no immediate changes needed')
    }

    return recommendations
  }

  private async logJobExecution(
    jobType: string, 
    status: 'success' | 'failed', 
    details: any
  ): Promise<void> {
    try {
      await supabase
        .from('audit_log')
        .insert({
          action_type: `background_job_${jobType}`,
          resource_type: 'prompt_optimization_system',
          details: {
            status,
            ...details
          },
          environment: 'production'
        })
    } catch (error) {
      console.error('Failed to log job execution:', error)
      // Don't throw here to avoid cascading failures
    }
  }
}

// Export individual job functions for cron job systems
export const promptOptimizationJobs = new PromptOptimizationJobs()

// Individual job exports for cron systems like Vercel Cron or GitHub Actions
export const resetDailyBudgets = () => promptOptimizationJobs.resetDailyBudgets()
export const cleanupExpiredCache = () => promptOptimizationJobs.cleanupExpiredCache()
export const preGeneratePopularContent = () => promptOptimizationJobs.preGeneratePopularContent()
export const optimizeCachePerformance = () => promptOptimizationJobs.optimizeCachePerformance()
export const generateCostOptimizationReport = () => promptOptimizationJobs.generateCostOptimizationReport()
export const sendBudgetWarnings = () => promptOptimizationJobs.sendBudgetWarnings()

// Master job runner for development/testing
export async function runAllOptimizationJobs(): Promise<void> {
  console.log('🚀 Running all prompt optimization jobs...')
  
  const jobs = [
    { name: 'Cache Cleanup', fn: cleanupExpiredCache },
    { name: 'Budget Warnings', fn: sendBudgetWarnings },
    { name: 'Cache Optimization', fn: optimizeCachePerformance },
  ]

  for (const job of jobs) {
    try {
      console.log(`Running ${job.name}...`)
      await job.fn()
    } catch (error) {
      console.error(`${job.name} failed:`, error)
    }
  }

  console.log('✅ All optimization jobs completed')
}