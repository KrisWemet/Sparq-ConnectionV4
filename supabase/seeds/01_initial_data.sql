-- Sparq Connection V4: Database Seeding Scripts
-- Purpose: Populate database with initial data for development and testing
-- IMPORTANT: This script should only be run in development/testing environments

-- ============================================================================
-- SAFETY CHECK - PREVENT ACCIDENTAL PRODUCTION SEEDING
-- ============================================================================

DO $$
BEGIN
  -- Check if this is a production environment
  IF current_setting('app.environment', true) = 'production' THEN
    RAISE EXCEPTION 'Seeding scripts cannot be run in production environment';
  END IF;
  
  RAISE NOTICE 'Seeding database with initial development data...';
END $$;

-- ============================================================================
-- JURISDICTIONS AND LOCATIONS
-- ============================================================================

-- Insert major jurisdictions with compliance requirements
INSERT INTO jurisdictions (
  country_code, country_name, state_province_code, state_province_name,
  data_protection_laws, primary_language, supported_languages,
  service_available, emergency_number, crisis_hotline_numbers,
  currency_code, timezone
) VALUES
-- United States
('US', 'United States', 'CA', 'California', 
 '["CCPA", "HIPAA"]'::jsonb, 'en', '["en", "es"]'::jsonb, 
 true, '911', '["988", "1-800-273-8255"]'::jsonb, 'USD', 'America/Los_Angeles'),
('US', 'United States', 'NY', 'New York',
 '["CCPA", "HIPAA"]'::jsonb, 'en', '["en", "es"]'::jsonb,
 true, '911', '["988", "1-800-273-8255"]'::jsonb, 'USD', 'America/New_York'),
('US', 'United States', 'TX', 'Texas',
 '["CCPA", "HIPAA"]'::jsonb, 'en', '["en", "es"]'::jsonb,
 true, '911', '["988", "1-800-273-8255"]'::jsonb, 'USD', 'America/Chicago'),

-- Canada
('CA', 'Canada', 'ON', 'Ontario',
 '["PIPEDA"]'::jsonb, 'en', '["en", "fr"]'::jsonb,
 true, '911', '["988", "1-833-456-4566"]'::jsonb, 'CAD', 'America/Toronto'),
('CA', 'Canada', 'BC', 'British Columbia',
 '["PIPEDA"]'::jsonb, 'en', '["en", "fr"]'::jsonb,
 true, '911', '["988", "1-833-456-4566"]'::jsonb, 'CAD', 'America/Vancouver'),

-- European Union
('DE', 'Germany', NULL, NULL,
 '["GDPR"]'::jsonb, 'de', '["de", "en"]'::jsonb,
 true, '112', '["116 117"]'::jsonb, 'EUR', 'Europe/Berlin'),
('FR', 'France', NULL, NULL,
 '["GDPR"]'::jsonb, 'fr', '["fr", "en"]'::jsonb,
 true, '112', '["3114"]'::jsonb, 'EUR', 'Europe/Paris'),
('GB', 'United Kingdom', NULL, NULL,
 '["UK-GDPR"]'::jsonb, 'en', '["en"]'::jsonb,
 true, '999', '["116 123"]'::jsonb, 'GBP', 'Europe/London'),

-- Global coverage for international users
('GLOBAL', 'Global Coverage', NULL, NULL,
 '["GDPR", "CCPA", "PIPEDA"]'::jsonb, 'en', '["en"]'::jsonb,
 true, 'varies', '["varies"]'::jsonb, 'USD', 'UTC')
ON CONFLICT (country_code, state_province_code) DO NOTHING;

-- ============================================================================
-- SUBSCRIPTION TIERS
-- ============================================================================

