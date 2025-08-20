#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkFunctions() {
  console.log('🔍 Checking database functions...\n')
  
  try {
    // Query pg_proc to check for our functions
    const { data, error } = await supabase
      .rpc('sql', {
        query: `
          SELECT proname, prosrc 
          FROM pg_proc 
          WHERE proname IN (
            'encrypt_pii', 
            'decrypt_pii',
            'upsert_user_secure', 
            'record_user_consent',
            'detect_crisis_indicators',
            'get_encryption_key',
            'create_couple_invitation'
          )
          ORDER BY proname;
        `
      })
    
    if (error) {
      console.error('Error querying functions:', error)
      return
    }
    
    if (data && data.length > 0) {
      console.log('✅ Found functions:')
      data.forEach(func => {
        console.log(`  - ${func.proname}`)
      })
    } else {
      console.log('⚠️  No custom functions found')
    }
    
    // Test a simple function call
    console.log('\n🧪 Testing encryption functions...')
    
    try {
      const { data: testEncrypt, error: encryptError } = await supabase
        .rpc('encrypt_pii', { plaintext: 'test@example.com' })
      
      if (encryptError) {
        console.log('⚠️  encrypt_pii function not callable:', encryptError.message)
      } else {
        console.log('✅ encrypt_pii function works')
      }
    } catch (e) {
      console.log('⚠️  encrypt_pii function test failed:', e.message)
    }
    
  } catch (error) {
    console.error('Error checking functions:', error.message)
  }
}

checkFunctions()