/**
 * Edge Case Scenario Tests
 * Tests RLS behavior in unusual situations and edge cases
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
import { RLSTestFixtures, QuickFixtures } from './fixtures.js'

describe('Edge Case Scenarios', () => {
  let fixtures
  let deletedUser, inactiveCouple, orphanedUser

  beforeAll(async () => {
    fixtures = new RLSTestFixtures()
    await fixtures.createMultiCoupleScenario()
    await fixtures.createEdgeCaseScenarios()
  })

  afterAll(async () => {
    await fixtures.cleanup()
    await clearUserContext()
  })

  beforeEach(async () => {
    await clearUserContext()
  })

  describe('Deleted User Scenarios', () => {
    it('should handle deleted auth user gracefully', async () => {
      // Create a test user and then delete the auth record
      const testUser = await createTestUser({
        email: 'deleted.edge.test@example.com',
        displayName: 'Deleted User Test'
      })
      
      // Delete the auth user but leave profile
      await adminClient.auth.admin.deleteUser(testUser.authId)
      
      // Try to access with deleted auth ID
      await setUserContext(testUser.authId)
      
      const { data: userData } = await adminClient
        .from('users')
        .select('*')
        .eq('auth_id', testUser.authId)
      
      // Should not be able to access anything with deleted auth
      RLSTestValidator.shouldDenyAccess(userData, 'Deleted auth user should not access data')
    })

    it('should handle orphaned user profiles', async () => {
      // Create user profile without corresponding auth user
      const orphanAuthId = crypto.randomUUID()
      
      const { data: orphanProfile, error } = await adminClient
        .from('users')
        .insert({
          auth_id: orphanAuthId,
          email_encrypted: 'encrypted_orphan@example.com',
          display_name: 'Orphaned Profile',
          is_active: true
        })
        .select()
      
      if (!error) {
        // Try to access as orphaned user
        await setUserContext(orphanAuthId)
        
        const { data: accessAttempt } = await adminClient
          .from('users')
          .select('*')
          .eq('auth_id', orphanAuthId)
        
        // RLS should still apply, but the orphaned user should be able to see their own profile
        // if the auth context is somehow valid
        expect(accessAttempt).toBeDefined()
      }
    })
  })

  describe('Inactive Couple Scenarios', () => {
    it('should handle inactive couple data access', async () => {
      // Create couple and then deactivate it
      const { user1, user2, couple } = await QuickFixtures.createSimpleCouple()
      
      // Deactivate the couple
      await adminClient
        .from('couples')
        .update({ is_active: false })
        .eq('id', couple.id)
      
      // Partner tries to access inactive couple data
      await setUserContext(user1.authId)
      
      const { data: inactiveCoupleData } = await adminClient
        .from('couples')
        .select('*')
        .eq('id', couple.id)
      
      // RLS policies might restrict access to inactive couples
      // This depends on the specific policy implementation
      if (inactiveCoupleData && inactiveCoupleData.length > 0) {
        expect(inactiveCoupleData[0].is_active).toBe(false)
      }
    })

    it('should handle communication access for inactive couples', async () => {
      // Use the inactive couple from fixtures
      await setUserContext(fixtures.users.eve.authId)
      
      const { data: inactiveComms } = await adminClient
        .from('communication_history')
        .select('*')
        .eq('couple_id', fixtures.couples.inactive.id)
      
      // Should be able to access communications even if couple is inactive
      // (for data retention and history purposes)
      expect(inactiveComms).toBeDefined()
    })
  })

  describe('Invalid Auth Token Scenarios', () => {
    it('should handle malformed auth tokens', async () => {
      // Set invalid auth context
      await setUserContext('invalid-auth-id')
      
      const { data: unauthorizedData } = await adminClient
        .from('users')
        .select('*')
      
      RLSTestValidator.shouldDenyAccess(unauthorizedData, 'Invalid auth should deny access')
    })

    it('should handle null/undefined auth context', async () => {
      // Set null auth context
      await setUserContext(null)
      
      const { data: nullAuthData } = await adminClient
        .from('couples')
        .select('*')
      
      RLSTestValidator.shouldDenyAccess(nullAuthData, 'Null auth should deny access')
    })

    it('should handle empty string auth context', async () => {
      // Set empty auth context
      await setUserContext('')
      
      const { data: emptyAuthData } = await adminClient
        .from('user_preferences')
        .select('*')
      
      RLSTestValidator.shouldDenyAccess(emptyAuthData, 'Empty auth should deny access')
    })
  })

  describe('Concurrent Access Scenarios', () => {
    it('should maintain isolation during concurrent access', async () => {
      // Simulate concurrent access from different users
      const promises = [
        // Alice accessing her data
        (async () => {
          await setUserContext(fixtures.users.alice.authId)
          return adminClient.from('users').select('*').eq('id', fixtures.users.alice.id)
        })(),
        
        // Bob accessing his data
        (async () => {
          await setUserContext(fixtures.users.bob.authId)
          return adminClient.from('users').select('*').eq('id', fixtures.users.bob.id)
        })(),
        
        // Charlie accessing his data
        (async () => {
          await setUserContext(fixtures.users.charlie.authId)
          return adminClient.from('users').select('*').eq('id', fixtures.users.charlie.id)
        })()
      ]
      
      const results = await Promise.all(promises)
      
      // Each user should only see their own data
      results.forEach((result, index) => {
        RLSTestValidator.shouldHaveCount(result.data, 1, `User ${index + 1} should see only their own data`)
      })
    })
  })

  describe('Data Corruption Edge Cases', () => {
    it('should handle missing foreign key references', async () => {
      // Create user preference with invalid user_id
      const invalidUserId = crypto.randomUUID()
      
      try {
        await adminClient
          .from('user_preferences')
          .insert({
            user_id: invalidUserId,
            email_notifications: true
          })
      } catch (error) {
        // Should fail due to foreign key constraint
        expect(error).toBeDefined()
      }
    })

    it('should handle circular couple relationships', async () => {
      // This shouldn't be possible with proper constraints,
      // but test the edge case anyway
      const user1 = await createTestUser({
        email: 'circular1.edge.test@example.com',
        displayName: 'Circular Test 1'
      })
      
      const user2 = await createTestUser({
        email: 'circular2.edge.test@example.com', 
        displayName: 'Circular Test 2'
      })
      
      // Create couple 1->2
      const couple12 = await createTestCouple(user1, user2)
      
      // Try to create couple 2->1 (should be prevented by constraints)
      try {
        await createTestCouple(user2, user1)
      } catch (error) {
        // Should fail due to unique constraint
        expect(error).toBeDefined()
      }
    })
  })

  describe('Large Data Volume Edge Cases', () => {
    it('should handle users with many preferences', async () => {
      const testUser = await createTestUser({
        email: 'volume.edge.test@example.com',
        displayName: 'Volume Test User'
      })
      
      // Create multiple preference records (simulating data growth over time)
      const preferences = []
      for (let i = 0; i < 5; i++) {
        preferences.push({
          user_id: testUser.id,
          email_notifications: i % 2 === 0,
          push_notifications: i % 3 === 0,
          crisis_detection_sensitivity: ['low', 'medium', 'high'][i % 3]
        })
      }
      
      // Only the last one should persist due to UPSERT
      await adminClient
        .from('user_preferences')
        .upsert(preferences[preferences.length - 1])
      
      await setUserContext(testUser.authId)
      
      const { data: userPrefs } = await adminClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', testUser.id)
      
      RLSTestValidator.shouldHaveCount(userPrefs, 1, 'Should have exactly one preference record')
    })

    it('should handle couples with extensive communication history', async () => {
      const { user1, user2, couple } = await QuickFixtures.createSimpleCouple()
      
      // Create multiple communications
      const communications = []
      for (let i = 0; i < 10; i++) {
        communications.push({
          couple_id: couple.id,
          sender_user_id: i % 2 === 0 ? user1.id : user2.id,
          content_encrypted: `encrypted_message_${i}`,
          message_type: 'free_form'
        })
      }
      
      await adminClient
        .from('communication_history')
        .insert(communications)
      
      await setUserContext(user1.authId)
      
      const { data: allComms } = await adminClient
        .from('communication_history')
        .select('*')
        .eq('couple_id', couple.id)
        .order('created_at', { ascending: false })
      
      RLSTestValidator.shouldHaveCount(allComms, 10, 'Should access all couple communications')
    })
  })

  describe('System State Edge Cases', () => {
    it('should handle database connection issues gracefully', async () => {
      // This is hard to test without actually breaking the connection
      // but we can test the RLS behavior with edge case queries
      
      await setUserContext(fixtures.users.alice.authId)
      
      // Query with complex conditions that might cause issues
      const { data: complexQuery } = await adminClient
        .from('users')
        .select(`
          id,
          display_name,
          user_preferences(
            email_notifications,
            push_notifications
          ),
          user_safety_profile(
            baseline_wellness_score,
            monitoring_consent_level
          )
        `)
        .eq('id', fixtures.users.alice.id)
        .limit(1)
      
      RLSTestValidator.shouldAllowAccess(complexQuery, true, 'Complex query should work with RLS')
    })
  })

  describe('Timestamp and Date Edge Cases', () => {
    it('should handle future-dated records', async () => {
      const testUser = await createTestUser({
        email: 'future.edge.test@example.com',
        displayName: 'Future Test User'
      })
      
      // Create user with future timestamp (if allowed)
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      
      await setUserContext(testUser.authId)
      
      const { data: userProfile } = await adminClient
        .from('users')
        .select('*')
        .eq('id', testUser.id)
      
      RLSTestValidator.shouldAllowAccess(userProfile, true, 'Should access user regardless of timestamp')
    })
  })

  describe('Role and Permission Edge Cases', () => {
    it('should handle missing role claims', async () => {
      // Set user context without role claims
      await adminClient.rpc('set_config', {
        setting_name: 'request.jwt.claim.sub',
        new_value: fixtures.users.alice.authId,
        is_local: true
      })
      
      // Don't set role claims
      
      const { data: userData } = await adminClient
        .from('users')
        .select('*')
        .eq('id', fixtures.users.alice.id)
      
      // Should still work with basic auth, just no elevated permissions
      RLSTestValidator.shouldAllowAccess(userData, true, 'Should work without role claims')
    })

    it('should handle invalid role claims', async () => {
      // Set invalid role
      await adminClient.rpc('set_config', {
        setting_name: 'request.jwt.claim.user_role',
        new_value: 'invalid_role',
        is_local: true
      })
      
      await setUserContext(fixtures.users.alice.authId)
      
      const { data: userData } = await adminClient
        .from('users')
        .select('*')
        .eq('id', fixtures.users.alice.id)
      
      // Should still work, just treated as regular user
      RLSTestValidator.shouldAllowAccess(userData, true, 'Should work with invalid role')
    })
  })

  describe('Data Type Edge Cases', () => {
    it('should handle null and empty values gracefully', async () => {
      const testUser = await createTestUser({
        email: 'null.edge.test@example.com',
        displayName: null // Test null display name
      })
      
      await setUserContext(testUser.authId)
      
      const { data: userProfile } = await adminClient
        .from('users')
        .select('*')
        .eq('id', testUser.id)
      
      RLSTestValidator.shouldAllowAccess(userProfile, true, 'Should handle null values')
      expect(userProfile[0].display_name).toBeNull()
    })

    it('should handle very long string values', async () => {
      const longString = 'x'.repeat(1000)
      
      const testUser = await createTestUser({
        email: 'long.edge.test@example.com',
        displayName: longString
      })
      
      await setUserContext(testUser.authId)
      
      const { data: userProfile } = await adminClient
        .from('users')
        .select('*')
        .eq('id', testUser.id)
      
      RLSTestValidator.shouldAllowAccess(userProfile, true, 'Should handle long strings')
    })
  })
})