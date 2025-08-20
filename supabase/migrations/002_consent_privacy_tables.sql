-- Sparq Connection V4: Consent and Privacy Management
-- Migration 002: Consent, Privacy, and Compliance Tables
-- Purpose: GDPR/PIPEDA compliance and granular consent management

-- ============================================================================
-- CONSENT MANAGEMENT TABLES
-- ============================================================================

-- User Consents: Granular permission tracking
CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Consent Categories
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'terms_of_service',
    'privacy_policy', 
    'data_processing',
    'analytics_collection',
    'safety_monitoring',
    'crisis_intervention',
    'professional_sharing',
    'research_participation',
    'marketing_communications',
    'partner_data_sharing',
    'ai_content_analysis',
    'automated_recommendations'
  )),
  
  -- Consent Details
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  
  -- Consent Context
  consent_method TEXT CHECK (consent_method IN ('explicit_opt_in', 'implicit_acceptance', 'renewal', 'withdrawal')) NOT NULL,
  consent_source TEXT CHECK (consent_source IN ('web', 'mobile', 'api', 'support_ticket', 'email')) DEFAULT 'web',
  ip_address INET, -- For audit trail
  user_agent TEXT, -- For audit trail
  
  -- Legal Basis (GDPR Article 6)
  legal_basis TEXT CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
  
  -- Consent Scope and Limitations
  data_categories JSONB DEFAULT '[]'::jsonb, -- What data this consent covers
  processing_purposes JSONB DEFAULT '[]'::jsonb, -- Why data is processed
  retention_period TEXT, -- How long data is kept
  third_party_sharing BOOLEAN DEFAULT false,
  
  -- Audit and Compliance
  consent_version TEXT NOT NULL, -- Version of consent text accepted
  regulatory_basis TEXT CHECK (regulatory_basis IN ('GDPR', 'PIPEDA', 'CCPA', 'internal_policy')) DEFAULT 'GDPR',
  
  -- Active consent constraint
  CONSTRAINT user_consents_active_unique UNIQUE (user_id, consent_type) DEFERRABLE INITIALLY DEFERRED
);

-- Privacy Preferences: Detailed data sharing controls
CREATE TABLE privacy_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Data Collection Preferences
  collect_usage_analytics BOOLEAN DEFAULT true,
  collect_performance_metrics BOOLEAN DEFAULT true,
  collect_error_logs BOOLEAN DEFAULT true,
  collect_interaction_patterns BOOLEAN DEFAULT false,
  
  -- Data Sharing Preferences
  share_anonymized_research BOOLEAN DEFAULT false,
  share_aggregated_insights BOOLEAN DEFAULT true,
  share_with_partner BOOLEAN DEFAULT true,
  share_crisis_information BOOLEAN DEFAULT true,
  
  -- Content Analysis Preferences
  ai_content_analysis_enabled BOOLEAN DEFAULT true,
  sentiment_analysis_enabled BOOLEAN DEFAULT true,
  crisis_detection_enabled BOOLEAN DEFAULT true,
  recommendation_personalization BOOLEAN DEFAULT true,
  
  -- Communication Preferences
  receive_wellness_tips BOOLEAN DEFAULT true,
  receive_research_updates BOOLEAN DEFAULT false,
  receive_feature_announcements BOOLEAN DEFAULT true,
  receive_safety_alerts BOOLEAN DEFAULT true,
  
  -- Data Retention Preferences
  auto_delete_old_messages BOOLEAN DEFAULT false,
  message_retention_days INTEGER DEFAULT 365,
  auto_delete_assessments BOOLEAN DEFAULT false,
  assessment_retention_days INTEGER DEFAULT 730,
  
  -- Export and Portability
  data_export_format TEXT CHECK (data_export_format IN ('json', 'csv', 'pdf', 'xml')) DEFAULT 'json',
  include_partner_data_in_export BOOLEAN DEFAULT false,
  
  -- Third-Party Integrations
  allow_therapist_integration BOOLEAN DEFAULT false,
  allow_calendar_integration BOOLEAN DEFAULT false,
  allow_health_app_integration BOOLEAN DEFAULT false,
  
  UNIQUE(user_id)
);

