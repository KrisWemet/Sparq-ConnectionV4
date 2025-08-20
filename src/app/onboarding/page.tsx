'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle, Heart, Shield, User, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RelationshipArchetype } from '@/types/database.types'

type OnboardingStep = 'welcome' | 'profile' | 'archetype' | 'jurisdiction' | 'consent' | 'safety' | 'complete'

interface ProfileData {
  firstName: string
  lastName: string
  ageRange: string
  relationshipLengthMonths: number | null
}

interface ArchetypeData {
  selectedArchetype: RelationshipArchetype | null
}

interface JurisdictionData {
  locationRegion: string
  languagePreference: string
}

interface ConsentData {
  safetyMonitoringConsent: boolean
  dataProcessingConsent: boolean
  researchParticipation: boolean
  dataAnalyticsConsent: boolean
  consentVersion: string
}

interface SafetyData {
  emergencyContactName: string
  emergencyContactPhone: string
  domesticViolenceAwareness: boolean
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    ageRange: '',
    relationshipLengthMonths: null
  })
  
  const [archetypeData, setArchetypeData] = useState<ArchetypeData>({
    selectedArchetype: null
  })
  
  const [jurisdictionData, setJurisdictionData] = useState<JurisdictionData>({
    locationRegion: '',
    languagePreference: 'en'
  })
  
  const [consentData, setConsentData] = useState<ConsentData>({
    safetyMonitoringConsent: false,
    dataProcessingConsent: false,
    researchParticipation: false,
    dataAnalyticsConsent: false,
    consentVersion: '1.0'
  })
  
  const [safetyData, setSafetyData] = useState<SafetyData>({
    emergencyContactName: '',
    emergencyContactPhone: '',
    domesticViolenceAwareness: false
  })
  
  const router = useRouter()

  useEffect(() => {
    checkAuthAndLoadUser()
  }, [])

  const checkAuthAndLoadUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Check if user already has a profile (completed onboarding)
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!profileError && existingProfile?.onboarding_completed) {
        router.push('/dashboard')
        return
      }

      setUser(session.user)
      
      // Pre-fill with any existing data
      if (existingProfile) {
        setProfileData({
          firstName: existingProfile.first_name || '',
          lastName: existingProfile.last_name || '',
          ageRange: existingProfile.age_range || '',
          relationshipLengthMonths: null
        })
        setArchetypeData({
          selectedArchetype: existingProfile.archetype
        })
        setJurisdictionData({
          locationRegion: existingProfile.location_region || '',
          languagePreference: existingProfile.language_preference || 'en'
        })
      }

    } catch (err) {
      console.error('Error checking authentication:', err)
      setError('Failed to load onboarding data. Please try again.')
    }
  }

  const handleNextStep = () => {
    const steps: OnboardingStep[] = ['welcome', 'profile', 'archetype', 'jurisdiction', 'consent', 'safety', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handlePrevStep = () => {
    const steps: OnboardingStep[] = ['welcome', 'profile', 'archetype', 'jurisdiction', 'consent', 'safety', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const canProceedFromProfile = () => {
    return profileData.firstName.trim() && 
           profileData.lastName.trim() && 
           profileData.ageRange.trim()
  }

  const canProceedFromArchetype = () => {
    return archetypeData.selectedArchetype !== null
  }

  const canProceedFromJurisdiction = () => {
    return jurisdictionData.locationRegion.trim()
  }

  const canProceedFromConsent = () => {
    return consentData.safetyMonitoringConsent && 
           consentData.dataProcessingConsent
  }

  const canProceedFromSafety = () => {
    return safetyData.domesticViolenceAwareness
  }

  const handleCompleteOnboarding = async () => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      // Create or update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          age_range: profileData.ageRange,
          archetype: archetypeData.selectedArchetype,
          location_region: jurisdictionData.locationRegion,
          language_preference: jurisdictionData.languagePreference,
          safety_monitoring_enabled: consentData.safetyMonitoringConsent,
          data_sharing_analytics: consentData.dataAnalyticsConsent,
          data_sharing_research: consentData.researchParticipation,
          emergency_contact_name: safetyData.emergencyContactName || null,
          emergency_contact_phone: safetyData.emergencyContactPhone || null,
          onboarding_completed: true,
          subscription_tier: 'free'
        })

      if (profileError) throw profileError

      // Record detailed consents for audit trail
      const consentRecords = [
        { 
          consent_type: 'safety_monitoring', 
          granted: consentData.safetyMonitoringConsent,
          consent_version: consentData.consentVersion,
          legal_basis: 'legitimate_interest'
        },
        { 
          consent_type: 'data_processing', 
          granted: consentData.dataProcessingConsent,
          consent_version: consentData.consentVersion,
          legal_basis: 'consent'
        },
        { 
          consent_type: 'research_participation', 
          granted: consentData.researchParticipation,
          consent_version: consentData.consentVersion,
          legal_basis: 'consent'
        },
        { 
          consent_type: 'analytics', 
          granted: consentData.dataAnalyticsConsent,
          consent_version: consentData.consentVersion,
          legal_basis: 'legitimate_interest'
        }
      ]

      for (const consent of consentRecords) {
        const { error: consentError } = await supabase.from('consents').insert({
          user_id: user.id,
          consent_type: consent.consent_type,
          consent_version: consent.consent_version,
          granted: consent.granted,
          legal_basis: consent.legal_basis,
          ip_address: null, // Could be captured from request headers
          user_agent: navigator.userAgent
        })
        
        if (consentError) {
          console.error(`Error recording ${consent.consent_type} consent:`, consentError)
        }
      }

      setCurrentStep('complete')
      
      // Redirect to dashboard after brief success message
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)

    } catch (err) {
      console.error('Error completing onboarding:', err)
      setError('Failed to complete onboarding. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStepNumber = () => {
    const steps = ['welcome', 'profile', 'archetype', 'jurisdiction', 'consent', 'safety', 'complete']
    return steps.indexOf(currentStep) + 1
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'welcome': return 'Welcome to Sparq Connection'
      case 'profile': return 'Basic Information'
      case 'archetype': return 'Relationship Style'
      case 'jurisdiction': return 'Location & Language'
      case 'consent': return 'Privacy & Safety Consent'
      case 'safety': return 'Safety Awareness'
      case 'complete': return 'Welcome!'
      default: return 'Onboarding'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-harmony-50 via-connection-50 to-growth-50">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        {currentStep !== 'complete' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {currentStep !== 'welcome' && (
                <Button
                  onClick={handlePrevStep}
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-800"
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              
              <div className="text-sm text-gray-600">
                Step {getStepNumber()} of 7
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(getStepNumber() / 7) * 100}%` }}
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
            {/* Welcome Step */}
            {currentStep === 'welcome' && (
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-3 text-3xl">
                    <Heart className="h-8 w-8 text-red-500" />
                    Welcome to Sparq Connection
                  </CardTitle>
                  <CardDescription className="text-lg max-w-md mx-auto">
                    Your safety-first relationship wellness platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center space-y-4">
                    <p className="text-gray-700">
                      We're here to help you and your partner strengthen your relationship through 
                      evidence-based guidance, personalized daily activities, and a safety-first approach.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <Shield className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                        <h3 className="font-semibold text-blue-900">Safety First</h3>
                        <p className="text-sm text-blue-700">Crisis detection and support resources</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <User className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                        <h3 className="font-semibold text-purple-900">Personalized</h3>
                        <p className="text-sm text-purple-700">AI-powered relationship guidance</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <Heart className="h-6 w-6 text-green-600 mx-auto mb-2" />
                        <h3 className="font-semibold text-green-900">Evidence-Based</h3>
                        <p className="text-sm text-green-700">Backed by relationship research</p>
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div className="text-left">
                          <h4 className="font-semibold text-amber-900">Important</h4>
                          <p className="text-sm text-amber-800">
                            Sparq Connection is a wellness and education platform, not therapy or medical treatment. 
                            For crisis situations, we provide resources and referrals to licensed professionals.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleNextStep} className="w-full" size="lg">
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Profile Setup */}
            {currentStep === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>
                    This information helps us personalize your experience and match you with appropriate content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                        placeholder="Your first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                        placeholder="Your last name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="ageRange">Age Range *</Label>
                    <Select value={profileData.ageRange} onValueChange={(value) => setProfileData({...profileData, ageRange: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your age range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="18-24">18-24</SelectItem>
                        <SelectItem value="25-30">25-30</SelectItem>
                        <SelectItem value="31-35">31-35</SelectItem>
                        <SelectItem value="36-40">36-40</SelectItem>
                        <SelectItem value="41-45">41-45</SelectItem>
                        <SelectItem value="46-50">46-50</SelectItem>
                        <SelectItem value="51-55">51-55</SelectItem>
                        <SelectItem value="56-60">56-60</SelectItem>
                        <SelectItem value="60+">60+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="relationshipLength">Relationship Length (optional)</Label>
                    <Select 
                      value={profileData.relationshipLengthMonths?.toString() || ''} 
                      onValueChange={(value) => setProfileData({...profileData, relationshipLengthMonths: value ? parseInt(value) : null})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="How long have you been together?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Prefer not to say</SelectItem>
                        <SelectItem value="3">Less than 6 months</SelectItem>
                        <SelectItem value="9">6 months - 1 year</SelectItem>
                        <SelectItem value="18">1-2 years</SelectItem>
                        <SelectItem value="30">2-3 years</SelectItem>
                        <SelectItem value="48">3-5 years</SelectItem>
                        <SelectItem value="72">5-7 years</SelectItem>
                        <SelectItem value="120">7+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    onClick={handleNextStep}
                    disabled={!canProceedFromProfile()}
                    className="w-full"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Relationship Archetype Selection */}
            {currentStep === 'archetype' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Your Relationship Style
                  </CardTitle>
                  <CardDescription>
                    Choose the archetype that best describes your approach to relationships. This helps us personalize your content.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup 
                    value={archetypeData.selectedArchetype || ''} 
                    onValueChange={(value) => setArchetypeData({selectedArchetype: value as RelationshipArchetype})}
                    className="space-y-4"
                  >
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="calm_anchor" id="calm_anchor" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="calm_anchor" className="text-base font-semibold text-gray-900">
                            Calm Anchor
                          </Label>
                          <p className="text-sm text-gray-600 mt-1">
                            You bring stability and groundedness to your relationship. You're the steady presence 
                            that helps navigate challenges with patience and wisdom.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="responsive_partner" id="responsive_partner" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="responsive_partner" className="text-base font-semibold text-gray-900">
                            Responsive Partner
                          </Label>
                          <p className="text-sm text-gray-600 mt-1">
                            You're highly attuned to emotions and relationship dynamics. You excel at reading 
                            situations and responding with empathy and understanding.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="growth_seeker" id="growth_seeker" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="growth_seeker" className="text-base font-semibold text-gray-900">
                            Growth Seeker
                          </Label>
                          <p className="text-sm text-gray-600 mt-1">
                            You're driven by personal and relationship development. You actively seek new ways 
                            to improve and deepen your connection with your partner.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="steady_support" id="steady_support" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="steady_support" className="text-base font-semibold text-gray-900">
                            Steady Support
                          </Label>
                          <p className="text-sm text-gray-600 mt-1">
                            You provide consistent, reliable support in your relationship. You're dependable 
                            and focus on creating a secure foundation for your partnership.
                          </p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Remember:</strong> These archetypes are flexible and can change over time. 
                      You can update your selection later in your profile settings.
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleNextStep}
                    disabled={!canProceedFromArchetype()}
                    className="w-full"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Jurisdiction and Language */}
            {currentStep === 'jurisdiction' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location & Language
                  </CardTitle>
                  <CardDescription>
                    This helps us provide appropriate crisis resources and language preferences for your region.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="location">Your Location *</Label>
                    <Select value={jurisdictionData.locationRegion} onValueChange={(value) => setJurisdictionData({...jurisdictionData, locationRegion: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                        <SelectItem value="NZ">New Zealand</SelectItem>
                        <SelectItem value="IE">Ireland</SelectItem>
                        <SelectItem value="ZA">South Africa</SelectItem>
                        <SelectItem value="other">Other/International</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-600 mt-1">
                      Used to provide appropriate crisis hotlines and legal resources
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="language">Preferred Language</Label>
                    <Select value={jurisdictionData.languagePreference} onValueChange={(value) => setJurisdictionData({...jurisdictionData, languagePreference: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">Français (French)</SelectItem>
                        <SelectItem value="es">Español (Spanish)</SelectItem>
                        <SelectItem value="de">Deutsch (German)</SelectItem>
                        <SelectItem value="it">Italiano (Italian)</SelectItem>
                        <SelectItem value="pt">Português (Portuguese)</SelectItem>
                        <SelectItem value="nl">Nederlands (Dutch)</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-green-900">Privacy Protection</h4>
                        <p className="text-sm text-green-800">
                          Your location information is used only for providing appropriate crisis resources 
                          and is not shared with partners or third parties.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleNextStep}
                    disabled={!canProceedFromJurisdiction()}
                    className="w-full"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Consent & Privacy */}
            {currentStep === 'consent' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacy & Safety Consent
                  </CardTitle>
                  <CardDescription>
                    Understanding and agreeing to our safety-first, privacy-focused approach
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-2">What We Are</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• A wellness and education platform for relationship improvement</li>
                      <li>• AI-powered daily guidance and communication tools</li>
                      <li>• Crisis detection system that connects you to professional resources</li>
                    </ul>
                    <h4 className="font-semibold text-blue-900 mt-3 mb-2">What We Are NOT</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Medical device or therapy service</li>
                      <li>• Emergency crisis intervention (we provide resources)</li>
                      <li>• Replacement for professional counseling</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="safety"
                        checked={consentData.safetyMonitoringConsent}
                        onCheckedChange={(checked) => 
                          setConsentData({...consentData, safetyMonitoringConsent: !!checked})}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="safety" className="text-sm font-medium">
                          I consent to safety monitoring * 
                        </Label>
                        <p className="text-xs text-gray-600">
                          AI-powered crisis detection to provide you with appropriate resources and professional referrals when needed.
                          You can disable this in settings, though it may reduce our ability to support you during difficult times.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="processing"
                        checked={consentData.dataProcessingConsent}
                        onCheckedChange={(checked) => 
                          setConsentData({...consentData, dataProcessingConsent: !!checked})}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="processing" className="text-sm font-medium">
                          I consent to data processing for personalized guidance *
                        </Label>
                        <p className="text-xs text-gray-600">
                          Processing your interactions and responses to provide personalized relationship guidance. 
                          Data is encrypted and never shared without your explicit consent.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="analytics"
                        checked={consentData.dataAnalyticsConsent}
                        onCheckedChange={(checked) => 
                          setConsentData({...consentData, dataAnalyticsConsent: !!checked})}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="analytics" className="text-sm font-medium">
                          I consent to anonymized analytics (optional)
                        </Label>
                        <p className="text-xs text-gray-600">
                          Help us improve the platform through anonymized usage patterns. No personal information is included.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="research"
                        checked={consentData.researchParticipation}
                        onCheckedChange={(checked) => 
                          setConsentData({...consentData, researchParticipation: !!checked})}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="research" className="text-sm font-medium">
                          I consent to anonymized research participation (optional)
                        </Label>
                        <p className="text-xs text-gray-600">
                          Contribute to relationship wellness research through completely anonymized data. 
                          Helps improve relationship support for everyone.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-amber-900">Your Privacy Rights</h4>
                        <p className="text-sm text-amber-800">
                          You have full control over your data. You can view, modify, or delete your information at any time. 
                          You can also revoke any consent given here through your account settings.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleNextStep}
                    disabled={!canProceedFromConsent()}
                    className="w-full"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Safety Awareness */}
            {currentStep === 'safety' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-600" />
                    Safety Awareness
                  </CardTitle>
                  <CardDescription>
                    Important safety considerations for relationship monitoring technology
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-2">Crisis Resources Available 24/7</h4>
                      <p className="text-sm text-green-800 mb-3">
                        If you are in immediate danger, please contact emergency services. 
                        We also provide instant access to crisis hotlines appropriate for your region.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>• National Suicide Prevention: 988</div>
                        <div>• Crisis Text Line: Text HOME to 741741</div>
                        <div>• Domestic Violence Hotline: 1-800-799-7233</div>
                        <div>• SAMHSA Helpline: 1-800-662-4357</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="emergencyContactName">Emergency Contact (optional)</Label>
                        <Input
                          id="emergencyContactName"
                          value={safetyData.emergencyContactName}
                          onChange={(e) => setSafetyData({...safetyData, emergencyContactName: e.target.value})}
                          placeholder="Name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergencyContactPhone">Phone (optional)</Label>
                        <Input
                          id="emergencyContactPhone"
                          value={safetyData.emergencyContactPhone}
                          onChange={(e) => setSafetyData({...safetyData, emergencyContactPhone: e.target.value})}
                          placeholder="Phone number"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="dvAwareness"
                          checked={safetyData.domesticViolenceAwareness}
                          onCheckedChange={(checked) => 
                            setSafetyData({...safetyData, domesticViolenceAwareness: !!checked})}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-medium mb-2">
                            I understand domestic violence and safety considerations *
                          </p>
                          <div className="text-sm space-y-2">
                            <p>
                              <strong>Important:</strong> If you are in an abusive relationship, please carefully consider 
                              whether relationship monitoring technology is safe for your situation.
                            </p>
                            <p>
                              Sparq Connection does NOT automatically notify partners about your activities, crisis events, 
                              or safety concerns. You maintain full control over what information is shared.
                            </p>
                            <p>
                              Your individual safety is always our top priority over relationship improvement goals.
                            </p>
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Your Control & Privacy</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• You control all data sharing with your partner</li>
                      <li>• Safety monitoring can be disabled in settings</li>
                      <li>• Crisis detection provides resources, never alerts others</li>
                      <li>• You can delete your account and all data at any time</li>
                      <li>• No automatic emergency contact notifications</li>
                    </ul>
                  </div>
                  
                  <Button
                    onClick={handleCompleteOnboarding}
                    disabled={!canProceedFromSafety() || loading}
                    className="w-full"
                  >
                    {loading ? 'Completing Setup...' : 'Complete Setup'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Complete */}
            {currentStep === 'complete' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="p-4 bg-gradient-to-br from-green-100 to-blue-100 rounded-full w-fit mx-auto mb-6">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to Sparq Connection! 🎉
                </h1>
                
                <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                  Your safety-first relationship wellness journey begins now. You're all set to receive 
                  personalized guidance, connect with your partner, and access crisis support whenever needed.
                </p>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto mb-8">
                  <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
                  <ul className="text-sm text-gray-700 space-y-2 text-left">
                    <li>• Invite your partner to join you (optional)</li>
                    <li>• Receive your first personalized relationship prompt</li>
                    <li>• Explore safety resources and crisis support</li>
                    <li>• Start building healthier communication patterns</li>
                  </ul>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span>Taking you to your dashboard...</span>
                </div>
                
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Remember: You have full control over your privacy settings and can modify your consent preferences at any time.
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}