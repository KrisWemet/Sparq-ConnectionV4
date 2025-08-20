-- Sparq Connection V4: Audit Log and Compliance Infrastructure
-- Migration 004: Audit trails, assessment systems, and compliance automation
-- Purpose: Complete audit infrastructure and assessment tracking

-- ============================================================================
-- AUDIT AND LOGGING TABLES
-- ============================================================================

-- Comprehensive Audit Log: Immutable activity tracking for compliance
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- User and context
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Allow orphaned logs for deleted users
  staff_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Staff member who performed action
  
  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'user_login', 'user_logout', 'profile_update', 'password_change',
    'couple_invite', 'couple_join', 'couple_leave', 
    'assessment_start', 'assessment_complete', 'goal_create', 'goal_update',
    'crisis_detected', 'crisis_intervention', 'safety_escalation',
    'consent_granted', 'consent_revoked', 'privacy_change',
    'data_export', 'data_delete', 'account_deactivate',
    'admin_access', 'support_access', 'emergency_access',
    'payment_processed', 'subscription_change'
  )),
  
  -- Resource information
  resource_type TEXT CHECK (resource_type IN (
    'user_profile', 'couple_record', 'assessment', 'crisis_event', 
    'consent_record', 'payment', 'subscription', 'safety_profile'
  )),
  resource_id UUID, -- ID of affected resource
  
  -- Action details and context
  details JSONB DEFAULT '{}'::jsonb, -- Structured action details
  old_values JSONB, -- Previous values for updates
  new_values JSONB, -- New values for updates
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  request_id UUID, -- For tracing related actions
  
  -- Compliance and legal
  regulatory_context TEXT CHECK (regulatory_context IN ('GDPR', 'PIPEDA', 'CCPA', 'internal')),
  retention_required_until DATE, -- Legal hold if needed
  
  -- Security and integrity
  action_hash TEXT, -- Hash of action details for integrity verification
  previous_log_hash TEXT, -- Reference to previous log entry for chain integrity
  
  -- Metadata
  application_version TEXT,
  environment TEXT CHECK (environment IN ('production', 'staging', 'development')) DEFAULT 'production'
);

-- Assessment Responses: Individual answers to assessment questions
-- NOTE: This table will be created in migration 007 after self_report_measures exists
/*
CREATE TABLE assessment_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Response context
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  measure_id UUID NOT NULL REFERENCES self_report_measures(id) ON DELETE CASCADE,
  
  -- Assessment session
  assessment_session_id UUID NOT NULL, -- Groups responses from one assessment session
  
  -- Question and response
  question_id TEXT NOT NULL, -- Question identifier from measure JSON
  question_text_hash TEXT NOT NULL, -- Hash of question text for integrity
  response_value JSONB NOT NULL, -- User's response (various formats)
  response_text TEXT, -- Free-text responses if applicable
  
  -- Response metadata
  response_time_seconds INTEGER, -- How long user took to answer
  confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5), -- User's confidence in answer
  
  -- Privacy and consent
  sharing_consent BOOLEAN DEFAULT true, -- Consent to share with partner
  research_consent BOOLEAN DEFAULT false, -- Consent for research use
  
  -- Quality and validation
  flagged_for_review BOOLEAN DEFAULT false,
  review_reason TEXT,
  reviewed_by_staff_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Soft delete and retention
  deleted_at TIMESTAMPTZ,
  deletion_reason TEXT
);
*/

