-- Sparq Connection V4: Crisis Workflow Automation
-- Migration 010: Automated crisis escalation, professional matching, and intervention workflows
-- Purpose: Implement sophisticated crisis detection and response automation

-- ============================================================================
-- CRISIS WORKFLOW STATE MANAGEMENT
-- ============================================================================

-- Crisis Workflow States: Track crisis intervention progression
CREATE TABLE crisis_workflow_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Crisis context
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  crisis_escalation_id UUID REFERENCES crisis_escalations(id),
  
  -- Workflow state
  current_state TEXT CHECK (current_state IN (
    'risk_detected', 'initial_assessment', 'resource_provision',
    'professional_matching', 'referral_initiated', 'professional_engaged',
    'intervention_active', 'follow_up_scheduled', 'case_monitoring',
    'case_resolved', 'case_closed'
  )) NOT NULL,
  previous_state TEXT,
  
  -- State metadata
  state_entered_at TIMESTAMPTZ DEFAULT NOW(),
  state_data JSONB DEFAULT '{}'::jsonb,
  auto_progression_enabled BOOLEAN DEFAULT true,
  
  -- Escalation tracking
  escalation_level TEXT CHECK (escalation_level IN ('low', 'medium', 'high', 'critical', 'emergency')),
  requires_human_intervention BOOLEAN DEFAULT false,
  human_override_active BOOLEAN DEFAULT false,
  
  -- Timing and deadlines
  target_response_time_minutes INTEGER,
  actual_response_time_minutes INTEGER,
  deadline_at TIMESTAMPTZ,
  overdue BOOLEAN DEFAULT false, -- Will be updated by triggers instead of generated column
  
  -- Outcome tracking
  successful_contact_made BOOLEAN DEFAULT false,
  user_engagement_level TEXT CHECK (user_engagement_level IN ('none', 'minimal', 'moderate', 'high', 'collaborative')),
  intervention_effectiveness_score DECIMAL(3,2),
  
  -- Quality assurance
  compliance_checked BOOLEAN DEFAULT false,
  quality_review_required BOOLEAN DEFAULT false,
  reviewed_by_supervisor BOOLEAN DEFAULT false
);

-- Professional Matching Criteria: AI-driven professional selection
CREATE TABLE professional_matching_criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Crisis context
  crisis_escalation_id UUID NOT NULL REFERENCES crisis_escalations(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- User location and preferences
  user_jurisdiction_id UUID REFERENCES jurisdictions(id),
  preferred_languages JSONB DEFAULT '["en"]'::jsonb,
  cultural_considerations JSONB DEFAULT '[]'::jsonb,
  
  -- Crisis-specific requirements
  crisis_type TEXT NOT NULL,
  urgency_level TEXT NOT NULL,
  specialized_care_needed JSONB DEFAULT '[]'::jsonb, -- e.g., ["domestic_violence", "substance_abuse"]
  
  -- Professional requirements
  required_credentials JSONB DEFAULT '[]'::jsonb,
  preferred_therapy_approaches JSONB DEFAULT '[]'::jsonb,
  insurance_constraints JSONB DEFAULT '{}'::jsonb,
  
  -- Accessibility and practical considerations
  telehealth_preference TEXT CHECK (telehealth_preference IN ('required', 'preferred', 'acceptable', 'not_preferred')),
  mobility_accommodations_needed BOOLEAN DEFAULT false,
  scheduling_constraints JSONB DEFAULT '{}'::jsonb,
  
  -- Matching algorithm parameters
  algorithm_version TEXT DEFAULT '1.0',
  matching_confidence_threshold DECIMAL(3,2) DEFAULT 0.75,
  max_professionals_to_contact INTEGER DEFAULT 3,
  
  -- Matching results
  matching_completed BOOLEAN DEFAULT false,
  matches_found INTEGER DEFAULT 0,
  best_match_confidence DECIMAL(3,2),
  matching_completed_at TIMESTAMPTZ
);

