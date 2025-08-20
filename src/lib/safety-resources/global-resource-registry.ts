// Global resource registry for legally safe crisis support resources
// This system provides INFORMATION ONLY - no direct services or emergency intervention

export interface CrisisResource {
  id: string
  name: string
  organizationName: string
  resourceType: 'crisis_hotline' | 'domestic_violence' | 'mental_health' | 'substance_abuse' | 
                'relationship_counseling' | 'emergency_services' | 'warmline' | 'peer_support'
  
  // Contact Information
  contactMethods: Array<{
    type: 'phone' | 'text' | 'chat' | 'website' | 'email' | 'app'
    value: string
    label: string // e.g., "Call 988", "Text HOME to 741741"
    primary: boolean
    instructions?: string
  }>
  
  // Availability and Access
  availability: {
    schedule: '24/7' | 'business_hours' | 'evening_weekend' | 'varies' | string
    languages: string[]
    ageGroups?: string[] // 'teen', 'adult', 'senior', 'all'
    specialtyPopulations?: string[] // 'lgbtq', 'veterans', 'indigenous', etc.
  }
  
  // Geographic Coverage
  coverage: {
    type: 'international' | 'national' | 'state' | 'regional' | 'local'
    countries?: string[] // ISO country codes
    states?: string[] // State/province codes
    regions?: string[] // Regional identifiers
    cities?: string[]
    zipCodes?: string[]
  }
  
  // Resource Details
  description: string
  services: string[] // What they provide: counseling, safety planning, referrals, etc.
  specializations?: string[] // Specific crisis types or approaches
  cost: 'free' | 'sliding_scale' | 'insurance' | 'fee_for_service' | 'varies'
  
  // Quality and Verification
  verificationStatus: 'verified' | 'pending' | 'community_reported' | 'unverified'
  qualityRating?: number // 1-5 stars from professional review
  lastVerified: Date
  verifiedBy?: 'professional_network' | 'organization_direct' | 'government_registry'
  
  // Special Features
  discreteAccess: boolean // Important for DV resources
  crisisSpecific: boolean // Specifically for crisis situations vs general support
  professionalStaffed: boolean // Staffed by licensed professionals vs volunteers
  peerSupport: boolean // Peer support available
  
  // Legal and Safety Information
  mandatoryReporting: boolean // Whether they're mandated reporters
  confidentiality: 'confidential' | 'anonymous' | 'limited_confidentiality'
  
  // System Metadata
  isActive: boolean
  addedDate: Date
  lastUpdated: Date
  source: 'government_registry' | 'professional_network' | 'organization_direct' | 'community'
  metadata?: Record<string, any>
}

export interface ResourceSearchCriteria {
  crisisType?: CrisisResource['resourceType'][]
  location?: {
    country?: string
    state?: string
    city?: string
    zipCode?: string
    coordinates?: { lat: number; lng: number; radius?: number }
  }
  availability?: '24/7' | 'immediate' | 'business_hours'
  languages?: string[]
  specialtyPopulations?: string[]
  cost?: CrisisResource['cost'][]
  confidentiality?: CrisisResource['confidentiality'][]
}

export class GlobalResourceRegistry {
  private resources: Map<string, CrisisResource> = new Map()

  constructor() {
    this.initializeNationalResources()
  }

