-- Sparq Connection V4: Analytics and Business Tables
-- Migration 007: Privacy-friendly analytics, subscription management, and compliance
-- Purpose: Implement business logic and privacy-compliant analytics

-- ============================================================================
-- BUSINESS AND SUBSCRIPTION TABLES
-- ============================================================================

-- Subscription Tiers: Free and Premium Couple plans
CREATE TABLE subscription_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Tier identification
  tier_name TEXT NOT NULL UNIQUE,
  tier_display_name TEXT NOT NULL,
  tier_description TEXT NOT NULL,
  
  -- Pricing
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_annual_cents INTEGER NOT NULL DEFAULT 0,
  trial_period_days INTEGER DEFAULT 0,
  
  -- Feature access
  max_daily_prompts INTEGER DEFAULT -1, -- -1 = unlimited
  max_assessments_per_month INTEGER DEFAULT -1,
  max_progress_goals INTEGER DEFAULT -1,
  advanced_analytics_enabled BOOLEAN DEFAULT false,
  priority_support_enabled BOOLEAN DEFAULT false,
  custom_content_enabled BOOLEAN DEFAULT false,
  
  -- Crisis and safety features (always enabled for all tiers)
  safety_monitoring_enabled BOOLEAN DEFAULT true,
  crisis_resources_enabled BOOLEAN DEFAULT true,
  
  -- Business configuration
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 100,
  
  -- Stripe integration
  stripe_product_id TEXT,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual TEXT,
  
  -- Feature flags
  feature_flags JSONB DEFAULT '{}'::jsonb
);

-- User Subscriptions: Track user subscription status
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Subscription details
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES subscription_tiers(id),
  
  -- Subscription period
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual', 'lifetime', 'free')) DEFAULT 'free',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  
  -- Payment and billing
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  payment_method_type TEXT,
  
  -- Status tracking
  status TEXT CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')) DEFAULT 'active',
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Auto-renewal
  auto_renew BOOLEAN DEFAULT true,
  renewal_reminder_sent BOOLEAN DEFAULT false,
  
  -- Usage tracking (for limits)
  monthly_prompt_usage INTEGER DEFAULT 0,
  monthly_assessment_usage INTEGER DEFAULT 0,
  monthly_usage_reset_date DATE,
  
  -- Couple-specific subscription (for premium couple features)
  couple_id UUID REFERENCES couples(id),
  is_couple_subscription BOOLEAN DEFAULT false,
  couple_subscription_owner BOOLEAN DEFAULT false,
  
  UNIQUE(user_id, tier_id) DEFERRABLE INITIALLY DEFERRED
);

-- Jurisdictions: User location for appropriate resources and compliance
CREATE TABLE jurisdictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Geographic identification
  country_code TEXT NOT NULL, -- ISO 3166-1 alpha-2
  country_name TEXT NOT NULL,
  state_province_code TEXT, -- State/province code
  state_province_name TEXT,
  
  -- Legal and compliance information
  data_protection_laws JSONB DEFAULT '[]'::jsonb, -- GDPR, PIPEDA, CCPA, etc.
  mandatory_reporting_requirements JSONB DEFAULT '{}'::jsonb,
  crisis_intervention_protocols JSONB DEFAULT '{}'::jsonb,
  
  -- Localization
  primary_language TEXT DEFAULT 'en',
  supported_languages JSONB DEFAULT '["en"]'::jsonb,
  timezone TEXT,
  
  -- Service availability
  service_available BOOLEAN DEFAULT true,
  restricted_features JSONB DEFAULT '[]'::jsonb,
  content_restrictions JSONB DEFAULT '[]'::jsonb,
  
  -- Emergency services
  emergency_number TEXT, -- e.g., "911", "999", "112"
  crisis_hotline_numbers JSONB DEFAULT '[]'::jsonb,
  
  -- Business information
  tax_rates JSONB DEFAULT '{}'::jsonb,
  currency_code TEXT DEFAULT 'USD',
  
  UNIQUE(country_code, state_province_code)
);

-- User Jurisdictions: Track user locations for compliance
CREATE TABLE user_jurisdictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- User and location
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jurisdiction_id UUID NOT NULL REFERENCES jurisdictions(id),
  
  -- Detection method
  detection_method TEXT CHECK (detection_method IN ('user_provided', 'ip_geolocation', 'billing_address', 'manual_override')) NOT NULL,
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high', 'verified')) DEFAULT 'medium',
  
  -- Validity period
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_current BOOLEAN DEFAULT true,
  
  -- Source information
  source_data JSONB, -- IP address, billing info, etc. (hashed for privacy)
  verification_status TEXT CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')) DEFAULT 'unverified'
);

