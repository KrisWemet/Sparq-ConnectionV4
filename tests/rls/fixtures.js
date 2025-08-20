/**
 * RLS Test Fixtures
 * Pre-configured test data scenarios for comprehensive RLS testing
 */

import { createTestUser, createTestCouple, adminClient } from './setup.js'

/**
 * Standard test fixtures for consistent testing
 */
export class RLSTestFixtures {
  constructor() {
    this.users = {}
    this.couples = {}
    this.createdRecords = {
      users: [],
      couples: [],
      preferences: [],
      safetyProfiles: [],
      assessmentResponses: [],
      communications: [],
      safetySignals: []
    }
  }

  /**
   * Create a complete test scenario with multiple couples
   */
  async createMultiCoupleScenario() {
    // Create 6 users for complex relationship scenarios
    this.users.alice = await createTestUser({
      email: 'alice.rls.test@example.com',
      displayName: 'Alice Test'
    })
    
    this.users.bob = await createTestUser({
      email: 'bob.rls.test@example.com',
      displayName: 'Bob Test'
    })
    
    this.users.charlie = await createTestUser({
      email: 'charlie.rls.test@example.com',
      displayName: 'Charlie Test'
    })
    
    this.users.diana = await createTestUser({
      email: 'diana.rls.test@example.com',
      displayName: 'Diana Test'
    })
    
    this.users.eve = await createTestUser({
      email: 'eve.rls.test@example.com',
      displayName: 'Eve Test'
    })
    
    this.users.frank = await createTestUser({
      email: 'frank.rls.test@example.com',
      displayName: 'Frank Test'
    })
    
    // Create couples: Alice-Bob, Charlie-Diana, Eve is single, Frank is single
    this.couples.aliceBob = await createTestCouple(this.users.alice, this.users.bob, {
      relationshipType: 'dating'
    })
    
    this.couples.charlieDiana = await createTestCouple(this.users.charlie, this.users.diana, {
      relationshipType: 'married'
    })
    
    // Create user preferences for each user
    await this.createUserPreferences()
    
    // Create safety profiles
    await this.createSafetyProfiles()
    
    // Create some test communications
    await this.createTestCommunications()
    
    return {
      users: this.users,
      couples: this.couples
    }
  }

  /**
   * Create user preferences for all test users
   */
  async createUserPreferences() {
    const preferences = [
      {
        user_id: this.users.alice.id,
        email_notifications: true,
        push_notifications: true,
        crisis_detection_sensitivity: 'medium'
      },
      {
        user_id: this.users.bob.id,
        email_notifications: false,
        push_notifications: true,
        crisis_detection_sensitivity: 'high'
      },
      {
        user_id: this.users.charlie.id,
        email_notifications: true,
        push_notifications: false,
        crisis_detection_sensitivity: 'low'
      },
      {
        user_id: this.users.diana.id,
        email_notifications: true,
        push_notifications: true,
        crisis_detection_sensitivity: 'medium'
      },
      {
        user_id: this.users.eve.id,
        email_notifications: false,
        push_notifications: false,
        crisis_detection_sensitivity: 'high'
      },
      {
        user_id: this.users.frank.id,
        email_notifications: true,
        push_notifications: true,
        crisis_detection_sensitivity: 'medium'
      }
    ]
    
    for (const pref of preferences) {
      const { data, error } = await adminClient
        .from('user_preferences')
        .insert(pref)
        .select()
      
      if (error) throw error
      this.createdRecords.preferences.push(data[0])
    }
  }

  /**
   * Create safety profiles for test users
   */
  async createSafetyProfiles() {
    const safetyProfiles = [
      {
        user_id: this.users.alice.id,
        baseline_wellness_score: 0.8,
        monitoring_consent_level: 'basic',
        auto_intervention_consent: false,
        partner_notification_consent: false
      },
      {
        user_id: this.users.bob.id,
        baseline_wellness_score: 0.7,
        monitoring_consent_level: 'enhanced',
        auto_intervention_consent: true,
        partner_notification_consent: false
      },
      {
        user_id: this.users.charlie.id,
        baseline_wellness_score: 0.9,
        monitoring_consent_level: 'basic',
        auto_intervention_consent: false,
        partner_notification_consent: true
      },
      {
        user_id: this.users.diana.id,
        baseline_wellness_score: 0.75,
        monitoring_consent_level: 'enhanced',
        auto_intervention_consent: true,
        partner_notification_consent: true
      },
      {
        user_id: this.users.eve.id,
        baseline_wellness_score: 0.6,
        monitoring_consent_level: 'full',
        auto_intervention_consent: true,
        partner_notification_consent: false
      },
      {
        user_id: this.users.frank.id,
        baseline_wellness_score: 0.85,
        monitoring_consent_level: 'none',
        auto_intervention_consent: false,
        partner_notification_consent: false
      }
    ]
    
    for (const profile of safetyProfiles) {
      const { data, error } = await adminClient
        .from('user_safety_profile')
        .insert(profile)
        .select()
      
      if (error) throw error
      this.createdRecords.safetyProfiles.push(data[0])
    }
  }

