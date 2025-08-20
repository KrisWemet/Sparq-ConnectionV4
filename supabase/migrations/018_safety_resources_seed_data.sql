-- Safety Resources Seed Data Migration
-- Populates essential crisis and support resources for common jurisdictions

-- Insert critical crisis resources for United States
INSERT INTO safety_resources (
  resource_name,
  resource_type,
  phone_number,
  text_number,
  website_url,
  availability_hours,
  languages_supported,
  cost_structure,
  country_code,
  service_description,
  target_demographics,
  crisis_types_supported,
  verified,
  verification_date,
  last_contact_verified,
  reliability_rating,
  display_priority,
  is_active
) VALUES
-- US National Crisis Resources
(
  'National Suicide Prevention Lifeline',
  'crisis_hotline',
  '988',
  NULL,
  'https://suicidepreventionlifeline.org',
  '24/7',
  '["en", "es"]',
  'free',
  'US',
  'Free, confidential 24/7 crisis support for people in distress and their loved ones',
  '["all_ages", "all_demographics"]',
  '["suicidal_ideation", "mental_health_crisis", "emotional_distress", "despair"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  5,
  1,
  true
),

(
  'Crisis Text Line',
  'chat_service',
  NULL,
  '741741',
  'https://www.crisistextline.org',
  '24/7',
  '["en", "es"]',
  'free',
  'US',
  'Free, 24/7 text-based crisis support for any crisis',
  '["all_ages", "text_preferred"]',
  '["crisis_support", "mental_health", "substance_abuse", "self_harm", "relationship_issues"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  5,
  2,
  true
),

(
  'National Domestic Violence Hotline',
  'domestic_violence_support',
  '1-800-799-7233',
  '22522',
  'https://www.thehotline.org',
  '24/7',
  '["en", "es"]',
  'free',
  'US',
  'Confidential support for survivors of domestic violence and their loved ones',
  '["domestic_violence_survivors", "intimate_partner_violence"]',
  '["domestic_violence", "intimate_partner_violence", "safety_planning", "stalking"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  5,
  3,
  true
),

(
  'SAMHSA National Helpline',
  'mental_health_service',
  '1-800-662-4357',
  NULL,
  'https://www.samhsa.gov/find-help/national-helpline',
  '24/7',
  '["en", "es"]',
  'free',
  'US',
  'Treatment referral and information service for mental health and substance use disorders',
  '["substance_abuse", "mental_health_treatment"]',
  '["substance_abuse", "mental_health_treatment", "referrals", "addiction"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  5,
  4,
  true
),

(
  'LGBT National Hotline',
  'crisis_hotline',
  '1-866-488-7386',
  NULL,
  'https://www.lgbthotline.org',
  '4pm-12am ET, Mon-Fri; 12pm-5pm ET, Sat',
  '["en"]',
  'free',
  'US',
  'Confidential peer-support for LGBTQ+ individuals and allies',
  '["lgbtq_plus", "sexual_minorities", "gender_minorities"]',
  '["lgbtq_support", "identity_issues", "discrimination", "coming_out"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  4,
  10,
  true
),

(
  'Trans Lifeline',
  'crisis_hotline',
  '877-565-8860',
  NULL,
  'https://translifeline.org',
  'Various hours - check website',
  '["en"]',
  'free',
  'US',
  'Crisis support for transgender people by transgender people',
  '["transgender", "gender_minorities"]',
  '["transgender_support", "gender_identity", "crisis_support"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  4,
  11,
  true
),

-- Canadian Crisis Resources
(
  'Canada Suicide Prevention Service',
  'crisis_hotline',
  '1-833-456-4566',
  '45645',
  'https://www.crisisservicescanada.ca',
  '24/7',
  '["en", "fr"]',
  'free',
  'CA',
  'National suicide prevention service providing support to those affected by suicide',
  '["all_ages", "all_demographics"]',
  '["suicidal_ideation", "mental_health_crisis", "emotional_distress"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  5,
  1,
  true
),

(
  'Kids Help Phone',
  'crisis_hotline',
  '1-800-668-6868',
  '686868',
  'https://kidshelpphone.ca',
  '24/7',
  '["en", "fr"]',
  'free',
  'CA',
  'Professional counselling and support for young people',
  '["children", "youth", "young_adults"]',
  '["youth_crisis", "mental_health", "relationship_issues", "bullying"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  5,
  2,
  true
),

-- UK Crisis Resources
(
  'Samaritans',
  'crisis_hotline',
  '116 123',
  NULL,
  'https://www.samaritans.org',
  '24/7',
  '["en"]',
  'free',
  'GB',
  'Confidential emotional support for anyone experiencing distress or despair',
  '["all_ages", "all_demographics"]',
  '["suicidal_ideation", "mental_health_crisis", "emotional_distress", "despair"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  5,
  1,
  true
),

