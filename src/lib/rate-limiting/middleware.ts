import { NextRequest, NextResponse } from 'next/server'
import { rateLimitingConfig } from '@/lib/config/environment'
import { rateLimiter, createRateLimitResponse, checkRateLimit } from './upstash-limiter'

// Rate limit configuration for different route patterns
const routeRateLimits = {
  // Authentication routes
  '/api/auth': { action: 'auth_login' as const, limit: 5, window: 60000 },
  '/api/register': { action: 'auth_register' as const, limit: 3, window: 3600000 },
  '/api/reset-password': { action: 'auth_reset_password' as const, limit: 3, window: 3600000 },
  
  // Invite system
  '/api/v1/invite': { action: 'create_invite' as const, limit: 10, window: 3600000 },
  '/api/v1/invite/accept': { action: 'accept_invite' as const, limit: 5, window: 900000 },
  
  // AI and content generation
  '/api/prompts/daily': { action: 'daily_prompt' as const, limit: 50, window: 3600000 },
  '/api/ai': { action: 'ai_content_generation' as const, limit: 20, window: 3600000 },
  
  // Crisis and safety
  '/api/crisis': { action: 'crisis_detection' as const, limit: 100, window: 3600000 },
  '/api/emergency': { action: 'emergency_resources' as const, limit: 200, window: 3600000 },
  
  // General API
  '/api': { action: 'api_general' as const, limit: 1000, window: 3600000 },
}

// Extract user identifier (IP + User-Agent hash for anonymous users)
function getUserIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
           request.headers.get('x-real-ip') || 
           request.ip ||
           'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // Create a simple hash of IP + User-Agent for better identification
  const identifier = `${ip}:${userAgent.slice(0, 50)}`
  return identifier
}

// Check if route should be rate limited
function shouldRateLimit(pathname: string): boolean {
  // Skip rate limiting for static assets and internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    pathname === '/api/health' ||
    pathname === '/api/status'
  ) {
    return false
  }
  
  return pathname.startsWith('/api')
}

// Get rate limit configuration for a route
function getRateLimitConfig(pathname: string) {
  // Find the most specific matching route
  const sortedRoutes = Object.keys(routeRateLimits)
    .sort((a, b) => b.length - a.length) // Sort by specificity (longer = more specific)
  
  for (const route of sortedRoutes) {
    if (pathname.startsWith(route)) {
      return routeRateLimits[route as keyof typeof routeRateLimits]
    }
  }
  
  // Default to general API rate limiting
  return routeRateLimits['/api']
}

// Rate limiting middleware
export async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  
  // Skip rate limiting if disabled or not applicable
  if (!rateLimitingConfig.enabled || !shouldRateLimit(pathname)) {
    return null
  }
  
  const strategy = rateLimitingConfig.getStrategy()
  
  // Skip if no rate limiting strategy available
  if (strategy === 'disabled') {
    return null
  }
  
  try {
    const identifier = getUserIdentifier(request)
    const config = getRateLimitConfig(pathname)
    
    // Use Upstash rate limiting
    if (strategy === 'upstash') {
      const result = await checkRateLimit(config.action, request)
      
      if (!result.success) {
        const rateLimitResponse = createRateLimitResponse(result, config.action)
        return new NextResponse(rateLimitResponse.body, {
          status: rateLimitResponse.status,
          headers: rateLimitResponse.headers
        })
      }
      
      // Add rate limit headers to successful responses
      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Limit', result.limit.toString())
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
      response.headers.set('X-RateLimit-Reset', result.reset.getTime().toString())
      
      return response
    }
    
    // For database fallback, we'll handle it in the individual API routes
    // to avoid database calls in middleware
    return null
    
  } catch (error) {
    console.error('Rate limiting middleware error:', error)
    // Fail open - allow the request through
    return null
  }
}

// Utility to add rate limit headers to responses
export function addRateLimitHeaders(
  response: NextResponse,
  result: { limit: number; remaining: number; reset: Date }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.getTime().toString())
  return response
}

// Get current rate limit status for a user (utility for dashboard/admin)
export async function getCurrentRateLimitStatus(
  identifier: string,
  action: keyof typeof routeRateLimits
): Promise<{
  limit: number
  remaining: number
  reset: Date
  blocked: boolean
} | null> {
  const strategy = rateLimitingConfig.getStrategy()
  
  if (strategy !== 'upstash') {
    return null
  }
  
  try {
    const result = await rateLimiter.getStatus(
      routeRateLimits[action].action,
      identifier
    )
    
    return {
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      blocked: result.blocked
    }
  } catch (error) {
    console.error('Error getting rate limit status:', error)
    return null
  }
}

// Admin function to reset rate limits
export async function resetRateLimit(
  identifier: string,
  action: string,
  userId?: string
): Promise<boolean> {
  const strategy = rateLimitingConfig.getStrategy()
  
  if (strategy !== 'upstash') {
    return false
  }
  
  try {
    await rateLimiter.resetLimit(action, identifier, userId)
    return true
  } catch (error) {
    console.error('Error resetting rate limit:', error)
    return false
  }
}