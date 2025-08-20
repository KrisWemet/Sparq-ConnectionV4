-- Sparq Connection V4: Authentication and Consent Enhancements
-- Migration 012: Enhanced authentication, consent versioning, and couple linking
-- Purpose: Comprehensive authentication with transparent consent-based safety model

-- ============================================================================
-- CONSENT VERSIONING AND TRACKING
-- ============================================================================

-- Consent Versions: Track different versions of consent forms
CREATE TABLE consent_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Version information
  version_number TEXT NOT NULL UNIQUE, -- e.g., "1.0", "1.1", "2.0"
  version_name TEXT NOT NULL, -- e.g., "Initial Safety Consent", "Enhanced Privacy Controls"
  effective_date DATE NOT NULL,
  deprecated_date DATE,
  
  -- Consent form content
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'safety_monitoring', 'data_processing', 'analytics_collection',
    'crisis_intervention', 'professional_referral', 'research_participation',
    'marketing_communications', 'ai_content_analysis'
  )),
  
  -- Legal and regulatory context
  legal_basis TEXT NOT NULL CHECK (legal_basis IN (
    'consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'
  )),
  regulatory_framework TEXT[] DEFAULT ARRAY['GDPR'], -- e.g., ['GDPR', 'PIPEDA', 'CCPA']
  
  -- Form content
  consent_text TEXT NOT NULL, -- Full consent text shown to users
  explanation_text TEXT NOT NULL, -- Plain language explanation
  consequences_of_refusal TEXT, -- What happens if user says no
  withdrawal_instructions TEXT, -- How to withdraw consent
  
  -- Metadata
  created_by_user_id UUID REFERENCES users(id),
  approved_by_legal BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);

-- Enhanced User Consents with versioning
CREATE TABLE user_consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- User and consent information
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_version_id UUID NOT NULL REFERENCES consent_versions(id),
  
  -- Consent status
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  
  -- Consent collection context
  collection_method TEXT NOT NULL CHECK (collection_method IN (
    'explicit_opt_in', 'implicit_signup', 'settings_change', 'renewal_prompt',
    'couple_linking', 'crisis_intervention', 'professional_referral'
  )),
  
  -- User interface context
  user_agent TEXT,
  ip_address INET,
  interface_language TEXT DEFAULT 'en',
  
  -- Consent specifics
  granular_permissions JSONB DEFAULT '{}'::jsonb, -- Specific permissions within consent type
  expiration_date DATE, -- When consent expires (if applicable)
  renewal_required_date DATE, -- When renewal is suggested
  
  -- Withdrawal tracking
  withdrawal_reason TEXT,
  withdrawal_method TEXT CHECK (withdrawal_method IN (
    'settings_page', 'email_link', 'support_request', 'automatic_expiry'
  )),
  
  -- Legal compliance
  gdpr_lawfulness_basis TEXT,
  data_retention_period_days INTEGER,
  
  -- Constraints
  CONSTRAINT valid_consent_dates CHECK (
    (granted = true AND granted_at IS NOT NULL) OR 
    (granted = false)
  ),
  CONSTRAINT valid_revocation CHECK (
    (revoked_at IS NULL) OR 
    (revoked_at > granted_at)
  )
);

-- ============================================================================
-- COUPLE INVITATION SYSTEM
-- ============================================================================

