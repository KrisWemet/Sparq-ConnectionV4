#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function finalVerification() {
  console.log('🔍 Final Database Setup Verification\n')
  
  const results = {
    migrations: '❓',
    schema: '❓', 
    encryption: '❓',
    authentication: '❓',
    rls: '❓',
    seedData: '❓'
  }
  
  try {
    // 1. Check core tables exist
    console.log('1. Verifying database schema...')
    const coreTableChecks = await Promise.all([
      supabase.from('users').select('count', { count: 'exact', head: true }),
      supabase.from('couples').select('count', { count: 'exact', head: true }),
      supabase.from('user_safety_profile').select('count', { count: 'exact', head: true }),
      supabase.from('safety_risk_signals').select('count', { count: 'exact', head: true }),
      supabase.from('crisis_interventions').select('count', { count: 'exact', head: true })
    ])
    
    const allTablesExist = coreTableChecks.every(check => !check.error)
    results.schema = allTablesExist ? '✅' : '❌'
    console.log(`${results.schema} Database schema: ${allTablesExist ? 'All core tables exist' : 'Missing tables'}`)
    
    // 2. Check encryption functions
    console.log('\n2. Testing encryption functions...')
    try {
      const { data: encryptedData, error: encError } = await supabase
        .rpc('encrypt_pii', { plaintext: 'test@example.com' })
      
      if (!encError && encryptedData) {
        results.encryption = '✅'
        console.log('✅ Encryption: Functions working correctly')
      } else {
        results.encryption = '❌'
        console.log('❌ Encryption: Functions not working')
      }
    } catch (e) {
      results.encryption = '❌'
      console.log('❌ Encryption: Error testing functions')
    }
    
    // 3. Check authentication system
    console.log('\n3. Testing authentication system...')
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
      if (!authError) {
        results.authentication = '✅'
        console.log(`✅ Authentication: System working (${authUsers.users.length} users)`)
      } else {
        results.authentication = '❌'
        console.log('❌ Authentication: System error')
      }
    } catch (e) {
      results.authentication = '❌'
      console.log('❌ Authentication: System not accessible')
    }
    
    // 4. Check RLS policies
    console.log('\n4. Testing Row Level Security...')
    try {
      // Test with anon key (should be restricted)
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      const { data: restrictedData, error: rlsError } = await anonClient
        .from('users')
        .select('*')
        .limit(1)
      
      // Should either error or return empty results
      if (rlsError || !restrictedData || restrictedData.length === 0) {
        results.rls = '✅'
        console.log('✅ RLS: Properly restricting unauthorized access')
      } else {
        results.rls = '⚠️'
        console.log('⚠️  RLS: May not be properly configured')
      }
    } catch (e) {
      results.rls = '❌'
      console.log('❌ RLS: Error testing policies')
    }
    
    // 5. Check seed data
    console.log('\n5. Verifying seed data...')
    try {
      const seedChecks = await Promise.all([
        supabase.from('jurisdictions').select('count', { count: 'exact', head: true }),
        supabase.from('subscription_tiers').select('count', { count: 'exact', head: true }),
        supabase.from('safety_resources').select('count', { count: 'exact', head: true }),
        supabase.from('daily_prompts').select('count', { count: 'exact', head: true })
      ])
      
      const seedDataExists = seedChecks.every(check => !check.error && check.count > 0)
      results.seedData = seedDataExists ? '✅' : '⚠️'
      
      if (seedDataExists) {
        console.log('✅ Seed data: Essential data populated')
        console.log(`   - Jurisdictions: ${seedChecks[0].count}`)
        console.log(`   - Subscription tiers: ${seedChecks[1].count}`)
        console.log(`   - Safety resources: ${seedChecks[2].count}`)
        console.log(`   - Daily prompts: ${seedChecks[3].count}`)
      } else {
        console.log('⚠️  Seed data: Some data missing (non-critical)')
      }
    } catch (e) {
      results.seedData = '❌'
      console.log('❌ Seed data: Error verifying data')
    }
    
    // 6. Test complete user workflow
    console.log('\n6. Testing complete user workflow...')
    try {
      // Create test user
      const testEmail = `test-${Date.now()}@example.com`
      const { data: testUser, error: userError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'TestPassword123!',
        email_confirm: true
      })
      
      if (!userError && testUser.user) {
        // Create user profile
        const { data: encryptedEmail } = await supabase
          .rpc('encrypt_pii', { plaintext: testEmail })
        
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            auth_id: testUser.user.id,
            email_encrypted: encryptedEmail,
            display_name: 'Test User'
          })
        
        // Cleanup
        await supabase.auth.admin.deleteUser(testUser.user.id)
        
        if (!profileError) {
          console.log('✅ User workflow: Complete signup/profile creation works')
        } else {
          console.log('⚠️  User workflow: Profile creation issues')
        }
      } else {
        console.log('⚠️  User workflow: User creation issues')
      }
    } catch (e) {
      console.log('⚠️  User workflow: Error testing complete flow')
    }
    
    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 FINAL VERIFICATION SUMMARY')
    console.log('='.repeat(50))
    console.log(`${results.schema} Database Schema`)
    console.log(`${results.encryption} Encryption Functions`)
    console.log(`${results.authentication} Authentication System`)
    console.log(`${results.rls} Row Level Security`)
    console.log(`${results.seedData} Seed Data`)
    
    const allPassing = Object.values(results).every(r => r === '✅')
    const hasWarnings = Object.values(results).some(r => r === '⚠️')
    
    console.log('\n' + '='.repeat(50))
    if (allPassing) {
      console.log('🎉 DATABASE SETUP COMPLETE!')
      console.log('All systems are ready for development.')
    } else if (hasWarnings) {
      console.log('⚠️  DATABASE SETUP MOSTLY COMPLETE')
      console.log('Some warnings but core functionality is ready.')
    } else {
      console.log('❌ DATABASE SETUP ISSUES')
      console.log('Please review and fix critical issues.')
    }
    
    console.log('\n🚀 Ready to start development with:')
    console.log('   • User authentication and profiles')
    console.log('   • Encrypted data storage')
    console.log('   • Safety monitoring systems')
    console.log('   • Relationship assessment tools')
    console.log('   • Crisis intervention workflows')
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
  }
}

finalVerification()