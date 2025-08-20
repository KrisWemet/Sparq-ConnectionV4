-- Sparq Connection V4: Safety Monitoring and Crisis Intervention
-- Migration 005: Safety monitoring, crisis detection, and intervention tables
-- Purpose: Implement comprehensive safety monitoring for wellness/education context

-- ============================================================================
-- COMMUNICATION AND SAFETY TABLES
-- ============================================================================

-- Communication History: Encrypted-at-rest, server-readable for safety
CREATE TABLE communication_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Relationship context
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Message content (encrypted but server-readable for safety analysis)
  content_encrypted TEXT NOT NULL,
  content_hash TEXT, -- Hash for deduplication and integrity
  
  -- Message metadata
  message_type TEXT CHECK (message_type IN ('daily_prompt_response', 'assessment_answer', 'goal_update', 'free_form', 'crisis_contact')) DEFAULT 'free_form',
  prompt_id UUID, -- Reference to daily_prompts if applicable
  assessment_id UUID, -- Reference to assessments if applicable
  
  -- Safety analysis results
  safety_analyzed BOOLEAN DEFAULT false,
  safety_analysis_result JSONB, -- Results from AI safety analysis
  risk_score DECIMAL(3,2) CHECK (risk_score >= 0 AND risk_score <= 1),
  risk_level TEXT CHECK (risk_level IN ('safe', 'low', 'medium', 'high', 'critical')) DEFAULT 'safe',
  
  -- Crisis indicators detected
  crisis_indicators JSONB DEFAULT '[]'::jsonb,
  requires_intervention BOOLEAN DEFAULT false,
  intervention_triggered_at TIMESTAMPTZ,
  
  -- Processing status
  processed_by_ai BOOLEAN DEFAULT false,
  ai_analysis_version TEXT DEFAULT '1.0',
  
  -- Sharing and visibility
  shared_with_partner BOOLEAN DEFAULT true,
  visible_to_user BOOLEAN DEFAULT true,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id)
);

-- Partition communication_history by month for performance
-- This will be implemented after initial deployment
-- SELECT create_monthly_partitions('communication_history', 'created_at', 12);

-- Safety Risk Signals: Automated detection events with risk scores
CREATE TABLE safety_risk_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- User and context
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  
  -- Signal source and type
  signal_source TEXT CHECK (signal_source IN ('communication_analysis', 'assessment_response', 'user_report', 'pattern_analysis', 'manual_flag')) NOT NULL,
  signal_type TEXT CHECK (signal_type IN ('suicidal_ideation', 'domestic_violence', 'emotional_distress', 'substance_abuse', 'relationship_crisis', 'escalating_conflict', 'social_isolation')) NOT NULL,
  
  -- Risk assessment
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1) NOT NULL,
  
  -- Detection details
  detected_indicators JSONB NOT NULL,
  context_data JSONB DEFAULT '{}'::jsonb,
  source_content_id UUID, -- References communication_history, assessments, etc.
  
  -- Analysis metadata
  detection_model_version TEXT DEFAULT '1.0',
  analysis_timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Response and escalation
  escalation_level TEXT CHECK (escalation_level IN ('monitor', 'alert', 'intervene', 'emergency')) DEFAULT 'monitor',
  requires_human_review BOOLEAN DEFAULT false,
  human_reviewed BOOLEAN DEFAULT false,
  human_review_result TEXT,
  reviewed_by_staff_id UUID,
  reviewed_at TIMESTAMPTZ,
  
  -- False positive tracking
  is_false_positive BOOLEAN DEFAULT false,
  false_positive_reason TEXT,
  marked_false_positive_by UUID REFERENCES users(id),
  marked_false_positive_at TIMESTAMPTZ,
  
  -- Resolution tracking
  resolved BOOLEAN DEFAULT false,
  resolution_type TEXT CHECK (resolution_type IN ('no_action', 'resources_provided', 'professional_referral', 'emergency_contact', 'crisis_intervention')),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

