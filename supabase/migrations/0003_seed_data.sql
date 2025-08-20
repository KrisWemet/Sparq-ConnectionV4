-- Seed safety resources for different regions
INSERT INTO safety_resources (name, category, region, language, phone_number, text_number, website_url, available_24_7, services_offered, verified, verification_date) VALUES
-- United States
('National Suicide Prevention Lifeline', 'crisis_hotline', 'US', 'en', '988', '988', 'https://suicidepreventionlifeline.org/', true, ARRAY['crisis counseling', 'suicide prevention', 'mental health support'], true, CURRENT_DATE),
('Crisis Text Line', 'crisis_hotline', 'US', 'en', null, '741741', 'https://www.crisistextline.org/', true, ARRAY['crisis counseling', 'text support'], true, CURRENT_DATE),
('National Domestic Violence Hotline', 'domestic_violence', 'US', 'en', '1-800-799-7233', '88788', 'https://www.thehotline.org/', true, ARRAY['domestic violence support', 'safety planning', 'shelter referrals'], true, CURRENT_DATE),
('SAMHSA National Helpline', 'mental_health', 'US', 'en', '1-800-662-4357', null, 'https://www.samhsa.gov/find-help/national-helpline', true, ARRAY['mental health support', 'substance abuse', 'treatment referrals'], true, CURRENT_DATE),
('LGBT National Hotline', 'lgbtq_support', 'US', 'en', '1-888-843-4564', null, 'https://www.lgbthotline.org/', true, ARRAY['lgbtq support', 'crisis counseling', 'peer support'], true, CURRENT_DATE),

-- Canada
('Talk Suicide Canada', 'crisis_hotline', 'CA', 'en', '1-833-456-4566', '45645', 'https://talksuicide.ca/', true, ARRAY['crisis counseling', 'suicide prevention'], true, CURRENT_DATE),
('Talk Suicide Canada (French)', 'crisis_hotline', 'CA', 'fr', '1-833-456-4566', '45645', 'https://parlonssuicide.ca/', true, ARRAY['crisis counseling', 'suicide prevention'], true, CURRENT_DATE),
('Assaulted Women''s Helpline', 'domestic_violence', 'CA-ON', 'en', '1-866-863-0511', null, 'https://www.awhl.org/', true, ARRAY['domestic violence support', 'crisis counseling'], true, CURRENT_DATE),
('Kids Help Phone', 'youth_support', 'CA', 'en', '1-800-668-6868', '686868', 'https://kidshelpphone.ca/', true, ARRAY['youth counseling', 'crisis support'], true, CURRENT_DATE),

-- United Kingdom
('Samaritans', 'crisis_hotline', 'UK', 'en', '116 123', null, 'https://www.samaritans.org/', true, ARRAY['crisis counseling', 'emotional support'], true, CURRENT_DATE),
('National Domestic Abuse Helpline', 'domestic_violence', 'UK', 'en', '0808 2000 247', null, 'https://www.nationaldahelpline.org.uk/', true, ARRAY['domestic violence support', 'safety planning'], true, CURRENT_DATE),
('Mind', 'mental_health', 'UK', 'en', '0300 123 3393', null, 'https://www.mind.org.uk/', false, ARRAY['mental health support', 'information'], true, CURRENT_DATE),

-- Australia
('Lifeline', 'crisis_hotline', 'AU', 'en', '13 11 14', null, 'https://www.lifeline.org.au/', true, ARRAY['crisis counseling', 'suicide prevention'], true, CURRENT_DATE),
('1800RESPECT', 'domestic_violence', 'AU', 'en', '1800 737 732', null, 'https://www.1800respect.org.au/', true, ARRAY['domestic violence support', 'sexual assault support'], true, CURRENT_DATE),
('Beyond Blue', 'mental_health', 'AU', 'en', '1300 22 4636', null, 'https://www.beyondblue.org.au/', true, ARRAY['mental health support', 'anxiety', 'depression'], true, CURRENT_DATE);

