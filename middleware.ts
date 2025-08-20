import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database-complete.types'
import { rateLimitMiddleware } from '@/lib/rate-limiting/middleware'

// Define route protection patterns
const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify',
  '/auth/couple-invite',
  '/legal/privacy',
  '/legal/terms',
  '/crisis-resources',
  '/api/auth/callback'
]

const AUTH_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password'
]

const PROTECTED_ROUTES = [
  '/dashboard',
  '/onboarding',
  '/privacy',
  '/couple',
  '/assessment',
  '/goals',
  '/settings'
]

const ADMIN_ROUTES = [
  '/admin',
  '/support'
]

const CRISIS_ROUTES = [
  '/crisis',
  '/emergency'
]

function isRouteMatch(pathname: string, routes: string[]): boolean {
  return routes.some(route => {
    if (route === '/') return pathname === '/'
    return pathname.startsWith(route)
  })
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const response = NextResponse.next()

  // Apply rate limiting first (for API routes)
  const rateLimitResponse = await rateLimitMiddleware(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Create Supabase client
  const supabase = createMiddlewareClient<Database>({ req: request, res: response })

  // Get session
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession()

  // Handle session errors
  if (sessionError) {
    console.error('Session error in middleware:', sessionError)
    // Allow access to public routes even with session errors
    if (isRouteMatch(pathname, PUBLIC_ROUTES)) {
      return response
    }
    // Redirect to login for protected routes
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const isAuthenticated = !!session?.user
  const userEmail = session?.user?.email
  
  // Get user data if authenticated
  let userData: any = null
  let isOnboardingComplete = false
  let hasAcceptedConsent = false
  let isInCrisisState = false
  let isAdmin = false
  
  if (isAuthenticated && session?.user?.id) {
    try {
      // Get user profile
      const { data: user, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          user_consents!inner(consent_type, granted),
          crisis_escalations(status, severity_level)
        `)
        .eq('auth_id', session.user.id)
        .single()

      if (!userError && user) {
        userData = user
        
        // Check onboarding completion
        isOnboardingComplete = !!(
          user.terms_accepted_at && 
          user.privacy_policy_accepted_at && 
          user.data_processing_consent_at
        )
        
        // Check consent status
        const requiredConsents = ['safety_monitoring', 'data_processing', 'ai_content_analysis']
        const grantedConsents = user.user_consents?.filter((c: any) => c.granted) || []
        hasAcceptedConsent = requiredConsents.every(consent => 
          grantedConsents.some((gc: any) => gc.consent_type === consent)
        )
        
        // Check crisis state
        const activeCrises = user.crisis_escalations?.filter((c: any) => 
          c.status !== 'resolved' && ['high', 'critical', 'emergency'].includes(c.severity_level)
        ) || []
        isInCrisisState = activeCrises.length > 0
        
        // Check admin status (simplified - you might have a more complex role system)
        isAdmin = userEmail?.endsWith('@sparqconnection.com') || false
        
        // Update last active timestamp
        await supabase
          .from('users')
          .update({ last_active_at: new Date().toISOString() })
          .eq('auth_id', session.user.id)
          
        // Log session activity for audit
        await supabase
          .from('audit_log')
          .insert({
            user_id: user.id,
            action_type: 'user_login',
            resource_type: 'user_profile',
            details: {
              ip_address: request.headers.get('x-forwarded-for') || 'unknown',
              user_agent: request.headers.get('user-agent'),
              pathname: pathname
            },
            ip_address: request.headers.get('x-forwarded-for') || null,
            user_agent: request.headers.get('user-agent')
          })
      }
    } catch (error) {
      console.error('Error fetching user data in middleware:', error)
    }
  }

  // Handle couple invitation access
  if (pathname.startsWith('/auth/couple-invite/')) {
    const inviteCode = pathname.split('/').pop()
    if (inviteCode) {
      // Verify invitation is valid and not expired
      const { data: invitation } = await supabase
        .from('couple_invitations')
        .select('*')
        .eq('invitation_code', inviteCode)
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .single()
      
      if (!invitation) {
        return NextResponse.redirect(new URL('/auth/login?error=invalid_invitation', request.url))
      }
      
      // Allow access to invitation page
      return response
    }
  }

  // Route-based access control
  
  // Public routes - always accessible
  if (isRouteMatch(pathname, PUBLIC_ROUTES)) {
    return response
  }

  // Auth routes - redirect authenticated users
  if (isRouteMatch(pathname, AUTH_ROUTES) && isAuthenticated) {
    if (!isOnboardingComplete) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Crisis routes - special handling for crisis situations
  if (isRouteMatch(pathname, CRISIS_ROUTES)) {
    // Allow access to crisis resources even without authentication
    return response
  }

  // Admin routes - require admin access
  if (isRouteMatch(pathname, ADMIN_ROUTES)) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/dashboard?error=access_denied', request.url))
    }
    return response
  }

  // Protected routes - require authentication
  if (isRouteMatch(pathname, PROTECTED_ROUTES) || pathname.startsWith('/api/')) {
    if (!isAuthenticated) {
      // Store the intended destination
      const redirectUrl = new URL('/auth/login', request.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Handle onboarding flow
    if (!isOnboardingComplete && !pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Handle consent requirements
    if (isOnboardingComplete && !hasAcceptedConsent && !pathname.startsWith('/auth/consent')) {
      return NextResponse.redirect(new URL('/auth/consent', request.url))
    }

    // Crisis state handling - allow access but add crisis context
    if (isInCrisisState) {
      // Add crisis indicators to response headers for the UI to handle
      response.headers.set('X-Crisis-State', 'active')
      response.headers.set('X-Crisis-Resources', 'available')
    }

    // Safety monitoring context
    if (userData?.safety_monitoring_enabled) {
      response.headers.set('X-Safety-Monitoring', 'enabled')
    }

    return response
  }

  // API routes protection
  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith('/api/auth/') || pathname.startsWith('/api/public/')) {
      return response
    }
    
    if (!isAuthenticated) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      )
    }
    
    // Add user context to API requests
    response.headers.set('X-User-ID', userData?.id || '')
    response.headers.set('X-User-Auth-ID', session?.user?.id || '')
    
    return response
  }

  // Default: require authentication for all other routes
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}