-- Assessment Results: Computed scores and interpretations
-- NOTE: This table will be created in migration 007 after self_report_measures exists
/*
CREATE TABLE assessment_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Result context
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  measure_id UUID NOT NULL REFERENCES self_report_measures(id) ON DELETE CASCADE,
  assessment_session_id UUID NOT NULL, -- Same session as responses
  
  -- Computed results
  raw_score DECIMAL(10,4), -- Raw calculated score
  standardized_score DECIMAL(10,4), -- Normalized score if applicable
  percentile_rank INTEGER CHECK (percentile_rank >= 0 AND percentile_rank <= 100),
  
  -- Interpretation (educational only)
  interpretation_category TEXT, -- e.g., "high_satisfaction", "needs_attention"
  interpretation_text TEXT NOT NULL, -- Educational interpretation
  growth_recommendations JSONB DEFAULT '[]'::jsonb, -- Suggestions for improvement
  
  -- Comparative context (anonymized)
  peer_comparison_percentile INTEGER, -- Compared to anonymous peer group
  historical_comparison TEXT, -- Compared to user's previous results
  
  -- Couple dynamics (if applicable)
  partner_score_difference DECIMAL(10,4), -- Difference from partner's score
  couple_compatibility_indicators JSONB DEFAULT '{}'::jsonb,
  
  -- Educational resources
  recommended_content JSONB DEFAULT '[]'::jsonb, -- Content suggestions
  suggested_exercises JSONB DEFAULT '[]'::jsonb, -- Relationship exercises
  
  -- Quality and validation
  result_confidence DECIMAL(3,2) CHECK (result_confidence >= 0 AND result_confidence <= 1),
  algorithm_version TEXT DEFAULT '1.0',
  human_reviewed BOOLEAN DEFAULT false,
  
  -- Privacy and sharing
  shared_with_partner BOOLEAN DEFAULT false,
  partner_viewed_at TIMESTAMPTZ,
  
  -- Disclaimer and context
  educational_disclaimer TEXT DEFAULT 'This assessment is for educational and wellness purposes only. It is not a clinical diagnosis or therapeutic advice.',
  
  UNIQUE(user_id, measure_id, assessment_session_id)
);
*/

-- Professional Contacts: Network of licensed professionals for referrals
CREATE TABLE professional_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Professional identification
  professional_name TEXT NOT NULL,
  professional_type TEXT CHECK (professional_type IN (
    'licensed_therapist', 'couples_therapist', 'crisis_counselor', 
    'social_worker', 'psychiatrist', 'psychologist', 'family_counselor',
    'domestic_violence_advocate', 'substance_abuse_counselor'
  )) NOT NULL,
  
  -- Credentials and licensing
  license_number_encrypted TEXT, -- Encrypted license info
  license_type TEXT,
  license_state_province TEXT,
  license_expiry_date DATE,
  license_verified BOOLEAN DEFAULT false,
  
  -- Contact information (encrypted)
  contact_info_encrypted TEXT NOT NULL, -- Encrypted contact details
  practice_name TEXT,
  practice_address_encrypted TEXT,
  
  -- Specializations and approach
  specializations JSONB DEFAULT '[]'::jsonb,
  therapy_approaches JSONB DEFAULT '[]'::jsonb,
  crisis_experience_level TEXT CHECK (crisis_experience_level IN ('basic', 'intermediate', 'expert', 'specialized')),
  
  -- Availability and capacity
  accepts_crisis_referrals BOOLEAN DEFAULT true,
  current_capacity_level TEXT CHECK (current_capacity_level IN ('full', 'limited', 'available', 'unknown')),
  response_time_hours INTEGER, -- Expected response time for crisis referrals
  
  -- Service details
  languages_spoken JSONB DEFAULT '["en"]'::jsonb,
  insurance_accepted JSONB DEFAULT '[]'::jsonb,
  sliding_scale_available BOOLEAN DEFAULT false,
  telehealth_available BOOLEAN DEFAULT false,
  
  -- Geographic coverage
  serves_jurisdiction_ids JSONB DEFAULT '[]'::jsonb, -- References jurisdiction IDs
  service_radius_miles INTEGER,
  
  -- Quality and verification
  verified_by_staff_id UUID REFERENCES users(id),
  verification_date DATE,
  last_contact_date DATE,
  referral_success_rate DECIMAL(5,2),
  
  -- Partnership details
  referral_agreement_signed BOOLEAN DEFAULT false,
  partnership_tier TEXT CHECK (partnership_tier IN ('preferred', 'standard', 'emergency_only')),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  inactive_reason TEXT,
  
  -- Internal notes (not shared with users)
  internal_notes TEXT
);

