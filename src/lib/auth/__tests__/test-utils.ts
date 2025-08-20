import { jest } from '@jest/globals'

/**
 * Test utilities for authentication system tests
 */

// Mock user data
export const mockUsers = {
  testUser: {
    id: 'test-user-id',
    email: 'test@example.com',
    full_name: 'Test User',
    jurisdiction: 'US',
    created_at: '2024-01-01T00:00:00Z'
  },
  partnerUser: {
    id: 'partner-user-id',
    email: 'partner@example.com',
    full_name: 'Partner User',
    jurisdiction: 'US',
    created_at: '2024-01-01T00:00:00Z'
  }
}

// Mock consent data
export const mockConsents = {
  valid: {
    essential_cookies: true,
    analytics_cookies: true,
    safety_monitoring: true,
    ai_processing: true,
    data_sharing: true
  },
  incomplete: {
    essential_cookies: true,
    // Missing required consents
  },
  revoked: {
    essential_cookies: true,
    analytics_cookies: false,
    safety_monitoring: true,
    ai_processing: false,
    data_sharing: false
  }
}

// Mock invitation data
export const mockInvitations = {
  valid: {
    id: 'valid-invitation-id',
    code: 'VALID123',
    inviter_id: mockUsers.testUser.id,
    partner_email: mockUsers.partnerUser.email,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    accepted: false,
    safety_discussion_completed: true
  },
  expired: {
    id: 'expired-invitation-id',
    code: 'EXPIRED123',
    inviter_id: mockUsers.testUser.id,
    partner_email: mockUsers.partnerUser.email,
    expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    accepted: false,
    safety_discussion_completed: false
  },
  accepted: {
    id: 'accepted-invitation-id',
    code: 'ACCEPTED123',
    inviter_id: mockUsers.testUser.id,
    partner_email: mockUsers.partnerUser.email,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    accepted: true,
    accepted_by: mockUsers.partnerUser.id,
    accepted_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    safety_discussion_completed: true
  }
}

// Mock safety discussion data
export const mockSafetyDiscussion = {
  complete: {
    domesticViolenceAwareness: true,
    privacyBoundaries: true,
    emergencyProtocols: true,
    dataSharing: true,
    helpSeekingComfort: true
  },
  incomplete: {
    domesticViolenceAwareness: true,
    privacyBoundaries: false, // Missing required
    emergencyProtocols: true,
    dataSharing: true,
    helpSeekingComfort: true
  }
}

// Mock jurisdiction data
export const mockJurisdictions = {
  US: {
    code: 'US',
    name: 'United States',
    region: 'North America',
    emergencyNumber: '911',
    privacyLaw: 'OTHER',
    dataRetentionRequirements: {
      generalData: 365,
      safetyData: 2555,
      consentRecords: 2555
    },
    legalRequirements: {
      consentAge: 13,
      mandatoryReporting: true,
      rightToBeforgotten: false,
      dataPortability: false
    },
    crisisResources: [
      {
        name: 'National Suicide Prevention Lifeline',
        contact: '988',
        type: 'hotline' as const,
        availability: '24/7',
        languages: ['English', 'Spanish'],
        specializations: ['suicide prevention', 'mental health crisis']
      }
    ],
    domesticViolenceResources: [
      {
        name: 'National Domestic Violence Hotline',
        contact: '1-800-799-7233',
        website: 'https://www.thehotline.org',
        languages: ['English', 'Spanish'],
        services: ['crisis counseling', 'safety planning', 'referrals']
      }
    ],
    mentalHealthResources: [
      {
        name: 'SAMHSA National Helpline',
        contact: '1-800-662-4357',
        type: 'referral' as const,
        cost: 'free' as const,
        languages: ['English', 'Spanish']
      }
    ]
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    region: 'Europe',
    emergencyNumber: '112',
    privacyLaw: 'GDPR' as const,
    dataRetentionRequirements: {
      generalData: 365,
      safetyData: 2555,
      consentRecords: 2555
    },
    legalRequirements: {
      consentAge: 16,
      mandatoryReporting: true,
      rightToBeforgotten: true,
      dataPortability: true
    },
    crisisResources: [
      {
        name: 'Telefonseelsorge',
        contact: '0800 111 0 111',
        type: 'hotline' as const,
        availability: '24/7',
        languages: ['German'],
        specializations: ['crisis counseling', 'suicide prevention']
      }
    ],
    domesticViolenceResources: [
      {
        name: 'Hilfetelefon Gewalt gegen Frauen',
        contact: '08000 116 016',
        website: 'https://www.hilfetelefon.de',
        languages: ['German'],
        services: ['crisis counseling', 'safety planning']
      }
    ],
    mentalHealthResources: [
      {
        name: 'Deutsche DepressionsLiga',
        contact: '0800 33 44 533',
        type: 'support' as const,
        cost: 'free' as const,
        languages: ['German']
      }
    ]
  }
}

