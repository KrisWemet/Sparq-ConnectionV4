-- Fix Missing upsert_user_secure Function
-- Migration 015: Apply missing function that wasn't properly created

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_user_secure TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_user_secure TO service_role;

-- Add function comment
COMMENT ON FUNCTION upsert_user_secure IS 'Securely create or update user with encrypted PII';