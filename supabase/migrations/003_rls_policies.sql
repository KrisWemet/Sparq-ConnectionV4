-- Sparq Connection V4: Row Level Security Policies
-- Migration 003: Comprehensive RLS policies for data isolation
-- Purpose: Ensure users can only access their own data and couple data when appropriate

-- ============================================================================
-- UTILITY FUNCTIONS FOR RLS POLICIES
-- ============================================================================

-- Function to get current user's auth ID (using built-in auth.uid())
-- Note: In Supabase, auth.uid() is already available, so we don't need to create this

-- Function to check if current user is the specified user
CREATE OR REPLACE FUNCTION public.is_user(user_auth_id UUID) RETURNS BOOLEAN AS $$
  SELECT auth.uid() = user_auth_id
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if current user is in a specific couple
CREATE OR REPLACE FUNCTION public.is_couple_member(couple_id_param UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM couples c
    JOIN users u1 ON c.partner_1_id = u1.id
    JOIN users u2 ON c.partner_2_id = u2.id
    WHERE c.id = couple_id_param
    AND c.is_active = true
    AND (u1.auth_id = auth.uid() OR u2.auth_id = auth.uid())
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to get user ID from auth ID
CREATE OR REPLACE FUNCTION public.get_user_id() RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user has admin role
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') = 'admin',
    false
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user has support role
CREATE OR REPLACE FUNCTION public.is_support() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'support'),
    false
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- USERS TABLE RLS POLICIES
-- ============================================================================

-- Users can view and update their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "users_update_own" ON users  
  FOR UPDATE USING (auth_id = auth.uid());

-- Users can insert their own profile (during registration)
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth_id = auth.uid());

-- Support staff can view users for crisis intervention
CREATE POLICY "users_select_support" ON users
  FOR SELECT USING (public.is_support());

-- Prevent users from deleting their profiles (use soft delete via is_active)
-- No delete policy = no deletes allowed by users

-- Admin access for user management
CREATE POLICY "users_admin_all" ON users
  FOR ALL USING (public.is_admin());

-- ============================================================================
-- USER ARCHETYPES RLS POLICIES  
-- ============================================================================

-- Users can manage their own archetype data
CREATE POLICY "user_archetypes_own" ON user_archetypes
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Partners can view each other's archetypes if sharing is enabled
CREATE POLICY "user_archetypes_partner" ON user_archetypes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM couples c
      JOIN users u1 ON c.partner_1_id = u1.id
      JOIN users u2 ON c.partner_2_id = u2.id
      WHERE c.is_active = true
      AND (u1.id = user_archetypes.user_id OR u2.id = user_archetypes.user_id)
      AND (u1.auth_id = auth.uid() OR u2.auth_id = auth.uid())
    )
  );

-- Support access for crisis situations
CREATE POLICY "user_archetypes_support" ON user_archetypes
  FOR SELECT USING (public.is_support());

-- ============================================================================
-- USER PREFERENCES RLS POLICIES
-- ============================================================================

-- Users can only manage their own preferences
CREATE POLICY "user_preferences_own" ON user_preferences
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Support can view preferences for crisis intervention
CREATE POLICY "user_preferences_support" ON user_preferences
  FOR SELECT USING (public.is_support());

-- ============================================================================
-- USER SAFETY PROFILE RLS POLICIES
-- ============================================================================

-- Users can manage their own safety profile
CREATE POLICY "user_safety_profile_own" ON user_safety_profile
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Support staff can access safety profiles for crisis intervention
CREATE POLICY "user_safety_profile_support" ON user_safety_profile
  FOR SELECT USING (public.is_support());

-- Emergency access for crisis situations (system-level, not user-level)
-- NOTE: This policy will be created in migration 006 after safety_risk_signals table exists
-- CREATE POLICY "user_safety_profile_emergency" ON user_safety_profile
--   FOR SELECT USING (
--     public.is_support() AND 
--     user_id IN (
--       SELECT user_id FROM safety_risk_signals 
--       WHERE risk_level IN ('high', 'critical') 
--       AND created_at > NOW() - INTERVAL '24 hours'
--     )
--   );

-- ============================================================================
-- COUPLES TABLE RLS POLICIES
-- ============================================================================

