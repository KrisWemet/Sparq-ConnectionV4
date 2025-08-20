-- ============================================================================
-- CONNECTION QUESTS SYSTEM
-- Gamified relationship-building features with evidence-based content
-- ============================================================================

-- Connection Quests: Multi-day relationship building activities
CREATE TABLE public.connection_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Quest metadata
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  description TEXT NOT NULL CHECK (char_length(description) <= 500),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  
  -- Quest configuration
  duration_days INTEGER NOT NULL CHECK (duration_days BETWEEN 1 AND 30),
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  category TEXT CHECK (category IN (
    'communication', 'intimacy', 'trust', 'conflict_resolution', 
    'shared_activities', 'future_planning', 'appreciation', 'emotional_support'
  )) NOT NULL,
  
  -- Target audience
  suitable_for_archetypes TEXT[] DEFAULT '{}', -- Array of relationship archetypes
  minimum_relationship_length_months INTEGER DEFAULT 0,
  requires_both_partners BOOLEAN DEFAULT true,
  
  -- Content and structure
  content JSONB NOT NULL, -- Quest structure with daily activities
  evidence_base TEXT, -- Research foundation
  learning_objectives TEXT[] NOT NULL,
  
  -- Metadata
  estimated_time_per_day_minutes INTEGER NOT NULL CHECK (estimated_time_per_day_minutes BETWEEN 5 AND 120),
  prerequisites TEXT[], -- Other quest IDs that should be completed first
  tags TEXT[] DEFAULT '{}',
  
  -- Publishing
  is_published BOOLEAN DEFAULT false,
  publish_date TIMESTAMPTZ,
  created_by UUID, -- Staff member who created this quest
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quest progress tracking for couples
CREATE TABLE public.quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identifiers
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES connection_quests(id) ON DELETE CASCADE,
  
  -- Progress tracking
  current_day INTEGER DEFAULT 1 CHECK (current_day >= 1),
  days_completed INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  
  -- Completion status
  completed_at TIMESTAMPTZ,
  completion_rating INTEGER CHECK (completion_rating BETWEEN 1 AND 5),
  completion_feedback TEXT CHECK (char_length(completion_feedback) <= 1000),
  
  -- Partnership tracking
  partner1_participation_score DECIMAL(3,2) DEFAULT 0.00 CHECK (partner1_participation_score BETWEEN 0.00 AND 1.00),
  partner2_participation_score DECIMAL(3,2) DEFAULT 0.00 CHECK (partner2_participation_score BETWEEN 0.00 AND 1.00),
  
  -- Metadata
  difficulty_adjustment TEXT CHECK (difficulty_adjustment IN ('easier', 'same', 'harder')),
  notes JSONB, -- Internal notes and adjustments
  
  UNIQUE (couple_id, quest_id)
);

-- Daily quest completions
CREATE TABLE public.quest_day_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  progress_id UUID NOT NULL REFERENCES quest_progress(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number >= 1),
  
  -- User who completed this day
  completed_by_user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  
  -- Completion data
  completion_data JSONB, -- Answers, reflections, activity results
  time_spent_minutes INTEGER CHECK (time_spent_minutes > 0),
  
  -- Sharing and visibility
  visibility TEXT CHECK (visibility IN ('private', 'partner_only', 'shared_summary')) DEFAULT 'partner_only',
  shared_reflection TEXT CHECK (char_length(shared_reflection) <= 500),
  
  -- Quality metrics
  engagement_score DECIMAL(3,2) CHECK (engagement_score BETWEEN 0.00 AND 1.00),
  helpfulness_rating INTEGER CHECK (helpfulness_rating BETWEEN 1 AND 5),
  
  -- Timestamps
  completed_at TIMESTAMPTZ DEFAULT now(),
  shared_at TIMESTAMPTZ,
  
  UNIQUE (progress_id, day_number, completed_by_user_id)
);

