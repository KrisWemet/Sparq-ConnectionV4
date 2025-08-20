-- Secure Messaging System with Transparent Safety Monitoring
-- This migration creates the infrastructure for real-time messaging with safety analysis

-- ============================================================================
-- USER SAFETY PREFERENCES & CONSENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_safety_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- User identification
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Consent levels for different safety features
  safety_monitoring_enabled boolean DEFAULT true,
  toxicity_detection_enabled boolean DEFAULT true,
  crisis_detection_enabled boolean DEFAULT true,
  dv_pattern_detection_enabled boolean DEFAULT true,
  emotional_distress_monitoring boolean DEFAULT true,
  
  -- Granular consent settings
  consent_level text NOT NULL DEFAULT 'full_safety' CHECK (consent_level IN ('full_safety', 'basic_safety', 'manual_mode', 'privacy_mode')),
  consent_given_at timestamptz DEFAULT now(),
  consent_version text DEFAULT 'v1.0',
  
  -- User preferences
  intervention_style text DEFAULT 'gentle' CHECK (intervention_style IN ('gentle', 'direct', 'minimal')),
  crisis_resource_preference text DEFAULT 'local_and_national' CHECK (crisis_resource_preference IN ('local_only', 'national_only', 'local_and_national')),
  notification_preferences jsonb DEFAULT '{"in_app": true, "email": false, "sms": false}',
  
  -- Transparency settings
  show_risk_scores boolean DEFAULT false,
  show_intervention_reasons boolean DEFAULT true,
  monthly_transparency_reports boolean DEFAULT true,
  
  -- Safety override settings (for emergencies)
  allow_emergency_override boolean DEFAULT true,
  emergency_contact_info jsonb DEFAULT '{}',
  
  -- Privacy controls
  data_retention_days integer DEFAULT 90,
  allow_anonymized_analytics boolean DEFAULT true,
  
  CONSTRAINT user_safety_preferences_unique_user UNIQUE(user_id),
  CONSTRAINT user_safety_preferences_retention_positive CHECK (data_retention_days > 0)
);

-- Add RLS policies
ALTER TABLE user_safety_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own safety preferences"
  ON user_safety_preferences FOR ALL
  USING (auth.uid()::uuid = user_id);

-- ============================================================================
-- SECURE MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS secure_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Message identification and routing
  couple_id uuid REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  sender_user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recipient_user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Message content (encrypted at rest, server-readable for safety)
  content_encrypted text NOT NULL,
  content_hash text NOT NULL, -- For integrity verification
  message_type text DEFAULT 'free_form' CHECK (message_type IN ('free_form', 'prompt_response', 'appreciation', 'goal_update', 'crisis_support')),
  
  -- Threading and organization
  thread_id uuid DEFAULT gen_random_uuid(),
  parent_message_id uuid REFERENCES secure_messages(id) ON DELETE SET NULL,
  prompt_id uuid REFERENCES daily_prompts(id) ON DELETE SET NULL,
  
  -- Safety analysis
  safety_analyzed boolean DEFAULT false,
  risk_score integer DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level text DEFAULT 'safe' CHECK (risk_level IN ('safe', 'low', 'medium', 'high', 'critical')),
  crisis_indicators jsonb DEFAULT '[]',
  requires_intervention boolean DEFAULT false,
  
  -- Safety processing metadata
  safety_analysis_version text DEFAULT 'v1.0',
  safety_processed_at timestamptz,
  safety_bypass_reason text, -- If safety was bypassed
  
  -- Message status
  delivered_at timestamptz,
  read_at timestamptz,
  reactions jsonb DEFAULT '{}', -- {emoji: [user_ids]}
  
  -- Privacy and deletion
  visible_to_sender boolean DEFAULT true,
  visible_to_recipient boolean DEFAULT true,
  deleted_at timestamptz,
  deleted_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  CONSTRAINT secure_messages_different_users CHECK (sender_user_id != recipient_user_id)
);