  /**
   * Create test communications between couples
   */
  async createTestCommunications() {
    const communications = [
      {
        couple_id: this.couples.aliceBob.id,
        sender_user_id: this.users.alice.id,
        content_encrypted: await this.encryptContent('Hello Bob, how was your day?'),
        message_type: 'free_form'
      },
      {
        couple_id: this.couples.aliceBob.id,
        sender_user_id: this.users.bob.id,
        content_encrypted: await this.encryptContent('Great! Looking forward to dinner tonight.'),
        message_type: 'free_form'
      },
      {
        couple_id: this.couples.charlieDiana.id,
        sender_user_id: this.users.charlie.id,
        content_encrypted: await this.encryptContent('I love you Diana'),
        message_type: 'appreciation'
      },
      {
        couple_id: this.couples.charlieDiana.id,
        sender_user_id: this.users.diana.id,
        content_encrypted: await this.encryptContent('Love you too Charlie!'),
        message_type: 'appreciation'
      }
    ]
    
    for (const comm of communications) {
      const { data, error } = await adminClient
        .from('communication_history')
        .insert(comm)
        .select()
      
      if (error) throw error
      this.createdRecords.communications.push(data[0])
    }
  }

  /**
   * Create assessment responses for users
   */
  async createAssessmentResponses() {
    // Get a measure ID from existing self-report measures
    const { data: measures } = await adminClient
      .from('self_report_measures')
      .select('id')
      .limit(1)
    
    if (!measures || measures.length === 0) return
    
    const measureId = measures[0].id
    
    const responses = [
      {
        user_id: this.users.alice.id,
        couple_id: this.couples.aliceBob.id,
        measure_id: measureId,
        assessment_session_id: crypto.randomUUID(),
        question_id: 'ras1',
        question_text_hash: 'hash_ras1',
        response_value: { score: 4 },
        sharing_consent: true
      },
      {
        user_id: this.users.bob.id,
        couple_id: this.couples.aliceBob.id,
        measure_id: measureId,
        assessment_session_id: crypto.randomUUID(),
        question_id: 'ras1',
        question_text_hash: 'hash_ras1',
        response_value: { score: 5 },
        sharing_consent: false // Bob keeps this private
      },
      {
        user_id: this.users.charlie.id,
        couple_id: this.couples.charlieDiana.id,
        measure_id: measureId,
        assessment_session_id: crypto.randomUUID(),
        question_id: 'ras1',
        question_text_hash: 'hash_ras1',
        response_value: { score: 5 },
        sharing_consent: true
      }
    ]
    
    for (const response of responses) {
      const { data, error } = await adminClient
        .from('assessment_responses')
        .insert(response)
        .select()
      
      if (error) throw error
      this.createdRecords.assessmentResponses.push(data[0])
    }
  }

  /**
   * Create safety risk signals for testing
   */
  async createSafetySignals() {
    const signals = [
      {
        user_id: this.users.eve.id,
        signal_source: 'communication_analysis',
        signal_type: 'emotional_distress',
        risk_level: 'medium',
        confidence_score: 0.75,
        detected_indicators: ['stress', 'anxiety']
      },
      {
        user_id: this.users.alice.id,
        signal_source: 'assessment_response',
        signal_type: 'relationship_stress',
        risk_level: 'low',
        confidence_score: 0.6,
        detected_indicators: ['communication_issues']
      }
    ]
    
    for (const signal of signals) {
      const { data, error } = await adminClient
        .from('safety_risk_signals')
        .insert(signal)
        .select()
      
      if (error) throw error
      this.createdRecords.safetySignals.push(data[0])
    }
  }

  /**
   * Create edge case scenarios
   */
  async createEdgeCaseScenarios() {
    // Create an inactive user
    this.users.inactive = await createTestUser({
      email: 'inactive.rls.test@example.com',
      displayName: 'Inactive User',
      isActive: false
    })
    
    // Create an inactive couple
    this.couples.inactive = await createTestCouple(this.users.eve, this.users.frank, {
      relationshipType: 'dating',
      isActive: false
    })
    
    // Create a user with no safety profile
    this.users.noSafety = await createTestUser({
      email: 'nosafety.rls.test@example.com',
      displayName: 'No Safety Profile User'
    })
    
    return {
      inactiveUser: this.users.inactive,
      inactiveCouple: this.couples.inactive,
      noSafetyUser: this.users.noSafety
    }
  }

