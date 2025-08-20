-- Sparq Connection V4: Analytics and Business RLS Policies
-- Migration 008: Row Level Security policies for analytics and business tables
-- Purpose: Secure access to business and analytics data

-- ============================================================================
-- SUBSCRIPTION TIERS RLS POLICIES
-- ============================================================================

-- All authenticated users can view active, public subscription tiers
CREATE POLICY "subscription_tiers_public" ON subscription_tiers
  FOR SELECT USING (is_active = true AND is_public = true);

-- Support staff can manage subscription tiers
CREATE POLICY "subscription_tiers_support" ON subscription_tiers
  FOR ALL USING (public.is_support());

-- ============================================================================
-- USER SUBSCRIPTIONS RLS POLICIES
-- ============================================================================

-- Users can view their own subscription information
CREATE POLICY "user_subscriptions_own" ON user_subscriptions
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Users can create their own subscriptions (during signup/upgrade)
CREATE POLICY "user_subscriptions_create_own" ON user_subscriptions
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Users can update their own subscription preferences (limited fields)
CREATE POLICY "user_subscriptions_update_own" ON user_subscriptions
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Support staff can manage all subscriptions
CREATE POLICY "user_subscriptions_support" ON user_subscriptions
  FOR ALL USING (public.is_support());

-- Billing system (service role) can update subscription status
-- This will be handled via service role, not user policies

-- ============================================================================
-- JURISDICTIONS RLS POLICIES
-- ============================================================================

-- All authenticated users can view jurisdictions (for resource location)
CREATE POLICY "jurisdictions_public" ON jurisdictions
  FOR SELECT USING (service_available = true);

-- Support staff can manage jurisdiction data
CREATE POLICY "jurisdictions_support" ON jurisdictions
  FOR ALL USING (public.is_support());

-- ============================================================================
-- USER JURISDICTIONS RLS POLICIES
-- ============================================================================

-- Users can view their own jurisdiction information
CREATE POLICY "user_jurisdictions_own" ON user_jurisdictions
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- System can insert jurisdiction detection results (service role)
-- No user INSERT policy = users cannot directly set jurisdictions

-- Support staff can view and manage user jurisdictions
CREATE POLICY "user_jurisdictions_support" ON user_jurisdictions
  FOR ALL USING (public.is_support());

-- ============================================================================
-- ANALYTICS TABLES RLS POLICIES
-- ============================================================================

-- Usage Analytics: Only staff can access anonymized analytics
CREATE POLICY "usage_analytics_staff_only" ON usage_analytics
  FOR SELECT USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'analytics', 'support'),
      false
    )
  );

-- System can insert analytics (service role only)
-- No user access to INSERT/UPDATE/DELETE

-- Feature Usage: Only staff can access aggregated feature metrics
CREATE POLICY "feature_usage_staff_only" ON feature_usage
  FOR SELECT USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'analytics', 'support'),
      false
    )
  );

-- Wellness Insights: Only staff can access wellness trends
CREATE POLICY "wellness_insights_staff_only" ON wellness_insights
  FOR SELECT USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'analytics', 'support'),
      false
    )
  );

-- Content Performance: Only staff can access content metrics
CREATE POLICY "content_performance_staff_only" ON content_performance
  FOR SELECT USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'analytics', 'support'),
      false
    )
  );

-- ============================================================================
-- COMPLIANCE TABLES RLS POLICIES
-- ============================================================================

-- Data Retention Policies: Only compliance and admin staff
CREATE POLICY "data_retention_policies_compliance" ON data_retention_policies
  FOR ALL USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'compliance', 'legal'),
      false
    )
  );

-- Compliance Reports: Only compliance, legal, and admin staff
CREATE POLICY "compliance_reports_compliance" ON compliance_reports
  FOR ALL USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'compliance', 'legal'),
      false
    )
  );

-- Support staff can view compliance reports (read-only)
CREATE POLICY "compliance_reports_support_read" ON compliance_reports
  FOR SELECT USING (
    public.is_support() AND status = 'approved'
  );

-- ============================================================================
-- BUSINESS LOGIC FUNCTIONS
-- ============================================================================