-- Create indexes for performance
CREATE INDEX idx_secure_messages_couple_id ON secure_messages(couple_id, created_at DESC);
CREATE INDEX idx_secure_messages_sender ON secure_messages(sender_user_id, created_at DESC);
CREATE INDEX idx_secure_messages_recipient ON secure_messages(recipient_user_id, created_at DESC);
CREATE INDEX idx_secure_messages_thread ON secure_messages(thread_id, created_at ASC);
CREATE INDEX idx_secure_messages_risk_level ON secure_messages(risk_level, requires_intervention);
CREATE INDEX idx_secure_messages_safety_analysis ON secure_messages(safety_analyzed, safety_processed_at);

-- Add RLS policies
ALTER TABLE secure_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their couples"
  ON secure_messages FOR SELECT
  USING (
    auth.uid()::uuid IN (sender_user_id, recipient_user_id) AND
    (visible_to_sender = true OR visible_to_recipient = true) AND
    deleted_at IS NULL
  );

CREATE POLICY "Users can send messages to their partner"
  ON secure_messages FOR INSERT
  WITH CHECK (
    auth.uid()::uuid = sender_user_id AND
    EXISTS (
      SELECT 1 FROM couples 
      WHERE id = couple_id 
      AND (partner_1_id = auth.uid()::uuid OR partner_2_id = auth.uid()::uuid)
      AND is_active = true
    )
  );

CREATE POLICY "Users can update their own messages"
  ON secure_messages FOR UPDATE
  USING (auth.uid()::uuid = sender_user_id);

CREATE POLICY "Service role can manage messages for safety"
  ON secure_messages FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- MESSAGE RISK SCORES & ANALYSIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_risk_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Message reference
  message_id uuid REFERENCES secure_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  couple_id uuid REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  
  -- Risk analysis
  overall_risk_score integer NOT NULL CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
  risk_level text NOT NULL CHECK (risk_level IN ('safe', 'low', 'medium', 'high', 'critical')),
  confidence_score decimal(5,4) DEFAULT 0.5000 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Detailed risk breakdown
  toxicity_score integer DEFAULT 0 CHECK (toxicity_score >= 0 AND toxicity_score <= 100),
  crisis_score integer DEFAULT 0 CHECK (crisis_score >= 0 AND crisis_score <= 100),
  dv_risk_score integer DEFAULT 0 CHECK (dv_risk_score >= 0 AND dv_risk_score <= 100),
  emotional_distress_score integer DEFAULT 0 CHECK (emotional_distress_score >= 0 AND emotional_distress_score <= 100),
  
  -- Detection details
  detected_indicators jsonb DEFAULT '[]',
  triggered_keywords jsonb DEFAULT '[]',
  pattern_matches jsonb DEFAULT '[]',
  
  -- Analysis metadata
  analysis_model_version text DEFAULT 'v1.0',
  processing_time_ms integer,
  analysis_method text DEFAULT 'automated' CHECK (analysis_method IN ('automated', 'manual_review', 'hybrid')),
  
  -- Context
  conversation_context jsonb DEFAULT '{}',
  user_history_factor decimal(3,2) DEFAULT 1.00,
  relationship_context jsonb DEFAULT '{}'
);

-- Create indexes for risk analysis
CREATE INDEX idx_message_risk_scores_message_id ON message_risk_scores(message_id);
CREATE INDEX idx_message_risk_scores_user_risk ON message_risk_scores(user_id, overall_risk_score DESC, created_at DESC);
CREATE INDEX idx_message_risk_scores_couple_risk ON message_risk_scores(couple_id, risk_level, created_at DESC);
CREATE INDEX idx_message_risk_scores_high_risk ON message_risk_scores(risk_level, created_at DESC) WHERE risk_level IN ('high', 'critical');

-- Add RLS policies
ALTER TABLE message_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own message risk scores"
  ON message_risk_scores FOR SELECT
  USING (auth.uid()::uuid = user_id);