-- Insert subscription tiers
INSERT INTO subscription_tiers (
  tier_name, tier_display_name, tier_description,
  price_monthly_cents, price_annual_cents, trial_period_days,
  max_daily_prompts, max_assessments_per_month, max_progress_goals,
  advanced_analytics_enabled, priority_support_enabled, custom_content_enabled,
  safety_monitoring_enabled, crisis_resources_enabled,
  is_active, is_public, sort_order
) VALUES
-- Free tier
('free', 'Free', 'Basic relationship wellness tools with essential safety features',
 0, 0, 0,
 3, 2, 3,
 false, false, false,
 true, true,
 true, true, 1),

-- Premium couple tier
('premium_couple', 'Premium Couple', 'Complete relationship toolkit with advanced features for couples',
 1999, 19990, 14,
 -1, -1, -1,
 true, true, true,
 true, true,
 true, true, 2),

-- Professional tier (for therapists/counselors)
('professional', 'Professional', 'Tools for licensed professionals working with couples',
 4999, 49990, 7,
 -1, -1, -1,
 true, true, true,
 true, true,
 true, false, 3) -- Not publicly visible
ON CONFLICT (tier_name) DO NOTHING;

-- ============================================================================
-- SAFETY RESOURCES
-- ============================================================================

-- Insert crisis and safety resources
INSERT INTO safety_resources (
  resource_name, resource_type, phone_number, text_number, website_url,
  availability_hours, languages_supported, cost_structure,
  country_code, state_province, service_description,
  crisis_types_supported, verified, display_priority, is_active
) VALUES
-- US National Resources
('National Suicide Prevention Lifeline', 'crisis_hotline', '988', '988', 'https://suicidepreventionlifeline.org',
 '24/7', '["en", "es"]'::jsonb, 'free',
 'US', NULL, 'Free and confidential emotional support for people in suicidal crisis or emotional distress',
 '["suicidal_ideation", "emotional_distress", "mental_health_emergency"]'::jsonb, true, 1, true),

('Crisis Text Line', 'chat_service', NULL, '741741', 'https://www.crisistextline.org',
 '24/7', '["en", "es"]'::jsonb, 'free',
 'US', NULL, 'Free crisis counseling via text message',
 '["suicidal_ideation", "emotional_distress", "relationship_crisis"]'::jsonb, true, 2, true),

('National Domestic Violence Hotline', 'domestic_violence_support', '1-800-799-7233', '88788', 'https://www.thehotline.org',
 '24/7', '["en", "es"]'::jsonb, 'free',
 'US', NULL, 'Confidential support for domestic violence survivors',
 '["domestic_violence", "relationship_crisis"]'::jsonb, true, 1, true),

('SAMHSA National Helpline', 'mental_health_service', '1-800-662-4357', NULL, 'https://www.samhsa.gov/find-help/national-helpline',
 '24/7', '["en", "es"]'::jsonb, 'free',
 'US', NULL, 'Treatment referral and information service for mental health and substance abuse',
 '["substance_abuse", "mental_health_emergency", "emotional_distress"]'::jsonb, true, 3, true),

-- Canadian Resources
('Talk Suicide Canada', 'crisis_hotline', '1-833-456-4566', '45645', 'https://talksuicide.ca',
 '24/7', '["en", "fr"]'::jsonb, 'free',
 'CA', NULL, 'Canada-wide suicide prevention service',
 '["suicidal_ideation", "emotional_distress"]'::jsonb, true, 1, true),

('Canadian Centre for Gender and Sexual Diversity', 'online_support', '1-877-688-4765', NULL, 'https://ccgsd-ccdgs.org',
 'Business hours', '["en", "fr"]'::jsonb, 'free',
 'CA', NULL, 'Support for LGBTQ2S+ individuals and relationships',
 '["relationship_crisis", "emotional_distress"]'::jsonb, true, 4, true),

-- UK Resources
('Samaritans', 'crisis_hotline', '116 123', NULL, 'https://www.samaritans.org',
 '24/7', '["en"]'::jsonb, 'free',
 'GB', NULL, 'Free emotional support for anyone in distress',
 '["suicidal_ideation", "emotional_distress"]'::jsonb, true, 1, true),