-- ============================================================================
-- PRIVACY-FRIENDLY ANALYTICS TABLES
-- ============================================================================

-- Usage Analytics: Privacy-friendly, anonymized metrics
CREATE TABLE usage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Anonymized user identification (hashed)
  user_hash TEXT NOT NULL, -- One-way hash of user ID + salt
  session_hash TEXT, -- Session identifier (hashed)
  
  -- Feature usage
  feature_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  
  -- Context (anonymized)
  user_tier TEXT, -- subscription tier
  relationship_stage TEXT, -- new, established, long_term (anonymized)
  user_archetype_category TEXT, -- broad category, not specific archetype
  
  -- Timing and performance
  session_duration_minutes INTEGER,
  response_time_ms INTEGER,
  completion_status TEXT CHECK (completion_status IN ('completed', 'abandoned', 'error')),
  
  -- Geographic context (broad regions only)
  region_code TEXT, -- e.g., "NA", "EU", "APAC" - not specific countries
  timezone_offset INTEGER,
  
  -- Device and platform (non-identifying)
  platform_type TEXT CHECK (platform_type IN ('web', 'mobile_ios', 'mobile_android')),
  device_category TEXT CHECK (device_category IN ('mobile', 'tablet', 'desktop')),
  
  -- Business metrics
  conversion_funnel_stage TEXT,
  revenue_attribution_cents INTEGER DEFAULT 0,
  
  -- Privacy compliance
  consent_to_analytics BOOLEAN DEFAULT true,
  data_retention_days INTEGER DEFAULT 90,
  anonymized_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature Usage: Track engagement without PII
CREATE TABLE feature_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Feature identification
  feature_category TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  feature_version TEXT DEFAULT '1.0',
  
  -- Usage metrics (aggregated by day)
  usage_date DATE NOT NULL,
  
  -- Counts (anonymized)
  unique_users_count INTEGER DEFAULT 0,
  total_usage_count INTEGER DEFAULT 0,
  successful_completion_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Performance metrics
  average_response_time_ms INTEGER,
  median_session_duration_minutes INTEGER,
  
  -- User satisfaction (when available)
  average_satisfaction_score DECIMAL(3,2),
  feedback_count INTEGER DEFAULT 0,
  
  -- Subscription tier breakdown
  free_tier_usage INTEGER DEFAULT 0,
  premium_tier_usage INTEGER DEFAULT 0,
  
  -- Geographic distribution (broad regions)
  na_region_usage INTEGER DEFAULT 0,
  eu_region_usage INTEGER DEFAULT 0,
  apac_region_usage INTEGER DEFAULT 0,
  other_region_usage INTEGER DEFAULT 0,
  
  UNIQUE(feature_category, feature_name, usage_date)
);

-- Wellness Insights: Anonymized relationship wellness trends
CREATE TABLE wellness_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Time period
  insight_date DATE NOT NULL,
  insight_period TEXT CHECK (insight_period IN ('daily', 'weekly', 'monthly')) DEFAULT 'daily',
  
  -- Wellness categories (anonymized)
  wellness_category TEXT CHECK (wellness_category IN ('communication', 'conflict_resolution', 'intimacy', 'goal_achievement', 'relationship_satisfaction', 'personal_growth')) NOT NULL,
  
  -- Aggregated metrics (no individual identification)
  participant_count INTEGER NOT NULL, -- Number of users in this insight
  average_wellness_score DECIMAL(4,2),
  improvement_percentage DECIMAL(5,2),
  
  -- Trend analysis
  trend_direction TEXT CHECK (trend_direction IN ('improving', 'stable', 'declining')),
  trend_strength TEXT CHECK (trend_strength IN ('weak', 'moderate', 'strong')),
  
  -- Demographic breakdowns (broad categories)
  new_relationship_percentage DECIMAL(5,2),
  established_relationship_percentage DECIMAL(5,2),
  long_term_relationship_percentage DECIMAL(5,2),
  
  -- Engagement metrics
  high_engagement_percentage DECIMAL(5,2),
  regular_usage_percentage DECIMAL(5,2),
  
  -- Privacy safeguards
  minimum_sample_size INTEGER DEFAULT 100, -- Ensure statistical anonymity
  confidence_level DECIMAL(3,2) DEFAULT 0.95,
  
  UNIQUE(insight_date, insight_period, wellness_category)
);

