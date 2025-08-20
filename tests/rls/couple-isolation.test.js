/**
 * Multi-Couple Isolation Tests
 * Tests that couples cannot access each other's private data
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { 
  adminClient,
  setUserContext,
  clearUserContext,
  RLSTestValidator
} from './setup.js'
import { RLSTestFixtures } from './fixtures.js'

describe('Multi-Couple Data Isolation', () => {
  let fixtures
  let aliceClient, bobClient, charlieClient, dianaClient, eveClient, frankClient

  beforeAll(async () => {
    fixtures = new RLSTestFixtures()
    await fixtures.createMultiCoupleScenario()
    await fixtures.createAssessmentResponses()
    
    // Verify fixtures were created correctly
    expect(fixtures.users.alice).toBeDefined()
    expect(fixtures.users.bob).toBeDefined()
    expect(fixtures.users.charlie).toBeDefined()
    expect(fixtures.users.diana).toBeDefined()
    expect(fixtures.couples.aliceBob).toBeDefined()
    expect(fixtures.couples.charlieDiana).toBeDefined()
  })

  afterAll(async () => {
    await fixtures.cleanup()
    await clearUserContext()
  })

  describe('User Profile Isolation', () => {
    it('should allow users to access only their own profile', async () => {
      // Alice tries to access her own profile
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: aliceProfile } = await adminClient
        .from('users')
        .select('*')
        .eq('auth_id', fixtures.users.alice.authId)
      
      RLSTestValidator.shouldAllowAccess(aliceProfile, true, 'Alice should access her own profile')
      expect(aliceProfile[0].id).toBe(fixtures.users.alice.id)
    })

    it('should prevent users from accessing other user profiles', async () => {
      // Alice tries to access Bob's profile directly
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: bobProfile } = await adminClient
        .from('users')
        .select('*')
        .eq('auth_id', fixtures.users.bob.authId)
      
      RLSTestValidator.shouldDenyAccess(bobProfile, 'Alice should not access Bob\'s profile directly')
    })

    it('should prevent cross-couple profile access', async () => {
      // Alice (from couple AB) tries to access Charlie's profile (from couple CD)
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: charlieProfile } = await adminClient
        .from('users')
        .select('*')
        .eq('auth_id', fixtures.users.charlie.authId)
      
      RLSTestValidator.shouldDenyAccess(charlieProfile, 'Alice should not access Charlie\'s profile')
    })

    it('should prevent single users from accessing coupled user profiles', async () => {
      // Eve (single) tries to access Alice's profile (in couple)
      await setUserContext(fixtures.users.eve.authId)
      
      const { data: aliceProfile } = await adminClient
        .from('users')
        .select('*')
        .eq('auth_id', fixtures.users.alice.authId)
      
      RLSTestValidator.shouldDenyAccess(aliceProfile, 'Eve should not access Alice\'s profile')
    })
  })

  describe('Couple Data Access Control', () => {
    it('should allow both partners to access their couple data', async () => {
      // Alice accesses couple AB data
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: coupleDataAlice } = await adminClient
        .from('couples')
        .select('*')
        .eq('id', fixtures.couples.aliceBob.id)
      
      RLSTestValidator.shouldAllowAccess(coupleDataAlice, true, 'Alice should access couple AB data')
      
      // Bob accesses couple AB data
      await setUserContext(fixtures.users.bob.authId)
      
      const { data: coupleDataBob } = await adminClient
        .from('couples')
        .select('*')
        .eq('id', fixtures.couples.aliceBob.id)
      
      RLSTestValidator.shouldAllowAccess(coupleDataBob, true, 'Bob should access couple AB data')
    })

    it('should prevent cross-couple data access', async () => {
      // Alice tries to access couple CD data
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: charlieDianaData } = await adminClient
        .from('couples')
        .select('*')
        .eq('id', fixtures.couples.charlieDiana.id)
      
      RLSTestValidator.shouldDenyAccess(charlieDianaData, 'Alice should not access couple CD data')
    })

    it('should prevent single users from accessing any couple data', async () => {
      // Eve tries to access couple AB data
      await setUserContext(fixtures.users.eve.authId)
      
      const { data: coupleABData } = await adminClient
        .from('couples')
        .select('*')
        .eq('id', fixtures.couples.aliceBob.id)
      
      RLSTestValidator.shouldDenyAccess(coupleABData, 'Eve should not access couple AB data')
    })
  })

  describe('User Preferences Isolation', () => {
    it('should allow users to access only their own preferences', async () => {
      // Alice accesses her preferences
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: alicePrefs } = await adminClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', fixtures.users.alice.id)
      
      RLSTestValidator.shouldAllowAccess(alicePrefs, true, 'Alice should access her preferences')
    })

    it('should prevent partners from accessing each other\'s preferences', async () => {
      // Alice tries to access Bob's preferences
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: bobPrefs } = await adminClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', fixtures.users.bob.id)
      
      RLSTestValidator.shouldDenyAccess(bobPrefs, 'Alice should not access Bob\'s preferences')
    })

    it('should prevent cross-couple preference access', async () => {
      // Alice tries to access Charlie's preferences
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: charliePrefs } = await adminClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', fixtures.users.charlie.id)
      
      RLSTestValidator.shouldDenyAccess(charliePrefs, 'Alice should not access Charlie\'s preferences')
    })
  })

  describe('Safety Profile Isolation', () => {
    it('should allow users to access only their own safety profile', async () => {
      // Alice accesses her safety profile
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: aliceSafety } = await adminClient
        .from('user_safety_profile')
        .select('*')
        .eq('user_id', fixtures.users.alice.id)
      
      RLSTestValidator.shouldAllowAccess(aliceSafety, true, 'Alice should access her safety profile')
    })

    it('should prevent partners from accessing each other\'s safety profiles', async () => {
      // Bob tries to access Alice's safety profile
      await setUserContext(fixtures.users.bob.authId)
      
      const { data: aliceSafety } = await adminClient
        .from('user_safety_profile')
        .select('*')
        .eq('user_id', fixtures.users.alice.id)
      
      RLSTestValidator.shouldDenyAccess(aliceSafety, 'Bob should not access Alice\'s safety profile')
    })

    it('should prevent cross-couple safety profile access', async () => {
      // Alice tries to access Diana's safety profile
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: dianaSafety } = await adminClient
        .from('user_safety_profile')
        .select('*')
        .eq('user_id', fixtures.users.diana.id)
      
      RLSTestValidator.shouldDenyAccess(dianaSafety, 'Alice should not access Diana\'s safety profile')
    })
  })

  describe('Communication History Isolation', () => {
    it('should allow partners to access their couple\'s communication history', async () => {
      // Alice accesses couple AB communications
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: aliceBobComms } = await adminClient
        .from('communication_history')
        .select('*')
        .eq('couple_id', fixtures.couples.aliceBob.id)
      
      RLSTestValidator.shouldAllowAccess(aliceBobComms, true, 'Alice should access couple AB communications')
      expect(aliceBobComms.length).toBeGreaterThan(0)
    })

    it('should prevent cross-couple communication access', async () => {
      // Alice tries to access couple CD communications
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: charlieDianaComms } = await adminClient
        .from('communication_history')
        .select('*')
        .eq('couple_id', fixtures.couples.charlieDiana.id)
      
      RLSTestValidator.shouldDenyAccess(charlieDianaComms, 'Alice should not access couple CD communications')
    })

    it('should prevent single users from accessing any communications', async () => {
      // Eve tries to access couple AB communications
      await setUserContext(fixtures.users.eve.authId)
      
      const { data: aliceBobComms } = await adminClient
        .from('communication_history')
        .select('*')
        .eq('couple_id', fixtures.couples.aliceBob.id)
      
      RLSTestValidator.shouldDenyAccess(aliceBobComms, 'Eve should not access couple AB communications')
    })
  })

  describe('Assessment Response Isolation', () => {
    it('should allow users to access their own assessment responses', async () => {
      // Alice accesses her assessment responses
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: aliceResponses } = await adminClient
        .from('assessment_responses')
        .select('*')
        .eq('user_id', fixtures.users.alice.id)
      
      RLSTestValidator.shouldAllowAccess(aliceResponses, true, 'Alice should access her assessment responses')
    })

    it('should handle partner access based on sharing consent', async () => {
      // Bob tries to access shared assessment data from couple
      await setUserContext(fixtures.users.bob.authId)
      
      const { data: sharedResponses } = await adminClient
        .from('assessment_responses')
        .select('*')
        .eq('couple_id', fixtures.couples.aliceBob.id)
        .eq('sharing_consent', true)
      
      // Should be able to see Alice's shared responses but not his own private ones
      const aliceSharedResponse = sharedResponses?.find(r => r.user_id === fixtures.users.alice.id)
      expect(aliceSharedResponse).toBeDefined()
    })

    it('should prevent cross-couple assessment access', async () => {
      // Alice tries to access Charlie's assessment responses
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: charlieResponses } = await adminClient
        .from('assessment_responses')
        .select('*')
        .eq('user_id', fixtures.users.charlie.id)
      
      RLSTestValidator.shouldDenyAccess(charlieResponses, 'Alice should not access Charlie\'s assessments')
    })
  })

  describe('Complex Multi-Couple Scenarios', () => {
    it('should maintain isolation in complex queries', async () => {
      // Alice tries to get all couples data (should only see her own)
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: allCouples } = await adminClient
        .from('couples')
        .select('*')
      
      RLSTestValidator.shouldHaveCount(allCouples, 1, 'Alice should only see her own couple')
      expect(allCouples[0].id).toBe(fixtures.couples.aliceBob.id)
    })

    it('should prevent data leakage through joins', async () => {
      // Alice tries to access data through user joins
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: userData } = await adminClient
        .from('users')
        .select(`
          id,
          display_name,
          user_preferences!inner(*)
        `)
      
      // Should only return Alice's data, not other users
      RLSTestValidator.shouldHaveCount(userData, 1, 'Should only return Alice\'s data through joins')
      expect(userData[0].id).toBe(fixtures.users.alice.id)
    })

    it('should maintain isolation across multiple table access', async () => {
      // Charlie accesses multiple tables simultaneously
      await setUserContext(fixtures.users.charlie.authId)
      
      const [
        { data: userProfile },
        { data: preferences }, 
        { data: safetyProfile },
        { data: coupleData },
        { data: communications }
      ] = await Promise.all([
        adminClient.from('users').select('*'),
        adminClient.from('user_preferences').select('*'),
        adminClient.from('user_safety_profile').select('*'),
        adminClient.from('couples').select('*'),
        adminClient.from('communication_history').select('*')
      ])
      
      // Should only see Charlie's own data and couple CD data
      RLSTestValidator.shouldHaveCount(userProfile, 1, 'Charlie should see only his profile')
      RLSTestValidator.shouldHaveCount(preferences, 1, 'Charlie should see only his preferences')
      RLSTestValidator.shouldHaveCount(safetyProfile, 1, 'Charlie should see only his safety profile')
      RLSTestValidator.shouldHaveCount(coupleData, 1, 'Charlie should see only couple CD')
      
      expect(userProfile[0].id).toBe(fixtures.users.charlie.id)
      expect(coupleData[0].id).toBe(fixtures.couples.charlieDiana.id)
    })
  })

  describe('Anonymous Access Prevention', () => {
    it('should deny all access to anonymous users', async () => {
      // Clear user context (simulate anonymous access)
      await clearUserContext()
      
      const tables = [
        'users',
        'user_preferences', 
        'user_safety_profile',
        'couples',
        'communication_history',
        'assessment_responses'
      ]
      
      for (const table of tables) {
        const { data } = await adminClient
          .from(table)
          .select('*')
        
        RLSTestValidator.shouldDenyAccess(data, `Anonymous users should not access ${table}`)
      }
    })
  })
})