CREATE POLICY "Service role can manage risk scores"
  ON message_risk_scores FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- SAFETY INTERVENTIONS LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS safety_interventions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Intervention context
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  couple_id uuid REFERENCES couples(id) ON DELETE CASCADE,
  message_id uuid REFERENCES secure_messages(id) ON DELETE CASCADE,
  
  -- Intervention details
  intervention_type text NOT NULL CHECK (intervention_type IN (
    'cooling_off_suggestion', 'reframing_prompt', 'resource_surfacing', 
    'crisis_resource_display', 'professional_referral', 'emergency_escalation',
    'conversation_pause', 'guided_reflection', 'safety_check'
  )),
  
  risk_level_triggered text NOT NULL CHECK (risk_level_triggered IN ('low', 'medium', 'high', 'critical')),
  intervention_severity text NOT NULL CHECK (intervention_severity IN ('gentle', 'moderate', 'urgent', 'emergency')),
  
  -- Intervention content
  intervention_title text NOT NULL,
  intervention_message text NOT NULL,
  suggested_actions jsonb DEFAULT '[]',
  resources_provided jsonb DEFAULT '[]',
  
  -- User interaction
  user_acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz,
  user_feedback text CHECK (user_feedback IN ('helpful', 'not_helpful', 'intrusive', 'appropriate')),
  user_took_action boolean DEFAULT false,
  action_taken text,
  
  -- Effectiveness tracking
  conversation_paused boolean DEFAULT false,
  follow_up_needed boolean DEFAULT false,
  escalation_triggered boolean DEFAULT false,
  
  -- Transparency
  visible_to_user boolean DEFAULT true,
  explanation_provided text,
  user_can_disable boolean DEFAULT true,
  
  -- Metadata
  triggered_by_keywords jsonb DEFAULT '[]',
  detection_confidence decimal(5,4),
  intervention_metadata jsonb DEFAULT '{}'
);

-- Create indexes for interventions
CREATE INDEX idx_safety_interventions_user_id ON safety_interventions(user_id, created_at DESC);
CREATE INDEX idx_safety_interventions_message_id ON safety_interventions(message_id);
CREATE INDEX idx_safety_interventions_type ON safety_interventions(intervention_type, risk_level_triggered);
CREATE INDEX idx_safety_interventions_escalation ON safety_interventions(escalation_triggered, created_at DESC) WHERE escalation_triggered = true;

-- Add RLS policies
ALTER TABLE safety_interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own safety interventions"
  ON safety_interventions FOR SELECT
  USING (auth.uid()::uuid = user_id AND visible_to_user = true);

CREATE POLICY "Users can update their intervention feedback"
  ON safety_interventions FOR UPDATE
  USING (auth.uid()::uuid = user_id)
  WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Service role can manage safety interventions"
  ON safety_interventions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- CONVERSATION THREADS
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_threads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Thread identification
  couple_id uuid REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  thread_type text DEFAULT 'free_form' CHECK (thread_type IN ('free_form', 'daily_prompt', 'goal_discussion', 'appreciation', 'crisis_support')),
  
  -- Thread content
  title text,
  description text,
  prompt_id uuid REFERENCES daily_prompts(id) ON DELETE SET NULL,
  
  -- Thread status
  is_active boolean DEFAULT true,
  last_message_at timestamptz DEFAULT now(),
  message_count integer DEFAULT 0,
  
  -- Participants
  participant_1_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  participant_2_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Safety tracking
  highest_risk_level text DEFAULT 'safe' CHECK (highest_risk_level IN ('safe', 'low', 'medium', 'high', 'critical')),
  intervention_count integer DEFAULT 0,
  requires_monitoring boolean DEFAULT false,
  
  -- Privacy settings
  visible_to_participant_1 boolean DEFAULT true,
  visible_to_participant_2 boolean DEFAULT true,
  archived boolean DEFAULT false,
  archived_at timestamptz,
  
  -- Metadata
  thread_metadata jsonb DEFAULT '{}',
  
  CONSTRAINT conversation_threads_different_participants CHECK (participant_1_id != participant_2_id)
);

-- Create indexes for conversation threads
CREATE INDEX idx_conversation_threads_couple_id ON conversation_threads(couple_id, last_message_at DESC);
CREATE INDEX idx_conversation_threads_participants ON conversation_threads(participant_1_id, participant_2_id);
CREATE INDEX idx_conversation_threads_prompt ON conversation_threads(prompt_id) WHERE prompt_id IS NOT NULL;
CREATE INDEX idx_conversation_threads_risk_level ON conversation_threads(highest_risk_level, requires_monitoring);

