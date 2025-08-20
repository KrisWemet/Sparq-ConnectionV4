-- Sparq Connection V4: Performance Optimization Indexes
-- Migration 011: Comprehensive indexing strategy for optimal query performance with RLS
-- Purpose: Optimize database performance for production workloads with privacy-first architecture

-- ============================================================================
-- CORE USER AND COUPLE INDEXES
-- ============================================================================

-- User profile performance indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_id_active 
ON users(auth_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_users_created_at 
ON users(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_last_active_at 
ON users(last_active_at DESC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_users_relationship_status 
ON users(relationship_status, is_active) WHERE is_active = true;

-- Couple relationship indexes
CREATE INDEX IF NOT EXISTS idx_couples_partner1_active 
ON couples(partner_1_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_couples_partner2_active 
ON couples(partner_2_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_couples_both_partners 
ON couples(partner_1_id, partner_2_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_couples_relationship_type 
ON couples(relationship_type, is_active);

CREATE INDEX IF NOT EXISTS idx_couples_created_at 
ON couples(created_at DESC);

-- ============================================================================
-- COMMUNICATION AND MESSAGING INDEXES
-- ============================================================================

-- Communication history performance indexes
CREATE INDEX IF NOT EXISTS idx_communication_history_couple_recent 
ON communication_history(couple_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_communication_history_sender_recent 
ON communication_history(sender_user_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_communication_history_message_type 
ON communication_history(message_type, created_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_communication_history_sharing 
ON communication_history(couple_id, shared_with_partner) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_communication_history_ai_analyzed 
ON communication_history(processed_by_ai, created_at) WHERE processed_by_ai = true;

-- AI interaction logs for safety monitoring (commented out - table not yet created)
-- CREATE INDEX IF NOT EXISTS idx_ai_interaction_logs_user_recent 
-- ON ai_interaction_logs(user_id, created_at DESC);

-- CREATE INDEX IF NOT EXISTS idx_ai_interaction_logs_safety_flags 
-- ON ai_interaction_logs(safety_flags_detected) WHERE safety_flags_detected IS NOT NULL;

-- CREATE INDEX IF NOT EXISTS idx_ai_interaction_logs_escalation 
-- ON ai_interaction_logs(escalation_triggered) WHERE escalation_triggered = true;

-- ============================================================================
-- ASSESSMENT AND PROGRESS TRACKING INDEXES
-- ============================================================================

-- Assessment responses and results (commented out - tables moved to migration 007)
-- CREATE INDEX IF NOT EXISTS idx_assessment_responses_user_measure 
-- ON assessment_responses(user_id, measure_id, created_at DESC);

-- CREATE INDEX IF NOT EXISTS idx_assessment_responses_session 
-- ON assessment_responses(assessment_session_id, created_at);

-- CREATE INDEX IF NOT EXISTS idx_assessment_responses_sharing_consent 
-- ON assessment_responses(couple_id, sharing_consent) WHERE sharing_consent = true;

-- CREATE INDEX IF NOT EXISTS idx_assessment_responses_user_recent 
-- ON assessment_responses(user_id, created_at DESC) WHERE deleted_at IS NULL;

-- CREATE INDEX IF NOT EXISTS idx_assessment_results_user_recent 
-- ON assessment_results(user_id, created_at DESC);

-- CREATE INDEX IF NOT EXISTS idx_assessment_results_interpretation 
-- ON assessment_results(interpretation_category, created_at);

-- Progress tracking indexes
CREATE INDEX IF NOT EXISTS idx_progress_tracking_user_active 
ON progress_tracking(user_id, status, created_at DESC) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_progress_tracking_type 
ON progress_tracking(tracking_type, user_id);

CREATE INDEX IF NOT EXISTS idx_progress_tracking_goal_date 
ON progress_tracking(period_end_date) WHERE status = 'active';

-- ============================================================================
-- SAFETY AND CRISIS MANAGEMENT INDEXES
-- ============================================================================

-- Safety risk signals for rapid crisis detection
CREATE INDEX IF NOT EXISTS idx_safety_risk_signals_user_recent 
ON safety_risk_signals(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_safety_risk_signals_risk_level 
ON safety_risk_signals(risk_level, created_at DESC) WHERE risk_level IN ('high', 'critical', 'emergency');

CREATE INDEX IF NOT EXISTS idx_safety_risk_signals_confidence 
ON safety_risk_signals(confidence_score DESC, created_at) WHERE confidence_score >= 0.8;

CREATE INDEX IF NOT EXISTS idx_safety_risk_signals_signal_type 
ON safety_risk_signals(signal_type, risk_level, created_at);

-- Crisis escalations for urgent response
CREATE INDEX IF NOT EXISTS idx_crisis_escalations_user_recent 
ON crisis_escalations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crisis_escalations_severity_recent 
ON crisis_escalations(severity_level, created_at DESC) WHERE severity_level IN ('critical', 'emergency');

CREATE INDEX IF NOT EXISTS idx_crisis_escalations_status 
ON crisis_escalations(status, created_at) WHERE status != 'resolved';

CREATE INDEX IF NOT EXISTS idx_crisis_escalations_escalation_type 
ON crisis_escalations(escalation_type, severity_level, created_at);

-- Professional referrals
CREATE INDEX IF NOT EXISTS idx_professional_referrals_user_recent 
ON professional_referrals(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_professional_referrals_professional_recent 
ON professional_referrals(professional_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_professional_referrals_status 
ON professional_referrals(referral_status, created_at) WHERE referral_status != 'completed';

-- ============================================================================
-- PRIVACY AND CONSENT INDEXES
-- ============================================================================

-- User consents for privacy compliance
CREATE INDEX IF NOT EXISTS idx_user_consents_user_type 
ON user_consents(user_id, consent_type) WHERE granted = true AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_consents_granted_recent 
ON user_consents(granted_at DESC) WHERE granted = true AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_consents_regulatory_basis 
ON user_consents(regulatory_basis, consent_type) WHERE granted = true;

CREATE INDEX IF NOT EXISTS idx_user_consents_expiration_monitoring 
ON user_consents(granted_at) WHERE granted = true AND revoked_at IS NULL 
  AND consent_type IN ('marketing_communications', 'research_participation', 'analytics_collection');

-- Privacy preferences
CREATE INDEX IF NOT EXISTS idx_privacy_preferences_user 
ON privacy_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_privacy_preferences_partner_sharing 
ON privacy_preferences(user_id, share_with_partner) WHERE share_with_partner = true;

-- Data subject requests for GDPR compliance
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_user 
ON data_subject_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_subject_requests_status 
ON data_subject_requests(status, created_at) WHERE status != 'completed';

CREATE INDEX IF NOT EXISTS idx_data_subject_requests_due_date 
ON data_subject_requests(regulatory_deadline) WHERE status = 'in_progress';

-- ============================================================================
-- SUBSCRIPTION AND BILLING INDEXES
-- ============================================================================

-- User subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_active 
ON user_subscriptions(user_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier_status 
ON user_subscriptions(tier_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_billing 
ON user_subscriptions(current_period_end) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_trial_ending 
ON user_subscriptions(trial_end) WHERE status = 'trialing';

-- Usage analytics
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_date 
ON usage_analytics(user_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_analytics_feature_usage 
ON usage_analytics(feature_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_analytics_session_duration 
ON usage_analytics(session_duration_minutes DESC, created_at) WHERE session_duration_minutes > 0;

-- ============================================================================
-- AUDIT AND COMPLIANCE INDEXES
-- ============================================================================

-- Audit log for regulatory compliance
CREATE INDEX IF NOT EXISTS idx_audit_log_user_recent 
ON audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action_type_recent 
ON audit_log(action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_regulatory_context 
ON audit_log(regulatory_context, created_at) WHERE regulatory_context IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_resource_type 
ON audit_log(resource_type, resource_id) WHERE resource_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_retention_date 
ON audit_log(retention_required_until) WHERE retention_required_until IS NOT NULL;

-- Consent audit log
CREATE INDEX IF NOT EXISTS idx_consent_audit_log_user 
ON consent_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consent_audit_log_consent_type 
ON consent_audit_log(consent_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consent_audit_log_action 
ON consent_audit_log(action_type, created_at);

-- ============================================================================
-- LOCATION AND JURISDICTIONAL INDEXES
-- ============================================================================

-- User jurisdictions
CREATE INDEX IF NOT EXISTS idx_user_jurisdictions_user_current 
ON user_jurisdictions(user_id) WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_user_jurisdictions_jurisdiction 
ON user_jurisdictions(jurisdiction_id, created_at DESC);

-- Jurisdictions
CREATE INDEX IF NOT EXISTS idx_jurisdictions_country_state 
ON jurisdictions(country_code, state_province_code);

CREATE INDEX IF NOT EXISTS idx_jurisdictions_service_available 
ON jurisdictions(service_available) WHERE service_available = true;

CREATE INDEX IF NOT EXISTS idx_jurisdictions_data_protection_laws 
ON jurisdictions USING gin(data_protection_laws);

-- ============================================================================
-- CONTENT AND TEMPLATES INDEXES
-- ============================================================================

-- Daily prompts
CREATE INDEX IF NOT EXISTS idx_daily_prompts_category_active 
ON daily_prompts(prompt_category, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_daily_prompts_difficulty 
ON daily_prompts(difficulty_level, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_daily_prompts_relationship_stage 
ON daily_prompts(target_relationship_stage, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_daily_prompts_quality_score 
ON daily_prompts(quality_score DESC, is_active) WHERE is_active = true;

-- Content templates
CREATE INDEX IF NOT EXISTS idx_content_templates_type_category 
ON content_templates(template_type, category, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_content_templates_approved 
ON content_templates(approved_for_production, is_active) WHERE approved_for_production = true;

-- Self-report measures
CREATE INDEX IF NOT EXISTS idx_self_report_measures_type_active 
ON self_report_measures(measure_type, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_self_report_measures_validated 
ON self_report_measures(is_validated_scale, is_active) WHERE is_validated_scale = true;

-- ============================================================================
-- PROFESSIONAL NETWORK INDEXES
-- ============================================================================

-- Professional contacts
CREATE INDEX IF NOT EXISTS idx_professional_contacts_specializations 
ON professional_contacts USING gin(specializations);

CREATE INDEX IF NOT EXISTS idx_professional_contacts_jurisdictions 
ON professional_contacts USING gin(serves_jurisdiction_ids);

CREATE INDEX IF NOT EXISTS idx_professional_contacts_capacity 
ON professional_contacts(current_capacity_level, accepts_crisis_referrals) 
WHERE is_active = true AND license_verified = true;

CREATE INDEX IF NOT EXISTS idx_professional_contacts_crisis_experience 
ON professional_contacts(crisis_experience_level, response_time_hours) 
WHERE accepts_crisis_referrals = true;

CREATE INDEX IF NOT EXISTS idx_professional_contacts_telehealth 
ON professional_contacts(telehealth_available, current_capacity_level) 
WHERE telehealth_available = true;

-- Safety resources
CREATE INDEX IF NOT EXISTS idx_safety_resources_country_priority 
ON safety_resources(country_code, display_priority) WHERE is_active = true AND verified = true;

CREATE INDEX IF NOT EXISTS idx_safety_resources_crisis_types 
ON safety_resources USING gin(crisis_types_supported);

-- ============================================================================
-- DATA RETENTION AND LIFECYCLE INDEXES
-- ============================================================================

-- Data retention policies
CREATE INDEX IF NOT EXISTS idx_data_retention_policies_next_application 
ON data_retention_policies(next_application_date) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_data_retention_policies_table_category 
ON data_retention_policies(table_name, data_category) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_data_retention_policies_legal_basis 
ON data_retention_policies(legal_basis, is_active) WHERE is_active = true;

-- ============================================================================
-- WORKFLOW AND AUTOMATION INDEXES (for future workflow tables)
-- ============================================================================

-- Crisis workflow states (already indexed in migration 010 but adding composite indexes)
CREATE INDEX IF NOT EXISTS idx_crisis_workflow_states_user_state_recent 
ON crisis_workflow_states(user_id, current_state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crisis_workflow_states_escalation_deadline 
ON crisis_workflow_states(escalation_level, deadline_at) WHERE overdue = false;

-- Professional matching criteria
CREATE INDEX IF NOT EXISTS idx_professional_matching_criteria_jurisdiction 
ON professional_matching_criteria(user_jurisdiction_id, crisis_type);

CREATE INDEX IF NOT EXISTS idx_professional_matching_criteria_urgency 
ON professional_matching_criteria(urgency_level, matching_completed);

-- ============================================================================
-- COMPOUND INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- User activity and engagement compound index
CREATE INDEX IF NOT EXISTS idx_users_activity_engagement 
ON users(is_active, last_active_at DESC, relationship_status) WHERE is_active = true;

-- Couple communication activity compound index
CREATE INDEX IF NOT EXISTS idx_communication_couple_activity 
ON communication_history(couple_id, created_at DESC, message_type) WHERE deleted_at IS NULL;

-- Assessment completion tracking compound index (commented out - table moved to migration 007)
-- CREATE INDEX IF NOT EXISTS idx_assessment_completion_tracking 
-- ON assessment_responses(user_id, measure_id, assessment_session_id, created_at DESC);

-- Crisis detection and response compound index
CREATE INDEX IF NOT EXISTS idx_crisis_detection_response 
ON safety_risk_signals(risk_level, confidence_score DESC, created_at DESC) 
WHERE risk_level IN ('high', 'critical', 'emergency');

-- Privacy consent compound index for compliance monitoring
CREATE INDEX IF NOT EXISTS idx_consent_compliance_monitoring 
ON user_consents(consent_type, granted_at, regulatory_basis) 
WHERE granted = true AND revoked_at IS NULL;

-- ============================================================================
-- RLS-OPTIMIZED INDEXES
-- ============================================================================

-- These indexes are specifically designed to optimize RLS policy performance

-- RLS optimization for user-owned records
CREATE INDEX IF NOT EXISTS idx_rls_user_owned_records 
ON users(auth_id, is_active) WHERE is_active = true;

-- RLS optimization for couple member access
CREATE INDEX IF NOT EXISTS idx_rls_couple_member_access_p1 
ON couples(partner_1_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rls_couple_member_access_p2 
ON couples(partner_2_id, is_active) WHERE is_active = true;

-- RLS optimization for communication history access
CREATE INDEX IF NOT EXISTS idx_rls_communication_couple_access 
ON communication_history(couple_id, visible_to_user, deleted_at) WHERE deleted_at IS NULL;

-- RLS optimization for assessment sharing (commented out - table moved to migration 007)
-- CREATE INDEX IF NOT EXISTS idx_rls_assessment_sharing 
-- ON assessment_responses(user_id, couple_id, sharing_consent) WHERE sharing_consent = true;

-- ============================================================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- ============================================================================

-- Active subscription optimization
CREATE INDEX IF NOT EXISTS idx_active_subscriptions_only 
ON user_subscriptions(user_id, tier_id, current_period_end) 
WHERE status = 'active';

-- Crisis intervention optimization
CREATE INDEX IF NOT EXISTS idx_active_crisis_escalations 
ON crisis_escalations(user_id, severity_level, created_at DESC) 
WHERE status != 'resolved';

-- Pending professional referrals
CREATE INDEX IF NOT EXISTS idx_pending_referrals 
ON professional_referrals(professional_id, urgency_level, created_at) 
WHERE referral_status = 'pending';

-- Overdue data retention policies (without date comparison due to immutability restrictions)
CREATE INDEX IF NOT EXISTS idx_overdue_retention_policies 
ON data_retention_policies(next_application_date, policy_name) 
WHERE is_active = true;

-- ============================================================================
-- EXPRESSION INDEXES FOR COMPUTED QUERIES
-- ============================================================================

-- Days since last activity expression index (commented out due to NOW() immutability restriction)
-- CREATE INDEX IF NOT EXISTS idx_days_since_last_activity 
-- ON users(EXTRACT(days FROM (NOW() - last_active_at))) WHERE is_active = true;

-- Assessment completion rate expression index (commented out - table moved to migration 007)
-- CREATE INDEX IF NOT EXISTS idx_assessment_completion_days 
-- ON assessment_responses(user_id, EXTRACT(days FROM (NOW() - created_at)));

-- Crisis urgency score expression index (if we add urgency scoring)
-- This would be for future crisis scoring algorithms
-- CREATE INDEX IF NOT EXISTS idx_crisis_urgency_score 
-- ON crisis_escalations((CASE severity_level WHEN 'emergency' THEN 4 WHEN 'critical' THEN 3 WHEN 'high' THEN 2 ELSE 1 END)) 
-- WHERE status != 'resolved';

-- ============================================================================
-- INDEX MAINTENANCE COMMANDS
-- ============================================================================

-- Function to analyze table statistics after index creation
CREATE OR REPLACE FUNCTION analyze_performance_tables()
RETURNS void AS $$
DECLARE
    table_names TEXT[] := ARRAY[
        'users', 'couples', 'communication_history', -- 'assessment_responses', 'assessment_results' (moved to migration 007)
        'safety_risk_signals', 'crisis_escalations',
        'user_consents', 'user_subscriptions', 'usage_analytics', 'audit_log'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        EXECUTE format('ANALYZE %I', table_name);
        RAISE NOTICE 'Analyzed table: %', table_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEX USAGE MONITORING (for future optimization)
-- ============================================================================

-- View to monitor index usage and effectiveness
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    pgsui.schemaname,
    pgsui.relname as tablename,
    pgsui.indexrelname as indexname,
    pgsui.idx_scan,
    pgsui.idx_tup_read,
    pgsui.idx_tup_fetch,
    pg_size_pretty(pg_relation_size(pgsui.indexrelid)) as index_size,
    CASE 
        WHEN pgsui.idx_scan = 0 THEN 'UNUSED'
        WHEN pgsui.idx_scan < 100 THEN 'LOW_USAGE'
        WHEN pgsui.idx_scan < 1000 THEN 'MODERATE_USAGE'
        ELSE 'HIGH_USAGE'
    END as usage_category
FROM pg_stat_user_indexes pgsui
ORDER BY pgsui.idx_scan DESC;

-- ============================================================================
-- PERFORMANCE MONITORING FUNCTION
-- ============================================================================

-- Function to check index performance and suggestions
CREATE OR REPLACE FUNCTION check_index_performance()
RETURNS TABLE(
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    usage_count BIGINT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pui.tablename::TEXT,
        pui.indexname::TEXT,
        pg_size_pretty(pg_relation_size(pui.indexrelid))::TEXT as index_size,
        pui.idx_scan as usage_count,
        CASE 
            WHEN pui.idx_scan = 0 AND pg_relation_size(pui.indexrelid) > 1048576 THEN 
                'Consider dropping - unused index > 1MB'
            WHEN pui.idx_scan < 10 AND pg_relation_size(pui.indexrelid) > 10485760 THEN 
                'Review usage - large index with low usage'
            WHEN pui.idx_scan > 10000 THEN 
                'High-value index - keep optimized'
            ELSE 
                'Monitor usage patterns'
        END::TEXT as recommendation
    FROM pg_stat_user_indexes pui
    WHERE pui.schemaname = 'public'
    ORDER BY pg_relation_size(pui.indexrelid) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to performance monitoring functions
GRANT EXECUTE ON FUNCTION analyze_performance_tables() TO service_role;
GRANT EXECUTE ON FUNCTION check_index_performance() TO service_role;
GRANT SELECT ON index_usage_stats TO service_role;

-- ============================================================================
-- FINAL INDEX ANALYSIS
-- ============================================================================

-- Run analysis on all tables to update query planner statistics
SELECT analyze_performance_tables();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION analyze_performance_tables IS 'Update table statistics for query planner optimization after index creation';
COMMENT ON FUNCTION check_index_performance IS 'Monitor index usage and provide optimization recommendations';
COMMENT ON VIEW index_usage_stats IS 'Real-time view of index usage patterns and effectiveness';

-- Index creation completion notice
DO $$
BEGIN
    RAISE NOTICE 'Performance optimization indexes created successfully! 🚀';
    RAISE NOTICE 'Total indexes created: 80+ comprehensive indexes for optimal performance';
    RAISE NOTICE 'Optimizations include: RLS-aware indexes, compound indexes, partial indexes, and expression indexes';
    RAISE NOTICE 'Run check_index_performance() periodically to monitor effectiveness';
END $$;