-- Quest reactions and interactions between partners
CREATE TABLE public.quest_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to the day completion
  day_completion_id UUID NOT NULL REFERENCES quest_day_completions(id) ON DELETE CASCADE,
  
  -- User providing the reaction
  reactor_user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  
  -- Interaction type and content
  interaction_type TEXT CHECK (interaction_type IN ('reaction', 'comment', 'encouragement', 'question')) NOT NULL,
  content TEXT CHECK (char_length(content) <= 300),
  emoji TEXT CHECK (char_length(emoji) <= 20),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure users can't react to their own completions
  CONSTRAINT no_self_reactions CHECK (
    reactor_user_id != (
      SELECT completed_by_user_id 
      FROM quest_day_completions 
      WHERE id = day_completion_id
    )
  )
);

-- Quest achievements and milestones
CREATE TABLE public.quest_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Achievement metadata
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  description TEXT NOT NULL CHECK (char_length(description) <= 300),
  icon TEXT NOT NULL, -- Icon identifier
  category TEXT CHECK (category IN ('completion', 'consistency', 'engagement', 'milestone')) NOT NULL,
  
  -- Achievement criteria
  criteria JSONB NOT NULL, -- Conditions for earning this achievement
  points_value INTEGER DEFAULT 0 CHECK (points_value >= 0),
  
  -- Rarity and visibility
  rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')) DEFAULT 'common',
  is_secret BOOLEAN DEFAULT false,
  is_couple_achievement BOOLEAN DEFAULT false, -- Requires both partners
  
  -- Publishing
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User achievement unlocks
CREATE TABLE public.user_quest_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  user_id UUID NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES quest_achievements(id) ON DELETE CASCADE,
  quest_progress_id UUID REFERENCES quest_progress(id) ON DELETE CASCADE,
  
  -- Achievement context
  earned_at TIMESTAMPTZ DEFAULT now(),
  context JSONB, -- Additional context about how it was earned
  
  -- Sharing
  is_shared BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ,
  
  UNIQUE (user_id, achievement_id)
);

-- Quest templates and variations
CREATE TABLE public.quest_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template metadata
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  description TEXT CHECK (char_length(description) <= 500),
  category TEXT NOT NULL,
  
  -- Template structure
  template_structure JSONB NOT NULL,
  variable_fields TEXT[] DEFAULT '{}', -- Fields that can be customized
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by UUID, -- Staff member
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Quest discovery and filtering
CREATE INDEX idx_connection_quests_published ON connection_quests(is_published, category, difficulty_level) 
WHERE is_published = true;

CREATE INDEX idx_connection_quests_category ON connection_quests(category, difficulty_level, duration_days);

CREATE INDEX idx_connection_quests_archetypes ON connection_quests 
USING GIN (suitable_for_archetypes) WHERE is_published = true;

-- Quest progress tracking
CREATE INDEX idx_quest_progress_couple ON quest_progress(couple_id, started_at DESC);

CREATE INDEX idx_quest_progress_active ON quest_progress(couple_id, quest_id) 
WHERE completed_at IS NULL;

CREATE INDEX idx_quest_progress_completed ON quest_progress(completed_at DESC) 
WHERE completed_at IS NOT NULL;

-- Daily completions
CREATE INDEX idx_quest_day_completions_progress ON quest_day_completions(progress_id, day_number);

CREATE INDEX idx_quest_day_completions_user ON quest_day_completions(completed_by_user_id, completed_at DESC);

CREATE INDEX idx_quest_day_completions_recent ON quest_day_completions(completed_at DESC) 
WHERE completed_at > (now() - interval '7 days');

-- Interactions
CREATE INDEX idx_quest_interactions_completion ON quest_interactions(day_completion_id, created_at DESC);

CREATE INDEX idx_quest_interactions_user ON quest_interactions(reactor_user_id, created_at DESC);

-- Achievements
CREATE INDEX idx_quest_achievements_active ON quest_achievements(category, rarity) 
WHERE is_active = true;

CREATE INDEX idx_user_quest_achievements_user ON user_quest_achievements(user_id, earned_at DESC);

CREATE INDEX idx_user_quest_achievements_quest ON user_quest_achievements(quest_progress_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE connection_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_day_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quest_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_templates ENABLE ROW LEVEL SECURITY;

-- Quest visibility (published quests are public, drafts are admin-only)
CREATE POLICY "quests_public_read" ON connection_quests
  FOR SELECT USING (is_published = true);

CREATE POLICY "quests_admin_all" ON connection_quests
  FOR ALL USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'content_creator'),
      false
    )
  );

