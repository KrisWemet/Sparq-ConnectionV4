import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database-complete.types'

// Cache levels with different TTLs for aggressive cost optimization
const CACHE_LEVELS = {
  TEMPLATE_LEVEL: {
    ttl: 86400,        // 24 hours - templates change infrequently
    prefix: 'tpl',
    description: 'Base template content'
  },
  PERSONALIZED_LEVEL: {
    ttl: 3600,         // 1 hour - personalized but reusable
    prefix: 'pers',
    description: 'Personalized template content'
  },
  AI_RESPONSE_LEVEL: {
    ttl: 300,          // 5 minutes - fresh AI content
    prefix: 'ai',
    description: 'AI-generated content'
  },
  USER_SESSION_LEVEL: {
    ttl: 1800,         // 30 minutes - user session data
    prefix: 'sess',
    description: 'User session cache'
  }
}

interface CacheEntry {
  key: string
  value: any
  expiry: Date
  level: keyof typeof CACHE_LEVELS
  hitCount: number
  lastAccessed: Date
  metadata?: {
    costSavings?: number
    generationTime?: number
    userId?: string
    promptCategory?: string
  }
}

interface CacheStats {
  hitRate: number
  totalHits: number
  totalMisses: number
  totalEntries: number
  costSavingsUSD: number
  avgGenerationTimeMs: number
  topCategories: Array<{ category: string, hits: number }>
}

export class CacheManager {
  private supabase = createClientComponentClient<Database>()
  private memoryCache = new Map<string, CacheEntry>()
  private readonly maxMemoryEntries = 1000 // Prevent memory bloat

  async get(key: string): Promise<any | null> {
    const startTime = Date.now()
    
    // Try memory cache first (fastest)
    const memoryEntry = this.memoryCache.get(key)
    if (memoryEntry && new Date() < memoryEntry.expiry) {
      await this.updateCacheStats(key, 'hit', 'memory', Date.now() - startTime)
      memoryEntry.hitCount++
      memoryEntry.lastAccessed = new Date()
      return memoryEntry.value
    }

    // Try database cache (persistent but slower)
    try {
      const { data: cacheEntry, error } = await this.supabase
        .from('prompt_cache')
        .select('*')
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !cacheEntry) {
        await this.updateCacheStats(key, 'miss', 'database', Date.now() - startTime)
        return null
      }

      // Cache hit - update stats and store in memory for faster future access
      await this.updateCacheStats(key, 'hit', 'database', Date.now() - startTime)
      
      const parsedValue = JSON.parse(cacheEntry.cached_content)
      
      // Store in memory cache for future requests
      this.memoryCache.set(key, {
        key,
        value: parsedValue,
        expiry: new Date(cacheEntry.expires_at),
        level: this.getCacheLevelFromKey(key),
        hitCount: (cacheEntry.hit_count || 0) + 1,
        lastAccessed: new Date(),
        metadata: cacheEntry.metadata as any
      })

      // Update hit count in database
      await this.supabase
        .from('prompt_cache')
        .update({ 
          hit_count: (cacheEntry.hit_count || 0) + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', cacheEntry.id)

      return parsedValue

    } catch (error) {
      console.error('Cache get error:', error)
      await this.updateCacheStats(key, 'miss', 'error', Date.now() - startTime)
      return null
    }
  }

  async set(
    key: string, 
    value: any, 
    ttlSeconds?: number, 
    metadata?: CacheEntry['metadata']
  ): Promise<void> {
    const level = this.getCacheLevelFromKey(key)
    const actualTtl = ttlSeconds || CACHE_LEVELS[level].ttl
    const expiry = new Date(Date.now() + actualTtl * 1000)

    // Store in memory cache
    const cacheEntry: CacheEntry = {
      key,
      value,
      expiry,
      level,
      hitCount: 0,
      lastAccessed: new Date(),
      metadata
    }

    this.memoryCache.set(key, cacheEntry)
    this.enforceMemoryLimit()

    // Store in database cache for persistence
    try {
      await this.supabase
        .from('prompt_cache')
        .upsert({
          cache_key: key,
          cache_level: level,
          cached_content: JSON.stringify(value),
          expires_at: expiry.toISOString(),
          created_at: new Date().toISOString(),
          metadata: metadata || {},
          hit_count: 0,
          last_accessed_at: new Date().toISOString()
        })

    } catch (error) {
      console.error('Cache set error:', error)
      // Don't throw - cache failure shouldn't break the application
    }
  }

  private getCacheLevelFromKey(key: string): keyof typeof CACHE_LEVELS {
    const prefix = key.split(':')[0]
    
    switch (prefix) {
      case 'tpl': return 'TEMPLATE_LEVEL'
      case 'pers': return 'PERSONALIZED_LEVEL'
      case 'ai': return 'AI_RESPONSE_LEVEL'
      case 'sess': return 'USER_SESSION_LEVEL'
      default: return 'AI_RESPONSE_LEVEL' // Default fallback
    }
  }

  private enforceMemoryLimit(): void {
    if (this.memoryCache.size <= this.maxMemoryEntries) return

    // Remove least recently used entries
    const entries = Array.from(this.memoryCache.entries())
    entries.sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime())
    
    const toRemove = entries.slice(0, this.memoryCache.size - this.maxMemoryEntries)
    toRemove.forEach(([key]) => this.memoryCache.delete(key))
  }

