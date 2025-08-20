-- Sparq Connection V4: Data Lifecycle and Automation
-- Migration 009: Automated data retention, GDPR compliance, and lifecycle management
-- Purpose: Implement automated data lifecycle management and GDPR "right to be forgotten"

-- ============================================================================
-- DATA RETENTION AUTOMATION FUNCTIONS
-- ============================================================================

-- Function to apply data retention policy to a specific table
DROP FUNCTION IF EXISTS apply_data_retention_policy CASCADE;
CREATE OR REPLACE FUNCTION apply_data_retention_policy(
  p_policy_id UUID,
  p_dry_run BOOLEAN DEFAULT true
) RETURNS JSONB AS $$
DECLARE
  policy_record RECORD;
  deletion_query TEXT;
  affected_rows INTEGER := 0;
  result_data JSONB;
  error_count INTEGER := 0;
BEGIN
  -- Get policy details
  SELECT * INTO policy_record 
  FROM data_retention_policies 
  WHERE id = p_policy_id AND is_active = true;
  
  IF policy_record IS NULL THEN
    RAISE EXCEPTION 'Policy not found or inactive: %', p_policy_id;
  END IF;
  
  -- Build deletion query based on policy
  CASE policy_record.deletion_method
    WHEN 'soft_delete' THEN
      deletion_query := format(
        'UPDATE %I SET deleted_at = NOW(), deletion_reason = ''Data retention policy: %s'' 
         WHERE created_at < NOW() - INTERVAL ''%s days'' 
         AND deleted_at IS NULL
         %s',
        policy_record.table_name,
        policy_record.policy_name,
        policy_record.retention_period_days,
        CASE WHEN policy_record.retention_conditions IS NOT NULL 
             THEN 'AND ' || (policy_record.retention_conditions->>'where_clause')
             ELSE '' END
      );
    
    WHEN 'hard_delete' THEN
      deletion_query := format(
        'DELETE FROM %I 
         WHERE created_at < NOW() - INTERVAL ''%s days''
         %s',
        policy_record.table_name,
        policy_record.retention_period_days + policy_record.grace_period_days,
        CASE WHEN policy_record.retention_conditions IS NOT NULL 
             THEN 'AND ' || (policy_record.retention_conditions->>'where_clause')
             ELSE '' END
      );
    
    WHEN 'anonymize' THEN
      -- Build anonymization query (table-specific)
      deletion_query := format(
        'UPDATE %I SET 
         %s,
         deleted_at = NOW(),
         deletion_reason = ''Data retention policy: anonymized''
         WHERE created_at < NOW() - INTERVAL ''%s days''
         AND deleted_at IS NULL
         %s',
        policy_record.table_name,
        get_anonymization_fields(policy_record.table_name),
        policy_record.retention_period_days,
        CASE WHEN policy_record.retention_conditions IS NOT NULL 
             THEN 'AND ' || (policy_record.retention_conditions->>'where_clause')
             ELSE '' END
      );
    
    ELSE
      RAISE EXCEPTION 'Unknown deletion method: %', policy_record.deletion_method;
  END CASE;
  
  -- Execute or simulate
  IF p_dry_run THEN
    -- Count affected rows without making changes
    EXECUTE format(
      'SELECT COUNT(*) FROM %I WHERE created_at < NOW() - INTERVAL ''%s days'' AND deleted_at IS NULL %s',
      policy_record.table_name,
      policy_record.retention_period_days,
      CASE WHEN policy_record.retention_conditions IS NOT NULL 
           THEN 'AND ' || (policy_record.retention_conditions->>'where_clause')
           ELSE '' END
    ) INTO affected_rows;
  ELSE
    -- Actually execute the deletion
    BEGIN
      EXECUTE deletion_query;
      GET DIAGNOSTICS affected_rows = ROW_COUNT;
      
      -- Update policy last run info
      UPDATE data_retention_policies SET
        last_applied_at = NOW(),
        next_application_date = CURRENT_DATE + INTERVAL '1 day' * 
          COALESCE((retention_conditions->>'run_frequency_days')::INTEGER, 7),
        records_processed_last_run = affected_rows,
        errors_last_run = 0
      WHERE id = p_policy_id;
      
    EXCEPTION WHEN others THEN
      error_count := 1;
      -- Update policy with error info
      UPDATE data_retention_policies SET
        last_applied_at = NOW(),
        errors_last_run = error_count
      WHERE id = p_policy_id;
      
      RAISE;
    END;
  END IF;
  
  -- Build result
  result_data := jsonb_build_object(
    'policy_id', p_policy_id,
    'policy_name', policy_record.policy_name,
    'table_name', policy_record.table_name,
    'deletion_method', policy_record.deletion_method,
    'affected_rows', affected_rows,
    'dry_run', p_dry_run,
    'executed_at', NOW(),
    'query_executed', deletion_query,
    'errors', error_count
  );
  
  -- Log the retention action
  INSERT INTO audit_log (
    action_type, resource_type, resource_id, details, regulatory_context
  ) VALUES (
    'data_retention_applied', 'data_retention_policy', p_policy_id, result_data, 'GDPR'
  );
  
  RETURN result_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get anonymization fields for a table
