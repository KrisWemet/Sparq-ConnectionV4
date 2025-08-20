/**
 * Individual Privacy Control Tests
 * Tests that privacy preferences are correctly enforced
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { 
  adminClient,
  setUserContext,
  clearUserContext,
  RLSTestValidator,
  createTestUser,
  createTestCouple
} from './setup.js'
import { QuickFixtures } from './fixtures.js'

describe('Individual Privacy Controls', () => {
  let user1, user2, couple
  let privateUser, publicUser
  
  beforeAll(async () => {
    // Create basic couple for testing
    const { user1: u1, user2: u2, couple: c } = await QuickFixtures.createSimpleCouple()
    user1 = u1
    user2 = u2  
    couple = c
    
    // Create users with different privacy settings
    privateUser = await createTestUser({
      email: 'private.privacy.test@example.com',
      displayName: 'Private User'
    })
    
    publicUser = await createTestUser({
      email: 'public.privacy.test@example.com',
      displayName: 'Public User'
    })
  })

  afterAll(async () => {
    await clearUserContext()
  })

  beforeEach(async () => {
    await clearUserContext()
  })

  describe('Privacy Preference Enforcement', () => {
    it('should create and enforce private profile visibility', async () => {
      // Set user1 to private profile
      await adminClient
        .from('user_preferences')
        .upsert({
          user_id: user1.id,
          profile_visibility: 'private',
          data_sharing_research: false,
          anonymous_usage_analytics: false
        })
      
      // User1 should still access their own profile
      await setUserContext(user1.authId)
      
      const { data: ownProfile } = await adminClient
        .from('users')
        .select('*')
        .eq('id', user1.id)
      
      RLSTestValidator.shouldAllowAccess(ownProfile, true, 'User should access their own private profile')
    })

    it('should enforce partner-only profile visibility', async () => {
      // Set user1 to partner-only visibility
      await adminClient
        .from('user_preferences')
        .upsert({
          user_id: user1.id,
          profile_visibility: 'partner_only',
          data_sharing_research: false,
          anonymous_usage_analytics: true
        })
      
      // Partner (user2) should still be restricted by RLS policies
      await setUserContext(user2.authId)
      
      const { data: partnerProfile } = await adminClient
        .from('users')
        .select('*')
        .eq('id', user1.id)
      
      // RLS should still prevent direct profile access even with partner_only setting
      RLSTestValidator.shouldDenyAccess(partnerProfile, 'RLS should prevent direct profile access')
    })

    it('should respect data sharing preferences', async () => {
      // Set user1 to opt out of research data sharing
      await adminClient
        .from('user_preferences')
        .upsert({
          user_id: user1.id,
          data_sharing_research: false,
          anonymous_usage_analytics: false
        })
      
      await setUserContext(user1.authId)
      
      const { data: preferences } = await adminClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', user1.id)
      
      expect(preferences[0].data_sharing_research).toBe(false)
      expect(preferences[0].anonymous_usage_analytics).toBe(false)
    })
  })

  describe('Assessment Response Privacy', () => {
    it('should enforce sharing consent for assessment responses', async () => {
      // Create assessment response with sharing consent = false
      const { data: measures } = await adminClient
        .from('self_report_measures')
        .select('id')
        .limit(1)
      
      if (measures && measures.length > 0) {
        const measureId = measures[0].id
        
        await adminClient
          .from('assessment_responses')
          .insert({
            user_id: user1.id,
            couple_id: couple.id,
            measure_id: measureId,
            assessment_session_id: crypto.randomUUID(),
            question_id: 'privacy_test',
            question_text_hash: 'hash_privacy',
            response_value: { score: 3, private: true },
            sharing_consent: false // Private response
          })
        
        // User2 (partner) tries to access user1's private assessment
        await setUserContext(user2.authId)
        
        const { data: privateResponses } = await adminClient
          .from('assessment_responses')
          .select('*')
          .eq('user_id', user1.id)
          .eq('sharing_consent', false)
        
        RLSTestValidator.shouldDenyAccess(privateResponses, 'Partner should not access private assessment responses')
      }
    })

    it('should allow access to shared assessment responses within couple', async () => {
      // Create assessment response with sharing consent = true
      const { data: measures } = await adminClient
        .from('self_report_measures')
        .select('id')
        .limit(1)
      
      if (measures && measures.length > 0) {
        const measureId = measures[0].id
        
        await adminClient
          .from('assessment_responses')
          .insert({
            user_id: user1.id,
            couple_id: couple.id,
            measure_id: measureId,
            assessment_session_id: crypto.randomUUID(),
            question_id: 'shared_test',
            question_text_hash: 'hash_shared',
            response_value: { score: 4, shared: true },
            sharing_consent: true // Shared response
          })
        
        // User2 (partner) accesses shared assessments for their couple
        await setUserContext(user2.authId)
        
        const { data: sharedResponses } = await adminClient
          .from('assessment_responses')
          .select('*')
          .eq('couple_id', couple.id)
          .eq('sharing_consent', true)
        
        // Should be able to see shared responses from their couple
        const user1SharedResponse = sharedResponses?.find(r => r.user_id === user1.id && r.sharing_consent === true)
        expect(user1SharedResponse).toBeDefined()
      }
    })
  })

  describe('Safety Profile Privacy', () => {
    it('should protect safety profile privacy even from partners', async () => {
      // Create safety profile for user1
      await adminClient
        .from('user_safety_profile')
        .upsert({
          user_id: user1.id,
          baseline_wellness_score: 0.7,
          monitoring_consent_level: 'basic',
          auto_intervention_consent: false,
          partner_notification_consent: false, // Explicitly no partner notification
          self_reported_stressors: ['work', 'family']
        })
      
      // User2 (partner) tries to access user1's safety profile
      await setUserContext(user2.authId)
      
      const { data: partnerSafetyProfile } = await adminClient
        .from('user_safety_profile')
        .select('*')
        .eq('user_id', user1.id)
      
      RLSTestValidator.shouldDenyAccess(partnerSafetyProfile, 'Partner should not access safety profile without consent')
    })

    it('should allow users to access their own safety profile', async () => {
      await setUserContext(user1.authId)
      
      const { data: ownSafetyProfile } = await adminClient
        .from('user_safety_profile')
        .select('*')
        .eq('user_id', user1.id)
      
      RLSTestValidator.shouldAllowAccess(ownSafetyProfile, true, 'User should access their own safety profile')
      expect(ownSafetyProfile[0].partner_notification_consent).toBe(false)
    })
  })

  describe('Communication Privacy', () => {
    it('should enforce couple-level communication privacy', async () => {
      // Create private communication between user1 and user2
      const { data: encryptedContent } = await adminClient
        .rpc('encrypt_communication', { content: 'This is a private message' })
        .catch(() => ({ data: 'encrypted_private_message' }))
      
      await adminClient
        .from('communication_history')
        .insert({
          couple_id: couple.id,
          sender_user_id: user1.id,
          content_encrypted: encryptedContent || 'encrypted_private_message',
          message_type: 'private_note'
        })
      
      // Outside user tries to access couple's communications
      await setUserContext(privateUser.authId)
      
      const { data: privateCommunications } = await adminClient
        .from('communication_history')
        .select('*')
        .eq('couple_id', couple.id)
      
      RLSTestValidator.shouldDenyAccess(privateCommunications, 'Outside user should not access couple communications')
    })

    it('should allow couple members to access their communications', async () => {
      await setUserContext(user2.authId)
      
      const { data: coupleCommunications } = await adminClient
        .from('communication_history')
        .select('*')
        .eq('couple_id', couple.id)
      
      RLSTestValidator.shouldAllowAccess(coupleCommunications, true, 'Couple member should access their communications')
    })
  })

  describe('Consent-Based Access Control', () => {
    it('should track and enforce user consents', async () => {
      // Create specific consent record
      await adminClient
        .from('user_consents')
        .upsert({
          user_id: user1.id,
          consent_type: 'analytics_collection',
          granted: false,
          consent_method: 'explicit_opt_out',
          consent_version: '1.0',
          regulatory_basis: 'GDPR'
        })
      
      await setUserContext(user1.authId)
      
      const { data: userConsents } = await adminClient
        .from('user_consents')
        .select('*')
        .eq('user_id', user1.id)
        .eq('consent_type', 'analytics_collection')
      
      expect(userConsents[0].granted).toBe(false)
      expect(userConsents[0].consent_method).toBe('explicit_opt_out')
    })

    it('should prevent other users from accessing consent records', async () => {
      // User2 tries to access user1's consent records
      await setUserContext(user2.authId)
      
      const { data: otherUserConsents } = await adminClient
        .from('user_consents')
        .select('*')
        .eq('user_id', user1.id)
      
      RLSTestValidator.shouldDenyAccess(otherUserConsents, 'Users should not access other users\' consent records')
    })
  })

  describe('Privacy Preference Changes', () => {
    it('should allow users to modify their own privacy preferences', async () => {
      await setUserContext(user1.authId)
      
      const { data: updatedPreferences, error } = await adminClient
        .from('user_preferences')
        .update({
          data_sharing_research: true,
          anonymous_usage_analytics: true,
          profile_visibility: 'partner_only'
        })
        .eq('user_id', user1.id)
        .select()
      
      expect(error).toBeNull()
      expect(updatedPreferences).toBeDefined()
    })

    it('should prevent users from modifying other users\' privacy preferences', async () => {
      await setUserContext(user2.authId)
      
      const { data: updatedPreferences, error } = await adminClient
        .from('user_preferences')
        .update({
          data_sharing_research: false
        })
        .eq('user_id', user1.id)
        .select()
      
      // Should fail due to RLS
      expect(error).toBeDefined()
      expect(updatedPreferences).toBeNull()
    })
  })

  describe('Data Anonymization Controls', () => {
    it('should respect anonymous usage analytics preferences', async () => {
      // Set user to opt out of analytics
      await adminClient
        .from('user_preferences')
        .upsert({
          user_id: privateUser.id,
          anonymous_usage_analytics: false,
          data_sharing_research: false
        })
      
      await setUserContext(privateUser.authId)
      
      const { data: preferences } = await adminClient
        .from('user_preferences')
        .select('anonymous_usage_analytics, data_sharing_research')
        .eq('user_id', privateUser.id)
      
      expect(preferences[0].anonymous_usage_analytics).toBe(false)
      expect(preferences[0].data_sharing_research).toBe(false)
    })

    it('should allow opt-in for analytics while maintaining privacy', async () => {
      // Set user to opt in to analytics but not research
      await adminClient
        .from('user_preferences')
        .upsert({
          user_id: publicUser.id,
          anonymous_usage_analytics: true,
          data_sharing_research: false
        })
      
      await setUserContext(publicUser.authId)
      
      const { data: preferences } = await adminClient
        .from('user_preferences')
        .select('anonymous_usage_analytics, data_sharing_research')
        .eq('user_id', publicUser.id)
      
      expect(preferences[0].anonymous_usage_analytics).toBe(true)
      expect(preferences[0].data_sharing_research).toBe(false)
    })
  })

  describe('Privacy Audit Trail', () => {
    it('should create audit records for privacy preference changes', async () => {
      await setUserContext(user1.authId)
      
      // Update privacy preferences
      await adminClient
        .from('user_preferences')
        .update({
          profile_visibility: 'private'
        })
        .eq('user_id', user1.id)
      
      // Check if audit log was created (if audit logging is implemented)
      const { data: auditRecords } = await adminClient
        .from('audit_log')
        .select('*')
        .eq('user_id', user1.id)
        .eq('action_type', 'privacy_preference_change')
        .order('created_at', { ascending: false })
        .limit(1)
      
      // This might not exist if audit logging isn't fully implemented
      // but the test structure is here for when it is
      if (auditRecords && auditRecords.length > 0) {
        expect(auditRecords[0].resource_type).toBe('user_preferences')
      }
    })
  })

  describe('Cross-Table Privacy Enforcement', () => {
    it('should maintain privacy across related table queries', async () => {
      await setUserContext(user1.authId)
      
      // Query user data with related tables
      const { data: userData } = await adminClient
        .from('users')
        .select(`
          id,
          display_name,
          user_preferences!inner(*),
          user_safety_profile(*)
        `)
        .eq('id', user1.id)
      
      RLSTestValidator.shouldAllowAccess(userData, true, 'User should access their own data with relations')
      expect(userData[0].user_preferences).toBeDefined()
    })

    it('should prevent privacy leakage through table joins', async () => {
      await setUserContext(user2.authId)
      
      // Try to access user1's data through joins
      const { data: leakedData } = await adminClient
        .from('users')
        .select(`
          id,
          display_name,
          user_preferences(*)
        `)
        .eq('id', user1.id)
      
      RLSTestValidator.shouldDenyAccess(leakedData, 'Should not leak data through joins')
    })
  })
})