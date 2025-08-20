import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { CoupleLinking } from '../couple-linking'

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({ data: [{ id: 'test-invitation-id', code: 'TEST123' }], error: null })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({ data: null, error: null }))
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({ error: null }))
    }))
  })),
  rpc: jest.fn(() => ({ data: 'TEST123', error: null }))
}

jest.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabase
}))

// Mock SafetyIntegration
jest.mock('../safety-integration', () => ({
  SafetyIntegration: jest.fn().mockImplementation(() => ({
    getSafetyContext: jest.fn().mockResolvedValue({
      jurisdiction: 'US',
      crisisResources: [],
      domesticViolenceResources: []
    })
  }))
}))

describe('CoupleLinking', () => {
  let coupleLinking: CoupleLinking
  const testUserId = 'test-user-id'
  const testPartnerEmail = 'partner@example.com'

  beforeEach(() => {
    coupleLinking = new CoupleLinking()
    jest.clearAllMocks()
  })

  describe('createInvitation', () => {
    it('should create invitation successfully', async () => {
      const mockInvitation = {
        id: 'test-invitation-id',
        code: 'TEST123',
        inviter_id: testUserId,
        partner_email: testPartnerEmail,
        expires_at: expect.any(String)
      }

      mockSupabase.from = jest.fn(() => ({
        insert: jest.fn(() => ({ 
          data: [mockInvitation], 
          error: null 
        }))
      }))

      const result = await coupleLinking.createInvitation(testUserId, testPartnerEmail)

      expect(result).toEqual(mockInvitation)
      expect(mockSupabase.from).toHaveBeenCalledWith('couple_invitations')
    })

    it('should handle invitation creation errors', async () => {
      const mockError = new Error('Database error')
      mockSupabase.from = jest.fn(() => ({
        insert: jest.fn(() => ({ error: mockError }))
      }))

      await expect(
        coupleLinking.createInvitation(testUserId, testPartnerEmail)
      ).rejects.toThrow('Failed to create invitation: Database error')
    })

    it('should validate email format', async () => {
      await expect(
        coupleLinking.createInvitation(testUserId, 'invalid-email')
      ).rejects.toThrow('Invalid email address')
    })

    it('should prevent self-invitation', async () => {
      // Mock user profile lookup
      mockSupabase.from = jest.fn((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({ 
                  data: { email: testPartnerEmail }, 
                  error: null 
                }))
              }))
            }))
          }
        }
        return {
          insert: jest.fn(() => ({ data: [], error: null }))
        }
      })

      await expect(
        coupleLinking.createInvitation(testUserId, testPartnerEmail)
      ).rejects.toThrow('Cannot invite yourself')
    })
  })

  describe('acceptInvitation', () => {
    const testCode = 'TEST123'
    const acceptorId = 'acceptor-user-id'

    it('should accept invitation successfully', async () => {
      const mockInvitation = {
        id: 'test-invitation-id',
        inviter_id: testUserId,
        partner_email: testPartnerEmail,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        accepted: false
      }

      const mockCouple = {
        id: 'test-couple-id',
        partner1_id: testUserId,
        partner2_id: acceptorId
      }

      mockSupabase.from = jest.fn((table) => {
        if (table === 'couple_invitations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({ 
                  data: mockInvitation, 
                  error: null 
                }))
              }))
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({ error: null }))
            }))
          }
        } else if (table === 'couples') {
          return {
            insert: jest.fn(() => ({ 
              data: [mockCouple], 
              error: null 
            }))
          }
        }
        return {}
      })

      const result = await coupleLinking.acceptInvitation(acceptorId, testCode)

      expect(result).toEqual({
        coupleId: mockCouple.id,
        inviterId: testUserId
      })
    })

    it('should reject expired invitations', async () => {
      const expiredInvitation = {
        id: 'test-invitation-id',
        inviter_id: testUserId,
        partner_email: testPartnerEmail,
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        accepted: false
      }

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ 
              data: expiredInvitation, 
              error: null 
            }))
          }))
        }))
      }))

      await expect(
        coupleLinking.acceptInvitation(acceptorId, testCode)
      ).rejects.toThrow('Invitation has expired')
    })

    it('should reject already accepted invitations', async () => {
      const acceptedInvitation = {
        id: 'test-invitation-id',
        inviter_id: testUserId,
        partner_email: testPartnerEmail,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        accepted: true
      }

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ 
              data: acceptedInvitation, 
              error: null 
            }))
          }))
        }))
      }))

      await expect(
        coupleLinking.acceptInvitation(acceptorId, testCode)
      ).rejects.toThrow('Invitation has already been accepted')
    })

    it('should reject invalid invitation codes', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ 
              data: null, 
              error: null 
            }))
          }))
        }))
      }))

      await expect(
        coupleLinking.acceptInvitation(acceptorId, 'INVALID123')
      ).rejects.toThrow('Invalid invitation code')
    })
  })

  describe('recordSafetyDiscussion', () => {
    it('should record safety discussion successfully', async () => {
      const invitationId = 'test-invitation-id'
      const discussionPoints = {
        domesticViolenceAwareness: true,
        privacyBoundaries: true,
        emergencyProtocols: true,
        dataSharing: true,
        helpSeekingComfort: true
      }

      await coupleLinking.recordSafetyDiscussion(invitationId, testUserId, discussionPoints)

      expect(mockSupabase.from).toHaveBeenCalledWith('couple_invitations')
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        safety_discussion: discussionPoints,
        safety_discussion_completed_by: testUserId,
        safety_discussion_completed_at: expect.any(String)
      })
    })

    it('should validate all discussion points are addressed', async () => {
      const incompleteDiscussion = {
        domesticViolenceAwareness: true,
        privacyBoundaries: false, // Missing required point
        emergencyProtocols: true,
        dataSharing: true,
        helpSeekingComfort: true
      }

      await expect(
        coupleLinking.recordSafetyDiscussion('test-id', testUserId, incompleteDiscussion)
      ).rejects.toThrow('All safety discussion points must be acknowledged')
    })
  })

  describe('generateInvitationCode', () => {
    it('should generate unique invitation codes', async () => {
      // Mock database check to return no existing codes
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: null, error: null }))
          }))
        }))
      }))

      const code1 = await coupleLinking.generateInvitationCode()
      const code2 = await coupleLinking.generateInvitationCode()

      expect(code1).toMatch(/^[A-Z0-9]{8}-[A-Z0-9]{4}$/)
      expect(code2).toMatch(/^[A-Z0-9]{8}-[A-Z0-9]{4}$/)
      expect(code1).not.toBe(code2)
    })

    it('should retry code generation if collision occurs', async () => {
      let callCount = 0
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => {
              callCount++
              // First call returns existing code, second returns null
              return { 
                data: callCount === 1 ? { id: 'existing' } : null, 
                error: null 
              }
            })
          }))
        }))
      }))

      const code = await coupleLinking.generateInvitationCode()

      expect(code).toMatch(/^[A-Z0-9]{8}-[A-Z0-9]{4}$/)
      expect(callCount).toBe(2) // Should have retried once
    })
  })

  describe('getUserCoupleStatus', () => {
    it('should return couple status for linked users', async () => {
      const mockCouple = {
        id: 'couple-id',
        partner1_id: testUserId,
        partner2_id: 'partner-id',
        created_at: '2024-01-01T00:00:00Z',
        safety_monitoring_enabled: true
      }

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          or: jest.fn(() => ({
            single: jest.fn(() => ({ data: mockCouple, error: null }))
          }))
        }))
      }))

      const result = await coupleLinking.getUserCoupleStatus(testUserId)

      expect(result).toEqual({
        isLinked: true,
        coupleId: mockCouple.id,
        partnerId: 'partner-id',
        linkedAt: mockCouple.created_at,
        safetyMonitoringEnabled: true
      })
    })

    it('should return unlinked status for users without couples', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          or: jest.fn(() => ({
            single: jest.fn(() => ({ data: null, error: null }))
          }))
        }))
      }))

      const result = await coupleLinking.getUserCoupleStatus(testUserId)

      expect(result).toEqual({
        isLinked: false,
        coupleId: null,
        partnerId: null,
        linkedAt: null,
        safetyMonitoringEnabled: false
      })
    })
  })
})