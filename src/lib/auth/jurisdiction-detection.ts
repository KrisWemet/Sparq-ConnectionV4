import { supabase } from '@/lib/supabase/client'

export interface JurisdictionInfo {
  code: string
  name: string
  region: string
  emergencyNumber: string
  privacyLaw: 'GDPR' | 'PIPEDA' | 'CCPA' | 'OTHER'
  dataRetentionRequirements: {
    generalData: number // days
    safetyData: number // days
    consentRecords: number // days
  }
  crisisResources: CrisisResource[]
  domesticViolenceResources: DVResource[]
  mentalHealthResources: MentalHealthResource[]
  legalRequirements: {
    consentAge: number
    mandatoryReporting: boolean
    rightToBeforgotten: boolean
    dataPortability: boolean
  }
}

interface CrisisResource {
  name: string
  contact: string
  type: 'hotline' | 'text' | 'chat' | 'website'
  availability: string
  languages: string[]
  specializations: string[]
}

interface DVResource {
  name: string
  contact: string
  website?: string
  languages: string[]
  services: string[]
}

interface MentalHealthResource {
  name: string
  contact: string
  type: 'referral' | 'emergency' | 'support'
  cost: 'free' | 'sliding_scale' | 'insurance' | 'paid'
  languages: string[]
}

interface DetectionResult {
  jurisdiction: JurisdictionInfo
  confidence: number
  detectionMethod: 'ip' | 'browser' | 'user_input' | 'default'
  timestamp: string
}

