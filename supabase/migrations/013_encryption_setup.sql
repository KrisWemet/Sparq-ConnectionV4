-- Sparq Connection V4: Field-Level Encryption Setup
-- Migration 004: pgcrypto configuration and encryption functions
-- Purpose: Implement field-level encryption for sensitive data

-- ============================================================================
-- ENCRYPTION CONFIGURATION
-- ============================================================================

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a secure encryption key management system
-- In production, these keys should be managed via environment variables or key management service
CREATE OR REPLACE FUNCTION get_encryption_key(key_name TEXT DEFAULT 'default')
RETURNS TEXT AS $$
BEGIN
  -- In production, replace with proper key management
  -- This should read from environment variables or a secure key store
  CASE key_name
    WHEN 'pii' THEN RETURN COALESCE(current_setting('app.encryption.pii_key', true), 'fallback_pii_key_change_in_production');
    WHEN 'emergency' THEN RETURN COALESCE(current_setting('app.encryption.emergency_key', true), 'fallback_emergency_key_change_in_production');  
    WHEN 'communication' THEN RETURN COALESCE(current_setting('app.encryption.communication_key', true), 'fallback_communication_key_change_in_production');
    WHEN 'default' THEN RETURN COALESCE(current_setting('app.encryption.default_key', true), 'fallback_default_key_change_in_production');
    ELSE RETURN 'fallback_key_change_in_production';
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENCRYPTION/DECRYPTION FUNCTIONS
-- ============================================================================