  /**
   * Initialize with essential national crisis resources
   */
  private initializeNationalResources() {
    const nationalResources: CrisisResource[] = [
      // United States National Resources
      {
        id: 'us-988-lifeline',
        name: '988 Suicide & Crisis Lifeline',
        organizationName: 'Substance Abuse and Mental Health Services Administration',
        resourceType: 'crisis_hotline',
        contactMethods: [
          {
            type: 'phone',
            value: '988',
            label: 'Call 988',
            primary: true,
            instructions: 'Available 24/7 for immediate crisis support'
          },
          {
            type: 'chat',
            value: 'https://988lifeline.org/chat/',
            label: 'Chat Online',
            primary: false,
            instructions: 'Online crisis chat available 24/7'
          },
          {
            type: 'text',
            value: '988',
            label: 'Text 988',
            primary: false,
            instructions: 'Crisis support via text message'
          }
        ],
        availability: {
          schedule: '24/7',
          languages: ['English', 'Spanish'],
          ageGroups: ['teen', 'adult', 'senior'],
          specialtyPopulations: ['lgbtq', 'veterans', 'deaf_hard_of_hearing']
        },
        coverage: {
          type: 'national',
          countries: ['US']
        },
        description: 'Free, confidential crisis support available 24/7 for people in suicidal crisis or emotional distress.',
        services: ['Crisis intervention', 'Emotional support', 'Local resource referrals', 'Safety planning'],
        specializations: ['Suicide prevention', 'Crisis intervention', 'Mental health crisis'],
        cost: 'free',
        verificationStatus: 'verified',
        qualityRating: 5,
        lastVerified: new Date(),
        verifiedBy: 'government_registry',
        discreteAccess: false,
        crisisSpecific: true,
        professionalStaffed: true,
        peerSupport: false,
        mandatoryReporting: false,
        confidentiality: 'confidential',
        isActive: true,
        addedDate: new Date(),
        lastUpdated: new Date(),
        source: 'government_registry'
      },
      
      {
        id: 'us-crisis-text-line',
        name: 'Crisis Text Line',
        organizationName: 'Crisis Text Line',
        resourceType: 'crisis_hotline',
        contactMethods: [
          {
            type: 'text',
            value: '741741',
            label: 'Text HOME to 741741',
            primary: true,
            instructions: 'Text HOME to 741741 for crisis support via text'
          },
          {
            type: 'website',
            value: 'https://www.crisistextline.org/',
            label: 'Visit Website',
            primary: false
          }
        ],
        availability: {
          schedule: '24/7',
          languages: ['English', 'Spanish'],
          ageGroups: ['teen', 'adult']
        },
        coverage: {
          type: 'national',
          countries: ['US', 'CA', 'GB']
        },
        description: 'Free crisis support via text message, available 24/7.',
        services: ['Crisis intervention via text', 'Emotional support', 'Safety planning', 'Resource referrals'],
        cost: 'free',
        verificationStatus: 'verified',
        qualityRating: 5,
        lastVerified: new Date(),
        discreteAccess: true, // Text can be more discrete
        crisisSpecific: true,
        professionalStaffed: true,
        peerSupport: false,
        mandatoryReporting: false,
        confidentiality: 'confidential',
        isActive: true,
        addedDate: new Date(),
        lastUpdated: new Date(),
        source: 'organization_direct'
      },

      {
        id: 'us-domestic-violence-hotline',
        name: 'National Domestic Violence Hotline',
        organizationName: 'National Domestic Violence Hotline',
        resourceType: 'domestic_violence',
        contactMethods: [
          {
            type: 'phone',
            value: '1-800-799-7233',
            label: 'Call 1-800-799-SAFE (7233)',
            primary: true,
            instructions: '24/7 confidential support for domestic violence'
          },
          {
            type: 'text',
            value: '88788',
            label: 'Text START to 88788',
            primary: false,
            instructions: 'Text START to 88788 for confidential help'
          },
          {
            type: 'chat',
            value: 'https://www.thehotline.org/get-help/chat/',
            label: 'Chat Online',
            primary: false,
            instructions: 'Private online chat available'
          }
        ],
        availability: {
          schedule: '24/7',
          languages: ['English', 'Spanish', '200+ via interpreters'],
          ageGroups: ['teen', 'adult'],
          specialtyPopulations: ['lgbtq', 'deaf_hard_of_hearing']
        },
        coverage: {
          type: 'national',
          countries: ['US']
        },
        description: '24/7 confidential support for people affected by domestic violence, dating violence, stalking.',
        services: ['Crisis intervention', 'Safety planning', 'Local resource referrals', 'Legal advocacy information'],
        specializations: ['Domestic violence', 'Dating violence', 'Stalking', 'Safety planning'],
        cost: 'free',
        verificationStatus: 'verified',
        qualityRating: 5,
        lastVerified: new Date(),
        discreteAccess: true, // Critical for DV situations
        crisisSpecific: true,
        professionalStaffed: true,
        peerSupport: false,
        mandatoryReporting: false, // Important - they don't automatically report
        confidentiality: 'confidential',
        isActive: true,
        addedDate: new Date(),
        lastUpdated: new Date(),
        source: 'organization_direct'
      },

      {
        id: 'us-samhsa-helpline',
        name: 'SAMHSA National Helpline',
        organizationName: 'Substance Abuse and Mental Health Services Administration',
        resourceType: 'mental_health',
        contactMethods: [
          {
            type: 'phone',
            value: '1-800-662-4357',
            label: 'Call 1-800-662-HELP (4357)',
            primary: true,
            instructions: '24/7 treatment referral and information service'
          },
          {
            type: 'website',
            value: 'https://www.samhsa.gov/find-help/national-helpline',
            label: 'Find Treatment Services',
            primary: false
          }
        ],
        availability: {
          schedule: '24/7',
          languages: ['English', 'Spanish'],
          ageGroups: ['teen', 'adult']
        },
        coverage: {
          type: 'national',
          countries: ['US']
        },
        description: 'Free, confidential treatment referral and information service for mental health and substance use disorders.',
        services: ['Information and referrals', 'Treatment facility locator', 'Local support group referrals'],
        specializations: ['Mental health', 'Substance abuse', 'Treatment referrals'],
        cost: 'free',
        verificationStatus: 'verified',
        qualityRating: 5,
        lastVerified: new Date(),
        discreteAccess: false,
        crisisSpecific: false,
        professionalStaffed: true,
        peerSupport: false,
        mandatoryReporting: false,
        confidentiality: 'confidential',
        isActive: true,
        addedDate: new Date(),
        lastUpdated: new Date(),
        source: 'government_registry'
      },

      // Canada National Resources
      {
        id: 'ca-9-8-8-lifeline',
        name: '9-8-8 Suicide Crisis Helpline',
        organizationName: 'Government of Canada',
        resourceType: 'crisis_hotline',
        contactMethods: [
          {
            type: 'phone',
            value: '9-8-8',
            label: 'Call 9-8-8',
            primary: true,
            instructions: 'Available 24/7 for immediate crisis support'
          },
          {
            type: 'text',
            value: '45645',
            label: 'Text TALK to 45645',
            primary: false,
            instructions: 'Crisis support via text'
          }
        ],
        availability: {
          schedule: '24/7',
          languages: ['English', 'French'],
          ageGroups: ['teen', 'adult', 'senior']
        },
        coverage: {
          type: 'national',
          countries: ['CA']
        },
        description: 'Free, confidential suicide prevention service available 24/7.',
        services: ['Crisis intervention', 'Emotional support', 'Safety planning', 'Local referrals'],
        cost: 'free',
        verificationStatus: 'verified',
        qualityRating: 5,
        lastVerified: new Date(),
        discreteAccess: false,
        crisisSpecific: true,
        professionalStaffed: true,
        peerSupport: false,
        mandatoryReporting: false,
        confidentiality: 'confidential',
        isActive: true,
        addedDate: new Date(),
        lastUpdated: new Date(),
        source: 'government_registry'
      }
    ]

    // Add all national resources to the registry
    nationalResources.forEach(resource => {
      this.resources.set(resource.id, resource)
    })
  }