('Refuge National Domestic Abuse Helpline', 'domestic_violence_support', '0808 2000 247', NULL, 'https://www.refuge.org.uk',
 '24/7', '["en"]'::jsonb, 'free',
 'GB', NULL, 'Support for women and children experiencing domestic violence',
 '["domestic_violence", "relationship_crisis"]'::jsonb, true, 2, true),

-- Global Resources
('International Association for Suicide Prevention', 'online_support', NULL, NULL, 'https://www.iasp.info/resources/Crisis_Centres',
 'Varies', '["en"]'::jsonb, 'free',
 'GLOBAL', NULL, 'Directory of crisis centers worldwide',
 '["suicidal_ideation", "emotional_distress"]'::jsonb, true, 10, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SELF-REPORT MEASURES (VALIDATED SCALES)
-- ============================================================================

-- Insert validated relationship assessment scales
INSERT INTO self_report_measures (
  measure_name, measure_type, measure_version, is_validated_scale,
  validation_source, educational_purpose, questions, scoring_algorithm,
  interpretation_guidelines, estimated_completion_minutes,
  disclaimer_text, is_active
) VALUES
-- Relationship Assessment Scale (Hendrick, 1988)
('Relationship Assessment Scale', 'relationship_satisfaction', '1.0', true,
 'Hendrick, S. S. (1988). A generic measure of relationship satisfaction. Journal of Marriage and the Family, 50, 93-98.',
 'Educational assessment of relationship satisfaction for personal growth and awareness',
 '[
   {"id": "ras1", "text": "How well does your partner meet your needs?", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Poorly", "Fair", "Average", "Well", "Extremely well"]},
   {"id": "ras2", "text": "In general, how satisfied are you with your relationship?", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Unsatisfied", "Slightly satisfied", "Moderately satisfied", "Very satisfied", "Extremely satisfied"]},
   {"id": "ras3", "text": "How good is your relationship compared to most?", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Poor", "Fair", "Average", "Good", "Excellent"]},
   {"id": "ras4", "text": "How often do you wish you hadnt gotten into this relationship?", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Very often", "Often", "Sometimes", "Rarely", "Never"]},
   {"id": "ras5", "text": "To what extent has your relationship met your original expectations?", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Not at all", "Slightly", "Moderately", "Considerably", "Completely"]},
   {"id": "ras6", "text": "How much do you love your partner?", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Not at all", "A little", "Moderately", "Very much", "Extremely"]},
   {"id": "ras7", "text": "How many problems are there in your relationship?", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Very many", "Many", "Some", "Few", "Very few"]}
 ]'::jsonb,
 '{
   "scoring": "sum",
   "reverse_items": ["ras4", "ras7"],
   "min_score": 7,
   "max_score": 35,
   "interpretation_ranges": {
     "7-14": "low_satisfaction",
     "15-21": "moderate_satisfaction", 
     "22-28": "good_satisfaction",
     "29-35": "high_satisfaction"
   }
 }'::jsonb,
 '{
   "low_satisfaction": "This suggests some areas of your relationship may benefit from attention and growth.",
   "moderate_satisfaction": "Your relationship has a solid foundation with room for continued growth.",
   "good_satisfaction": "You report good satisfaction with your relationship across multiple areas.",
   "high_satisfaction": "You report high satisfaction with your relationship in most areas."
 }'::jsonb,
 5,
 'This assessment is for educational and self-reflection purposes only. It is not a clinical diagnostic tool and should not replace professional relationship counseling.',
 true),

-- Communication Patterns Questionnaire (simplified educational version)
('Communication Patterns Assessment', 'communication_quality', '1.0', true,
 'Adapted from Christensen & Sullaway (1984) Communication Patterns Questionnaire',
 'Educational assessment of communication patterns for relationship awareness and improvement',
 '[
   {"id": "cpq1", "text": "When discussing relationship problems, how often do you express your feelings openly?", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Never", "Rarely", "Sometimes", "Often", "Always"]},
   {"id": "cpq2", "text": "How often does your partner listen to your concerns without getting defensive?", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Never", "Rarely", "Sometimes", "Often", "Always"]},
   {"id": "cpq3", "text": "During disagreements, how often do you both work together to find solutions?", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Never", "Rarely", "Sometimes", "Often", "Always"]},
   {"id": "cpq4", "text": "How often do you avoid discussing important relationship issues?", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Always", "Often", "Sometimes", "Rarely", "Never"]},
   {"id": "cpq5", "text": "When upset, how often do you withdraw from your partner?", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Always", "Often", "Sometimes", "Rarely", "Never"]}
 ]'::jsonb,
 '{
   "scoring": "average",
   "reverse_items": ["cpq4", "cpq5"],
   "min_score": 1,
   "max_score": 5,
   "interpretation_ranges": {
     "1.0-2.0": "communication_challenges",
     "2.1-3.0": "developing_communication",
     "3.1-4.0": "good_communication",
     "4.1-5.0": "excellent_communication"
   }
 }'::jsonb,
 '{
   "communication_challenges": "Consider focusing on improving open communication and active listening skills.",
   "developing_communication": "You have some positive communication patterns with room for growth.",
   "good_communication": "You demonstrate good communication skills in your relationship.",
   "excellent_communication": "You and your partner appear to have strong communication patterns."
 }'::jsonb,
 3,
 'This assessment provides educational insights into communication patterns. It is not a clinical evaluation.',
 true),

-- Basic Attachment Style Assessment (educational)
('Attachment Style Assessment', 'attachment_style', '1.0', false,
 'Educational tool based on attachment theory research',
 'Educational exploration of attachment patterns in relationships for personal awareness',
 '[
   {"id": "att1", "text": "I find it easy to get emotionally close to others", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]},
   {"id": "att2", "text": "I worry about being abandoned in relationships", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]},
   {"id": "att3", "text": "I prefer to keep some distance in romantic relationships", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]},
   {"id": "att4", "text": "I feel comfortable depending on romantic partners", "type": "likert", "scale": [1,2,3,4,5], "labels": ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]}
 ]'::jsonb,
 '{
   "scoring": "categorical",
   "attachment_indicators": {
     "secure": {"high": ["att1", "att4"], "low": ["att2", "att3"]},
     "anxious": {"high": ["att2"], "moderate": ["att1"], "low": ["att3"]},
     "avoidant": {"high": ["att3"], "low": ["att1", "att4"]},
     "mixed": {"variable": ["att1", "att2", "att3", "att4"]}
   }
 }'::jsonb,
 '{
   "secure": "You may have a secure attachment style, feeling comfortable with closeness and independence.",
   "anxious": "You may have some anxious attachment patterns, seeking closeness while worrying about relationships.",
   "avoidant": "You may have some avoidant attachment patterns, valuing independence and emotional distance.",
   "mixed": "You show a mix of attachment patterns, which is common and reflects relationship complexity."
 }'::jsonb,
 3,
 'This is an educational exploration of attachment patterns, not a clinical assessment. Attachment styles can change over time and vary between relationships.',
 true)
