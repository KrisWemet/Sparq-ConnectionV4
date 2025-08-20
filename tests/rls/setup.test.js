/**
 * RLS Setup Validation Tests
 * Validates that the test environment is properly configured
 */

import { describe, it, expect } from 'vitest'
import { 
  adminClient,
  anonClient,
  TEST_CONFIG,
  createTestUser,
  setUserContext,
  clearUserContext
} from './setup.js'

describe('RLS Test Environment Setup', () => {
  describe('Environment Configuration', () => {
    it('should have all required environment variables', () => {
      expect(TEST_CONFIG.supabaseUrl).toBeDefined()
      expect(TEST_CONFIG.supabaseServiceKey).toBeDefined()
      expect(TEST_CONFIG.supabaseAnonKey).toBeDefined()
      
      expect(TEST_CONFIG.supabaseUrl).toMatch(/^https?:\/\//)
    })

    it('should have different service and anon keys', () => {
      expect(TEST_CONFIG.supabaseServiceKey).not.toBe(TEST_CONFIG.supabaseAnonKey)
    })
  })

  describe('Database Connectivity', () => {
    it('should connect to database with service role', async () => {
      const { data, error } = await adminClient
        .from('users')
        .select('count', { count: 'exact', head: true })
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should connect to database with anon role', async () => {
      const { data, error } = await anonClient
        .from('users')
        .select('count', { count: 'exact', head: true })
      
      // Anon should be blocked by RLS, but connection should work
      expect(data).toBeDefined()
    })
  })

  describe('Core Tables Exist', () => {
    const requiredTables = [
      'users',
      'couples', 
      'user_preferences',
      'user_safety_profile',
      'communication_history',
      'assessment_responses',
      'safety_risk_signals',
      'user_consents'
    ]

    requiredTables.forEach(tableName => {
      it(`should have ${tableName} table`, async () => {
        const { error } = await adminClient
          .from(tableName)
          .select('count', { count: 'exact', head: true })
        
        expect(error).toBeNull()
      })
    })
  })

  describe('RLS Functions Exist', () => {
    it('should have encryption functions', async () => {
      const { data, error } = await adminClient
        .rpc('encrypt_pii', { plaintext: 'test@example.com' })
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should have user context functions', async () => {
      // Test that we can set user context
      const testAuthId = crypto.randomUUID()
      
      await expect(setUserContext(testAuthId)).resolves.not.toThrow()
      await expect(clearUserContext()).resolves.not.toThrow()
    })
  })

  describe('Test User Creation', () => {
    it('should create test users successfully', async () => {
      const user = await createTestUser({
        email: 'setup.test@example.com',
        displayName: 'Setup Test User'
      })
      
      expect(user.id).toBeDefined()
      expect(user.authId).toBeDefined()
      expect(user.email).toBe('setup.test@example.com')
      expect(user.displayName).toBe('Setup Test User')
      
      // Verify user exists in database
      const { data: userRecord } = await adminClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      expect(userRecord).toBeDefined()
      expect(userRecord.id).toBe(user.id)
    })
  })

  describe('RLS Policy Enforcement', () => {
    it('should enforce RLS policies', async () => {
      // Create a test user
      const user = await createTestUser({
        email: 'rls.test@example.com',
        displayName: 'RLS Test User'
      })
      
      // Without user context, should not see any users
      await clearUserContext()
      
      const { data: noContextData } = await adminClient
        .from('users')
        .select('*')
        .eq('id', user.id)
      
      expect(noContextData).toEqual([])
      
      // With user context, should see own user
      await setUserContext(user.authId)
      
      const { data: withContextData } = await adminClient
        .from('users')
        .select('*')
        .eq('id', user.id)
      
      expect(withContextData).toHaveLength(1)
      expect(withContextData[0].id).toBe(user.id)
    })
  })

  describe('Cleanup Functionality', () => {
    it('should clean up test data properly', async () => {
      const user = await createTestUser({
        email: 'cleanup.test@example.com',
        displayName: 'Cleanup Test User'
      })
      
      // Verify user exists
      const { data: beforeCleanup } = await adminClient
        .from('users')
        .select('*')
        .eq('id', user.id)
      
      expect(beforeCleanup).toHaveLength(1)
      
      // Delete the user (normally done by test cleanup)
      await adminClient.auth.admin.deleteUser(user.authId)
      await adminClient.from('users').delete().eq('id', user.id)
      
      // Verify user is gone
      const { data: afterCleanup } = await adminClient
        .from('users')
        .select('*')
        .eq('id', user.id)
      
      expect(afterCleanup).toHaveLength(0)
    })
  })
})