-- Safety Interventions: Actions taken when risks are detected
CREATE TABLE safety_interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Target user and context
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  
  -- Trigger information
  triggered_by_signal_id UUID REFERENCES safety_risk_signals(id),
  intervention_type TEXT CHECK (intervention_type IN ('resource_provision', 'crisis_hotline', 'professional_referral', 'emergency_contact', 'safety_plan_activation', 'app_restriction', 'manual_outreach')) NOT NULL,
  
  -- Intervention details
  intervention_level TEXT CHECK (intervention_level IN ('low', 'medium', 'high', 'emergency')) NOT NULL,
  automated BOOLEAN DEFAULT true,
  triggered_by_staff_id UUID REFERENCES users(id),
  
  -- Actions taken
  actions_taken JSONB NOT NULL,
  resources_provided JSONB DEFAULT '[]'::jsonb,
  contacts_notified JSONB DEFAULT '[]'::jsonb,
  
  -- Timing and constraints
  immediate_action_required BOOLEAN DEFAULT false,
  action_deadline TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- User response and engagement
  user_notified BOOLEAN DEFAULT false,
  user_acknowledged BOOLEAN DEFAULT false,
  user_engagement_level TEXT CHECK (user_engagement_level IN ('none', 'minimal', 'engaged', 'resistant')),
  
  -- Outcome tracking
  effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
  follow_up_required BOOLEAN DEFAULT false,
  next_follow_up_date DATE,
  
  -- Status and resolution
  status TEXT CHECK (status IN ('initiated', 'in_progress', 'completed', 'escalated', 'cancelled')) DEFAULT 'initiated',
  resolution_summary TEXT,
  
  -- Professional involvement
  professional_contacted BOOLEAN DEFAULT false,
  professional_contact_details JSONB,
  professional_response_received BOOLEAN DEFAULT false
);

-- Safety Resources: Location-based crisis hotlines and support information
CREATE TABLE safety_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Resource identification
  resource_name TEXT NOT NULL,
  resource_type TEXT CHECK (resource_type IN ('crisis_hotline', 'domestic_violence_support', 'mental_health_service', 'substance_abuse_help', 'couples_therapy', 'emergency_service', 'online_support', 'chat_service')) NOT NULL,
  
  -- Contact information
  phone_number TEXT,
  text_number TEXT,
  website_url TEXT,
  email_address TEXT,
  
  -- Availability and access
  availability_hours TEXT, -- e.g., "24/7", "9am-5pm EST", "Weekdays only"
  languages_supported JSONB DEFAULT '["en"]'::jsonb,
  cost_structure TEXT CHECK (cost_structure IN ('free', 'insurance_based', 'sliding_scale', 'fee_for_service', 'unknown')) DEFAULT 'unknown',
  
  -- Geographic coverage
  country_code TEXT NOT NULL DEFAULT 'US',
  state_province TEXT,
  city TEXT,
  coverage_area TEXT, -- Description of geographic coverage
  
  -- Service details
  service_description TEXT NOT NULL,
  target_demographics JSONB DEFAULT '[]'::jsonb,
  crisis_types_supported JSONB DEFAULT '[]'::jsonb,
  
  -- Quality and verification
  verified BOOLEAN DEFAULT false,
  verification_date DATE,
  last_contact_verified DATE,
  reliability_rating INTEGER CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_recommended_at TIMESTAMPTZ,
  
  -- Content and display
  display_priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  internal_notes TEXT
);

-- Crisis Escalations: Professional intervention tracking
CREATE TABLE crisis_escalations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Crisis details
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  triggered_by_signal_id UUID REFERENCES safety_risk_signals(id),
  
  -- Escalation classification
  escalation_type TEXT CHECK (escalation_type IN ('immediate_danger', 'suicide_risk', 'domestic_violence', 'substance_crisis', 'mental_health_emergency', 'professional_referral')) NOT NULL,
  severity_level TEXT CHECK (severity_level IN ('medium', 'high', 'critical', 'emergency')) NOT NULL,
  
  -- Professional contact information
  professional_type TEXT CHECK (professional_type IN ('crisis_counselor', 'therapist', 'social_worker', 'law_enforcement', 'emergency_medical', 'domestic_violence_advocate')),
  professional_contacted BOOLEAN DEFAULT false,
  professional_contact_method TEXT,
  professional_response_time_minutes INTEGER,
  
  -- Escalation details
  escalation_reason TEXT NOT NULL,
  immediate_actions_taken JSONB NOT NULL,
  user_consent_obtained BOOLEAN DEFAULT false,
  consent_override_reason TEXT, -- For emergency situations where consent cannot be obtained
  
  -- Emergency contacts
  emergency_contacts_notified BOOLEAN DEFAULT false,
  emergency_contact_responses JSONB DEFAULT '[]'::jsonb,
  
  -- Legal and compliance
  mandatory_reporting_triggered BOOLEAN DEFAULT false,
  authorities_notified BOOLEAN DEFAULT false,
  legal_documentation JSONB DEFAULT '{}'::jsonb,
  
  -- Resolution and follow-up
  status TEXT CHECK (status IN ('initiated', 'professional_contacted', 'intervention_active', 'resolved', 'transferred', 'closed')) DEFAULT 'initiated',
  resolution_timestamp TIMESTAMPTZ,
  resolution_outcome TEXT,
  follow_up_required BOOLEAN DEFAULT true,
  follow_up_date DATE,
  
  -- Staff handling
  handled_by_staff_id UUID REFERENCES users(id),
  staff_notes TEXT,
  supervisor_notified BOOLEAN DEFAULT false,
  supervisor_approval_required BOOLEAN DEFAULT false,
  supervisor_approved_at TIMESTAMPTZ,
  
  -- Audit and review
  post_incident_review_completed BOOLEAN DEFAULT false,
  post_incident_review_date DATE,
  lessons_learned TEXT,
  process_improvements JSONB DEFAULT '[]'::jsonb
);

