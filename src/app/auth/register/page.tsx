'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Import all registration components
import { JurisdictionSelector } from '@/components/auth/JurisdictionSelector/JurisdictionSelector'
import { SafetyResourcesIntro } from '@/components/auth/SafetyResourcesIntro/SafetyResourcesIntro'
import { RegistrationFlow } from '@/components/auth/RegistrationFlow/RegistrationFlow'
import { SafetyOnboarding } from '@/components/auth/SafetyOnboarding/SafetyOnboarding'

// Types
import type { JurisdictionInfo } from '@/lib/auth/jurisdiction-detection'
import type { RegistrationData } from '@/components/auth/RegistrationFlow/RegistrationFlow'

interface SafetyProfile {
  jurisdictionConfirmed: string
  crisisResourcesFamiliar: boolean
  partnerSafetyDiscussed: boolean
  escalationPathwaysUnderstood: boolean
  emergencyContactsConfigured: boolean
  domesticViolenceAwareness: boolean
  privacyRightsUnderstood: boolean
  helpSeekingNormalized: boolean
}

type RegistrationStep = 
  | 'jurisdiction' 
  | 'safety_resources' 
  | 'registration' 
  | 'safety_onboarding' 
  | 'complete'

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('jurisdiction')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string>('')
  const [jurisdiction, setJurisdiction] = useState<JurisdictionInfo | null>(null)
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null)
  const [safetyProfile, setSafetyProfile] = useState<SafetyProfile | null>(null)
  
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

  const handleJurisdictionSelected = (selectedJurisdiction: JurisdictionInfo, confidence: number) => {
    setJurisdiction(selectedJurisdiction)
    setCurrentStep('safety_resources')
  }

  const handleSafetyResourcesComplete = () => {
    setCurrentStep('registration')
  }

  const handleRegistrationComplete = async (data: RegistrationData) => {
    setLoading(true)
    setError('')

    try {
      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            jurisdiction: jurisdiction?.code || 'US'
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        setUserId(authData.user.id)
        setRegistrationData(data)
        
        // If email confirmation is required, show message
        if (!authData.session) {
          setError('Please check your email to confirm your account before proceeding.')
          return
        }

        setCurrentStep('safety_onboarding')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSafetyOnboardingComplete = async (profile: SafetyProfile) => {
    setLoading(true)
    setError('')

    try {
      setSafetyProfile(profile)
      
      // Complete user profile setup
      if (userId && registrationData) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: registrationData.fullName,
            jurisdiction: jurisdiction?.code || 'US',
            archetype: registrationData.archetype,
            safety_profile: profile,
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (profileError) throw profileError

        // Record consents
        if (registrationData.consents) {
          // This would be handled by ConsentManager
          console.log('Recording consents:', registrationData.consents)
        }
      }

      setCurrentStep('complete')
      
      // Redirect to dashboard after brief success message
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete onboarding'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'safety_resources':
        setCurrentStep('jurisdiction')
        break
      case 'registration':
        setCurrentStep('safety_resources')
        break
      case 'safety_onboarding':
        setCurrentStep('registration')
        break
      default:
        router.push('/auth')
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'jurisdiction':
        return 'Location & Privacy Settings'
      case 'safety_resources':
        return 'Safety Resources'
      case 'registration':
        return 'Account Creation'
      case 'safety_onboarding':
        return 'Safety Onboarding'
      case 'complete':
        return 'Welcome!'
      default:
        return 'Registration'
    }
  }

  const getStepNumber = () => {
    switch (currentStep) {
      case 'jurisdiction':
        return 1
      case 'safety_resources':
        return 2
      case 'registration':
        return 3
      case 'safety_onboarding':
        return 4
      case 'complete':
        return 5
      default:
        return 1
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-harmony-50 via-connection-50 to-growth-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header with Progress */}
        {currentStep !== 'complete' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Button
                onClick={handleBack}
                variant="ghost"
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <div className="text-sm text-gray-600">
                Step {getStepNumber()} of 5
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-connection-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(getStepNumber() / 5) * 100}%` }}
              />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 text-center">
              {getStepTitle()}
            </h1>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 'jurisdiction' && (
              <JurisdictionSelector
                onJurisdictionSelected={handleJurisdictionSelected}
                onError={setError}
                autoDetect={true}
              />
            )}

            {currentStep === 'safety_resources' && jurisdiction && (
              <SafetyResourcesIntro
                userId={userId}
                jurisdiction={jurisdiction.code}
                onComplete={handleSafetyResourcesComplete}
              />
            )}

            {currentStep === 'registration' && (
              <RegistrationFlow
                onComplete={handleRegistrationComplete}
                jurisdiction={jurisdiction?.code || 'US'}
                disabled={loading}
              />
            )}

            {currentStep === 'safety_onboarding' && userId && (
              <SafetyOnboarding
                userId={userId}
                jurisdiction={jurisdiction?.code || 'US'}
                onComplete={handleSafetyOnboardingComplete}
                onBack={handleBack}
              />
            )}

            {currentStep === 'complete' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-6">
                  <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to Sparq Connection!
                </h1>
                
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Your account has been created successfully. You're now ready to begin your 
                  relationship wellness journey with full safety protections in place.
                </p>

                <div className="text-sm text-gray-500">
                  Redirecting to your dashboard...
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}