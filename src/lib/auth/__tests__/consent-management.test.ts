import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { ConsentManager, ConsentType } from '../consent-management'

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({ error: null })),
    select: jest.fn(() => ({ 
      eq: jest.fn(() => ({ 
        order: jest.fn(() => ({ data: [], error: null }))
      }))
    })),
    update: jest.fn(() => ({ 
      eq: jest.fn(() => ({ error: null }))
    }))
  }))
}

jest.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabase
}))

describe('ConsentManager', () => {
  let consentManager: ConsentManager
  const testUserId = 'test-user-id'

  beforeEach(() => {
    consentManager = new ConsentManager()
    jest.clearAllMocks()
  })

  describe('recordConsent', () => {
    it('should record consent successfully', async () => {
      const consentData = {
        essential_cookies: true,
        analytics_cookies: true,
        safety_monitoring: true,
        ai_processing: true,
        data_sharing: false
      }

      await consentManager.recordConsent(testUserId, consentData)

      expect(mockSupabase.from).toHaveBeenCalledWith('user_consents')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user_id: testUserId,
        consent_type: 'comprehensive',
        granted: true,
        version: '1.0',
        legal_basis: 'consent',
        consents: consentData
      })
    })

    it('should handle consent recording errors', async () => {
      const mockError = new Error('Database error')
      mockSupabase.from = jest.fn(() => ({
        insert: jest.fn(() => ({ error: mockError }))
      }))

      const consentData = {
        essential_cookies: true,
        analytics_cookies: true,
        safety_monitoring: true,
        ai_processing: true,
        data_sharing: false
      }

      await expect(
        consentManager.recordConsent(testUserId, consentData)
      ).rejects.toThrow('Failed to record consent: Database error')
    })

    it('should validate required consents', async () => {
      const incompleteConsents = {
        essential_cookies: true,
        // Missing required consents
      }

      await expect(
        consentManager.recordConsent(testUserId, incompleteConsents)
      ).rejects.toThrow('Missing required consents')
    })
  })

  describe('getUserConsentStatus', () => {
    it('should retrieve user consent status', async () => {
      const mockConsentData = [
        {
          consent_type: 'safety_monitoring',
          granted: true,
          created_at: '2024-01-01T00:00:00Z',
          version: '1.0'
        }
      ]

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({ data: mockConsentData, error: null }))
          }))
        }))
      }))

      const result = await consentManager.getUserConsentStatus(testUserId)

      expect(result).toEqual(mockConsentData)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_consents')
    })
  })

  describe('hasRequiredConsents', () => {
    it('should return true when all required consents are granted', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [
                { consent_type: 'essential_cookies', granted: true },
                { consent_type: 'safety_monitoring', granted: true }
              ],
              error: null
            }))
          }))
        }))
      }))

      const result = await consentManager.hasRequiredConsents(testUserId)
      expect(result).toBe(true)
    })

    it('should return false when required consents are missing', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [
                { consent_type: 'essential_cookies', granted: true }
                // Missing safety_monitoring consent
              ],
              error: null
            }))
          }))
        }))
      }))

      const result = await consentManager.hasRequiredConsents(testUserId)
      expect(result).toBe(false)
    })
  })

  describe('revokeConsent', () => {
    it('should revoke consent successfully', async () => {
      await consentManager.revokeConsent(testUserId, ConsentType.ANALYTICS_COOKIES)

      expect(mockSupabase.from).toHaveBeenCalledWith('user_consents')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user_id: testUserId,
        consent_type: ConsentType.ANALYTICS_COOKIES,
        granted: false,
        version: '1.0',
        legal_basis: 'consent'
      })
    })

    it('should prevent revoking essential consents', async () => {
      await expect(
        consentManager.revokeConsent(testUserId, ConsentType.ESSENTIAL_COOKIES)
      ).rejects.toThrow('Essential consents cannot be revoked')
    })
  })

  describe('getConsentVersion', () => {
    it('should return current consent version', () => {
      const version = consentManager.getConsentVersion()
      expect(version).toBe('1.0')
    })
  })

  describe('isConsentExpired', () => {
    it('should return false for recent consent', () => {
      const recentDate = new Date()
      const isExpired = consentManager.isConsentExpired(recentDate.toISOString())
      expect(isExpired).toBe(false)
    })

    it('should return true for expired consent', () => {
      const expiredDate = new Date()
      expiredDate.setFullYear(expiredDate.getFullYear() - 2) // 2 years ago
      const isExpired = consentManager.isConsentExpired(expiredDate.toISOString())
      expect(isExpired).toBe(true)
    })
  })

  describe('getRequiredConsentsForJurisdiction', () => {
    it('should return GDPR-specific consents for European jurisdictions', () => {
      const consents = consentManager.getRequiredConsentsForJurisdiction('DE')
      expect(consents).toContain(ConsentType.ESSENTIAL_COOKIES)
      expect(consents).toContain(ConsentType.DATA_PROCESSING)
      expect(consents).toContain(ConsentType.THIRD_PARTY_SHARING)
    })

    it('should return standard consents for non-GDPR jurisdictions', () => {
      const consents = consentManager.getRequiredConsentsForJurisdiction('US')
      expect(consents).toContain(ConsentType.ESSENTIAL_COOKIES)
      expect(consents).toContain(ConsentType.SAFETY_MONITORING)
      expect(consents.length).toBeLessThan(
        consentManager.getRequiredConsentsForJurisdiction('DE').length
      )
    })
  })
})