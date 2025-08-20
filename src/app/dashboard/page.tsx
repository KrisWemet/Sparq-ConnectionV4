'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Heart, 
  Users, 
  Settings, 
  Shield, 
  Activity,
  Plus,
  MessageCircle,
  TrendingUp,
  AlertTriangle,
  Calendar,
  User
} from 'lucide-react'
import { motion } from 'framer-motion'

interface UserProfile {
  id: string
  display_name: string | null
  relationship_status: string | null
  onboarding_completed: boolean
  safety_monitoring_enabled: boolean
  created_at: string
}

interface CoupleData {
  id: string
  status: string
  created_at: string
  partner_name?: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Get user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single()

      if (userError) {
        if (userError.code === 'PGRST116') {
          // User profile doesn't exist yet
          router.push('/onboarding')
          return
        }
        throw userError
      }

      setUser(userData)

      // Get couple data if user is in a relationship
      if (userData.relationship_status === 'coupled') {
        const { data: coupleData, error: coupleError } = await supabase
          .from('couples')
          .select(`
            id,
            status,
            created_at,
            partner_1_id,
            partner_2_id
          `)
          .or(`partner_1_id.eq.${userData.id},partner_2_id.eq.${userData.id}`)
          .single()

        if (!coupleError && coupleData) {
          // Get partner name
          const partnerId = coupleData.partner_1_id === userData.id 
            ? coupleData.partner_2_id 
            : coupleData.partner_1_id

          const { data: partnerData } = await supabase
            .from('users')
            .select('display_name')
            .eq('id', partnerId)
            .single()

          setCouple({
            ...coupleData,
            partner_name: partnerData?.display_name || 'Your Partner'
          })
        }
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Failed to load dashboard. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartCoupleLink = () => {
    router.push('/couple/link')
  }

  const handleStartAssessment = () => {
    router.push('/assessment')
  }

  const handleViewSettings = () => {
    router.push('/settings')
  }

  const handleEmergencyResources = () => {
    router.push('/crisis-resources')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-harmony-50 via-connection-50 to-growth-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-connection-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-harmony-50 via-connection-50 to-growth-50 flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-harmony-50 via-connection-50 to-growth-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {user?.display_name || 'Friend'}! 👋
              </h1>
              <p className="text-gray-600">
                Your relationship wellness dashboard
              </p>
            </div>
            <Button
              onClick={handleViewSettings}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>

          {/* Safety Status */}
          {user?.safety_monitoring_enabled && (
            <Alert className="border-green-200 bg-green-50">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Safety monitoring is active. You're protected by our crisis detection system.
              </AlertDescription>
            </Alert>
          )}
        </motion.div>

        {/* Main Dashboard Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Relationship Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-connection-600" />
                    Relationship Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {couple ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Connected with {couple.partner_name}</p>
                          <p className="text-sm text-gray-600">
                            Relationship established {new Date(couple.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleStartAssessment} className="flex-1">
                          <Activity className="h-4 w-4 mr-2" />
                          New Assessment
                        </Button>
                        <Button variant="outline" onClick={() => router.push('/couple/chat')}>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Couple Chat
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="font-medium text-gray-900 mb-2">Ready to connect?</h3>
                      <p className="text-gray-600 mb-4">
                        Link with your partner to start your relationship wellness journey together.
                      </p>
                      <Button onClick={handleStartCoupleLink} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Connect with Partner
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-growth-600" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No recent activity yet.</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Complete assessments and engage with your partner to see your progress here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/assessment/daily')}
                    className="w-full justify-start"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Daily Check-in
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => router.push('/resources')}
                    className="w-full justify-start"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Wellness Resources
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => router.push('/privacy')}
                    className="w-full justify-start"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Privacy Controls
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Safety Resources */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700">
                    <Shield className="h-5 w-5" />
                    Safety Resources
                  </CardTitle>
                  <CardDescription>
                    Always available when you need support
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      onClick={handleEmergencyResources}
                      variant="outline"
                      className="w-full justify-start border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Crisis Resources
                    </Button>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>Emergency:</strong> Call 911</p>
                      <p><strong>Crisis Line:</strong> Call or text 988</p>
                      <p><strong>DV Hotline:</strong> 1-800-799-7233</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Profile Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Member since:</span>
                      <span>{new Date(user?.created_at || '').toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span className="capitalize">{user?.relationship_status || 'Single'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Safety monitoring:</span>
                      <span className={user?.safety_monitoring_enabled ? 'text-green-600' : 'text-gray-600'}>
                        {user?.safety_monitoring_enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={handleViewSettings}
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                  >
                    Update Profile
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}