-- ============================================================================
-- RELATIONSHIP TOOLS TABLES
-- ============================================================================

-- Daily Prompts: AI-generated conversation starters with caching
CREATE TABLE daily_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Prompt content
  prompt_text TEXT NOT NULL,
  prompt_category TEXT CHECK (prompt_category IN ('communication', 'intimacy', 'goals', 'appreciation', 'conflict_resolution', 'fun', 'deep_connection', 'growth')) NOT NULL,
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'challenging')) DEFAULT 'medium',
  
  -- Targeting and personalization
  target_relationship_stage TEXT CHECK (target_relationship_stage IN ('new', 'established', 'long_term', 'any')) DEFAULT 'any',
  target_archetypes JSONB DEFAULT '[]'::jsonb,
  requires_both_partners BOOLEAN DEFAULT false,
  
  -- AI generation metadata
  generated_by_ai BOOLEAN DEFAULT true,
  ai_model_version TEXT DEFAULT '1.0',
  generation_prompt TEXT, -- The prompt used to generate this content
  human_reviewed BOOLEAN DEFAULT false,
  reviewed_by_staff_id UUID REFERENCES users(id),
  
  -- Quality and effectiveness
  quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  usage_count INTEGER DEFAULT 0,
  positive_feedback_count INTEGER DEFAULT 0,
  negative_feedback_count INTEGER DEFAULT 0,
  
  -- Content management
  is_active BOOLEAN DEFAULT true,
  seasonal_relevance TEXT, -- e.g., "holidays", "summer", "anniversary_season"
  content_warnings JSONB DEFAULT '[]'::jsonb,
  
  -- Caching and performance
  cache_expiry TIMESTAMPTZ,
  last_served_at TIMESTAMPTZ
);

-- Self Report Measures: Validated relationship scales (RAS/CSI, not clinical)
CREATE TABLE self_report_measures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Assessment identification
  measure_name TEXT NOT NULL,
  measure_type TEXT CHECK (measure_type IN ('relationship_satisfaction', 'communication_quality', 'conflict_resolution', 'intimacy_scale', 'trust_assessment', 'attachment_style', 'wellness_check')) NOT NULL,
  measure_version TEXT DEFAULT '1.0',
  
  -- Validated scale information
  is_validated_scale BOOLEAN DEFAULT true,
  validation_source TEXT, -- Research paper, organization, etc.
  psychometric_properties JSONB, -- Reliability, validity data
  
  -- Assessment content
  questions JSONB NOT NULL,
  scoring_algorithm JSONB NOT NULL,
  interpretation_guidelines JSONB,
  
  -- Target population and usage
  target_demographics JSONB DEFAULT '[]'::jsonb,
  recommended_frequency TEXT, -- e.g., "monthly", "quarterly", "as_needed"
  estimated_completion_minutes INTEGER,
  
  -- Educational context (not clinical)
  educational_purpose TEXT NOT NULL,
  wellness_focus_areas JSONB DEFAULT '[]'::jsonb,
  growth_categories JSONB DEFAULT '[]'::jsonb,
  
  -- Disclaimers and limitations
  not_clinical_assessment BOOLEAN DEFAULT true,
  disclaimer_text TEXT DEFAULT 'This assessment is for educational and wellness purposes only and is not a clinical diagnostic tool.',
  limitations_notes TEXT,
  
  -- Content management
  is_active BOOLEAN DEFAULT true,
  requires_partner_participation BOOLEAN DEFAULT false,
  content_warnings JSONB DEFAULT '[]'::jsonb,
  
  -- Usage and effectiveness tracking
  usage_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(3,2),
  user_satisfaction_score DECIMAL(3,2)
);

