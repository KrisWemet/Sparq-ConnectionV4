import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { JurisdictionDetection } from '../jurisdiction-detection'

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({ data: null, error: null }))
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

// Mock browser APIs
const mockNavigator = {
  language: 'en-US'
}

const mockIntl = {
  DateTimeFormat: jest.fn(() => ({
    resolvedOptions: jest.fn(() => ({
      timeZone: 'America/New_York'
    }))
  }))
}

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
})

Object.defineProperty(global, 'Intl', {
  value: mockIntl,
  writable: true
})

describe('JurisdictionDetection', () => {
  let jurisdictionDetection: JurisdictionDetection

  beforeEach(() => {
    jurisdictionDetection = new JurisdictionDetection()
    jest.clearAllMocks()
  })

  describe('detectJurisdiction', () => {
    it('should detect jurisdiction from user input with high confidence', async () => {
      const userInput = {
        country: 'Canada',
        region: 'Ontario',
        timezone: 'America/Toronto'
      }

      const result = await jurisdictionDetection.detectJurisdiction(userInput)

      expect(result.jurisdiction.code).toBe('CA')
      expect(result.jurisdiction.name).toBe('Canada')
      expect(result.confidence).toBe(0.9)
      expect(result.detectionMethod).toBe('user_input')
    })

    it('should detect jurisdiction from browser settings', async () => {
      const result = await jurisdictionDetection.detectJurisdiction()

      expect(result.jurisdiction.code).toBe('US')
      expect(result.detectionMethod).toBe('browser')
      expect(result.confidence).toBeGreaterThan(0.3)
    })

    it('should fallback to default US jurisdiction', async () => {
      // Mock navigator to return invalid locale
      Object.defineProperty(global, 'navigator', {
        value: { language: 'invalid' },
        writable: true
      })

      const result = await jurisdictionDetection.detectJurisdiction()

      expect(result.jurisdiction.code).toBe('US')
      expect(result.confidence).toBeGreaterThanOrEqual(0.1)
    })

    it('should handle detection errors gracefully', async () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Force an error in browser detection
      Object.defineProperty(global, 'navigator', {
        get: () => {
          throw new Error('Navigator access denied')
        }
      })

      const result = await jurisdictionDetection.detectJurisdiction()

      expect(result.jurisdiction.code).toBe('US')
      expect(result.confidence).toBe(0.1)
      expect(result.detectionMethod).toBe('default')
      
      consoleSpy.mockRestore()
    })
  })

  describe('getJurisdictionInfo', () => {
    it('should return cached jurisdiction info', async () => {
      // First call should cache the result
      const result1 = await jurisdictionDetection.getJurisdictionInfo('US')
      
      // Second call should return cached result
      const result2 = await jurisdictionDetection.getJurisdictionInfo('US')

      expect(result1).toEqual(result2)
      expect(result1.code).toBe('US')
      expect(result1.name).toBe('United States')
      expect(result1.privacyLaw).toBe('OTHER')
    })

    it('should return hardcoded data for supported jurisdictions', async () => {
      const supportedCodes = ['US', 'CA', 'GB', 'DE']

      for (const code of supportedCodes) {
        const result = await jurisdictionDetection.getJurisdictionInfo(code)
        expect(result.code).toBe(code)
        expect(result.name).toBeDefined()
        expect(result.crisisResources).toBeDefined()
        expect(result.crisisResources.length).toBeGreaterThan(0)
      }
    })

    it('should fallback to US for unsupported jurisdictions', async () => {
      const result = await jurisdictionDetection.getJurisdictionInfo('XX')
      expect(result.code).toBe('US')
    })
  })

  describe('saveUserJurisdiction', () => {
    it('should save jurisdiction to user profile', async () => {
      const userId = 'test-user-id'
      const jurisdiction = 'CA'

      await jurisdictionDetection.saveUserJurisdiction(userId, jurisdiction)

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        jurisdiction,
        jurisdiction_updated_at: expect.any(String)
      })
    })

    it('should handle save errors', async () => {
      const mockError = new Error('Database error')
      mockSupabase.from = jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({ error: mockError }))
        }))
      }))

      await expect(
        jurisdictionDetection.saveUserJurisdiction('test-id', 'CA')
      ).rejects.toThrow('Failed to save jurisdiction: Database error')
    })
  })

  describe('getSupportedJurisdictions', () => {
    it('should return list of supported jurisdictions', () => {
      const jurisdictions = jurisdictionDetection.getSupportedJurisdictions()

      expect(jurisdictions).toBeInstanceOf(Array)
      expect(jurisdictions.length).toBeGreaterThan(0)
      
      const usJurisdiction = jurisdictions.find(j => j.code === 'US')
      expect(usJurisdiction).toBeDefined()
      expect(usJurisdiction?.name).toBe('United States')
      expect(usJurisdiction?.region).toBe('North America')
    })
  })

  describe('requiresGDPRCompliance', () => {
    it('should return true for GDPR countries', () => {
      const gdprCountries = ['GB', 'DE', 'FR', 'ES', 'IT']
      
      gdprCountries.forEach(country => {
        expect(jurisdictionDetection.requiresGDPRCompliance(country)).toBe(true)
      })
    })

    it('should return false for non-GDPR countries', () => {
      const nonGdprCountries = ['US', 'CA', 'AU', 'JP']
      
      nonGdprCountries.forEach(country => {
        expect(jurisdictionDetection.requiresGDPRCompliance(country)).toBe(false)
      })
    })
  })

  describe('getPrivacyRequirements', () => {
    it('should return correct privacy requirements for jurisdictions', () => {
      const usRequirements = jurisdictionDetection.getPrivacyRequirements('US')
      expect(usRequirements.law).toBe('OTHER')
      expect(usRequirements.requirements.rightToBeforgotten).toBe(false)

      const deRequirements = jurisdictionDetection.getPrivacyRequirements('DE')
      expect(deRequirements.law).toBe('GDPR')
      expect(deRequirements.requirements.rightToBeforgotten).toBe(true)

      const caRequirements = jurisdictionDetection.getPrivacyRequirements('CA')
      expect(caRequirements.law).toBe('PIPEDA')
      expect(caRequirements.requirements.rightToBeforgotten).toBe(true)
    })

    it('should include data retention requirements', () => {
      const requirements = jurisdictionDetection.getPrivacyRequirements('US')
      
      expect(requirements.dataRetention.generalData).toBe(365)
      expect(requirements.dataRetention.safetyData).toBe(2555) // 7 years
      expect(requirements.dataRetention.consentRecords).toBe(2555)
    })
  })

  describe('Browser detection methods', () => {
    it('should extract country from navigator language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'en-CA' },
        writable: true
      })

      const detection = new JurisdictionDetection()
      
      // Access private method for testing (in real scenario this would be integration tested)
      expect(detection['detectFromBrowser']()).toEqual({
        code: 'CA',
        confidence: 0.6
      })
    })

    it('should extract country from timezone', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'en' }, // No country code
        writable: true
      })

      Object.defineProperty(global, 'Intl', {
        value: {
          DateTimeFormat: jest.fn(() => ({
            resolvedOptions: jest.fn(() => ({
              timeZone: 'Europe/London'
            }))
          }))
        },
        writable: true
      })

      const detection = new JurisdictionDetection()
      
      expect(detection['getCountryFromTimezone']('Europe/London')).toBe('GB')
      expect(detection['getCountryFromTimezone']('America/Toronto')).toBe('CA')
      expect(detection['getCountryFromTimezone']('Unknown/Timezone')).toBe(null)
    })

    it('should normalize country input correctly', () => {
      const detection = new JurisdictionDetection()
      
      expect(detection['normalizeCountryCode']('United States')).toBe('US')
      expect(detection['normalizeCountryCode']('usa')).toBe('US')
      expect(detection['normalizeCountryCode']('canada')).toBe('CA')
      expect(detection['normalizeCountryCode']('GB')).toBe('GB')
      expect(detection['normalizeCountryCode']('unknown country')).toBe('US')
    })

    it('should validate country codes', () => {
      const detection = new JurisdictionDetection()
      
      expect(detection['isValidCountryCode']('US')).toBe(true)
      expect(detection['isValidCountryCode']('CA')).toBe(true)
      expect(detection['isValidCountryCode']('XX')).toBe(false)
      expect(detection['isValidCountryCode']('ABC')).toBe(false)
    })
  })
})