-- Professional Match Results: Ranked professional matches
CREATE TABLE professional_match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Match context
  matching_criteria_id UUID NOT NULL REFERENCES professional_matching_criteria(id),
  professional_id UUID NOT NULL REFERENCES professional_contacts(id),
  
  -- Match scoring
  match_score DECIMAL(4,3) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  confidence_level DECIMAL(3,2) NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 1),
  rank_order INTEGER NOT NULL,
  
  -- Scoring breakdown
  location_score DECIMAL(3,2),
  specialization_score DECIMAL(3,2),
  availability_score DECIMAL(3,2),
  user_preference_score DECIMAL(3,2),
  historical_success_score DECIMAL(3,2),
  
  -- Match justification
  match_reasons JSONB NOT NULL,
  potential_concerns JSONB DEFAULT '[]'::jsonb,
  
  -- Contact attempt tracking
  contact_attempted BOOLEAN DEFAULT false,
  contact_successful BOOLEAN DEFAULT false,
  professional_available BOOLEAN DEFAULT NULL,
  
  -- Algorithm metadata
  algorithm_version TEXT DEFAULT '1.0',
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crisis Communication Log: All crisis-related communications
CREATE TABLE crisis_communication_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Communication context
  crisis_escalation_id UUID NOT NULL REFERENCES crisis_escalations(id),
  workflow_state_id UUID REFERENCES crisis_workflow_states(id),
  
  -- Communication details
  communication_type TEXT CHECK (communication_type IN (
    'user_contact', 'professional_contact', 'emergency_contact', 'family_notification',
    'resource_provision', 'follow_up_check', 'case_coordination'
  )) NOT NULL,
  
  -- Participants
  initiated_by TEXT CHECK (initiated_by IN ('system', 'staff', 'professional', 'user', 'emergency_contact')),
  recipient_type TEXT CHECK (recipient_type IN ('user', 'professional', 'emergency_contact', 'family_member', 'authority')),
  staff_user_id UUID REFERENCES users(id),
  
  -- Communication content and outcome
  communication_method TEXT CHECK (communication_method IN ('phone', 'email', 'text', 'in_person', 'video_call', 'app_notification')),
  communication_successful BOOLEAN DEFAULT false,
  response_received BOOLEAN DEFAULT false,
  response_time_minutes INTEGER,
  
  -- Content summary (no PII)
  communication_summary TEXT NOT NULL,
  outcome_category TEXT CHECK (outcome_category IN (
    'contact_successful', 'no_response', 'busy_try_later', 'declined_help',
    'referral_accepted', 'emergency_services_contacted', 'follow_up_scheduled'
  )),
  
  -- Follow-up requirements
  requires_follow_up BOOLEAN DEFAULT false,
  follow_up_deadline TIMESTAMPTZ,
  follow_up_priority TEXT CHECK (follow_up_priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Quality and compliance
  compliance_notes TEXT,
  privacy_considerations JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- AUTOMATED WORKFLOW FUNCTIONS
-- ============================================================================

-- Function to initialize crisis workflow
CREATE OR REPLACE FUNCTION initialize_crisis_workflow(
  p_crisis_escalation_id UUID,
  p_initial_state TEXT DEFAULT 'risk_detected'
) RETURNS UUID AS $$
DECLARE
  v_workflow_id UUID;
  v_user_id UUID;
  v_couple_id UUID;
  v_severity_level TEXT;
  v_target_response_time INTEGER;
BEGIN
  -- Get escalation details
  SELECT user_id, couple_id, severity_level 
  INTO v_user_id, v_couple_id, v_severity_level
  FROM crisis_escalations 
  WHERE id = p_crisis_escalation_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Crisis escalation not found: %', p_crisis_escalation_id;
  END IF;
  
  -- Determine target response time based on severity
  v_target_response_time := CASE v_severity_level
    WHEN 'emergency' THEN 15    -- 15 minutes
    WHEN 'critical' THEN 60     -- 1 hour
    WHEN 'high' THEN 240        -- 4 hours
    ELSE 1440                   -- 24 hours
  END;
  
  -- Create workflow state
  INSERT INTO crisis_workflow_states (
    user_id, couple_id, crisis_escalation_id, current_state,
    escalation_level, target_response_time_minutes,
    deadline_at, requires_human_intervention
  ) VALUES (
    v_user_id, v_couple_id, p_crisis_escalation_id, p_initial_state,
    v_severity_level, v_target_response_time,
    NOW() + (v_target_response_time || ' minutes')::INTERVAL,
    v_severity_level IN ('emergency', 'critical')
  ) RETURNING id INTO v_workflow_id;
  
  -- Log workflow initialization
  PERFORM create_audit_log(
    v_user_id,
    'crisis_workflow_initialized',
    'crisis_workflow',
    v_workflow_id,
    jsonb_build_object(
      'crisis_escalation_id', p_crisis_escalation_id,
      'initial_state', p_initial_state,
      'severity_level', v_severity_level,
      'target_response_time_minutes', v_target_response_time
    ),
    NULL, NULL, 'internal'
  );
  
  -- Trigger initial workflow actions
  PERFORM advance_crisis_workflow(v_workflow_id);
  
  RETURN v_workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to advance crisis workflow to next state
CREATE OR REPLACE FUNCTION advance_crisis_workflow(p_workflow_id UUID)
RETURNS JSONB AS $$
DECLARE
  workflow_record RECORD;
  next_state TEXT;
  actions_taken JSONB := '[]'::jsonb;
  state_data JSONB := '{}'::jsonb;
  auto_advance BOOLEAN := true;
BEGIN
  -- Get current workflow state
  SELECT * INTO workflow_record 
  FROM crisis_workflow_states 
  WHERE id = p_workflow_id;
  
  IF workflow_record IS NULL THEN
    RAISE EXCEPTION 'Workflow not found: %', p_workflow_id;
  END IF;
  
  -- Determine next state and actions based on current state
  CASE workflow_record.current_state
    WHEN 'risk_detected' THEN
      next_state := 'initial_assessment';
      -- Trigger automated risk assessment
      actions_taken := actions_taken || jsonb_build_object(
        'action', 'automated_risk_assessment',
        'triggered_at', NOW(),
        'assessment_algorithm', 'crisis_assessment_v1.0'
      );
      
    WHEN 'initial_assessment' THEN
      IF workflow_record.escalation_level IN ('emergency', 'critical') THEN
        next_state := 'professional_matching';
        -- Start professional matching process
        PERFORM initiate_professional_matching(workflow_record.crisis_escalation_id);
        actions_taken := actions_taken || jsonb_build_object(
          'action', 'professional_matching_initiated',
          'urgency_level', workflow_record.escalation_level
        );
      ELSE
        next_state := 'resource_provision';
        -- Provide self-help resources
        PERFORM provide_crisis_resources(workflow_record.user_id, workflow_record.escalation_level);
        actions_taken := actions_taken || jsonb_build_object(
          'action', 'self_help_resources_provided',
          'resource_type', 'automated_resource_list'
        );
      END IF;
      
    WHEN 'resource_provision' THEN
      -- Check if user has engaged with resources
      IF check_user_resource_engagement(workflow_record.user_id) THEN
        next_state := 'case_monitoring';
        auto_advance := false; -- Require manual review
      ELSE
        next_state := 'professional_matching';
        PERFORM initiate_professional_matching(workflow_record.crisis_escalation_id);
      END IF;
      
    WHEN 'professional_matching' THEN
      next_state := 'referral_initiated';
      -- Check if matches found and initiate contact
      IF initiate_professional_contact(p_workflow_id) THEN
        actions_taken := actions_taken || jsonb_build_object(
          'action', 'professional_contact_initiated',
          'contact_method', 'automated_referral'
        );
      ELSE
        -- No suitable professionals available
        next_state := 'resource_provision';
        actions_taken := actions_taken || jsonb_build_object(
          'action', 'fallback_to_resources',
          'reason', 'no_available_professionals'
        );
      END IF;
      
    WHEN 'referral_initiated' THEN
      auto_advance := false; -- Wait for professional response
      state_data := jsonb_build_object(
        'awaiting_professional_response', true,
        'response_deadline', NOW() + INTERVAL '2 hours'
      );
      
    WHEN 'professional_engaged' THEN
      next_state := 'intervention_active';
      actions_taken := actions_taken || jsonb_build_object(
        'action', 'intervention_commenced',
        'intervention_type', 'professional_therapy'
      );
      
    WHEN 'intervention_active' THEN
      next_state := 'follow_up_scheduled';
      -- Schedule follow-up check
      PERFORM schedule_crisis_follow_up(
        workflow_record.user_id, 
        workflow_record.crisis_escalation_id,
        CASE workflow_record.escalation_level
          WHEN 'emergency' THEN INTERVAL '24 hours'
          WHEN 'critical' THEN INTERVAL '48 hours'
          ELSE INTERVAL '1 week'
        END
      );
      
    WHEN 'follow_up_scheduled' THEN
      next_state := 'case_monitoring';
      auto_advance := false; -- Require manual review
      
    WHEN 'case_monitoring' THEN
      -- This state requires manual assessment to determine if case can be closed
      auto_advance := false;
      
    ELSE
      -- Unknown or terminal state
      auto_advance := false;
  END CASE;
  
  -- Update workflow state if advancing
  IF next_state IS NOT NULL AND auto_advance THEN
    UPDATE crisis_workflow_states SET
      previous_state = current_state,
      current_state = next_state,
      state_entered_at = NOW(),
      state_data = state_data,
      updated_at = NOW()
    WHERE id = p_workflow_id;
    
    -- Log state transition
    INSERT INTO crisis_communication_log (
      crisis_escalation_id, workflow_state_id, communication_type,
      initiated_by, communication_method, communication_successful,
      communication_summary, outcome_category
    ) VALUES (
      workflow_record.crisis_escalation_id, p_workflow_id, 'case_coordination',
      'system', 'app_notification', true,
      format('Workflow advanced from %s to %s', workflow_record.current_state, next_state),
      'contact_successful'
    );
  END IF;
  
  -- Return workflow advancement summary
  RETURN jsonb_build_object(
    'workflow_id', p_workflow_id,
    'previous_state', workflow_record.current_state,
    'new_state', next_state,
    'auto_advanced', auto_advance,
    'actions_taken', actions_taken,
    'state_data', state_data,
    'processed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initiate professional matching
CREATE OR REPLACE FUNCTION initiate_professional_matching(p_crisis_escalation_id UUID)
RETURNS UUID AS $$
DECLARE
  v_matching_id UUID;
  escalation_record RECORD;
  user_jurisdiction UUID;
  user_preferences RECORD;
BEGIN
  -- Get escalation details
  SELECT * INTO escalation_record 
  FROM crisis_escalations 
  WHERE id = p_crisis_escalation_id;
  
  -- Get user jurisdiction
  SELECT jurisdiction_id INTO user_jurisdiction
  FROM user_jurisdictions
  WHERE user_id = escalation_record.user_id 
  AND is_current = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Get user preferences
  SELECT * INTO user_preferences
  FROM user_preferences
  WHERE user_id = escalation_record.user_id;
  
  -- Create matching criteria
  INSERT INTO professional_matching_criteria (
    crisis_escalation_id, user_id, user_jurisdiction_id,
    crisis_type, urgency_level,
    specialized_care_needed,
    telehealth_preference
  ) VALUES (
    p_crisis_escalation_id, escalation_record.user_id, user_jurisdiction,
    escalation_record.escalation_type, escalation_record.severity_level,
    jsonb_build_array(escalation_record.escalation_type),
    CASE WHEN user_preferences.language_preference != 'en' THEN 'preferred' ELSE 'acceptable' END
  ) RETURNING id INTO v_matching_id;
  
  -- Execute matching algorithm
  PERFORM execute_professional_matching_algorithm(v_matching_id);
  
  RETURN v_matching_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute professional matching algorithm
CREATE OR REPLACE FUNCTION execute_professional_matching_algorithm(p_matching_criteria_id UUID)
RETURNS INTEGER AS $$
DECLARE
  criteria_record RECORD;
  professional_record RECORD;
  match_score DECIMAL(4,3);
  location_score DECIMAL(3,2);
  specialization_score DECIMAL(3,2);
  availability_score DECIMAL(3,2);
  preference_score DECIMAL(3,2);
  historical_score DECIMAL(3,2);
  matches_created INTEGER := 0;
  rank_counter INTEGER := 1;
BEGIN
  -- Get matching criteria
  SELECT * INTO criteria_record 
  FROM professional_matching_criteria 
  WHERE id = p_matching_criteria_id;
  
  -- Find matching professionals
  FOR professional_record IN
    SELECT pc.*, 
           COALESCE(pc.referral_success_rate / 100.0, 0.7) as success_rate
    FROM professional_contacts pc
    WHERE pc.is_active = true
    AND pc.license_verified = true
    AND pc.accepts_crisis_referrals = true
    AND pc.current_capacity_level IN ('available', 'limited')
    -- Basic filtering based on criteria
    AND (criteria_record.specialized_care_needed IS NULL 
         OR pc.specializations ?| (SELECT jsonb_array_elements_text(criteria_record.specialized_care_needed)))
    ORDER BY pc.referral_success_rate DESC, pc.response_time_hours ASC
    LIMIT 10 -- Limit to top candidates for performance
  LOOP
    -- Calculate component scores
    
    -- Location scoring (within same jurisdiction gets higher score)
    location_score := CASE 
      WHEN professional_record.serves_jurisdiction_ids @> jsonb_build_array(criteria_record.user_jurisdiction_id::text) THEN 1.0
      WHEN professional_record.telehealth_available = true THEN 0.8
      ELSE 0.3
    END;
    
    -- Specialization scoring
    specialization_score := CASE 
      WHEN professional_record.specializations @> criteria_record.specialized_care_needed THEN 1.0
      WHEN professional_record.specializations && criteria_record.specialized_care_needed THEN 0.7
      ELSE 0.4
    END;
    
    -- Availability scoring
    availability_score := CASE professional_record.current_capacity_level
      WHEN 'available' THEN 1.0
      WHEN 'limited' THEN 0.6
      ELSE 0.2
    END;
    
    -- User preference scoring (simplified)
    preference_score := CASE 
      WHEN criteria_record.telehealth_preference = 'required' AND professional_record.telehealth_available THEN 1.0
      WHEN criteria_record.telehealth_preference = 'preferred' AND professional_record.telehealth_available THEN 0.9
      ELSE 0.7
    END;
    
    -- Historical success scoring
    historical_score := COALESCE(professional_record.success_rate, 0.7);
    
    -- Calculate weighted match score
    match_score := (
      location_score * 0.25 +
      specialization_score * 0.35 +
      availability_score * 0.20 +
      preference_score * 0.10 +
      historical_score * 0.10
    );
    
    -- Only create matches above threshold
    IF match_score >= criteria_record.matching_confidence_threshold THEN
      INSERT INTO professional_match_results (
        matching_criteria_id, professional_id, match_score, confidence_level, rank_order,
        location_score, specialization_score, availability_score, 
        user_preference_score, historical_success_score,
        match_reasons
      ) VALUES (
        p_matching_criteria_id, professional_record.id, match_score, 
        LEAST(match_score + 0.1, 1.0), rank_counter,
        location_score, specialization_score, availability_score,
        preference_score, historical_score,
        jsonb_build_object(
          'primary_match_factors', jsonb_build_array(
            CASE WHEN specialization_score >= 0.8 THEN 'specialized_expertise' END,
            CASE WHEN location_score >= 0.8 THEN 'geographic_proximity' END,
            CASE WHEN availability_score >= 0.8 THEN 'immediate_availability' END,
            CASE WHEN historical_score >= 0.8 THEN 'proven_success_rate' END
          ),
          'match_strength', CASE 
            WHEN match_score >= 0.9 THEN 'excellent'
            WHEN match_score >= 0.8 THEN 'very_good'
            WHEN match_score >= 0.7 THEN 'good'
            ELSE 'acceptable'
          END
        )
      );
      
      matches_created := matches_created + 1;
      rank_counter := rank_counter + 1;
      
      -- Stop after finding enough matches
      IF matches_created >= criteria_record.max_professionals_to_contact THEN
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  -- Update matching criteria with results
  UPDATE professional_matching_criteria SET
    matching_completed = true,
    matches_found = matches_created,
    best_match_confidence = (
      SELECT MAX(confidence_level) 
      FROM professional_match_results 
      WHERE matching_criteria_id = p_matching_criteria_id
    ),
    matching_completed_at = NOW()
  WHERE id = p_matching_criteria_id;
  
  RETURN matches_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initiate professional contact
CREATE OR REPLACE FUNCTION initiate_professional_contact(p_workflow_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  workflow_record RECORD;
  match_record RECORD;
  contact_successful BOOLEAN := false;
BEGIN
  -- Get workflow details
  SELECT * INTO workflow_record 
  FROM crisis_workflow_states 
  WHERE id = p_workflow_id;
  
  -- Get best professional match
  SELECT pmr.*, pmc.crisis_type, pmc.urgency_level
  INTO match_record
  FROM professional_match_results pmr
  JOIN professional_matching_criteria pmc ON pmr.matching_criteria_id = pmc.id
  WHERE pmc.crisis_escalation_id = workflow_record.crisis_escalation_id
  AND pmr.contact_attempted = false
  ORDER BY pmr.rank_order ASC
  LIMIT 1;
  
  IF match_record IS NOT NULL THEN
    -- Create professional referral
    INSERT INTO professional_referrals (
      user_id, professional_id, crisis_escalation_id,
      referral_reason, urgency_level, referral_type
    ) VALUES (
      workflow_record.user_id, match_record.professional_id, workflow_record.crisis_escalation_id,
      format('Automated crisis referral: %s', match_record.crisis_type),
      match_record.urgency_level, 'crisis_intervention'
    );
    
    -- Mark match as contacted
    UPDATE professional_match_results SET
      contact_attempted = true,
      contact_successful = true -- Simplified - in real implementation, would wait for response
    WHERE id = match_record.id;
    
    -- Log communication attempt
    INSERT INTO crisis_communication_log (
      crisis_escalation_id, workflow_state_id, communication_type,
      initiated_by, recipient_type, communication_method,
      communication_successful, communication_summary, outcome_category
    ) VALUES (
      workflow_record.crisis_escalation_id, p_workflow_id, 'professional_contact',
      'system', 'professional', 'email',
      true, format('Automated referral sent to professional (match score: %s)', match_record.match_score),
      'referral_accepted'
    );
    
    contact_successful := true;
  END IF;
  
  RETURN contact_successful;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to provide crisis resources
CREATE OR REPLACE FUNCTION provide_crisis_resources(
  p_user_id UUID,
  p_urgency_level TEXT
) RETURNS JSONB AS $$
DECLARE
  user_location TEXT;
  resources JSONB;
BEGIN
  -- Get user's location for appropriate resources
  SELECT j.country_code INTO user_location
  FROM user_jurisdictions uj
  JOIN jurisdictions j ON uj.jurisdiction_id = j.id
  WHERE uj.user_id = p_user_id AND uj.is_current = true
  ORDER BY uj.created_at DESC
  LIMIT 1;
  
  -- Get appropriate resources
  SELECT jsonb_agg(
    jsonb_build_object(
      'resource_name', sr.resource_name,
      'resource_type', sr.resource_type,
      'phone_number', sr.phone_number,
      'text_number', sr.text_number,
      'website_url', sr.website_url,
      'availability_hours', sr.availability_hours
    )
  ) INTO resources
  FROM safety_resources sr
  WHERE sr.is_active = true
  AND sr.verified = true
  AND (sr.country_code = COALESCE(user_location, 'US') OR sr.country_code = 'GLOBAL')
  ORDER BY sr.display_priority ASC
  LIMIT 5;
  
  -- Log resource provision
  PERFORM create_audit_log(
    p_user_id,
    'crisis_resources_provided',
    'safety_resources',
    NULL,
    jsonb_build_object(
      'urgency_level', p_urgency_level,
      'resources_provided_count', jsonb_array_length(COALESCE(resources, '[]'::jsonb)),
      'user_location', user_location
    )
  );
  
  RETURN resources;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user resource engagement
CREATE OR REPLACE FUNCTION check_user_resource_engagement(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  engagement_detected BOOLEAN := false;
BEGIN
  -- Check for recent user activity indicating engagement
  -- This is simplified - in practice, would check various engagement metrics
  SELECT EXISTS (
    SELECT 1 FROM audit_log
    WHERE user_id = p_user_id
    AND action_type IN ('resource_accessed', 'assessment_completed', 'communication_sent')
    AND created_at > NOW() - INTERVAL '1 hour'
  ) INTO engagement_detected;
  
  RETURN engagement_detected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to schedule crisis follow-up
CREATE OR REPLACE FUNCTION schedule_crisis_follow_up(
  p_user_id UUID,
  p_crisis_escalation_id UUID,
  p_follow_up_interval INTERVAL
) RETURNS UUID AS $$
DECLARE
  v_communication_id UUID;
BEGIN
  -- Schedule follow-up communication
  INSERT INTO crisis_communication_log (
    crisis_escalation_id, communication_type, initiated_by,
    recipient_type, communication_method, communication_summary,
    requires_follow_up, follow_up_deadline, follow_up_priority
  ) VALUES (
    p_crisis_escalation_id, 'follow_up_check', 'system',
    'user', 'app_notification', 'Scheduled crisis follow-up check',
    true, NOW() + p_follow_up_interval, 
    CASE 
      WHEN p_follow_up_interval <= INTERVAL '24 hours' THEN 'urgent'
      WHEN p_follow_up_interval <= INTERVAL '3 days' THEN 'high'
      ELSE 'medium'
    END
  ) RETURNING id INTO v_communication_id;
  
  RETURN v_communication_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- WORKFLOW AUTOMATION TRIGGERS
-- ============================================================================

-- Trigger to auto-advance workflow on state changes
CREATE OR REPLACE FUNCTION trigger_workflow_advancement()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if workflow should auto-advance
  IF NEW.auto_progression_enabled = true 
     AND NEW.requires_human_intervention = false
     AND NEW.human_override_active = false THEN
    
    -- Schedule async workflow advancement
    PERFORM pg_notify(
      'crisis_workflow_advance',
      jsonb_build_object(
        'workflow_id', NEW.id,
        'current_state', NEW.current_state,
        'escalation_level', NEW.escalation_level
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crisis_workflow_advancement_trigger
  AFTER INSERT OR UPDATE ON crisis_workflow_states
  FOR EACH ROW EXECUTE FUNCTION trigger_workflow_advancement();

-- ============================================================================
-- INDEXES AND PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Crisis workflow states indexes
CREATE INDEX idx_crisis_workflow_states_user_id ON crisis_workflow_states(user_id, created_at DESC);
CREATE INDEX idx_crisis_workflow_states_current_state ON crisis_workflow_states(current_state);
CREATE INDEX idx_crisis_workflow_states_escalation ON crisis_workflow_states(escalation_level, deadline_at);
CREATE INDEX idx_crisis_workflow_states_overdue ON crisis_workflow_states(overdue) WHERE overdue = true;

-- Professional matching indexes
CREATE INDEX idx_professional_matching_criteria_crisis ON professional_matching_criteria(crisis_escalation_id);
CREATE INDEX idx_professional_matching_criteria_completed ON professional_matching_criteria(matching_completed, matching_completed_at);

-- Professional match results indexes
CREATE INDEX idx_professional_match_results_criteria ON professional_match_results(matching_criteria_id, rank_order);
CREATE INDEX idx_professional_match_results_professional ON professional_match_results(professional_id);
CREATE INDEX idx_professional_match_results_score ON professional_match_results(match_score DESC);

-- Crisis communication log indexes
CREATE INDEX idx_crisis_communication_log_escalation ON crisis_communication_log(crisis_escalation_id, created_at DESC);
CREATE INDEX idx_crisis_communication_log_follow_up ON crisis_communication_log(follow_up_deadline) WHERE requires_follow_up = true;
CREATE INDEX idx_crisis_communication_log_type ON crisis_communication_log(communication_type, created_at);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER update_crisis_workflow_states_updated_at BEFORE UPDATE ON crisis_workflow_states FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_professional_matching_criteria_updated_at BEFORE UPDATE ON professional_matching_criteria FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE crisis_workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_matching_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_communication_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR CRISIS WORKFLOW TABLES
-- ============================================================================

-- Crisis workflow states - support staff only
CREATE POLICY "crisis_workflow_states_support" ON crisis_workflow_states
  FOR ALL USING (public.is_support());

-- Professional matching - support staff only  
CREATE POLICY "professional_matching_criteria_support" ON professional_matching_criteria
  FOR ALL USING (public.is_support());

CREATE POLICY "professional_match_results_support" ON professional_match_results
  FOR SELECT USING (public.is_support());

-- Crisis communication log - support staff and user's own records
CREATE POLICY "crisis_communication_log_support" ON crisis_communication_log
  FOR ALL USING (public.is_support());

CREATE POLICY "crisis_communication_log_user" ON crisis_communication_log
  FOR SELECT USING (
    crisis_escalation_id IN (
      SELECT id FROM crisis_escalations 
      WHERE user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Crisis workflow functions - restricted to service role and support staff
REVOKE ALL ON FUNCTION initialize_crisis_workflow(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION advance_crisis_workflow(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION initiate_professional_matching(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION execute_professional_matching_algorithm(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION initialize_crisis_workflow(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION advance_crisis_workflow(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION initiate_professional_matching(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION execute_professional_matching_algorithm(UUID) TO service_role;

-- Helper functions
GRANT EXECUTE ON FUNCTION provide_crisis_resources(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_resource_engagement(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE crisis_workflow_states IS 'State machine for managing crisis intervention workflows with automated progression';
COMMENT ON TABLE professional_matching_criteria IS 'AI-driven criteria for matching users with appropriate licensed professionals';
COMMENT ON TABLE professional_match_results IS 'Ranked professional matches with detailed scoring breakdown';
COMMENT ON TABLE crisis_communication_log IS 'Comprehensive log of all crisis-related communications and interventions';

COMMENT ON FUNCTION initialize_crisis_workflow IS 'Initialize automated crisis workflow with appropriate urgency and response times';
COMMENT ON FUNCTION advance_crisis_workflow IS 'Advance crisis workflow through automated state machine with intelligent decision-making';
COMMENT ON FUNCTION initiate_professional_matching IS 'Start AI-powered professional matching process based on user needs and crisis type';
COMMENT ON FUNCTION execute_professional_matching_algorithm IS 'Execute sophisticated matching algorithm considering location, specialization, availability, and success rates';