-- Couple Invitations: Secure invitation system for couple linking
CREATE TABLE IF NOT EXISTS couple_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Invitation details
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email_encrypted TEXT NOT NULL, -- Encrypted email of invitee
  
  -- Secure invitation mechanism
  invitation_code TEXT NOT NULL UNIQUE, -- URL-safe invitation code
  invitation_token_hash TEXT NOT NULL, -- Hashed secure token
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Invitation status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'declined', 'expired', 'revoked'
  )),
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES users(id),
  declined_at TIMESTAMPTZ,
  declined_reason TEXT,
  
  -- Safety consent context
  safety_discussion_completed BOOLEAN DEFAULT false,
  safety_consent_acknowledged BOOLEAN DEFAULT false,
  both_partners_consent_safety BOOLEAN DEFAULT false,
  
  -- Invitation content
  personal_message TEXT, -- Optional personal message from inviter
  relationship_type TEXT CHECK (relationship_type IN (
    'dating', 'partnered', 'engaged', 'married', 'committed'
  )),
  
  -- Security and tracking
  access_attempts INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  accessed_from_ips INET[],
  
  -- Couple creation result
  resulting_couple_id UUID REFERENCES couples(id),
  
  -- Constraints
  CONSTRAINT valid_expiration CHECK (expires_at > created_at),
  CONSTRAINT valid_acceptance CHECK (
    (status = 'accepted' AND accepted_at IS NOT NULL AND accepted_by_user_id IS NOT NULL) OR
    (status != 'accepted')
  )
);

-- ============================================================================
-- ENHANCED PRIVACY PREFERENCES
-- ============================================================================

-- Privacy Preference Changes: Track all privacy preference modifications
CREATE TABLE privacy_preference_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- User and change context
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  privacy_preference_id UUID NOT NULL REFERENCES privacy_preferences(id),
  
  -- Change details
  change_type TEXT NOT NULL CHECK (change_type IN (
    'initial_setup', 'user_modification', 'couple_linking', 'crisis_override',
    'gdpr_request', 'automatic_update', 'professional_recommendation'
  )),
  
  -- Before and after values
  previous_settings JSONB,
  new_settings JSONB NOT NULL,
  
  -- Change justification
  change_reason TEXT,
  user_initiated BOOLEAN DEFAULT true,
  
  -- Interface context
  changed_via TEXT CHECK (changed_via IN (
    'settings_page', 'onboarding_flow', 'couple_setup', 'crisis_response',
    'admin_override', 'api_request', 'automated_system'
  )),
  
  -- Approval workflow
  requires_confirmation BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  confirmed_via TEXT CHECK (confirmed_via IN (
    'email_link', 'sms_code', 'in_app_confirmation', 'biometric_auth'
  ))
);

-- ============================================================================
-- JURISDICTION AND LOCALIZATION
-- ============================================================================

-- User Location History: Track user jurisdiction for compliance
CREATE TABLE user_location_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- User and location
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  detected_country_code TEXT NOT NULL,
  detected_region TEXT, -- State/province if applicable
  detected_city TEXT,
  
  -- Detection method
  detection_method TEXT NOT NULL CHECK (detection_method IN (
    'ip_geolocation', 'user_input', 'billing_address', 'gps_consent',
    'timezone_inference', 'manual_override'
  )),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Location data
  ip_address INET,
  timezone_detected TEXT,
  locale_detected TEXT, -- e.g., 'en-US', 'fr-CA'
  
  -- Privacy and compliance
  location_data_consented BOOLEAN DEFAULT false,
  used_for_compliance BOOLEAN DEFAULT true,
  used_for_localization BOOLEAN DEFAULT true,
  
  -- Accuracy and verification
  user_confirmed BOOLEAN DEFAULT false,
  jurisdiction_id UUID REFERENCES jurisdictions(id)
);

-- ============================================================================
-- AUTHENTICATION SESSION MANAGEMENT
-- ============================================================================

-- Enhanced Session Tracking
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Session identification
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL, -- Hashed session token
  refresh_token_hash TEXT, -- Hashed refresh token
  
  -- Session lifecycle
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT CHECK (termination_reason IN (
    'user_logout', 'token_expired', 'security_breach', 'admin_termination',
    'password_change', 'account_deactivation', 'device_replacement'
  )),
  
  -- Session context
  user_agent TEXT,
  ip_address INET,
  device_fingerprint TEXT,
  
  -- Security features
  is_mobile BOOLEAN DEFAULT false,
  is_trusted_device BOOLEAN DEFAULT false,
  requires_2fa BOOLEAN DEFAULT false,
  
  -- Safety context
  crisis_mode_active BOOLEAN DEFAULT false,
  emergency_access_granted BOOLEAN DEFAULT false,
  professional_supervision BOOLEAN DEFAULT false
);