(
  'National Domestic Abuse Helpline',
  'domestic_violence_support',
  '0808 2000 247',
  NULL,
  'https://www.nationaldahelpline.org.uk',
  '24/7',
  '["en"]',
  'free',
  'GB',
  'Confidential helpline for women experiencing domestic abuse',
  '["domestic_violence_survivors", "women"]',
  '["domestic_violence", "intimate_partner_violence", "safety_planning"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  5,
  2,
  true
),

-- Australian Crisis Resources
(
  'Lifeline Australia',
  'crisis_hotline',
  '13 11 14',
  NULL,
  'https://www.lifeline.org.au',
  '24/7',
  '["en"]',
  'free',
  'AU',
  'Crisis support and suicide prevention services',
  '["all_ages", "all_demographics"]',
  '["suicidal_ideation", "mental_health_crisis", "emotional_distress"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  5,
  1,
  true
),

(
  '1800RESPECT',
  'domestic_violence_support',
  '1800 737 732',
  NULL,
  'https://www.1800respect.org.au',
  '24/7',
  '["en"]',
  'free',
  'AU',
  'National sexual assault, family and domestic violence counselling line',
  '["domestic_violence_survivors", "sexual_assault_survivors"]',
  '["domestic_violence", "sexual_assault", "family_violence"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  5,
  2,
  true
),

-- International/Global Resources
(
  'International Association for Suicide Prevention',
  'online_support',
  NULL,
  NULL,
  'https://www.iasp.info/resources/Crisis_Centres',
  'Varies by region',
  '["en"]',
  'free',
  'GLOBAL',
  'Directory of crisis centers and suicide prevention resources worldwide',
  '["international", "travelers"]',
  '["suicide_prevention", "crisis_support", "international_resources"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  4,
  50,
  true
),

-- Online and Chat Resources
(
  'Crisis Chat',
  'chat_service',
  NULL,
  NULL,
  'https://www.crisischat.org',
  'Varies - check website',
  '["en"]',
  'free',
  'US',
  'Online crisis chat support for individuals in crisis',
  '["online_preferred", "anonymous_support"]',
  '["crisis_support", "mental_health", "emotional_distress"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  4,
  20,
  true
);

-- Add couples and relationship specific resources
INSERT INTO safety_resources (
  resource_name,
  resource_type,
  phone_number,
  website_url,
  availability_hours,
  languages_supported,
  cost_structure,
  country_code,
  service_description,
  target_demographics,
  crisis_types_supported,
  verified,
  verification_date,
  last_contact_verified,
  reliability_rating,
  display_priority,
  is_active
) VALUES
(
  'American Association for Marriage and Family Therapy',
  'couples_therapy',
  '703-838-9808',
  'https://www.aamft.org',
  'Business hours',
  '["en"]',
  'fee_for_service',
  'US',
  'Professional association providing referrals to licensed marriage and family therapists',
  '["couples", "families", "relationship_issues"]',
  '["relationship_counseling", "couples_therapy", "family_therapy", "communication_issues"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  4,
  30,
  true
),

(
  'Psychology Today Therapy Directory',
  'mental_health_service',
  NULL,
  'https://www.psychologytoday.com',
  'Online 24/7',
  '["en"]',
  'varies',
  'US',
  'Online directory to find therapists, counselors, and support groups',
  '["therapy_seekers", "mental_health_support"]',
  '["therapy_referrals", "mental_health_treatment", "counseling"]',
  true,
  CURRENT_DATE,
  CURRENT_DATE,
  4,
  40,
  true
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_safety_resources_country_type ON safety_resources(country_code, resource_type);
CREATE INDEX IF NOT EXISTS idx_safety_resources_active_verified ON safety_resources(is_active, verified) WHERE is_active = true AND verified = true;
CREATE INDEX IF NOT EXISTS idx_safety_resources_crisis_types ON safety_resources USING GIN(crisis_types_supported);
CREATE INDEX IF NOT EXISTS idx_safety_resources_priority ON safety_resources(display_priority) WHERE is_active = true;

-- Add helpful comments
COMMENT ON TABLE safety_resources IS 'Crisis support resources and professional services organized by jurisdiction';
COMMENT ON COLUMN safety_resources.crisis_types_supported IS 'JSON array of crisis types this resource can help with';
COMMENT ON COLUMN safety_resources.target_demographics IS 'JSON array of specific populations this resource serves';
COMMENT ON COLUMN safety_resources.display_priority IS 'Lower numbers display first (1 = highest priority)';

-- Update updated_at trigger for safety_resources table
CREATE OR REPLACE FUNCTION update_safety_resource_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_safety_resources_updated_at 
    BEFORE UPDATE ON safety_resources 
    FOR EACH ROW 
    EXECUTE FUNCTION update_safety_resource_updated_at();