ON CONFLICT (measure_name) DO NOTHING;

-- ============================================================================
-- DAILY PROMPTS
-- ============================================================================

-- Insert sample daily prompts for relationship growth
INSERT INTO daily_prompts (
  prompt_text, prompt_category, difficulty_level, target_relationship_stage,
  generated_by_ai, human_reviewed, is_active, quality_score
) VALUES
-- Communication prompts
('Share one thing you appreciated about your partner today and why it meant something to you.', 'appreciation', 'easy', 'any', false, true, true, 0.95),
('Describe a moment from your past week when you felt truly heard by your partner.', 'communication', 'medium', 'any', false, true, true, 0.90),
('What is one topic you have been hesitant to discuss, and how might you approach it together?', 'communication', 'challenging', 'established', false, true, true, 0.85),

-- Goals and growth prompts  
('What is one relationship goal you would like to work on together in the next month?', 'goals', 'medium', 'any', false, true, true, 0.92),
('How have you both grown as individuals since being together?', 'growth', 'medium', 'established', false, true, true, 0.88),
('What is one new experience you would like to share together?', 'fun', 'easy', 'any', false, true, true, 0.93),

-- Intimacy and connection prompts
('Share a favorite memory from your relationship and what made it special.', 'deep_connection', 'easy', 'any', false, true, true, 0.94),
('How do you prefer to receive love and affection from your partner?', 'intimacy', 'medium', 'any', false, true, true, 0.91),
('What makes you feel most connected to your partner?', 'deep_connection', 'medium', 'any', false, true, true, 0.89),