  /**
   * Search for resources based on criteria
   */
  public searchResources(criteria: ResourceSearchCriteria): CrisisResource[] {
    const results: CrisisResource[] = []

    for (const resource of this.resources.values()) {
      if (!resource.isActive) continue

      // Filter by resource type
      if (criteria.crisisType && !criteria.crisisType.includes(resource.resourceType)) {
        continue
      }

      // Filter by location
      if (criteria.location && !this.matchesLocation(resource, criteria.location)) {
        continue
      }

      // Filter by availability
      if (criteria.availability && !this.matchesAvailability(resource, criteria.availability)) {
        continue
      }

      // Filter by languages
      if (criteria.languages && !this.matchesLanguages(resource, criteria.languages)) {
        continue
      }

      // Filter by cost
      if (criteria.cost && !criteria.cost.includes(resource.cost)) {
        continue
      }

      results.push(resource)
    }

    // Sort results by relevance (crisis-specific, quality rating, verification status)
    return results.sort((a, b) => {
      // Crisis-specific resources first
      if (a.crisisSpecific && !b.crisisSpecific) return -1
      if (!a.crisisSpecific && b.crisisSpecific) return 1

      // Higher quality rating first
      const aRating = a.qualityRating || 0
      const bRating = b.qualityRating || 0
      if (aRating !== bRating) return bRating - aRating

      // Verified resources first
      if (a.verificationStatus === 'verified' && b.verificationStatus !== 'verified') return -1
      if (a.verificationStatus !== 'verified' && b.verificationStatus === 'verified') return 1

      // Alphabetical by name
      return a.name.localeCompare(b.name)
    })
  }

