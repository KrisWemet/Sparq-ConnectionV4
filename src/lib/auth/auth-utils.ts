import { createServerComponentClient, createRouteHandlerClient, createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'
import { rateLimitingConfig } from '@/lib/config/environment'
import { rateLimiter, createRateLimitResponse, checkRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/upstash-limiter'

export interface AuthenticatedUser {
  id: string
  email: string
  role?: string
  isAdmin: boolean
  userId: string
  coupleId?: string
  safetyMonitoringEnabled: boolean
  lastActiveAt: Date
}

export interface AuthContext {
  user: AuthenticatedUser
  session: any
  isAuthenticated: boolean
}

/**
 * Enhanced server-side authentication utility for API routes
 */
export async function createAuthenticatedServerClient(request?: NextRequest) {
  const supabase = request 
    ? createRouteHandlerClient<Database>({ cookies })
    : createServerComponentClient<Database>({ cookies })
  
  return supabase
}

/**
 * Enhanced client-side authentication utility
 */
export function createAuthenticatedClient() {
  return createClientComponentClient<Database>()
}

/**
 * Enhanced middleware client with additional context
 */
export function createAuthenticatedMiddlewareClient(req: NextRequest, res: NextResponse) {
  return createMiddlewareClient<Database>({ req, res })
}

/**
 * Verify user authentication and return enhanced user context
 */
export async function verifyAuthentication(request?: NextRequest): Promise<AuthContext | null> {
  try {
    const supabase = await createAuthenticatedServerClient(request)
    
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return null
    }

    // Get enhanced user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        user_id,
        email,
        display_name,
        role,
        safety_monitoring_enabled,
        last_active_at,
        created_at,
        couple_members!inner (
          couple_id
        )
      `)
      .eq('user_id', session.user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      // Still return basic auth context even if profile fetch fails
      return {
        user: {
          id: session.user.id,
          email: session.user.email || '',
          isAdmin: false,
          userId: session.user.id,
          safetyMonitoringEnabled: false,
          lastActiveAt: new Date()
        },
        session,
        isAuthenticated: true
      }
    }

    // Determine admin status
    const isAdmin = userProfile?.role === 'admin' || 
                   session.user.email?.endsWith('@sparqconnection.com') || 
                   false

    return {
      user: {
        id: userProfile.id,
        email: userProfile.email || session.user.email || '',
        role: userProfile.role,
        isAdmin,
        userId: session.user.id,
        coupleId: userProfile.couple_members?.[0]?.couple_id,
        safetyMonitoringEnabled: userProfile.safety_monitoring_enabled || false,
        lastActiveAt: new Date(userProfile.last_active_at || userProfile.created_at)
      },
      session,
      isAuthenticated: true
    }
    
  } catch (error) {
    console.error('Authentication verification error:', error)
    return null
  }
}

/**
 * API route authentication middleware
 */
export async function requireAuthentication(request: NextRequest): Promise<{ authContext: AuthContext, response?: NextResponse }> {
  const authContext = await verifyAuthentication(request)
  
  if (!authContext) {
    return {
      authContext: null as any,
      response: new NextResponse(
        JSON.stringify({ 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          } 
        }),
        { 
          status: 401, 
          headers: { 
            'content-type': 'application/json',
            'WWW-Authenticate': 'Bearer'
          } 
        }
      )
    }
  }

  // Update last active timestamp
  try {
    const supabase = await createAuthenticatedServerClient(request)
    await supabase
      .from('user_profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('user_id', authContext.user.userId)
  } catch (error) {
    console.error('Error updating last active timestamp:', error)
    // Don't fail auth for this error
  }

  return { authContext }
}

/**
 * Admin-only route protection
 */
export async function requireAdminAuthentication(request: NextRequest): Promise<{ authContext: AuthContext, response?: NextResponse }> {
  const { authContext, response } = await requireAuthentication(request)
  
  if (response) {
    return { authContext, response }
  }

  if (!authContext.user.isAdmin) {
    return {
      authContext,
      response: new NextResponse(
        JSON.stringify({ 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Admin access required',
            timestamp: new Date().toISOString()
          } 
        }),
        { 
          status: 403, 
          headers: { 'content-type': 'application/json' } 
        }
      )
    }
  }

  return { authContext }
}

/**
 * Rate limiting and security headers helper
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  return response
}

/**
 * Enhanced auth response helper
 */
export function createAuthErrorResponse(
  code: string,
  message: string,
  status: number = 401
): NextResponse {
  const response = new NextResponse(
    JSON.stringify({
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        documentation: 'https://docs.sparqconnection.com/auth-errors'
      }
    }),
    {
      status,
      headers: {
        'content-type': 'application/json'
      }
    }
  )

  return addSecurityHeaders(response)
}

/**
 * Validate JWT token structure and claims (for backup verification)
 */
export function validateTokenStructure(token: string): boolean {
  try {
    // Basic JWT structure validation (header.payload.signature)
    const parts = token.split('.')
    if (parts.length !== 3) return false
    
    // Validate each part is base64url encoded
    for (const part of parts) {
      if (!/^[A-Za-z0-9_-]+$/.test(part)) return false
    }
    
    // Decode and validate payload structure
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    
    // Check required claims
    if (!payload.sub || !payload.iat || !payload.exp) return false
    
    // Check expiration
    if (payload.exp * 1000 < Date.now()) return false
    
    return true
  } catch (error) {
    return false
  }
}

/**
 * Enhanced session-based rate limiting with Upstash integration
 */
export async function checkEnhancedRateLimit(
  userId: string,
  action: string,
  request?: NextRequest,
  limit: number = 100,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number; resetTime: number; blocked?: boolean; retryAfter?: number }> {
  const strategy = rateLimitingConfig.getStrategy()
  
  // If rate limiting is disabled
  if (strategy === 'disabled') {
    return { allowed: true, remaining: limit, resetTime: Date.now() + windowMs }
  }
  
  // Use Upstash rate limiting if available
  if (strategy === 'upstash' && request) {
    try {
      const result = await checkRateLimit(action as keyof typeof rateLimitConfigs, request, userId)
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetTime: result.reset.getTime(),
        blocked: result.blocked,
        retryAfter: result.retryAfter
      }
    } catch (error) {
      console.error('Upstash rate limiting error, falling back to database:', error)
      // Fall through to database rate limiting
    }
  }
  
  // Fallback to database rate limiting
  if (strategy === 'database' || rateLimitingConfig.fallbackToDatabase) {
    try {
      const supabase = await createAuthenticatedServerClient()
      const windowStart = new Date(Date.now() - windowMs)
      
      // Count recent actions
      const { data: recentActions, error } = await supabase
        .from('rate_limit_log')
        .select('id')
        .eq('user_id', userId)
        .eq('action', action)
        .gte('created_at', windowStart.toISOString())
      
      if (error) {
        console.error('Database rate limit check error:', error)
        return { allowed: true, remaining: limit, resetTime: Date.now() + windowMs }
      }
      
      const count = recentActions?.length || 0
      const remaining = Math.max(0, limit - count)
      const allowed = count < limit
      
      if (allowed) {
        // Log this action
        await supabase
          .from('rate_limit_log')
          .insert({
            user_id: userId,
            action,
            ip_address: request?.headers.get('x-forwarded-for') || null,
            created_at: new Date().toISOString()
          })
      }
      
      return {
        allowed,
        remaining,
        resetTime: Date.now() + windowMs
      }
    } catch (error) {
      console.error('Database rate limiting error:', error)
      // Fail open for availability
      return { allowed: true, remaining: limit, resetTime: Date.now() + windowMs }
    }
  }
  
  // Default fallback
  return { allowed: true, remaining: limit, resetTime: Date.now() + windowMs }
}

/**
 * Enhanced API route wrapper with authentication and security
 */
export function withAuth(
  handler: (request: NextRequest, authContext: AuthContext) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean
    requireAdmin?: boolean
    rateLimit?: { action: string; limit: number; windowMs?: number }
  } = { requireAuth: true }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      let authContext: AuthContext | null = null
      
      if (options.requireAuth) {
        if (options.requireAdmin) {
          const { authContext: ctx, response } = await requireAdminAuthentication(request)
          if (response) return addSecurityHeaders(response)
          authContext = ctx
        } else {
          const { authContext: ctx, response } = await requireAuthentication(request)
          if (response) return addSecurityHeaders(response)
          authContext = ctx
        }
      } else {
        authContext = await verifyAuthentication(request)
      }

      // Enhanced rate limiting with Upstash integration
      if (options.rateLimit && authContext?.user.userId) {
        const rateLimitResult = await checkEnhancedRateLimit(
          authContext.user.userId,
          options.rateLimit.action,
          request,
          options.rateLimit.limit,
          options.rateLimit.windowMs
        )
        
        if (!rateLimitResult.allowed) {
          // Use Upstash response format if available, otherwise fallback
          const strategy = rateLimitingConfig.getStrategy()
          if (strategy === 'upstash') {
            const upstashResult = await checkRateLimit(
              options.rateLimit.action as keyof typeof rateLimitConfigs, 
              request, 
              authContext.user.userId
            )
            const rateLimitResponse = createRateLimitResponse(upstashResult, options.rateLimit.action)
            return addSecurityHeaders(new NextResponse(rateLimitResponse.body, {
              status: rateLimitResponse.status,
              headers: rateLimitResponse.headers
            }))
          }
          
          // Fallback rate limit response
          const response = new NextResponse(
            JSON.stringify({
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: rateLimitResult.blocked ? 'Rate limit exceeded. Temporarily blocked.' : 'Too many requests',
                remaining: rateLimitResult.remaining,
                resetTime: rateLimitResult.resetTime,
                blocked: rateLimitResult.blocked,
                retryAfter: rateLimitResult.retryAfter
              }
            }),
            { 
              status: 429,
              headers: {
                'content-type': 'application/json',
                'Retry-After': (rateLimitResult.retryAfter || Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)).toString(),
                'X-RateLimit-Limit': options.rateLimit.limit.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
              }
            }
          )
          return addSecurityHeaders(response)
        }
      }
      
      const response = await handler(request, authContext!)
      return addSecurityHeaders(response)
      
    } catch (error) {
      console.error('Auth wrapper error:', error)
      const response = createAuthErrorResponse(
        'INTERNAL_ERROR',
        'Internal server error',
        500
      )
      return addSecurityHeaders(response)
    }
  }
}