-- ============================================================================
-- SAFETY CONSENT AND DISCUSSIONS
-- ============================================================================

-- Partner Safety Discussions: Track safety discussions between partners
CREATE TABLE partner_safety_discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Discussion context
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  initiated_by_user_id UUID NOT NULL REFERENCES users(id),
  
  -- Discussion progress
  discussion_type TEXT NOT NULL CHECK (discussion_type IN (
    'initial_safety_setup', 'consent_alignment', 'boundary_discussion',
    'escalation_preferences', 'crisis_protocol', 'monitoring_comfort_level'
  )),
  
  -- Discussion content (high-level tracking, not content)
  topics_covered JSONB DEFAULT '[]'::jsonb, -- List of topics discussed
  both_partners_participated BOOLEAN DEFAULT false,
  consensus_reached BOOLEAN DEFAULT false,
  
  -- Safety agreement outcomes
  mutual_safety_consent BOOLEAN,
  agreed_monitoring_level TEXT CHECK (agreed_monitoring_level IN (
    'minimal', 'standard', 'enhanced', 'crisis_only'
  )),
  agreed_escalation_threshold TEXT CHECK (agreed_escalation_threshold IN (
    'self_harm_only', 'violence_indicators', 'severe_distress', 'any_concern'
  )),
  
  -- Follow-up requirements
  requires_follow_up BOOLEAN DEFAULT false,
  follow_up_scheduled_for DATE,
  completed BOOLEAN DEFAULT false,
  
  -- Professional involvement
  professional_guided BOOLEAN DEFAULT false,
  professional_id UUID REFERENCES professional_contacts(id)
);

-- ============================================================================
-- ENHANCED FUNCTIONS
-- ============================================================================