-- Function to get user's current subscription tier
CREATE OR REPLACE FUNCTION get_user_subscription_tier(p_user_id UUID)
RETURNS TABLE(
  tier_name TEXT,
  tier_display_name TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  max_daily_prompts INTEGER,
  max_assessments_per_month INTEGER,
  advanced_analytics_enabled BOOLEAN,
  monthly_prompt_usage INTEGER,
  monthly_assessment_usage INTEGER
) AS $$
BEGIN
  -- Verify authorization
  IF NOT (
    p_user_id IN (SELECT users.id FROM users WHERE users.auth_id = auth.uid()) OR
    public.is_support()
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to subscription data';
  END IF;
  
  RETURN QUERY
  SELECT 
    st.tier_name,
    st.tier_display_name,
    us.status,
    us.current_period_end,
    st.max_daily_prompts,
    st.max_assessments_per_month,
    st.advanced_analytics_enabled,
    us.monthly_prompt_usage,
    us.monthly_assessment_usage
  FROM user_subscriptions us
  JOIN subscription_tiers st ON us.tier_id = st.id
  WHERE us.user_id = p_user_id
  AND us.status IN ('active', 'trialing')
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access feature based on subscription
CREATE OR REPLACE FUNCTION user_can_access_feature(
  p_user_id UUID,
  p_feature_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_tier_info RECORD;
  v_can_access BOOLEAN := false;
BEGIN
  -- Get user's current subscription tier
  SELECT INTO v_tier_info
    st.max_daily_prompts,
    st.max_assessments_per_month,
    st.advanced_analytics_enabled,
    st.priority_support_enabled,
    st.custom_content_enabled,
    st.feature_flags,
    us.monthly_prompt_usage,
    us.monthly_assessment_usage,
    us.status
  FROM user_subscriptions us
  JOIN subscription_tiers st ON us.tier_id = st.id
  WHERE us.user_id = p_user_id
  AND us.status IN ('active', 'trialing')
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- If no subscription found, assume free tier
  IF v_tier_info IS NULL THEN
    SELECT INTO v_tier_info
      st.max_daily_prompts,
      st.max_assessments_per_month,
      st.advanced_analytics_enabled,
      st.priority_support_enabled,
      st.custom_content_enabled,
      st.feature_flags,
      0, -- monthly_prompt_usage
      0, -- monthly_assessment_usage
      'active' -- status
    FROM subscription_tiers st
    WHERE st.tier_name = 'free'
    AND st.is_active = true;
  END IF;
  
  -- Check feature access based on tier
  CASE p_feature_name
    WHEN 'daily_prompts' THEN
      v_can_access := (v_tier_info.max_daily_prompts = -1 OR v_tier_info.monthly_prompt_usage < v_tier_info.max_daily_prompts * 30);
    WHEN 'assessments' THEN
      v_can_access := (v_tier_info.max_assessments_per_month = -1 OR v_tier_info.monthly_assessment_usage < v_tier_info.max_assessments_per_month);
    WHEN 'advanced_analytics' THEN
      v_can_access := v_tier_info.advanced_analytics_enabled;
    WHEN 'priority_support' THEN
      v_can_access := v_tier_info.priority_support_enabled;
    WHEN 'custom_content' THEN
      v_can_access := v_tier_info.custom_content_enabled;
    WHEN 'safety_monitoring' THEN
      v_can_access := true; -- Always enabled for all tiers
    WHEN 'crisis_resources' THEN
      v_can_access := true; -- Always enabled for all tiers
    ELSE
      -- Check feature flags for custom features
      v_can_access := COALESCE((v_tier_info.feature_flags ->> p_feature_name)::boolean, false);
  END CASE;
  
  RETURN v_can_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track feature usage (increments counters)
CREATE OR REPLACE FUNCTION track_feature_usage(
  p_user_id UUID,
  p_feature_name TEXT,
  p_usage_count INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  -- Verify user authorization
  IF NOT (
    p_user_id IN (SELECT users.id FROM users WHERE users.auth_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized usage tracking';
  END IF;
  
  -- Get user's current subscription
  SELECT id INTO v_subscription_id
  FROM user_subscriptions
  WHERE user_id = p_user_id
  AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no subscription, skip tracking (free tier)
  IF v_subscription_id IS NULL THEN
    RETURN true;
  END IF;
  
  -- Update usage counters based on feature
  CASE p_feature_name
    WHEN 'daily_prompts' THEN
      UPDATE user_subscriptions
      SET monthly_prompt_usage = monthly_prompt_usage + p_usage_count
      WHERE id = v_subscription_id;
    WHEN 'assessments' THEN
      UPDATE user_subscriptions
      SET monthly_assessment_usage = monthly_assessment_usage + p_usage_count
      WHERE id = v_subscription_id;
    ELSE
      -- For other features, we might track differently or not at all
      NULL;
  END CASE;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's location-appropriate jurisdiction
CREATE OR REPLACE FUNCTION get_user_jurisdiction(p_user_id UUID)
RETURNS TABLE(
  jurisdiction_id UUID,
  country_code TEXT,
  country_name TEXT,
  state_province_name TEXT,
  emergency_number TEXT,
  crisis_hotline_numbers JSONB,
  data_protection_laws JSONB
) AS $$
BEGIN
  -- Verify authorization
  IF NOT (
    p_user_id IN (SELECT users.id FROM users WHERE users.auth_id = auth.uid()) OR
    public.is_support()
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to jurisdiction data';
  END IF;
  
  RETURN QUERY
  SELECT 
    j.id,
    j.country_code,
    j.country_name,
    j.state_province_name,
    j.emergency_number,
    j.crisis_hotline_numbers,
    j.data_protection_laws
  FROM user_jurisdictions uj
  JOIN jurisdictions j ON uj.jurisdiction_id = j.id
  WHERE uj.user_id = p_user_id
  AND uj.is_current = true
  ORDER BY uj.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create anonymized usage analytics
CREATE OR REPLACE FUNCTION log_usage_analytics(
  p_user_id UUID,
  p_feature_name TEXT,
  p_action_type TEXT,
  p_session_duration_minutes INTEGER DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_completion_status TEXT DEFAULT 'completed'
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_hash TEXT;
  v_session_hash TEXT;
  v_tier_name TEXT;
  v_region_code TEXT;
  v_consent_analytics BOOLEAN;
BEGIN
  -- Check if user has consented to analytics
  SELECT collect_usage_analytics INTO v_consent_analytics
  FROM privacy_preferences
  WHERE user_id = p_user_id;
  
  -- If no consent, don't log analytics
  IF v_consent_analytics IS FALSE THEN
    RETURN false;
  END IF;
  
  -- Create anonymized user hash
  v_user_hash := encode(digest(p_user_id::text || get_encryption_key('default'), 'sha256'), 'hex');
  
  -- Create session hash (if session exists)
  v_session_hash := encode(digest(
    COALESCE(current_setting('request.headers.session-id', true), '') || 
    v_user_hash || 
    EXTRACT(epoch FROM NOW())::text, 
    'sha256'
  ), 'hex');
  
  -- Get user's tier (anonymized)
  SELECT st.tier_name INTO v_tier_name
  FROM user_subscriptions us
  JOIN subscription_tiers st ON us.tier_id = st.id
  WHERE us.user_id = p_user_id
  AND us.status IN ('active', 'trialing')
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- Get user's region (anonymized to broad categories)
  SELECT 
    CASE 
      WHEN j.country_code IN ('US', 'CA', 'MX') THEN 'NA'
      WHEN j.country_code IN ('GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI') THEN 'EU'
      WHEN j.country_code IN ('JP', 'AU', 'NZ', 'SG', 'KR') THEN 'APAC'
      ELSE 'OTHER'
    END INTO v_region_code
  FROM user_jurisdictions uj
  JOIN jurisdictions j ON uj.jurisdiction_id = j.id
  WHERE uj.user_id = p_user_id
  AND uj.is_current = true
  ORDER BY uj.created_at DESC
  LIMIT 1;
  
  -- Insert anonymized analytics record
  INSERT INTO usage_analytics (
    user_hash,
    session_hash,
    feature_name,
    action_type,
    user_tier,
    session_duration_minutes,
    response_time_ms,
    completion_status,
    region_code,
    platform_type,
    device_category
  ) VALUES (
    v_user_hash,
    v_session_hash,
    p_feature_name,
    p_action_type,
    COALESCE(v_tier_name, 'free'),
    p_session_duration_minutes,
    p_response_time_ms,
    p_completion_status,
    COALESCE(v_region_code, 'UNKNOWN'),
    COALESCE(current_setting('request.headers.platform-type', true), 'web'),
    COALESCE(current_setting('request.headers.device-category', true), 'desktop')
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DATA RETENTION AND CLEANUP FUNCTIONS
-- ============================================================================

-- Function to apply data retention policies
CREATE OR REPLACE FUNCTION apply_data_retention_policy(p_policy_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_policy RECORD;
  v_sql TEXT;
  v_affected_rows INTEGER := 0;
BEGIN
  -- Only compliance staff can run retention policies
  IF NOT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'compliance'),
    false
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Compliance role required';
  END IF;
  
  -- Get the retention policy
  SELECT * INTO v_policy FROM data_retention_policies WHERE id = p_policy_id AND is_active = true;
  
  IF v_policy IS NULL THEN
    RAISE EXCEPTION 'Retention policy not found or inactive';
  END IF;
  
  -- Build and execute retention SQL based on deletion method
  CASE v_policy.deletion_method
    WHEN 'soft_delete' THEN
      v_sql := format(
        'UPDATE %I SET deleted_at = NOW() WHERE deleted_at IS NULL AND created_at < NOW() - INTERVAL ''%s days''',
        v_policy.table_name,
        v_policy.retention_period_days
      );
    WHEN 'hard_delete' THEN
      v_sql := format(
        'DELETE FROM %I WHERE created_at < NOW() - INTERVAL ''%s days''',
        v_policy.table_name,
        v_policy.retention_period_days
      );
    WHEN 'anonymize' THEN
      -- This would need to be customized per table
      RAISE EXCEPTION 'Anonymization method not yet implemented for table %', v_policy.table_name;
    ELSE
      RAISE EXCEPTION 'Unknown deletion method: %', v_policy.deletion_method;
  END CASE;
  
  -- Execute the retention SQL
  EXECUTE v_sql;
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  
  -- Update policy last run info
  UPDATE data_retention_policies SET
    last_applied_at = NOW(),
    records_processed_last_run = v_affected_rows,
    next_application_date = CURRENT_DATE + INTERVAL '1 day'
  WHERE id = p_policy_id;
  
  -- Log the retention action
  INSERT INTO audit_log (
    action_type, resource_type, resource_id, details, staff_user_id
  ) VALUES (
    'data_retention_applied', 'data_retention_policy', p_policy_id,
    jsonb_build_object(
      'table_name', v_policy.table_name,
      'deletion_method', v_policy.deletion_method,
      'records_affected', v_affected_rows,
      'retention_period_days', v_policy.retention_period_days
    ),
    auth.get_user_id()
  );
  
  RETURN v_affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS FOR BUSINESS FUNCTIONS
-- ============================================================================

-- Grant access to subscription functions
GRANT EXECUTE ON FUNCTION get_user_subscription_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_access_feature(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION track_feature_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_jurisdiction(UUID) TO authenticated;

-- Grant analytics function to service role
GRANT EXECUTE ON FUNCTION log_usage_analytics(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO service_role;

-- Grant retention function to compliance role only
GRANT EXECUTE ON FUNCTION apply_data_retention_policy(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS FOR BUSINESS FUNCTIONS
-- ============================================================================

COMMENT ON FUNCTION get_user_subscription_tier IS 'Get user''s current subscription tier and usage limits';
COMMENT ON FUNCTION user_can_access_feature IS 'Check if user can access feature based on subscription tier';
COMMENT ON FUNCTION track_feature_usage IS 'Track feature usage for subscription limits';
COMMENT ON FUNCTION get_user_jurisdiction IS 'Get user''s jurisdiction for appropriate resources and compliance';
COMMENT ON FUNCTION log_usage_analytics IS 'Create anonymized usage analytics with user consent';
COMMENT ON FUNCTION apply_data_retention_policy IS 'Apply data retention policy for compliance (admin only)';