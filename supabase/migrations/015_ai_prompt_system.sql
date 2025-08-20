-- AI Prompt System Database Extensions
-- This migration adds tables and functionality for the cost-optimized AI content generation system

-- ============================================================================
-- AI GENERATION COST TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_generation_costs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- User and context
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  couple_id uuid REFERENCES couples(id) ON DELETE SET NULL,
  
  -- Cost tracking
  model_used text NOT NULL,
  tokens_used integer DEFAULT 0,
  cost_usd decimal(10,6) DEFAULT 0.000000,
  operation_type text NOT NULL CHECK (operation_type IN ('daily_prompt_generation', 'assessment_analysis', 'crisis_support', 'general_query')),
  
  -- Optimization data
  cache_hit boolean DEFAULT false,
  generation_time_ms integer,
  budget_remaining_after decimal(10,6),
  
  -- Metadata for optimization analysis
  metadata jsonb DEFAULT '{}',
  
  -- Indexes
  CONSTRAINT ai_generation_costs_cost_positive CHECK (cost_usd >= 0),
  CONSTRAINT ai_generation_costs_tokens_positive CHECK (tokens_used >= 0)
);

-- Add RLS policies
ALTER TABLE ai_generation_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI costs"
  ON ai_generation_costs FOR SELECT
  USING (auth.uid()::uuid = user_id);

CREATE POLICY "Service role can manage AI costs"
  ON ai_generation_costs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- PROMPT CACHE SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS prompt_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Cache identification
  cache_key text NOT NULL UNIQUE,
  cache_level text NOT NULL CHECK (cache_level IN ('TEMPLATE_LEVEL', 'PERSONALIZED_LEVEL', 'AI_RESPONSE_LEVEL', 'USER_SESSION_LEVEL')),
  
  -- Cache content
  cached_content jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  
  -- Performance tracking
  hit_count integer DEFAULT 0,
  last_accessed_at timestamptz DEFAULT now(),
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  -- Indexes for performance
  CONSTRAINT prompt_cache_hit_count_positive CHECK (hit_count >= 0)
);

-- Create indexes for cache performance
CREATE INDEX idx_prompt_cache_key ON prompt_cache(cache_key);
CREATE INDEX idx_prompt_cache_expires ON prompt_cache(expires_at);
CREATE INDEX idx_prompt_cache_level ON prompt_cache(cache_level);
CREATE INDEX idx_prompt_cache_last_accessed ON prompt_cache(last_accessed_at DESC);

-- Add RLS policies (cache is system-wide but with privacy controls)
ALTER TABLE prompt_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage cache"
  ON prompt_cache FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- CACHE ANALYTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS cache_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Event tracking
  cache_key text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('hit', 'miss')),
  cache_source text NOT NULL CHECK (cache_source IN ('memory', 'database', 'error')),
  response_time_ms integer,
  
  -- Analytics metadata
  metadata jsonb DEFAULT '{}'
);

-- Create indexes for analytics queries
CREATE INDEX idx_cache_analytics_created_at ON cache_analytics(created_at DESC);
CREATE INDEX idx_cache_analytics_event_type ON cache_analytics(event_type);
CREATE INDEX idx_cache_analytics_cache_key ON cache_analytics(cache_key);

-- Add RLS policies
ALTER TABLE cache_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage cache analytics"
  ON cache_analytics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- DAILY PROMPT HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_prompt_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- User context
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  couple_id uuid REFERENCES couples(id) ON DELETE SET NULL,
  
  -- Prompt details
  prompt_id uuid REFERENCES daily_prompts(id) ON DELETE SET NULL,
  template_id text, -- For template-based prompts
  prompt_text text NOT NULL,
  prompt_category text NOT NULL,
  difficulty_level text NOT NULL,
  
  -- User interaction
  completed boolean DEFAULT false,
  completed_at timestamptz,
  user_feedback text CHECK (user_feedback IN ('helpful', 'not_helpful', 'neutral')),
  feedback_notes text,
  
  -- AI generation details
  generation_method text NOT NULL CHECK (generation_method IN ('ai_generated', 'template_based', 'cached')),
  personalization_level integer DEFAULT 0 CHECK (personalization_level >= 0 AND personalization_level <= 100),
  cost_usd decimal(10,6) DEFAULT 0.000000,
  
  -- Safety and compliance
  safety_check_passed boolean DEFAULT true,
  safety_notes jsonb DEFAULT '[]',
  
  -- Metadata
  metadata jsonb DEFAULT '{}'
);