-- Content Performance: Track content effectiveness anonymously
CREATE TABLE content_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Content identification
  content_type TEXT CHECK (content_type IN ('daily_prompt', 'assessment_question', 'guidance_response', 'resource_link', 'educational_content')) NOT NULL,
  content_category TEXT NOT NULL,
  content_hash TEXT NOT NULL, -- Hashed content for identification without storing actual content
  
  -- Performance metrics (anonymized)
  view_count INTEGER DEFAULT 0,
  engagement_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  positive_feedback_count INTEGER DEFAULT 0,
  negative_feedback_count INTEGER DEFAULT 0,
  
  -- Quality metrics
  average_engagement_time_seconds INTEGER,
  bounce_rate_percentage DECIMAL(5,2),
  effectiveness_score DECIMAL(3,2),
  
  -- User satisfaction
  average_rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  
  -- AI-generated content metrics
  ai_generated BOOLEAN DEFAULT false,
  ai_model_version TEXT,
  generation_cost_cents INTEGER,
  human_review_score DECIMAL(3,2),
  
  -- A/B testing results
  test_variant TEXT,
  conversion_rate DECIMAL(5,2),
  statistical_significance DECIMAL(3,2),
  
  -- Timing and seasonal factors
  best_performance_time_of_day INTEGER, -- Hour of day
  seasonal_performance_factor DECIMAL(3,2),
  
  UNIQUE(content_type, content_hash)
);

-- ============================================================================
-- COMPLIANCE AND AUDIT TABLES
-- ============================================================================

-- Data Retention Policies: Automated cleanup schedules
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Policy identification
  policy_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  data_category TEXT NOT NULL,
  
  -- Retention rules
  retention_period_days INTEGER NOT NULL,
  grace_period_days INTEGER DEFAULT 30,
  
  -- Conditions for retention
  retention_conditions JSONB DEFAULT '{}'::jsonb,
  exemption_conditions JSONB DEFAULT '{}'::jsonb,
  
  -- Legal basis
  legal_basis TEXT CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')) NOT NULL,
  regulatory_requirements JSONB DEFAULT '[]'::jsonb,
  
  -- Deletion process
  deletion_method TEXT CHECK (deletion_method IN ('soft_delete', 'hard_delete', 'anonymize', 'archive')) DEFAULT 'soft_delete',
  backup_retention_days INTEGER DEFAULT 0,
  
  -- Automation
  auto_apply BOOLEAN DEFAULT true,
  last_applied_at TIMESTAMPTZ,
  next_application_date DATE,
  
  -- Monitoring
  records_processed_last_run INTEGER DEFAULT 0,
  errors_last_run INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(table_name, data_category)
);

-- Compliance Reports: Regular privacy and safety audits
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Report identification
  report_type TEXT CHECK (report_type IN ('privacy_audit', 'safety_review', 'data_retention', 'consent_compliance', 'breach_assessment', 'dsar_summary')) NOT NULL,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  
  -- Report metadata
  generated_by_staff_id UUID REFERENCES users(id),
  report_version TEXT DEFAULT '1.0',
  
  -- Summary metrics
  total_users_reviewed INTEGER,
  issues_identified INTEGER,
  high_priority_issues INTEGER,
  issues_resolved INTEGER,
  
  -- Compliance status
  overall_compliance_score DECIMAL(3,2),
  privacy_compliance_status TEXT CHECK (privacy_compliance_status IN ('compliant', 'minor_issues', 'major_issues', 'non_compliant')),
  safety_compliance_status TEXT CHECK (safety_compliance_status IN ('compliant', 'minor_issues', 'major_issues', 'non_compliant')),
  
  -- Key findings
  executive_summary TEXT NOT NULL,
  key_findings JSONB NOT NULL,
  recommendations JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  
  -- Data protection metrics
  consent_compliance_rate DECIMAL(5,2),
  data_retention_compliance_rate DECIMAL(5,2),
  breach_incidents_count INTEGER DEFAULT 0,
  dsar_requests_processed INTEGER DEFAULT 0,
  
  -- Safety metrics
  crisis_interventions_count INTEGER DEFAULT 0,
  false_positive_rate DECIMAL(5,2),
  response_time_average_minutes INTEGER,
  escalation_rate DECIMAL(5,2),
  
  -- Regulatory context
  applicable_regulations JSONB DEFAULT '[]'::jsonb,
  external_audit_required BOOLEAN DEFAULT false,
  regulator_notification_required BOOLEAN DEFAULT false,
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  status TEXT CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')) DEFAULT 'draft',
  
  -- Documentation
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  report_file_location TEXT
);