-- Professional Referrals: Track referral outcomes
CREATE TABLE professional_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Referral context
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_contacts(id),
  crisis_escalation_id UUID, -- REFERENCES crisis_escalations(id) - foreign key will be added in migration 006
  safety_signal_id UUID, -- REFERENCES safety_risk_signals(id) - foreign key will be added in migration 006
  
  -- Referral details
  referral_reason TEXT NOT NULL,
  urgency_level TEXT CHECK (urgency_level IN ('routine', 'elevated', 'urgent', 'emergency')) NOT NULL,
  referral_type TEXT CHECK (referral_type IN ('crisis_intervention', 'ongoing_therapy', 'couples_therapy', 'assessment', 'consultation')),
  
  -- Professional response
  professional_contacted_at TIMESTAMPTZ,
  professional_response_time_hours INTEGER,
  professional_accepted BOOLEAN,
  rejection_reason TEXT,
  
  -- User engagement
  user_contacted_professional BOOLEAN DEFAULT false,
  first_appointment_scheduled BOOLEAN DEFAULT false,
  first_appointment_date DATE,
  
  -- Outcome tracking
  referral_status TEXT CHECK (referral_status IN (
    'initiated', 'professional_contacted', 'accepted', 'rejected', 
    'user_contacted', 'appointment_scheduled', 'services_commenced', 
    'services_completed', 'discontinued', 'no_response'
  )) DEFAULT 'initiated',
  
  outcome_category TEXT CHECK (outcome_category IN (
    'successful_engagement', 'partial_engagement', 'no_engagement', 
    'inappropriate_referral', 'crisis_resolved', 'ongoing_care'
  )),
  
  -- Follow-up and closure
  follow_up_required BOOLEAN DEFAULT true,
  next_follow_up_date DATE,
  case_closed_at TIMESTAMPTZ,
  closure_reason TEXT,
  
  -- Quality metrics
  user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating >= 1 AND user_satisfaction_rating <= 5),
  professional_feedback TEXT,
  
  -- Privacy and consent
  consent_to_contact_obtained BOOLEAN DEFAULT false,
  consent_details JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- INDEXES FOR AUDIT AND ASSESSMENT TABLES
-- ============================================================================

-- Audit log indexes (optimized for queries and compliance)
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_action_type ON audit_log(action_type, created_at DESC);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_ip_address ON audit_log(ip_address, created_at) WHERE ip_address IS NOT NULL;
CREATE INDEX idx_audit_log_regulatory ON audit_log(regulatory_context) WHERE regulatory_context IS NOT NULL;
CREATE INDEX idx_audit_log_retention ON audit_log(retention_required_until) WHERE retention_required_until IS NOT NULL;

-- Assessment responses indexes (commented out - table moved to migration 007)
-- CREATE INDEX idx_assessment_responses_user_id ON assessment_responses(user_id, created_at DESC);
-- CREATE INDEX idx_assessment_responses_session ON assessment_responses(assessment_session_id);
-- CREATE INDEX idx_assessment_responses_measure ON assessment_responses(measure_id);
-- CREATE INDEX idx_assessment_responses_couple ON assessment_responses(couple_id) WHERE couple_id IS NOT NULL;
-- CREATE INDEX idx_assessment_responses_flagged ON assessment_responses(flagged_for_review, created_at) WHERE flagged_for_review = true;

-- Assessment results indexes (commented out - table moved to migration 007)
-- CREATE INDEX idx_assessment_results_user_id ON assessment_results(user_id, created_at DESC);
-- CREATE INDEX idx_assessment_results_couple ON assessment_results(couple_id) WHERE couple_id IS NOT NULL;
-- CREATE INDEX idx_assessment_results_measure ON assessment_results(measure_id);
-- CREATE INDEX idx_assessment_results_session ON assessment_results(assessment_session_id);
-- CREATE INDEX idx_assessment_results_shared ON assessment_results(shared_with_partner) WHERE shared_with_partner = true;

-- Professional contacts indexes
CREATE INDEX idx_professional_contacts_type ON professional_contacts(professional_type);
CREATE INDEX idx_professional_contacts_active ON professional_contacts(is_active) WHERE is_active = true;
CREATE INDEX idx_professional_contacts_crisis ON professional_contacts(accepts_crisis_referrals) WHERE accepts_crisis_referrals = true;
CREATE INDEX idx_professional_contacts_capacity ON professional_contacts(current_capacity_level);
CREATE INDEX idx_professional_contacts_verified ON professional_contacts(license_verified, verification_date);