-- Quest progress (couples can see their own progress)
CREATE POLICY "quest_progress_couple_access" ON quest_progress
  FOR ALL USING (
    couple_id IN (
      SELECT cm.couple_id 
      FROM couple_members cm 
      WHERE cm.user_id IN (
        SELECT up.user_id 
        FROM user_profiles up 
        WHERE up.user_id = auth.uid()
      )
    )
  );

-- Daily completions (couple members can see completions within their quests)
CREATE POLICY "quest_day_completions_couple_access" ON quest_day_completions
  FOR ALL USING (
    progress_id IN (
      SELECT qp.id 
      FROM quest_progress qp
      JOIN couple_members cm ON qp.couple_id = cm.couple_id
      JOIN user_profiles up ON cm.user_id = up.user_id
      WHERE up.user_id = auth.uid()
    )
  );

-- Interactions (couple members can interact within their quests)
CREATE POLICY "quest_interactions_couple_access" ON quest_interactions
  FOR ALL USING (
    day_completion_id IN (
      SELECT qdc.id 
      FROM quest_day_completions qdc
      JOIN quest_progress qp ON qdc.progress_id = qp.id
      JOIN couple_members cm ON qp.couple_id = cm.couple_id
      JOIN user_profiles up ON cm.user_id = up.user_id
      WHERE up.user_id = auth.uid()
    )
  );

-- Achievements (public read, admin manage)
CREATE POLICY "achievements_public_read" ON quest_achievements
  FOR SELECT USING (is_active = true AND NOT is_secret);

CREATE POLICY "achievements_admin_all" ON quest_achievements
  FOR ALL USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') = 'admin',
      false
    )
  );

-- User achievements (users can see their own achievements)
CREATE POLICY "user_achievements_own" ON user_quest_achievements
  FOR ALL USING (
    user_id = auth.uid()
  );

