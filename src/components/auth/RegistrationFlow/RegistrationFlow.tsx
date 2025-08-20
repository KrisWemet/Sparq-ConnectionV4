'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WelcomeStep } from './WelcomeStep'
import { SafetyExplanationStep } from './SafetyExplanationStep'
import { ConsentStep } from './ConsentStep'
import { ArchetypeSelectionStep } from './ArchetypeSelectionStep'
import { ProfileSetupStep } from './ProfileSetupStep'
import { JurisdictionDetectionStep } from './JurisdictionDetectionStep'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

export interface RegistrationData {
  email: string
  password: string
  displayName: string
  timezone: string
  relationshipStatus: 'single' | 'dating' | 'partnered' | 'married' | 'separated' | 'complicated'
  archetype: {
    communicationStyle: string
    conflictResolutionStyle: string
    lovLanguagePrimary: string
    attachmentStyle: string
  }
  consents: {
    safetyMonitoring: boolean
    aiContentAnalysis: boolean
    crisisIntervention: boolean
    professionalReferral: boolean
    analyticsCollection: boolean
    marketingCommunications: boolean
  }
  jurisdiction: {
    countryCode: string
    stateProvince?: string
    detectedLocation: string
    confirmedByUser: boolean
  }
  privacyLevel: 'minimal' | 'standard' | 'enhanced'
}

interface RegistrationFlowProps {
  onComplete: (data: RegistrationData) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<RegistrationData>
}

type RegistrationStep = 
  | 'welcome'
  | 'safety_explanation'
  | 'jurisdiction_detection'
  | 'profile_setup'
  | 'archetype_selection'
  | 'consent'
  | 'summary'

const STEP_ORDER: RegistrationStep[] = [
  'welcome',
  'safety_explanation', 
  'jurisdiction_detection',
  'profile_setup',
  'archetype_selection',
  'consent',
  'summary'
]

const STEP_TITLES = {
  welcome: 'Welcome',
  safety_explanation: 'Safety First',
  jurisdiction_detection: 'Location Setup',
  profile_setup: 'Your Profile',
  archetype_selection: 'Relationship Style',
  consent: 'Privacy & Consent',
  summary: 'Review & Complete'
}