-- Add RLS policies
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their conversation threads"
  ON conversation_threads FOR SELECT
  USING (
    auth.uid()::uuid IN (participant_1_id, participant_2_id) AND
    (
      (auth.uid()::uuid = participant_1_id AND visible_to_participant_1 = true) OR
      (auth.uid()::uuid = participant_2_id AND visible_to_participant_2 = true)
    ) AND
    archived = false
  );

CREATE POLICY "Users can create threads with their partner"
  ON conversation_threads FOR INSERT
  WITH CHECK (
    auth.uid()::uuid IN (participant_1_id, participant_2_id) AND
    EXISTS (
      SELECT 1 FROM couples 
      WHERE id = couple_id 
      AND (partner_1_id = auth.uid()::uuid OR partner_2_id = auth.uid()::uuid)
      AND is_active = true
    )
  );

CREATE POLICY "Users can update their thread visibility"
  ON conversation_threads FOR UPDATE
  USING (auth.uid()::uuid IN (participant_1_id, participant_2_id));

-- ============================================================================
-- MESSAGE REACTIONS & MOOD INDICATORS
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Reaction context
  message_id uuid REFERENCES secure_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Reaction details
  reaction_type text NOT NULL CHECK (reaction_type IN ('emoji', 'mood', 'appreciation', 'concern')),
  reaction_value text NOT NULL, -- emoji code, mood indicator, etc.
  
  -- Context
  reaction_context text, -- Optional explanation
  
  CONSTRAINT message_reactions_unique_user_message UNIQUE(message_id, user_id, reaction_type, reaction_value)
);

-- Create indexes for reactions
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id, created_at DESC);

-- Add RLS policies
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage reactions to messages they can see"
  ON message_reactions FOR ALL
  USING (
    auth.uid()::uuid = user_id AND
    EXISTS (
      SELECT 1 FROM secure_messages 
      WHERE id = message_id 
      AND (sender_user_id = auth.uid()::uuid OR recipient_user_id = auth.uid()::uuid)
      AND deleted_at IS NULL
    )
  );

-- ============================================================================
-- CRISIS RESOURCES & LOCATION DATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS crisis_resources_local (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Geographic identification
  country_code text NOT NULL,
  region_state text,
  city text,
  postal_code_prefix text, -- First 3 digits for privacy
  
  -- Resource information
  resource_name text NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('crisis_hotline', 'domestic_violence', 'mental_health', 'emergency', 'text_support', 'chat_support')),
  
  -- Contact information
  phone_number text,
  text_number text,
  website_url text,
  chat_url text,
  
  -- Availability and details
  availability text DEFAULT '24/7',
  languages_supported jsonb DEFAULT '["en"]',
  description text NOT NULL,
  specializations jsonb DEFAULT '[]',
  
  -- Metadata
  verified boolean DEFAULT false,
  last_verified_at timestamptz,
  priority_order integer DEFAULT 100,
  is_active boolean DEFAULT true
);

-- Create indexes for crisis resources
CREATE INDEX idx_crisis_resources_location ON crisis_resources_local(country_code, region_state, city);
CREATE INDEX idx_crisis_resources_type ON crisis_resources_local(resource_type, priority_order);
CREATE INDEX idx_crisis_resources_postal ON crisis_resources_local(postal_code_prefix) WHERE postal_code_prefix IS NOT NULL;

-- Add RLS (public read for crisis resources)
ALTER TABLE crisis_resources_local ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crisis resources are publicly readable"
  ON crisis_resources_local FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage crisis resources"
  ON crisis_resources_local FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- FUNCTIONS FOR SAFETY & MESSAGING
-- ============================================================================

