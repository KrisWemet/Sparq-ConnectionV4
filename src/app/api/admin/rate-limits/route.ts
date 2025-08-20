import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/auth/auth-utils'
import { rateLimiter, rateLimitConfigs } from '@/lib/rate-limiting/upstash-limiter'
import { rateLimitingConfig } from '@/lib/config/environment'
import { resetRateLimit, getCurrentRateLimitStatus } from '@/lib/rate-limiting/middleware'

// GET - Get rate limit status for users/IPs
const getHandler = async (request: NextRequest, authContext: AuthContext) => {
  const { searchParams } = new URL(request.url)
  const identifier = searchParams.get('identifier')
  const action = searchParams.get('action')
  const userId = searchParams.get('userId')
  
  if (!identifier || !action) {
    return NextResponse.json(
      { error: 'Missing required parameters: identifier, action' },
      { status: 400 }
    )
  }
  
  const strategy = rateLimitingConfig.getStrategy()
  
  if (strategy !== 'upstash') {
    return NextResponse.json({
      message: 'Rate limiting not available',
      strategy,
      available: false
    })
  }
  
  try {
    // Get status for specific action
    const status = await rateLimiter.getStatus(
      action as keyof typeof rateLimitConfigs,
      identifier,
      userId || undefined
    )
    
    // Get analytics if available
    const analytics = await rateLimiter.getAnalytics(
      action as keyof typeof rateLimitConfigs
    )
    
    return NextResponse.json({
      identifier,
      action,
      userId,
      status,
      analytics,
      strategy,
      config: rateLimitConfigs[action as keyof typeof rateLimitConfigs]
    })
  } catch (error) {
    console.error('Error getting rate limit status:', error)
    return NextResponse.json(
      { error: 'Failed to get rate limit status' },
      { status: 500 }
    )
  }
}

// POST - Reset rate limits or update configuration
const postHandler = async (request: NextRequest, authContext: AuthContext) => {
  const body = await request.json()
  const { action: requestAction, identifier, userId, resetAll } = body
  
  const strategy = rateLimitingConfig.getStrategy()
  
  if (strategy !== 'upstash') {
    return NextResponse.json({
      error: 'Rate limiting not available',
      strategy
    }, { status: 400 })
  }
  
  try {
    if (resetAll) {
      // Reset all rate limits for a user/identifier
      const resetPromises = Object.keys(rateLimitConfigs).map(action =>
        rateLimiter.resetLimit(action, identifier, userId)
      )
      await Promise.all(resetPromises)
      
      return NextResponse.json({
        message: 'All rate limits reset successfully',
        identifier,
        userId,
        resetCount: resetPromises.length
      })
    }
    
    if (requestAction && identifier) {
      // Reset specific rate limit
      await rateLimiter.resetLimit(requestAction, identifier, userId)
      
      return NextResponse.json({
        message: 'Rate limit reset successfully',
        action: requestAction,
        identifier,
        userId
      })
    }
    
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error resetting rate limit:', error)
    return NextResponse.json(
      { error: 'Failed to reset rate limit' },
      { status: 500 }
    )
  }
}

// GET /api/admin/rate-limits/overview - Get overview of all rate limits
const getOverviewHandler = async (request: NextRequest, authContext: AuthContext) => {
  const strategy = rateLimitingConfig.getStrategy()
  
  return NextResponse.json({
    strategy,
    enabled: rateLimitingConfig.enabled,
    upstashAvailable: rateLimitingConfig.upstashAvailable,
    fallbackToDatabase: rateLimitingConfig.fallbackToDatabase,
    configurations: rateLimitConfigs,
    endpoints: {
      'GET /api/admin/rate-limits': 'Get rate limit status for specific identifier/action',
      'POST /api/admin/rate-limits': 'Reset rate limits',
      'GET /api/admin/rate-limits/overview': 'Get system overview (this endpoint)',
      'GET /api/admin/rate-limits/analytics': 'Get rate limiting analytics'
    }
  })
}

// Analytics endpoint
const getAnalyticsHandler = async (request: NextRequest, authContext: AuthContext) => {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const timeRange = searchParams.get('timeRange') || '1h'
  
  const strategy = rateLimitingConfig.getStrategy()
  
  if (strategy !== 'upstash') {
    return NextResponse.json({
      message: 'Analytics not available',
      strategy
    })
  }
  
  try {
    if (action) {
      const analytics = await rateLimiter.getAnalytics(
        action as keyof typeof rateLimitConfigs,
        timeRange
      )
      return NextResponse.json({ action, timeRange, analytics })
    }
    
    // Get analytics for all actions
    const allAnalytics = await Promise.all(
      Object.keys(rateLimitConfigs).map(async (act) => ({
        action: act,
        analytics: await rateLimiter.getAnalytics(
          act as keyof typeof rateLimitConfigs,
          timeRange
        )
      }))
    )
    
    return NextResponse.json({
      timeRange,
      analytics: allAnalytics
    })
  } catch (error) {
    console.error('Error getting analytics:', error)
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    )
  }
}

// Route handlers with admin authentication
export const GET = withAuth(async (request: NextRequest, authContext: AuthContext) => {
  const { pathname } = new URL(request.url)
  
  if (pathname.endsWith('/overview')) {
    return getOverviewHandler(request, authContext)
  }
  
  if (pathname.endsWith('/analytics')) {
    return getAnalyticsHandler(request, authContext)
  }
  
  return getHandler(request, authContext)
}, { 
  requireAuth: true, 
  requireAdmin: true 
})

export const POST = withAuth(postHandler, { 
  requireAuth: true, 
  requireAdmin: true 
})