-- Conflict resolution prompts
('Describe your preferred approach to resolving disagreements.', 'conflict_resolution', 'medium', 'any', false, true, true, 0.87),
('What is one thing you could both do differently during conflicts?', 'conflict_resolution', 'challenging', 'established', false, true, true, 0.83)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DATA RETENTION POLICIES  
-- ============================================================================

-- Insert default data retention policies
INSERT INTO data_retention_policies (
  policy_name, table_name, data_category, retention_period_days,
  grace_period_days, legal_basis, deletion_method, auto_apply
) VALUES
('User Communication Cleanup', 'communication_history', 'user_communications', 1095, 30, 'consent', 'soft_delete', true),
('Assessment Responses Retention', 'assessment_responses', 'assessment_data', 2190, 30, 'consent', 'anonymize', true),
('Audit Log Retention', 'audit_log', 'audit_data', 2555, 0, 'legal_obligation', 'archive', true),
('Analytics Data Cleanup', 'usage_analytics', 'analytics_data', 365, 0, 'legitimate_interests', 'hard_delete', true),
('Inactive User Profiles', 'users', 'user_profiles', 2555, 90, 'consent', 'anonymize', false),
('Cancelled Subscriptions', 'user_subscriptions', 'billing_data', 2190, 30, 'contract', 'soft_delete', true),
('Safety Signal Retention', 'safety_risk_signals', 'safety_data', 1095, 60, 'vital_interests', 'anonymize', true),
('Crisis Escalation Records', 'crisis_escalations', 'crisis_data', 2555, 90, 'vital_interests', 'anonymize', false),
('Consent History Retention', 'consent_audit_log', 'consent_data', 2555, 0, 'legal_obligation', 'archive', true),
('Professional Referral Data', 'professional_referrals', 'referral_data', 1825, 60, 'vital_interests', 'anonymize', true)
ON CONFLICT (table_name, data_category) DO NOTHING;

-- ============================================================================
-- PROFESSIONAL CONTACTS (SAMPLE DATA FOR DEVELOPMENT)
-- ============================================================================

-- Insert sample professional contacts (encrypted with dummy data for development)
INSERT INTO professional_contacts (
  professional_name, professional_type, contact_info_encrypted, 
  specializations, therapy_approaches, crisis_experience_level,
  accepts_crisis_referrals, current_capacity_level, response_time_hours,
  languages_spoken, telehealth_available, serves_jurisdiction_ids,
  license_verified, is_active
) VALUES
('Dr. Sarah Thompson', 'couples_therapist', '[ENCRYPTED_CONTACT_INFO]',
 '["couples_therapy", "relationship_counseling", "communication_skills"]'::jsonb,
 '["emotionally_focused_therapy", "gottman_method", "cognitive_behavioral"]'::jsonb,
 'expert', true, 'limited', 4,
 '["en"]'::jsonb, true, '["US-CA", "US-NV"]'::jsonb, true, true),

