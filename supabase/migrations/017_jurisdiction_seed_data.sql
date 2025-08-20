-- Jurisdiction Seed Data Migration
-- Populates basic jurisdiction data for common regions

-- Insert primary jurisdictions
INSERT INTO jurisdictions (
  country_code,
  country_name,
  state_province_code,
  state_province_name,
  data_protection_laws,
  mandatory_reporting_requirements,
  crisis_intervention_protocols,
  primary_language,
  supported_languages,
  timezone,
  emergency_number,
  crisis_hotline_numbers,
  currency_code
) VALUES
-- United States
(
  'US',
  'United States',
  NULL,
  NULL,
  '["CCPA", "HIPAA", "FERPA"]',
  '{"mandatory_reporting": ["child_abuse", "elder_abuse", "domestic_violence"], "professional_duty": true}',
  '{"emergency_services": "911", "crisis_response": "professional_referral", "involuntary_hold_authority": "police_mental_health"}',
  'en',
  '["en", "es"]',
  'America/New_York',
  '911',
  '["988", "1-800-273-8255", "741741"]',
  'USD'
),

-- Canada
(
  'CA',
  'Canada',
  NULL,
  NULL,
  '["PIPEDA", "Privacy Act"]',
  '{"mandatory_reporting": ["child_abuse", "elder_abuse"], "professional_duty": true, "provincial_variations": true}',
  '{"emergency_services": "911", "crisis_response": "professional_referral", "provincial_protocols": true}',
  'en',
  '["en", "fr"]',
  'America/Toronto',
  '911',
  '["1-833-456-4566", "1-866-277-3553"]',
  'CAD'
),

-- United Kingdom
(
  'GB',
  'United Kingdom',
  NULL,
  NULL,
  '["GDPR", "Data Protection Act 2018"]',
  '{"mandatory_reporting": ["safeguarding_concerns"], "professional_duty": true}',
  '{"emergency_services": "999", "crisis_response": "NHS_pathway", "sectioning_authority": "approved_mental_health"}',
  'en',
  '["en"]',
  'Europe/London',
  '999',
  '["116123", "0800-068-41-41"]',
  'GBP'
),

-- European Union (Generic)
(
  'EU',
  'European Union',
  NULL,
  NULL,
  '["GDPR"]',
  '{"mandatory_reporting": ["varies_by_member_state"], "professional_duty": true}',
  '{"emergency_services": "112", "crisis_response": "member_state_protocols"}',
  'en',
  '["en", "de", "fr", "es", "it"]',
  'Europe/Brussels',
  '112',
  '["112"]',
  'EUR'
),

-- Australia
(
  'AU',
  'Australia',
  NULL,
  NULL,
  '["Privacy Act 1988", "Australian Privacy Principles"]',
  '{"mandatory_reporting": ["child_protection", "elder_abuse"], "professional_duty": true}',
  '{"emergency_services": "000", "crisis_response": "state_protocols", "mental_health_act": "state_based"}',
  'en',
  '["en"]',
  'Australia/Sydney',
  '000',
  '["13-11-14", "1800-551-800"]',
  'AUD'
),

-- Global/International (fallback)
(
  'GLOBAL',
  'International',
  NULL,
  NULL,
  '["Universal Declaration of Human Rights"]',
  '{"varies_by_jurisdiction": true}',
  '{"emergency_services": "varies", "crisis_response": "international_resources"}',
  'en',
  '["en"]',
  'UTC',
  'varies',
  '["varies_by_location"]',
  'USD'
);

