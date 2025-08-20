import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database-complete.types'
import { consentManager } from './consent-management'

type CoupleInvitation = Database['public']['Tables']['couple_invitations']['Row']
type Couple = Database['public']['Tables']['couples']['Row']

export interface InvitationDetails {
  id: string
  inviterName: string
  inviterEmail: string
  relationshipType: string
  personalMessage?: string
  createdAt: string
  expiresAt: string
  safetyDiscussionCompleted: boolean
  safetyConsentAcknowledged: boolean
}

export interface SafetyDiscussionTopics {
  communicationBoundaries: boolean
  crisisProtocols: boolean
  professionalReferrals: boolean
  emergencyContacts: boolean
  monitoringComfort: boolean
  escalationPreferences: boolean
}

export interface CoupleCreationData {
  relationshipType: string
  relationshipStartDate?: string
  relationshipGoals: string[]
  safetyAgreement: {
    mutualConsent: boolean
    monitoringLevel: 'minimal' | 'standard' | 'enhanced' | 'crisis_only'
    escalationThreshold: 'self_harm_only' | 'violence_indicators' | 'severe_distress' | 'any_concern'
  }
}

export class CoupleLinker {
  private supabase = createClient()

  /**
   * Create a couple invitation with safety consent integration
   */
  async createInvitation(
    inviterUserId: string,
    inviteeEmail: string,
    relationshipType: string = 'partnered',
    personalMessage?: string
  ): Promise<string> {
    // Check if inviter has completed safety discussion requirements
    const inviterConsents = await consentManager.getUserConsentStatus(inviterUserId)
    const hasSafetyConsent = inviterConsents.some(c => 
      c.consentType === 'safety_monitoring' && c.granted
    )

    if (!hasSafetyConsent) {
      throw new Error('You must consent to safety monitoring before inviting a partner')
    }

    const { data, error } = await this.supabase.rpc('create_couple_invitation', {
      p_inviter_user_id: inviterUserId,
      p_invitee_email: inviteeEmail,
      p_relationship_type: relationshipType,
      p_personal_message: personalMessage
    })

    if (error) {
      console.error('Error creating couple invitation:', error)
      throw new Error('Failed to create couple invitation')
    }

    return data
  }

  /**
   * Get invitation details by invitation code
   */
  async getInvitationByCode(invitationCode: string): Promise<InvitationDetails | null> {
    const { data, error } = await this.supabase
      .from('couple_invitations')
      .select(`
        *,
        users!couple_invitations_inviter_user_id_fkey (
          display_name,
          email_encrypted
        )
      `)
      .eq('invitation_code', invitationCode)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      console.error('Error fetching invitation:', error)
      return null
    }