-- Function to create secure invitation
CREATE OR REPLACE FUNCTION create_couple_invitation(
  p_inviter_id UUID,
  p_invitee_email TEXT,
  p_relationship_type TEXT DEFAULT 'partnered',
  p_personal_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_invitation_id UUID;
  v_invitation_code TEXT;
  v_encrypted_email TEXT;
  v_token_hash TEXT;
BEGIN
  -- Generate secure invitation code
  v_invitation_code := encode(gen_random_bytes(16), 'base64url');
  
  -- Generate secure token hash
  v_token_hash := encode(digest(gen_random_bytes(32), 'sha256'), 'hex');
  
  -- Encrypt email (simplified - use proper encryption in production)
  v_encrypted_email := encode(digest(p_invitee_email || gen_random_bytes(16), 'sha256'), 'hex');
  
  -- Create invitation
  INSERT INTO couple_invitations (
    inviter_id, invitee_email_encrypted, invitation_code,
    invitation_token_hash, relationship_type, personal_message
  ) VALUES (
    p_inviter_id, v_encrypted_email, v_invitation_code,
    v_token_hash, p_relationship_type, p_personal_message
  ) RETURNING id INTO v_invitation_id;
  
  -- Log invitation creation
  INSERT INTO audit_log (
    user_id, action_type, resource_type, resource_id, details
  ) VALUES (
    p_inviter_id, 'couple_invite', 'couple_invitation', v_invitation_id,
    jsonb_build_object(
      'relationship_type', p_relationship_type,
      'invitation_code', v_invitation_code
    )
  );
  
  RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record consent with versioning
CREATE OR REPLACE FUNCTION record_user_consent(
  p_user_id UUID,
  p_consent_type TEXT,
  p_granted BOOLEAN,
  p_collection_method TEXT DEFAULT 'explicit_opt_in',
  p_granular_permissions JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_consent_version_id UUID;
  v_consent_record_id UUID;
BEGIN
  -- Get current active consent version
  SELECT id INTO v_consent_version_id
  FROM consent_versions
  WHERE consent_type = p_consent_type
  AND is_active = true
  AND effective_date <= CURRENT_DATE
  AND (deprecated_date IS NULL OR deprecated_date > CURRENT_DATE)
  ORDER BY effective_date DESC
  LIMIT 1;
  
  IF v_consent_version_id IS NULL THEN
    RAISE EXCEPTION 'No active consent version found for type: %', p_consent_type;
  END IF;
  
  -- Record consent
  INSERT INTO user_consent_records (
    user_id, consent_version_id, granted, granted_at,
    collection_method, granular_permissions
  ) VALUES (
    p_user_id, v_consent_version_id, p_granted,
    CASE WHEN p_granted THEN NOW() ELSE NULL END,
    p_collection_method, p_granular_permissions
  ) RETURNING id INTO v_consent_record_id;
  
  -- Update user_consents table for compatibility
  INSERT INTO user_consents (
    user_id, consent_type, granted, granted_at, consent_method, consent_version
  ) VALUES (
    p_user_id, p_consent_type, p_granted,
    CASE WHEN p_granted THEN NOW() ELSE NULL END,
    p_collection_method, (SELECT version_number FROM consent_versions WHERE id = v_consent_version_id)
  ) ON CONFLICT (user_id, consent_type) DO UPDATE SET
    granted = EXCLUDED.granted,
    granted_at = EXCLUDED.granted_at,
    consent_version = EXCLUDED.consent_version,
    updated_at = NOW();
  
  -- Log consent action
  INSERT INTO audit_log (
    user_id, action_type, resource_type, resource_id, details, regulatory_context
  ) VALUES (
    p_user_id, CASE WHEN p_granted THEN 'consent_granted' ELSE 'consent_revoked' END,
    'user_consent', v_consent_record_id,
    jsonb_build_object(
      'consent_type', p_consent_type,
      'collection_method', p_collection_method,
      'granular_permissions', p_granular_permissions
    ),
    'GDPR'
  );
  
  RETURN v_consent_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect and record user jurisdiction
CREATE OR REPLACE FUNCTION detect_user_jurisdiction(
  p_user_id UUID,
  p_ip_address INET,
  p_timezone TEXT DEFAULT NULL,
  p_locale TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_location_id UUID;
  v_country_code TEXT;
  v_jurisdiction_id UUID;
BEGIN
  -- Simple IP-based country detection (replace with proper service)
  -- This is a placeholder - use actual geolocation service
  v_country_code := CASE 
    WHEN p_ip_address <<= '192.0.0.0/8'::inet THEN 'US'
    WHEN p_ip_address <<= '172.16.0.0/12'::inet THEN 'CA'
    ELSE 'GLOBAL'
  END;
  
  -- Find appropriate jurisdiction
  SELECT id INTO v_jurisdiction_id
  FROM jurisdictions
  WHERE country_code = v_country_code
  AND service_available = true
  LIMIT 1;
  
  -- Record location detection
  INSERT INTO user_location_history (
    user_id, detected_country_code, detection_method,
    ip_address, timezone_detected, locale_detected, jurisdiction_id
  ) VALUES (
    p_user_id, v_country_code, 'ip_geolocation',
    p_ip_address, p_timezone, p_locale, v_jurisdiction_id
  ) RETURNING id INTO v_location_id;
  
  -- Update user_jurisdictions for current jurisdiction
  INSERT INTO user_jurisdictions (user_id, jurisdiction_id, is_current)
  VALUES (p_user_id, v_jurisdiction_id, true)
  ON CONFLICT (user_id, jurisdiction_id) DO UPDATE SET
    is_current = true,
    updated_at = NOW();
  
  -- Ensure only one current jurisdiction per user
  UPDATE user_jurisdictions SET is_current = false
  WHERE user_id = p_user_id AND jurisdiction_id != v_jurisdiction_id;
  
  RETURN v_location_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Consent versioning indexes
CREATE INDEX IF NOT EXISTS idx_consent_versions_type_active ON consent_versions(consent_type, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_consent_versions_effective_date ON consent_versions(effective_date DESC);

-- User consent records indexes
CREATE INDEX IF NOT EXISTS idx_user_consent_records_user_type ON user_consent_records(user_id, consent_version_id);
CREATE INDEX IF NOT EXISTS idx_user_consent_records_granted_date ON user_consent_records(granted_at DESC) WHERE granted = true;
CREATE INDEX IF NOT EXISTS idx_user_consent_records_renewal ON user_consent_records(renewal_required_date) WHERE renewal_required_date IS NOT NULL;

-- Couple invitations indexes
CREATE INDEX IF NOT EXISTS idx_couple_invitations_inviter ON couple_invitations(inviter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_couple_invitations_code ON couple_invitations(invitation_code) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_couple_invitations_expires ON couple_invitations(expires_at) WHERE status = 'pending';

-- Privacy preference changes indexes
CREATE INDEX IF NOT EXISTS idx_privacy_preference_changes_user ON privacy_preference_changes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_preference_changes_type ON privacy_preference_changes(change_type, created_at);

-- User location history indexes
CREATE INDEX IF NOT EXISTS idx_user_location_history_user_recent ON user_location_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_location_history_country ON user_location_history(detected_country_code);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, last_activity_at DESC) WHERE terminated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at) WHERE terminated_at IS NULL;

-- Partner safety discussions indexes
CREATE INDEX IF NOT EXISTS idx_partner_safety_discussions_couple ON partner_safety_discussions(couple_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_safety_discussions_followup ON partner_safety_discussions(follow_up_scheduled_for) WHERE requires_follow_up = true;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE consent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_preference_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_safety_discussions ENABLE ROW LEVEL SECURITY;

-- Consent versions - public read for active versions
CREATE POLICY "consent_versions_public_read" ON consent_versions
  FOR SELECT USING (is_active = true);

-- User consent records - users can access their own
CREATE POLICY "user_consent_records_own" ON user_consent_records
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Couple invitations - inviter and invitee can access
CREATE POLICY "couple_invitations_inviter" ON couple_invitations
  FOR ALL USING (inviter_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "couple_invitations_invitee_accept" ON couple_invitations
  FOR SELECT USING (status = 'pending' AND expires_at > NOW());

-- Privacy preference changes - users can view their own
CREATE POLICY "privacy_preference_changes_own" ON privacy_preference_changes
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- User location history - users can access their own
CREATE POLICY "user_location_history_own" ON user_location_history
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- User sessions - users can access their own active sessions
CREATE POLICY "user_sessions_own" ON user_sessions
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Partner safety discussions - couple members can access
CREATE POLICY "partner_safety_discussions_couple" ON partner_safety_discussions
  FOR ALL USING (
    couple_id IN (
      SELECT id FROM couples WHERE 
      (partner_1_id IN (SELECT id FROM users WHERE auth_id = auth.uid())) OR
      (partner_2_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
    )
  );

-- Support staff access for crisis and consent management
CREATE POLICY "consent_records_support" ON user_consent_records
  FOR SELECT USING (public.is_support());

CREATE POLICY "invitations_support" ON couple_invitations
  FOR SELECT USING (public.is_support());

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Updated at triggers
CREATE TRIGGER update_consent_versions_updated_at BEFORE UPDATE ON consent_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_consent_records_updated_at BEFORE UPDATE ON user_consent_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_couple_invitations_updated_at BEFORE UPDATE ON couple_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_partner_safety_discussions_updated_at BEFORE UPDATE ON partner_safety_discussions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL CONSENT VERSIONS
-- ============================================================================

-- Insert initial consent versions
INSERT INTO consent_versions (
  version_number, version_name, effective_date, consent_type, legal_basis,
  consent_text, explanation_text, consequences_of_refusal
) VALUES
-- Safety monitoring consent
('1.0', 'Initial Safety Monitoring Consent', CURRENT_DATE, 'safety_monitoring', 'consent',
 'I consent to Sparq Connection analyzing my communications to detect potential safety concerns and provide appropriate resources when needed.',
 'We use AI to scan your messages for signs of emotional distress, crisis situations, or safety concerns. When detected, we provide resources and may connect you with professional help. This helps ensure your wellbeing and safety.',
 'Without safety monitoring, we cannot provide proactive safety support or crisis intervention resources.'),

-- AI content analysis
('1.1', 'AI Content Analysis Consent', CURRENT_DATE, 'ai_content_analysis', 'consent',
 'I consent to AI analysis of my communications to provide personalized relationship insights and recommendations.',
 'Our AI analyzes your conversations to understand communication patterns and provide personalized suggestions for relationship improvement. This analysis is used to create insights and recommendations tailored to your relationship.',
 'Without AI analysis, you will receive only generic relationship guidance rather than personalized insights.'),

-- Crisis intervention
('1.2', 'Crisis Intervention Consent', CURRENT_DATE, 'crisis_intervention', 'vital_interests',
 'I understand that in crisis situations, Sparq Connection may escalate my case to licensed professionals and emergency resources as needed for my safety.',
 'If our safety monitoring detects serious concerns like self-harm, domestic violence, or mental health crises, we may contact appropriate professionals or emergency services to ensure your safety.',
 'Crisis intervention operates under vital interests - this cannot be opted out of for safety reasons.'),

-- Professional referral
('1.3', 'Professional Referral Consent', CURRENT_DATE, 'professional_referral', 'consent',
 'I consent to being matched with and referred to licensed mental health professionals when appropriate.',
 'When our assessments suggest you could benefit from professional support, we can match you with licensed therapists and counselors in your area who specialize in relationship issues.',
 'Without professional referral consent, we cannot connect you with licensed therapists even when it would be beneficial.')
ON CONFLICT (version_number) DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authentication functions
GRANT EXECUTE ON FUNCTION create_couple_invitation(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_user_consent(UUID, TEXT, BOOLEAN, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_user_jurisdiction(UUID, INET, TEXT, TEXT) TO service_role;

-- Grant table access to authenticated users (controlled by RLS)
GRANT SELECT ON consent_versions TO authenticated;
GRANT ALL ON user_consent_records TO authenticated;
GRANT ALL ON couple_invitations TO authenticated;
GRANT SELECT ON privacy_preference_changes TO authenticated;
GRANT SELECT ON user_location_history TO authenticated;
GRANT SELECT ON user_sessions TO authenticated;
GRANT ALL ON partner_safety_discussions TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE consent_versions IS 'Versioned consent forms with legal basis and regulatory compliance';
COMMENT ON TABLE user_consent_records IS 'Complete audit trail of user consent with versioning and granular permissions';
COMMENT ON TABLE couple_invitations IS 'Secure invitation system for couple linking with safety consent integration';
COMMENT ON TABLE privacy_preference_changes IS 'Audit trail of all privacy preference modifications';
COMMENT ON TABLE user_location_history IS 'Jurisdiction detection history for compliance and localization';
COMMENT ON TABLE user_sessions IS 'Enhanced session management with security and crisis context';
COMMENT ON TABLE partner_safety_discussions IS 'Track safety discussions between partners for transparency';

COMMENT ON FUNCTION create_couple_invitation IS 'Create secure couple invitation with time-limited access';
COMMENT ON FUNCTION record_user_consent IS 'Record user consent with versioning and comprehensive audit trail';
COMMENT ON FUNCTION detect_user_jurisdiction IS 'Detect and record user jurisdiction for compliance and resource localization';