-- ============================================================================
-- INDEXES FOR ANALYTICS AND BUSINESS TABLES
-- ============================================================================

-- Subscription tiers indexes
CREATE INDEX idx_subscription_tiers_active ON subscription_tiers(is_active) WHERE is_active = true;
CREATE INDEX idx_subscription_tiers_public ON subscription_tiers(is_public, sort_order) WHERE is_public = true;

-- User subscriptions indexes
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_couple ON user_subscriptions(couple_id) WHERE couple_id IS NOT NULL;
CREATE INDEX idx_user_subscriptions_stripe ON user_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_user_subscriptions_renewal ON user_subscriptions(current_period_end) WHERE auto_renew = true AND status = 'active';

-- Jurisdictions indexes
CREATE INDEX idx_jurisdictions_country ON jurisdictions(country_code);
CREATE INDEX idx_jurisdictions_available ON jurisdictions(service_available) WHERE service_available = true;

-- User jurisdictions indexes
CREATE INDEX idx_user_jurisdictions_user_id ON user_jurisdictions(user_id);
CREATE INDEX idx_user_jurisdictions_current ON user_jurisdictions(is_current) WHERE is_current = true;

-- Usage analytics indexes
CREATE INDEX idx_usage_analytics_created ON usage_analytics(created_at);
CREATE INDEX idx_usage_analytics_feature ON usage_analytics(feature_name, created_at);
CREATE INDEX idx_usage_analytics_user_hash ON usage_analytics(user_hash, created_at);

-- Feature usage indexes
CREATE INDEX idx_feature_usage_date ON feature_usage(usage_date DESC);
CREATE INDEX idx_feature_usage_feature ON feature_usage(feature_category, feature_name);

-- Wellness insights indexes
CREATE INDEX idx_wellness_insights_date ON wellness_insights(insight_date DESC);
CREATE INDEX idx_wellness_insights_category ON wellness_insights(wellness_category, insight_date);

-- Content performance indexes
CREATE INDEX idx_content_performance_type ON content_performance(content_type, content_category);
CREATE INDEX idx_content_performance_effectiveness ON content_performance(effectiveness_score DESC) WHERE effectiveness_score IS NOT NULL;

-- Data retention policies indexes
CREATE INDEX idx_data_retention_policies_table ON data_retention_policies(table_name);
CREATE INDEX idx_data_retention_policies_next_run ON data_retention_policies(next_application_date) WHERE is_active = true;

-- Compliance reports indexes
CREATE INDEX idx_compliance_reports_type ON compliance_reports(report_type);
CREATE INDEX idx_compliance_reports_period ON compliance_reports(report_period_start, report_period_end);
CREATE INDEX idx_compliance_reports_status ON compliance_reports(status);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER update_subscription_tiers_updated_at BEFORE UPDATE ON subscription_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jurisdictions_updated_at BEFORE UPDATE ON jurisdictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_performance_updated_at BEFORE UPDATE ON content_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_retention_policies_updated_at BEFORE UPDATE ON data_retention_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE subscription_tiers IS 'Free and Premium Couple subscription plans with feature access control';
COMMENT ON TABLE user_subscriptions IS 'User subscription status and billing information';
COMMENT ON TABLE jurisdictions IS 'Geographic regions with legal and compliance requirements';
COMMENT ON TABLE usage_analytics IS 'Privacy-friendly, anonymized user behavior analytics';
COMMENT ON COLUMN usage_analytics.user_hash IS 'One-way hash of user ID for anonymized tracking';
COMMENT ON TABLE feature_usage IS 'Engagement metrics without personally identifiable information';
COMMENT ON TABLE wellness_insights IS 'Aggregated relationship wellness trends with statistical anonymity';
COMMENT ON TABLE content_performance IS 'Content effectiveness tracking for optimization';
COMMENT ON TABLE data_retention_policies IS 'Automated data lifecycle management and cleanup policies';
COMMENT ON TABLE compliance_reports IS 'Regular privacy and safety compliance audit reports';