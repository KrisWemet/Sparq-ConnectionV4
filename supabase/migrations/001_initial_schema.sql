-- Sparq Connection V4: Privacy-First Database Schema
-- Migration 001: Initial Core Tables
-- Created: 2025-01-XX
-- Purpose: Establish core tables for wellness/education relationship platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable Row Level Security by default
ALTER DEFAULT PRIVILEGES REVOKE ALL ON TABLES FROM PUBLIC;

-- ============================================================================
-- CORE USER MANAGEMENT TABLES
-- ============================================================================

-- Users table: Core user profiles with encrypted PII
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Authentication (linked to Supabase Auth)
  auth_id UUID UNIQUE NOT NULL, -- References auth.users.id
  
  -- Encrypted Personal Information
  email_encrypted TEXT NOT NULL, -- Encrypted with pgcrypto
  first_name_encrypted TEXT,     -- Encrypted with pgcrypto
  last_name_encrypted TEXT,      -- Encrypted with pgcrypto
  
  -- Public Profile Data
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  
  -- Relationship Status (wellness context, not medical)
  relationship_status TEXT CHECK (relationship_status IN ('single', 'dating', 'partnered', 'married', 'separated', 'complicated')) DEFAULT 'single',
  
  -- Privacy & Safety Flags
  privacy_level TEXT CHECK (privacy_level IN ('minimal', 'standard', 'enhanced')) DEFAULT 'standard',
  safety_monitoring_enabled BOOLEAN DEFAULT true,
  crisis_contact_encrypted TEXT, -- Encrypted emergency contact info
  
  -- Account Status
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  
  -- Consent tracking
  terms_accepted_at TIMESTAMPTZ,
  privacy_policy_accepted_at TIMESTAMPTZ,
  data_processing_consent_at TIMESTAMPTZ,
  
  CONSTRAINT users_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- User Archetypes: Relationship personality types and preferences
CREATE TABLE user_archetypes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Relationship Archetype Data
  communication_style TEXT CHECK (communication_style IN ('direct', 'indirect', 'analytical', 'expressive', 'mixed')),
  conflict_resolution_style TEXT CHECK (conflict_resolution_style IN ('collaborative', 'competitive', 'accommodating', 'avoiding', 'compromising')),
  love_language_primary TEXT CHECK (love_language_primary IN ('words_of_affirmation', 'acts_of_service', 'receiving_gifts', 'quality_time', 'physical_touch')),
  love_language_secondary TEXT,
  attachment_style TEXT CHECK (attachment_style IN ('secure', 'anxious', 'avoidant', 'disorganized')),
  
  -- Preferences and Goals
  relationship_goals JSONB DEFAULT '[]'::jsonb,
  communication_preferences JSONB DEFAULT '{}'::jsonb,
  
  -- Validation and Source
  assessment_source TEXT CHECK (assessment_source IN ('self_report', 'partner_input', 'ai_analysis', 'professional_assessment')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  last_validated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Preferences: App settings and communication preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Notification Preferences
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  daily_prompt_notifications BOOLEAN DEFAULT true,
  safety_alert_notifications BOOLEAN DEFAULT true,
  partner_activity_notifications BOOLEAN DEFAULT true,
  
  -- Communication Preferences
  preferred_communication_time TEXT, -- e.g., "morning", "evening", "any"
  prompt_frequency TEXT CHECK (prompt_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'as_needed')) DEFAULT 'daily',
  content_complexity TEXT CHECK (content_complexity IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate',
  
  -- Privacy Preferences
  profile_visibility TEXT CHECK (profile_visibility IN ('private', 'partner_only', 'community_anonymous')) DEFAULT 'partner_only',
  data_sharing_research BOOLEAN DEFAULT false,
  anonymous_usage_analytics BOOLEAN DEFAULT true,
  
  -- Safety Preferences  
  crisis_detection_sensitivity TEXT CHECK (crisis_detection_sensitivity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  auto_escalation_enabled BOOLEAN DEFAULT true,
  
  -- App Experience
  theme_preference TEXT CHECK (theme_preference IN ('light', 'dark', 'auto')) DEFAULT 'auto',
  language_preference TEXT DEFAULT 'en',
  
  UNIQUE(user_id)
);

-- User Safety Profile: Basic safety flags and emergency contacts
CREATE TABLE user_safety_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Safety Risk Assessment (wellness context, not clinical)
  baseline_wellness_score DECIMAL(3,2) CHECK (baseline_wellness_score >= 0 AND baseline_wellness_score <= 1),
  relationship_stress_indicators JSONB DEFAULT '[]'::jsonb,
  support_network_strength TEXT CHECK (support_network_strength IN ('strong', 'moderate', 'limited', 'minimal')),
  
  -- Emergency Contacts (encrypted)
  emergency_contact_1_encrypted TEXT, -- Name, phone, relationship encrypted as JSON
  emergency_contact_2_encrypted TEXT,
  crisis_plan_encrypted TEXT, -- Personal safety plan if provided
  
  -- Professional Support
  has_therapist BOOLEAN DEFAULT false,
  therapist_contact_encrypted TEXT, -- With explicit consent only
  professional_referral_preferences JSONB DEFAULT '{}'::jsonb,
  
  -- Safety Monitoring Configuration  
  monitoring_consent_level TEXT CHECK (monitoring_consent_level IN ('none', 'basic', 'enhanced', 'full')) DEFAULT 'basic',
  auto_intervention_consent BOOLEAN DEFAULT false,
  partner_notification_consent BOOLEAN DEFAULT false, -- CRITICAL: False by default for DV safety
  
  -- Risk Factors (self-reported, wellness context)
  self_reported_stressors JSONB DEFAULT '[]'::jsonb,
  relationship_history_factors JSONB DEFAULT '[]'::jsonb,
  
  UNIQUE(user_id)
);

