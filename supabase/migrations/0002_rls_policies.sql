-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's couple_id
CREATE OR REPLACE FUNCTION get_user_couple_id(user_uuid UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id 
    FROM couples 
    WHERE partner_1_id = user_uuid OR partner_2_id = user_uuid
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is part of a couple
CREATE OR REPLACE FUNCTION is_couple_member(couple_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM couples 
    WHERE id = couple_uuid 
    AND (partner_1_id = user_uuid OR partner_2_id = user_uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get partner's ID
CREATE OR REPLACE FUNCTION get_partner_id(user_uuid UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT CASE 
      WHEN partner_1_id = user_uuid THEN partner_2_id
      WHEN partner_2_id = user_uuid THEN partner_1_id
      ELSE NULL
    END
    FROM couples 
    WHERE partner_1_id = user_uuid OR partner_2_id = user_uuid
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES RLS POLICIES
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can view their partner's basic profile information
CREATE POLICY "Users can view partner profile" ON profiles
  FOR SELECT USING (
    id = get_partner_id(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM couples 
      WHERE (partner_1_id = auth.uid() OR partner_2_id = auth.uid())
      AND status = 'active'
    )
  );

-- COUPLES RLS POLICIES
-- Users can view couples they're part of
CREATE POLICY "Users can view own couple" ON couples
  FOR SELECT USING (partner_1_id = auth.uid() OR partner_2_id = auth.uid());

-- Users can update couples they're part of
CREATE POLICY "Users can update own couple" ON couples
  FOR UPDATE USING (partner_1_id = auth.uid() OR partner_2_id = auth.uid());

-- Users can create couple records where they are a partner
CREATE POLICY "Users can create couples" ON couples
  FOR INSERT WITH CHECK (partner_1_id = auth.uid() OR partner_2_id = auth.uid());

-- CONSENTS RLS POLICIES
-- Users can view and manage their own consents
CREATE POLICY "Users can view own consents" ON consents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own consents" ON consents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own consents" ON consents
  FOR UPDATE USING (user_id = auth.uid());

-- CONTENT TEMPLATES RLS POLICIES
-- Content templates are public (read-only for users)
CREATE POLICY "Users can view content templates" ON content_templates
  FOR SELECT TO authenticated USING (true);

-- Only service role can modify templates
CREATE POLICY "Service role can manage templates" ON content_templates
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- DAILY PROMPTS RLS POLICIES
-- Users can view prompts for their couple
CREATE POLICY "Users can view couple prompts" ON daily_prompts
  FOR SELECT USING (is_couple_member(couple_id, auth.uid()));

-- Users can update completion status for their couple's prompts
CREATE POLICY "Users can update prompt completion" ON daily_prompts
  FOR UPDATE USING (is_couple_member(couple_id, auth.uid()));

-- Service role can create prompts
CREATE POLICY "Service role can create prompts" ON daily_prompts
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- AI CACHE RLS POLICIES
-- Cache is managed by service role only
CREATE POLICY "Service role manages ai cache" ON ai_cache
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- MESSAGES RLS POLICIES
-- Users can view messages for their couple
CREATE POLICY "Users can view couple messages" ON messages
  FOR SELECT USING (is_couple_member(couple_id, auth.uid()));

-- Users can send messages to their couple
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    is_couple_member(couple_id, auth.uid()) AND
    sender_id = auth.uid()
  );

-- Users can update their own messages (for editing/deletion)
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (
    sender_id = auth.uid() AND
    is_couple_member(couple_id, auth.uid())
  );

-- SAFETY EVENTS RLS POLICIES
-- Users can view their own safety events
CREATE POLICY "Users can view own safety events" ON safety_events
  FOR SELECT USING (user_id = auth.uid());

-- Service role can manage all safety events
CREATE POLICY "Service role manages safety events" ON safety_events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- SAFETY RESOURCES RLS POLICIES
-- Safety resources are public and always accessible
CREATE POLICY "Everyone can view safety resources" ON safety_resources
  FOR SELECT TO anon, authenticated USING (true);

-- Only service role can manage safety resources
CREATE POLICY "Service role manages safety resources" ON safety_resources
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- PROGRESS TRACKING RLS POLICIES
-- Users can view progress for their couple
CREATE POLICY "Users can view couple progress" ON progress_tracking
  FOR SELECT USING (
    is_couple_member(couple_id, auth.uid()) OR
    user_id = auth.uid()
  );

-- Users can insert their own progress data
CREATE POLICY "Users can insert own progress" ON progress_tracking
  FOR INSERT WITH CHECK (
    (couple_id IS NOT NULL AND is_couple_member(couple_id, auth.uid())) OR
    user_id = auth.uid()
  );

-- Service role can manage all progress data
CREATE POLICY "Service role manages progress" ON progress_tracking
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- USAGE ANALYTICS RLS POLICIES
-- Only service role can access analytics (anonymized data)
CREATE POLICY "Service role manages analytics" ON usage_analytics
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- AI INTERACTIONS RLS POLICIES
-- Users can view their own AI interactions (for transparency)
CREATE POLICY "Users can view own AI interactions" ON ai_interactions
  FOR SELECT USING (user_id = auth.uid());

-- Service role manages AI interactions
CREATE POLICY "Service role manages AI interactions" ON ai_interactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- SUBSCRIPTIONS RLS POLICIES
-- Users can view subscriptions for their couple
CREATE POLICY "Users can view couple subscription" ON subscriptions
  FOR SELECT USING (is_couple_member(couple_id, auth.uid()));

-- Paying partner can update subscription
CREATE POLICY "Paying partner can update subscription" ON subscriptions
  FOR UPDATE USING (paying_partner_id = auth.uid());

-- Service role can manage all subscriptions
CREATE POLICY "Service role manages subscriptions" ON subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ADDITIONAL SECURITY FUNCTIONS

-- Function to validate message retention settings
CREATE OR REPLACE FUNCTION enforce_message_retention()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-delete messages based on user preferences
  IF NEW.auto_delete_at IS NULL THEN
    NEW.auto_delete_at := NEW.created_at + INTERVAL '1 day' * (
      SELECT LEAST(
        COALESCE((SELECT message_retention_days FROM profiles WHERE id = (
          SELECT partner_1_id FROM couples WHERE id = NEW.couple_id
        )), 7),
        COALESCE((SELECT message_retention_days FROM profiles WHERE id = (
          SELECT partner_2_id FROM couples WHERE id = NEW.couple_id
        )), 7)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_message_retention_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION enforce_message_retention();

-- Function to validate consent before safety monitoring
CREATE OR REPLACE FUNCTION check_safety_consent(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM consents 
    WHERE user_id = user_uuid 
    AND consent_type = 'safety_monitoring' 
    AND granted = true 
    AND revoked_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log safety events with proper consent checking
CREATE OR REPLACE FUNCTION log_safety_event(
  p_user_id UUID,
  p_couple_id UUID,
  p_event_type event_type,
  p_crisis_level crisis_level,
  p_trigger_content_hash TEXT,
  p_ai_confidence_score DECIMAL,
  p_resources_provided JSONB
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  -- Check if user has consented to safety monitoring
  IF NOT check_safety_consent(p_user_id) THEN
    RAISE EXCEPTION 'User has not consented to safety monitoring';
  END IF;
  
  -- Create safety event
  INSERT INTO safety_events (
    user_id, couple_id, event_type, crisis_level,
    trigger_content_hash, ai_confidence_score, resources_provided
  ) VALUES (
    p_user_id, p_couple_id, p_event_type, p_crisis_level,
    p_trigger_content_hash, p_ai_confidence_score, p_resources_provided
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log for RLS policy violations
CREATE TABLE rls_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_reason TEXT,
  request_details JSONB
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON safety_resources TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;