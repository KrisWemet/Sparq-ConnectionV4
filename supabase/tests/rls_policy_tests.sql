-- Sparq Connection V4: RLS Policy Unit Tests
-- Purpose: Comprehensive testing of Row Level Security policies for data isolation
-- These tests ensure users can only access their own data and appropriate couple data

-- ============================================================================
-- TEST SETUP AND UTILITIES
-- ============================================================================

-- Create test users and couples for isolation testing
DO $$
DECLARE
  test_auth_id_1 UUID := 'auth_user_1_test';
  test_auth_id_2 UUID := 'auth_user_2_test';
  test_auth_id_3 UUID := 'auth_user_3_test';
  test_user_id_1 UUID;
  test_user_id_2 UUID;
  test_user_id_3 UUID;
  test_couple_id_12 UUID;
BEGIN
  -- Insert test auth users (simulating Supabase Auth)
  INSERT INTO auth.users (id, email, created_at, updated_at)
  VALUES 
    (test_auth_id_1, 'test1@example.com', NOW(), NOW()),
    (test_auth_id_2, 'test2@example.com', NOW(), NOW()),
    (test_auth_id_3, 'test3@example.com', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert test users
  INSERT INTO users (id, auth_id, email_encrypted, display_name, is_active)
  VALUES 
    (uuid_generate_v4(), test_auth_id_1, 'encrypted_test1@example.com', 'Test User 1', true),
    (uuid_generate_v4(), test_auth_id_2, 'encrypted_test2@example.com', 'Test User 2', true),
    (uuid_generate_v4(), test_auth_id_3, 'encrypted_test3@example.com', 'Test User 3', true)
  ON CONFLICT (auth_id) DO NOTHING
  RETURNING id INTO test_user_id_1;
  
  -- Get user IDs
  SELECT id INTO test_user_id_1 FROM users WHERE auth_id = test_auth_id_1;
  SELECT id INTO test_user_id_2 FROM users WHERE auth_id = test_auth_id_2;
  SELECT id INTO test_user_id_3 FROM users WHERE auth_id = test_auth_id_3;
  
  -- Create test couple between user 1 and user 2
  INSERT INTO couples (id, partner_1_id, partner_2_id, relationship_type, is_active)
  VALUES (uuid_generate_v4(), test_user_id_1, test_user_id_2, 'dating', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO test_couple_id_12;
  
  RAISE NOTICE 'Test data setup complete. Users: %, %, %. Couple: %', 
    test_user_id_1, test_user_id_2, test_user_id_3, test_couple_id_12;
END $$;

-- Function to test RLS policy isolation
CREATE OR REPLACE FUNCTION test_rls_policy_isolation()
RETURNS TABLE(
  test_name TEXT,
  table_name TEXT,
  policy_name TEXT,
  test_result TEXT,
  expected_result TEXT,
  passed BOOLEAN,
  details TEXT
) AS $$
DECLARE
  test_auth_id_1 UUID := 'auth_user_1_test';
  test_auth_id_2 UUID := 'auth_user_2_test';
  test_auth_id_3 UUID := 'auth_user_3_test';
  test_user_id_1 UUID;
  test_user_id_2 UUID;
  test_user_id_3 UUID;
  test_couple_id UUID;
  record_count INTEGER;
  test_record_id UUID;
BEGIN
  -- Get test user IDs
  SELECT id INTO test_user_id_1 FROM users WHERE auth_id = test_auth_id_1;
  SELECT id INTO test_user_id_2 FROM users WHERE auth_id = test_auth_id_2;
  SELECT id INTO test_user_id_3 FROM users WHERE auth_id = test_auth_id_3;
  
  -- Get test couple ID
  SELECT id INTO test_couple_id FROM couples WHERE 
    (partner_1_id = test_user_id_1 AND partner_2_id = test_user_id_2) OR
    (partner_1_id = test_user_id_2 AND partner_2_id = test_user_id_1);

  -- ============================================================================
  -- TEST 1: User Profile Access Control
  -- ============================================================================
  
  -- Test: User can access own profile
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_1::text, true);
  
  SELECT COUNT(*) INTO record_count FROM users WHERE auth_id = test_auth_id_1;
  RETURN NEXT (
    'User Profile Access - Own Profile',
    'users',
    'users_select_own',
    record_count::text,
    '1',
    record_count = 1,
    'User should be able to access their own profile'
  );
  
  -- Test: User cannot access other user's profile
  SELECT COUNT(*) INTO record_count FROM users WHERE auth_id = test_auth_id_2;
  RETURN NEXT (
    'User Profile Access - Other Profile',
    'users', 
    'users_select_own',
    record_count::text,
    '0',
    record_count = 0,
    'User should not be able to access other users profiles'
  );

  -- ============================================================================
  -- TEST 2: User Preferences Isolation
  -- ============================================================================
  
  -- Insert test preferences for user 1 and user 2
  INSERT INTO user_preferences (user_id, email_notifications, push_notifications)
  VALUES (test_user_id_1, true, true), (test_user_id_2, false, false)
  ON CONFLICT (user_id) DO UPDATE SET 
    email_notifications = EXCLUDED.email_notifications,
    push_notifications = EXCLUDED.push_notifications;
  
  -- Test: User 1 can access own preferences
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_1::text, true);
  SELECT COUNT(*) INTO record_count FROM user_preferences WHERE user_id = test_user_id_1;
  RETURN NEXT (
    'User Preferences - Own Access',
    'user_preferences',
    'user_preferences_own',
    record_count::text,
    '1',
    record_count = 1,
    'User should access their own preferences'
  );
  
  -- Test: User 1 cannot access user 2's preferences
  SELECT COUNT(*) INTO record_count FROM user_preferences WHERE user_id = test_user_id_2;
  RETURN NEXT (
    'User Preferences - Other User Access',
    'user_preferences',
    'user_preferences_own', 
    record_count::text,
    '0',
    record_count = 0,
    'User should not access other users preferences'
  );

  -- ============================================================================
  -- TEST 3: Couple Data Access Control
  -- ============================================================================
  
  -- Test: Partner 1 can access couple data
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_1::text, true);
  SELECT COUNT(*) INTO record_count FROM couples WHERE id = test_couple_id;
  RETURN NEXT (
    'Couple Access - Partner 1',
    'couples',
    'couples_members',
    record_count::text,
    '1', 
    record_count = 1,
    'Partner 1 should access couple data'
  );
  
  -- Test: Partner 2 can access couple data
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_2::text, true);
  SELECT COUNT(*) INTO record_count FROM couples WHERE id = test_couple_id;
  RETURN NEXT (
    'Couple Access - Partner 2',
    'couples',
    'couples_members',
    record_count::text,
    '1',
    record_count = 1, 
    'Partner 2 should access couple data'
  );
  
  -- Test: Non-partner cannot access couple data
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_3::text, true);
  SELECT COUNT(*) INTO record_count FROM couples WHERE id = test_couple_id;
  RETURN NEXT (
    'Couple Access - Non-Partner',
    'couples',
    'couples_members',
    record_count::text,
    '0',
    record_count = 0,
    'Non-partner should not access couple data'
  );

  -- ============================================================================
  -- TEST 4: Communication History Access
  -- ============================================================================
  
  -- Insert test communication
  INSERT INTO communication_history (
    id, couple_id, sender_user_id, content_encrypted, message_type
  ) VALUES (
    uuid_generate_v4(), test_couple_id, test_user_id_1, 'encrypted_test_message', 'free_form'
  ) ON CONFLICT DO NOTHING;
  
  -- Test: Sender can access their communication
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_1::text, true);
  SELECT COUNT(*) INTO record_count FROM communication_history WHERE couple_id = test_couple_id;
  RETURN NEXT (
    'Communication Access - Sender',
    'communication_history',
    'communication_history_couple_members',
    record_count::text,
    '1',
    record_count >= 1,
    'Sender should access their communication'
  );
  
  -- Test: Partner can access couple communication
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_2::text, true);
  SELECT COUNT(*) INTO record_count FROM communication_history WHERE couple_id = test_couple_id;
  RETURN NEXT (
    'Communication Access - Partner',
    'communication_history',
    'communication_history_couple_members',
    record_count::text,
    '1',
    record_count >= 1,
    'Partner should access couple communication'
  );
  
  -- Test: Non-partner cannot access communication
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_3::text, true);
  SELECT COUNT(*) INTO record_count FROM communication_history WHERE couple_id = test_couple_id;
  RETURN NEXT (
    'Communication Access - Non-Partner',
    'communication_history', 
    'communication_history_couple_members',
    record_count::text,
    '0',
    record_count = 0,
    'Non-partner should not access communication'
  );

  -- ============================================================================
  -- TEST 5: Assessment Data Isolation
  -- ============================================================================
  
  -- Insert test assessment responses
  INSERT INTO assessment_responses (
    user_id, couple_id, measure_id, assessment_session_id, question_id, 
    question_text_hash, response_value, sharing_consent
  ) VALUES (
    test_user_id_1, test_couple_id, uuid_generate_v4(), uuid_generate_v4(), 
    'q1', 'hash123', '{"score": 5}', true
  ) ON CONFLICT DO NOTHING;
  
  -- Test: User can access their own assessment responses
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_1::text, true);
  SELECT COUNT(*) INTO record_count FROM assessment_responses WHERE user_id = test_user_id_1;
  RETURN NEXT (
    'Assessment Access - Own Data',
    'assessment_responses',
    'assessment_responses_own',
    record_count::text,
    '1',
    record_count >= 1,
    'User should access their own assessment data'
  );
  
  -- Test: Partner can access shared assessment responses
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_2::text, true);
  SELECT COUNT(*) INTO record_count FROM assessment_responses 
  WHERE couple_id = test_couple_id AND sharing_consent = true;
  RETURN NEXT (
    'Assessment Access - Partner Shared',
    'assessment_responses',
    'assessment_responses_partner',
    record_count::text,
    '1',
    record_count >= 1,
    'Partner should access shared assessment data'
  );
  
  -- Test: Non-partner cannot access assessment responses
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_3::text, true);
  SELECT COUNT(*) INTO record_count FROM assessment_responses WHERE user_id = test_user_id_1;
  RETURN NEXT (
    'Assessment Access - Non-Partner',
    'assessment_responses',
    'assessment_responses_own',
    record_count::text,
    '0',
    record_count = 0,
    'Non-partner should not access assessment data'
  );

  -- ============================================================================
  -- TEST 6: Safety Risk Signals Access
  -- ============================================================================
  
  -- Insert test safety risk signal
  INSERT INTO safety_risk_signals (
    user_id, signal_source, signal_type, risk_level, confidence_score, detected_indicators
  ) VALUES (
    test_user_id_1, 'communication_analysis', 'emotional_distress', 'medium', 0.75, '["stress"]'
  ) ON CONFLICT DO NOTHING;
  
  -- Test: User can access their own safety signals
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_1::text, true);
  SELECT COUNT(*) INTO record_count FROM safety_risk_signals WHERE user_id = test_user_id_1;
  RETURN NEXT (
    'Safety Signals - Own Access',
    'safety_risk_signals',
    'safety_risk_signals_own',
    record_count::text,
    '1', 
    record_count >= 1,
    'User should access their own safety signals'
  );
  
  -- Test: Other user cannot access safety signals
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_3::text, true);
  SELECT COUNT(*) INTO record_count FROM safety_risk_signals WHERE user_id = test_user_id_1;
  RETURN NEXT (
    'Safety Signals - Other User',
    'safety_risk_signals',
    'safety_risk_signals_own',
    record_count::text,
    '0',
    record_count = 0,
    'Other users should not access safety signals'
  );

  -- ============================================================================
  -- TEST 7: Consent Management Access
  -- ============================================================================
  
  -- Insert test consent records
  INSERT INTO user_consents (
    user_id, consent_type, granted, consent_method, consent_version, regulatory_basis
  ) VALUES (
    test_user_id_1, 'analytics_collection', true, 'explicit_opt_in', '1.0', 'GDPR'
  ) ON CONFLICT DO NOTHING;
  
  -- Test: User can access their own consents
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_1::text, true);
  SELECT COUNT(*) INTO record_count FROM user_consents WHERE user_id = test_user_id_1;
  RETURN NEXT (
    'Consent Access - Own Data',
    'user_consents',
    'user_consents_own',
    record_count::text,
    '1',
    record_count >= 1,
    'User should access their own consent records'
  );
  
  -- Test: Other user cannot access consents
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_2::text, true);
  SELECT COUNT(*) INTO record_count FROM user_consents WHERE user_id = test_user_id_1;
  RETURN NEXT (
    'Consent Access - Other User',
    'user_consents',
    'user_consents_own',
    record_count::text,
    '0',
    record_count = 0,
    'Other users should not access consent records'
  );

  -- ============================================================================
  -- TEST 8: Subscription Data Access
  -- ============================================================================
  
  -- Insert test subscription tier
  INSERT INTO subscription_tiers (tier_name, tier_display_name, tier_description, is_public, is_active)
  VALUES ('test_tier', 'Test Tier', 'Test subscription tier', true, true)
  ON CONFLICT (tier_name) DO NOTHING;
  
  -- Test: All users can view public subscription tiers
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_1::text, true);
  SELECT COUNT(*) INTO record_count FROM subscription_tiers WHERE tier_name = 'test_tier';
  RETURN NEXT (
    'Subscription Tiers - Public Access',
    'subscription_tiers',
    'subscription_tiers_public',
    record_count::text,
    '1',
    record_count >= 1,
    'All users should access public subscription tiers'
  );
  
  -- Insert test user subscription
  INSERT INTO user_subscriptions (user_id, tier_id, billing_cycle, status)
  SELECT test_user_id_1, id, 'free', 'active' FROM subscription_tiers WHERE tier_name = 'test_tier'
  ON CONFLICT DO NOTHING;
  
  -- Test: User can access their own subscription
  SELECT COUNT(*) INTO record_count FROM user_subscriptions WHERE user_id = test_user_id_1;
  RETURN NEXT (
    'User Subscriptions - Own Access',
    'user_subscriptions', 
    'user_subscriptions_own',
    record_count::text,
    '1',
    record_count >= 1,
    'User should access their own subscription'
  );
  
  -- Test: Other user cannot access subscription
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_2::text, true);
  SELECT COUNT(*) INTO record_count FROM user_subscriptions WHERE user_id = test_user_id_1;
  RETURN NEXT (
    'User Subscriptions - Other User',
    'user_subscriptions',
    'user_subscriptions_own',
    record_count::text,
    '0',
    record_count = 0,
    'Other users should not access subscriptions'
  );

  -- ============================================================================
  -- TEST 9: Audit Log Access Control
  -- ============================================================================
  
  -- Insert test audit log entry
  INSERT INTO audit_log (user_id, action_type, resource_type, details)
  VALUES (test_user_id_1, 'test_action', 'test_resource', '{"test": true}')
  ON CONFLICT DO NOTHING;
  
  -- Test: User can access their own audit logs
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_1::text, true);
  SELECT COUNT(*) INTO record_count FROM audit_log WHERE user_id = test_user_id_1;
  RETURN NEXT (
    'Audit Log - Own Access',
    'audit_log',
    'audit_log_own',
    record_count::text,
    '1',
    record_count >= 1,
    'User should access their own audit logs'
  );
  
  -- Test: Other user cannot access audit logs
  PERFORM set_config('request.jwt.claim.sub', test_auth_id_2::text, true);
  SELECT COUNT(*) INTO record_count FROM audit_log WHERE user_id = test_user_id_1;
  RETURN NEXT (
    'Audit Log - Other User',
    'audit_log',
    'audit_log_own',
    record_count::text,
    '0',
    record_count = 0,
    'Other users should not access audit logs'
  );

  -- Reset session to default
  PERFORM set_config('request.jwt.claim.sub', '', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STRESS TEST FUNCTIONS
-- ============================================================================

-- Function to test RLS performance with large datasets
CREATE OR REPLACE FUNCTION test_rls_performance()
RETURNS TABLE(
  test_name TEXT,
  table_name TEXT,
  record_count INTEGER,
  execution_time_ms INTEGER,
  performance_rating TEXT
) AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  duration_ms INTEGER;
  test_user_id UUID;
  test_couple_id UUID;
  i INTEGER;
BEGIN
  -- Create performance test user
  INSERT INTO auth.users (id, email, created_at, updated_at) 
  VALUES ('perf_test_auth_id', 'perf@test.com', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  INSERT INTO users (auth_id, email_encrypted, display_name)
  VALUES ('perf_test_auth_id', 'encrypted_perf@test.com', 'Perf Test User')
  ON CONFLICT (auth_id) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id INTO test_user_id;
  
  -- Set user context
  PERFORM set_config('request.jwt.claim.sub', 'perf_test_auth_id', true);
  
  -- Test 1: User profile access performance
  start_time := clock_timestamp();
  FOR i IN 1..1000 LOOP
    PERFORM 1 FROM users WHERE auth_id = 'perf_test_auth_id';
  END LOOP;
  end_time := clock_timestamp();
  duration_ms := EXTRACT(milliseconds FROM (end_time - start_time))::INTEGER;
  
  RETURN NEXT (
    'User Profile Access Performance',
    'users',
    1000,
    duration_ms,
    CASE WHEN duration_ms < 100 THEN 'Excellent'
         WHEN duration_ms < 500 THEN 'Good' 
         WHEN duration_ms < 1000 THEN 'Acceptable'
         ELSE 'Poor' END
  );
  
  -- Clean up performance test data
  DELETE FROM users WHERE auth_id = 'perf_test_auth_id';
  DELETE FROM auth.users WHERE id = 'perf_test_auth_id';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to test couple isolation with multiple relationships
CREATE OR REPLACE FUNCTION test_complex_couple_isolation()
RETURNS TABLE(
  test_name TEXT,
  scenario TEXT,
  expected_access TEXT,
  actual_access TEXT,
  passed BOOLEAN,
  details TEXT
) AS $$
DECLARE
  auth_id_a UUID := 'complex_test_a';
  auth_id_b UUID := 'complex_test_b';  
  auth_id_c UUID := 'complex_test_c';
  auth_id_d UUID := 'complex_test_d';
  user_id_a UUID;
  user_id_b UUID;
  user_id_c UUID;
  user_id_d UUID;
  couple_id_ab UUID;
  couple_id_cd UUID;
  record_count INTEGER;
BEGIN
  -- Create complex relationship scenario
  -- User A and B are in a couple
  -- User C and D are in a different couple
  
  -- Insert auth users
  INSERT INTO auth.users (id, email, created_at, updated_at) VALUES
    (auth_id_a, 'a@test.com', NOW(), NOW()),
    (auth_id_b, 'b@test.com', NOW(), NOW()),
    (auth_id_c, 'c@test.com', NOW(), NOW()),
    (auth_id_d, 'd@test.com', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  -- Insert users
  INSERT INTO users (id, auth_id, email_encrypted, display_name) VALUES
    (uuid_generate_v4(), auth_id_a, 'encrypted_a@test.com', 'User A'),
    (uuid_generate_v4(), auth_id_b, 'encrypted_b@test.com', 'User B'),
    (uuid_generate_v4(), auth_id_c, 'encrypted_c@test.com', 'User C'),
    (uuid_generate_v4(), auth_id_d, 'encrypted_d@test.com', 'User D')
  ON CONFLICT (auth_id) DO NOTHING;
  
  -- Get user IDs
  SELECT id INTO user_id_a FROM users WHERE auth_id = auth_id_a;
  SELECT id INTO user_id_b FROM users WHERE auth_id = auth_id_b;
  SELECT id INTO user_id_c FROM users WHERE auth_id = auth_id_c;
  SELECT id INTO user_id_d FROM users WHERE auth_id = auth_id_d;
  
  -- Create couples
  INSERT INTO couples (id, partner_1_id, partner_2_id, relationship_type, is_active) VALUES
    (uuid_generate_v4(), user_id_a, user_id_b, 'dating', true),
    (uuid_generate_v4(), user_id_c, user_id_d, 'married', true)
  ON CONFLICT DO NOTHING;
  
  -- Get couple IDs
  SELECT id INTO couple_id_ab FROM couples WHERE 
    (partner_1_id = user_id_a AND partner_2_id = user_id_b) OR
    (partner_1_id = user_id_b AND partner_2_id = user_id_a);
    
  SELECT id INTO couple_id_cd FROM couples WHERE
    (partner_1_id = user_id_c AND partner_2_id = user_id_d) OR
    (partner_1_id = user_id_d AND partner_2_id = user_id_c);
  
  -- Test Scenario 1: User A can access couple AB but not couple CD
  PERFORM set_config('request.jwt.claim.sub', auth_id_a::text, true);
  
  SELECT COUNT(*) INTO record_count FROM couples WHERE id = couple_id_ab;
  RETURN NEXT (
    'Complex Couple Isolation',
    'User A accessing own couple (AB)',
    '1',
    record_count::text,
    record_count = 1,
    'User A should access their own couple relationship'
  );
  
  SELECT COUNT(*) INTO record_count FROM couples WHERE id = couple_id_cd;
  RETURN NEXT (
    'Complex Couple Isolation',
    'User A accessing other couple (CD)',
    '0',
    record_count::text,
    record_count = 0,
    'User A should not access other couple relationships'
  );
  
  -- Test Scenario 2: User B (partner of A) can access couple AB
  PERFORM set_config('request.jwt.claim.sub', auth_id_b::text, true);
  
  SELECT COUNT(*) INTO record_count FROM couples WHERE id = couple_id_ab;
  RETURN NEXT (
    'Complex Couple Isolation',
    'User B (partner) accessing couple AB',
    '1',
    record_count::text,
    record_count = 1,
    'Partner should access shared couple relationship'
  );
  
  -- Test Scenario 3: Communication isolation between couples
  -- Insert communication for couple AB
  INSERT INTO communication_history (couple_id, sender_user_id, content_encrypted, message_type)
  VALUES (couple_id_ab, user_id_a, 'encrypted_message_ab', 'free_form')
  ON CONFLICT DO NOTHING;
  
  -- User C should not see couple AB's communication
  PERFORM set_config('request.jwt.claim.sub', auth_id_c::text, true);
  
  SELECT COUNT(*) INTO record_count FROM communication_history WHERE couple_id = couple_id_ab;
  RETURN NEXT (
    'Complex Couple Isolation',
    'User C accessing couple AB communication',
    '0', 
    record_count::text,
    record_count = 0,
    'Users should not access other couples communication'
  );
  
  -- Clean up complex test data
  DELETE FROM communication_history WHERE couple_id IN (couple_id_ab, couple_id_cd);
  DELETE FROM couples WHERE id IN (couple_id_ab, couple_id_cd);
  DELETE FROM users WHERE auth_id IN (auth_id_a, auth_id_b, auth_id_c, auth_id_d);
  DELETE FROM auth.users WHERE id IN (auth_id_a, auth_id_b, auth_id_c, auth_id_d);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TEST EXECUTION AND REPORTING
-- ============================================================================

-- Function to run all RLS tests and generate report
CREATE OR REPLACE FUNCTION run_comprehensive_rls_tests()
RETURNS TABLE(
  test_suite TEXT,
  total_tests INTEGER,
  passed_tests INTEGER,
  failed_tests INTEGER,
  success_rate DECIMAL(5,2),
  summary TEXT
) AS $$
DECLARE
  basic_tests_total INTEGER;
  basic_tests_passed INTEGER;
  performance_tests_total INTEGER;
  performance_tests_good INTEGER;
  complex_tests_total INTEGER;
  complex_tests_passed INTEGER;
BEGIN
  -- Run basic RLS policy tests
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE passed = true)
  INTO basic_tests_total, basic_tests_passed
  FROM test_rls_policy_isolation();
  
  -- Run performance tests
  SELECT COUNT(*) INTO performance_tests_total FROM test_rls_performance();
  SELECT COUNT(*) INTO performance_tests_good FROM test_rls_performance()
  WHERE performance_rating IN ('Excellent', 'Good');
  
  -- Run complex isolation tests  
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE passed = true)
  INTO complex_tests_total, complex_tests_passed
  FROM test_complex_couple_isolation();
  
  -- Return test suite results
  RETURN NEXT (
    'Basic RLS Policy Tests',
    basic_tests_total,
    basic_tests_passed,
    basic_tests_total - basic_tests_passed,
    ROUND((basic_tests_passed::DECIMAL / basic_tests_total) * 100, 2),
    CASE WHEN basic_tests_passed = basic_tests_total 
         THEN 'All basic RLS policies working correctly'
         ELSE format('%s tests failed - critical security issue', 
                     basic_tests_total - basic_tests_passed) END
  );
  
  RETURN NEXT (
    'Performance Tests',
    performance_tests_total,
    performance_tests_good,
    performance_tests_total - performance_tests_good,
    ROUND((performance_tests_good::DECIMAL / performance_tests_total) * 100, 2),
    CASE WHEN performance_tests_good = performance_tests_total
         THEN 'RLS performance acceptable for production'
         ELSE 'Some performance concerns detected' END
  );
  
  RETURN NEXT (
    'Complex Isolation Tests',
    complex_tests_total,
    complex_tests_passed,
    complex_tests_total - complex_tests_passed,
    ROUND((complex_tests_passed::DECIMAL / complex_tests_total) * 100, 2),
    CASE WHEN complex_tests_passed = complex_tests_total
         THEN 'Complex relationship scenarios properly isolated'
         ELSE 'Complex isolation issues detected' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUTOMATED TEST RUNNER
-- ============================================================================

-- Function to automatically run tests and log results
CREATE OR REPLACE FUNCTION automated_rls_test_runner()
RETURNS JSONB AS $$
DECLARE
  test_results JSONB := '[]'::jsonb;
  basic_test_result RECORD;
  performance_result RECORD;
  complex_result RECORD;
  summary_result RECORD;
  overall_success BOOLEAN := true;
BEGIN
  -- Collect all basic test results
  FOR basic_test_result IN 
    SELECT * FROM test_rls_policy_isolation()
  LOOP
    test_results := test_results || jsonb_build_object(
      'test_type', 'basic_rls',
      'test_name', basic_test_result.test_name,
      'table_name', basic_test_result.table_name,
      'policy_name', basic_test_result.policy_name,
      'passed', basic_test_result.passed,
      'details', basic_test_result.details,
      'expected', basic_test_result.expected_result,
      'actual', basic_test_result.test_result
    );
    
    IF NOT basic_test_result.passed THEN
      overall_success := false;
    END IF;
  END LOOP;
  
  -- Collect performance test results
  FOR performance_result IN
    SELECT * FROM test_rls_performance()
  LOOP
    test_results := test_results || jsonb_build_object(
      'test_type', 'performance',
      'test_name', performance_result.test_name,
      'table_name', performance_result.table_name,
      'execution_time_ms', performance_result.execution_time_ms,
      'performance_rating', performance_result.performance_rating,
      'passed', performance_result.performance_rating IN ('Excellent', 'Good')
    );
  END LOOP;
  
  -- Collect complex isolation test results
  FOR complex_result IN
    SELECT * FROM test_complex_couple_isolation()
  LOOP
    test_results := test_results || jsonb_build_object(
      'test_type', 'complex_isolation',
      'test_name', complex_result.test_name,
      'scenario', complex_result.scenario,
      'passed', complex_result.passed,
      'details', complex_result.details,
      'expected', complex_result.expected_access,
      'actual', complex_result.actual_access
    );
    
    IF NOT complex_result.passed THEN
      overall_success := false;
    END IF;
  END LOOP;
  
  -- Generate comprehensive summary
  RETURN jsonb_build_object(
    'test_execution_timestamp', NOW(),
    'overall_success', overall_success,
    'total_tests', jsonb_array_length(test_results),
    'passed_tests', (
      SELECT COUNT(*) FROM jsonb_array_elements(test_results) 
      WHERE (value->>'passed')::boolean = true
    ),
    'security_status', CASE WHEN overall_success 
                            THEN 'SECURE - All RLS policies functioning correctly'
                            ELSE 'SECURITY BREACH - RLS policy failures detected' END,
    'detailed_results', test_results,
    'recommendations', CASE WHEN NOT overall_success
                           THEN jsonb_build_array(
                             'Immediately investigate failed RLS policies',
                             'Do not deploy to production until all tests pass',
                             'Review and fix security policy configurations',
                             'Conduct additional security audit'
                           )
                           ELSE jsonb_build_array(
                             'RLS policies are functioning correctly',
                             'Safe for production deployment',
                             'Continue regular security monitoring'
                           ) END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS FOR TEST FUNCTIONS
-- ============================================================================

-- Grant test execution permissions to service role
GRANT EXECUTE ON FUNCTION test_rls_policy_isolation() TO service_role;
GRANT EXECUTE ON FUNCTION test_rls_performance() TO service_role;
GRANT EXECUTE ON FUNCTION test_complex_couple_isolation() TO service_role;
GRANT EXECUTE ON FUNCTION run_comprehensive_rls_tests() TO service_role;
GRANT EXECUTE ON FUNCTION automated_rls_test_runner() TO service_role;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION test_rls_policy_isolation IS 'Comprehensive test of basic RLS policy functionality and data isolation';
COMMENT ON FUNCTION test_rls_performance IS 'Performance testing of RLS policies to ensure scalability';
COMMENT ON FUNCTION test_complex_couple_isolation IS 'Advanced testing of couple data isolation in complex relationship scenarios';
COMMENT ON FUNCTION run_comprehensive_rls_tests IS 'Execute all RLS tests and generate summary report';
COMMENT ON FUNCTION automated_rls_test_runner IS 'Automated test execution with detailed JSON results for CI/CD integration';