-- Seed content templates based on evidence-based approaches
INSERT INTO content_templates (name, archetype_compatibility, difficulty_level, category, template_content, variables, research_source, clinical_validation) VALUES
-- Level 1: Foundation Building
('Daily Appreciation Practice', ARRAY['calm_anchor', 'responsive_partner', 'growth_seeker', 'steady_support'], 1, 'appreciation', 
 '{"title": "Daily Appreciation Practice", "teaching_moment": "Research shows that expressing appreciation strengthens relationship bonds and increases satisfaction. This simple practice helps build a foundation of positive interactions.", "activity": {"type": "individual_then_share", "instructions": ["Think of one specific thing your partner did today that you appreciated", "Write it down with specific details about why it mattered to you", "Share your appreciation with your partner"], "time_estimate": "5-10 minutes"}}',
 '{"partner_name": "string", "relationship_length": "string"}',
 'Gottman Institute Research on Positive Interactions',
 true),

('Weekly Check-In Ritual', ARRAY['growth_seeker', 'responsive_partner'], 2, 'communication',
 '{"title": "Weekly Relationship Check-In", "teaching_moment": "Regular check-ins help couples stay connected and address small issues before they become bigger problems. This creates a safe space for open communication.", "activity": {"type": "together", "instructions": ["Set aside 20 minutes without distractions", "Each person shares: What went well this week in our relationship?", "Each person shares: What could we improve on?", "End with one thing you''re looking forward to together"], "time_estimate": "20 minutes"}}',
 '{"couple_names": "array", "check_in_day": "string"}',
 'Emotionally Focused Therapy (EFT) Methods',
 true),

-- Level 2: Communication Skills
('Active Listening Exercise', ARRAY['responsive_partner', 'growth_seeker'], 2, 'communication',
 '{"title": "Active Listening Practice", "teaching_moment": "Active listening involves fully focusing on your partner, understanding their perspective, and reflecting back what you hear. This builds emotional connection and reduces misunderstandings.", "activity": {"type": "structured_conversation", "instructions": ["Partner A shares something on their mind for 3 minutes", "Partner B listens without interrupting, then reflects back what they heard", "Partner B asks one clarifying question", "Switch roles and repeat"], "time_estimate": "15 minutes"}}',
 '{"listener_tips": "array", "speaker_tips": "array"}',
 'Gottman Method Communication Research',
 true),

('Conflict Resolution Framework', ARRAY['growth_seeker', 'calm_anchor'], 3, 'conflict_resolution',
 '{"title": "Gentle Problem Solving", "teaching_moment": "Healthy couples don''t avoid conflict - they approach it constructively. Using a structured approach helps you address issues without damaging your connection.", "activity": {"type": "problem_solving", "instructions": ["Identify the specific issue (not personality traits)", "Each person shares their feelings using ''I'' statements", "Brainstorm solutions together without judging ideas", "Choose one solution to try for a week"], "time_estimate": "25 minutes"}}',
 '{"conflict_topic": "string", "resolution_steps": "array"}',
 'Gottman Method Conflict Resolution',
 true),

-- Level 3: Deeper Connection
('Emotional Needs Mapping', ARRAY['growth_seeker', 'responsive_partner'], 3, 'emotional_intimacy',
 '{"title": "Understanding Each Other''s Emotional Needs", "teaching_moment": "Every person has core emotional needs in relationships. Understanding and meeting these needs creates deeper intimacy and security.", "activity": {"type": "exploration", "instructions": ["Each person identifies their top 3 emotional needs (feeling valued, feeling heard, feeling supported, etc.)", "Share why these needs are important to you", "Discuss specific ways your partner could help meet these needs", "Create a plan to check in on these needs monthly"], "time_estimate": "30 minutes"}}',
 '{"emotional_needs_list": "array", "specific_examples": "array"}',
 'Attachment Theory Research',
 true),

('Love Language Discovery', ARRAY['steady_support', 'responsive_partner', 'growth_seeker'], 2, 'emotional_intimacy',
 '{"title": "Discovering Your Love Languages", "teaching_moment": "People express and receive love differently. Understanding your partner''s primary love language helps you show love in ways they can truly feel and appreciate.", "activity": {"type": "assessment_and_discussion", "instructions": ["Each person completes a brief love language assessment", "Share your results and discuss what resonates", "Give specific examples of how your partner has shown love in your language", "Plan one way to express love in your partner''s language this week"], "time_estimate": "20 minutes"}}',
 '{"love_languages": "array", "expression_examples": "array"}',
 'Chapman''s Five Love Languages Research',
 true),