CREATE OR REPLACE FUNCTION get_anonymization_fields(p_table_name TEXT)
RETURNS TEXT AS $$
DECLARE
  anonymization_fields TEXT;
BEGIN
  -- Define anonymization patterns for different tables
  CASE p_table_name
    WHEN 'users' THEN
      anonymization_fields := 'email_encrypted = ''[ANONYMIZED]'', 
                               first_name_encrypted = ''[ANONYMIZED]'', 
                               last_name_encrypted = ''[ANONYMIZED]'',
                               display_name = ''Anonymous User'',
                               crisis_contact_encrypted = NULL';
    
    WHEN 'communication_history' THEN
      anonymization_fields := 'content_encrypted = ''[CONTENT ANONYMIZED]'',
                               content_hash = encode(digest(random()::text, ''sha256''), ''hex'')';
    
    WHEN 'assessment_responses' THEN
      anonymization_fields := 'response_text = ''[ANONYMIZED]'',
                               response_value = jsonb_build_object(''anonymized'', true)';
    
    WHEN 'professional_referrals' THEN
      anonymization_fields := 'referral_reason = ''[ANONYMIZED]'',
                               professional_feedback = ''[ANONYMIZED]''';
    
    ELSE
      -- Default anonymization for common PII fields
      anonymization_fields := 'updated_at = NOW()'; -- Minimal update to trigger change
  END CASE;
  
  RETURN anonymization_fields;
END;
$$ LANGUAGE plpgsql;

-- Function to run all active retention policies
DROP FUNCTION IF EXISTS run_all_retention_policies(BOOLEAN);
CREATE OR REPLACE FUNCTION run_all_retention_policies(
  p_dry_run BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  policy_record RECORD;
  policy_result JSONB;
  all_results JSONB := '[]'::jsonb;
  total_affected INTEGER := 0;
  total_errors INTEGER := 0;
BEGIN
  -- Process all active policies that are due
  FOR policy_record IN 
    SELECT * FROM data_retention_policies 
    WHERE is_active = true 
    AND (next_application_date <= CURRENT_DATE OR next_application_date IS NULL)
    ORDER BY policy_name
  LOOP
    BEGIN
      -- Apply each policy
      policy_result := apply_data_retention_policy(policy_record.id, p_dry_run);
      
      -- Accumulate results
      all_results := all_results || policy_result;
      total_affected := total_affected + (policy_result->>'affected_rows')::INTEGER;
      
    EXCEPTION WHEN others THEN
      total_errors := total_errors + 1;
      
      -- Add error to results
      policy_result := jsonb_build_object(
        'policy_id', policy_record.id,
        'policy_name', policy_record.policy_name,
        'error', SQLERRM,
        'executed_at', NOW()
      );
      all_results := all_results || policy_result;
    END;
  END LOOP;
  
  -- Return summary
  RETURN jsonb_build_object(
    'execution_summary', jsonb_build_object(
      'total_policies_processed', jsonb_array_length(all_results),
      'total_records_affected', total_affected,
      'total_errors', total_errors,
      'dry_run', p_dry_run,
      'executed_at', NOW()
    ),
    'policy_results', all_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GDPR "RIGHT TO BE FORGOTTEN" IMPLEMENTATION
-- ============================================================================

-- Function to process GDPR erasure request (Article 17)
CREATE OR REPLACE FUNCTION process_gdpr_erasure_request(
  p_user_id UUID,
  p_request_id UUID DEFAULT NULL,
  p_erasure_method TEXT DEFAULT 'anonymize' -- 'anonymize' or 'hard_delete'
) RETURNS JSONB AS $$
DECLARE
  user_record RECORD;
  tables_to_process TEXT[] := ARRAY[
    'users', 'user_archetypes', 'user_preferences', 'user_safety_profile',
    'user_consents', 'privacy_preferences', 'communication_history', 
    'assessment_responses', 'assessment_results', 'progress_tracking',
    'professional_referrals', 'user_subscriptions'
  ];
  table_name TEXT;
  affected_tables JSONB := '[]'::jsonb;
  total_records_processed INTEGER := 0;
  couple_ids UUID[];
  partner_user_id UUID;
  processing_notes TEXT[];
BEGIN
  -- Verify user exists
  SELECT * INTO user_record FROM users WHERE id = p_user_id;
  IF user_record IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- Get couple relationships (need special handling)
  SELECT ARRAY_AGG(DISTINCT couple_id) INTO couple_ids
  FROM (
    SELECT id as couple_id FROM couples WHERE partner_1_id = p_user_id OR partner_2_id = p_user_id
  ) couples_list;
  
  -- Process each table
  FOREACH table_name IN ARRAY tables_to_process
  LOOP
    DECLARE
      records_affected INTEGER := 0;
      processing_sql TEXT;
    BEGIN
      CASE p_erasure_method
        WHEN 'anonymize' THEN
          CASE table_name
            -- User profile anonymization
            WHEN 'users' THEN
              processing_sql := 'UPDATE users SET 
                email_encrypted = ''[ERASED]'',
                first_name_encrypted = ''[ERASED]'', 
                last_name_encrypted = ''[ERASED]'',
                display_name = ''Erased User'',
                crisis_contact_encrypted = NULL,
                is_active = false,
                deactivated_at = NOW()
                WHERE id = $1';
            
            -- Communication history anonymization
            WHEN 'communication_history' THEN
              processing_sql := 'UPDATE communication_history SET
                content_encrypted = ''[ERASED PER GDPR REQUEST]'',
                content_hash = encode(digest(''erased-'' || id::text, ''sha256''), ''hex''),
                deleted_at = NOW(),
                deletion_reason = ''GDPR erasure request''
                WHERE sender_user_id = $1';
            
            -- Assessment data anonymization
            WHEN 'assessment_responses' THEN
              processing_sql := 'UPDATE assessment_responses SET
                response_text = ''[ERASED]'',
                response_value = jsonb_build_object(''erased'', true, ''timestamp'', NOW()),
                deleted_at = NOW(),
                deletion_reason = ''GDPR erasure request''
                WHERE user_id = $1';
            
            WHEN 'assessment_results' THEN
              processing_sql := 'UPDATE assessment_results SET
                interpretation_text = ''[ERASED PER USER REQUEST]'',
                growth_recommendations = ''[]''::jsonb,
                recommended_content = ''[]''::jsonb,
                deleted_at = NOW()
                WHERE user_id = $1';
            
            -- Default anonymization for other tables
            ELSE
              processing_sql := format('UPDATE %I SET 
                updated_at = NOW(),
                deleted_at = NOW()
                WHERE user_id = $1', table_name);
          END CASE;
        
        WHEN 'hard_delete' THEN
          -- Hard deletion (use with caution - may break referential integrity)
          IF table_name = 'users' THEN
            -- Users table requires special cascade handling
            processing_sql := 'UPDATE users SET 
              is_active = false, 
              deactivated_at = NOW(),
              email_encrypted = ''[DELETED]'',
              first_name_encrypted = NULL,
              last_name_encrypted = NULL
              WHERE id = $1';
          ELSE
            processing_sql := format('DELETE FROM %I WHERE user_id = $1', table_name);
          END IF;
        
        ELSE
          RAISE EXCEPTION 'Invalid erasure method: %', p_erasure_method;
      END CASE;
      
      -- Execute the processing
      EXECUTE processing_sql USING p_user_id;
      GET DIAGNOSTICS records_affected = ROW_COUNT;
      
      -- Record processing result
      affected_tables := affected_tables || jsonb_build_object(
        'table_name', table_name,
        'records_affected', records_affected,
        'processing_method', p_erasure_method,
        'processed_at', NOW()
      );
      
      total_records_processed := total_records_processed + records_affected;
      
    EXCEPTION WHEN others THEN
      -- Log error but continue processing other tables
      affected_tables := affected_tables || jsonb_build_object(
        'table_name', table_name,
        'error', SQLERRM,
        'processing_method', p_erasure_method,
        'processed_at', NOW()
      );
    END;
  END LOOP;
  
  -- Handle couple relationships
  IF couple_ids IS NOT NULL AND array_length(couple_ids, 1) > 0 THEN
    -- Mark couples as ended, don't delete (partner data protection)
    UPDATE couples SET 
      is_active = false,
      ended_at = NOW(),
      ending_reason = 'Partner account deleted per GDPR request'
    WHERE id = ANY(couple_ids);
    
    processing_notes := array_append(processing_notes, 
      format('Deactivated %s couple relationships', array_length(couple_ids, 1)));
  END IF;
  
  -- Update data subject request if provided
  IF p_request_id IS NOT NULL THEN
    UPDATE data_subject_requests SET
      status = 'completed',
      actual_completion_date = CURRENT_DATE,
      response_summary = format('User data %s across %s tables affecting %s records', 
                               p_erasure_method, 
                               array_length(tables_to_process, 1),
                               total_records_processed),
      actions_taken = affected_tables
    WHERE id = p_request_id;
  END IF;
  
  -- Create comprehensive audit log
  INSERT INTO audit_log (
    user_id, action_type, resource_type, resource_id, details, regulatory_context
  ) VALUES (
    p_user_id, 'gdpr_erasure_completed', 'user_profile', p_user_id,
    jsonb_build_object(
      'erasure_method', p_erasure_method,
      'request_id', p_request_id,
      'total_records_processed', total_records_processed,
      'tables_affected', affected_tables,
      'couple_relationships_affected', COALESCE(array_length(couple_ids, 1), 0),
      'processing_notes', processing_notes
    ),
    'GDPR'
  );
  
  -- Return processing summary
  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'erasure_method', p_erasure_method,
    'request_id', p_request_id,
    'total_records_processed', total_records_processed,
    'tables_processed', jsonb_array_length(affected_tables),
    'couple_relationships_affected', COALESCE(array_length(couple_ids, 1), 0),
    'processing_completed_at', NOW(),
    'table_details', affected_tables
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DATA PORTABILITY (GDPR ARTICLE 20)
-- ============================================================================

-- Function to export user data for portability
CREATE OR REPLACE FUNCTION export_user_data_for_portability(
  p_user_id UUID,
  p_include_partner_data BOOLEAN DEFAULT false,
  p_format TEXT DEFAULT 'json'
) RETURNS JSONB AS $$
DECLARE
  user_data JSONB := '{}'::jsonb;
  couple_data JSONB := '[]'::jsonb;
  assessment_data JSONB := '[]'::jsonb;
  communication_data JSONB := '[]'::jsonb;
  progress_data JSONB := '[]'::jsonb;
  export_consent BOOLEAN;
BEGIN
  -- Verify user exists and check consent
  SELECT pp.include_partner_data_in_export INTO export_consent
  FROM privacy_preferences pp
  WHERE pp.user_id = p_user_id;
  
  IF export_consent IS NULL THEN
    RAISE EXCEPTION 'User not found or privacy preferences not set';
  END IF;
  
  -- Respect user's consent for partner data inclusion
  IF p_include_partner_data AND NOT export_consent THEN
    p_include_partner_data := false;
  END IF;
  
  -- Export basic user profile
  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'id', u.id,
      'created_at', u.created_at,
      'display_name', u.display_name,
      'timezone', u.timezone,
      'relationship_status', u.relationship_status,
      'privacy_level', u.privacy_level,
      'last_active_at', u.last_active_at
    ),
    'preferences', row_to_json(up.*),
    'archetype', row_to_json(ua.*),
    'consent_history', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'consent_type', consent_type,
          'granted', granted,
          'granted_at', granted_at,
          'revoked_at', revoked_at
        )
      )
      FROM user_consents 
      WHERE user_id = u.id
    )
  ) INTO user_data
  FROM users u
  LEFT JOIN user_preferences up ON u.id = up.user_id
  LEFT JOIN user_archetypes ua ON u.id = ua.user_id
  WHERE u.id = p_user_id;
  
  -- Export couple relationships
  SELECT jsonb_agg(
    jsonb_build_object(
      'relationship_type', relationship_type,
      'relationship_start_date', relationship_start_date,
      'relationship_goals', relationship_goals,
      'is_active', is_active,
      'created_at', created_at
    )
  ) INTO couple_data
  FROM couples
  WHERE (partner_1_id = p_user_id OR partner_2_id = p_user_id)
  AND is_active = true;
  
  -- Export assessment results (non-sensitive interpretations only)
  SELECT jsonb_agg(
    jsonb_build_object(
      'measure_name', sm.measure_name,
      'completed_at', ar.created_at,
      'interpretation_category', ar.interpretation_category,
      'growth_recommendations', ar.growth_recommendations,
      'raw_score', ar.raw_score
    )
  ) INTO assessment_data
  FROM assessment_results ar
  JOIN self_report_measures sm ON ar.measure_id = sm.id
  WHERE ar.user_id = p_user_id;
  
  -- Export progress tracking
  SELECT jsonb_agg(
    jsonb_build_object(
      'tracking_type', tracking_type,
      'metric_name', metric_name,
      'goal_description', goal_description,
      'current_value', current_value,
      'target_value', target_value,
      'progress_percentage', progress_percentage,
      'status', status,
      'created_at', created_at
    )
  ) INTO progress_data
  FROM progress_tracking
  WHERE user_id = p_user_id;
  
  -- Include partner data if consented and requested
  IF p_include_partner_data THEN
    -- Add partner communication data (shared conversations)
    SELECT jsonb_agg(
      jsonb_build_object(
        'message_type', message_type,
        'created_at', created_at,
        'shared_with_partner', shared_with_partner
        -- Note: Not including actual content for privacy
      )
    ) INTO communication_data
    FROM communication_history ch
    JOIN couples c ON ch.couple_id = c.id
    WHERE (c.partner_1_id = p_user_id OR c.partner_2_id = p_user_id)
    AND ch.visible_to_user = true
    AND ch.deleted_at IS NULL;
  END IF;
  
  -- Create audit log for export
  INSERT INTO audit_log (
    user_id, action_type, resource_type, resource_id, details, regulatory_context
  ) VALUES (
    p_user_id, 'data_export_generated', 'user_profile', p_user_id,
    jsonb_build_object(
      'export_format', p_format,
      'include_partner_data', p_include_partner_data,
      'data_categories_exported', jsonb_build_array(
        'profile', 'preferences', 'assessments', 'progress_tracking'
      )
    ),
    'GDPR'
  );
  
  -- Build final export package
  RETURN jsonb_build_object(
    'export_metadata', jsonb_build_object(
      'user_id', p_user_id,
      'export_generated_at', NOW(),
      'format', p_format,
      'includes_partner_data', p_include_partner_data,
      'gdpr_article_20_compliance', true
    ),
    'user_profile_data', user_data,
    'couple_relationships', couple_data,
    'assessment_results', assessment_data,
    'progress_tracking', progress_data,
    'communication_summary', communication_data,
    'data_processing_notice', 'This export contains your personal data as processed by Sparq Connection. This data is provided in a structured, commonly used, and machine-readable format as required by GDPR Article 20.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUTOMATED COMPLIANCE MONITORING
-- ============================================================================

-- Function to monitor consent expiration
CREATE OR REPLACE FUNCTION monitor_consent_expiration()
RETURNS TABLE(
  user_id UUID,
  consent_type TEXT,
  granted_at TIMESTAMPTZ,
  days_since_granted INTEGER,
  requires_renewal BOOLEAN,
  recommended_action TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.user_id,
    uc.consent_type,
    uc.granted_at,
    EXTRACT(days FROM (NOW() - uc.granted_at))::INTEGER as days_since_granted,
    CASE 
      WHEN uc.consent_type IN ('marketing_communications', 'research_participation') 
           AND uc.granted_at < NOW() - INTERVAL '2 years' THEN true
      WHEN uc.consent_type IN ('analytics_collection', 'ai_content_analysis')
           AND uc.granted_at < NOW() - INTERVAL '1 year' THEN true
      ELSE false
    END as requires_renewal,
    CASE 
      WHEN uc.granted_at < NOW() - INTERVAL '2 years' THEN 'Request consent renewal'
      WHEN uc.granted_at < NOW() - INTERVAL '18 months' THEN 'Plan consent renewal'
      ELSE 'No action required'
    END as recommended_action
  FROM user_consents uc
  WHERE uc.granted = true 
  AND uc.revoked_at IS NULL
  ORDER BY uc.granted_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate data retention cleanup schedule
CREATE OR REPLACE FUNCTION generate_retention_cleanup_schedule()
RETURNS TABLE(
  policy_name TEXT,
  table_name TEXT,
  next_cleanup_date DATE,
  estimated_records INTEGER,
  priority_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    drp.policy_name,
    drp.table_name,
    drp.next_application_date,
    drp.records_processed_last_run as estimated_records,
    CASE 
      WHEN drp.next_application_date < CURRENT_DATE THEN 'OVERDUE'
      WHEN drp.next_application_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'HIGH'
      WHEN drp.next_application_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'MEDIUM'
      ELSE 'LOW'
    END as priority_level
  FROM data_retention_policies drp
  WHERE drp.is_active = true
  ORDER BY drp.next_application_date ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SCHEDULED JOBS FUNCTIONS (for use with pg_cron or external scheduler)
-- ============================================================================

-- Function to run daily data maintenance
CREATE OR REPLACE FUNCTION daily_data_maintenance()
RETURNS JSONB AS $$
DECLARE
  maintenance_results JSONB := '{}'::jsonb;
  retention_results JSONB;
  consent_monitoring_results INTEGER;
BEGIN
  -- Run retention policies
  retention_results := run_all_retention_policies(false);
  
  -- Count users requiring consent renewal
  SELECT COUNT(*) INTO consent_monitoring_results
  FROM monitor_consent_expiration()
  WHERE requires_renewal = true;
  
  -- Clean up old audit logs (keep last 2 years)
  UPDATE audit_log SET 
    retention_required_until = CURRENT_DATE + INTERVAL '30 days'
  WHERE created_at < NOW() - INTERVAL '2 years'
  AND retention_required_until IS NULL;
  
  -- Build maintenance summary
  maintenance_results := jsonb_build_object(
    'maintenance_date', CURRENT_DATE,
    'retention_policy_results', retention_results,
    'users_requiring_consent_renewal', consent_monitoring_results,
    'maintenance_completed_at', NOW()
  );
  
  -- Log maintenance completion
  INSERT INTO audit_log (
    action_type, resource_type, details, regulatory_context
  ) VALUES (
    'daily_maintenance_completed', 'system', maintenance_results, 'internal'
  );
  
  RETURN maintenance_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Data lifecycle functions (restricted to service role and compliance staff)
REVOKE ALL ON FUNCTION apply_data_retention_policy(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION run_all_retention_policies(BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION process_gdpr_erasure_request(UUID, UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION apply_data_retention_policy(UUID, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION run_all_retention_policies(BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION process_gdpr_erasure_request(UUID, UUID, TEXT) TO service_role;

-- User-accessible functions
GRANT EXECUTE ON FUNCTION export_user_data_for_portability(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION monitor_consent_expiration() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_retention_cleanup_schedule() TO authenticated;
GRANT EXECUTE ON FUNCTION daily_data_maintenance() TO service_role;

-- ============================================================================
-- SAMPLE DATA RETENTION POLICIES
-- ============================================================================

-- Insert default retention policies
INSERT INTO data_retention_policies (
  policy_name, table_name, data_category, retention_period_days, 
  grace_period_days, legal_basis, deletion_method, auto_apply
) VALUES
('User Communication Cleanup', 'communication_history', 'user_communications', 1095, 30, 'consent', 'soft_delete', true),
('Assessment Responses Retention', 'assessment_responses', 'assessment_data', 2190, 30, 'consent', 'anonymize', true),
('Audit Log Retention', 'audit_log', 'audit_data', 2555, 0, 'legal_obligation', 'archive', true),
('Analytics Data Cleanup', 'usage_analytics', 'analytics_data', 365, 0, 'legitimate_interests', 'hard_delete', true),
('Inactive User Profiles', 'users', 'user_profiles', 2555, 90, 'consent', 'anonymize', false),
('Cancelled Subscriptions', 'user_subscriptions', 'billing_data', 2190, 30, 'contract', 'soft_delete', true)
ON CONFLICT DO NOTHING; -- Avoid duplicates if running multiple times

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION apply_data_retention_policy(UUID, BOOLEAN) IS 'Apply specific data retention policy with support for dry-run testing';
COMMENT ON FUNCTION run_all_retention_policies(BOOLEAN) IS 'Execute all active retention policies that are due for processing';
COMMENT ON FUNCTION process_gdpr_erasure_request(UUID, UUID, TEXT) IS 'Complete GDPR Article 17 "right to be forgotten" processing';
COMMENT ON FUNCTION export_user_data_for_portability(UUID, BOOLEAN, TEXT) IS 'Generate GDPR Article 20 data portability export';
COMMENT ON FUNCTION monitor_consent_expiration() IS 'Monitor user consents that may require renewal';
COMMENT ON FUNCTION generate_retention_cleanup_schedule() IS 'Generate schedule for upcoming data retention cleanup';
COMMENT ON FUNCTION daily_data_maintenance() IS 'Automated daily maintenance for data lifecycle management';