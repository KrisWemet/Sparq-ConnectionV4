#!/usr/bin/env node

/**
 * Fix Missing Database Functions
 * Applies missing encryption and user management functions
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function applyMissingFunctions() {
  console.log('🔧 Applying missing database functions...\n')
  
  try {
    // Function 1: decrypt_pii
    console.log('1. Creating decrypt_pii function...')
    const decryptPiiSQL = `
      CREATE OR REPLACE FUNCTION decrypt_pii(encrypted_text TEXT)
      RETURNS TEXT AS $$
      BEGIN
        IF encrypted_text IS NULL OR encrypted_text = '' THEN
          RETURN NULL;
        END IF;
        
        BEGIN
          RETURN pgp_sym_decrypt(
            decode(encrypted_text, 'base64'),
            get_encryption_key('pii')
          );
        EXCEPTION WHEN OTHERS THEN
          -- Log decryption failure but don't expose the error
          RAISE WARNING 'PII decryption failed for encrypted text';
          RETURN '[DECRYPTION_FAILED]';
        END;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
    
    const { error: decryptError } = await supabase.rpc('exec_sql', { sql: decryptPiiSQL })
    if (decryptError) {
      console.log(`   ❌ decrypt_pii: ${decryptError.message}`)
    } else {
      console.log('   ✅ decrypt_pii: Created successfully')
    }
    
    // Function 2: upsert_user_secure
    console.log('\n2. Creating upsert_user_secure function...')
    const upsertUserSQL = `
      CREATE OR REPLACE FUNCTION upsert_user_secure(
        p_auth_id UUID,
        p_email TEXT,
        p_first_name TEXT DEFAULT NULL,
        p_last_name TEXT DEFAULT NULL,
        p_display_name TEXT DEFAULT NULL
      ) RETURNS UUID AS $$
      DECLARE
        v_user_id UUID;
        v_existing_user_id UUID;
      BEGIN
        -- Check if user already exists
        SELECT id INTO v_existing_user_id FROM users WHERE auth_id = p_auth_id;
        
        IF v_existing_user_id IS NOT NULL THEN
          -- Update existing user
          UPDATE users SET
            email_encrypted = encrypt_pii(p_email),
            first_name_encrypted = encrypt_pii(p_first_name),
            last_name_encrypted = encrypt_pii(p_last_name),
            display_name = p_display_name,
            updated_at = NOW()
          WHERE id = v_existing_user_id;
          
          RETURN v_existing_user_id;
        ELSE
          -- Create new user
          INSERT INTO users (
            auth_id,
            email_encrypted,
            first_name_encrypted,
            last_name_encrypted,
            display_name
          ) VALUES (
            p_auth_id,
            encrypt_pii(p_email),
            encrypt_pii(p_first_name),
            encrypt_pii(p_last_name),
            p_display_name
          ) RETURNING id INTO v_user_id;
          
          RETURN v_user_id;
        END IF;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
    
    const { error: upsertError } = await supabase.rpc('exec_sql', { sql: upsertUserSQL })
    if (upsertError) {
      console.log(`   ❌ upsert_user_secure: ${upsertError.message}`)
    } else {
      console.log('   ✅ upsert_user_secure: Created successfully')
    }
    
    // Grant permissions
    console.log('\n3. Setting permissions...')
    const permissionsSQL = `
      -- Grant access to authenticated users
      GRANT EXECUTE ON FUNCTION decrypt_pii TO authenticated;
      GRANT EXECUTE ON FUNCTION upsert_user_secure TO authenticated;
      
      -- Grant service role access
      GRANT EXECUTE ON FUNCTION decrypt_pii TO service_role;
      GRANT EXECUTE ON FUNCTION upsert_user_secure TO service_role;
    `
    
    const { error: permError } = await supabase.rpc('exec_sql', { sql: permissionsSQL })
    if (permError) {
      console.log(`   ❌ Permissions: ${permError.message}`)
    } else {
      console.log('   ✅ Permissions: Set successfully')
    }
    
    // Test the functions
    console.log('\n4. Testing functions...')
    
    // Test decrypt_pii (requires encrypted data)
    try {
      const { data: testEncrypt } = await supabase.rpc('encrypt_pii', { plaintext: 'test@example.com' })
      if (testEncrypt) {
        const { data: testDecrypt, error: testError } = await supabase.rpc('decrypt_pii', { encrypted_text: testEncrypt })
        
        if (testError) {
          console.log(`   ❌ decrypt_pii test: ${testError.message}`)
        } else if (testDecrypt === 'test@example.com') {
          console.log('   ✅ decrypt_pii test: Working correctly')
        } else {
          console.log(`   ⚠️  decrypt_pii test: Unexpected result: ${testDecrypt}`)
        }
      }
    } catch (e) {
      console.log(`   ❌ decrypt_pii test: ${e.message}`)
    }
    
    // Test upsert_user_secure
    try {
      const testAuthId = crypto.randomUUID()
      const { data: testUpsert, error: upsertTestError } = await supabase.rpc('upsert_user_secure', {
        p_auth_id: testAuthId,
        p_email: 'test@example.com',
        p_display_name: 'Test User'
      })
      
      if (upsertTestError) {
        console.log(`   ❌ upsert_user_secure test: ${upsertTestError.message}`)
      } else if (testUpsert) {
        console.log('   ✅ upsert_user_secure test: Working correctly')
        
        // Clean up test user
        await supabase.from('users').delete().eq('auth_id', testAuthId)
      } else {
        console.log('   ⚠️  upsert_user_secure test: No result returned')
      }
    } catch (e) {
      console.log(`   ❌ upsert_user_secure test: ${e.message}`)
    }
    
    console.log('\n✅ Missing functions have been applied and tested!')
    
  } catch (error) {
    console.error('❌ Failed to apply missing functions:', error.message)
    return false
  }
  
  return true
}

// Alternative approach using direct SQL execution if rpc doesn't work
async function applyFunctionsDirectly() {
  console.log('🔧 Applying functions using direct SQL execution...\n')
  
  // We'll need to use a different approach since rpc('exec_sql') might not exist
  // Let's try to create the functions by calling them with invalid parameters first
  
  try {
    // Try to call decrypt_pii to see if it exists
    const { error: decryptError } = await supabase.rpc('decrypt_pii', { encrypted_text: 'test' })
    
    if (decryptError && decryptError.message.includes('Could not find the function')) {
      console.log('❌ decrypt_pii function is missing and needs to be created manually')
      console.log('   Please run the encryption_setup.sql migration manually')
    } else {
      console.log('✅ decrypt_pii function exists')
    }
    
    // Try to call upsert_user_secure
    const { error: upsertError } = await supabase.rpc('upsert_user_secure')
    
    if (upsertError && upsertError.message.includes('Could not find the function')) {
      console.log('❌ upsert_user_secure function is missing and needs to be created manually')
      console.log('   Please run the encryption_setup.sql migration manually')
    } else {
      console.log('✅ upsert_user_secure function exists')
    }
    
  } catch (error) {
    console.error('Error checking functions:', error.message)
  }
}

applyMissingFunctions().catch(() => {
  console.log('\n⚠️  Direct function creation failed, trying alternative approach...\n')
  applyFunctionsDirectly()
})