'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  Heart, 
  Users, 
  Phone, 
  AlertTriangle, 
  CheckCircle,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Info,
  ExternalLink,
  MessageCircle
} from 'lucide-react'
import { SafetyIntegrator } from '@/lib/auth/safety-integration'
import { motion, AnimatePresence } from 'framer-motion'

interface SafetyOnboardingProps {
  userId: string
  jurisdiction?: string
  onComplete: (safetyProfile: SafetyProfile) => void
  onBack?: () => void
}

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

interface JurisdictionInfo {
  code: string
  name: string
  emergencyNumber: string
  crisisResources: Array<{
    name: string
    contact: string
    type: 'hotline' | 'text' | 'chat'
  }>
  domesticViolenceResources: Array<{
    name: string
    contact: string
    website?: string
  }>
}

export const SafetyOnboarding: React.FC<SafetyOnboardingProps> = ({
  userId,
  jurisdiction = 'US',
  onComplete,
  onBack
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jurisdictionInfo, setJurisdictionInfo] = useState<JurisdictionInfo | null>(null)
  const [safetyProfile, setSafetyProfile] = useState<SafetyProfile>({
    jurisdictionConfirmed: jurisdiction,
    crisisResourcesFamiliar: false,
    partnerSafetyDiscussed: false,
    escalationPathwaysUnderstood: false,
    emergencyContactsConfigured: false,
    domesticViolenceAwareness: false,
    privacyRightsUnderstood: false,
    helpSeekingNormalized: false
  })

  const safetyIntegration = new SafetyIntegrator()

  useEffect(() => {
    loadJurisdictionInfo()
  }, [jurisdiction])

  const loadJurisdictionInfo = async () => {
    setLoading(true)
    try {
      const emergencyProtocol = await safetyIntegration.getEmergencyProtocol(jurisdiction)
      
      // Mock jurisdiction data (would come from database)
      const info: JurisdictionInfo = {
        code: jurisdiction,
        name: jurisdiction === 'US' ? 'United States' : jurisdiction,
        emergencyNumber: jurisdiction === 'US' ? '911' : '112',
        crisisResources: [
          {
            name: 'National Suicide Prevention Lifeline',
            contact: '988',
            type: 'hotline'
          },
          {
            name: 'Crisis Text Line',
            contact: 'Text HOME to 741741',
            type: 'text'
          }
        ],
        domesticViolenceResources: [
          {
            name: 'National Domestic Violence Hotline',
            contact: '1-800-799-7233',
            website: 'https://www.thehotline.org'
          }
        ]
      }
      
      setJurisdictionInfo(info)
    } catch (err) {
      setError('Failed to load safety information for your jurisdiction')
    } finally {
      setLoading(false)
    }
  }

  const updateSafetyProfile = (updates: Partial<SafetyProfile>) => {
    setSafetyProfile(prev => ({ ...prev, ...updates }))
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else {
      onBack?.()
    }
  }

  const handleComplete = () => {
    onComplete(safetyProfile)
  }

  const steps = [
    {
      id: 'jurisdiction',
      title: 'Location & Resources',
      description: 'Confirm your location for appropriate safety resources'
    },
    {
      id: 'crisis_resources',
      title: 'Crisis Support Resources',
      description: 'Familiarize yourself with immediate help resources'
    },
    {
      id: 'domestic_violence',
      title: 'Domestic Violence Awareness',
      description: 'Important information about relationship safety'
    },
    {
      id: 'escalation_pathways',
      title: 'How We Handle Crises',
      description: 'Understanding our safety monitoring and response'
    },
    {
      id: 'partner_safety',
      title: 'Partner Safety Discussions',
      description: 'Guidelines for safety conversations with your partner'
    },
    {
      id: 'help_seeking',
      title: 'Normalizing Help-Seeking',
      description: 'Breaking down barriers to getting support'
    }
  ]

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Safety First Onboarding</h1>
        <p className="text-gray-600">
          Your safety is our top priority. Let's ensure you have the information and resources you need.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-connection-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        <div className="mt-2 text-center">
          <h2 className="text-lg font-semibold">{steps[currentStep].title}</h2>
          <p className="text-gray-600 text-sm">{steps[currentStep].description}</p>
        </div>
      </div>

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
          <Card>
            <CardContent className="p-8">
              {/* Step 0: Jurisdiction Confirmation */}
              {currentStep === 0 && jurisdictionInfo && (
                <div className="space-y-6">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Confirm Your Location</h3>
                    <p className="text-gray-600">
                      We've detected you're in <strong>{jurisdictionInfo.name}</strong>. 
                      This helps us provide appropriate emergency resources and comply with local privacy laws.
                    </p>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Emergency Services:</strong> In case of immediate danger, call {jurisdictionInfo.emergencyNumber}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="jurisdictionConfirm"
                        checked={safetyProfile.jurisdictionConfirmed === jurisdictionInfo.code}
                        onCheckedChange={(checked) => 
                          updateSafetyProfile({ 
                            jurisdictionConfirmed: checked ? jurisdictionInfo.code : '' 
                          })
                        }
                      />
                      <label htmlFor="jurisdictionConfirm" className="text-sm font-medium leading-none">
                        Yes, I'm currently located in {jurisdictionInfo.name}
                      </label>
                    </div>
                    
                    <p className="text-xs text-gray-500 ml-6">
                      If your location is incorrect, please contact support to update your jurisdiction.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 1: Crisis Resources */}
              {currentStep === 1 && jurisdictionInfo && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Phone className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Crisis Support Resources</h3>
                    <p className="text-gray-600">
                      These resources are available 24/7 if you or your partner need immediate support.
                    </p>
                  </div>

                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>Remember:</strong> Using these resources is a sign of strength, not weakness. 
                      Professional crisis counselors are trained to help.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    {jurisdictionInfo.crisisResources.map((resource, index) => (
                      <div key={index} className="p-4 border-l-4 border-l-red-500 bg-red-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-red-900">{resource.name}</h4>
                            <p className="text-red-700 font-mono text-lg">{resource.contact}</p>
                          </div>
                          <Badge variant="destructive">24/7</Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="crisisResourcesFamiliar"
                      checked={safetyProfile.crisisResourcesFamiliar}
                      onCheckedChange={(checked) => 
                        updateSafetyProfile({ crisisResourcesFamiliar: !!checked })
                      }
                    />
                    <label htmlFor="crisisResourcesFamiliar" className="text-sm font-medium leading-none">
                      I have familiarized myself with these crisis resources and understand they are available 24/7
                    </label>
                  </div>
                </div>
              )}

              {/* Step 2: Domestic Violence Awareness */}
              {currentStep === 2 && jurisdictionInfo && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Shield className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Relationship Safety Awareness</h3>
                    <p className="text-gray-600">
                      Understanding the signs of unhealthy relationships and available support.
                    </p>
                  </div>

                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      <strong>Important:</strong> Relationship monitoring technology could potentially be misused 
                      in abusive situations. Your individual safety always takes priority.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Warning Signs of Abuse:</h4>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• Excessive monitoring or controlling behavior</li>
                        <li>• Isolation from friends, family, or support systems</li>
                        <li>• Threats, intimidation, or physical violence</li>
                        <li>• Extreme jealousy or possessiveness</li>
                        <li>• Financial control or sabotage</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-blue-50 border-l-4 border-l-blue-500">
                      <h4 className="font-semibold text-blue-900 mb-2">Domestic Violence Resources:</h4>
                      {jurisdictionInfo.domesticViolenceResources.map((resource, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-900 font-semibold">{resource.name}</p>
                            <p className="text-blue-700 font-mono">{resource.contact}</p>
                          </div>
                          {resource.website && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(resource.website, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Website
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="domesticViolenceAwareness"
                      checked={safetyProfile.domesticViolenceAwareness}
                      onCheckedChange={(checked) => 
                        updateSafetyProfile({ domesticViolenceAwareness: !!checked })
                      }
                    />
                    <label htmlFor="domesticViolenceAwareness" className="text-sm font-medium leading-none">
                      I understand the warning signs of abuse and know that specialized resources are available
                    </label>
                  </div>
                </div>
              )}

              {/* Step 3: Escalation Pathways */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">How We Handle Safety Concerns</h3>
                    <p className="text-gray-600">
                      Understanding our crisis detection and professional intervention process.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Automated Safety Monitoring:</h4>
                      <p className="text-sm text-gray-700 mb-2">
                        Our AI system monitors conversations for crisis indicators including:
                      </p>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4">
                        <li>• Suicidal thoughts or self-harm ideation</li>
                        <li>• Severe mental health crisis indicators</li>
                        <li>• Domestic violence or abuse situations</li>
                        <li>• Substance abuse emergencies</li>
                      </ul>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Crisis Response Protocol:</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold text-red-600">1</div>
                          <span className="text-sm">Immediate crisis resources provided</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold text-red-600">2</div>
                          <span className="text-sm">Licensed professional contacted (when appropriate)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold text-red-600">3</div>
                          <span className="text-sm">Follow-up support and safety planning</span>
                        </div>
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Privacy Note:</strong> Crisis interventions prioritize your individual safety. 
                        Your partner will only be notified if you explicitly consent or there is immediate danger.
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="escalationPathwaysUnderstood"
                      checked={safetyProfile.escalationPathwaysUnderstood}
                      onCheckedChange={(checked) => 
                        updateSafetyProfile({ escalationPathwaysUnderstood: !!checked })
                      }
                    />
                    <label htmlFor="escalationPathwaysUnderstood" className="text-sm font-medium leading-none">
                      I understand how crisis situations are detected and handled by this platform
                    </label>
                  </div>
                </div>
              )}

              {/* Step 4: Partner Safety Discussions */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Partner Safety Discussions</h3>
                    <p className="text-gray-600">
                      Guidelines for healthy safety conversations with your partner.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Alert>
                      <Heart className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Remember:</strong> Safety discussions should feel supportive, not controlling. 
                        Both partners should feel comfortable seeking help individually.
                      </AlertDescription>
                    </Alert>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-3">Healthy Safety Discussion Topics:</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Mental Health Check-ins</p>
                            <p className="text-xs text-gray-600">Regular, non-judgmental conversations about emotional wellbeing</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Crisis Resource Sharing</p>
                            <p className="text-xs text-gray-600">Both partners knowing available professional resources</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Individual Privacy Rights</p>
                            <p className="text-xs text-gray-600">Respecting each other's right to seek individual support</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Monitoring Boundaries</p>
                            <p className="text-xs text-gray-600">Clear agreements about platform safety features</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 border-l-4 border-l-amber-400">
                      <h4 className="font-semibold text-amber-800 mb-2">⚠️ Red Flags in Safety Discussions:</h4>
                      <ul className="text-sm text-amber-700 space-y-1">
                        <li>• Demanding access to all personal communications</li>
                        <li>• Forbidding individual therapy or crisis support</li>
                        <li>• Threats related to safety monitoring</li>
                        <li>• Using platform features to control rather than support</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="partnerSafetyDiscussed"
                      checked={safetyProfile.partnerSafetyDiscussed}
                      onCheckedChange={(checked) => 
                        updateSafetyProfile({ partnerSafetyDiscussed: !!checked })
                      }
                    />
                    <label htmlFor="partnerSafetyDiscussed" className="text-sm font-medium leading-none">
                      I understand how to have healthy safety discussions and recognize unhealthy control patterns
                    </label>
                  </div>
                </div>
              )}

              {/* Step 5: Help-Seeking Normalization */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Heart className="h-12 w-12 text-pink-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Help-Seeking is Strength</h3>
                    <p className="text-gray-600">
                      Normalizing professional support as part of relationship wellness.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <strong>Truth:</strong> Seeking help shows self-awareness, courage, and commitment 
                        to your wellbeing and relationship health.
                      </AlertDescription>
                    </Alert>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2 text-green-700">✓ Helpful Mindsets:</h4>
                        <ul className="text-sm space-y-1">
                          <li>• "Therapy is preventive care for mental health"</li>
                          <li>• "Professional help provides tools I can't get elsewhere"</li>
                          <li>• "Taking care of myself helps my relationship"</li>
                          <li>• "Everyone faces challenges that benefit from support"</li>
                        </ul>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2 text-red-700">✗ Harmful Barriers:</h4>
                        <ul className="text-sm space-y-1">
                          <li>• "Asking for help means I'm weak"</li>
                          <li>• "We should be able to handle this alone"</li>
                          <li>• "Therapy means our relationship is failing"</li>
                          <li>• "I don't want to burden anyone"</li>
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 border-l-4 border-l-blue-500">
                      <h4 className="font-semibold text-blue-900 mb-2">When to Seek Professional Help:</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-blue-800 mb-1">Individual Support:</p>
                          <ul className="text-xs text-blue-700 space-y-1">
                            <li>• Persistent sadness or anxiety</li>
                            <li>• Significant life changes</li>
                            <li>• Trauma or past experiences affecting you</li>
                            <li>• Wanting to develop coping skills</li>
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-800 mb-1">Couples Support:</p>
                          <ul className="text-xs text-blue-700 space-y-1">
                            <li>• Communication difficulties</li>
                            <li>• Recurring conflicts</li>
                            <li>• Major relationship transitions</li>
                            <li>• Wanting to strengthen your bond</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="helpSeekingNormalized"
                        checked={safetyProfile.helpSeekingNormalized}
                        onCheckedChange={(checked) => 
                          updateSafetyProfile({ helpSeekingNormalized: !!checked })
                        }
                      />
                      <label htmlFor="helpSeekingNormalized" className="text-sm font-medium leading-none">
                        I understand that seeking professional help is a sign of strength and commitment to wellness
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="privacyRightsUnderstood"
                        checked={safetyProfile.privacyRightsUnderstood}
                        onCheckedChange={(checked) => 
                          updateSafetyProfile({ privacyRightsUnderstood: !!checked })
                        }
                      />
                      <label htmlFor="privacyRightsUnderstood" className="text-sm font-medium leading-none">
                        I understand my right to seek individual support privately, without partner notification
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          onClick={prevStep}
          variant="outline"
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? 'Back to Registration' : 'Previous'}
        </Button>

        <Button
          onClick={nextStep}
          disabled={loading || !isStepComplete(currentStep)}
          className="bg-connection-500 hover:bg-connection-600"
        >
          {currentStep === steps.length - 1 ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Safety Onboarding
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )

  function isStepComplete(stepIndex: number): boolean {
    switch (stepIndex) {
      case 0:
        return !!safetyProfile.jurisdictionConfirmed
      case 1:
        return safetyProfile.crisisResourcesFamiliar
      case 2:
        return safetyProfile.domesticViolenceAwareness
      case 3:
        return safetyProfile.escalationPathwaysUnderstood
      case 4:
        return safetyProfile.partnerSafetyDiscussed
      case 5:
        return safetyProfile.helpSeekingNormalized && safetyProfile.privacyRightsUnderstood
      default:
        return false
    }
  }
}