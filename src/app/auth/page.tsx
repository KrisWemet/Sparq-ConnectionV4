'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Heart, 
  Shield, 
  Users, 
  ArrowRight,
  CheckCircle,
  Info
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function AuthPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }
    
    checkAuth()
  }, [router])

  const handleGetStarted = () => {
    router.push('/auth/register')
  }

  const handleSignIn = () => {
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-harmony-50 via-connection-50 to-growth-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-6"
          >
            <div className="p-4 bg-white rounded-full shadow-lg">
              <Heart className="h-12 w-12 text-connection-600" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
          >
            Strengthen Your Relationship with
            <span className="text-connection-600"> Safety First</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto"
          >
            A wellness and education platform designed to help couples build stronger relationships 
            through evidence-based guidance, crisis detection, and transparent safety monitoring.
          </motion.p>
        </div>

        {/* Key Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid md:grid-cols-3 gap-8 mb-12"
        >
          <Card className="border-2 border-harmony-200 hover:border-harmony-300 transition-colors">
            <CardHeader className="text-center">
              <div className="p-3 bg-harmony-100 rounded-full w-fit mx-auto mb-4">
                <Shield className="h-8 w-8 text-harmony-600" />
              </div>
              <CardTitle className="text-harmony-700">Safety First Design</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Advanced crisis detection with transparent monitoring. Your individual safety 
                always takes priority over relationship preservation.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 border-connection-200 hover:border-connection-300 transition-colors">
            <CardHeader className="text-center">
              <div className="p-3 bg-connection-100 rounded-full w-fit mx-auto mb-4">
                <Heart className="h-8 w-8 text-connection-600" />
              </div>
              <CardTitle className="text-connection-700">Evidence-Based Guidance</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Relationship insights grounded in peer-reviewed research. Educational 
                support based on proven therapeutic frameworks.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 border-growth-200 hover:border-growth-300 transition-colors">
            <CardHeader className="text-center">
              <div className="p-3 bg-growth-100 rounded-full w-fit mx-auto mb-4">
                <Users className="h-8 w-8 text-growth-600" />
              </div>
              <CardTitle className="text-growth-700">Transparent Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Complete transparency in data processing. Granular privacy controls 
                with full consent management and right to be forgotten.
              </CardDescription>
            </CardContent>
          </Card>
        </motion.div>

        {/* Safety Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-8"
        >
          <Alert className="border-amber-200 bg-amber-50">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="space-y-2">
                <p className="font-semibold">Important Safety Information:</p>
                <p>
                  This platform includes safety monitoring that can detect crisis situations. 
                  If you are in an abusive relationship, please consider whether relationship 
                  monitoring technology is safe for you to use. Your individual safety is our top priority.
                </p>
                <p className="text-sm">
                  <strong>Need immediate help?</strong> Call 911 (US) for emergencies or 988 for the Suicide & Crisis Lifeline.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>

        {/* What to Expect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-12"
        >
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">What to Expect During Registration</CardTitle>
              <CardDescription>
                We'll walk you through our safety-first onboarding process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Safety Resource Introduction</p>
                      <p className="text-sm text-gray-600">Familiarize yourself with crisis resources and professional support</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Transparent Consent Process</p>
                      <p className="text-sm text-gray-600">Clear explanation of all monitoring and data processing</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Privacy Controls Setup</p>
                      <p className="text-sm text-gray-600">Configure your individual privacy preferences</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Jurisdiction Detection</p>
                      <p className="text-sm text-gray-600">Ensure compliance with local privacy laws and appropriate resources</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Relationship Profile Creation</p>
                      <p className="text-sm text-gray-600">Set up your communication style and relationship preferences</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Optional Partner Linking</p>
                      <p className="text-sm text-gray-600">Securely connect with your partner when you're both ready</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="bg-connection-500 hover:bg-connection-600 text-white px-8 py-4 text-lg"
            disabled={loading}
          >
            Get Started Safely
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>

          <Button
            onClick={handleSignIn}
            variant="outline"
            size="lg"
            className="border-connection-300 text-connection-700 hover:bg-connection-50 px-8 py-4 text-lg"
            disabled={loading}
          >
            Already Have an Account? Sign In
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center mt-12 text-sm text-gray-600"
        >
          <p>
            By proceeding, you acknowledge this is a wellness and education platform, 
            not a medical device or therapy service.
          </p>
          <p className="mt-2">
            <a href="/privacy" className="text-connection-600 hover:underline">Privacy Policy</a>
            {' • '}
            <a href="/terms" className="text-connection-600 hover:underline">Terms of Service</a>
            {' • '}
            <a href="/safety" className="text-connection-600 hover:underline">Safety Information</a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}