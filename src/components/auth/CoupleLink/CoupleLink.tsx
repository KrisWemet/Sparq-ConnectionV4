'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Heart, Shield, AlertTriangle, Users, Copy, Check } from 'lucide-react'
import { CoupleLinking } from '@/lib/auth/couple-linking'
import { motion, AnimatePresence } from 'framer-motion'

interface CoupleLinkProps {
  userId: string
  onLinkSuccess?: (coupleId: string) => void
  onError?: (error: string) => void
}

export const CoupleLink: React.FC<CoupleLinkProps> = ({
  userId,
  onLinkSuccess,
  onError
}) => {
  const [mode, setMode] = useState<'select' | 'create' | 'accept' | 'safety_discussion'>('select')
  const [invitationCode, setInvitationCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [safetyDiscussion, setSafetyDiscussion] = useState({
    domesticViolenceAwareness: false,
    privacyBoundaries: false,
    emergencyProtocols: false,
    dataSharing: false,
    helpSeekingComfort: false
  })
  const [pendingInvitation, setPendingInvitation] = useState<any>(null)

  const coupleLinking = new CoupleLinking()

  const handleCreateInvitation = async () => {
    setLoading(true)
    setError('')

    try {
      const invitation = await coupleLinking.createInvitation(userId, partnerEmail)
      setGeneratedCode(invitation.code)
      setMode('safety_discussion')
      setPendingInvitation(invitation)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create invitation'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!invitationCode.trim()) {
      setError('Please enter an invitation code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await coupleLinking.acceptInvitation(userId, invitationCode.trim())
      onLinkSuccess?.(result.coupleId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invitation'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSafetyDiscussionComplete = async () => {
    const allChecked = Object.values(safetyDiscussion).every(Boolean)
    if (!allChecked) {
      setError('Please confirm all safety discussion points before proceeding')
      return
    }

    setLoading(true)
    try {
      if (pendingInvitation) {
        await coupleLinking.recordSafetyDiscussion(
          pendingInvitation.id,
          userId,
          safetyDiscussion
        )
      }
      
      // Invitation is now ready to share
      setMode('create')
    } catch (err) {
      setError('Failed to record safety discussion')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = generatedCode
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const safetyDiscussionItems = [
    {
      key: 'domesticViolenceAwareness',
      title: 'Safety in Relationships',
      description: 'We understand that relationship monitoring technology could potentially be misused in abusive situations. This platform prioritizes individual safety over relationship preservation.',
      warning: 'If you feel unsafe in your relationship, please consider speaking with a domestic violence counselor before linking accounts.'
    },
    {
      key: 'privacyBoundaries',
      title: 'Individual Privacy Rights',
      description: 'Each partner maintains individual privacy rights and can opt out of monitoring at any time without notification to their partner.',
      warning: 'Your partner will not be notified if you disable monitoring features.'
    },
    {
      key: 'emergencyProtocols',
      title: 'Crisis Intervention Protocols',
      description: 'Our AI monitors conversations for signs of crisis (suicidal thoughts, domestic violence, severe mental health episodes) and may contact emergency services.',
      warning: 'Emergency contacts and crisis interventions prioritize individual safety and may not involve your partner.'
    },
    {
      key: 'dataSharing',
      title: 'Data Sharing Boundaries',
      description: 'You control what relationship data is shared between partners. Individual crisis flags and safety concerns remain private unless there is immediate danger.',
      warning: 'Your mental health crises will not be shared with your partner unless you explicitly consent or there is immediate danger.'
    },
    {
      key: 'helpSeekingComfort',
      title: 'Professional Help Resources',
      description: 'This platform encourages seeking professional help. We provide resources for individual therapy, couples counseling, and crisis support.',
      warning: 'Seeking individual therapy or crisis support is always encouraged and remains private.'
    }
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-connection-100 rounded-full">
            <Users className="h-8 w-8 text-connection-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Connect with Your Partner</h1>
        <p className="text-gray-600">
          Link your accounts to enable relationship monitoring and shared insights with full transparency and safety.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle>How would you like to connect?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => setMode('create')}
                  className="w-full justify-start h-auto p-4 bg-connection-500 hover:bg-connection-600"
                >
                  <div className="text-left">
                    <div className="font-medium">Create Invitation</div>
                    <div className="text-sm opacity-90">Generate a code for your partner to use</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => setMode('accept')}
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                >
                  <div className="text-left">
                    <div className="font-medium">Join with Code</div>
                    <div className="text-sm text-gray-600">Use an invitation code from your partner</div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {mode === 'create' && !generatedCode && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Create Partner Invitation
                </CardTitle>
                <CardDescription>
                  Generate a secure invitation code for your partner
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="partnerEmail">Partner's Email (Optional)</Label>
                  <Input
                    id="partnerEmail"
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    placeholder="partner@example.com"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    This helps us verify the invitation and send safety resources
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => setMode('select')} variant="outline">
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateInvitation}
                    disabled={loading}
                    className="flex-1 bg-connection-500 hover:bg-connection-600"
                  >
                    {loading ? 'Creating...' : 'Create Invitation'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {mode === 'safety_discussion' && (
          <motion.div
            key="safety_discussion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-600" />
                  Safety Discussion Required
                </CardTitle>
                <CardDescription>
                  Before sharing your invitation code, please review and confirm these important safety considerations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Relationship monitoring technology can be misused in abusive situations. 
                    Your safety is our top priority. Please review each point carefully.
                  </AlertDescription>
                </Alert>

                {safetyDiscussionItems.map((item) => (
                  <div key={item.key} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={item.key}
                        checked={safetyDiscussion[item.key as keyof typeof safetyDiscussion]}
                        onCheckedChange={(checked) =>
                          setSafetyDiscussion(prev => ({ ...prev, [item.key]: checked }))
                        }
                        className="mt-1"
                      />
                      <div className="space-y-2">
                        <Label htmlFor={item.key} className="text-base font-medium leading-none">
                          {item.title}
                        </Label>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <div className="p-3 bg-amber-50 border-l-4 border-amber-400">
                          <p className="text-sm text-amber-800 font-medium">{item.warning}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleSafetyDiscussionComplete}
                  disabled={loading || !Object.values(safetyDiscussion).every(Boolean)}
                  className="w-full bg-connection-500 hover:bg-connection-600"
                  size="lg"
                >
                  {loading ? 'Processing...' : 'I Understand - Generate Invitation Code'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {mode === 'create' && generatedCode && (
          <motion.div
            key="created"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  Invitation Created Successfully
                </CardTitle>
                <CardDescription>
                  Share this code with your partner. It will expire in 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <code className="text-lg font-mono font-bold tracking-wider">{generatedCode}</code>
                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      size="sm"
                      className="ml-2"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Privacy Note:</strong> Your partner will receive the same safety discussion 
                    and consent prompts when they use this code. Both partners must explicitly consent 
                    to all monitoring features.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={() => {
                    setMode('select')
                    setGeneratedCode('')
                    setPartnerEmail('')
                    setSafetyDiscussion({
                      domesticViolenceAwareness: false,
                      privacyBoundaries: false,
                      emergencyProtocols: false,
                      dataSharing: false,
                      helpSeekingComfort: false
                    })
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Create Another Invitation
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {mode === 'accept' && (
          <motion.div
            key="accept"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Join with Invitation Code
                </CardTitle>
                <CardDescription>
                  Enter the code your partner shared with you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="invitationCode">Invitation Code</Label>
                  <Input
                    id="invitationCode"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                    placeholder="ENTER-CODE-HERE"
                    className="mt-1 font-mono tracking-wider"
                  />
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    You will be asked to review and consent to safety monitoring before 
                    your accounts are linked.
                  </AlertDescription>
                </Alert>

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => setMode('select')} variant="outline">
                    Back
                  </Button>
                  <Button
                    onClick={handleAcceptInvitation}
                    disabled={loading || !invitationCode.trim()}
                    className="flex-1 bg-connection-500 hover:bg-connection-600"
                  >
                    {loading ? 'Connecting...' : 'Connect Accounts'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}