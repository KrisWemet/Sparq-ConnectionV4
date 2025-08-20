'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Heart, QrCode, Copy, Share2, Users, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import QRCodeGenerator from '@/components/couple/QRCodeGenerator'
import InviteShare from '@/components/couple/InviteShare'

interface InviteData {
  inviteId: string
  link: string
  inviteCode: string
  expiresAt: string
}

export default function CoupleLinkPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [existingInvites, setExistingInvites] = useState<InviteData[]>([])

  const supabase = createClient()

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      setLoading(true)
      
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        router.push('/auth/login?redirect=/couple/link')
        return
      }

      setUser(currentUser)
      await loadExistingInvites()
      
    } catch (error) {
      console.error('Error checking auth:', error)
      setError('Failed to load invite data')
    } finally {
      setLoading(false)
    }
  }

  const loadExistingInvites = async () => {
    try {
      const response = await fetch('/api/v1/invite')
      
      if (response.ok) {
        const data = await response.json()
        setExistingInvites(data.invites || [])
        
        // If there are existing invites, show the first one
        if (data.invites && data.invites.length > 0) {
          setInvite(data.invites[0])
        }
      }
    } catch (error) {
      console.error('Error loading existing invites:', error)
    }
  }

  const createNewInvite = async () => {
    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/v1/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expiresInDays: 7
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to create invite')
      }

      setInvite(result)
      await loadExistingInvites()

    } catch (error: any) {
      console.error('Error creating invite:', error)
      setError(error.message || 'Failed to create invite')
    } finally {
      setCreating(false)
    }
  }

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-lg">Loading...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Back Button */}
        <Button
          onClick={handleBackToDashboard}
          variant="ghost"
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Connect with Your Partner</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Create a secure invite link to connect with your partner and start your relationship wellness journey together.
          </p>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Create/Show Invite */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-purple-600" />
                  Partner Invite
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!invite ? (
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to connect?</h3>
                    <p className="text-gray-600 mb-6">
                      Create an invite link that your partner can use to join you on Sparq Connection.
                    </p>
                    <Button
                      onClick={createNewInvite}
                      disabled={creating}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating Invite...
                        </>
                      ) : (
                        <>
                          <Heart className="h-4 w-4 mr-2" />
                          Create Partner Invite
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Invite Ready!</h3>
                      <p className="text-gray-600">
                        Share this invite with your partner to connect your accounts.
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Invite Code:</span>
                        <span className="font-mono text-lg">{invite.inviteCode}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Expires:</span>
                        <span className="text-sm text-gray-600">
                          {new Date(invite.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <InviteShare inviteLink={invite.link} inviteCode={invite.inviteCode} />

                    <div className="flex gap-2">
                      <Button 
                        onClick={createNewInvite}
                        variant="outline" 
                        className="flex-1"
                        disabled={creating}
                      >
                        {creating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          'Create New Invite'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column - QR Code */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-blue-600" />
                  QR Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invite ? (
                  <QRCodeGenerator 
                    inviteLink={invite.link} 
                    inviteCode={invite.inviteCode}
                  />
                ) : (
                  <div className="text-center py-12">
                    <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Create an invite to generate a QR code
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* How it Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <Card>
            <CardHeader>
              <CardTitle>How Partner Connection Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <h3 className="font-medium mb-2">Create Invite</h3>
                  <p className="text-sm text-gray-600">
                    Generate a secure invite link or QR code to share with your partner.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold">2</span>
                  </div>
                  <h3 className="font-medium mb-2">Share Securely</h3>
                  <p className="text-sm text-gray-600">
                    Send the invite link via text, email, or let them scan the QR code.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 font-bold">3</span>
                  </div>
                  <h3 className="font-medium mb-2">Start Together</h3>
                  <p className="text-sm text-gray-600">
                    Once connected, you'll both have access to couples features and shared progress.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}