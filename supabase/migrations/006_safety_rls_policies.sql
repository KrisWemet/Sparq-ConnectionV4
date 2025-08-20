-- Sparq Connection V4: Safety and Tools RLS Policies  
-- Migration 006: Row Level Security policies for safety monitoring and relationship tools
-- Purpose: Secure access to safety monitoring and relationship tools tables

-- ============================================================================
-- COMMUNICATION HISTORY RLS POLICIES
-- ============================================================================

-- Couple members can view their own communication history
CREATE POLICY "communication_history_couple_members" ON communication_history
  FOR SELECT USING (public.is_couple_member(couple_id));

-- Users can insert their own messages
CREATE POLICY "communication_history_insert_own" ON communication_history
  FOR INSERT WITH CHECK (
    sender_user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) AND
    public.is_couple_member(couple_id)
  );

-- Users can update their own messages (for editing/deletion)
CREATE POLICY "communication_history_update_own" ON communication_history
  FOR UPDATE USING (
    sender_user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Support staff can access communication for safety analysis
CREATE POLICY "communication_history_support" ON communication_history
  FOR SELECT USING (public.is_support());

-- System can update safety analysis results (service role)
-- This will be handled through service role, not user policies

-- ============================================================================
-- SAFETY RISK SIGNALS RLS POLICIES
-- ============================================================================

-- Users can view their own safety risk signals
CREATE POLICY "safety_risk_signals_own" ON safety_risk_signals
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Support staff can view and manage all safety risk signals
CREATE POLICY "safety_risk_signals_support" ON safety_risk_signals
  FOR ALL USING (public.is_support());

-- System can insert safety risk signals (service role only)
-- No user INSERT policy = users cannot directly create risk signals

-- Partners can view shared safety signals (with consent)
CREATE POLICY "safety_risk_signals_partner_shared" ON safety_risk_signals
  FOR SELECT USING (
    couple_id IS NOT NULL AND
    public.is_couple_member(couple_id) AND
    EXISTS (
      SELECT 1 FROM privacy_preferences pp
      JOIN users u ON pp.user_id = u.id
      WHERE u.id = safety_risk_signals.user_id
      AND pp.share_crisis_information = true
    )
  );

-- ============================================================================
-- SAFETY INTERVENTIONS RLS POLICIES
-- ============================================================================

-- Users can view interventions related to them
CREATE POLICY "safety_interventions_own" ON safety_interventions
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Support staff can manage all safety interventions
CREATE POLICY "safety_interventions_support" ON safety_interventions
  FOR ALL USING (public.is_support());

-- System can create interventions (service role)
-- No user INSERT policy = users cannot directly create interventions

-- ============================================================================
-- SAFETY RESOURCES RLS POLICIES
-- ============================================================================

-- All authenticated users can view active safety resources
CREATE POLICY "safety_resources_public" ON safety_resources
  FOR SELECT USING (is_active = true);

-- Support staff can manage safety resources
CREATE POLICY "safety_resources_support" ON safety_resources
  FOR ALL USING (public.is_support());

-- ============================================================================
-- CRISIS ESCALATIONS RLS POLICIES
-- ============================================================================

-- Users can view their own crisis escalations
CREATE POLICY "crisis_escalations_own" ON crisis_escalations
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Support staff can manage all crisis escalations
CREATE POLICY "crisis_escalations_support" ON crisis_escalations
  FOR ALL USING (public.is_support());

-- Emergency contacts can view escalations in crisis situations (limited access)
CREATE POLICY "crisis_escalations_emergency_contact" ON crisis_escalations
  FOR SELECT USING (
    severity_level IN ('critical', 'emergency') AND
    created_at > NOW() - INTERVAL '24 hours' AND
    -- This would need additional logic to verify emergency contact relationship
    public.is_support() -- Simplified for now, implement emergency contact verification later
  );

-- ============================================================================
-- DAILY PROMPTS RLS POLICIES
-- ============================================================================

-- All authenticated users can view active daily prompts
CREATE POLICY "daily_prompts_active" ON daily_prompts
  FOR SELECT USING (is_active = true);

-- Support staff can manage daily prompts
CREATE POLICY "daily_prompts_support" ON daily_prompts
  FOR ALL USING (public.is_support());

-- System can create and update prompts (service role)

-- ============================================================================
-- SELF REPORT MEASURES RLS POLICIES
-- ============================================================================

-- All authenticated users can view active measures
CREATE POLICY "self_report_measures_active" ON self_report_measures
  FOR SELECT USING (is_active = true);

-- Support staff can manage measures
CREATE POLICY "self_report_measures_support" ON self_report_measures
  FOR ALL USING (public.is_support());

-- ============================================================================
-- PROGRESS TRACKING RLS POLICIES
-- ============================================================================

-- Users can manage their own progress tracking
CREATE POLICY "progress_tracking_own" ON progress_tracking
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Couple members can view shared progress tracking
CREATE POLICY "progress_tracking_couple_shared" ON progress_tracking
  FOR SELECT USING (
    couple_id IS NOT NULL AND
    public.is_couple_member(couple_id) AND
    shared_with_partner = true
  );

-- Support staff can view progress tracking for support purposes
CREATE POLICY "progress_tracking_support" ON progress_tracking
  FOR SELECT USING (public.is_support());

-- ============================================================================
-- CONTENT TEMPLATES RLS POLICIES
-- ============================================================================

-- All authenticated users can view active, approved templates
CREATE POLICY "content_templates_public" ON content_templates
  FOR SELECT USING (
    is_active = true AND 
    approved_for_production = true
  );

-- Support staff can manage all content templates
CREATE POLICY "content_templates_support" ON content_templates
  FOR ALL USING (public.is_support());

-- ============================================================================
-- SAFETY MONITORING FUNCTIONS
-- ============================================================================

-- Function to create safety risk signal (system use only)
CREATE OR REPLACE FUNCTION create_safety_risk_signal(
  p_user_id UUID,
  p_couple_id UUID,
  p_signal_source TEXT,
  p_signal_type TEXT,
  p_risk_level TEXT,
  p_confidence_score DECIMAL(3,2),
  p_detected_indicators JSONB,
  p_context_data JSONB DEFAULT '{}'::jsonb,
  p_source_content_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_signal_id UUID;
BEGIN
  -- Insert safety risk signal
  INSERT INTO safety_risk_signals (
    user_id, couple_id, signal_source, signal_type, risk_level, 
    confidence_score, detected_indicators, context_data, source_content_id
  ) VALUES (
    p_user_id, p_couple_id, p_signal_source, p_signal_type, p_risk_level,
    p_confidence_score, p_detected_indicators, p_context_data, p_source_content_id
  ) RETURNING id INTO v_signal_id;
  
  -- Auto-escalate high and critical risks
  IF p_risk_level IN ('high', 'critical') THEN
    PERFORM create_safety_intervention(
      p_user_id,
      p_couple_id, 
      v_signal_id,
      CASE 
        WHEN p_risk_level = 'critical' THEN 'emergency'
        ELSE 'high'
      END,
      jsonb_build_object(
        'auto_triggered', true,
        'trigger_signal_id', v_signal_id,
        'risk_level', p_risk_level
      )
    );
  END IF;
  
  -- Log the signal creation
  INSERT INTO audit_log (
    user_id, action_type, resource_type, resource_id, details
  ) VALUES (
    p_user_id, 'safety_signal_created', 'safety_risk_signal', v_signal_id,
    jsonb_build_object(
      'signal_type', p_signal_type,
      'risk_level', p_risk_level,
      'confidence_score', p_confidence_score
    )
  );
  
  RETURN v_signal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create safety intervention (system use only)
CREATE OR REPLACE FUNCTION create_safety_intervention(
  p_user_id UUID,
  p_couple_id UUID,
  p_triggered_by_signal_id UUID,
  p_intervention_level TEXT,
  p_actions_taken JSONB
) RETURNS UUID AS $$
DECLARE
  v_intervention_id UUID;
  v_intervention_type TEXT;
  v_immediate_action BOOLEAN := false;
BEGIN
  -- Determine intervention type based on level and signal
  SELECT 
    CASE 
      WHEN p_intervention_level = 'emergency' THEN 'emergency_contact'
      WHEN p_intervention_level = 'high' THEN 'crisis_hotline'
      WHEN p_intervention_level = 'medium' THEN 'professional_referral'
      ELSE 'resource_provision'
    END,
    p_intervention_level IN ('emergency', 'high')
  INTO v_intervention_type, v_immediate_action;
  
  -- Insert safety intervention
  INSERT INTO safety_interventions (
    user_id, couple_id, triggered_by_signal_id, intervention_type,
    intervention_level, actions_taken, immediate_action_required
  ) VALUES (
    p_user_id, p_couple_id, p_triggered_by_signal_id, v_intervention_type,
    p_intervention_level, p_actions_taken, v_immediate_action
  ) RETURNING id INTO v_intervention_id;
  
  -- For emergency level, also create crisis escalation
  IF p_intervention_level = 'emergency' THEN
    INSERT INTO crisis_escalations (
      user_id, couple_id, triggered_by_signal_id,
      escalation_type, severity_level, escalation_reason,
      immediate_actions_taken
    ) VALUES (
      p_user_id, p_couple_id, p_triggered_by_signal_id,
      'immediate_danger', 'emergency', 'Automated escalation from critical safety signal',
      p_actions_taken
    );
  END IF;
  
  -- Log the intervention creation
  INSERT INTO audit_log (
    user_id, action_type, resource_type, resource_id, details
  ) VALUES (
    p_user_id, 'safety_intervention_created', 'safety_intervention', v_intervention_id,
    jsonb_build_object(
      'intervention_level', p_intervention_level,
      'intervention_type', v_intervention_type,
      'immediate_action', v_immediate_action
    )
  );
  
  RETURN v_intervention_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's safety status summary
CREATE OR REPLACE FUNCTION get_user_safety_status(p_user_id UUID)
RETURNS TABLE(
  current_risk_level TEXT,
  active_signals_count INTEGER,
  last_signal_date TIMESTAMPTZ,
  active_interventions_count INTEGER,
  safety_monitoring_enabled BOOLEAN
) AS $$
BEGIN
  -- Verify authorization
  IF NOT (
    p_user_id IN (SELECT users.id FROM users WHERE users.auth_id = auth.uid()) OR
    public.is_support()
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to safety status';
  END IF;
  
  RETURN QUERY
  SELECT 
    COALESCE(
      (SELECT srs.risk_level 
       FROM safety_risk_signals srs 
       WHERE srs.user_id = p_user_id 
       ORDER BY srs.created_at DESC 
       LIMIT 1), 
      'safe'
    ) as current_risk_level,
    
    (SELECT COUNT(*)::INTEGER 
     FROM safety_risk_signals srs 
     WHERE srs.user_id = p_user_id 
     AND srs.created_at > NOW() - INTERVAL '7 days'
     AND NOT srs.resolved
    ) as active_signals_count,
    
    (SELECT MAX(srs.created_at)
     FROM safety_risk_signals srs 
     WHERE srs.user_id = p_user_id
    ) as last_signal_date,
    
    (SELECT COUNT(*)::INTEGER
     FROM safety_interventions si 
     WHERE si.user_id = p_user_id 
     AND si.status IN ('initiated', 'in_progress')
    ) as active_interventions_count,
    
    (SELECT u.safety_monitoring_enabled
     FROM users u 
     WHERE u.id = p_user_id
    ) as safety_monitoring_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get location-appropriate safety resources
CREATE OR REPLACE FUNCTION get_safety_resources_for_location(
  p_country_code TEXT DEFAULT 'US',
  p_state_province TEXT DEFAULT NULL,
  p_resource_types TEXT[] DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  resource_name TEXT,
  resource_type TEXT,
  phone_number TEXT,
  text_number TEXT,
  website_url TEXT,
  availability_hours TEXT,
  service_description TEXT,
  cost_structure TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.resource_name,
    sr.resource_type,
    sr.phone_number,
    sr.text_number,
    sr.website_url,
    sr.availability_hours,
    sr.service_description,
    sr.cost_structure
  FROM safety_resources sr
  WHERE sr.is_active = true
  AND sr.verified = true
  AND (sr.country_code = p_country_code OR sr.country_code = 'GLOBAL')
  AND (p_state_province IS NULL OR sr.state_province = p_state_province OR sr.state_province IS NULL)
  AND (p_resource_types IS NULL OR sr.resource_type = ANY(p_resource_types))
  ORDER BY sr.display_priority ASC, sr.resource_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track content template usage
CREATE OR REPLACE FUNCTION track_content_template_usage(
  p_template_id UUID,
  p_response_time_ms INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE content_templates SET
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    response_time_ms = COALESCE(p_response_time_ms, response_time_ms)
  WHERE id = p_template_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SAFETY MONITORING TRIGGERS
-- ============================================================================

-- Trigger to auto-analyze communication for safety
CREATE OR REPLACE FUNCTION trigger_communication_safety_analysis()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for new messages
  IF TG_OP = 'INSERT' THEN
    -- Schedule async safety analysis (this would integrate with your AI safety system)
    INSERT INTO audit_log (
      user_id, action_type, resource_type, resource_id, details
    ) VALUES (
      NEW.sender_user_id, 'communication_safety_analysis_queued', 'communication_history', NEW.id,
      jsonb_build_object(
        'couple_id', NEW.couple_id,
        'message_type', NEW.message_type,
        'analysis_queued_at', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER communication_safety_analysis_trigger
  AFTER INSERT ON communication_history
  FOR EACH ROW EXECUTE FUNCTION trigger_communication_safety_analysis();

-- Trigger to update safety resource usage
CREATE OR REPLACE FUNCTION update_safety_resource_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update usage count when resource is referenced in interventions
  IF TG_OP = 'INSERT' AND NEW.resources_provided IS NOT NULL THEN
    -- Extract resource IDs from the JSON and update usage counts
    -- This is a simplified version - in practice, you'd parse the JSON properly
    UPDATE safety_resources 
    SET usage_count = usage_count + 1, last_recommended_at = NOW()
    WHERE id = ANY(
      SELECT DISTINCT (value->>'id')::UUID 
      FROM jsonb_array_elements(NEW.resources_provided) 
      WHERE value->>'id' IS NOT NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER safety_resource_usage_trigger
  AFTER INSERT ON safety_interventions
  FOR EACH ROW EXECUTE FUNCTION update_safety_resource_usage();

-- ============================================================================
-- GRANT PERMISSIONS FOR SAFETY FUNCTIONS
-- ============================================================================

-- Grant access to safety status function
GRANT EXECUTE ON FUNCTION get_user_safety_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_safety_resources_for_location(TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION track_content_template_usage(UUID, INTEGER) TO authenticated;

-- Grant system functions to service role only
GRANT EXECUTE ON FUNCTION create_safety_risk_signal(UUID, UUID, TEXT, TEXT, TEXT, DECIMAL, JSONB, JSONB, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION create_safety_intervention(UUID, UUID, UUID, TEXT, JSONB) TO service_role;

-- ============================================================================
-- COMMENTS FOR SAFETY FUNCTIONS
-- ============================================================================

COMMENT ON FUNCTION create_safety_risk_signal IS 'System function to create safety risk signals with auto-escalation';
COMMENT ON FUNCTION create_safety_intervention IS 'System function to create safety interventions based on risk signals';
COMMENT ON FUNCTION get_user_safety_status IS 'Get comprehensive safety status for authorized users';
COMMENT ON FUNCTION get_safety_resources_for_location IS 'Get location-appropriate safety resources for crisis intervention';
COMMENT ON FUNCTION track_content_template_usage IS 'Track usage of content templates for optimization';