  /**
   * Helper to encrypt content for communications
   */
  async encryptContent(plaintext) {
    const { data, error } = await adminClient
      .rpc('encrypt_communication', { content: plaintext })
    
    if (error) {
      // If encryption function doesn't exist, return plaintext for testing
      return plaintext
    }
    
    return data
  }

  /**
   * Clean up all fixture data
   */
  async cleanup() {
    // Delete in reverse order to handle foreign keys
    const deleteOperations = [
      { table: 'assessment_responses', records: this.createdRecords.assessmentResponses },
      { table: 'communication_history', records: this.createdRecords.communications },
      { table: 'safety_risk_signals', records: this.createdRecords.safetySignals },
      { table: 'user_preferences', records: this.createdRecords.preferences },
      { table: 'user_safety_profile', records: this.createdRecords.safetyProfiles }
    ]
    
    for (const operation of deleteOperations) {
      if (operation.records.length > 0) {
        const ids = operation.records.map(r => r.id)
        await adminClient
          .from(operation.table)
          .delete()
          .in('id', ids)
      }
    }
    
    // Clear the created records
    Object.keys(this.createdRecords).forEach(key => {
      this.createdRecords[key] = []
    })
  }
}

/**
 * Quick fixture generators for specific test scenarios
 */
export class QuickFixtures {
  /**
   * Create a simple couple for basic testing
   */
  static async createSimpleCouple() {
    const user1 = await createTestUser({
      email: 'simple1.rls.test@example.com',
      displayName: 'Simple User 1'
    })
    
    const user2 = await createTestUser({
      email: 'simple2.rls.test@example.com', 
      displayName: 'Simple User 2'
    })
    
    const couple = await createTestCouple(user1, user2)
    
    return { user1, user2, couple }
  }

  /**
   * Create isolated users (not in any couple)
   */
  static async createIsolatedUsers(count = 2) {
    const users = []
    
    for (let i = 0; i < count; i++) {
      const user = await createTestUser({
        email: `isolated${i}.rls.test@example.com`,
        displayName: `Isolated User ${i + 1}`
      })
      users.push(user)
    }
    
    return users
  }

  /**
   * Create a user with specific privacy settings
   */
  static async createPrivacyTestUser(privacySettings = {}) {
    const user = await createTestUser({
      email: 'privacy.rls.test@example.com',
      displayName: 'Privacy Test User'
    })
    
    // Create privacy preferences
    const defaultSettings = {
      user_id: user.id,
      data_sharing_research: false,
      anonymous_usage_analytics: false,
      profile_visibility: 'private',
      ...privacySettings
    }
    
    await adminClient
      .from('user_preferences')
      .insert(defaultSettings)
    
    return user
  }

  /**
   * Create a crisis scenario user
   */
  static async createCrisisUser() {
    const user = await createTestUser({
      email: 'crisis.rls.test@example.com',
      displayName: 'Crisis Test User'
    })
    
    // Create high-risk safety signal
    await adminClient
      .from('safety_risk_signals')
      .insert({
        user_id: user.id,
        signal_source: 'communication_analysis',
        signal_type: 'suicidal_ideation',
        risk_level: 'critical',
        confidence_score: 0.95,
        detected_indicators: ['self_harm', 'suicidal_thoughts']
      })
    
    return user
  }
}

/**
 * Test data validation helpers
 */
export class TestDataValidator {
  /**
   * Validate that fixtures were created correctly
   */
  static async validateFixtures(fixtures) {
    const validation = {
      users: Object.keys(fixtures.users).length,
      couples: Object.keys(fixtures.couples).length,
      errors: []
    }
    
    // Check that all users have IDs
    for (const [name, user] of Object.entries(fixtures.users)) {
      if (!user.id || !user.authId) {
        validation.errors.push(`User ${name} missing required fields`)
      }
    }
    
    // Check that all couples have valid partner IDs
    for (const [name, couple] of Object.entries(fixtures.couples)) {
      if (!couple.partner_1_id || !couple.partner_2_id) {
        validation.errors.push(`Couple ${name} missing partner IDs`)
      }
    }
    
    return validation
  }

  /**
   * Verify RLS is working by checking data isolation
   */
  static async verifyBasicIsolation(user1, user2) {
    // Set context to user1
    await adminClient.rpc('set_config', {
      setting_name: 'request.jwt.claim.sub',
      new_value: user1.authId,
      is_local: true
    })
    
    // Try to access user2's data - should fail
    const { data: user2Data } = await adminClient
      .from('users')
      .select('*')
      .eq('id', user2.id)
    
    return {
      canAccessOtherUser: user2Data && user2Data.length > 0,
      message: user2Data && user2Data.length > 0 
        ? 'SECURITY BREACH: User can access other user data' 
        : 'RLS working correctly'
    }
  }
}