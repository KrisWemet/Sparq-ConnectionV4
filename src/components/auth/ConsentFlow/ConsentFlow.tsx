'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Shield, Brain, Heart, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { consentManager, type ConsentRequirement, type ConsentFormData } from '@/lib/auth/consent-management'
import { motion, AnimatePresence } from 'framer-motion'

interface ConsentFlowProps {
  userId?: string
  onComplete: (consents: ConsentFormData) => void
  onCancel?: () => void
  showOptional?: boolean
}

interface ConsentItemProps {
  requirement: ConsentRequirement
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

const ConsentItem: React.FC<ConsentItemProps> = ({ requirement, checked, onChange, disabled }) => {
  const [showDetails, setShowDetails] = useState(false)
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'safety_monitoring':
      case 'crisis_intervention':
        return <Shield className="h-5 w-5 text-trust-500" />
      case 'ai_content_analysis':
      case 'data_processing':
        return <Brain className="h-5 w-5 text-connection-500" />
      case 'professional_referral':
        return <Heart className="h-5 w-5 text-growth-500" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }

  const getBadgeColor = (legalBasis: string) => {
    switch (legalBasis) {
      case 'vital_interests':
        return 'bg-crisis-100 text-crisis-800 border-crisis-200'
      case 'consent':
        return 'bg-connection-100 text-connection-800 border-connection-200'
      case 'legitimate_interests':
        return 'bg-trust-100 text-trust-800 border-trust-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`mb-4 transition-all duration-200 ${
        checked ? 'ring-2 ring-connection-200 border-connection-300' : 'hover:border-gray-300'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start space-x-3">
            <div className="flex items-center space-x-3 flex-1">
              {getIcon(requirement.type)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium">
                    {requirement.title}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {requirement.required && (
                      <Badge variant="outline" className="bg-crisis-50 text-crisis-700 border-crisis-200">
                        Required
                      </Badge>
                    )}
                    <Badge variant="outline" className={getBadgeColor(requirement.legalBasis)}>
                      {requirement.legalBasis.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="mt-2 text-gray-600">
                  {requirement.description}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex items-start space-x-3">
            <Checkbox
              id={requirement.type}
              checked={checked}
              onCheckedChange={onChange}
              disabled={disabled || requirement.type === 'crisis_intervention'}
              className="mt-1"
            />
            <div className="flex-1">
              <label
                htmlFor={requirement.type}
                className="text-sm font-medium text-gray-900 cursor-pointer"
              >
                I consent to {requirement.title.toLowerCase()}
                {requirement.type === 'crisis_intervention' && (
                  <span className="text-crisis-600 ml-2">(Required for safety)</span>
                )}
              </label>
              
              {requirement.consequences && (
                <p className="text-sm text-gray-500 mt-1">
                  {requirement.consequences}
                </p>
              )}

              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-connection-600 hover:text-connection-700 mt-2 font-medium"
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </button>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-3 bg-gray-50 rounded-md"
                  >
                    <div className="space-y-2 text-xs text-gray-600">
                      <p><strong>Legal basis:</strong> {requirement.legalBasis.replace('_', ' ')}</p>
                      {requirement.withdrawalInstructions && (
                        <p><strong>How to withdraw:</strong> {requirement.withdrawalInstructions}</p>
                      )}
                      {requirement.consequences && (
                        <p><strong>If you don't consent:</strong> {requirement.consequences}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export const ConsentFlow: React.FC<ConsentFlowProps> = ({
  userId,
  onComplete,
  onCancel,
  showOptional = true
}) => {
  const [requirements, setRequirements] = useState<ConsentRequirement[]>([])
  const [consents, setConsents] = useState<ConsentFormData>({
    safetyMonitoring: false,
    aiContentAnalysis: false,
    crisisIntervention: true, // Always true, cannot be opted out
    professionalReferral: false,
    analyticsCollection: false,
    marketingCommunications: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    loadConsentRequirements()
  }, [])

  const loadConsentRequirements = async () => {
    try {
      setLoading(true)
      const reqs = await consentManager.getConsentRequirements()
      setRequirements(reqs)

      // Load existing consents if user is provided
      if (userId) {
        const existingConsents = await consentManager.getConsentFormData(userId)
        setConsents(existingConsents)
      }
    } catch (err) {
      console.error('Error loading consent requirements:', err)
      setError('Failed to load consent requirements. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleConsentChange = (type: keyof ConsentFormData, value: boolean) => {
    const newConsents = { ...consents, [type]: value }
    setConsents(newConsents)

    // Show warning if user is trying to disable safety features
    if ((type === 'safetyMonitoring' || type === 'aiContentAnalysis') && !value) {
      setShowWarning(true)
    } else {
      setShowWarning(false)
    }
  }

  const canProceed = () => {
    // Check if all required consents are granted
    const requiredConsents = requirements.filter(r => r.required)
    return requiredConsents.every(req => {
      switch (req.type) {
        case 'safety_monitoring':
          return consents.safetyMonitoring
        case 'ai_content_analysis':
          return consents.aiContentAnalysis
        case 'crisis_intervention':
          return consents.crisisIntervention
        case 'data_processing':
          return true // Implicit for platform usage
        default:
          return true
      }
    })
  }

  const handleComplete = () => {
    if (canProceed()) {
      onComplete(consents)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert className="border-crisis-200 bg-crisis-50">
          <AlertTriangle className="h-4 w-4 text-crisis-600" />
          <AlertDescription className="text-crisis-800">
            {error}
          </AlertDescription>
        </Alert>
        <Button onClick={loadConsentRequirements} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  const requiredRequirements = requirements.filter(r => r.required)
  const optionalRequirements = requirements.filter(r => !r.required)

  return (
    <div className="max-w-2xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-connection-100 rounded-full">
              <Shield className="h-8 w-8 text-connection-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Privacy & Safety Consent
          </h1>
          <p className="text-lg text-gray-600 max-w-lg mx-auto">
            We believe in transparency. Please review and consent to how we'll help keep you safe 
            while protecting your privacy.
          </p>
        </div>

        {/* Safety-first messaging */}
        <Alert className="mb-6 border-trust-200 bg-trust-50">
          <Info className="h-4 w-4 text-trust-600" />
          <AlertDescription className="text-trust-800">
            <strong>Your safety comes first.</strong> We use advanced technology to detect potential 
            safety concerns and provide appropriate resources. You're always in control of your privacy settings.
          </AlertDescription>
        </Alert>

        {/* Required consents */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle2 className="h-5 w-5 text-growth-500 mr-2" />
            Essential Safety Features
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            These features are required to ensure your safety and provide core platform functionality.
          </p>
          
          {requiredRequirements.map(req => (
            <ConsentItem
              key={req.type}
              requirement={req}
              checked={
                req.type === 'safety_monitoring' ? consents.safetyMonitoring :
                req.type === 'ai_content_analysis' ? consents.aiContentAnalysis :
                req.type === 'crisis_intervention' ? consents.crisisIntervention :
                true
              }
              onChange={(checked) => {
                if (req.type === 'safety_monitoring') {
                  handleConsentChange('safetyMonitoring', checked)
                } else if (req.type === 'ai_content_analysis') {
                  handleConsentChange('aiContentAnalysis', checked)
                }
              }}
              disabled={req.type === 'crisis_intervention'}
            />
          ))}
        </div>

        {/* Optional consents */}
        {showOptional && optionalRequirements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Info className="h-5 w-5 text-connection-500 mr-2" />
              Optional Features
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              These features enhance your experience but are not required. You can change these settings anytime.
            </p>
            
            {optionalRequirements.map(req => (
              <ConsentItem
                key={req.type}
                requirement={req}
                checked={
                  req.type === 'professional_referral' ? consents.professionalReferral :
                  req.type === 'analytics_collection' ? consents.analyticsCollection :
                  req.type === 'marketing_communications' ? consents.marketingCommunications :
                  false
                }
                onChange={(checked) => {
                  if (req.type === 'professional_referral') {
                    handleConsentChange('professionalReferral', checked)
                  } else if (req.type === 'analytics_collection') {
                    handleConsentChange('analyticsCollection', checked)
                  } else if (req.type === 'marketing_communications') {
                    handleConsentChange('marketingCommunications', checked)
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Safety warning */}
        <AnimatePresence>
          {showWarning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Safety Notice:</strong> Disabling safety monitoring means we cannot provide 
                  proactive crisis support or personalized safety resources. You can always re-enable 
                  these features in your privacy settings.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
          <Button
            onClick={handleComplete}
            disabled={!canProceed()}
            className="flex-1 bg-connection-500 hover:bg-connection-600"
          >
            {canProceed() ? 'Complete Setup' : 'Please accept required consents'}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
        </div>

        {/* Legal footer */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            By proceeding, you acknowledge that you have read and understood our approach to safety monitoring. 
            You can modify these preferences anytime in your privacy settings. This is a wellness platform, 
            not a substitute for professional therapy or emergency services.
          </p>
        </div>
      </motion.div>
    </div>
  )
}