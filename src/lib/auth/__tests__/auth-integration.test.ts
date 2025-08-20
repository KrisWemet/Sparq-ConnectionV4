import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { ConsentManager } from '../consent-management'
import { CoupleLinking } from '../couple-linking'
import { JurisdictionDetection } from '../jurisdiction-detection'
import { SafetyIntegration } from '../safety-integration'
import { 
  createMockSupabaseClient, 
  mockUsers, 
  mockConsents,
  mockInvitations,
  mockJurisdictions,
  setupTestEnvironment
} from './test-utils'

/**
 * Integration tests for the complete authentication system
 */

describe('Authentication System Integration', () => {
  let testEnv: ReturnType<typeof setupTestEnvironment>
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    testEnv = setupTestEnvironment()
    mockSupabase = createMockSupabaseClient({
      profiles: {
        select: {
          single: mockUsers.testUser,
          order: [mockUsers.testUser, mockUsers.partnerUser]
        }
      },
      user_consents: {
        insert: [{ id: 'consent-id', ...mockConsents.valid }],
        select: {
          order: [
            { consent_type: 'safety_monitoring', granted: true, created_at: '2024-01-01' }
          ]
        }
      },
      couple_invitations: {
        insert: [mockInvitations.valid],
        select: {
          single: mockInvitations.valid
        }
      },
      couples: {
        insert: [{ id: 'couple-id', partner1_id: mockUsers.testUser.id, partner2_id: mockUsers.partnerUser.id }]
      }
    })

    // Mock the Supabase client
    jest.mock('@/lib/supabase/client', () => ({
      supabase: mockSupabase
    }))
  })

  afterEach(() => {
    testEnv.cleanup()
    jest.clearAllMocks()
  })

  describe('Complete Registration Flow', () => {
    it('should complete full registration with all components', async () => {
      const consentManager = new ConsentManager()
      const jurisdictionDetection = new JurisdictionDetection()
      const coupleLinking = new CoupleLinking()
      const safetyIntegration = new SafetyIntegration()

      const userId = mockUsers.testUser.id
      
      // Step 1: Detect jurisdiction
      const jurisdictionResult = await jurisdictionDetection.detectJurisdiction({
        country: 'United States',
        timezone: 'America/New_York'
      })
      
      expect(jurisdictionResult.jurisdiction.code).toBe('US')
      expect(jurisdictionResult.confidence).toBeGreaterThan(0.8)

      // Step 2: Get safety context
      const safetyContext = await safetyIntegration.getSafetyContext(userId, 'US')
      
      expect(safetyContext.crisisResources).toBeDefined()
      expect(safetyContext.jurisdiction).toBe('US')

      // Step 3: Record comprehensive consent
      await consentManager.recordConsent(userId, mockConsents.valid)
      
      // Verify consent was recorded
      const consentStatus = await consentManager.getUserConsentStatus(userId)
      expect(consentStatus).toBeDefined()

      // Step 4: Verify required consents
      const hasRequired = await consentManager.hasRequiredConsents(userId)
      expect(hasRequired).toBe(true)

      // Step 5: Save jurisdiction preference
      await jurisdictionDetection.saveUserJurisdiction(userId, 'US')

      // Verify complete registration state
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSupabase.from).toHaveBeenCalledWith('user_consents')
    })

    it('should handle registration with GDPR jurisdiction', async () => {
      const consentManager = new ConsentManager()
      const jurisdictionDetection = new JurisdictionDetection()

      // Detect GDPR jurisdiction
      const jurisdictionResult = await jurisdictionDetection.detectJurisdiction({
        country: 'Germany'
      })

      expect(jurisdictionResult.jurisdiction.code).toBe('DE')
      expect(jurisdictionResult.jurisdiction.privacyLaw).toBe('GDPR')

      // Get GDPR-specific consent requirements
      const requiredConsents = consentManager.getRequiredConsentsForJurisdiction('DE')
      
      expect(requiredConsents).toContain('data_processing')
      expect(requiredConsents).toContain('third_party_sharing')

      // Verify GDPR privacy requirements
      const privacyRequirements = jurisdictionDetection.getPrivacyRequirements('DE')
      expect(privacyRequirements.law).toBe('GDPR')
      expect(privacyRequirements.requirements.rightToBeforgotten).toBe(true)
      expect(privacyRequirements.requirements.dataPortability).toBe(true)
    })
  })

  describe('Couple Linking Integration', () => {
    it('should complete full couple linking flow with safety protocols', async () => {
      const coupleLinking = new CoupleLinking()
      const consentManager = new ConsentManager()
      const safetyIntegration = new SafetyIntegration()

      const inviterId = mockUsers.testUser.id
      const acceptorId = mockUsers.partnerUser.id
      const partnerEmail = mockUsers.partnerUser.email

      // Step 1: Create invitation
      const invitation = await coupleLinking.createInvitation(inviterId, partnerEmail)
      
      expect(invitation.code).toMatch(/^[A-Z0-9]{8}-[A-Z0-9]{4}$/)
      expect(invitation.inviter_id).toBe(inviterId)

      // Step 2: Record safety discussion
      const safetyDiscussion = {
        domesticViolenceAwareness: true,
        privacyBoundaries: true,
        emergencyProtocols: true,
        dataSharing: true,
        helpSeekingComfort: true
      }

      await coupleLinking.recordSafetyDiscussion(
        invitation.id,
        inviterId,
        safetyDiscussion
      )

      // Step 3: Accept invitation with safety checks
      const acceptResult = await coupleLinking.acceptInvitation(acceptorId, invitation.code)
      
      expect(acceptResult.coupleId).toBeDefined()
      expect(acceptResult.inviterId).toBe(inviterId)

      // Step 4: Verify couple status
      const coupleStatus = await coupleLinking.getUserCoupleStatus(inviterId)
      
      expect(coupleStatus.isLinked).toBe(true)
      expect(coupleStatus.partnerId).toBe(acceptorId)

      // Step 5: Ensure both users have safety context
      const inviterSafetyContext = await safetyIntegration.getSafetyContext(inviterId)
      const acceptorSafetyContext = await safetyIntegration.getSafetyContext(acceptorId)

      expect(inviterSafetyContext.crisisResources.length).toBeGreaterThan(0)
      expect(acceptorSafetyContext.crisisResources.length).toBeGreaterThan(0)
    })

    it('should prevent linking without proper safety protocols', async () => {
      const coupleLinking = new CoupleLinking()

      const inviterId = mockUsers.testUser.id
      const partnerEmail = mockUsers.partnerUser.email

      // Create invitation
      const invitation = await coupleLinking.createInvitation(inviterId, partnerEmail)

      // Try to accept without safety discussion
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ 
              data: {
                ...mockInvitations.valid,
                safety_discussion_completed: false
              }, 
              error: null 
            }))
          }))
        }))
      }))

      await expect(
        coupleLinking.acceptInvitation(mockUsers.partnerUser.id, invitation.code)
      ).rejects.toThrow('Safety discussion must be completed before accepting invitation')
    })
  })

  describe('Privacy and Consent Integration', () => {
    it('should handle consent revocation with cascade effects', async () => {
      const consentManager = new ConsentManager()
      const coupleLinking = new CoupleLinking()

      const userId = mockUsers.testUser.id

      // Initially grant all consents
      await consentManager.recordConsent(userId, mockConsents.valid)
      
      // Verify user can link with partner
      let hasRequired = await consentManager.hasRequiredConsents(userId)
      expect(hasRequired).toBe(true)

      // Revoke non-essential consent
      await consentManager.revokeConsent(userId, 'analytics_cookies')

      // Should still have required consents
      hasRequired = await consentManager.hasRequiredConsents(userId)
      expect(hasRequired).toBe(true)

      // Try to revoke essential consent (should fail)
      await expect(
        consentManager.revokeConsent(userId, 'essential_cookies')
      ).rejects.toThrow('Essential consents cannot be revoked')

      // Try to revoke safety monitoring (should require special handling)
      await expect(
        consentManager.revokeConsent(userId, 'safety_monitoring')
      ).rejects.toThrow('Safety monitoring consent requires special consideration')
    })

    it('should handle data retention requirements by jurisdiction', async () => {
      const jurisdictionDetection = new JurisdictionDetection()
      const consentManager = new ConsentManager()

      // Test US data retention
      const usRequirements = jurisdictionDetection.getPrivacyRequirements('US')
      expect(usRequirements.dataRetention.generalData).toBe(365)
      expect(usRequirements.dataRetention.safetyData).toBe(2555) // 7 years

      // Test GDPR data retention
      const deRequirements = jurisdictionDetection.getPrivacyRequirements('DE')
      expect(deRequirements.dataRetention.generalData).toBe(365)
      expect(deRequirements.requirements.rightToBeforgotten).toBe(true)

      // Verify consent versioning for compliance
      const consentVersion = consentManager.getConsentVersion()
      expect(consentVersion).toBeDefined()

      // Test consent expiration (GDPR requires re-consent after time)
      const recentConsent = new Date().toISOString()
      const oldConsent = new Date('2022-01-01').toISOString()

      expect(consentManager.isConsentExpired(recentConsent)).toBe(false)
      expect(consentManager.isConsentExpired(oldConsent)).toBe(true)
    })
  })

  describe('Safety Integration Flow', () => {
    it('should provide appropriate crisis resources by jurisdiction', async () => {
      const safetyIntegration = new SafetyIntegration()
      const jurisdictionDetection = new JurisdictionDetection()

      // Test US crisis resources
      const usJurisdiction = await jurisdictionDetection.getJurisdictionInfo('US')
      const usSafetyContext = await safetyIntegration.getSafetyContext(
        mockUsers.testUser.id, 
        'US'
      )

      expect(usSafetyContext.crisisResources).toEqual(usJurisdiction.crisisResources)
      expect(usSafetyContext.emergencyNumber).toBe('911')

      // Test German crisis resources
      const deJurisdiction = await jurisdictionDetection.getJurisdictionInfo('DE')
      const deSafetyContext = await safetyIntegration.getSafetyContext(
        mockUsers.testUser.id, 
        'DE'
      )

      expect(deSafetyContext.emergencyNumber).toBe('112')
      expect(deSafetyContext.crisisResources[0].languages).toContain('German')
    })

    it('should handle emergency protocol escalation', async () => {
      const safetyIntegration = new SafetyIntegration()

      const emergencyProtocol = await safetyIntegration.getEmergencyProtocol('US')
      
      expect(emergencyProtocol.crisisDetectionEnabled).toBe(true)
      expect(emergencyProtocol.professionalIntervention).toBe(true)
      expect(emergencyProtocol.emergencyContacts).toBeDefined()

      // Verify safety escalation paths are defined
      expect(emergencyProtocol.escalationPaths).toBeDefined()
      expect(emergencyProtocol.escalationPaths.crisis).toBeDefined()
      expect(emergencyProtocol.escalationPaths.domesticViolence).toBeDefined()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection failures gracefully', async () => {
      const consentManager = new ConsentManager()
      
      // Mock database error
      mockSupabase.from = jest.fn(() => ({
        insert: jest.fn(() => ({ error: new Error('Database connection failed') }))
      }))

      await expect(
        consentManager.recordConsent(mockUsers.testUser.id, mockConsents.valid)
      ).rejects.toThrow('Failed to record consent: Database connection failed')
    })

    it('should handle invalid invitation scenarios', async () => {
      const coupleLinking = new CoupleLinking()

      // Test non-existent invitation
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: null, error: null }))
          }))
        }))
      }))

      await expect(
        coupleLinking.acceptInvitation(mockUsers.partnerUser.id, 'INVALID123')
      ).rejects.toThrow('Invalid invitation code')

      // Test expired invitation
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: mockInvitations.expired, error: null }))
          }))
        }))
      }))

      await expect(
        coupleLinking.acceptInvitation(mockUsers.partnerUser.id, mockInvitations.expired.code)
      ).rejects.toThrow('Invitation has expired')
    })

    it('should handle jurisdiction detection failures', async () => {
      const jurisdictionDetection = new JurisdictionDetection()

      // Mock browser API failures
      Object.defineProperty(global, 'navigator', {
        get: () => {
          throw new Error('Navigator not available')
        }
      })

      // Should fallback gracefully to US
      const result = await jurisdictionDetection.detectJurisdiction()
      
      expect(result.jurisdiction.code).toBe('US')
      expect(result.confidence).toBe(0.1)
      expect(result.detectionMethod).toBe('default')
    })
  })

  describe('Performance and Caching', () => {
    it('should cache jurisdiction information', async () => {
      const jurisdictionDetection = new JurisdictionDetection()

      // First call
      const result1 = await jurisdictionDetection.getJurisdictionInfo('US')
      
      // Second call should use cache
      const result2 = await jurisdictionDetection.getJurisdictionInfo('US')

      expect(result1).toEqual(result2)
      // In a real implementation, we would verify fewer database calls
    })

    it('should generate unique invitation codes efficiently', async () => {
      const coupleLinking = new CoupleLinking()
      
      // Generate multiple codes
      const codes = await Promise.all([
        coupleLinking.generateInvitationCode(),
        coupleLinking.generateInvitationCode(),
        coupleLinking.generateInvitationCode()
      ])

      // All should be unique and well-formatted
      const uniqueCodes = new Set(codes)
      expect(uniqueCodes.size).toBe(codes.length)
      
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{8}-[A-Z0-9]{4}$/)
      })
    })
  })

  describe('Security Validations', () => {
    it('should prevent self-invitation attacks', async () => {
      const coupleLinking = new CoupleLinking()

      // Mock user profile lookup to return same user
      mockSupabase.from = jest.fn((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({ 
                  data: { email: mockUsers.testUser.email }, 
                  error: null 
                }))
              }))
            }))
          }
        }
        return { insert: jest.fn() }
      })

      await expect(
        coupleLinking.createInvitation(mockUsers.testUser.id, mockUsers.testUser.email)
      ).rejects.toThrow('Cannot invite yourself')
    })

    it('should validate email format in invitations', async () => {
      const coupleLinking = new CoupleLinking()

      await expect(
        coupleLinking.createInvitation(mockUsers.testUser.id, 'invalid-email')
      ).rejects.toThrow('Invalid email address')

      await expect(
        coupleLinking.createInvitation(mockUsers.testUser.id, 'user@')
      ).rejects.toThrow('Invalid email address')

      await expect(
        coupleLinking.createInvitation(mockUsers.testUser.id, '@domain.com')
      ).rejects.toThrow('Invalid email address')
    })

    it('should enforce consent requirements by jurisdiction', async () => {
      const consentManager = new ConsentManager()

      // US requires basic consents
      const usRequired = consentManager.getRequiredConsentsForJurisdiction('US')
      expect(usRequired).toContain('essential_cookies')
      expect(usRequired).toContain('safety_monitoring')

      // GDPR requires additional consents
      const gdprRequired = consentManager.getRequiredConsentsForJurisdiction('DE')
      expect(gdprRequired).toContain('data_processing')
      expect(gdprRequired).toContain('third_party_sharing')
      expect(gdprRequired.length).toBeGreaterThan(usRequired.length)
    })
  })
})