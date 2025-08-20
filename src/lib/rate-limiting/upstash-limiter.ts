import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limiting configurations for different endpoints
export const rateLimitConfigs = {
  // Authentication endpoints
  auth_login: { limit: 5, window: '1 m', blockDuration: '15 m' },
  auth_register: { limit: 3, window: '1 h', blockDuration: '1 h' },
  auth_reset_password: { limit: 3, window: '1 h', blockDuration: '1 h' },
  
  // Invite system endpoints
  create_invite: { limit: 10, window: '1 h', blockDuration: '1 h' },
  accept_invite: { limit: 5, window: '15 m', blockDuration: '15 m' },
  fetch_invites: { limit: 100, window: '1 h', blockDuration: '5 m' },
  
  // Daily prompts and content
  daily_prompt: { limit: 50, window: '1 h', blockDuration: '5 m' },
  ai_content_generation: { limit: 20, window: '1 h', blockDuration: '10 m' },
  
  // Crisis and safety endpoints
  crisis_detection: { limit: 100, window: '1 h', blockDuration: '1 m' },
  emergency_resources: { limit: 200, window: '1 h', blockDuration: '1 m' },
  
  // General API access
  api_general: { limit: 1000, window: '1 h', blockDuration: '1 m' },
  api_heavy: { limit: 100, window: '1 h', blockDuration: '5 m' },
  
  // Subscription tier specific
  free_tier: { limit: 50, window: '1 h', blockDuration: '5 m' },
  premium_tier: { limit: 200, window: '1 h', blockDuration: '2 m' },
  pro_tier: { limit: 500, window: '1 h', blockDuration: '1 m' },
}

// Create rate limiters
export const createRateLimiter = (
  identifier: string,
  limit: number,
  window: string,
  blockDuration?: string
) => {
  const windowMs = parseTimeString(window)
  const blockMs = blockDuration ? parseTimeString(blockDuration) : windowMs
  
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    analytics: true,
    prefix: `sparq_${identifier}`,
    timeout: 5000, // 5 second timeout for Redis operations
  })
}

// Parse time strings like '1 h', '15 m', '30 s' to milliseconds
function parseTimeString(timeStr: string): number {
  const [value, unit] = timeStr.split(' ')
  const num = parseInt(value)
  
  switch (unit) {
    case 's': return num * 1000
    case 'm': return num * 60 * 1000
    case 'h': return num * 60 * 60 * 1000
    case 'd': return num * 24 * 60 * 60 * 1000
    default: throw new Error(`Unknown time unit: ${unit}`)
  }
}

// Rate limit result interface
export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: Date
  blocked: boolean
  blockUntil?: Date
  retryAfter?: number
}

// Enhanced rate limiting with IP + User ID combination
export class EnhancedRateLimiter {
  private limiters: Map<string, Ratelimit> = new Map()
  private blockedKeys: Map<string, Date> = new Map()
  
  constructor() {
    // Pre-create common limiters
    Object.entries(rateLimitConfigs).forEach(([key, config]) => {
      this.limiters.set(key, createRateLimiter(key, config.limit, config.window))
    })
  }

  /**
   * Check rate limit for a specific action
   */
  async checkLimit(
    action: keyof typeof rateLimitConfigs,
    identifier: string,
    userId?: string
  ): Promise<RateLimitResult> {
    try {
      const config = rateLimitConfigs[action]
      if (!config) {
        throw new Error(`Unknown rate limit action: ${action}`)
      }

      // Create composite key for more precise rate limiting
      const compositeKey = userId ? `${identifier}:${userId}` : identifier
      const blockKey = `${action}:${compositeKey}`
      
      // Check if currently blocked
      const blockedUntil = this.blockedKeys.get(blockKey)
      if (blockedUntil && blockedUntil > new Date()) {
        return {
          success: false,
          limit: config.limit,
          remaining: 0,
          reset: new Date(Date.now() + parseTimeString(config.window)),
          blocked: true,
          blockUntil: blockedUntil,
          retryAfter: Math.ceil((blockedUntil.getTime() - Date.now()) / 1000)
        }
      }

      // Get or create rate limiter
      let limiter = this.limiters.get(action)
      if (!limiter) {
        limiter = createRateLimiter(action, config.limit, config.window)
        this.limiters.set(action, limiter)
      }

      // Check rate limit
      const result = await limiter.limit(compositeKey)
      
      // Handle blocking for repeated violations
      if (!result.success) {
        const blockDuration = parseTimeString(config.blockDuration || config.window)
        const blockUntil = new Date(Date.now() + blockDuration)
        this.blockedKeys.set(blockKey, blockUntil)
        
        // Clean up expired blocks periodically
        this.cleanupExpiredBlocks()
        
        return {
          success: false,
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
          blocked: true,
          blockUntil,
          retryAfter: Math.ceil(blockDuration / 1000)
        }
      }

      // Remove from blocked list if successful
      this.blockedKeys.delete(blockKey)

      return {
        success: true,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        blocked: false
      }
    } catch (error) {
      console.error(`Rate limiting error for ${action}:`, error)
      // Fail open for availability
      return {
        success: true,
        limit: 1000,
        remaining: 999,
        reset: new Date(Date.now() + 60000),
        blocked: false
      }
    }
  }

