// Location-based resource matching for crisis support
// Provides geographically relevant resources while respecting user privacy

import { CrisisResource, ResourceSearchCriteria, globalResourceRegistry } from './global-resource-registry'

export interface UserLocation {
  country?: string
  countryCode?: string // ISO 3166-1 alpha-2
  state?: string
  stateCode?: string
  city?: string
  zipCode?: string
  coordinates?: {
    latitude: number
    longitude: number
    accuracy?: number // meters
  }
  timezone?: string
}

export interface LocationDetectionResult {
  location: UserLocation
  confidence: 'high' | 'medium' | 'low'
  method: 'gps' | 'ip_geolocation' | 'user_provided' | 'browser_timezone' | 'fallback'
  privacyNote: string
}

export interface ResourceMatchResult {
  resource: CrisisResource
  relevanceScore: number
  matchReasons: string[]
  distance?: number // kilometers, if GPS coordinates available
}

export class LocationBasedResourceMatcher {
  private fallbackLocation: UserLocation = {
    country: 'United States',
    countryCode: 'US'
  }

  /**
   * Detect user location with privacy-respecting methods
   */
  async detectUserLocation(allowGPS: boolean = false): Promise<LocationDetectionResult> {
    // Method 1: User-provided GPS (highest accuracy, requires permission)
    if (allowGPS && 'geolocation' in navigator) {
      try {
        const position = await this.requestGPSLocation()
        const location = await this.reverseGeocode(position.coords.latitude, position.coords.longitude)
        
        return {
          location: {
            ...location,
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            }
          },
          confidence: 'high',
          method: 'gps',
          privacyNote: 'Location detected via GPS with your permission. This is only used to find local resources.'
        }
      } catch (error) {
        console.warn('GPS location detection failed:', error)
      }
    }

    // Method 2: Browser timezone (privacy-friendly approximation)
    try {
      const timezoneLocation = this.getLocationFromTimezone()
      if (timezoneLocation.country) {
        return {
          location: timezoneLocation,
          confidence: 'medium',
          method: 'browser_timezone',
          privacyNote: 'Approximate location detected from your browser timezone. No precise location data is collected.'
        }
      }
    } catch (error) {
      console.warn('Timezone-based location detection failed:', error)
    }

    // Method 3: IP-based geolocation (if available and user consents)
    try {
      const ipLocation = await this.getIPBasedLocation()
      if (ipLocation.country) {
        return {
          location: ipLocation,
          confidence: 'medium',
          method: 'ip_geolocation',
          privacyNote: 'General location detected to provide relevant resources. No personal location data is stored.'
        }
      }
    } catch (error) {
      console.warn('IP-based location detection failed:', error)
    }