('Dr. Michael Chen', 'crisis_counselor', '[ENCRYPTED_CONTACT_INFO]', 
 '["crisis_intervention", "suicide_prevention", "trauma_therapy"]'::jsonb,
 '["crisis_intervention", "cbt", "mindfulness_based"]'::jsonb,
 'specialized', true, 'available', 2,
 '["en", "zh"]'::jsonb, true, '["US-CA"]'::jsonb, true, true),

('Dr. Emily Rodriguez', 'licensed_therapist', '[ENCRYPTED_CONTACT_INFO]',
 '["anxiety", "depression", "relationship_issues", "domestic_violence"]'::jsonb,
 '["trauma_informed", "solution_focused", "psychodynamic"]'::jsonb,
 'expert', true, 'available', 6,
 '["en", "es"]'::jsonb, true, '["US-CA", "US-TX"]'::jsonb, true, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CONTENT TEMPLATES
-- ============================================================================

-- Insert reusable content templates
INSERT INTO content_templates (
  template_name, template_type, category, content_text,
  generated_by_ai, human_reviewed, approved_for_production, is_active,
  quality_score
) VALUES
('Welcome Message', 'guidance_text', 'onboarding',
 'Welcome to Sparq Connection! Our platform is designed to support your relationship wellness journey through evidence-based tools and resources. Remember, this is for educational and wellness purposes only.',
 false, true, true, true, 0.98),

('Crisis Resources Introduction', 'safety_message', 'crisis_support',
 'If you are experiencing a crisis or having thoughts of self-harm, please reach out for immediate support. You are not alone, and help is available 24/7.',
 false, true, true, true, 0.97),

('Assessment Completion', 'guidance_text', 'assessment',
 'Thank you for completing this assessment. Your responses help us provide personalized insights for your relationship growth. Remember, this is for educational purposes and is not a substitute for professional counseling.',
 false, true, true, true, 0.96),

('Privacy Reminder', 'guidance_text', 'privacy',
 'Your privacy is important to us. We use advanced encryption to protect your data, and you have full control over what information you choose to share.',
 false, true, true, true, 0.95),

('Goal Setting Encouragement', 'guidance_text', 'goals',
 'Setting relationship goals together is a positive step toward growth. Start with small, achievable goals and celebrate your progress along the way.',
 false, true, true, true, 0.94)
ON CONFLICT (template_name) DO NOTHING;

-- ============================================================================
-- SEEDING COMPLETION LOG
-- ============================================================================

-- Log the completion of seeding
INSERT INTO audit_log (
  action_type, resource_type, details, regulatory_context
) VALUES (
  'database_seeded', 'system',
  jsonb_build_object(
    'seeding_timestamp', NOW(),
    'environment', current_setting('app.environment', true),
    'tables_seeded', jsonb_build_array(
      'jurisdictions', 'subscription_tiers', 'safety_resources', 
      'self_report_measures', 'daily_prompts', 'data_retention_policies',
      'professional_contacts', 'content_templates'
    ),
    'seed_version', '1.0'
  ),
  'internal'
);

-- Final success message
DO $$
BEGIN
  RAISE NOTICE 'Database seeding completed successfully! 🌱';
  RAISE NOTICE 'Seeded data includes:';
  RAISE NOTICE '- % jurisdictions', (SELECT COUNT(*) FROM jurisdictions);
  RAISE NOTICE '- % subscription tiers', (SELECT COUNT(*) FROM subscription_tiers);
  RAISE NOTICE '- % safety resources', (SELECT COUNT(*) FROM safety_resources);
  RAISE NOTICE '- % assessment measures', (SELECT COUNT(*) FROM self_report_measures);
  RAISE NOTICE '- % daily prompts', (SELECT COUNT(*) FROM daily_prompts);
  RAISE NOTICE '- % retention policies', (SELECT COUNT(*) FROM data_retention_policies);
  RAISE NOTICE '- % professional contacts', (SELECT COUNT(*) FROM professional_contacts);
  RAISE NOTICE '- % content templates', (SELECT COUNT(*) FROM content_templates);
  RAISE NOTICE 'Ready for development and testing! 🚀';
END $$;