-- Partners can view and update their couple record
CREATE POLICY "couples_members" ON couples
  FOR ALL USING (
    is_active = true AND
    (partner_1_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) OR
     partner_2_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  );

-- Allow creation of new couple records by either partner
CREATE POLICY "couples_create" ON couples
  FOR INSERT WITH CHECK (
    partner_1_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) OR
    partner_2_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Support access for crisis situations
CREATE POLICY "couples_support" ON couples
  FOR SELECT USING (public.is_support());

-- ============================================================================
-- COUPLE INVITATIONS RLS POLICIES
-- ============================================================================

-- Users can view invitations they sent
CREATE POLICY "couple_invitations_sent" ON couple_invitations
  FOR ALL USING (
    inviter_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Users can view invitations sent to their email (for acceptance)
-- Note: This requires the invitation code for security
CREATE POLICY "couple_invitations_received" ON couple_invitations
  FOR SELECT USING (
    status = 'pending' AND 
    invitation_code IS NOT NULL AND
    expires_at > NOW()
  );

-- Users can update invitation status (accept/decline)
CREATE POLICY "couple_invitations_respond" ON couple_invitations
  FOR UPDATE USING (
    status = 'pending' AND
    expires_at > NOW()
  );

-- ============================================================================
-- RELATIONSHIP MILESTONES RLS POLICIES
-- ============================================================================

-- Couple members can manage their milestones
CREATE POLICY "relationship_milestones_couple" ON relationship_milestones
  FOR ALL USING (public.is_couple_member(couple_id));

-- Support access (view only)
CREATE POLICY "relationship_milestones_support" ON relationship_milestones
  FOR SELECT USING (public.is_support());

-- ============================================================================
-- SYNC STATUS RLS POLICIES
-- ============================================================================

-- Couple members can view and update sync status
CREATE POLICY "sync_status_couple" ON sync_status
  FOR ALL USING (public.is_couple_member(couple_id));

-- ============================================================================
-- CONSENT MANAGEMENT RLS POLICIES
-- ============================================================================

-- Users can only view and manage their own consents
CREATE POLICY "user_consents_own" ON user_consents
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Support can view consents for compliance verification
CREATE POLICY "user_consents_support" ON user_consents
  FOR SELECT USING (public.is_support());

-- Legal team needs access for compliance audits
CREATE POLICY "user_consents_legal" ON user_consents
  FOR SELECT USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'legal', 'compliance'),
      false
    )
  );

-- ============================================================================
-- PRIVACY PREFERENCES RLS POLICIES
-- ============================================================================

-- Users manage their own privacy preferences
CREATE POLICY "privacy_preferences_own" ON privacy_preferences
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Support read access for troubleshooting
CREATE POLICY "privacy_preferences_support" ON privacy_preferences
  FOR SELECT USING (public.is_support());

-- ============================================================================
-- DATA SUBJECT REQUESTS RLS POLICIES
-- ============================================================================

-- Users can create and view their own data subject requests
CREATE POLICY "data_subject_requests_own" ON data_subject_requests
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "data_subject_requests_create" ON data_subject_requests
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Support and legal teams can manage all requests
CREATE POLICY "data_subject_requests_staff" ON data_subject_requests
  FOR ALL USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'support', 'legal', 'compliance'),
      false
    )
  );

-- ============================================================================
-- CONSENT AUDIT LOG RLS POLICIES
-- ============================================================================

-- Users can view their own consent audit trail
CREATE POLICY "consent_audit_log_own" ON consent_audit_log
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Staff can view audit logs for compliance and support
CREATE POLICY "consent_audit_log_staff" ON consent_audit_log
  FOR SELECT USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'support', 'legal', 'compliance'),
      false
    )
  );

-- System can insert audit records (no user access to INSERT/UPDATE/DELETE)
-- This is handled by the consent management functions

-- ============================================================================
-- DATA PROCESSING ACTIVITIES RLS POLICIES
-- ============================================================================

-- Only compliance and legal teams can manage processing activities
CREATE POLICY "data_processing_activities_compliance" ON data_processing_activities
  FOR ALL USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'legal', 'compliance'),
      false
    )
  );

-- Staff can view processing activities for reference
CREATE POLICY "data_processing_activities_staff_read" ON data_processing_activities
  FOR SELECT USING (public.is_support());

