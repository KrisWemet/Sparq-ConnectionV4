// Environment configuration with validation
export const env = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID!,

  // Upstash Redis (with fallbacks for development)
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',

  // AI Services
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  OPENROUTER_APP_URL: process.env.OPENROUTER_APP_URL || 'http://localhost:3000',
  OPENROUTER_APP_NAME: process.env.OPENROUTER_APP_NAME || 'Sparq Connection',

  // Rate Limiting Settings
  RATE_LIMITING_ENABLED: process.env.RATE_LIMITING_ENABLED !== 'false', // Default to enabled
  FALLBACK_TO_DATABASE_RATE_LIMITING: process.env.FALLBACK_TO_DATABASE_RATE_LIMITING !== 'false',

  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Feature Flags
  ENABLE_CRISIS_DETECTION: process.env.ENABLE_CRISIS_DETECTION !== 'false',
  ENABLE_AI_CONTENT_GENERATION: process.env.ENABLE_AI_CONTENT_GENERATION !== 'false',
}

// Validation function
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Required variables
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
  
  for (const key of required) {
    if (!env[key as keyof typeof env]) {
      errors.push(`Missing required environment variable: ${key}`)
    }
  }
  
  // Upstash validation (warn if missing in production)
  if (env.NODE_ENV === 'production') {
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      errors.push('Upstash Redis configuration missing in production environment')
    }
  }
  
  // OpenRouter validation
  if (!env.OPENROUTER_API_KEY) {
    console.warn("⚠️ OPENROUTER_API_KEY is not set. AI features will be disabled.");
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Rate limiting configuration
export const rateLimitingConfig = {
  enabled: env.RATE_LIMITING_ENABLED,
  upstashAvailable: Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
  fallbackToDatabase: env.FALLBACK_TO_DATABASE_RATE_LIMITING,
  
  // Get appropriate rate limiting strategy
  getStrategy(): 'upstash' | 'database' | 'disabled' {
    if (!this.enabled) return 'disabled'
    if (this.upstashAvailable) return 'upstash'
    if (this.fallbackToDatabase) return 'database'
    return 'disabled'
  }
}