-- Progress Tracking: Wellness metrics and goal completion
CREATE TABLE progress_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Tracking context
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  
  -- Goal and metric information
  tracking_type TEXT CHECK (tracking_type IN ('wellness_metric', 'relationship_goal', 'communication_improvement', 'conflict_reduction', 'intimacy_building', 'personal_growth')) NOT NULL,
  metric_name TEXT NOT NULL,
  goal_description TEXT,
  
  -- Progress data
  current_value DECIMAL(10,2),
  target_value DECIMAL(10,2),
  unit_of_measurement TEXT, -- e.g., "percentage", "score", "frequency", "count"
  
  -- Time-based tracking
  tracking_period TEXT CHECK (tracking_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'custom')) DEFAULT 'weekly',
  period_start_date DATE NOT NULL,
  period_end_date DATE,
  
  -- Progress assessment
  progress_percentage DECIMAL(5,2) CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  trend_direction TEXT CHECK (trend_direction IN ('improving', 'stable', 'declining', 'unknown')) DEFAULT 'unknown',
  
  -- Wellness context (not clinical)
  wellness_dimension TEXT CHECK (wellness_dimension IN ('emotional', 'social', 'intellectual', 'spiritual', 'physical', 'occupational', 'environmental')),
  improvement_focus_areas JSONB DEFAULT '[]'::jsonb,
  
  -- Milestone tracking
  milestones_achieved JSONB DEFAULT '[]'::jsonb,
  next_milestone TEXT,
  celebration_moments JSONB DEFAULT '[]'::jsonb,
  
  -- Partner involvement
  shared_with_partner BOOLEAN DEFAULT false,
  partner_support_level TEXT CHECK (partner_support_level IN ('not_applicable', 'minimal', 'moderate', 'high', 'collaborative')),
  
  -- Status and completion
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'discontinued')) DEFAULT 'active',
  completion_date DATE,
  success_level TEXT CHECK (success_level IN ('exceeded', 'achieved', 'partially_achieved', 'not_achieved')),
  
  -- Reflection and learning
  user_reflection TEXT,
  lessons_learned JSONB DEFAULT '[]'::jsonb,
  recommendations_for_future JSONB DEFAULT '[]'::jsonb
);

-- Content Templates: Cached AI responses for cost optimization
CREATE TABLE content_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Template identification
  template_name TEXT NOT NULL,
  template_type TEXT CHECK (template_type IN ('ai_response', 'guidance_text', 'resource_list', 'exercise_instructions', 'safety_message', 'educational_content')) NOT NULL,
  category TEXT NOT NULL,
  
  -- Content
  content_text TEXT NOT NULL,
  content_json JSONB, -- Structured content for complex templates
  
  -- Personalization parameters
  personalization_variables JSONB DEFAULT '[]'::jsonb,
  target_archetypes JSONB DEFAULT '[]'::jsonb,
  target_situations JSONB DEFAULT '[]'::jsonb,
  
  -- AI generation metadata
  generated_by_ai BOOLEAN DEFAULT true,
  ai_model_version TEXT DEFAULT '1.0',
  generation_cost_estimate DECIMAL(8,4), -- Track costs for optimization
  
  -- Quality and usage
  quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Cache management
  cache_hit_rate DECIMAL(3,2),
  cache_expiry TIMESTAMPTZ,
  invalidated_at TIMESTAMPTZ,
  invalidation_reason TEXT,
  
  -- Content lifecycle
  is_active BOOLEAN DEFAULT true,
  human_reviewed BOOLEAN DEFAULT false,
  review_notes TEXT,
  approved_for_production BOOLEAN DEFAULT false,
  
  -- Performance optimization
  response_time_ms INTEGER, -- How long to generate/retrieve
  cost_per_use DECIMAL(8,6),
  cost_savings_vs_regeneration DECIMAL(8,2)
);

-- ============================================================================
-- INDEXES FOR SAFETY AND TOOLS TABLES
-- ============================================================================

-- Communication history indexes
CREATE INDEX idx_communication_history_couple_id ON communication_history(couple_id);
CREATE INDEX idx_communication_history_sender ON communication_history(sender_user_id);
CREATE INDEX idx_communication_history_created ON communication_history(created_at DESC);
CREATE INDEX idx_communication_history_risk_level ON communication_history(risk_level) WHERE risk_level IN ('high', 'critical');
CREATE INDEX idx_communication_history_safety_analysis ON communication_history(safety_analyzed, created_at) WHERE safety_analyzed = false;