    // Fallback: Use default location (US resources)
    return {
      location: this.fallbackLocation,
      confidence: 'low',
      method: 'fallback',
      privacyNote: 'Using default location. You can specify your location to find more relevant local resources.'
    }
  }

  /**
   * Find the most relevant crisis resources for a location
   */
  public async findRelevantResources(
    location: UserLocation,
    crisisType?: CrisisResource['resourceType'][],
    options: {
      includeNational?: boolean
      includeLocal?: boolean
      maxResults?: number
      prioritizeCrisis?: boolean
    } = {}
  ): Promise<ResourceMatchResult[]> {
    
    const {
      includeNational = true,
      includeLocal = true,
      maxResults = 10,
      prioritizeCrisis = true
    } = options

    const searchCriteria: ResourceSearchCriteria = {
      crisisType,
      location: {
        country: location.countryCode || location.country,
        state: location.stateCode || location.state,
        city: location.city,
        zipCode: location.zipCode
      }
    }

    const resources = globalResourceRegistry.searchResources(searchCriteria)
    const matches: ResourceMatchResult[] = []

    for (const resource of resources) {
      const matchResult = this.calculateResourceRelevance(resource, location, prioritizeCrisis)
      
      // Filter by location preference
      if (!includeNational && resource.coverage.type === 'national') continue
      if (!includeLocal && resource.coverage.type === 'local') continue
      
      matches.push(matchResult)
    }

    // Sort by relevance score and return top results
    return matches
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults)
  }

  /**
   * Get emergency resources for immediate crisis situations
   */
  public async getEmergencyResources(location: UserLocation): Promise<ResourceMatchResult[]> {
    const crisisResources = await this.findRelevantResources(
      location,
      ['crisis_hotline', 'emergency_services'],
      {
        maxResults: 5,
        prioritizeCrisis: true
      }
    )

    // Always ensure we have national crisis resources
    const nationalCrisis = globalResourceRegistry.getEmergencyResources({
      country: location.countryCode || location.country
    })

    const emergencyMatches: ResourceMatchResult[] = []
    
    // Add national crisis resources first
    for (const resource of nationalCrisis) {
      emergencyMatches.push({
        resource,
        relevanceScore: 100, // Maximum relevance for national crisis resources
        matchReasons: ['National crisis hotline', 'Available 24/7', 'Crisis-specific'],
        distance: undefined
      })
    }

    // Add location-specific resources
    for (const match of crisisResources) {
      if (!emergencyMatches.find(em => em.resource.id === match.resource.id)) {
        emergencyMatches.push(match)
      }
    }

    return emergencyMatches.slice(0, 5)
  }

  /**
   * Get domestic violence resources with privacy considerations
   */
  public async getDVResources(location: UserLocation): Promise<ResourceMatchResult[]> {
    // Get DV-specific resources
    const dvResources = globalResourceRegistry.getDomesticViolenceResources({
      country: location.countryCode || location.country
    })

    const matches: ResourceMatchResult[] = []

    for (const resource of dvResources) {
      const matchResult = this.calculateResourceRelevance(resource, location, true)
      
      // Boost relevance for discrete access resources
      if (resource.discreteAccess) {
        matchResult.relevanceScore += 20
        matchResult.matchReasons.push('Discrete access available')
      }

      matches.push(matchResult)
    }

    // Also find local DV resources
    const localDVResources = await this.findRelevantResources(
      location,
      ['domestic_violence'],
      { maxResults: 10, prioritizeCrisis: true }
    )

    for (const match of localDVResources) {
      if (!matches.find(m => m.resource.id === match.resource.id)) {
        matches.push(match)
      }
    }

    return matches
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 8)
  }

  // Private helper methods
  private async requestGPSLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      )
    })
  }

  private async reverseGeocode(lat: number, lng: number): Promise<UserLocation> {
    // In a real implementation, this would use a geocoding service
    // For now, return basic structure - you'd integrate with a service like:
    // - OpenStreetMap Nominatim (free)
    // - Google Geocoding API
    // - Mapbox Geocoding API
    
    try {
      // Placeholder implementation - replace with actual geocoding service
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await response.json()
      
      return {
        country: data.address?.country,
        countryCode: data.address?.country_code?.toUpperCase(),
        state: data.address?.state,
        city: data.address?.city || data.address?.town || data.address?.village,
        zipCode: data.address?.postcode
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error)
      return {}
    }
  }

  private getLocationFromTimezone(): UserLocation {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      
      // Map common timezones to countries/regions
      const timezoneToLocation: Record<string, UserLocation> = {
        // North America
        'America/New_York': { country: 'United States', countryCode: 'US' },
        'America/Chicago': { country: 'United States', countryCode: 'US' },
        'America/Denver': { country: 'United States', countryCode: 'US' },
        'America/Los_Angeles': { country: 'United States', countryCode: 'US' },
        'America/Toronto': { country: 'Canada', countryCode: 'CA' },
        'America/Vancouver': { country: 'Canada', countryCode: 'CA' },
        
        // Europe
        'Europe/London': { country: 'United Kingdom', countryCode: 'GB' },
        'Europe/Paris': { country: 'France', countryCode: 'FR' },
        'Europe/Berlin': { country: 'Germany', countryCode: 'DE' },
        'Europe/Rome': { country: 'Italy', countryCode: 'IT' },
        
        // Asia Pacific
        'Asia/Tokyo': { country: 'Japan', countryCode: 'JP' },
        'Australia/Sydney': { country: 'Australia', countryCode: 'AU' },
        'Asia/Shanghai': { country: 'China', countryCode: 'CN' }
      }

      return timezoneToLocation[timezone] || { timezone }
    } catch (error) {
      console.warn('Timezone detection failed:', error)
      return {}
    }
  }

  private async getIPBasedLocation(): Promise<UserLocation> {
    try {
      // Use a free IP geolocation service (respecting privacy)
      // Note: In production, ensure this service has appropriate privacy policy
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      
      if (!response.ok) throw new Error('IP geolocation failed')
      
      const data = await response.json()
      
      return {
        country: data.country_name,
        countryCode: data.country_code,
        state: data.region,
        city: data.city,
        zipCode: data.postal,
        timezone: data.timezone
      }
    } catch (error) {
      console.warn('IP-based location detection failed:', error)
      throw error
    }
  }

  private calculateResourceRelevance(
    resource: CrisisResource,
    location: UserLocation,
    prioritizeCrisis: boolean
  ): ResourceMatchResult {
    let relevanceScore = 0
    const matchReasons: string[] = []

    // Base score for active, verified resources
    if (resource.isActive) relevanceScore += 10
    if (resource.verificationStatus === 'verified') {
      relevanceScore += 20
      matchReasons.push('Verified resource')
    }

    // Crisis-specific resources get priority
    if (resource.crisisSpecific && prioritizeCrisis) {
      relevanceScore += 30
      matchReasons.push('Crisis-specific service')
    }

    // 24/7 availability bonus
    if (resource.availability.schedule === '24/7') {
      relevanceScore += 15
      matchReasons.push('Available 24/7')
    }

    // Professional staffing bonus
    if (resource.professionalStaffed) {
      relevanceScore += 10
      matchReasons.push('Professional staff')
    }

    // Free resources get slight preference
    if (resource.cost === 'free') {
      relevanceScore += 5
      matchReasons.push('Free service')
    }

    // Quality rating bonus
    if (resource.qualityRating) {
      relevanceScore += resource.qualityRating * 2
      matchReasons.push(`${resource.qualityRating} star rating`)
    }

    // Geographic relevance
    if (this.isGeographicallyRelevant(resource, location)) {
      const geoScore = this.calculateGeographicScore(resource, location)
      relevanceScore += geoScore.score
      matchReasons.push(...geoScore.reasons)
    }

    // Language match
    if (location.country && this.hasAppropriateLanguage(resource, location.country)) {
      relevanceScore += 5
      matchReasons.push('Language support available')
    }

    return {
      resource,
      relevanceScore,
      matchReasons,
      distance: undefined // Would calculate if GPS coordinates available
    }
  }

  private isGeographicallyRelevant(resource: CrisisResource, location: UserLocation): boolean {
    const coverage = resource.coverage
    
    // International resources are always relevant
    if (coverage.type === 'international') return true
    
    // National resources - check country match
    if (coverage.type === 'national') {
      return !!(
        coverage.countries?.includes(location.countryCode || '') ||
        coverage.countries?.includes(location.country || '')
      )
    }
    
    // Local/regional resources - check more specific matches
    return !!(
      coverage.states?.includes(location.state || '') ||
      coverage.cities?.includes(location.city || '') ||
      coverage.zipCodes?.includes(location.zipCode || '')
    )
  }

  private calculateGeographicScore(resource: CrisisResource, location: UserLocation): {
    score: number
    reasons: string[]
  } {
    const coverage = resource.coverage
    const reasons: string[] = []
    let score = 0

    if (coverage.type === 'international') {
      score += 5
      reasons.push('International coverage')
    } else if (coverage.type === 'national') {
      score += 25
      reasons.push('National coverage')
    } else if (coverage.type === 'state' && coverage.states?.includes(location.state || '')) {
      score += 20
      reasons.push('State/regional coverage')
    } else if (coverage.type === 'local' && coverage.cities?.includes(location.city || '')) {
      score += 15
      reasons.push('Local coverage')
    }

    return { score, reasons }
  }

  private hasAppropriateLanguage(resource: CrisisResource, country: string): boolean {
    const languages = resource.availability.languages
    
    // Simple mapping of countries to expected languages
    const countryLanguages: Record<string, string[]> = {
      'US': ['English'],
      'CA': ['English', 'French'],
      'GB': ['English'],
      'FR': ['French'],
      'ES': ['Spanish'],
      'DE': ['German']
    }

    const expectedLanguages = countryLanguages[country] || ['English']
    return expectedLanguages.some(lang => languages.includes(lang))
  }
}

// Export singleton instance
export const locationBasedResourceMatcher = new LocationBasedResourceMatcher()

// Export types for other modules
export type { UserLocation, LocationDetectionResult, ResourceMatchResult }