-- Add RLS policies
ALTER TABLE daily_prompt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prompt history"
  ON daily_prompt_history FOR SELECT
  USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update their own prompt interactions"
  ON daily_prompt_history FOR UPDATE
  USING (auth.uid()::uuid = user_id);

CREATE POLICY "Service role can manage prompt history"
  ON daily_prompt_history FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_daily_prompt_history_user_id ON daily_prompt_history(user_id);
CREATE INDEX idx_daily_prompt_history_couple_id ON daily_prompt_history(couple_id);
CREATE INDEX idx_daily_prompt_history_created_at ON daily_prompt_history(created_at DESC);
CREATE INDEX idx_daily_prompt_history_completed ON daily_prompt_history(completed, completed_at DESC);

-- ============================================================================
-- TEMPLATE FEEDBACK
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Template and user
  template_id text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  
  -- Feedback
  was_effective boolean NOT NULL,
  feedback_text text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  
  -- Context
  relationship_stage text,
  user_archetype jsonb DEFAULT '{}',
  
  -- Privacy
  anonymous boolean DEFAULT false
);

-- Add RLS policies
ALTER TABLE template_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own template feedback"
  ON template_feedback FOR ALL
  USING (auth.uid()::uuid = user_id OR anonymous = true);

CREATE POLICY "Service role can view all template feedback"
  ON template_feedback FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create indexes
CREATE INDEX idx_template_feedback_template_id ON template_feedback(template_id);
CREATE INDEX idx_template_feedback_was_effective ON template_feedback(was_effective);
CREATE INDEX idx_template_feedback_created_at ON template_feedback(created_at DESC);

-- ============================================================================
-- USER NOTIFICATIONS (for budget warnings, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- User and notification details
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  
  -- Status
  read boolean DEFAULT false,
  read_at timestamptz,
  archived boolean DEFAULT false,
  archived_at timestamptz,
  
  -- Priority and expiry
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  expires_at timestamptz,
  
  -- Action buttons (optional)
  action_buttons jsonb DEFAULT '[]'
);

-- Add RLS policies
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notifications"
  ON user_notifications FOR ALL
  USING (auth.uid()::uuid = user_id);

-- Create indexes
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_read ON user_notifications(read, created_at DESC);
CREATE INDEX idx_user_notifications_type ON user_notifications(type);
CREATE INDEX idx_user_notifications_priority ON user_notifications(priority DESC, created_at DESC);

-- ============================================================================
-- EXTENSIONS TO EXISTING TABLES
-- ============================================================================

-- Add AI budget tracking to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS ai_budget_used_today decimal(10,6) DEFAULT 0.000000,
ADD COLUMN IF NOT EXISTS ai_budget_used_month decimal(10,6) DEFAULT 0.000000,
ADD COLUMN IF NOT EXISTS ai_budget_reset_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS max_daily_ai_prompts integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS preferred_ai_model text DEFAULT 'claude-3-haiku-20240307';

-- Add streak tracking to progress_tracking table (if needed)
ALTER TABLE progress_tracking 
ADD COLUMN IF NOT EXISTS streak_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date date,
ADD COLUMN IF NOT EXISTS streak_freeze_used boolean DEFAULT false;

-- ============================================================================
-- FUNCTIONS FOR BUDGET MANAGEMENT
-- ============================================================================

-- Function to reset daily budgets (called by cron job)
CREATE OR REPLACE FUNCTION reset_daily_ai_budgets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_preferences 
  SET 
    ai_budget_used_today = 0.000000,
    ai_budget_reset_date = CURRENT_DATE
  WHERE ai_budget_reset_date < CURRENT_DATE;
  
  -- Log the reset operation
  INSERT INTO audit_log (
    action_type,
    resource_type,
    details,
    environment
  ) VALUES (
    'budget_reset',
    'user_preferences',
    jsonb_build_object('reset_date', CURRENT_DATE, 'users_affected', (SELECT count(*) FROM user_preferences WHERE ai_budget_reset_date < CURRENT_DATE)),
    'production'
  );
END;
$$;

