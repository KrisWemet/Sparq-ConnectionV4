'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Heart, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface InviteData {
  inviterEmail: string
  inviterName?: string
  expiresAt: string
  isExpired: boolean
  isConsumed: boolean
}

export default function AcceptInvitePage() {
  const params = useParams()
  const router = useRouter()
  const [inviteCode] = useState(params?.code as string)
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    checkAuthAndLoadInvite()
  }, [inviteCode])

  const checkAuthAndLoadInvite = async () => {
    try {
      // Check if user is authenticated
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        // Redirect to login with return URL
        router.push(`/auth/login?redirect=/invite/${inviteCode}`)
        return
      }

      setUser(currentUser)
      await loadInviteData()
    } catch (error) {
      console.error('Error checking auth:', error)
      setError('Failed to load invite information')
    } finally {
      setLoading(false)
    }
  }

  const loadInviteData = async () => {
    try {
      // Fetch invite data from database
      const { data: invite, error: inviteError } = await supabase
        .from('partner_invites')
        .select(`
          expires_at,
          consumed_at,
          user_profiles!partner_invites_inviter_user_id_fkey (
            email,
            display_name
          )
        `)
        .eq('invite_code', inviteCode)
        .single()

      if (inviteError || !invite) {
        setError('Invalid invite code')
        return
      }

      const isExpired = new Date(invite.expires_at) < new Date()
      const isConsumed = !!invite.consumed_at

      setInviteData({
        inviterEmail: (invite.user_profiles as any)?.email || 'Unknown',
        inviterName: (invite.user_profiles as any)?.display_name,
        expiresAt: invite.expires_at,
        isExpired,
        isConsumed
      })

    } catch (error) {
      console.error('Error loading invite:', error)
      setError('Failed to load invite information')
    }
  }

  const handleAcceptInvite = async () => {
    if (!inviteData || inviteData.isExpired || inviteData.isConsumed) return

    setAccepting(true)
    setError(null)

    try {
      const response = await fetch('/api/v1/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inviteCode
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to accept invite')
      }

      setSuccess(true)
      
      // Redirect to dashboard after success
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error: any) {
      console.error('Error accepting invite:', error)
      setError(error.message || 'Failed to accept invite')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-lg">Loading invite...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Invalid Invite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button 
              onClick={() => router.push('/auth/register')} 
              className="w-full"
            >
              Create New Account
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Successfully Paired!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              You are now connected with {inviteData?.inviterName || inviteData?.inviterEmail}!
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Redirecting to your dashboard...
            </p>
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Join Your Partner</CardTitle>
          <p className="text-gray-600">
            {inviteData?.inviterName || inviteData?.inviterEmail} has invited you to connect
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {inviteData?.isExpired && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                This invite has expired. Please ask for a new invite.
              </AlertDescription>
            </Alert>
          )}

          {inviteData?.isConsumed && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                This invite has already been used.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Users className="h-4 w-4" />
              <span>Partnership Details</span>
            </div>
            <p className="font-medium">{inviteData?.inviterName || 'Your Partner'}</p>
            <p className="text-sm text-gray-600">{inviteData?.inviterEmail}</p>
            <p className="text-xs text-gray-500 mt-2">
              Expires: {inviteData ? new Date(inviteData.expiresAt).toLocaleDateString() : 'Unknown'}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              By accepting this invite, you'll be able to:
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Share daily relationship prompts</li>
              <li>• Track your relationship progress together</li>
              <li>• Access couples-focused features</li>
              <li>• Build stronger communication patterns</li>
            </ul>
          </div>

          <Button 
            onClick={handleAcceptInvite}
            disabled={accepting || inviteData?.isExpired || inviteData?.isConsumed}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {accepting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Accepting Invite...
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2" />
                Accept Invite & Connect
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            This will create a secure connection between you and your partner
          </p>
        </CardContent>
      </Card>
    </div>
  )
}