    return {
      id: data.id,
      inviterName: data.users?.display_name || 'Your Partner',
      inviterEmail: data.users?.email_encrypted || '',
      relationshipType: data.relationship_type || 'partnered',
      personalMessage: data.personal_message,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      safetyDiscussionCompleted: data.safety_discussion_completed,
      safetyConsentAcknowledged: data.safety_consent_acknowledged
    }
  }

  /**
   * Record safety discussion completion
   */
  async recordSafetyDiscussion(
    invitationId: string,
    topics: SafetyDiscussionTopics,
    bothPartnersParticipated: boolean = false
  ): Promise<void> {
    // Update invitation with safety discussion completion
    const { error: invitationError } = await this.supabase
      .from('couple_invitations')
      .update({
        safety_discussion_completed: true,
        safety_consent_acknowledged: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (invitationError) {
      console.error('Error updating invitation safety discussion:', invitationError)
      throw new Error('Failed to record safety discussion')
    }

    // Create safety discussion record
    const invitation = await this.supabase
      .from('couple_invitations')
      .select('inviter_user_id')
      .eq('id', invitationId)
      .single()

    if (invitation.data) {
      await this.supabase
        .from('partner_safety_discussions')
        .insert({
          couple_id: null, // Will be updated when couple is created
          initiated_by_user_id: invitation.data.inviter_user_id,
          discussion_type: 'initial_safety_setup',
          topics_covered: Object.entries(topics)
            .filter(([_, covered]) => covered)
            .map(([topic, _]) => topic),
          both_partners_participated: bothPartnersParticipated,
          consensus_reached: true,
          completed: true
        })
    }
  }

  /**
   * Accept couple invitation and create couple
   */
  async acceptInvitation(
    invitationCode: string,
    acceptingUserId: string,
    coupleData: CoupleCreationData
  ): Promise<string> {
    // Get invitation details
    const { data: invitation, error: invitationError } = await this.supabase
      .from('couple_invitations')
      .select('*')
      .eq('invitation_code', invitationCode)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .single()

    if (invitationError || !invitation) {
      throw new Error('Invalid or expired invitation')
    }

    // Check that accepting user has required consents
    const acceptingUserConsents = await consentManager.hasRequiredConsents(acceptingUserId)
    if (!acceptingUserConsents) {
      throw new Error('You must complete consent requirements before joining a couple')
    }

    // Verify both partners consent to safety monitoring
    if (!coupleData.safetyAgreement.mutualConsent) {
      throw new Error('Both partners must consent to safety monitoring to create a couple')
    }

    // Create couple record
    const { data: couple, error: coupleError } = await this.supabase
      .from('couples')
      .insert({
        partner_1_id: invitation.inviter_user_id,
        partner_2_id: acceptingUserId,
        relationship_type: coupleData.relationshipType,
        relationship_start_date: coupleData.relationshipStartDate,
        relationship_goals: coupleData.relationshipGoals,
        is_active: true
      })
      .select('id')
      .single()

    if (coupleError || !couple) {
      console.error('Error creating couple:', coupleError)
      throw new Error('Failed to create couple')
    }

    // Create safety discussion record for the couple
    await this.supabase
      .from('partner_safety_discussions')
      .insert({
        couple_id: couple.id,
        initiated_by_user_id: invitation.inviter_user_id,
        discussion_type: 'consent_alignment',
        topics_covered: [
          'mutual_safety_consent',
          'monitoring_comfort_level',
          'escalation_preferences'
        ],
        both_partners_participated: true,
        consensus_reached: true,
        mutual_safety_consent: true,
        agreed_monitoring_level: coupleData.safetyAgreement.monitoringLevel,
        agreed_escalation_threshold: coupleData.safetyAgreement.escalationThreshold,
        completed: true
      })

    // Update invitation status
    await this.supabase
      .from('couple_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: acceptingUserId,
        resulting_couple_id: couple.id,
        both_partners_consent_safety: true
      })
      .eq('id', invitation.id)

    // Log couple creation
    await this.supabase
      .from('audit_log')
      .insert({
        user_id: acceptingUserId,
        action_type: 'couple_join',
        resource_type: 'couple_record',
        resource_id: couple.id,
        details: {
          invitation_id: invitation.id,
          relationship_type: coupleData.relationshipType,
          safety_agreement: coupleData.safetyAgreement
        }
      })

    return couple.id
  }

  /**
   * Decline couple invitation
   */
  async declineInvitation(
    invitationCode: string,
    reason?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('couple_invitations')
      .update({
        status: 'declined',
        declined_at: new Date().toISOString(),
        declined_reason: reason
      })
      .eq('invitation_code', invitationCode)
      .eq('status', 'pending')

    if (error) {
      console.error('Error declining invitation:', error)
      throw new Error('Failed to decline invitation')
    }
  }

  /**
   * Get user's sent invitations
   */
  async getUserSentInvitations(userId: string): Promise<CoupleInvitation[]> {
    const { data, error } = await this.supabase
      .from('couple_invitations')
      .select('*')
      .eq('inviter_user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sent invitations:', error)
      return []
    }

    return data || []
  }

  /**
   * Revoke a pending invitation
   */
  async revokeInvitation(invitationId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('couple_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .eq('inviter_user_id', userId)
      .eq('status', 'pending')

    if (error) {
      console.error('Error revoking invitation:', error)
      throw new Error('Failed to revoke invitation')
    }
  }

  /**
   * Check if user can create new invitation
   */
  async canCreateInvitation(userId: string): Promise<{ canCreate: boolean; reason?: string }> {
    // Check if user is already in an active couple
    const { data: existingCouple } = await this.supabase
      .from('couples')
      .select('id')
      .or(`partner_1_id.eq.${userId},partner_2_id.eq.${userId}`)
      .eq('is_active', true)
      .single()

    if (existingCouple) {
      return { canCreate: false, reason: 'You are already in an active relationship' }
    }

    // Check for pending invitations (sent or received)
    const { data: pendingInvitations } = await this.supabase
      .from('couple_invitations')
      .select('id')
      .or(`inviter_user_id.eq.${userId},accepted_by_user_id.eq.${userId}`)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())

    if (pendingInvitations && pendingInvitations.length > 0) {
      return { canCreate: false, reason: 'You have a pending invitation' }
    }

    // Check consent requirements
    const hasRequiredConsents = await consentManager.hasRequiredConsents(userId)
    if (!hasRequiredConsents) {
      return { canCreate: false, reason: 'You must complete consent requirements first' }
    }

    return { canCreate: true }
  }

  /**
   * Get couple information for a user
   */
  async getUserCouple(userId: string): Promise<Couple | null> {
    const { data, error } = await this.supabase
      .from('couples')
      .select(`
        *,
        partner1:users!couples_partner_1_id_fkey (id, display_name),
        partner2:users!couples_partner_2_id_fkey (id, display_name)
      `)
      .or(`partner_1_id.eq.${userId},partner_2_id.eq.${userId}`)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return null
    }

    return data as any
  }

  /**
   * Leave a couple (end relationship)
   */
  async leaveCouple(
    userId: string,
    coupleId: string,
    reason?: string
  ): Promise<void> {
    // Verify user is part of this couple
    const couple = await this.getUserCouple(userId)
    if (!couple || couple.id !== coupleId) {
      throw new Error('You are not part of this relationship')
    }

    // Deactivate couple
    const { error } = await this.supabase
      .from('couples')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        ending_reason: reason || 'User left relationship'
      })
      .eq('id', coupleId)

    if (error) {
      console.error('Error leaving couple:', error)
      throw new Error('Failed to leave relationship')
    }

    // Log the action
    await this.supabase
      .from('audit_log')
      .insert({
        user_id: userId,
        action_type: 'couple_leave',
        resource_type: 'couple_record',
        resource_id: coupleId,
        details: { reason: reason || 'User initiated' }
      })
  }

  /**
   * Generate shareable invitation link
   */
  generateInvitationLink(invitationCode: string, baseUrl: string = ''): string {
    return `${baseUrl}/auth/couple-invite/${invitationCode}`
  }
}

export const coupleLinker = new CoupleLinker()