// Mock Supabase client builder
export const createMockSupabaseClient = (mockData: any = {}) => {
  const mockClient = {
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ 
            data: mockData[table]?.select?.single || null, 
            error: mockData[table]?.select?.error || null 
          })),
          order: jest.fn(() => ({
            data: mockData[table]?.select?.order || [],
            error: mockData[table]?.select?.error || null
          }))
        })),
        or: jest.fn(() => ({
          single: jest.fn(() => ({ 
            data: mockData[table]?.select?.single || null, 
            error: mockData[table]?.select?.error || null 
          }))
        }))
      })),
      insert: jest.fn(() => ({ 
        data: mockData[table]?.insert || [], 
        error: mockData[table]?.insertError || null 
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({ 
          error: mockData[table]?.updateError || null 
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({ 
          error: mockData[table]?.deleteError || null 
        }))
      }))
    })),
    auth: {
      signUp: jest.fn(() => ({ 
        data: mockData.auth?.signUp || { user: mockUsers.testUser, session: null }, 
        error: mockData.auth?.signUpError || null 
      })),
      signInWithPassword: jest.fn(() => ({ 
        data: mockData.auth?.signIn || { user: mockUsers.testUser, session: {} }, 
        error: mockData.auth?.signInError || null 
      })),
      signOut: jest.fn(() => ({ error: null })),
      getSession: jest.fn(() => ({ 
        data: { session: mockData.auth?.session || null }, 
        error: null 
      })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      resetPasswordForEmail: jest.fn(() => ({ 
        error: mockData.auth?.resetPasswordError || null 
      })),
      updateUser: jest.fn(() => ({ 
        error: mockData.auth?.updateUserError || null 
      }))
    },
    rpc: jest.fn(() => ({ 
      data: mockData.rpc?.data || null, 
      error: mockData.rpc?.error || null 
    }))
  }

  return mockClient
}

// Helper to create mock form events
export const createMockFormEvent = (formData: Record<string, any> = {}) => {
  const mockEvent = {
    preventDefault: jest.fn(),
    target: {
      elements: Object.entries(formData).reduce((acc, [key, value]) => {
        acc[key] = { value }
        return acc
      }, {} as any)
    }
  }

  return mockEvent as any
}

// Helper to create mock user events
export const createMockUserEvent = (eventType: string, data: any = {}) => {
  return {
    type: eventType,
    ...data,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn()
  }
}

// Test data validation helpers
export const validateConsentData = (consents: any) => {
  const required = ['essential_cookies', 'safety_monitoring']
  return required.every(consent => consents[consent] === true)
}

export const validateEmailFormat = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePasswordStrength = (password: string) => {
  return {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*]/.test(password)
  }
}

export const validateInvitationCode = (code: string) => {
  return /^[A-Z0-9]{8}-[A-Z0-9]{4}$/.test(code)
}

// Mock component props builders
export const createMockRegistrationProps = (overrides: any = {}) => ({
  onComplete: jest.fn(),
  jurisdiction: 'US' as const,
  disabled: false,
  ...overrides
})

export const createMockConsentFlowProps = (overrides: any = {}) => ({
  onComplete: jest.fn(),
  showOptional: true,
  jurisdiction: 'US' as const,
  ...overrides
})

export const createMockCoupleLinkProps = (overrides: any = {}) => ({
  userId: mockUsers.testUser.id,
  onLinkSuccess: jest.fn(),
  onError: jest.fn(),
  ...overrides
})

// Test environment helpers
export const setupTestEnvironment = () => {
  // Mock localStorage
  const mockStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  }
  
  Object.defineProperty(global, 'localStorage', {
    value: mockStorage,
    writable: true
  })

  // Mock sessionStorage
  Object.defineProperty(global, 'sessionStorage', {
    value: mockStorage,
    writable: true
  })

  // Mock location
  Object.defineProperty(global, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: ''
    },
    writable: true
  })

  // Mock console methods to reduce test noise
  const consoleMethods = ['log', 'error', 'warn', 'info']
  const originalConsoleMethods: any = {}
  
  consoleMethods.forEach(method => {
    originalConsoleMethods[method] = console[method as keyof Console]
    ;(console as any)[method] = jest.fn()
  })

  return {
    cleanup: () => {
      consoleMethods.forEach(method => {
        ;(console as any)[method] = originalConsoleMethods[method]
      })
    }
  }
}

// Async test helpers
export const waitForAsyncUpdates = () => new Promise(resolve => setTimeout(resolve, 0))

export const mockAsyncFunction = <T>(result: T, delay = 0) => 
  jest.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve(result), delay))
  )

export const mockAsyncError = (error: Error, delay = 0) => 
  jest.fn().mockImplementation(() => 
    new Promise((_, reject) => setTimeout(() => reject(error), delay))
  )