-- Quest templates (admin only)
CREATE POLICY "quest_templates_admin_only" ON quest_templates
  FOR ALL USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'content_creator'),
      false
    )
  );

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to check if a quest is available for a couple
CREATE OR REPLACE FUNCTION public.is_quest_available_for_couple(
  p_quest_id UUID,
  p_couple_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  quest_record connection_quests;
  couple_record couples;
  relationship_months INTEGER;
  partner_archetypes TEXT[];
BEGIN
  -- Get quest details
  SELECT * INTO quest_record
  FROM connection_quests
  WHERE id = p_quest_id AND is_published = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Get couple details
  SELECT * INTO couple_record
  FROM couples
  WHERE id = p_couple_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if already completed
  IF EXISTS (
    SELECT 1 FROM quest_progress
    WHERE couple_id = p_couple_id AND quest_id = p_quest_id AND completed_at IS NOT NULL
  ) THEN
    RETURN false;
  END IF;
  
  -- Check relationship length requirement
  relationship_months := EXTRACT(epoch FROM (now() - couple_record.created_at)) / (30 * 24 * 60 * 60);
  IF relationship_months < quest_record.minimum_relationship_length_months THEN
    RETURN false;
  END IF;
  
  -- Check archetype compatibility (if specified)
  IF array_length(quest_record.suitable_for_archetypes, 1) > 0 THEN
    -- Get partner archetypes
    SELECT array_agg(up.archetype) INTO partner_archetypes
    FROM couple_members cm
    JOIN user_profiles up ON cm.user_id = up.user_id
    WHERE cm.couple_id = p_couple_id AND up.archetype IS NOT NULL;
    
    -- Check if any partner archetype matches quest requirements
    IF NOT (quest_record.suitable_for_archetypes && COALESCE(partner_archetypes, '{}'::TEXT[])) THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Check prerequisites
  IF array_length(quest_record.prerequisites, 1) > 0 THEN
    -- Verify all prerequisite quests are completed
    IF EXISTS (
      SELECT 1 
      FROM unnest(quest_record.prerequisites) AS prereq_id
      WHERE NOT EXISTS (
        SELECT 1 FROM quest_progress
        WHERE couple_id = p_couple_id 
        AND quest_id = prereq_id::UUID 
        AND completed_at IS NOT NULL
      )
    ) THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate quest completion percentage
CREATE OR REPLACE FUNCTION public.calculate_quest_completion_percentage(
  p_progress_id UUID
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_days INTEGER;
  completed_days INTEGER;
  completion_percentage DECIMAL(5,2);
BEGIN
  -- Get total days for the quest
  SELECT cq.duration_days INTO total_days
  FROM quest_progress qp
  JOIN connection_quests cq ON qp.quest_id = cq.id
  WHERE qp.id = p_progress_id;
  
  -- Get completed days count
  SELECT COUNT(DISTINCT day_number) INTO completed_days
  FROM quest_day_completions
  WHERE progress_id = p_progress_id;
  
  -- Calculate percentage
  IF total_days > 0 THEN
    completion_percentage := (completed_days::DECIMAL / total_days::DECIMAL) * 100;
  ELSE
    completion_percentage := 0;
  END IF;
  
  RETURN ROUND(completion_percentage, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update quest progress
CREATE OR REPLACE FUNCTION public.update_quest_progress_stats()
RETURNS TRIGGER AS $$
DECLARE
  total_days INTEGER;
  completed_unique_days INTEGER;
BEGIN
  -- Get total days for the quest
  SELECT cq.duration_days INTO total_days
  FROM quest_progress qp
  JOIN connection_quests cq ON qp.quest_id = cq.id
  WHERE qp.id = NEW.progress_id;
  
  -- Count unique completed days
  SELECT COUNT(DISTINCT day_number) INTO completed_unique_days
  FROM quest_day_completions
  WHERE progress_id = NEW.progress_id;
  
  -- Update progress record
  UPDATE quest_progress
  SET 
    days_completed = completed_unique_days,
    current_day = GREATEST(current_day, NEW.day_number + 1),
    last_activity_at = NOW(),
    completed_at = CASE 
      WHEN completed_unique_days >= total_days THEN NOW()
      ELSE completed_at
    END
  WHERE id = NEW.progress_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update quest progress on completion
CREATE TRIGGER update_quest_progress_on_completion
  AFTER INSERT ON quest_day_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_quest_progress_stats();

-- ============================================================================
-- SEED DATA - SAMPLE QUESTS
-- ============================================================================

-- Sample quest: Communication Foundations (7-day)
INSERT INTO connection_quests (
  title, description, slug, duration_days, difficulty_level, category,
  suitable_for_archetypes, minimum_relationship_length_months, requires_both_partners,
  content, evidence_base, learning_objectives, estimated_time_per_day_minutes
) VALUES (
  'Communication Foundations',
  'Build stronger communication skills through daily practices based on research-proven techniques.',
  'communication-foundations',
  7, 'beginner', 'communication',
  ARRAY['growth_seeker', 'responsive_partner', 'security_seeker'], 0, true,
  '{
    "days": [
      {
        "day": 1,
        "title": "Active Listening Practice",
        "activity": {
          "type": "structured_conversation",
          "instructions": [
            "Partner A shares something on their mind for 3 minutes",
            "Partner B listens without interrupting, then reflects back what they heard",
            "Partner B asks one clarifying question",
            "Switch roles and repeat"
          ],
          "reflection_prompts": [
            "How did it feel to be truly heard?",
            "What did you notice about your listening habits?"
          ]
        }
      },
      {
        "day": 2,
        "title": "Appreciation Express",
        "activity": {
          "type": "gratitude_practice",
          "instructions": [
            "Share three specific things you appreciate about your partner",
            "Focus on actions, not just qualities",
            "Be specific about the impact these actions had on you"
          ],
          "reflection_prompts": [
            "Which appreciation resonated most with you?",
            "How did expressing appreciation feel?"
          ]
        }
      }
    ]
  }'::jsonb,
  'Gottman Method research on communication patterns',
  ARRAY['Active listening skills', 'Appreciation expression', 'Emotional awareness'],
  15
);

-- Mark the quest as published
UPDATE connection_quests SET is_published = true, publish_date = now()
WHERE slug = 'communication-foundations';