-- Level 4: Advanced Relationship Skills
('Vulnerability Practice', ARRAY['growth_seeker'], 4, 'emotional_intimacy',
 '{"title": "Building Emotional Intimacy Through Vulnerability", "teaching_moment": "Vulnerability is the birthplace of love, belonging, and joy. Sharing our authentic selves, including fears and insecurities, deepens emotional connection.", "activity": {"type": "guided_sharing", "instructions": ["Create a safe, uninterrupted space", "Each person shares something they''ve been afraid to say", "Practice receiving without trying to fix or judge", "End by appreciating each other''s courage"], "time_estimate": "25 minutes"}}',
 '{"vulnerability_prompts": "array", "safety_guidelines": "array"}',
 'Brené Brown Vulnerability Research',
 true),

('Relationship Vision Creation', ARRAY['growth_seeker', 'calm_anchor'], 4, 'future_planning',
 '{"title": "Creating Your Relationship Vision", "teaching_moment": "Couples who have a shared vision for their future are more likely to navigate challenges successfully and feel fulfilled together.", "activity": {"type": "collaborative_planning", "instructions": ["Each person writes their individual hopes for the relationship", "Share and identify common themes", "Create a joint vision statement", "Identify 3 concrete steps to move toward this vision"], "time_estimate": "40 minutes"}}',
 '{"vision_areas": "array", "goal_setting_framework": "object"}',
 'Gottman Method Shared Meaning Research',
 true),

-- Crisis Prevention Templates
('Stress Management Together', ARRAY['calm_anchor', 'steady_support'], 2, 'stress_management',
 '{"title": "Managing External Stress as a Team", "teaching_moment": "External stressors can strain relationships. Learning to support each other during difficult times strengthens your bond and resilience.", "activity": {"type": "support_planning", "instructions": ["Each person identifies their current main stressors", "Discuss how stress affects your relationship", "Brainstorm ways to support each other during stressful times", "Create a stress support plan you can both refer to"], "time_estimate": "20 minutes"}}',
 '{"stress_signs": "array", "support_strategies": "array"}',
 'Stress and Relationships Research',
 true);

-- Seed AI cache with common responses to optimize costs
INSERT INTO ai_cache (cache_key, content, archetype, difficulty_level, category, expires_at) VALUES
('appreciation_calm_anchor_1', 
 '{"personalized_intro": "As someone who brings stability to your relationship", "encouragement": "Your steady presence is a gift to your partner", "specific_tip": "Notice the small, consistent ways your partner shows care"}',
 'calm_anchor', 1, 'appreciation', NOW() + INTERVAL '30 days'),

('communication_growth_seeker_2',
 '{"personalized_intro": "Your willingness to grow together is inspiring", "encouragement": "Every conversation is an opportunity to deepen your connection", "specific_tip": "Remember that growth takes patience with both yourself and your partner"}',
 'growth_seeker', 2, 'communication', NOW() + INTERVAL '30 days'),

('conflict_responsive_partner_3',
 '{"personalized_intro": "Your emotional awareness is a strength in difficult moments", "encouragement": "Your ability to tune into emotions can guide you through conflict", "specific_tip": "Use your emotional intelligence to create safety during disagreements"}',
 'responsive_partner', 3, 'conflict_resolution', NOW() + INTERVAL '30 days');

-- Insert initial progress tracking metrics framework
INSERT INTO progress_tracking (couple_id, metric_name, metric_value, metric_category, measurement_method, recorded_at)
SELECT 
  NULL as couple_id, -- This will be populated when couples are created
  'relationship_satisfaction_baseline' as metric_name,
  0.0 as metric_value,
  'satisfaction' as metric_category,
  'survey' as measurement_method,
  NOW() as recorded_at
WHERE FALSE; -- This creates the structure but no actual data

-- Create default consent types
INSERT INTO consents (user_id, consent_type, consent_version, granted, legal_basis)
SELECT 
  NULL as user_id, -- Template for when users sign up
  'safety_monitoring' as consent_type,
  '1.0' as consent_version,
  true as granted,
  'legitimate_interest' as legal_basis
WHERE FALSE; -- Template only