  async invalidate(pattern: string): Promise<number> {
    let invalidatedCount = 0

    // Invalidate memory cache
    for (const [key] of this.memoryCache) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key)
        invalidatedCount++
      }
    }

    // Invalidate database cache
    try {
      const { data, error } = await this.supabase
        .from('prompt_cache')
        .delete()
        .or(`cache_key.like.%${pattern}%`)
        .select('id')

      if (!error && data) {
        invalidatedCount += data.length
      }

    } catch (error) {
      console.error('Cache invalidation error:', error)
    }

    return invalidatedCount
  }

  async invalidateUserCache(userId: string): Promise<void> {
    // Invalidate all cache entries for a specific user
    await this.invalidate(`user:${userId}`)
    await this.invalidate(`pers:${userId}`)
    
    // Also remove from memory cache
    for (const [key, entry] of this.memoryCache) {
      if (entry.metadata?.userId === userId) {
        this.memoryCache.delete(key)
      }
    }
  }

  async getStats(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<CacheStats> {
    const timeframeDates = this.getTimeframeDate(timeframe)
    
    try {
      const { data: statsData, error } = await this.supabase
        .from('cache_analytics')
        .select('*')
        .gte('created_at', timeframeDates.start.toISOString())
        .lte('created_at', timeframeDates.end.toISOString())

      if (error || !statsData) {
        return this.getDefaultStats()
      }

      const totalHits = statsData.filter(s => s.event_type === 'hit').length
      const totalMisses = statsData.filter(s => s.event_type === 'miss').length
      const totalRequests = totalHits + totalMisses
      
      const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0
      
      // Calculate cost savings (estimated)
      const costSavingsUSD = totalHits * 0.002 // Assume $0.002 saved per cache hit
      
      // Calculate average generation time saved
      const generationTimeSavings = statsData
        .filter(s => s.metadata && s.metadata.generationTimeMs)
        .reduce((sum, s) => sum + (s.metadata.generationTimeMs || 0), 0)
      const avgGenerationTimeMs = generationTimeSavings / Math.max(1, totalHits)

      // Get top categories
      const categoryHits = statsData.reduce((acc, s) => {
        const category = s.metadata?.promptCategory || 'unknown'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topCategories = Object.entries(categoryHits)
        .map(([category, hits]) => ({ category, hits }))
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 5)

      return {
        hitRate,
        totalHits,
        totalMisses,
        totalEntries: await this.getTotalCacheEntries(),
        costSavingsUSD,
        avgGenerationTimeMs,
        topCategories
      }

    } catch (error) {
      console.error('Error getting cache stats:', error)
      return this.getDefaultStats()
    }
  }

  private getDefaultStats(): CacheStats {
    return {
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      totalEntries: 0,
      costSavingsUSD: 0,
      avgGenerationTimeMs: 0,
      topCategories: []
    }
  }

  private async getTotalCacheEntries(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('prompt_cache')
        .select('*', { count: 'exact', head: true })
        .gt('expires_at', new Date().toISOString())

      return count || 0
    } catch (error) {
      return this.memoryCache.size
    }
  }

  private getTimeframeDate(timeframe: 'hour' | 'day' | 'week' | 'month') {
    const now = new Date()
    const start = new Date()

    switch (timeframe) {
      case 'hour':
        start.setHours(now.getHours() - 1)
        break
      case 'day':
        start.setDate(now.getDate() - 1)
        break
      case 'week':
        start.setDate(now.getDate() - 7)
        break
      case 'month':
        start.setMonth(now.getMonth() - 1)
        break
    }

    return { start, end: now }
  }

  private async updateCacheStats(
    key: string, 
    eventType: 'hit' | 'miss', 
    source: 'memory' | 'database' | 'error',
    responseTimeMs: number
  ): Promise<void> {
    try {
      // Log cache analytics for optimization
      await this.supabase
        .from('cache_analytics')
        .insert({
          cache_key: key,
          event_type: eventType,
          cache_source: source,
          response_time_ms: responseTimeMs,
          created_at: new Date().toISOString(),
          metadata: {
            cacheLevel: this.getCacheLevelFromKey(key),
            memorySize: this.memoryCache.size
          }
        })

    } catch (error) {
      // Don't log cache analytics errors to avoid spam
      // console.error('Cache analytics error:', error)
    }
  }

  // Cleanup expired entries (called by background job)
  async cleanupExpired(): Promise<number> {
    let cleanedCount = 0

    // Clean memory cache
    for (const [key, entry] of this.memoryCache) {
      if (new Date() > entry.expiry) {
        this.memoryCache.delete(key)
        cleanedCount++
      }
    }

    // Clean database cache
    try {
      const { data, error } = await this.supabase
        .from('prompt_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id')

      if (!error && data) {
        cleanedCount += data.length
      }

    } catch (error) {
      console.error('Cache cleanup error:', error)
    }

    return cleanedCount
  }

  // Warm cache with popular content (called by background job)
  async warmCache(popularKeys: string[]): Promise<void> {
    for (const key of popularKeys) {
      // Check if already cached
      const existing = await this.get(key)
      if (!existing) {
        // This would trigger generation of popular content
        console.log(`Cache warming needed for key: ${key}`)
      }
    }
  }

  // Get cache efficiency report
  async getEfficiencyReport(): Promise<{
    overallEfficiency: number
    recommendations: string[]
    topCostSavers: Array<{ key: string, savings: number }>
    underperformingKeys: Array<{ key: string, hitRate: number }>
  }> {
    const stats = await this.getStats('week')
    
    const overallEfficiency = stats.hitRate
    const recommendations: string[] = []

    if (stats.hitRate < 50) {
      recommendations.push('Consider pre-generating more popular content combinations')
    }

    if (stats.hitRate > 90) {
      recommendations.push('Cache performance is excellent - consider increasing TTL for some content')
    }

    if (stats.costSavingsUSD < 10) {
      recommendations.push('Low cost savings - review caching strategy for expensive operations')
    }

    // Get detailed performance data
    const { data: performanceData } = await this.supabase
      .from('prompt_cache')
      .select('cache_key, hit_count, metadata')
      .order('hit_count', { ascending: false })
      .limit(10)

    const topCostSavers = (performanceData || []).map(entry => ({
      key: entry.cache_key,
      savings: (entry.hit_count || 0) * 0.002 // Estimated savings per hit
    }))

    // Find underperforming cache keys
    const underperformingKeys = (performanceData || [])
      .filter(entry => (entry.hit_count || 0) < 2)
      .map(entry => ({
        key: entry.cache_key,
        hitRate: (entry.hit_count || 0) * 100 / Math.max(1, entry.hit_count || 1)
      }))

    return {
      overallEfficiency,
      recommendations,
      topCostSavers,
      underperformingKeys
    }
  }

  // Preload specific user's commonly used cache entries
  async preloadUserCache(userId: string): Promise<void> {
    const commonPatterns = [
      `pers:${userId}:communication:beginner`,
      `pers:${userId}:appreciation:beginner`,
      `pers:${userId}:intimacy:intermediate`
    ]

    for (const pattern of commonPatterns) {
      const cached = await this.get(pattern)
      if (cached) {
        // Already in cache
        continue
      }
      
      // This would trigger background generation
      console.log(`Preloading cache for pattern: ${pattern}`)
    }
  }
}

// Export types for other modules
export type { CacheEntry, CacheStats }