-- Professional referrals indexes
CREATE INDEX idx_professional_referrals_user_id ON professional_referrals(user_id);
CREATE INDEX idx_professional_referrals_professional ON professional_referrals(professional_id);
CREATE INDEX idx_professional_referrals_status ON professional_referrals(referral_status);
CREATE INDEX idx_professional_referrals_urgency ON professional_referrals(urgency_level, created_at);
CREATE INDEX idx_professional_referrals_follow_up ON professional_referrals(next_follow_up_date) WHERE follow_up_required = true;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- CREATE TRIGGER update_assessment_responses_updated_at BEFORE UPDATE ON assessment_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); -- Table moved to migration 007
-- CREATE TRIGGER update_assessment_results_updated_at BEFORE UPDATE ON assessment_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); -- Table moved to migration 007
CREATE TRIGGER update_professional_contacts_updated_at BEFORE UPDATE ON professional_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_professional_referrals_updated_at BEFORE UPDATE ON professional_referrals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUDIT LOG FUNCTIONS
-- ============================================================================

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_regulatory_context TEXT DEFAULT 'internal'
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_current_hash TEXT;
  v_previous_hash TEXT;
BEGIN
  -- Get the hash of the most recent audit log entry
  SELECT action_hash INTO v_previous_hash 
  FROM audit_log 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Create hash for current entry
  v_current_hash := encode(
    digest(
      COALESCE(p_user_id::text, '') || 
      COALESCE(p_action_type, '') || 
      COALESCE(p_resource_type, '') || 
      COALESCE(p_resource_id::text, '') ||
      COALESCE(p_details::text, '') ||
      NOW()::text,
      'sha256'
    ),
    'hex'
  );
  
  -- Insert audit log entry
  INSERT INTO audit_log (
    user_id, action_type, resource_type, resource_id, details,
    old_values, new_values, ip_address, user_agent, session_id,
    regulatory_context, action_hash, previous_log_hash, 
    application_version, environment
  ) VALUES (
    p_user_id, p_action_type, p_resource_type, p_resource_id, p_details,
    p_old_values, p_new_values,
    inet_client_addr(),
    current_setting('request.headers.user-agent', true),
    current_setting('request.jwt.claims', true)::jsonb ->> 'session_id',
    p_regulatory_context, v_current_hash, v_previous_hash,
    current_setting('app.version', true),
    current_setting('app.environment', true)
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate audit log integrity
CREATE OR REPLACE FUNCTION validate_audit_log_integrity(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE(
  entry_id UUID,
  created_at TIMESTAMPTZ,
  integrity_status TEXT,
  details TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH audit_chain AS (
    SELECT 
      id,
      created_at,
      action_hash,
      previous_log_hash,
      LAG(action_hash) OVER (ORDER BY created_at) as expected_previous_hash
    FROM audit_log
    WHERE created_at BETWEEN p_start_date AND p_end_date
    ORDER BY created_at
  )
  SELECT 
    ac.id,
    ac.created_at,
    CASE 
      WHEN ac.previous_log_hash = ac.expected_previous_hash OR ac.expected_previous_hash IS NULL THEN 'VALID'
      ELSE 'INVALID'
    END as integrity_status,
    CASE 
      WHEN ac.previous_log_hash = ac.expected_previous_hash OR ac.expected_previous_hash IS NULL THEN 'Chain integrity verified'
      ELSE 'Hash chain broken - potential tampering detected'
    END as details
  FROM audit_chain ac;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ASSESSMENT WORKFLOW FUNCTIONS
-- ============================================================================

-- Assessment workflow functions (commented out - tables moved to migration 007)
-- These will be recreated in migration 007 after the required tables exist

/*
-- Function to start new assessment session
CREATE OR REPLACE FUNCTION start_assessment_session(
  p_user_id UUID,
  p_measure_id UUID,
  p_couple_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_measure_name TEXT;
BEGIN
  -- Generate session ID
  v_session_id := uuid_generate_v4();
  
  -- Get measure name for audit log
  SELECT measure_name INTO v_measure_name 
  FROM self_report_measures 
  WHERE id = p_measure_id;
  
  -- Create audit log entry
  PERFORM create_audit_log(
    p_user_id,
    'assessment_start',
    'assessment',
    v_session_id,
    jsonb_build_object(
      'measure_id', p_measure_id,
      'measure_name', v_measure_name,
      'couple_id', p_couple_id,
      'session_id', v_session_id
    )
  );
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete assessment and calculate results
CREATE OR REPLACE FUNCTION complete_assessment_session(
  p_session_id UUID,
  p_user_id UUID,
  p_measure_id UUID
) RETURNS UUID AS $$
DECLARE
  v_result_id UUID;
  v_raw_score DECIMAL(10,4);
  v_interpretation TEXT;
  v_response_count INTEGER;
BEGIN
  -- Count responses for this session
  SELECT COUNT(*) INTO v_response_count
  FROM assessment_responses
  WHERE assessment_session_id = p_session_id
  AND user_id = p_user_id;
  
  -- Calculate basic raw score (this would be measure-specific)
  -- For now, this is a placeholder - real implementation would use
  -- the scoring algorithm from self_report_measures table
  SELECT AVG(CAST(response_value->>'score' AS DECIMAL)) INTO v_raw_score
  FROM assessment_responses
  WHERE assessment_session_id = p_session_id
  AND user_id = p_user_id
  AND response_value ? 'score';
  
  -- Generate basic interpretation (would be more sophisticated)
  v_interpretation := CASE 
    WHEN v_raw_score >= 80 THEN 'Your responses indicate strong wellness in this area. Continue building on these positive patterns.'
    WHEN v_raw_score >= 60 THEN 'Your responses show moderate wellness with room for growth. Consider exploring the recommended resources.'
    WHEN v_raw_score >= 40 THEN 'Your responses suggest some areas for attention. The suggested exercises may be helpful.'
    ELSE 'Your responses indicate this area could benefit from focused attention. Consider professional resources.'
  END;
  
  -- Insert assessment result
  INSERT INTO assessment_results (
    user_id, measure_id, assessment_session_id,
    raw_score, interpretation_text,
    result_confidence, algorithm_version
  ) VALUES (
    p_user_id, p_measure_id, p_session_id,
    v_raw_score, v_interpretation,
    0.85, '1.0'
  ) RETURNING id INTO v_result_id;
  
  -- Create audit log entry
  PERFORM create_audit_log(
    p_user_id,
    'assessment_complete',
    'assessment',
    p_session_id,
    jsonb_build_object(
      'result_id', v_result_id,
      'response_count', v_response_count,
      'raw_score', v_raw_score
    )
  );
  
  RETURN v_result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY; -- Table moved to migration 007
-- ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY; -- Table moved to migration 007
ALTER TABLE professional_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_referrals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE audit_log IS 'Immutable audit trail for all user actions and system events with integrity verification';
COMMENT ON COLUMN audit_log.action_hash IS 'SHA-256 hash of action details for integrity verification';
COMMENT ON COLUMN audit_log.previous_log_hash IS 'Reference to previous log entry hash for blockchain-style integrity';

-- COMMENT ON TABLE assessment_responses IS 'Individual user responses to assessment questions with privacy controls'; -- Table moved to migration 007
-- COMMENT ON TABLE assessment_results IS 'Computed assessment scores and educational interpretations (non-clinical)'; -- Table moved to migration 007

COMMENT ON TABLE professional_contacts IS 'Network of verified licensed professionals for crisis referrals';
COMMENT ON COLUMN professional_contacts.contact_info_encrypted IS 'Encrypted professional contact details for crisis situations';

COMMENT ON TABLE professional_referrals IS 'Tracking of professional referrals and outcomes for quality assurance';

COMMENT ON FUNCTION create_audit_log IS 'Create audit log entry with integrity hash chain';
COMMENT ON FUNCTION validate_audit_log_integrity IS 'Validate audit log chain integrity for compliance';
-- COMMENT ON FUNCTION start_assessment_session IS 'Initialize new user assessment session'; -- Function moved to migration 007
-- COMMENT ON FUNCTION complete_assessment_session IS 'Calculate results and close assessment session'; -- Function moved to migration 007