-- Function to update streak counts
CREATE OR REPLACE FUNCTION update_user_streak(
  p_user_id uuid,
  p_activity_date date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_activity date;
  current_streak integer;
  longest_streak integer;
BEGIN
  -- Get current progress tracking data
  SELECT 
    last_activity_date,
    streak_count,
    longest_streak
  INTO 
    last_activity,
    current_streak,
    longest_streak
  FROM progress_tracking 
  WHERE user_id = p_user_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Initialize if no record exists
  IF last_activity IS NULL THEN
    current_streak := 1;
    longest_streak := 1;
  ELSIF last_activity = p_activity_date THEN
    -- Same day, no change needed
    RETURN;
  ELSIF last_activity = p_activity_date - INTERVAL '1 day' THEN
    -- Consecutive day, increment streak
    current_streak := current_streak + 1;
    longest_streak := GREATEST(longest_streak, current_streak);
  ELSE
    -- Streak broken, reset to 1
    current_streak := 1;
  END IF;
  
  -- Update or insert progress tracking
  INSERT INTO progress_tracking (
    user_id,
    tracking_type,
    metric_name,
    current_value,
    target_value,
    period_start_date,
    streak_count,
    longest_streak,
    last_activity_date,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    'wellness_metric',
    'daily_prompt_streak',
    current_streak,
    30, -- Target 30-day streak
    p_activity_date,
    current_streak,
    longest_streak,
    p_activity_date,
    'active',
    now(),
    now()
  )
  ON CONFLICT (user_id, metric_name) 
  DO UPDATE SET
    current_value = current_streak,
    streak_count = current_streak,
    longest_streak = GREATEST(progress_tracking.longest_streak, longest_streak),
    last_activity_date = p_activity_date,
    updated_at = now();
END;
$$;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to new tables
CREATE TRIGGER update_ai_generation_costs_updated_at 
  BEFORE UPDATE ON ai_generation_costs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_cache_updated_at 
  BEFORE UPDATE ON prompt_cache 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_prompt_history_updated_at 
  BEFORE UPDATE ON daily_prompt_history 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notifications_updated_at 
  BEFORE UPDATE ON user_notifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA AND CONFIGURATION
-- ============================================================================

-- Create default subscription tiers if they don't exist
INSERT INTO subscription_tiers (name, description, price_usd, features, ai_budget_daily, ai_budget_monthly, max_daily_prompts)
VALUES 
  (
    'free', 
    'Free wellness plan with basic AI prompts',
    0.00,
    '["3 personalized prompts per day", "Basic progress tracking", "Evidence-based content", "Crisis resources"]',
    0.15,
    4.50,
    3
  ),
  (
    'premium',
    'Premium plan with unlimited AI features',
    19.99,
    '["Unlimited personalized prompts", "Advanced progress tracking", "Partner sharing", "Priority support", "Advanced analytics"]',
    1.00,
    30.00,
    -1
  )
ON CONFLICT (name) DO NOTHING;

-- Set up initial cache cleanup job data
INSERT INTO audit_log (
  action_type,
  resource_type,
  details,
  environment
) VALUES (
  'system_initialization',
  'ai_prompt_system',
  jsonb_build_object(
    'migration', '015_ai_prompt_system',
    'tables_created', jsonb_build_array(
      'ai_generation_costs',
      'prompt_cache', 
      'cache_analytics',
      'daily_prompt_history',
      'template_feedback',
      'user_notifications'
    ),
    'functions_created', jsonb_build_array(
      'reset_daily_ai_budgets',
      'update_user_streak'
    )
  ),
  'production'
);

-- Create initial performance indexes for optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_costs_user_date 
  ON ai_generation_costs(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_costs_operation_cost 
  ON ai_generation_costs(operation_type, cost_usd DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_history_completion 
  ON daily_prompt_history(user_id, completed, completed_at DESC);

-- Final migration verification
DO $$
BEGIN
  RAISE NOTICE 'AI Prompt System migration completed successfully';
  RAISE NOTICE 'Tables created: ai_generation_costs, prompt_cache, cache_analytics, daily_prompt_history, template_feedback, user_notifications';
  RAISE NOTICE 'Functions created: reset_daily_ai_budgets, update_user_streak';
  RAISE NOTICE 'RLS policies enabled for all new tables';
  RAISE NOTICE 'Performance indexes created for cost optimization';
END $$;