-- Insert some state-specific jurisdictions for US
INSERT INTO jurisdictions (
  country_code,
  country_name,
  state_province_code,
  state_province_name,
  data_protection_laws,
  mandatory_reporting_requirements,
  crisis_intervention_protocols,
  primary_language,
  supported_languages,
  timezone,
  emergency_number,
  crisis_hotline_numbers,
  currency_code
) VALUES
-- California (stronger privacy laws)
(
  'US',
  'United States',
  'CA',
  'California',
  '["CCPA", "CPRA", "HIPAA", "FERPA"]',
  '{"mandatory_reporting": ["child_abuse", "elder_abuse", "domestic_violence"], "professional_duty": true, "ca_specific": true}',
  '{"emergency_services": "911", "crisis_response": "professional_referral", "5150_authority": true}',
  'en',
  '["en", "es"]',
  'America/Los_Angeles',
  '911',
  '["988", "1-800-273-8255", "741741"]',
  'USD'
),

-- New York
(
  'US',
  'United States',
  'NY',
  'New York',
  '["HIPAA", "FERPA", "NY SHIELD Act"]',
  '{"mandatory_reporting": ["child_abuse", "elder_abuse", "domestic_violence"], "professional_duty": true}',
  '{"emergency_services": "911", "crisis_response": "professional_referral", "mental_hygiene_law": true}',
  'en',
  '["en", "es"]',
  'America/New_York',
  '911',
  '["988", "1-800-273-8255", "741741"]',
  'USD'
);

-- Insert some provincial jurisdictions for Canada
INSERT INTO jurisdictions (
  country_code,
  country_name,
  state_province_code,
  state_province_name,
  data_protection_laws,
  mandatory_reporting_requirements,
  crisis_intervention_protocols,
  primary_language,
  supported_languages,
  timezone,
  emergency_number,
  crisis_hotline_numbers,
  currency_code
) VALUES
-- Ontario
(
  'CA',
  'Canada',
  'ON',
  'Ontario',
  '["PIPEDA", "FIPPA", "PHIPA"]',
  '{"mandatory_reporting": ["child_abuse", "elder_abuse"], "professional_duty": true, "duty_to_report": "Children\'s Aid Society"}',
  '{"emergency_services": "911", "crisis_response": "CMHA", "mental_health_act": "ontario_specific"}',
  'en',
  '["en", "fr"]',
  'America/Toronto',
  '911',
  '["1-833-456-4566", "1-866-277-3553", "2-1-1"]',
  'CAD'
),

-- Quebec
(
  'CA',
  'Canada',
  'QC',
  'Quebec',
  '["PIPEDA", "Quebec Privacy Act"]',
  '{"mandatory_reporting": ["child_abuse", "elder_abuse"], "professional_duty": true, "dpy_authority": true}',
  '{"emergency_services": "911", "crisis_response": "quebec_protocols", "mental_health_act": "quebec_specific"}',
  'fr',
  '["fr", "en"]',
  'America/Montreal',
  '911',
  '["1-866-277-3553", "2-1-1"]',
  'CAD'
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_jurisdictions_country_code ON jurisdictions(country_code);
CREATE INDEX IF NOT EXISTS idx_jurisdictions_country_state ON jurisdictions(country_code, state_province_code);
CREATE INDEX IF NOT EXISTS idx_jurisdictions_service_available ON jurisdictions(service_available) WHERE service_available = true;

-- Add helpful comments
COMMENT ON TABLE jurisdictions IS 'Geographic jurisdictions with legal, compliance, and service configuration data';
COMMENT ON COLUMN jurisdictions.country_code IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN jurisdictions.data_protection_laws IS 'Array of applicable data protection regulations';
COMMENT ON COLUMN jurisdictions.crisis_intervention_protocols IS 'Configuration for crisis response procedures';
COMMENT ON COLUMN jurisdictions.emergency_number IS 'Primary emergency services number (e.g., 911, 999, 112)';
COMMENT ON COLUMN jurisdictions.crisis_hotline_numbers IS 'Array of crisis support hotline numbers';

-- Update updated_at trigger for jurisdictions table
CREATE OR REPLACE FUNCTION update_jurisdiction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jurisdictions_updated_at 
    BEFORE UPDATE ON jurisdictions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_jurisdiction_updated_at();