export class JurisdictionDetection {
  private jurisdictionCache: Map<string, JurisdictionInfo> = new Map()
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Detect user's jurisdiction using multiple methods
   */
  async detectJurisdiction(userInput?: {
    country?: string
    region?: string
    timezone?: string
  }): Promise<DetectionResult> {
    try {
      let detectionMethod: DetectionResult['detectionMethod'] = 'default'
      let confidence = 0.3
      let detectedCode = 'US' // Default fallback

      // Method 1: Use user input if provided
      if (userInput?.country) {
        detectedCode = this.normalizeCountryCode(userInput.country)
        detectionMethod = 'user_input'
        confidence = 0.9
      }
      // Method 2: Try browser-based detection
      else if (typeof window !== 'undefined') {
        const browserResult = this.detectFromBrowser()
        if (browserResult) {
          detectedCode = browserResult.code
          detectionMethod = 'browser'
          confidence = browserResult.confidence
        }
      }
      // Method 3: IP-based detection would go here (requires server-side API)
      // This would typically use a service like MaxMind or ip-api

      const jurisdiction = await this.getJurisdictionInfo(detectedCode)

      return {
        jurisdiction,
        confidence,
        detectionMethod,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Jurisdiction detection failed:', error)
      
      // Return US as safe default
      const fallbackJurisdiction = await this.getJurisdictionInfo('US')
      return {
        jurisdiction: fallbackJurisdiction,
        confidence: 0.1,
        detectionMethod: 'default',
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Get jurisdiction information by code
   */
  async getJurisdictionInfo(code: string): Promise<JurisdictionInfo> {
    const cacheKey = `jurisdiction_${code}`
    
    // Check cache first
    if (this.jurisdictionCache.has(cacheKey)) {
      const cached = this.jurisdictionCache.get(cacheKey)!
      return cached
    }

    try {
      // Try to fetch from database
      const { data, error } = await supabase
        .from('jurisdictions')
        .select('*')
        .eq('code', code)
        .single()

      if (data && !error) {
        this.jurisdictionCache.set(cacheKey, data)
        return data
      }
    } catch (dbError) {
      console.warn('Database jurisdiction lookup failed:', dbError)
    }

    // Fallback to hardcoded jurisdictions
    const jurisdiction = this.getHardcodedJurisdiction(code)
    this.jurisdictionCache.set(cacheKey, jurisdiction)
    
    return jurisdiction
  }

  /**
   * Browser-based jurisdiction detection
   */
  private detectFromBrowser(): { code: string; confidence: number } | null {
    try {
      // Method 1: Navigator language
      if (navigator.language) {
        const locale = navigator.language.toLowerCase()
        
        // Extract country from locale (e.g., 'en-US' -> 'US')
        if (locale.includes('-')) {
          const countryCode = locale.split('-')[1].toUpperCase()
          if (this.isValidCountryCode(countryCode)) {
            return { code: countryCode, confidence: 0.6 }
          }
        }
      }

      // Method 2: Timezone-based detection
      if (Intl?.DateTimeFormat) {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const countryFromTimezone = this.getCountryFromTimezone(timezone)
        if (countryFromTimezone) {
          return { code: countryFromTimezone, confidence: 0.4 }
        }
      }

      return null
    } catch (error) {
      console.warn('Browser detection failed:', error)
      return null
    }
  }

  /**
   * Get country from timezone
   */
  private getCountryFromTimezone(timezone: string): string | null {
    const timezoneMap: Record<string, string> = {
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Toronto': 'CA',
      'America/Vancouver': 'CA',
      'Europe/London': 'GB',
      'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE',
      'Europe/Madrid': 'ES',
      'Europe/Rome': 'IT',
      'Asia/Tokyo': 'JP',
      'Asia/Shanghai': 'CN',
      'Australia/Sydney': 'AU',
      // Add more as needed
    }

    return timezoneMap[timezone] || null
  }

  /**
   * Normalize country code input
   */
  private normalizeCountryCode(input: string): string {
    const countryMap: Record<string, string> = {
      'united states': 'US',
      'usa': 'US',
      'america': 'US',
      'canada': 'CA',
      'united kingdom': 'GB',
      'uk': 'GB',
      'britain': 'GB',
      'germany': 'DE',
      'france': 'FR',
      'spain': 'ES',
      'italy': 'IT',
      'japan': 'JP',
      'australia': 'AU',
      // Add more as needed
    }

    const normalized = input.toLowerCase().trim()
    
    // If it's already a 2-letter code, validate and return
    if (input.length === 2 && this.isValidCountryCode(input.toUpperCase())) {
      return input.toUpperCase()
    }

    // Try to map from full name
    return countryMap[normalized] || 'US'
  }

  /**
   * Validate country code
   */
  private isValidCountryCode(code: string): boolean {
    const validCodes = [
      'US', 'CA', 'GB', 'DE', 'FR', 'ES', 'IT', 'JP', 'AU', 'NL', 'SE', 'NO', 'DK', 'FI'
      // Add more as needed
    ]
    return validCodes.includes(code)
  }

  /**
   * Hardcoded jurisdiction data for fallback
   */
  private getHardcodedJurisdiction(code: string): JurisdictionInfo {
    const jurisdictions: Record<string, JurisdictionInfo> = {
      US: {
        code: 'US',
        name: 'United States',
        region: 'North America',
        emergencyNumber: '911',
        privacyLaw: 'OTHER',
        dataRetentionRequirements: {
          generalData: 365,
          safetyData: 2555, // 7 years
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
            type: 'hotline',
            availability: '24/7',
            languages: ['English', 'Spanish'],
            specializations: ['suicide prevention', 'mental health crisis']
          },
          {
            name: 'Crisis Text Line',
            contact: 'Text HOME to 741741',
            type: 'text',
            availability: '24/7',
            languages: ['English'],
            specializations: ['crisis support', 'mental health']
          },
          {
            name: 'National Domestic Violence Hotline',
            contact: '1-800-799-7233',
            type: 'hotline',
            availability: '24/7',
            languages: ['English', 'Spanish'],
            specializations: ['domestic violence', 'safety planning']
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
            type: 'referral',
            cost: 'free',
            languages: ['English', 'Spanish']
          }
        ]
      },
      CA: {
        code: 'CA',
        name: 'Canada',
        region: 'North America',
        emergencyNumber: '911',
        privacyLaw: 'PIPEDA',
        dataRetentionRequirements: {
          generalData: 365,
          safetyData: 2555,
          consentRecords: 2555
        },
        legalRequirements: {
          consentAge: 13,
          mandatoryReporting: true,
          rightToBeforgotten: true,
          dataPortability: true
        },
        crisisResources: [
          {
            name: 'Talk Suicide Canada',
            contact: '1-833-456-4566',
            type: 'hotline',
            availability: '24/7',
            languages: ['English', 'French'],
            specializations: ['suicide prevention']
          },
          {
            name: 'Crisis Services Canada',
            contact: 'Text CONNECT to 686868',
            type: 'text',
            availability: '24/7',
            languages: ['English', 'French'],
            specializations: ['crisis support']
          }
        ],
        domesticViolenceResources: [
          {
            name: 'Assaulted Women\'s Helpline',
            contact: '1-866-863-0511',
            website: 'https://www.awhl.org',
            languages: ['English', 'French'],
            services: ['crisis counseling', 'safety planning', 'legal support']
          }
        ],
        mentalHealthResources: [
          {
            name: 'Canada Suicide Prevention Service',
            contact: '1-833-456-4566',
            type: 'emergency',
            cost: 'free',
            languages: ['English', 'French']
          }
        ]
      },
      GB: {
        code: 'GB',
        name: 'United Kingdom',
        region: 'Europe',
        emergencyNumber: '999',
        privacyLaw: 'GDPR',
        dataRetentionRequirements: {
          generalData: 365,
          safetyData: 2555,
          consentRecords: 2555
        },
        legalRequirements: {
          consentAge: 13,
          mandatoryReporting: true,
          rightToBeforgotten: true,
          dataPortability: true
        },
        crisisResources: [
          {
            name: 'Samaritans',
            contact: '116 123',
            type: 'hotline',
            availability: '24/7',
            languages: ['English'],
            specializations: ['suicide prevention', 'emotional support']
          },
          {
            name: 'Crisis Text Line UK',
            contact: 'Text SHOUT to 85258',
            type: 'text',
            availability: '24/7',
            languages: ['English'],
            specializations: ['crisis support']
          }
        ],
        domesticViolenceResources: [
          {
            name: 'National Domestic Abuse Helpline',
            contact: '0808 2000 247',
            website: 'https://www.nationaldahelpline.org.uk',
            languages: ['English'],
            services: ['crisis counseling', 'safety planning', 'refuge referrals']
          }
        ],
        mentalHealthResources: [
          {
            name: 'Mind Infoline',
            contact: '0300 123 3393',
            type: 'support',
            cost: 'free',
            languages: ['English']
          }
        ]
      },
      DE: {
        code: 'DE',
        name: 'Germany',
        region: 'Europe',
        emergencyNumber: '112',
        privacyLaw: 'GDPR',
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
            type: 'hotline',
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
            type: 'support',
            cost: 'free',
            languages: ['German']
          }
        ]
      }
    }

    return jurisdictions[code] || jurisdictions['US']
  }

  /**
   * Store user's jurisdiction preference
   */
  async saveUserJurisdiction(userId: string, jurisdiction: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          jurisdiction,
          jurisdiction_updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        throw new Error(`Failed to save jurisdiction: ${error.message}`)
      }
    } catch (error) {
      console.error('Error saving jurisdiction:', error)
      throw error
    }
  }

  /**
   * Get all supported jurisdictions
   */
  getSupportedJurisdictions(): Array<{ code: string; name: string; region: string }> {
    return [
      { code: 'US', name: 'United States', region: 'North America' },
      { code: 'CA', name: 'Canada', region: 'North America' },
      { code: 'GB', name: 'United Kingdom', region: 'Europe' },
      { code: 'DE', name: 'Germany', region: 'Europe' },
      { code: 'FR', name: 'France', region: 'Europe' },
      { code: 'ES', name: 'Spain', region: 'Europe' },
      { code: 'IT', name: 'Italy', region: 'Europe' },
      { code: 'AU', name: 'Australia', region: 'Oceania' },
      // Add more as needed
    ]
  }

  /**
   * Check if jurisdiction requires specific privacy compliance
   */
  requiresGDPRCompliance(jurisdictionCode: string): boolean {
    const gdprCountries = ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'SE', 'NO', 'DK', 'FI']
    return gdprCountries.includes(jurisdictionCode)
  }

  /**
   * Get privacy law requirements for jurisdiction
   */
  getPrivacyRequirements(jurisdictionCode: string) {
    const jurisdiction = this.getHardcodedJurisdiction(jurisdictionCode)
    return {
      law: jurisdiction.privacyLaw,
      requirements: jurisdiction.legalRequirements,
      dataRetention: jurisdiction.dataRetentionRequirements
    }
  }
}