  /**
   * Get rate limit for subscription tier
   */
  async checkTierLimit(
    tier: 'free' | 'premium' | 'pro',
    identifier: string,
    userId: string
  ): Promise<RateLimitResult> {
    const action = `${tier}_tier` as keyof typeof rateLimitConfigs
    return this.checkLimit(action, identifier, userId)
  }

  /**
   * Reset rate limit for a specific key (admin function)
   */
  async resetLimit(action: string, identifier: string, userId?: string): Promise<void> {
    try {
      const compositeKey = userId ? `${identifier}:${userId}` : identifier
      const blockKey = `${action}:${compositeKey}`
      
      // Remove from blocked list
      this.blockedKeys.delete(blockKey)
      
      // Reset in Redis
      await redis.del(`sparq_${action}:${compositeKey}`)
    } catch (error) {
      console.error('Error resetting rate limit:', error)
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(
    action: keyof typeof rateLimitConfigs,
    identifier: string,
    userId?: string
  ): Promise<RateLimitResult> {
    try {
      const compositeKey = userId ? `${identifier}:${userId}` : identifier
      const key = `sparq_${action}:${compositeKey}`
      
      // Get current count from Redis
      const currentData = await redis.hgetall(key)
      const config = rateLimitConfigs[action]
      
      if (!currentData || Object.keys(currentData).length === 0) {
        return {
          success: true,
          limit: config.limit,
          remaining: config.limit,
          reset: new Date(Date.now() + parseTimeString(config.window)),
          blocked: false
        }
      }

      const count = parseInt(currentData.count as string) || 0
      const windowStart = parseInt(currentData.start as string) || Date.now()
      const windowEnd = windowStart + parseTimeString(config.window)
      
      return {
        success: count < config.limit,
        limit: config.limit,
        remaining: Math.max(0, config.limit - count),
        reset: new Date(windowEnd),
        blocked: false
      }
    } catch (error) {
      console.error('Error getting rate limit status:', error)
      return {
        success: true,
        limit: 1000,
        remaining: 999,
        reset: new Date(Date.now() + 60000),
        blocked: false
      }
    }
  }

  /**
   * Clean up expired blocked keys
   */
  private cleanupExpiredBlocks(): void {
    const now = new Date()
    for (const [key, blockUntil] of this.blockedKeys.entries()) {
      if (blockUntil <= now) {
        this.blockedKeys.delete(key)
      }
    }
  }

  /**
   * Get rate limiting analytics
   */
  async getAnalytics(action: keyof typeof rateLimitConfigs, timeRange: string = '1h'): Promise<any> {
    try {
      const limiter = this.limiters.get(action)
      if (!limiter) {
        return null
      }
      
      // Note: This would require Upstash Analytics API
      // For now, return basic info
      return {
        action,
        config: rateLimitConfigs[action],
        message: 'Analytics requires Upstash Pro plan'
      }
    } catch (error) {
      console.error('Error getting analytics:', error)
      return null
    }
  }
}

// Global rate limiter instance
export const rateLimiter = new EnhancedRateLimiter()

// Utility functions for middleware and API routes
export async function checkRateLimit(
  action: keyof typeof rateLimitConfigs,
  request: Request,
  userId?: string
): Promise<RateLimitResult> {
  // Get identifier (IP address or user ID)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 
           request.headers.get('x-real-ip') || 
           'unknown'
  
  const identifier = userId || ip
  return rateLimiter.checkLimit(action, identifier, userId)
}

// Rate limit response helper
export function createRateLimitResponse(result: RateLimitResult, action?: string): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.getTime().toString(),
  }
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString()
  }
  
  if (result.blocked && result.blockUntil) {
    headers['X-RateLimit-Blocked-Until'] = result.blockUntil.toISOString()
  }

  const body = {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: result.blocked ? 
        `Rate limit exceeded. Blocked until ${result.blockUntil?.toISOString()}` :
        'Rate limit exceeded. Please try again later.',
      action,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset.toISOString(),
      blocked: result.blocked,
      retryAfter: result.retryAfter
    }
  }

  return new Response(JSON.stringify(body), {
    status: 429,
    headers
  })
}