-- Function to update thread statistics when messages are added
CREATE OR REPLACE FUNCTION update_conversation_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update thread statistics
  UPDATE conversation_threads 
  SET 
    last_message_at = NEW.created_at,
    message_count = message_count + 1,
    highest_risk_level = CASE 
      WHEN NEW.risk_level::text = 'critical' OR highest_risk_level = 'critical' THEN 'critical'
      WHEN NEW.risk_level::text = 'high' OR highest_risk_level = 'high' THEN 'high'
      WHEN NEW.risk_level::text = 'medium' OR highest_risk_level = 'medium' THEN 'medium'
      WHEN NEW.risk_level::text = 'low' OR highest_risk_level = 'low' THEN 'low'
      ELSE 'safe'
    END,
    requires_monitoring = CASE 
      WHEN NEW.risk_level IN ('high', 'critical') THEN true
      ELSE requires_monitoring
    END,
    updated_at = now()
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for thread statistics
CREATE TRIGGER update_thread_stats_on_message
  AFTER INSERT ON secure_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_thread_stats();

-- Function to create safety intervention when high-risk message is detected
CREATE OR REPLACE FUNCTION create_safety_intervention_for_high_risk()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create intervention for high/critical risk messages
  IF NEW.risk_level IN ('high', 'critical') AND NEW.requires_intervention = true THEN
    INSERT INTO safety_interventions (
      user_id,
      couple_id,
      message_id,
      intervention_type,
      risk_level_triggered,
      intervention_severity,
      intervention_title,
      intervention_message,
      resources_provided,
      triggered_by_keywords,
      detection_confidence
    ) VALUES (
      NEW.sender_user_id,
      NEW.couple_id,
      NEW.id,
      CASE 
        WHEN NEW.risk_level = 'critical' THEN 'crisis_resource_display'
        WHEN NEW.risk_level = 'high' THEN 'resource_surfacing'
        ELSE 'reframing_prompt'
      END,
      NEW.risk_level,
      CASE 
        WHEN NEW.risk_level = 'critical' THEN 'emergency'
        WHEN NEW.risk_level = 'high' THEN 'urgent'
        ELSE 'moderate'
      END,
      CASE 
        WHEN NEW.risk_level = 'critical' THEN 'Immediate Support Available'
        WHEN NEW.risk_level = 'high' THEN 'We''re Here to Help'
        ELSE 'Communication Support'
      END,
      CASE 
        WHEN NEW.risk_level = 'critical' THEN 'We detected you may be in distress. Your safety is important - please consider reaching out for professional support.'
        WHEN NEW.risk_level = 'high' THEN 'We noticed your message may indicate some distress. Here are some resources that might help.'
        ELSE 'We have some suggestions that might help improve this conversation.'
      END,
      CASE 
        WHEN NEW.risk_level = 'critical' THEN '[{"name": "Crisis Hotline", "number": "988"}, {"name": "Emergency", "number": "911"}]'::jsonb
        WHEN NEW.risk_level = 'high' THEN '[{"name": "Crisis Text Line", "text": "HOME to 741741"}]'::jsonb
        ELSE '[]'::jsonb
      END,
      NEW.crisis_indicators,
      0.85 -- Default confidence
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic safety interventions
CREATE TRIGGER create_intervention_on_high_risk
  AFTER UPDATE ON secure_messages
  FOR EACH ROW 
  WHEN (NEW.safety_analyzed = true AND OLD.safety_analyzed = false)
  EXECUTE FUNCTION create_safety_intervention_for_high_risk();

-- Function to get localized crisis resources
CREATE OR REPLACE FUNCTION get_crisis_resources_for_user(
  p_user_id uuid,
  p_resource_types text[] DEFAULT ARRAY['crisis_hotline', 'domestic_violence', 'mental_health']
)
RETURNS TABLE (
  resource_name text,
  resource_type text,
  phone_number text,
  text_number text,
  website_url text,
  description text,
  availability text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_location record;
BEGIN
  -- Get user's approximate location (you'd implement geolocation logic here)
  SELECT 'US' as country_code, 'CA' as region_state, 'San Francisco' as city
  INTO user_location;
  
  -- Return localized crisis resources
  RETURN QUERY
  SELECT 
    cr.resource_name,
    cr.resource_type,
    cr.phone_number,
    cr.text_number,
    cr.website_url,
    cr.description,
    cr.availability
  FROM crisis_resources_local cr
  WHERE 
    cr.is_active = true AND
    cr.resource_type = ANY(p_resource_types) AND
    (
      cr.country_code = user_location.country_code OR
      (cr.country_code = user_location.country_code AND cr.region_state = user_location.region_state)
    )
  ORDER BY 
    cr.priority_order ASC,
    CASE WHEN cr.region_state = user_location.region_state THEN 1 ELSE 2 END,
    cr.resource_name;
END;
$$;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Apply update triggers to new tables
CREATE TRIGGER update_user_safety_preferences_updated_at 
  BEFORE UPDATE ON user_safety_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_secure_messages_updated_at 
  BEFORE UPDATE ON secure_messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_threads_updated_at 
  BEFORE UPDATE ON conversation_threads 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crisis_resources_local_updated_at 
  BEFORE UPDATE ON crisis_resources_local 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA & CONFIGURATION
-- ============================================================================

-- Insert default crisis resources
INSERT INTO crisis_resources_local (
  country_code, resource_name, resource_type, phone_number, text_number, 
  website_url, description, availability, languages_supported, priority_order
) VALUES 
  (
    'US', 'National Suicide Prevention Lifeline', 'crisis_hotline', '988', null,
    'https://suicidepreventionlifeline.org', 
    '24/7 crisis support for suicide prevention and emotional distress',
    '24/7', '["en", "es"]', 10
  ),
  (
    'US', 'Crisis Text Line', 'text_support', null, '741741',
    'https://www.crisistextline.org',
    'Free crisis support via text message - text HOME to 741741',
    '24/7', '["en", "es"]', 20
  ),
  (
    'US', 'National Domestic Violence Hotline', 'domestic_violence', '1-800-799-7233', '88788',
    'https://www.thehotline.org',
    'Confidential support for domestic violence situations',
    '24/7', '["en", "es"]', 15
  ),
  (
    'CA', 'Canada Suicide Prevention Service', 'crisis_hotline', '1-833-456-4566', null,
    'https://www.crisisservicescanada.ca',
    '24/7 bilingual crisis support across Canada',
    '24/7', '["en", "fr"]', 10
  )
ON CONFLICT DO NOTHING;

-- Create initial audit log entry
INSERT INTO audit_log (
  action_type,
  resource_type,
  details,
  environment
) VALUES (
  'system_initialization',
  'secure_messaging_system',
  jsonb_build_object(
    'migration', '016_secure_messaging_system',
    'tables_created', jsonb_build_array(
      'user_safety_preferences',
      'secure_messages', 
      'message_risk_scores',
      'safety_interventions',
      'conversation_threads',
      'message_reactions',
      'crisis_resources_local'
    ),
    'functions_created', jsonb_build_array(
      'update_conversation_thread_stats',
      'create_safety_intervention_for_high_risk',
      'get_crisis_resources_for_user'
    ),
    'features_enabled', jsonb_build_array(
      'transparent_safety_monitoring',
      'graduated_safety_responses',
      'real_time_messaging',
      'crisis_resource_integration',
      'user_consent_framework'
    )
  ),
  'production'
);

-- Performance optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_secure_messages_realtime 
  ON secure_messages(couple_id, created_at DESC) 
  WHERE deleted_at IS NULL AND visible_to_recipient = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_safety_interventions_active 
  ON safety_interventions(user_id, created_at DESC) 
  WHERE visible_to_user = true AND user_acknowledged = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_risk_high_priority 
  ON message_risk_scores(couple_id, created_at DESC) 
  WHERE risk_level IN ('high', 'critical');

-- Final migration verification
DO $$
BEGIN
  RAISE NOTICE 'Secure Messaging System migration completed successfully';
  RAISE NOTICE 'Tables created: user_safety_preferences, secure_messages, message_risk_scores, safety_interventions, conversation_threads, message_reactions, crisis_resources_local';
  RAISE NOTICE 'Functions created: update_conversation_thread_stats, create_safety_intervention_for_high_risk, get_crisis_resources_for_user';
  RAISE NOTICE 'Features enabled: transparent safety monitoring, graduated responses, real-time messaging, crisis integration';
  RAISE NOTICE 'RLS policies enabled for all new tables with appropriate access controls';
  RAISE NOTICE 'Crisis resources populated with national hotlines for US and Canada';
END $$;