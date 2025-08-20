#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyFunctions() {
  console.log('🔍 Verifying encryption and security functions...\n')
  
  const functionsToCheck = [
    'encrypt_pii',
    'decrypt_pii', 
    'upsert_user_secure',
    'record_user_consent',
    'create_couple_invitation',
    'get_encryption_key'
  ]
  
  for (const funcName of functionsToCheck) {
    try {
      // Try to call each function with appropriate test parameters
      switch (funcName) {
        case 'encrypt_pii':
          const { data: encData, error: encError } = await supabase
            .rpc(funcName, { plaintext: 'test@example.com' })
          if (encError) {
            console.log(`❌ ${funcName}: ${encError.message}`)
          } else {
            console.log(`✅ ${funcName}: Working (returned encrypted data)`)
          }
          break
          
        case 'get_encryption_key':
          const { data: keyData, error: keyError } = await supabase
            .rpc(funcName, { key_name: 'default' })
          if (keyError) {
            console.log(`❌ ${funcName}: ${keyError.message}`)
          } else {
            console.log(`✅ ${funcName}: Working`)
          }
          break
          
        default:
          // For other functions, just try to access them (will show if they exist)
          const { error } = await supabase.rpc(funcName)
          if (error && error.message.includes('Could not find the function')) {
            console.log(`❌ ${funcName}: Function not found`)
          } else if (error && !error.message.includes('Could not find the function')) {
            console.log(`✅ ${funcName}: Exists (parameter error expected)`)
          } else {
            console.log(`✅ ${funcName}: Working`)
          }
      }
    } catch (error) {
      console.log(`❌ ${funcName}: ${error.message}`)
    }
  }
  
  console.log('\n🧪 Testing basic database operations...')
  
  // Test basic table access
  try {
    const { data: userCount, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.log('❌ Users table access failed:', error.message)
    } else {
      console.log('✅ Users table accessible')
    }
  } catch (error) {
    console.log('❌ Users table test failed:', error.message)
  }
  
  // Test auth functions
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.log('❌ Auth admin access failed:', authError.message)
    } else {
      console.log(`✅ Auth system working (${authData.users.length} users)`)
    }
  } catch (error) {
    console.log('❌ Auth system test failed:', error.message)
  }
}

verifyFunctions()