  /**
   * Get emergency resources for immediate crisis
   */
  public getEmergencyResources(location?: { country?: string }): CrisisResource[] {
    const criteria: ResourceSearchCriteria = {
      crisisType: ['crisis_hotline', 'emergency_services'],
      availability: '24/7',
      location
    }

    return this.searchResources(criteria)
      .filter(resource => resource.crisisSpecific && resource.availability.schedule === '24/7')
      .slice(0, 5) // Limit to top 5 most relevant
  }

  /**
   * Get domestic violence resources (with special privacy considerations)
   */
  public getDomesticViolenceResources(location?: { country?: string }): CrisisResource[] {
    const criteria: ResourceSearchCriteria = {
      crisisType: ['domestic_violence'],
      location
    }

    return this.searchResources(criteria)
      .filter(resource => resource.discreteAccess) // Only resources that support discrete access
  }

  /**
   * Add a new resource to the registry
   */
  public addResource(resource: Omit<CrisisResource, 'id' | 'addedDate' | 'lastUpdated'>): string {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const completeResource: CrisisResource = {
      id,
      ...resource,
      addedDate: new Date(),
      lastUpdated: new Date()
    }

    this.resources.set(id, completeResource)
    return id
  }

  /**
   * Get resource by ID
   */
  public getResource(id: string): CrisisResource | null {
    return this.resources.get(id) || null
  }

  /**
   * Update resource verification status
   */
  public updateResourceVerification(
    id: string, 
    status: CrisisResource['verificationStatus'],
    verifiedBy?: string
  ): boolean {
    const resource = this.resources.get(id)
    if (!resource) return false

    resource.verificationStatus = status
    resource.lastVerified = new Date()
    resource.lastUpdated = new Date()
    if (verifiedBy) resource.verifiedBy = verifiedBy as any

    return true
  }

  // Private helper methods for filtering
  private matchesLocation(resource: CrisisResource, location: NonNullable<ResourceSearchCriteria['location']>): boolean {
    const coverage = resource.coverage

    // International resources match any location
    if (coverage.type === 'international') return true

    // Check country match
    if (location.country) {
      if (coverage.countries && !coverage.countries.includes(location.country)) {
        return false
      }
    }

    // Check state match
    if (location.state) {
      if (coverage.states && !coverage.states.includes(location.state)) {
        return false
      }
    }

    // Check city match
    if (location.city) {
      if (coverage.cities && !coverage.cities.includes(location.city)) {
        return false
      }
    }

    // If no specific location criteria matched but resource has geographic restrictions
    if (coverage.type !== 'national' && !location.country && !location.state && !location.city) {
      return false
    }

    return true
  }

  private matchesAvailability(resource: CrisisResource, availability: string): boolean {
    if (availability === '24/7') {
      return resource.availability.schedule === '24/7'
    }
    if (availability === 'immediate') {
      return resource.availability.schedule === '24/7' || resource.crisisSpecific
    }
    return true
  }

  private matchesLanguages(resource: CrisisResource, languages: string[]): boolean {
    return languages.some(lang => resource.availability.languages.includes(lang))
  }
}

// Export singleton instance
export const globalResourceRegistry = new GlobalResourceRegistry()

// Export types for other modules  
export type { CrisisResource, ResourceSearchCriteria }