import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database-complete.types'

type ConsentType = Database['public']['Tables']['user_consents']['Row']['consent_type']
type ConsentRecord = Database['public']['Tables']['user_consent_records']['Row']
type ConsentVersion = Database['public']['Tables']['consent_versions']['Row']

export interface ConsentStatus {
  consentType: ConsentType
  granted: boolean
  grantedAt?: string
  version: string
  canWithdraw: boolean
  withdrawalConsequences?: string
}

export interface ConsentRequirement {
  type: ConsentType
  required: boolean
  title: string
  description: string
  legalBasis: string
  consequences: string
  withdrawalInstructions: string
}

export interface ConsentFormData {
  safetyMonitoring: boolean
  aiContentAnalysis: boolean
  crisisIntervention: boolean // Cannot be opted out
  professionalReferral: boolean
  analyticsCollection: boolean
  marketingCommunications: boolean
}

export class ConsentManager {
  private supabase = createClient()

  /**
   * Get current consent versions for all consent types
   */
  async getActiveConsentVersions(): Promise<ConsentVersion[]> {
    const { data, error } = await this.supabase
      .from('consent_versions')
      .select('*')
      .eq('is_active', true)
      .lte('effective_date', new Date().toISOString().split('T')[0])
      .or('deprecated_date.is.null,deprecated_date.gt.' + new Date().toISOString().split('T')[0])
      .order('consent_type', { ascending: true })

    if (error) {
      console.error('Error fetching consent versions:', error)
      throw new Error('Failed to fetch consent versions')
    }

    return data || []
  }