-- Data Subject Requests: GDPR/PIPEDA compliance tracking
CREATE TABLE data_subject_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Request Details
  request_type TEXT NOT NULL CHECK (request_type IN (
    'access', -- Article 15: Right of access
    'rectification', -- Article 16: Right to rectification  
    'erasure', -- Article 17: Right to erasure ('right to be forgotten')
    'restrict_processing', -- Article 18: Right to restriction of processing
    'data_portability', -- Article 20: Right to data portability
    'object_processing', -- Article 21: Right to object
    'withdraw_consent', -- Withdraw consent for processing
    'complaint' -- Data protection complaint
  )),
  
  -- Request Status and Processing
  status TEXT CHECK (status IN ('submitted', 'in_review', 'processing', 'completed', 'rejected', 'partially_completed')) DEFAULT 'submitted',
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  
  -- Request Description and Details
  description TEXT NOT NULL,
  data_categories_requested JSONB DEFAULT '[]'::jsonb,
  date_range_start DATE,
  date_range_end DATE,
  
  -- Processing Information
  assigned_to_staff_id UUID, -- Internal staff member handling request
  estimated_completion_date DATE,
  actual_completion_date DATE,
  
  -- Response and Resolution
  response_summary TEXT,
  actions_taken JSONB DEFAULT '[]'::jsonb,
  data_provided_location TEXT, -- Where exported data was provided
  rejection_reason TEXT,
  
  -- Compliance Tracking
  regulatory_deadline DATE, -- Legal deadline for response
  response_time_hours INTEGER, -- Actual response time
  complied_with_deadline BOOLEAN,
  
  -- Communication Log
  communication_log JSONB DEFAULT '[]'::jsonb, -- Log of all communications with user
  
  -- Audit Trail
  request_source TEXT CHECK (request_source IN ('web_form', 'email', 'phone', 'letter', 'in_person')) DEFAULT 'web_form',
  verification_method TEXT CHECK (verification_method IN ('email_verification', 'identity_document', 'security_questions', 'two_factor_auth')),
  verified_at TIMESTAMPTZ,
  
  -- Internal Processing Notes
  internal_notes TEXT,
  requires_legal_review BOOLEAN DEFAULT false,
  legal_review_completed_at TIMESTAMPTZ
);

-- Consent Audit Log: Immutable consent change history
CREATE TABLE consent_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Reference Information
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_id UUID REFERENCES user_consents(id) ON DELETE SET NULL,
  
  -- Action Details
  action_type TEXT NOT NULL CHECK (action_type IN ('granted', 'revoked', 'renewed', 'modified', 'expired')),
  consent_type TEXT NOT NULL,
  
  -- Previous and New Values
  previous_value JSONB,
  new_value JSONB,
  
  -- Context Information
  action_source TEXT CHECK (action_source IN ('user_action', 'system_action', 'admin_action', 'automatic_expiry')),
  triggered_by_user_id UUID REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  
  -- Legal and Compliance Context
  legal_basis TEXT,
  regulatory_context TEXT,
  
  -- System Information
  application_version TEXT,
  processing_notes TEXT
);

-- Data Processing Activities: Record of processing under GDPR Article 30
CREATE TABLE data_processing_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Activity Identification
  activity_name TEXT NOT NULL,
  activity_description TEXT NOT NULL,
  processing_purpose TEXT NOT NULL,
  
  -- Data Categories
  data_categories JSONB NOT NULL, -- Types of personal data processed
  data_subjects JSONB NOT NULL, -- Categories of data subjects
  
  -- Legal Basis
  legal_basis TEXT NOT NULL CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
  legitimate_interests_assessment TEXT, -- Required if legal_basis = 'legitimate_interests'
  
  -- Recipients and Transfers
  recipients JSONB DEFAULT '[]'::jsonb, -- Who receives the data
  third_country_transfers JSONB DEFAULT '[]'::jsonb, -- International transfers
  
  -- Retention and Security
  retention_period TEXT NOT NULL,
  security_measures JSONB NOT NULL,
  
  -- Data Protection Impact Assessment
  dpia_required BOOLEAN DEFAULT false,
  dpia_reference TEXT,
  dpia_completed_at TIMESTAMPTZ,
  
  -- Status and Review
  is_active BOOLEAN DEFAULT true,
  last_reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  next_review_date DATE,
  
  -- Compliance Officer Information
  data_controller TEXT NOT NULL,
  data_protection_officer_contact TEXT,
  
  -- Documentation
  related_policies JSONB DEFAULT '[]'::jsonb,
  documentation_location TEXT
);