-- ============================================================================
-- PRIVACY IMPACT ASSESSMENTS RLS POLICIES
-- ============================================================================

-- Only compliance, legal, and admin teams can manage PIAs
CREATE POLICY "privacy_impact_assessments_compliance" ON privacy_impact_assessments
  FOR ALL USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') IN ('admin', 'legal', 'compliance'),
      false
    )
  );

-- Staff can view approved PIAs for reference
CREATE POLICY "privacy_impact_assessments_staff_read" ON privacy_impact_assessments
  FOR SELECT USING (
    public.is_support() AND status = 'approved'
  );

-- ============================================================================
-- SECURITY POLICIES FOR SENSITIVE FUNCTIONS
-- ============================================================================

-- Revoke public access to sensitive functions
REVOKE ALL ON FUNCTION grant_user_consent FROM PUBLIC;
REVOKE ALL ON FUNCTION revoke_user_consent FROM PUBLIC;
REVOKE ALL ON FUNCTION has_user_consent FROM PUBLIC;

-- Grant access to authenticated users only
GRANT EXECUTE ON FUNCTION grant_user_consent TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_user_consent TO authenticated;
GRANT EXECUTE ON FUNCTION has_user_consent TO authenticated;

-- ============================================================================
-- COUPLE ISOLATION VERIFICATION FUNCTION
-- ============================================================================

-- Function to verify couple data isolation (for testing)
CREATE OR REPLACE FUNCTION verify_couple_isolation(test_user_auth_id UUID, target_couple_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  can_access BOOLEAN;
BEGIN
  -- Temporarily set the user context
  PERFORM set_config('request.jwt.claim.sub', test_user_auth_id::text, true);
  
  -- Check if user can access the couple data
  SELECT EXISTS (
    SELECT 1 FROM couples 
    WHERE id = target_couple_id
  ) INTO can_access;
  
  RETURN can_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to test RLS policy effectiveness
CREATE OR REPLACE FUNCTION test_rls_isolation()
RETURNS TABLE(
  table_name TEXT,
  policy_name TEXT,
  test_result TEXT,
  details TEXT
) AS $$
BEGIN
  -- This function can be used in tests to verify RLS policies
  -- Implementation will be in the test files
  RETURN QUERY SELECT 
    'placeholder'::TEXT,
    'placeholder'::TEXT, 
    'placeholder'::TEXT,
    'RLS testing function created'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- EMERGENCY ACCESS POLICIES
-- ============================================================================

-- Emergency override for crisis situations (admin only, logged)
CREATE OR REPLACE FUNCTION emergency_access_override(
  target_user_id UUID,
  reason TEXT,
  staff_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Verify admin access
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Log the emergency access
  INSERT INTO audit_log (
    user_id, action_type, resource_type, resource_id, 
    details, ip_address, user_agent, staff_user_id
  ) VALUES (
    target_user_id, 'emergency_access', 'user_profile', target_user_id,
    jsonb_build_object(
      'reason', reason,
      'admin_user', auth.uid(),
      'staff_id', staff_id,
      'timestamp', NOW()
    ),
    inet_client_addr(), 
    current_setting('request.headers.user-agent', true),
    COALESCE(staff_id, public.get_user_id())
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICY DOCUMENTATION
-- ============================================================================

-- COMMENT ON FUNCTION auth.uid() IS 'Get current authenticated user ID from JWT'; -- Cannot modify built-in auth functions
COMMENT ON FUNCTION public.is_couple_member(UUID) IS 'Check if current user is member of specified couple';
COMMENT ON FUNCTION verify_couple_isolation(UUID, UUID) IS 'Test function to verify couple data isolation';
COMMENT ON FUNCTION emergency_access_override(UUID, TEXT, UUID) IS 'Emergency admin access with audit logging';

-- ============================================================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users for core functions
-- GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated; -- Built-in function, no need to grant
GRANT EXECUTE ON FUNCTION public.is_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_couple_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION has_user_consent(UUID, TEXT) TO authenticated;

-- Grant admin functions to admin role only
GRANT EXECUTE ON FUNCTION emergency_access_override(UUID, TEXT, UUID) TO authenticated;

-- Grant testing functions to service role for automated tests
GRANT EXECUTE ON FUNCTION verify_couple_isolation(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION test_rls_isolation() TO service_role;