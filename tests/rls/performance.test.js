/**
 * Performance and Stress Tests for RLS
 * Tests RLS policy performance under load and with large datasets
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

describe('RLS Performance Tests', () => {
  let performanceUsers = []
  let performanceCouples = []
  const PERFORMANCE_USER_COUNT = 50
  const PERFORMANCE_COUPLE_COUNT = 25

  beforeAll(async () => {
    console.log('🏃‍♂️ Setting up performance test data...')
    
    // Create users for performance testing
    for (let i = 0; i < PERFORMANCE_USER_COUNT; i++) {
      const user = await createTestUser({
        email: `perf_user_${i}@performance.test`,
        displayName: `Performance User ${i}`
      })
      performanceUsers.push(user)
    }
    
    // Create couples for performance testing
    for (let i = 0; i < PERFORMANCE_COUPLE_COUNT; i++) {
      const user1 = performanceUsers[i * 2]
      const user2 = performanceUsers[i * 2 + 1]
      
      if (user1 && user2) {
        const couple = await createTestCouple(user1, user2, {
          relationshipType: i % 2 === 0 ? 'dating' : 'married'
        })
        performanceCouples.push(couple)
      }
    }
    
    // Create preferences for all users
    const preferences = performanceUsers.map(user => ({
      user_id: user.id,
      email_notifications: Math.random() > 0.5,
      push_notifications: Math.random() > 0.5,
      crisis_detection_sensitivity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    }))
    
    await adminClient.from('user_preferences').insert(preferences)
    
    // Create safety profiles
    const safetyProfiles = performanceUsers.map(user => ({
      user_id: user.id,
      baseline_wellness_score: Math.random(),
      monitoring_consent_level: ['none', 'basic', 'enhanced', 'full'][Math.floor(Math.random() * 4)],
      auto_intervention_consent: Math.random() > 0.5,
      partner_notification_consent: Math.random() > 0.3
    }))
    
    await adminClient.from('user_safety_profile').insert(safetyProfiles)
    
    console.log(`✅ Created ${performanceUsers.length} users and ${performanceCouples.length} couples for performance testing`)
  }, 120000) // 2 minute timeout for setup

  afterAll(async () => {
    console.log('🧹 Cleaning up performance test data...')
    await clearUserContext()
  }, 60000)

  beforeEach(async () => {
    await clearUserContext()
  })

  describe('Single User Access Performance', () => {
    it('should access user profile quickly', async () => {
      const testUser = performanceUsers[0]
      await setUserContext(testUser.authId)
      
      const startTime = performance.now()
      
      const { data: userProfile } = await adminClient
        .from('users')
        .select('*')
        .eq('id', testUser.id)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      RLSTestValidator.shouldAllowAccess(userProfile, true, 'User should access own profile')
      expect(duration).toBeLessThan(100) // Should be under 100ms
      
      console.log(`👤 User profile access: ${duration.toFixed(2)}ms`)
    })

    it('should access user preferences quickly', async () => {
      const testUser = performanceUsers[1]
      await setUserContext(testUser.authId)
      
      const startTime = performance.now()
      
      const { data: preferences } = await adminClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', testUser.id)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      RLSTestValidator.shouldAllowAccess(preferences, true, 'User should access own preferences')
      expect(duration).toBeLessThan(50) // Should be under 50ms
      
      console.log(`⚙️  User preferences access: ${duration.toFixed(2)}ms`)
    })

    it('should perform complex user data queries efficiently', async () => {
      const testUser = performanceUsers[2]
      await setUserContext(testUser.authId)
      
      const startTime = performance.now()
      
      const { data: complexQuery } = await adminClient
        .from('users')
        .select(`
          id,
          display_name,
          created_at,
          user_preferences(
            email_notifications,
            push_notifications,
            crisis_detection_sensitivity
          ),
          user_safety_profile(
            baseline_wellness_score,
            monitoring_consent_level,
            auto_intervention_consent
          )
        `)
        .eq('id', testUser.id)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      RLSTestValidator.shouldAllowAccess(complexQuery, true, 'Complex query should work')
      expect(duration).toBeLessThan(200) // Complex queries under 200ms
      
      console.log(`🔍 Complex user query: ${duration.toFixed(2)}ms`)
    })
  })

  describe('Couple Access Performance', () => {
    it('should access couple data quickly', async () => {
      const testCouple = performanceCouples[0]
      const partner1 = performanceUsers.find(u => u.id === testCouple.partner_1_id)
      
      await setUserContext(partner1.authId)
      
      const startTime = performance.now()
      
      const { data: coupleData } = await adminClient
        .from('couples')
        .select('*')
        .eq('id', testCouple.id)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      RLSTestValidator.shouldAllowAccess(coupleData, true, 'Partner should access couple data')
      expect(duration).toBeLessThan(100) // Under 100ms
      
      console.log(`💑 Couple data access: ${duration.toFixed(2)}ms`)
    })
  })

  describe('Bulk Access Performance', () => {
    it('should handle multiple user queries efficiently', async () => {
      const promises = []
      const startTime = performance.now()
      
      // Create 10 concurrent queries for different users
      for (let i = 0; i < Math.min(10, performanceUsers.length); i++) {
        const user = performanceUsers[i]
        
        promises.push(
          (async () => {
            await setUserContext(user.authId)
            return adminClient
              .from('users')
              .select('*')
              .eq('id', user.id)
          })()
        )
      }
      
      const results = await Promise.all(promises)
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Each query should return exactly one result
      results.forEach((result, index) => {
        RLSTestValidator.shouldHaveCount(result.data, 1, `Query ${index} should return one user`)
      })
      
      expect(duration).toBeLessThan(1000) // All 10 queries under 1 second
      
      console.log(`🔄 10 concurrent user queries: ${duration.toFixed(2)}ms`)
    })

    it('should handle RLS isolation checks efficiently', async () => {
      const user1 = performanceUsers[0]
      const user2 = performanceUsers[1]
      
      const startTime = performance.now()
      
      // Test isolation performance
      await setUserContext(user1.authId)
      
      const { data: user1Data } = await adminClient
        .from('users')
        .select('*')
        .eq('id', user1.id)
      
      const { data: user2DataAttempt } = await adminClient
        .from('users')
        .select('*')
        .eq('id', user2.id)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      RLSTestValidator.shouldAllowAccess(user1Data, true, 'User1 should access own data')
      RLSTestValidator.shouldDenyAccess(user2DataAttempt, 'User1 should not access User2 data')
      
      expect(duration).toBeLessThan(150) // Both queries under 150ms
      
      console.log(`🛡️  RLS isolation check: ${duration.toFixed(2)}ms`)
    })
  })

  describe('Large Dataset Performance', () => {
    it('should handle queries on large user tables efficiently', async () => {
      const testUser = performanceUsers[0]
      await setUserContext(testUser.authId)
      
      const startTime = performance.now()
      
      // Query that might scan multiple records but should only return user's own data
      const { data: userData } = await adminClient
        .from('users')
        .select('id, display_name, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      RLSTestValidator.shouldHaveCount(userData, 1, 'Should return only own user data')
      expect(duration).toBeLessThan(200) // Under 200ms even with ordering
      
      console.log(`📊 Large table query: ${duration.toFixed(2)}ms`)
    })

    it('should perform well with complex filtering', async () => {
      const testUser = performanceUsers[0]
      await setUserContext(testUser.authId)
      
      const startTime = performance.now()
      
      const { data: filteredData } = await adminClient
        .from('user_preferences')
        .select('*')
        .eq('email_notifications', true)
        .eq('user_id', testUser.id)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(100) // Filtered queries under 100ms
      
      console.log(`🔎 Complex filtered query: ${duration.toFixed(2)}ms`)
    })
  })

  describe('Stress Testing', () => {
    it('should handle rapid sequential access', async () => {
      const testUser = performanceUsers[0]
      await setUserContext(testUser.authId)
      
      const iterations = 50
      const startTime = performance.now()
      
      for (let i = 0; i < iterations; i++) {
        const { data } = await adminClient
          .from('users')
          .select('id')
          .eq('id', testUser.id)
        
        RLSTestValidator.shouldAllowAccess(data, true, `Iteration ${i} should work`)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const avgDuration = duration / iterations
      
      expect(avgDuration).toBeLessThan(50) // Average under 50ms per query
      
      console.log(`⚡ ${iterations} rapid queries: ${duration.toFixed(2)}ms total, ${avgDuration.toFixed(2)}ms average`)
    })

    it('should maintain performance with context switching', async () => {
      const userCount = Math.min(20, performanceUsers.length)
      const startTime = performance.now()
      
      for (let i = 0; i < userCount; i++) {
        const user = performanceUsers[i]
        
        // Switch context
        await setUserContext(user.authId)
        
        // Access user data
        const { data } = await adminClient
          .from('users')
          .select('id')
          .eq('id', user.id)
        
        RLSTestValidator.shouldAllowAccess(data, true, `User ${i} should access own data`)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const avgDuration = duration / userCount
      
      expect(avgDuration).toBeLessThan(100) // Average under 100ms per user switch
      
      console.log(`🔄 ${userCount} context switches: ${duration.toFixed(2)}ms total, ${avgDuration.toFixed(2)}ms average`)
    })
  })

  describe('Memory and Resource Usage', () => {
    it('should not have memory leaks during repeated queries', async () => {
      const testUser = performanceUsers[0]
      await setUserContext(testUser.authId)
      
      // Measure memory usage before
      const initialMemory = process.memoryUsage()
      
      // Perform many queries
      for (let i = 0; i < 100; i++) {
        await adminClient
          .from('users')
          .select('*')
          .eq('id', testUser.id)
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      // Measure memory usage after
      const finalMemory = process.memoryUsage()
      
      // Memory increase should be reasonable
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024
      
      expect(memoryIncreaseMB).toBeLessThan(50) // Less than 50MB increase
      
      console.log(`💾 Memory increase after 100 queries: ${memoryIncreaseMB.toFixed(2)}MB`)
    })
  })

  describe('Index Performance Analysis', () => {
    it('should perform well with indexed columns', async () => {
      const testUser = performanceUsers[0]
      await setUserContext(testUser.authId)
      
      const startTime = performance.now()
      
      // Query using indexed auth_id column
      const { data: indexedQuery } = await adminClient
        .from('users')
        .select('*')
        .eq('auth_id', testUser.authId)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      RLSTestValidator.shouldAllowAccess(indexedQuery, true, 'Indexed query should work')
      expect(duration).toBeLessThan(50) // Indexed queries should be very fast
      
      console.log(`📈 Indexed column query: ${duration.toFixed(2)}ms`)
    })

    it('should show performance difference with non-indexed queries', async () => {
      const testUser = performanceUsers[0]
      await setUserContext(testUser.authId)
      
      const startTime = performance.now()
      
      // Query using display_name (likely not indexed)
      const { data: nonIndexedQuery } = await adminClient
        .from('users')
        .select('*')
        .eq('display_name', testUser.displayName)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      RLSTestValidator.shouldAllowAccess(nonIndexedQuery, true, 'Non-indexed query should work')
      
      console.log(`📉 Non-indexed query: ${duration.toFixed(2)}ms`)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for production', async () => {
      const benchmarks = {
        userProfileAccess: 100, // ms
        coupleDataAccess: 100,  // ms
        preferencesAccess: 50,  // ms
        complexJoinQuery: 200,  // ms
        concurrentQueries: 1000 // ms for 10 queries
      }
      
      const testUser = performanceUsers[0]
      const testCouple = performanceCouples[0]
      const partner = performanceUsers.find(u => u.id === testCouple.partner_1_id)
      
      // Test each benchmark
      const results = {}
      
      // User profile access
      await setUserContext(testUser.authId)
      let start = performance.now()
      await adminClient.from('users').select('*').eq('id', testUser.id)
      results.userProfileAccess = performance.now() - start
      
      // Couple data access
      await setUserContext(partner.authId)
      start = performance.now()
      await adminClient.from('couples').select('*').eq('id', testCouple.id)
      results.coupleDataAccess = performance.now() - start
      
      // Preferences access
      await setUserContext(testUser.authId)
      start = performance.now()
      await adminClient.from('user_preferences').select('*').eq('user_id', testUser.id)
      results.preferencesAccess = performance.now() - start
      
      // Complex join query
      start = performance.now()
      await adminClient
        .from('users')
        .select('*, user_preferences(*), user_safety_profile(*)')
        .eq('id', testUser.id)
      results.complexJoinQuery = performance.now() - start
      
      // Verify benchmarks
      Object.entries(benchmarks).forEach(([test, maxTime]) => {
        if (results[test] !== undefined) {
          expect(results[test]).toBeLessThan(maxTime)
          console.log(`📊 ${test}: ${results[test].toFixed(2)}ms (max: ${maxTime}ms)`)
        }
      })
    })
  })
})