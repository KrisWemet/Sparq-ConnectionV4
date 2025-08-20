#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testAuthFlow() {
  console.log('🔐 Testing Complete Authentication Flow...\n')
  
  const testEmail = 'test@sparqconnection.local'
  const testPassword = 'TestPassword123!'
  
  try {
    // 1. Clean up any existing test user
    console.log('1. Cleaning up any existing test user...')
    try {
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers.users.find(u => u.email === testEmail)
      if (existingUser) {
        await supabase.auth.admin.deleteUser(existingUser.id)
        console.log('✅ Cleaned up existing test user')
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    
    // 2. Test user registration
    console.log('\n2. Testing user registration...')
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    })
    
    if (signUpError) {
      console.error('❌ Registration failed:', signUpError.message)
      return false
    }
    
    console.log('✅ User registration successful')
    const userId = signUpData.user.id
    
    // 3. Test creating user profile with encryption
    console.log('\n3. Testing encrypted user profile creation...')
    
    // First encrypt the email
    const { data: encryptedEmail, error: encryptError } = await supabase
      .rpc('encrypt_pii', { plaintext: testEmail })
    
    if (encryptError) {
      console.error('❌ Email encryption failed:', encryptError.message)
      return false
    }
    
    // Insert user record
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .insert({
        auth_id: userId,
        email_encrypted: encryptedEmail,
        display_name: 'Test User',
        safety_monitoring_enabled: true
      })
      .select()
    
    if (profileError) {
      console.error('❌ Profile creation failed:', profileError.message)
      return false
    }
    
    console.log('✅ Encrypted user profile created')
    
    // 4. Test user preferences creation
    console.log('\n4. Testing user preferences creation...')
    const { error: prefsError } = await supabase
      .from('user_preferences')
      .insert({
        user_id: userProfile[0].id,
        email_notifications: true,
        push_notifications: true,
        crisis_detection_sensitivity: 'medium'
      })
    
    if (prefsError) {
      console.error('❌ Preferences creation failed:', prefsError.message)
      return false
    }
    
    console.log('✅ User preferences created')
    
    // 5. Test safety profile creation
    console.log('\n5. Testing safety profile creation...')
    const { error: safetyError } = await supabase
      .from('user_safety_profile')
      .insert({
        user_id: userProfile[0].id,
        baseline_wellness_score: 0.8,
        monitoring_consent_level: 'basic',
        auto_intervention_consent: false,
        partner_notification_consent: false
      })
    
    if (safetyError) {
      console.error('❌ Safety profile creation failed:', safetyError.message)
      return false
    }
    
    console.log('✅ Safety profile created')
    
    // 6. Test user login
    console.log('\n6. Testing user login...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })
    
    if (signInError) {
      console.error('❌ Login failed:', signInError.message)
      return false
    }
    
    console.log('✅ User login successful')
    
    // 7. Test fetching user data
    console.log('\n7. Testing user data retrieval...')
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select(`
        *,
        user_preferences(*),
        user_safety_profile(*)
      `)
      .eq('auth_id', userId)
      .single()
    
    if (fetchError) {
      console.error('❌ User data fetch failed:', fetchError.message)
      return false
    }
    
    console.log('✅ User data retrieved successfully')
    console.log(`   - User ID: ${userData.id}`)
    console.log(`   - Display name: ${userData.display_name}`)
    console.log(`   - Preferences set: ${userData.user_preferences ? 'Yes' : 'No'}`)
    console.log(`   - Safety profile set: ${userData.user_safety_profile ? 'Yes' : 'No'}`)
    
    // 8. Test RLS policies
    console.log('\n8. Testing Row Level Security...')
    
    // Create a client without admin privileges
    const publicClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    // This should fail without authentication
    const { data: restrictedData, error: rlsError } = await publicClient
      .from('users')
      .select('*')
    
    if (rlsError || !restrictedData || restrictedData.length === 0) {
      console.log('✅ RLS is working (unauthenticated access blocked)')
    } else {
      console.log('⚠️  RLS might not be properly configured')
    }
    
    // 9. Cleanup
    console.log('\n9. Cleaning up test data...')
    await supabase.auth.admin.deleteUser(userId)
    console.log('✅ Test user cleaned up')
    
    console.log('\n🎉 Authentication flow test completed successfully!')
    return true
    
  } catch (error) {
    console.error('❌ Authentication flow test failed:', error.message)
    return false
  }
}

testAuthFlow().then(success => {
  process.exit(success ? 0 : 1)
})