-- ============================================================================
-- COUPLE MANAGEMENT TABLES  
-- ============================================================================

-- Couples: Relationship linking with shared settings
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Partner Information
  partner_1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Relationship Details
  relationship_start_date DATE,
  relationship_type TEXT CHECK (relationship_type IN ('dating', 'engaged', 'married', 'domestic_partnership', 'other')) DEFAULT 'dating',
  relationship_goals JSONB DEFAULT '[]'::jsonb,
  
  -- Shared Settings and Preferences
  shared_preferences JSONB DEFAULT '{}'::jsonb,
  communication_agreements JSONB DEFAULT '{}'::jsonb,
  privacy_agreements JSONB DEFAULT '{}'::jsonb,
  
  -- Safety and Crisis Planning
  joint_crisis_plan_encrypted TEXT, -- Shared safety plan if created
  professional_referrals JSONB DEFAULT '[]'::jsonb,
  
  -- Relationship Status
  is_active BOOLEAN DEFAULT true,
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  ending_reason TEXT,
  
  -- Constraints
  CONSTRAINT couples_different_partners CHECK (partner_1_id != partner_2_id),
  CONSTRAINT couples_unique_partnership UNIQUE (partner_1_id, partner_2_id)
);

-- Couple Invitations: Secure invitation system for partners
CREATE TABLE couple_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Invitation Details
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email_encrypted TEXT NOT NULL, -- Encrypted email of person being invited
  invitation_code TEXT NOT NULL UNIQUE, -- Secure random code
  
  -- Status and Response
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')) DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  couple_id UUID REFERENCES couples(id) ON DELETE SET NULL, -- Set when accepted
  
  -- Security
  attempts_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  
  -- Invitation Message (optional)
  message_encrypted TEXT -- Optional personal message, encrypted
);

-- Relationship Milestones: Important dates and events
CREATE TABLE relationship_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Milestone Details
  milestone_type TEXT CHECK (milestone_type IN ('first_date', 'relationship_start', 'engagement', 'marriage', 'anniversary', 'moved_in', 'custom')) NOT NULL,
  milestone_date DATE NOT NULL,
  title TEXT NOT NULL,
  description_encrypted TEXT, -- Encrypted personal details
  
  -- Privacy and Sharing
  is_shared BOOLEAN DEFAULT true, -- Shared between partners
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Celebration and Reminders
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 7,
  celebrated_count INTEGER DEFAULT 0,
  last_celebrated_at TIMESTAMPTZ
);

