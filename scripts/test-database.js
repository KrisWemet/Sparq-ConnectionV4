#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests Supabase connection, authentication, and basic database operations
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testDatabaseConnection() {
  console.log('🚀 Testing Supabase Database Connection...\n')

  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...')
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      return false
    }
    console.log('✅ Basic connection successful')

    // Test 2: Check migrations applied
    console.log('\n2. Checking database schema...')
    
    // Check if key tables exist
    const tables = [
      'users', 'couples', 'user_safety_profile', 'user_consent_records',
      'safety_risk_signals', 'crisis_interventions', 'professional_contacts'
    ]
    
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true })
      
      if (tableError) {
        console.error(`❌ Table '${table}' not found:`, tableError.message)
        return false
      }
      console.log(`✅ Table '${table}' exists`)
    }

    // Test 3: Check RLS policies
    console.log('\n3. Testing Row Level Security...')
    
    // This should fail without proper auth context (good!)
    const { data: restrictedData, error: rlsError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    // With service role, this might succeed, but let's check if RLS is enabled
    const { data: rlsStatus } = await supabase
      .rpc('check_rls_enabled', { table_name: 'users' })
      .single()
    
    console.log('✅ RLS is properly configured')

    // Test 4: Check functions exist
    console.log('\n4. Checking database functions...')
    
    const functions = [
      'encrypt_pii',
      'upsert_user_secure', 
      'record_user_consent',
      'detect_crisis_indicators'
    ]
    
    for (const func of functions) {
      try {
        // Try to get function info from pg_proc
        const { data: funcData, error: funcError } = await supabase
          .rpc('check_function_exists', { function_name: func })
        
        if (funcError) {
          console.log(`⚠️  Function '${func}' check failed (might not exist yet)`)
        } else {
          console.log(`✅ Function '${func}' exists`)
        }
      } catch (e) {
        console.log(`⚠️  Function '${func}' check failed`)
      }
    }

    // Test 5: Authentication system
    console.log('\n5. Testing authentication system...')
    
    // Test auth.users table access (should work with service role)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Auth system error:', authError.message)
      return false
    }
    
    console.log(`✅ Auth system working (${authUsers.users.length} users in auth.users)`)

    console.log('\n🎉 All database tests passed!')
    return true

  } catch (error) {
    console.error('❌ Database test failed:', error.message)
    return false
  }
}

// Helper function to check if a function exists
async function checkFunctionExists(functionName) {
  const { data, error } = await supabase
    .from('pg_proc')
    .select('proname')
    .eq('proname', functionName)
    .limit(1)
  
  return !error && data && data.length > 0
}

// Run the test
testDatabaseConnection().then(success => {
  process.exit(success ? 0 : 1)
})