-- Safety risk signals indexes
CREATE INDEX idx_safety_risk_signals_user_id ON safety_risk_signals(user_id);
CREATE INDEX idx_safety_risk_signals_risk_level ON safety_risk_signals(risk_level, created_at) WHERE risk_level IN ('high', 'critical');
CREATE INDEX idx_safety_risk_signals_unreviewed ON safety_risk_signals(human_reviewed, created_at) WHERE human_reviewed = false;
CREATE INDEX idx_safety_risk_signals_signal_type ON safety_risk_signals(signal_type);

-- Safety interventions indexes
CREATE INDEX idx_safety_interventions_user_id ON safety_interventions(user_id);
CREATE INDEX idx_safety_interventions_status ON safety_interventions(status);
CREATE INDEX idx_safety_interventions_follow_up ON safety_interventions(next_follow_up_date) WHERE follow_up_required = true;

-- Safety resources indexes
CREATE INDEX idx_safety_resources_type ON safety_resources(resource_type);
CREATE INDEX idx_safety_resources_location ON safety_resources(country_code, state_province);
CREATE INDEX idx_safety_resources_active ON safety_resources(is_active, display_priority) WHERE is_active = true;

-- Crisis escalations indexes
CREATE INDEX idx_crisis_escalations_user_id ON crisis_escalations(user_id);
CREATE INDEX idx_crisis_escalations_severity ON crisis_escalations(severity_level, created_at);
CREATE INDEX idx_crisis_escalations_status ON crisis_escalations(status);
CREATE INDEX idx_crisis_escalations_follow_up ON crisis_escalations(follow_up_date) WHERE follow_up_required = true;

-- Daily prompts indexes
CREATE INDEX idx_daily_prompts_category ON daily_prompts(prompt_category);
CREATE INDEX idx_daily_prompts_active ON daily_prompts(is_active, quality_score DESC) WHERE is_active = true;
CREATE INDEX idx_daily_prompts_cache ON daily_prompts(cache_expiry) WHERE cache_expiry IS NOT NULL;

-- Self report measures indexes
CREATE INDEX idx_self_report_measures_type ON self_report_measures(measure_type);
CREATE INDEX idx_self_report_measures_active ON self_report_measures(is_active) WHERE is_active = true;

-- Progress tracking indexes
CREATE INDEX idx_progress_tracking_user_id ON progress_tracking(user_id);
CREATE INDEX idx_progress_tracking_couple_id ON progress_tracking(couple_id);
CREATE INDEX idx_progress_tracking_active ON progress_tracking(status) WHERE status = 'active';
CREATE INDEX idx_progress_tracking_period ON progress_tracking(period_start_date, period_end_date);

-- Content templates indexes
CREATE INDEX idx_content_templates_type ON content_templates(template_type, category);
CREATE INDEX idx_content_templates_cache ON content_templates(cache_expiry) WHERE is_active = true;
CREATE INDEX idx_content_templates_usage ON content_templates(usage_count DESC, last_used_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER update_communication_history_updated_at BEFORE UPDATE ON communication_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_interventions_updated_at BEFORE UPDATE ON safety_interventions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_resources_updated_at BEFORE UPDATE ON safety_resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crisis_escalations_updated_at BEFORE UPDATE ON crisis_escalations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_prompts_updated_at BEFORE UPDATE ON daily_prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_self_report_measures_updated_at BEFORE UPDATE ON self_report_measures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_progress_tracking_updated_at BEFORE UPDATE ON progress_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_templates_updated_at BEFORE UPDATE ON content_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE communication_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_risk_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_report_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE communication_history IS 'Encrypted communication data, server-readable for safety analysis in wellness/education context';
COMMENT ON COLUMN communication_history.content_encrypted IS 'Encrypted with server-side key for safety monitoring with user consent';

COMMENT ON TABLE safety_risk_signals IS 'Automated detection of wellness concerns and relationship stress indicators';
COMMENT ON COLUMN safety_risk_signals.signal_type IS 'Wellness-focused risk categories, not clinical diagnoses';

COMMENT ON TABLE safety_interventions IS 'Actions taken to support user wellness and safety in educational context';
COMMENT ON TABLE safety_resources IS 'Curated, location-based crisis and support resources';
COMMENT ON TABLE crisis_escalations IS 'Professional intervention tracking for high-risk wellness situations';

COMMENT ON TABLE daily_prompts IS 'AI-generated conversation starters for relationship wellness and growth';
COMMENT ON TABLE self_report_measures IS 'Validated relationship scales for educational self-assessment, not clinical diagnosis';
COMMENT ON TABLE progress_tracking IS 'Wellness and relationship goal tracking for educational growth';
COMMENT ON TABLE content_templates IS 'Cached AI responses for cost optimization and consistent quality';