-- Function to encrypt PII data (names, emails, etc.)
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT)
RETURNS TEXT AS $$
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN encode(
    pgp_sym_encrypt(
      plaintext, 
      get_encryption_key('pii'),
      'compress-algo=1, cipher-algo=aes256'
    ), 
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt PII data
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

-- Function to encrypt emergency contact information
CREATE OR REPLACE FUNCTION encrypt_emergency_contact(contact_json JSONB)
RETURNS TEXT AS $$
BEGIN
  IF contact_json IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN encode(
    pgp_sym_encrypt(
      contact_json::text,
      get_encryption_key('emergency'),
      'compress-algo=1, cipher-algo=aes256'
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt emergency contact information
CREATE OR REPLACE FUNCTION decrypt_emergency_contact(encrypted_text TEXT)
RETURNS JSONB AS $$
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;
  
  BEGIN
    RETURN pgp_sym_decrypt(
      decode(encrypted_text, 'base64'),
      get_encryption_key('emergency')
    )::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Emergency contact decryption failed';
    RETURN '{"error": "decryption_failed"}'::jsonb;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to encrypt communication content
CREATE OR REPLACE FUNCTION encrypt_communication(content TEXT)
RETURNS TEXT AS $$
BEGIN
  IF content IS NULL OR content = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN encode(
    pgp_sym_encrypt(
      content,
      get_encryption_key('communication'),
      'compress-algo=1, cipher-algo=aes256'
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt communication content (for safety analysis)
CREATE OR REPLACE FUNCTION decrypt_communication(encrypted_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;
  
  BEGIN
    RETURN pgp_sym_decrypt(
      decode(encrypted_text, 'base64'),
      get_encryption_key('communication')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Communication decryption failed';
    RETURN '[DECRYPTION_FAILED]';
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to hash sensitive data for indexing (one-way)
CREATE OR REPLACE FUNCTION hash_for_index(data TEXT, salt TEXT DEFAULT '')
RETURNS TEXT AS $$
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN encode(
    digest(
      lower(trim(data)) || salt || get_encryption_key('default'), 
      'sha256'
    ), 
    'hex'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECURE USER MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to securely create or update user with encrypted PII
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

-- Function to get user with decrypted PII (for authorized access only)
CREATE OR REPLACE FUNCTION get_user_decrypted(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  auth_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  relationship_status TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verify authorization (user can only access own data or admin access)
  IF NOT (
    p_user_id IN (SELECT users.id FROM users WHERE users.auth_id = auth.uid()) OR
    public.is_support()
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to user data';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.auth_id,
    decrypt_pii(u.email_encrypted) as email,
    decrypt_pii(u.first_name_encrypted) as first_name,
    decrypt_pii(u.last_name_encrypted) as last_name,
    u.display_name,
    u.relationship_status,
    u.is_active,
    u.created_at,
    u.last_active_at
  FROM users u
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to securely update emergency contacts
CREATE OR REPLACE FUNCTION update_emergency_contacts(
  p_user_id UUID,
  p_contact_1 JSONB DEFAULT NULL,
  p_contact_2 JSONB DEFAULT NULL,
  p_crisis_plan TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_auth_id UUID;
BEGIN
  -- Verify user authorization
  SELECT auth_id INTO v_user_auth_id FROM users WHERE id = p_user_id;
  IF v_user_auth_id != auth.uid() AND NOT public.is_support() THEN
    RAISE EXCEPTION 'Unauthorized access to safety profile';
  END IF;
  
  -- Update or insert safety profile
  INSERT INTO user_safety_profile (
    user_id,
    emergency_contact_1_encrypted,
    emergency_contact_2_encrypted,
    crisis_plan_encrypted
  ) VALUES (
    p_user_id,
    CASE WHEN p_contact_1 IS NOT NULL THEN encrypt_emergency_contact(p_contact_1) END,
    CASE WHEN p_contact_2 IS NOT NULL THEN encrypt_emergency_contact(p_contact_2) END,
    CASE WHEN p_crisis_plan IS NOT NULL THEN encrypt_pii(p_crisis_plan) END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    emergency_contact_1_encrypted = CASE 
      WHEN p_contact_1 IS NOT NULL THEN encrypt_emergency_contact(p_contact_1) 
      ELSE user_safety_profile.emergency_contact_1_encrypted 
    END,
    emergency_contact_2_encrypted = CASE 
      WHEN p_contact_2 IS NOT NULL THEN encrypt_emergency_contact(p_contact_2)
      ELSE user_safety_profile.emergency_contact_2_encrypted 
    END,
    crisis_plan_encrypted = CASE 
      WHEN p_crisis_plan IS NOT NULL THEN encrypt_pii(p_crisis_plan)
      ELSE user_safety_profile.crisis_plan_encrypted 
    END,
    updated_at = NOW();
    
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get emergency contacts (for crisis situations only)
CREATE OR REPLACE FUNCTION get_emergency_contacts(p_user_id UUID)
RETURNS TABLE(
  contact_1 JSONB,
  contact_2 JSONB,
  crisis_plan TEXT
) AS $$
BEGIN
  -- Only allow access in specific circumstances
  IF NOT (
    public.is_support() OR 
    -- User accessing their own data
    p_user_id IN (SELECT users.id FROM users WHERE users.auth_id = auth.uid()) OR
    -- Crisis situation detected
    EXISTS (
      SELECT 1 FROM safety_risk_signals 
      WHERE user_id = p_user_id 
      AND risk_level IN ('high', 'critical')
      AND created_at > NOW() - INTERVAL '24 hours'
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to emergency contacts';
  END IF;
  
  RETURN QUERY
  SELECT 
    decrypt_emergency_contact(emergency_contact_1_encrypted) as contact_1,
    decrypt_emergency_contact(emergency_contact_2_encrypted) as contact_2,
    decrypt_pii(crisis_plan_encrypted) as crisis_plan
  FROM user_safety_profile
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENCRYPTION KEY ROTATION FUNCTIONS
-- ============================================================================

-- Function to prepare for key rotation (mark data for re-encryption)
CREATE OR REPLACE FUNCTION prepare_key_rotation(key_type TEXT)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER := 0;
BEGIN
  -- Only allow admins to initiate key rotation
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required for key rotation';
  END IF;
  
  -- Create a key rotation log entry
  INSERT INTO audit_log (
    action_type, resource_type, details, staff_user_id
  ) VALUES (
    'key_rotation_initiated', 'encryption_key',
    jsonb_build_object(
      'key_type', key_type,
      'initiated_at', NOW(),
      'initiated_by', auth.uid()
    ),
    public.get_user_id()
  );
  
  -- Mark records for re-encryption based on key type
  CASE key_type
    WHEN 'pii' THEN
      -- Mark users table records
      UPDATE users SET updated_at = NOW() WHERE email_encrypted IS NOT NULL;
      GET DIAGNOSTICS affected_rows = ROW_COUNT;
      
    WHEN 'emergency' THEN  
      -- Mark safety profile records
      UPDATE user_safety_profile SET updated_at = NOW() 
      WHERE emergency_contact_1_encrypted IS NOT NULL OR emergency_contact_2_encrypted IS NOT NULL;
      GET DIAGNOSTICS affected_rows = ROW_COUNT;
      
    WHEN 'communication' THEN
      -- Mark communication records (will be implemented in next migration)
      affected_rows := 0;
      
    ELSE
      RAISE EXCEPTION 'Unknown key type: %', key_type;
  END CASE;
  
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENCRYPTED SEARCH FUNCTIONS
-- ============================================================================

-- Function to search users by email hash (for login/verification)
CREATE OR REPLACE FUNCTION find_user_by_email_hash(email_hash TEXT)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- This function is used internally for authentication
  -- The email_hash should be computed client-side or in the auth service
  
  SELECT id INTO v_user_id
  FROM users 
  WHERE hash_for_index(decrypt_pii(email_encrypted)) = email_hash
  LIMIT 1;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECURITY AND PERMISSIONS
-- ============================================================================

-- Revoke public access to encryption functions
REVOKE ALL ON FUNCTION encrypt_pii FROM PUBLIC;
REVOKE ALL ON FUNCTION decrypt_pii FROM PUBLIC;
REVOKE ALL ON FUNCTION encrypt_emergency_contact FROM PUBLIC;
REVOKE ALL ON FUNCTION decrypt_emergency_contact FROM PUBLIC;
REVOKE ALL ON FUNCTION encrypt_communication FROM PUBLIC;
REVOKE ALL ON FUNCTION decrypt_communication FROM PUBLIC;
REVOKE ALL ON FUNCTION get_encryption_key FROM PUBLIC;

-- Grant specific access to authenticated users
GRANT EXECUTE ON FUNCTION upsert_user_secure TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_decrypted TO authenticated;
GRANT EXECUTE ON FUNCTION update_emergency_contacts TO authenticated;
GRANT EXECUTE ON FUNCTION get_emergency_contacts TO authenticated;
GRANT EXECUTE ON FUNCTION hash_for_index TO authenticated;

-- Grant admin functions to admin role only
GRANT EXECUTE ON FUNCTION prepare_key_rotation TO authenticated;

-- Grant service functions to service role for system operations
GRANT EXECUTE ON FUNCTION encrypt_pii TO service_role;
GRANT EXECUTE ON FUNCTION decrypt_pii TO service_role;
GRANT EXECUTE ON FUNCTION encrypt_emergency_contact TO service_role;
GRANT EXECUTE ON FUNCTION decrypt_emergency_contact TO service_role;
GRANT EXECUTE ON FUNCTION encrypt_communication TO service_role;
GRANT EXECUTE ON FUNCTION decrypt_communication TO service_role;
GRANT EXECUTE ON FUNCTION find_user_by_email_hash TO service_role;

-- ============================================================================
-- AUDIT TABLE FOR ENCRYPTION OPERATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Core audit information
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  
  -- Action details
  details JSONB DEFAULT '{}'::jsonb,
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  
  -- Staff information (for admin actions)
  staff_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Result information
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log RLS policies
CREATE POLICY "audit_log_own" ON audit_log
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "audit_log_staff" ON audit_log
  FOR SELECT USING (public.is_support());

CREATE POLICY "audit_log_insert_system" ON audit_log
  FOR INSERT WITH CHECK (true); -- System can insert audit records

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION encrypt_pii IS 'Encrypt personally identifiable information using AES-256';
COMMENT ON FUNCTION decrypt_pii IS 'Decrypt PII data with error handling';
COMMENT ON FUNCTION encrypt_emergency_contact IS 'Encrypt emergency contact JSON data';
COMMENT ON FUNCTION decrypt_emergency_contact IS 'Decrypt emergency contact data for crisis situations';
COMMENT ON FUNCTION upsert_user_secure IS 'Securely create or update user with encrypted PII';
COMMENT ON FUNCTION get_user_decrypted IS 'Get user data with decrypted PII (authorized access only)';
COMMENT ON FUNCTION update_emergency_contacts IS 'Securely update encrypted emergency contact information';
COMMENT ON FUNCTION get_emergency_contacts IS 'Get emergency contacts for crisis intervention';
COMMENT ON FUNCTION hash_for_index IS 'Create searchable hash of sensitive data';
COMMENT ON FUNCTION prepare_key_rotation IS 'Prepare for encryption key rotation (admin only)';

COMMENT ON TABLE audit_log IS 'Immutable audit trail for all sensitive operations';