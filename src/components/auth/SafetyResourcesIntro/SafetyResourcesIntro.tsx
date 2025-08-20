'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Heart, 
  Phone, 
  MessageCircle, 
  Users, 
  Shield, 
  ExternalLink,
  MapPin,
  Clock,
  Headphones,
  BookOpen,
  UserCheck,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { SafetyIntegrator } from '@/lib/auth/safety-integration'
import { motion } from 'framer-motion'

interface SafetyResourcesIntroProps {
  userId: string
  jurisdiction?: string
  onComplete?: () => void
}

interface CrisisResource {
  id: string
  name: string
  type: 'hotline' | 'text' | 'chat' | 'local' | 'professional'
  contact: string
  description: string
  availability: string
  specialization: string[]
  jurisdiction: string
  urgent: boolean
}

interface LocalProfessional {
  id: string
  name: string
  type: 'therapist' | 'counselor' | 'psychiatrist' | 'social_worker'
  specializations: string[]
  location: string
  acceptingNewPatients: boolean
  insuranceAccepted: string[]
  contactInfo: string
}

export const SafetyResourcesIntro: React.FC<SafetyResourcesIntroProps> = ({
  userId,
  jurisdiction = 'US',
  onComplete
}) => {
  const [loading, setLoading] = useState(true)
  const [crisisResources, setCrisisResources] = useState<CrisisResource[]>([])
  const [localProfessionals, setLocalProfessionals] = useState<LocalProfessional[]>([])
  const [activeTab, setActiveTab] = useState<'crisis' | 'therapy' | 'education' | 'community'>('crisis')
  const [resourcesFamiliarized, setResourcesFamiliarized] = useState(false)
  const [error, setError] = useState('')

  const safetyIntegration = new SafetyIntegrator()

  useEffect(() => {
    loadSafetyResources()
  }, [jurisdiction])

  const loadSafetyResources = async () => {
    setLoading(true)
    try {
      // Load jurisdiction-specific crisis resources
      const emergencyProtocol = await safetyIntegration.getEmergencyProtocol(jurisdiction)
      
      // Sample crisis resources (would come from database)
      const resources: CrisisResource[] = [
        {
          id: '1',
          name: 'National Suicide Prevention Lifeline',
          type: 'hotline',
          contact: '988',
          description: 'Free, confidential 24/7 crisis support for people in distress and their loved ones',
          availability: '24/7',
          specialization: ['suicide prevention', 'mental health crisis', 'emotional distress'],
          jurisdiction: 'US',
          urgent: true
        },
        {
          id: '2',
          name: 'Crisis Text Line',
          type: 'text',
          contact: 'Text HOME to 741741',
          description: 'Free, 24/7 text-based crisis support for any crisis',
          availability: '24/7',
          specialization: ['crisis support', 'mental health', 'substance abuse', 'self-harm'],
          jurisdiction: 'US',
          urgent: true
        },
        {
          id: '3',
          name: 'National Domestic Violence Hotline',
          type: 'hotline',
          contact: '1-800-799-7233',
          description: 'Confidential support for survivors of domestic violence and their loved ones',
          availability: '24/7',
          specialization: ['domestic violence', 'intimate partner violence', 'safety planning'],
          jurisdiction: 'US',
          urgent: true
        },
        {
          id: '4',
          name: 'SAMHSA National Helpline',
          type: 'hotline',
          contact: '1-800-662-4357',
          description: 'Treatment referral and information service for mental health and substance use disorders',
          availability: '24/7',
          specialization: ['substance abuse', 'mental health treatment', 'referrals'],
          jurisdiction: 'US',
          urgent: false
        },
        {
          id: '5',
          name: 'LGBT National Hotline',
          type: 'hotline',
          contact: '1-866-488-7386',
          description: 'Confidential peer-support for LGBTQ+ individuals and allies',
          availability: '4pm-12am ET, Mon-Fri; 12pm-5pm ET, Sat',
          specialization: ['LGBTQ+ support', 'identity issues', 'discrimination'],
          jurisdiction: 'US',
          urgent: false
        }
      ]

      setCrisisResources(resources)

      // Sample local professionals (would come from database/API)
      const professionals: LocalProfessional[] = [
        {
          id: '1',
          name: 'Dr. Sarah Chen',
          type: 'therapist',
          specializations: ['Couples Therapy', 'Relationship Counseling', 'Communication Skills'],
          location: 'Downtown Medical Center',
          acceptingNewPatients: true,
          insuranceAccepted: ['Blue Cross', 'Aetna', 'United Healthcare'],
          contactInfo: '(555) 123-4567'
        },
        {
          id: '2',
          name: 'Michael Rodriguez, LCSW',
          type: 'social_worker',
          specializations: ['Trauma Therapy', 'EMDR', 'Crisis Intervention'],
          location: 'Community Health Services',
          acceptingNewPatients: true,
          insuranceAccepted: ['Medicaid', 'Medicare', 'Sliding Scale'],
          contactInfo: '(555) 234-5678'
        }
      ]

      setLocalProfessionals(professionals)
    } catch (err) {
      setError('Failed to load safety resources')
    } finally {
      setLoading(false)
    }
  }

  const markResourcesFamiliarized = () => {
    setResourcesFamiliarized(true)
    // Record that user has completed safety resources introduction
    // This would typically be saved to the database
    onComplete?.()
  }

  const tabs = [
    { id: 'crisis', label: 'Crisis Support', icon: Phone, urgent: true },
    { id: 'therapy', label: 'Professional Help', icon: UserCheck, urgent: false },
    { id: 'education', label: 'Educational Resources', icon: BookOpen, urgent: false },
    { id: 'community', label: 'Community Support', icon: Users, urgent: false }
  ]

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Safety Resources</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Getting help is a sign of strength, not weakness. Familiarize yourself with these resources 
          so they're available when you or your partner might need support.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Immediate Crisis Alert */}
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>In immediate danger?</strong> Call 911 (US) or your local emergency services. 
          For mental health crises, call 988 (Suicide & Crisis Lifeline).
        </AlertDescription>
      </Alert>

      {/* Jurisdiction Info */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
        <MapPin className="h-4 w-4" />
        Resources for: <Badge variant="outline">{jurisdiction}</Badge>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? tab.urgent 
                    ? 'border-red-500 text-red-600' 
                    : 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.urgent && <Badge variant="destructive" className="text-xs">24/7</Badge>}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'crisis' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">24/7 Crisis Support</h2>
              <p className="text-gray-600">
                These resources are available immediately, any time of day or night. 
                <strong className="text-red-600"> Reaching out is always the right choice.</strong>
              </p>
            </div>

            <div className="grid gap-4">
              {crisisResources.filter(r => r.urgent).map((resource) => (
                <Card key={resource.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-red-100 rounded-full">
                            {resource.type === 'hotline' && <Phone className="h-4 w-4 text-red-600" />}
                            {resource.type === 'text' && <MessageCircle className="h-4 w-4 text-red-600" />}
                            {resource.type === 'chat' && <Headphones className="h-4 w-4 text-red-600" />}
                          </div>
                          <h3 className="text-lg font-semibold">{resource.name}</h3>
                          <Badge variant="destructive">24/7</Badge>
                        </div>

                        <div className="mb-3">
                          <p className="text-2xl font-bold text-red-600 mb-1">{resource.contact}</p>
                          <p className="text-gray-700">{resource.description}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {resource.specialization.map((spec, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={() => window.open(
                          resource.type === 'text' 
                            ? `sms:741741?body=HOME` 
                            : `tel:${resource.contact.replace(/[^\d]/g, '')}`
                        )}
                        className="bg-red-500 hover:bg-red-600 ml-4"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Contact Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Alert>
              <Heart className="h-4 w-4" />
              <AlertDescription>
                <strong>Remember:</strong> Crisis counselors are trained professionals who want to help. 
                You don't need to be in immediate danger to reach out - any level of distress is valid.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {activeTab === 'therapy' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Professional Mental Health Support</h2>
              <p className="text-gray-600">
                Therapy is preventive care for your mental health and relationships. 
                These professionals can help you build skills and resilience.
              </p>
            </div>

            {/* Professional Referrals */}
            <div className="grid gap-4">
              {localProfessionals.map((professional) => (
                <Card key={professional.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <UserCheck className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">{professional.name}</h3>
                          <Badge variant={professional.acceptingNewPatients ? "default" : "secondary"}>
                            {professional.acceptingNewPatients ? 'Accepting Patients' : 'Waitlist'}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                          <p className="text-gray-700">
                            <strong>Type:</strong> {professional.type.replace('_', ' ')}
                          </p>
                          <p className="text-gray-700">
                            <strong>Location:</strong> {professional.location}
                          </p>
                          <p className="text-gray-700">
                            <strong>Contact:</strong> {professional.contactInfo}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium mb-1">Specializations:</p>
                            <div className="flex flex-wrap gap-2">
                              {professional.specializations.map((spec, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium mb-1">Insurance Accepted:</p>
                            <div className="flex flex-wrap gap-2">
                              {professional.insuranceAccepted.map((insurance, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {insurance}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => window.open(`tel:${professional.contactInfo.replace(/[^\d]/g, '')}`)}
                        variant="outline"
                        className="ml-4"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* General Resources */}
            <div className="grid gap-4">
              {crisisResources.filter(r => !r.urgent).map((resource) => (
                <Card key={resource.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Headphones className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">{resource.name}</h3>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-lg font-bold text-blue-600 mb-1">{resource.contact}</p>
                          <p className="text-gray-700 mb-1">{resource.description}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {resource.availability}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {resource.specialization.map((spec, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={() => window.open(`tel:${resource.contact.replace(/[^\d]/g, '')}`)}
                        variant="outline"
                        className="ml-4"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'education' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Educational Resources</h2>
              <p className="text-gray-600">
                Learn about relationship health, mental wellness, and personal growth.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Relationship Education
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Healthy Communication Patterns
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Conflict Resolution Skills
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Building Emotional Intimacy
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Mental Health Awareness
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Recognizing Mental Health Signs
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Supporting a Partner in Crisis
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Self-Care Strategies
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Safety & Boundaries
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Healthy Relationship Boundaries
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Recognizing Abuse Patterns
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Digital Privacy & Safety
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Community Resources
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Local Support Groups
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Couples Workshops
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Online Communities
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Community Support</h2>
              <p className="text-gray-600">
                Connect with others who understand your experience and can offer peer support.
              </p>
            </div>

            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                <strong>Remember:</strong> Peer support complements but doesn't replace professional help. 
                For crisis situations, always use the 24/7 resources listed in the Crisis Support tab.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Online Support Communities</CardTitle>
                  <CardDescription>
                    Moderated online spaces for peer support and shared experiences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Relationship Support Forum</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Peer support for relationship challenges and growth
                    </p>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Join Community
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Mental Health Support Network</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Community for mental health awareness and support
                    </p>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Join Community
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Local Support Groups</CardTitle>
                  <CardDescription>
                    In-person support groups in your area
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Couples Communication Workshop</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Monthly workshop on relationship communication
                    </p>
                    <p className="text-xs text-gray-500 mb-2">Community Center - 2nd Saturday</p>
                    <Button variant="outline" size="sm">
                      <MapPin className="h-3 w-3 mr-2" />
                      Get Directions
                    </Button>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Mental Health First Aid</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Training on recognizing mental health crises
                    </p>
                    <p className="text-xs text-gray-500 mb-2">Library - Quarterly Training</p>
                    <Button variant="outline" size="sm">
                      <BookOpen className="h-3 w-3 mr-2" />
                      Learn More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </motion.div>

      {/* Completion */}
      <div className="text-center pt-6 border-t">
        <Alert className="mb-6">
          <Heart className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Familiarizing yourself with these resources is part of creating 
            a safety-first relationship environment. Help-seeking is a sign of strength and caring.
          </AlertDescription>
        </Alert>

        <Button
          onClick={markResourcesFamiliarized}
          size="lg"
          className="bg-connection-500 hover:bg-connection-600"
          disabled={resourcesFamiliarized}
        >
          {resourcesFamiliarized ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Resources Familiarized
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              I've Familiarized Myself with These Resources
            </>
          )}
        </Button>
        
        {resourcesFamiliarized && (
          <p className="text-sm text-gray-600 mt-3">
            These resources remain available in your dashboard at any time.
          </p>
        )}
      </div>
    </div>
  )
}