-- Privacy Impact Assessments: Track privacy assessments for features
CREATE TABLE privacy_impact_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Assessment Identification
  assessment_name TEXT NOT NULL,
  feature_or_process TEXT NOT NULL,
  assessment_type TEXT CHECK (assessment_type IN ('PIA', 'DPIA', 'TIA', 'security_assessment')) NOT NULL,
  
  -- Assessment Details
  description TEXT NOT NULL,
  data_flows JSONB NOT NULL,
  privacy_risks JSONB NOT NULL,
  risk_mitigation_measures JSONB NOT NULL,
  
  -- Assessment Results
  overall_risk_level TEXT CHECK (overall_risk_level IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  residual_risk_level TEXT CHECK (residual_risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Approval and Review
  status TEXT CHECK (status IN ('draft', 'in_review', 'approved', 'rejected', 'requires_revision')) DEFAULT 'draft',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  
  -- Documentation
  stakeholders_consulted JSONB DEFAULT '[]'::jsonb,
  consultation_period_start DATE,
  consultation_period_end DATE,
  
  -- Ongoing Monitoring
  monitoring_requirements JSONB DEFAULT '[]'::jsonb,
  review_frequency TEXT,
  next_review_date DATE,
  
  -- Related Documentation
  related_policies JSONB DEFAULT '[]'::jsonb,
  supporting_documents JSONB DEFAULT '[]'::jsonb
);

-- ============================================================================
-- INDEXES FOR CONSENT AND PRIVACY TABLES
-- ============================================================================

-- User consents indexes
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX idx_user_consents_granted ON user_consents(granted, created_at);
CREATE INDEX idx_user_consents_active ON user_consents(user_id, consent_type) WHERE granted = true AND revoked_at IS NULL;

-- Privacy preferences indexes
CREATE INDEX idx_privacy_preferences_user_id ON privacy_preferences(user_id);

-- Data subject requests indexes
CREATE INDEX idx_data_subject_requests_user_id ON data_subject_requests(user_id);
CREATE INDEX idx_data_subject_requests_status ON data_subject_requests(status);
CREATE INDEX idx_data_subject_requests_type ON data_subject_requests(request_type);
CREATE INDEX idx_data_subject_requests_deadline ON data_subject_requests(regulatory_deadline) WHERE status IN ('submitted', 'in_review', 'processing');
CREATE INDEX idx_data_subject_requests_created ON data_subject_requests(created_at);

-- Consent audit log indexes
CREATE INDEX idx_consent_audit_log_user_id ON consent_audit_log(user_id);
CREATE INDEX idx_consent_audit_log_consent_id ON consent_audit_log(consent_id);
CREATE INDEX idx_consent_audit_log_created ON consent_audit_log(created_at);
CREATE INDEX idx_consent_audit_log_action ON consent_audit_log(action_type, consent_type);

-- Data processing activities indexes
CREATE INDEX idx_data_processing_activities_active ON data_processing_activities(is_active) WHERE is_active = true;
CREATE INDEX idx_data_processing_activities_review ON data_processing_activities(next_review_date) WHERE is_active = true;
CREATE INDEX idx_data_processing_activities_legal_basis ON data_processing_activities(legal_basis);

-- Privacy impact assessments indexes
CREATE INDEX idx_privacy_impact_assessments_status ON privacy_impact_assessments(status);
CREATE INDEX idx_privacy_impact_assessments_risk ON privacy_impact_assessments(overall_risk_level);
CREATE INDEX idx_privacy_impact_assessments_review ON privacy_impact_assessments(next_review_date);

-- ============================================================================
-- UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================================================

CREATE TRIGGER update_user_consents_updated_at BEFORE UPDATE ON user_consents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_privacy_preferences_updated_at BEFORE UPDATE ON privacy_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_subject_requests_updated_at BEFORE UPDATE ON data_subject_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_processing_activities_updated_at BEFORE UPDATE ON data_processing_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_privacy_impact_assessments_updated_at BEFORE UPDATE ON privacy_impact_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CONSENT MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to grant consent with audit trail
CREATE OR REPLACE FUNCTION grant_user_consent(
  p_user_id UUID,
  p_consent_type TEXT,
  p_consent_method TEXT DEFAULT 'explicit_opt_in',
  p_consent_source TEXT DEFAULT 'web',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_consent_version TEXT DEFAULT '1.0',
  p_legal_basis TEXT DEFAULT 'consent',
  p_data_categories JSONB DEFAULT '[]'::jsonb,
  p_processing_purposes JSONB DEFAULT '[]'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_consent_id UUID;
  v_existing_consent_id UUID;
BEGIN
  -- Check for existing consent
  SELECT id INTO v_existing_consent_id 
  FROM user_consents 
  WHERE user_id = p_user_id AND consent_type = p_consent_type AND granted = true AND revoked_at IS NULL;
  
  -- If existing consent found, revoke it first
  IF v_existing_consent_id IS NOT NULL THEN
    UPDATE user_consents 
    SET granted = false, revoked_at = NOW()
    WHERE id = v_existing_consent_id;
    
    -- Add audit log entry
    INSERT INTO consent_audit_log (user_id, consent_id, action_type, consent_type, 
                                   previous_value, new_value, action_source, ip_address, user_agent)
    VALUES (p_user_id, v_existing_consent_id, 'revoked', p_consent_type,
            jsonb_build_object('granted', true), jsonb_build_object('granted', false),
            'system_action', p_ip_address, p_user_agent);
  END IF;
  
  -- Create new consent record
  INSERT INTO user_consents (
    user_id, consent_type, granted, granted_at, consent_method, consent_source,
    ip_address, user_agent, legal_basis, data_categories, processing_purposes, consent_version
  ) VALUES (
    p_user_id, p_consent_type, true, NOW(), p_consent_method, p_consent_source,
    p_ip_address, p_user_agent, p_legal_basis, p_data_categories, p_processing_purposes, p_consent_version
  ) RETURNING id INTO v_consent_id;
  
  -- Add audit log entry
  INSERT INTO consent_audit_log (user_id, consent_id, action_type, consent_type,
                                 new_value, action_source, ip_address, user_agent, legal_basis)
  VALUES (p_user_id, v_consent_id, 'granted', p_consent_type,
          jsonb_build_object('granted', true, 'method', p_consent_method, 'version', p_consent_version),
          'user_action', p_ip_address, p_user_agent, p_legal_basis);
  
  RETURN v_consent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke consent with audit trail
CREATE OR REPLACE FUNCTION revoke_user_consent(
  p_user_id UUID,
  p_consent_type TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_revocation_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_consent_id UUID;
  v_rows_affected INTEGER;
BEGIN
  -- Find active consent
  SELECT id INTO v_consent_id
  FROM user_consents
  WHERE user_id = p_user_id AND consent_type = p_consent_type AND granted = true AND revoked_at IS NULL;
  
  IF v_consent_id IS NULL THEN
    RETURN false; -- No active consent found
  END IF;
  
  -- Revoke the consent
  UPDATE user_consents
  SET granted = false, revoked_at = NOW()
  WHERE id = v_consent_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  -- Add audit log entry
  INSERT INTO consent_audit_log (user_id, consent_id, action_type, consent_type,
                                 previous_value, new_value, action_source, ip_address, user_agent, processing_notes)
  VALUES (p_user_id, v_consent_id, 'revoked', p_consent_type,
          jsonb_build_object('granted', true), jsonb_build_object('granted', false),
          'user_action', p_ip_address, p_user_agent, p_revocation_reason);
  
  RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific consent
CREATE OR REPLACE FUNCTION has_user_consent(
  p_user_id UUID,
  p_consent_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_consents
    WHERE user_id = p_user_id 
    AND consent_type = p_consent_type 
    AND granted = true 
    AND revoked_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_impact_assessments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_consents IS 'Granular consent tracking for GDPR/PIPEDA compliance';
COMMENT ON COLUMN user_consents.legal_basis IS 'GDPR Article 6 legal basis for processing';
COMMENT ON FUNCTION grant_user_consent IS 'Securely grant user consent with full audit trail';
COMMENT ON FUNCTION revoke_user_consent IS 'Securely revoke user consent with audit trail';
COMMENT ON FUNCTION has_user_consent IS 'Check if user has granted specific consent';

COMMENT ON TABLE privacy_preferences IS 'Detailed user privacy and data sharing preferences';
COMMENT ON TABLE data_subject_requests IS 'GDPR Article 15-21 data subject rights requests';
COMMENT ON TABLE consent_audit_log IS 'Immutable audit trail of all consent changes';
COMMENT ON TABLE data_processing_activities IS 'GDPR Article 30 record of processing activities';
COMMENT ON TABLE privacy_impact_assessments IS 'Privacy impact assessments for new features and processes';