export const RegistrationFlow: React.FC<RegistrationFlowProps> = ({
  onComplete,
  onCancel,
  initialData
}) => {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('welcome')
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    email: '',
    password: '',
    displayName: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    relationshipStatus: 'single',
    archetype: {
      communicationStyle: '',
      conflictResolutionStyle: '',
      lovLanguagePrimary: '',
      attachmentStyle: ''
    },
    consents: {
      safetyMonitoring: false,
      aiContentAnalysis: false,
      crisisIntervention: true,
      professionalReferral: false,
      analyticsCollection: false,
      marketingCommunications: false
    },
    jurisdiction: {
      countryCode: '',
      detectedLocation: '',
      confirmedByUser: false
    },
    privacyLevel: 'standard',
    ...initialData
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStepIndex = STEP_ORDER.indexOf(currentStep)
  const canGoBack = currentStepIndex > 0
  const isLastStep = currentStepIndex === STEP_ORDER.length - 1

  const nextStep = () => {
    if (currentStepIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentStepIndex + 1])
      setError(null)
    }
  }

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEP_ORDER[currentStepIndex - 1])
      setError(null)
    }
  }

  const updateRegistrationData = (updates: Partial<RegistrationData>) => {
    setRegistrationData(prev => ({ ...prev, ...updates }))
  }

  const handleStepComplete = (stepData: any) => {
    updateRegistrationData(stepData)
    if (isLastStep) {
      handleFinalSubmit()
    } else {
      nextStep()
    }
  }

  const handleFinalSubmit = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await onComplete(registrationData)
    } catch (err) {
      console.error('Registration error:', err)
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isStepValid = (): boolean => {
    switch (currentStep) {
      case 'welcome':
        return true
      case 'safety_explanation':
        return true
      case 'jurisdiction_detection':
        return !!registrationData.jurisdiction.countryCode
      case 'profile_setup':
        return !!(registrationData.email && registrationData.password && registrationData.displayName)
      case 'archetype_selection':
        return !!(
          registrationData.archetype.communicationStyle &&
          registrationData.archetype.conflictResolutionStyle &&
          registrationData.archetype.lovLanguagePrimary &&
          registrationData.archetype.attachmentStyle
        )
      case 'consent':
        return registrationData.consents.safetyMonitoring && registrationData.consents.aiContentAnalysis
      case 'summary':
        return true
      default:
        return false
    }
  }

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStepIndex + 1} of {STEP_ORDER.length}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round(((currentStepIndex + 1) / STEP_ORDER.length) * 100)}% Complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div 
          className="bg-connection-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStepIndex + 1) / STEP_ORDER.length) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <div className="flex justify-between mt-3 text-xs">
        {STEP_ORDER.map((step, index) => (
          <div key={step} className="flex flex-col items-center">
            <div 
              className={`w-2 h-2 rounded-full transition-colors ${
                index <= currentStepIndex ? 'bg-connection-500' : 'bg-gray-300'
              }`}
            />
            <span className={`mt-1 text-center max-w-16 ${
              index === currentStepIndex ? 'text-connection-600 font-medium' : 'text-gray-500'
            }`}>
              {STEP_TITLES[step]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  const renderStep = () => {
    const stepProps = {
      data: registrationData,
      onComplete: handleStepComplete,
      onBack: canGoBack ? prevStep : undefined
    }

    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep {...stepProps} />
      case 'safety_explanation':
        return <SafetyExplanationStep {...stepProps} />
      case 'jurisdiction_detection':
        return <JurisdictionDetectionStep {...stepProps} />
      case 'profile_setup':
        return <ProfileSetupStep {...stepProps} />
      case 'archetype_selection':
        return <ArchetypeSelectionStep {...stepProps} />
      case 'consent':
        return <ConsentStep {...stepProps} />
      case 'summary':
        return <SummaryStep {...stepProps} isLoading={isLoading} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {renderProgressBar()}
        
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-crisis-200 bg-crisis-50">
              <CardContent className="p-4">
                <p className="text-crisis-800 text-sm">{error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation footer */}
        <div className="mt-8 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={canGoBack ? prevStep : onCancel}
            disabled={isLoading}
          >
            {canGoBack ? (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </>
            ) : (
              'Cancel'
            )}
          </Button>

          <div className="text-sm text-gray-500">
            {currentStep !== 'summary' && (
              <Button
                onClick={() => handleStepComplete({})}
                disabled={!isStepValid() || isLoading}
                className="bg-connection-500 hover:bg-connection-600"
              >
                {isLastStep ? (
                  isLoading ? (
                    'Creating Account...'
                  ) : (
                    <>
                      Complete Registration
                      <Check className="h-4 w-4 ml-2" />
                    </>
                  )
                ) : (
                  <>
                    Continue
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Summary step component
const SummaryStep: React.FC<{
  data: RegistrationData
  onComplete: (data: any) => void
  isLoading: boolean
}> = ({ data, onComplete, isLoading }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl text-center">Ready to Begin!</CardTitle>
        <CardDescription className="text-center">
          Review your preferences and complete your registration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary content */}
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900">Profile</h3>
            <p className="text-sm text-gray-600">{data.displayName} • {data.relationshipStatus}</p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900">Safety & Privacy</h3>
            <p className="text-sm text-gray-600">
              Safety monitoring: {data.consents.safetyMonitoring ? 'Enabled' : 'Disabled'} • 
              Privacy level: {data.privacyLevel}
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900">Location</h3>
            <p className="text-sm text-gray-600">{data.jurisdiction.detectedLocation}</p>
          </div>
        </div>

        <Button
          onClick={() => onComplete(data)}
          disabled={isLoading}
          className="w-full bg-connection-500 hover:bg-connection-600"
          size="lg"
        >
          {isLoading ? 'Creating Your Account...' : 'Complete Registration'}
        </Button>
      </CardContent>
    </Card>
  )
}