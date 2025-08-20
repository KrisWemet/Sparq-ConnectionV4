-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE relationship_archetype AS ENUM (
  'calm_anchor',
  'responsive_partner', 
  'growth_seeker',
  'steady_support'
);

CREATE TYPE crisis_level AS ENUM (
  'low',
  'medium', 
  'high',
  'critical'
);

CREATE TYPE event_type AS ENUM (
  'crisis_detected',
  'resources_provided',
  'professional_contacted',
  'safety_plan_created',
  'follow_up_scheduled'
);

CREATE TYPE subscription_tier AS ENUM (
  'free',
  'premium_couple'
);

-- Core user management
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  archetype relationship_archetype,
  age_range TEXT, -- e.g., "25-30", "31-35"
  location_region TEXT, -- for crisis resources
  language_preference TEXT DEFAULT 'en',
  subscription_tier subscription_tier DEFAULT 'free',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Privacy preferences
  data_sharing_analytics BOOLEAN DEFAULT FALSE,
  data_sharing_research BOOLEAN DEFAULT FALSE,
  message_retention_days INTEGER DEFAULT 7,
  
  -- Safety preferences
  safety_monitoring_enabled BOOLEAN DEFAULT TRUE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT
);

-- Couples relationship table
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_length_months INTEGER,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active', -- active, paused, terminated
  
  -- Shared privacy settings
  shared_data_analytics BOOLEAN DEFAULT FALSE,
  shared_message_history BOOLEAN DEFAULT TRUE,
  joint_safety_monitoring BOOLEAN DEFAULT TRUE,
  
  -- Relationship metadata
  relationship_start_date DATE,
  living_together BOOLEAN DEFAULT FALSE,
  has_children BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique pairing
  CONSTRAINT unique_couple_pairing UNIQUE(partner_1_id, partner_2_id),
  CONSTRAINT no_self_coupling CHECK (partner_1_id != partner_2_id)
);

-- Consent management with versioning
CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- e.g., 'safety_monitoring', 'data_analytics', 'ai_processing'
  consent_version TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  legal_basis TEXT, -- GDPR legal basis
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily prompts and AI content
CREATE TABLE content_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  archetype_compatibility relationship_archetype[],
  difficulty_level INTEGER DEFAULT 1, -- 1-5 scale
  category TEXT NOT NULL, -- communication, intimacy, conflict_resolution, etc.
  template_content JSONB NOT NULL,
  variables JSONB, -- template variables for personalization
  effectiveness_score DECIMAL(3,2) DEFAULT 0.0,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Evidence-based source tracking
  research_source TEXT,
  clinical_validation BOOLEAN DEFAULT FALSE
);

CREATE TABLE daily_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  template_id UUID REFERENCES content_templates(id),
  prompt_date DATE NOT NULL,
  
  -- Generated content
  content JSONB NOT NULL,
  personalized_content TEXT,
  teaching_moment TEXT,
  guided_activity JSONB,
  
  -- AI generation metadata
  ai_model_used TEXT,
  generation_cost DECIMAL(10,4) DEFAULT 0.0,
  generation_tokens INTEGER DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Engagement tracking
  partner_1_completed BOOLEAN DEFAULT FALSE,
  partner_2_completed BOOLEAN DEFAULT FALSE,
  partner_1_completed_at TIMESTAMP WITH TIME ZONE,
  partner_2_completed_at TIMESTAMP WITH TIME ZONE,
  couple_completed_together BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_daily_prompt UNIQUE(couple_id, prompt_date)
);

-- AI content caching for cost optimization
CREATE TABLE ai_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  archetype relationship_archetype,
  difficulty_level INTEGER,
  category TEXT,
  
  -- Cache management
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  cost_savings DECIMAL(10,4) DEFAULT 0.0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Secure messaging system
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Encrypted content
  content_encrypted BYTEA NOT NULL,
  content_hash TEXT NOT NULL, -- for integrity verification
  
  -- Safety monitoring
  safety_checked BOOLEAN DEFAULT FALSE,
  risk_score DECIMAL(3,2) DEFAULT 0.0,
  flagged_for_review BOOLEAN DEFAULT FALSE,
  
  -- Message metadata
  message_type TEXT DEFAULT 'text', -- text, prompt_response, system
  thread_id UUID, -- for conversation threading
  reply_to_message_id UUID REFERENCES messages(id),
  
  -- Privacy controls
  auto_delete_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Crisis detection and safety events