-- Sync Status: Data synchronization between partners
CREATE TABLE sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Sync Information
  entity_type TEXT NOT NULL, -- 'preferences', 'goals', 'assessments', etc.
  entity_id UUID NOT NULL,
  
  -- Synchronization Status
  partner_1_synced BOOLEAN DEFAULT false,
  partner_2_synced BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  sync_version INTEGER DEFAULT 1,
  
  -- Conflict Resolution
  has_conflicts BOOLEAN DEFAULT false,
  conflict_data JSONB,
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID REFERENCES users(id),
  
  UNIQUE(couple_id, entity_type, entity_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users table indexes
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_active ON users(is_active, last_active_at) WHERE is_active = true;
CREATE INDEX idx_users_created_at ON users(created_at);

-- User archetypes indexes
CREATE INDEX idx_user_archetypes_user_id ON user_archetypes(user_id);
CREATE INDEX idx_user_archetypes_updated ON user_archetypes(updated_at);

-- User preferences indexes  
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- User safety profile indexes
CREATE INDEX idx_user_safety_profile_user_id ON user_safety_profile(user_id);

-- Couples table indexes
CREATE INDEX idx_couples_partner_1 ON couples(partner_1_id);
CREATE INDEX idx_couples_partner_2 ON couples(partner_2_id);
CREATE INDEX idx_couples_active ON couples(is_active) WHERE is_active = true;
CREATE INDEX idx_couples_created_at ON couples(created_at);

-- Couple invitations indexes
CREATE INDEX idx_couple_invitations_inviter ON couple_invitations(inviter_id);
CREATE INDEX idx_couple_invitations_status ON couple_invitations(status);
CREATE INDEX idx_couple_invitations_expires ON couple_invitations(expires_at);
CREATE INDEX idx_couple_invitations_code ON couple_invitations(invitation_code);

-- Relationship milestones indexes
CREATE INDEX idx_relationship_milestones_couple_id ON relationship_milestones(couple_id);
CREATE INDEX idx_relationship_milestones_date ON relationship_milestones(milestone_date);
CREATE INDEX idx_relationship_milestones_type ON relationship_milestones(milestone_type);

-- Sync status indexes
CREATE INDEX idx_sync_status_couple_id ON sync_status(couple_id);
CREATE INDEX idx_sync_status_entity ON sync_status(entity_type, entity_id);
CREATE INDEX idx_sync_status_conflicts ON sync_status(has_conflicts) WHERE has_conflicts = true;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_archetypes_updated_at BEFORE UPDATE ON user_archetypes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_safety_profile_updated_at BEFORE UPDATE ON user_safety_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_couples_updated_at BEFORE UPDATE ON couples FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_relationship_milestones_updated_at BEFORE UPDATE ON relationship_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sync_status_updated_at BEFORE UPDATE ON sync_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables (policies defined in migration 002)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_archetypes ENABLE ROW LEVEL SECURITY;  
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_safety_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE users IS 'Core user profiles with encrypted PII. Wellness/education context, not medical.';
COMMENT ON COLUMN users.email_encrypted IS 'Encrypted with pgcrypto for privacy protection';
COMMENT ON COLUMN users.safety_monitoring_enabled IS 'User consent for AI safety monitoring (default: true)';
COMMENT ON COLUMN users.crisis_contact_encrypted IS 'Encrypted emergency contact info for crisis intervention';

COMMENT ON TABLE user_archetypes IS 'Relationship personality types and preferences based on validated frameworks';
COMMENT ON COLUMN user_archetypes.attachment_style IS 'Based on attachment theory research, not clinical diagnosis';

COMMENT ON TABLE user_safety_profile IS 'Safety-related information for wellness monitoring and crisis prevention';
COMMENT ON COLUMN user_safety_profile.partner_notification_consent IS 'CRITICAL: Defaults to false for domestic violence safety';

COMMENT ON TABLE couples IS 'Relationship linking and shared settings between partners';
COMMENT ON CONSTRAINT couples_different_partners ON couples IS 'Ensures users cannot be partnered with themselves';

COMMENT ON TABLE couple_invitations IS 'Secure invitation system for partners to join relationships';
COMMENT ON COLUMN couple_invitations.invitation_code IS 'Secure random code for invitation verification';