  /**
   * Get user's current consent status for all types
   */
  async getUserConsentStatus(userId: string): Promise<ConsentStatus[]> {
    const { data, error } = await this.supabase
      .from('user_consent_records')
      .select(`
        *,
        consent_versions (
          consent_type,
          version_number,
          consequences_of_refusal,
          withdrawal_instructions
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user consent status:', error)
      throw new Error('Failed to fetch consent status')
    }

    // Get the most recent consent record for each type
    const latestConsents = new Map<ConsentType, any>()
    data?.forEach(record => {
      const consentType = record.consent_versions?.consent_type as ConsentType
      if (consentType && !latestConsents.has(consentType)) {
        latestConsents.set(consentType, record)
      }
    })

    return Array.from(latestConsents.entries()).map(([type, record]) => ({
      consentType: type,
      granted: record.granted,
      grantedAt: record.granted_at,
      version: record.consent_versions?.version_number || '1.0',
      canWithdraw: type !== 'crisis_intervention', // Crisis intervention cannot be withdrawn
      withdrawalConsequences: record.consent_versions?.consequences_of_refusal
    }))
  }

  /**
   * Check if user has all required consents
   */
  async hasRequiredConsents(userId: string): Promise<boolean> {
    const requiredConsents: ConsentType[] = [
      'safety_monitoring',
      'data_processing',
      'ai_content_analysis',
      'crisis_intervention'
    ]

    const consentStatus = await this.getUserConsentStatus(userId)
    
    return requiredConsents.every(requiredType => {
      const status = consentStatus.find(s => s.consentType === requiredType)
      return status && status.granted
    })
  }

  /**
   * Record user consent for a specific type
   */
  async recordConsent(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
    collectionMethod: string = 'explicit_opt_in',
    granularPermissions: Record<string, any> = {}
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc('record_user_consent', {
      p_user_id: userId,
      p_consent_type: consentType,
      p_granted: granted,
      p_collection_method: collectionMethod,
      p_granular_permissions: granularPermissions
    })

    if (error) {
      console.error('Error recording consent:', error)
      throw new Error(`Failed to record consent for ${consentType}`)
    }

    return data
  }

  /**
   * Record multiple consents in a batch
   */
  async recordMultipleConsents(
    userId: string,
    consents: { type: ConsentType; granted: boolean; granular?: Record<string, any> }[],
    collectionMethod: string = 'onboarding_flow'
  ): Promise<string[]> {
    const results = await Promise.all(
      consents.map(consent =>
        this.recordConsent(
          userId,
          consent.type,
          consent.granted,
          collectionMethod,
          consent.granular || {}
        )
      )
    )

    return results
  }

  /**
   * Withdraw consent for a specific type
   */
  async withdrawConsent(
    userId: string,
    consentType: ConsentType,
    reason?: string
  ): Promise<void> {
    // Check if consent can be withdrawn
    if (consentType === 'crisis_intervention') {
      throw new Error('Crisis intervention consent cannot be withdrawn for safety reasons')
    }

    // Record consent withdrawal
    await this.recordConsent(userId, consentType, false, 'settings_page')

    // Log the withdrawal with reason
    if (reason) {
      await this.supabase
        .from('audit_log')
        .insert({
          user_id: userId,
          action_type: 'consent_revoked',
          resource_type: 'user_consent',
          details: {
            consent_type: consentType,
            withdrawal_reason: reason,
            withdrawal_method: 'settings_page'
          },
          regulatory_context: 'GDPR'
        })
    }
  }

  /**
   * Get consent requirements for display in forms
   */
  async getConsentRequirements(): Promise<ConsentRequirement[]> {
    const versions = await this.getActiveConsentVersions()

    return versions.map(version => ({
      type: version.consent_type as ConsentType,
      required: ['safety_monitoring', 'data_processing', 'crisis_intervention'].includes(version.consent_type),
      title: this.getConsentTitle(version.consent_type as ConsentType),
      description: version.explanation_text,
      legalBasis: version.legal_basis,
      consequences: version.consequences_of_refusal || '',
      withdrawalInstructions: version.withdrawal_instructions || ''
    }))
  }

  /**
   * Check if consent requires renewal
   */
  async checkConsentRenewal(userId: string): Promise<ConsentType[]> {
    const { data, error } = await this.supabase
      .from('user_consent_records')
      .select('consent_versions(consent_type)')
      .eq('user_id', userId)
      .eq('granted', true)
      .not('renewal_required_date', 'is', null)
      .lte('renewal_required_date', new Date().toISOString().split('T')[0])

    if (error) {
      console.error('Error checking consent renewal:', error)
      return []
    }

    return data?.map(record => record.consent_versions?.consent_type as ConsentType).filter(Boolean) || []
  }

  /**
   * Get consent form data from user's current consents
   */
  async getConsentFormData(userId: string): Promise<ConsentFormData> {
    const consentStatus = await this.getUserConsentStatus(userId)
    
    return {
      safetyMonitoring: this.getConsentGranted(consentStatus, 'safety_monitoring'),
      aiContentAnalysis: this.getConsentGranted(consentStatus, 'ai_content_analysis'),
      crisisIntervention: true, // Always true, cannot be opted out
      professionalReferral: this.getConsentGranted(consentStatus, 'professional_referral'),
      analyticsCollection: this.getConsentGranted(consentStatus, 'analytics_collection'),
      marketingCommunications: this.getConsentGranted(consentStatus, 'marketing_communications')
    }
  }

  /**
   * Save consent form data
   */
  async saveConsentFormData(userId: string, formData: ConsentFormData): Promise<void> {
    const consents = [
      { type: 'safety_monitoring' as ConsentType, granted: formData.safetyMonitoring },
      { type: 'ai_content_analysis' as ConsentType, granted: formData.aiContentAnalysis },
      { type: 'crisis_intervention' as ConsentType, granted: true }, // Always granted
      { type: 'professional_referral' as ConsentType, granted: formData.professionalReferral },
      { type: 'analytics_collection' as ConsentType, granted: formData.analyticsCollection },
      { type: 'marketing_communications' as ConsentType, granted: formData.marketingCommunications }
    ]

    await this.recordMultipleConsents(userId, consents, 'settings_page')
  }

  /**
   * Check if user can access specific features based on consents
   */
  async canAccessFeature(userId: string, feature: string): Promise<boolean> {
    const consentStatus = await this.getUserConsentStatus(userId)
    
    switch (feature) {
      case 'ai_insights':
        return this.getConsentGranted(consentStatus, 'ai_content_analysis')
      case 'safety_monitoring':
        return this.getConsentGranted(consentStatus, 'safety_monitoring')
      case 'professional_referrals':
        return this.getConsentGranted(consentStatus, 'professional_referral')
      case 'analytics_tracking':
        return this.getConsentGranted(consentStatus, 'analytics_collection')
      case 'marketing_emails':
        return this.getConsentGranted(consentStatus, 'marketing_communications')
      default:
        return true // Default to allowing access
    }
  }

  /**
   * Get GDPR-compliant consent export for data portability
   */
  async exportConsentHistory(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_consent_records')
      .select(`
        *,
        consent_versions (
          consent_type,
          version_number,
          version_name,
          legal_basis
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error exporting consent history:', error)
      throw new Error('Failed to export consent history')
    }

    return {
      export_generated_at: new Date().toISOString(),
      user_id: userId,
      consent_records: data?.map(record => ({
        consent_type: record.consent_versions?.consent_type,
        version: record.consent_versions?.version_number,
        granted: record.granted,
        granted_at: record.granted_at,
        revoked_at: record.revoked_at,
        collection_method: record.collection_method,
        legal_basis: record.consent_versions?.legal_basis,
        granular_permissions: record.granular_permissions
      })) || []
    }
  }

  // Private helper methods

  private getConsentGranted(consentStatus: ConsentStatus[], type: ConsentType): boolean {
    const status = consentStatus.find(s => s.consentType === type)
    return status ? status.granted : false
  }

  private getConsentTitle(type: ConsentType): string {
    const titles: Record<ConsentType, string> = {
      safety_monitoring: 'Safety Monitoring',
      ai_content_analysis: 'AI Content Analysis',
      crisis_intervention: 'Crisis Intervention',
      professional_referral: 'Professional Referrals',
      analytics_collection: 'Analytics Collection',
      marketing_communications: 'Marketing Communications',
      data_processing: 'Data Processing',
      research_participation: 'Research Participation'
    }

    return titles[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
}

export const consentManager = new ConsentManager()