CREATE TABLE safety_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  
  event_type event_type NOT NULL,
  crisis_level crisis_level NOT NULL,
  
  -- Detection details
  trigger_content_hash TEXT, -- hash of content that triggered detection
  ai_confidence_score DECIMAL(3,2),
  human_reviewed BOOLEAN DEFAULT FALSE,
  human_reviewer_id TEXT, -- professional reviewer identifier
  
  -- Response details
  resources_provided JSONB,
  professional_contacted BOOLEAN DEFAULT FALSE,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_scheduled_at TIMESTAMP WITH TIME ZONE,
  
  -- Resolution tracking
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safety resources directory
CREATE TABLE safety_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- crisis_hotline, domestic_violence, mental_health, etc.
  region TEXT NOT NULL, -- country/state/province
  language TEXT DEFAULT 'en',
  
  -- Contact information
  phone_number TEXT,
  text_number TEXT,
  email TEXT,
  website_url TEXT,
  chat_url TEXT,
  
  -- Operational details
  available_24_7 BOOLEAN DEFAULT FALSE,
  available_hours TEXT,
  services_offered TEXT[],
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verification_date DATE,
  verification_source TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progress tracking and analytics
CREATE TABLE progress_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- for individual metrics
  
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  metric_category TEXT, -- satisfaction, engagement, communication, etc.
  
  -- Context
  prompt_id UUID REFERENCES daily_prompts(id),
  measurement_method TEXT, -- survey, behavior, ai_analysis
  
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Anonymized usage analytics (GDPR compliant)
CREATE TABLE usage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Anonymized identifiers
  session_hash TEXT NOT NULL,
  couple_hash TEXT,
  
  -- Behavioral data
  event_type TEXT NOT NULL,
  event_category TEXT,
  event_data JSONB,
  
  -- Context (no PII)
  archetype_combination TEXT, -- combined archetypes for couple
  relationship_length_category TEXT, -- bucketed ranges
  subscription_tier subscription_tier,
  
  -- Technical context
  user_agent_hash TEXT,
  region_code TEXT, -- country/state level only
  
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI interaction logging for safety and improvement
CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  
  -- Request details
  request_type TEXT NOT NULL, -- prompt_generation, safety_check, response_analysis
  input_hash TEXT NOT NULL, -- hash of user input for audit
  
  -- AI response
  ai_model TEXT,
  response_hash TEXT,
  confidence_scores JSONB,
  cost DECIMAL(10,4),
  tokens_used INTEGER,
  
  -- Safety flags
  safety_flags JSONB,
  requires_human_review BOOLEAN DEFAULT FALSE,
  human_reviewed BOOLEAN DEFAULT FALSE,
  review_notes TEXT,
  
  -- Performance tracking
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription and billing
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  paying_partner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  tier subscription_tier NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, past_due, paused
  
  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  
  -- Billing details
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Trial tracking
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_couples_partners ON couples(partner_1_id, partner_2_id);
CREATE INDEX idx_messages_couple_created ON messages(couple_id, created_at DESC);
CREATE INDEX idx_daily_prompts_couple_date ON daily_prompts(couple_id, prompt_date DESC);
CREATE INDEX idx_safety_events_user_level ON safety_events(user_id, crisis_level, created_at DESC);
CREATE INDEX idx_ai_cache_key ON ai_cache(cache_key);
CREATE INDEX idx_progress_tracking_couple ON progress_tracking(couple_id, recorded_at DESC);
CREATE INDEX idx_consents_user_type ON consents(user_id, consent_type, granted);

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_couples_updated_at BEFORE UPDATE ON couples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_templates_updated_at BEFORE UPDATE ON content_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safety_resources_updated_at BEFORE UPDATE ON safety_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();