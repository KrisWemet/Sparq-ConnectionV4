/**
 * RLS Test Environment Setup
 * Sets up test database connection and utilities for RLS testing
 */

import { createClient } from '@supabase/supabase-js'
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// Test environment configuration
export const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  testPrefix: 'rls_test_',
  timeout: 30000 // 30 seconds for RLS tests
}

// Database clients for different permission levels
export let adminClient
export let anonClient
export let serviceClient

// Test user registry to track created users for cleanup
export const testUsers = new Map()
export const testCouples = new Map()

/**
 * Initialize test environment
 */
export async function setupTestEnvironment() {
  // Create admin client (service role)
  adminClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseServiceKey)
  
  // Create anonymous client (anon key)
  anonClient = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey)
  
  // Service client (same as admin for our tests)
  serviceClient = adminClient
  
  console.log('🔧 RLS Test environment initialized')
}

/**
 * Clean up test environment
 */
export async function teardownTestEnvironment() {
  // Clean up all test users and couples
  await cleanupAllTestData()
  console.log('🧹 RLS Test environment cleaned up')
}

/**
 * Clean up all test data
 */
export async function cleanupAllTestData() {
  try {
    // Delete test couples first (foreign key constraints)
    const coupleIds = Array.from(testCouples.keys())
    if (coupleIds.length > 0) {
      await adminClient
        .from('couples')
        .delete()
        .in('id', coupleIds)
    }
    
    // Delete test users from our tables
    const userIds = Array.from(testUsers.keys())
    if (userIds.length > 0) {
      // Delete related records first
      await adminClient.from('user_preferences').delete().in('user_id', userIds)
      await adminClient.from('user_safety_profile').delete().in('user_id', userIds)
      await adminClient.from('user_archetypes').delete().in('user_id', userIds)
      await adminClient.from('assessment_responses').delete().in('user_id', userIds)
      await adminClient.from('communication_history').delete().in('sender_user_id', userIds)
      await adminClient.from('safety_risk_signals').delete().in('user_id', userIds)
      await adminClient.from('user_consents').delete().in('user_id', userIds)
      await adminClient.from('audit_log').delete().in('user_id', userIds)
      
      // Delete users last
      await adminClient.from('users').delete().in('id', userIds)
    }
    
    // Delete auth users
    for (const [userId, userData] of testUsers) {
      if (userData.authId) {
        try {
          await adminClient.auth.admin.deleteUser(userData.authId)
        } catch (error) {
          // Ignore auth deletion errors (user might not exist)
        }
      }
    }
    
    // Clear registries
    testUsers.clear()
    testCouples.clear()
    
  } catch (error) {
    console.warn('⚠️  Error during test cleanup:', error.message)
  }
}

/**
 * Create a test user with encrypted data
 */
export async function createTestUser(userData = {}) {
  const defaultData = {
    email: `${TEST_CONFIG.testPrefix}${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
    displayName: `Test User ${Date.now()}`,
    password: 'TestPassword123!',
    isActive: true,
    safetyMonitoringEnabled: true
  }
  
  const user = { ...defaultData, ...userData }
  
  try {
    // Create auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true
    })
    
    if (authError) throw authError
    
    // Encrypt email for database storage
    const { data: encryptedEmail, error: encryptError } = await adminClient
      .rpc('encrypt_pii', { plaintext: user.email })
    
    if (encryptError) throw encryptError
    
    // Create user profile
    const { data: userProfile, error: profileError } = await adminClient
      .from('users')
      .insert({
        auth_id: authUser.user.id,
        email_encrypted: encryptedEmail,
        display_name: user.displayName,
        is_active: user.isActive,
        safety_monitoring_enabled: user.safetyMonitoringEnabled
      })
      .select()
      .single()
    
    if (profileError) throw profileError
    
    // Register for cleanup
    testUsers.set(userProfile.id, {
      authId: authUser.user.id,
      email: user.email,
      displayName: user.displayName
    })
    
    return {
      id: userProfile.id,
      authId: authUser.user.id,
      email: user.email,
      displayName: user.displayName,
      profile: userProfile
    }
    
  } catch (error) {
    console.error('Failed to create test user:', error)
    throw error
  }
}

/**
 * Create a test couple
 */
export async function createTestCouple(partner1, partner2, coupleData = {}) {
  const defaultData = {
    relationshipType: 'dating',
    isActive: true,
    relationshipStartDate: '2024-01-01'
  }
  
  const couple = { ...defaultData, ...coupleData }
  
  try {
    const { data: coupleRecord, error } = await adminClient
      .from('couples')
      .insert({
        partner_1_id: partner1.id,
        partner_2_id: partner2.id,
        relationship_type: couple.relationshipType,
        is_active: couple.isActive,
        relationship_start_date: couple.relationshipStartDate
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Register for cleanup
    testCouples.set(coupleRecord.id, {
      partner1Id: partner1.id,
      partner2Id: partner2.id
    })
    
    return coupleRecord
    
  } catch (error) {
    console.error('Failed to create test couple:', error)
    throw error
  }
}

/**
 * Create a client with specific user authentication
 */
export function createAuthenticatedClient(user) {
  const client = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseAnonKey)
  
  // Set the user session
  client.auth.setSession({
    access_token: generateMockJWT(user),
    refresh_token: 'mock_refresh_token'
  })
  
  return client
}

/**
 * Generate a mock JWT for testing (simplified for RLS testing)
 */
function generateMockJWT(user) {
  // In real implementation, this would be a proper JWT
  // For testing, we'll use the user's auth ID
  return `mock_jwt_${user.authId}`
}

/**
 * Set user context for RLS testing
 */
export async function setUserContext(authId) {
  await adminClient.rpc('set_config', {
    setting_name: 'request.jwt.claim.sub',
    new_value: authId,
    is_local: true
  })
}

/**
 * Clear user context
 */
export async function clearUserContext() {
  await adminClient.rpc('set_config', {
    setting_name: 'request.jwt.claim.sub', 
    new_value: '',
    is_local: true
  })
}

/**
 * Wait for a short period (useful for async operations)
 */
export function wait(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generate random test data
 */
export function generateTestData() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  
  return {
    email: `${TEST_CONFIG.testPrefix}${timestamp}_${random}@example.com`,
    displayName: `Test User ${timestamp}`,
    password: 'TestPassword123!',
    timestamp,
    random
  }
}

/**
 * Test result validator
 */
export class RLSTestValidator {
  static shouldAllowAccess(actual, expected = true, message = '') {
    if (expected) {
      if (!actual || actual.length === 0) {
        throw new Error(`Expected access to be allowed but was denied. ${message}`)
      }
    } else {
      if (actual && actual.length > 0) {
        throw new Error(`Expected access to be denied but was allowed. ${message}`)
      }
    }
  }
  
  static shouldDenyAccess(actual, message = '') {
    this.shouldAllowAccess(actual, false, message)
  }
  
  static shouldHaveCount(actual, expectedCount, message = '') {
    const actualCount = actual ? actual.length : 0
    if (actualCount !== expectedCount) {
      throw new Error(`Expected ${expectedCount} records but got ${actualCount}. ${message}`)
    }
  }
}

// Global test hooks
beforeAll(async () => {
  await setupTestEnvironment()
}, TEST_CONFIG.timeout)

afterAll(async () => {
  await teardownTestEnvironment()
}, TEST_CONFIG.timeout)

beforeEach(async () => {
  // Clear any previous user context
  await clearUserContext()
})

afterEach(async () => {
  // Clean up user context after each test
  await clearUserContext()
})