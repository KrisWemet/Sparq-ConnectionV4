'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  AlertTriangle, 
  Phone, 
  Clock, 
  CheckCircle,
  ArrowRight,
  Heart,
  Users,
  MapPin,
  Zap,
  Eye,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import our new integrated system
import { 
  CrisisResponseCoordinator,
  CrisisResourceIntegration
} from '@/lib/safety-resources/crisis-integration'
import { UserLocation } from '@/lib/safety-resources/location-matcher'

// Import UI components
import { ComprehensiveResourceDirectory } from './ComprehensiveResourceDirectory'
import { SafetyPlanBuilder } from './SafetyPlanBuilder'
import { QuickExitProtocol, EmergencyQuickExitButton } from './QuickExitProtocol'
import { DiscreteAccessModes } from './DiscreteAccessModes'
import { LegalSafetyFramework } from './LegalSafetyFramework'

interface IntegratedCrisisResponseProps {
  userId: string
  coupleId?: string
  userLocation: UserLocation
  input: string
  additionalContext?: Record<string, any>
  onResponse?: (response: any) => void
}

interface CrisisResponseState {
  integration: CrisisResourceIntegration | null
  loading: boolean
  error: string | null
  uiState: {
    showEmergencyResources: boolean
    showSafetyPlanBuilder: boolean
    showResourceDirectory: boolean
    showDiscreteAccess: boolean
    emergencyExitAvailable: boolean
  }
  activeModal: 'none' | 'resources' | 'safety_plan' | 'quick_exit' | 'discrete_access' | 'legal'
}

export function IntegratedCrisisResponse({
  userId,
  coupleId,
  userLocation,
  input,
  additionalContext,
  onResponse
}: IntegratedCrisisResponseProps) {
  const [state, setState] = useState<CrisisResponseState>({
    integration: null,
    loading: true,
    error: null,
    uiState: {
      showEmergencyResources: false,
      showSafetyPlanBuilder: false,
      showResourceDirectory: false,
      showDiscreteAccess: false,
      emergencyExitAvailable: false
    },
    activeModal: 'none'
  })

  useEffect(() => {
    processCrisisInput()
  }, [input, userId, userLocation])

  const processCrisisInput = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const response = await CrisisResponseCoordinator.handleCrisisDetection(
        input,
        userId,
        userLocation,
        coupleId,
        additionalContext
      )

      setState(prev => ({
        ...prev,
        integration: response.integration,
        uiState: response.userInterface,
        loading: false
      }))

      onResponse?.(response)

    } catch (error) {
      console.error('Crisis processing failed:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to process crisis information. Please try again.',
        loading: false
      }))
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800'
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'high': return <Shield className="h-4 w-4 text-orange-600" />
      case 'medium': return <Heart className="h-4 w-4 text-yellow-600" />
      default: return <CheckCircle className="h-4 w-4 text-blue-600" />
    }
  }

  if (state.loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            <span className="ml-2">Analyzing input and gathering resources...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state.error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">
          {state.error}
        </AlertDescription>
      </Alert>
    )
  }

  if (!state.integration) {
    return null
  }

  const { integration, uiState } = state
  const { crisisResult, resourceMatches, interventionPlan } = integration

  return (
    <div className="space-y-6">
      {/* Crisis Detection Summary */}
      <Card className={cn("border-2", getSeverityColor(crisisResult.severity))}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {getSeverityIcon(crisisResult.severity)}
            Crisis Assessment Complete
            <Badge variant="outline" className="ml-auto">
              {crisisResult.severity} priority
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {crisisResult.hasCrisisIndicators ? (
            <div className="space-y-4">
              <div className="text-sm">
                <div className="font-medium mb-2">Detected Indicators:</div>
                <ul className="space-y-1">
                  {crisisResult.indicators.slice(0, 3).map((indicator, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-xs bg-white px-2 py-1 rounded border opacity-75">
                        {Math.round(indicator.confidence * 100)}%
                      </span>
                      <span className="text-sm">{indicator.description}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {crisisResult.requiresImmediateIntervention && (
                <Alert className="border-red-200 bg-red-50">
                  <Zap className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 font-medium">
                    Immediate intervention recommended. Priority access to crisis resources enabled.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No significant crisis indicators detected. Supportive resources are available if needed.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Actions - Only show for high/critical */}
      {(crisisResult.severity === 'critical' || crisisResult.severity === 'high') && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Immediate Support Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={() => window.location.href = 'tel:988'}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call 988 Crisis Line
              </Button>
              
              <Button
                onClick={() => window.location.href = 'tel:911'}
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-100"
              >
                <Zap className="h-4 w-4 mr-2" />
                Emergency: 911
              </Button>
              
              {uiState.emergencyExitAvailable && (
                <EmergencyQuickExitButton />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Support Tools</CardTitle>
          <div className="text-sm text-muted-foreground">
            Choose the tools that best fit your current needs
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {uiState.showResourceDirectory && (
              <Button
                onClick={() => setState(prev => ({ ...prev, activeModal: 'resources' }))}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <MapPin className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Crisis Resources</span>
                <span className="text-xs text-muted-foreground">
                  {resourceMatches.length} available
                </span>
              </Button>
            )}

            {uiState.showSafetyPlanBuilder && (
              <Button
                onClick={() => setState(prev => ({ ...prev, activeModal: 'safety_plan' }))}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <Shield className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Safety Planning</span>
                <span className="text-xs text-muted-foreground">
                  Personal safety plan
                </span>
              </Button>
            )}

            {uiState.showDiscreteAccess && (
              <Button
                onClick={() => setState(prev => ({ ...prev, activeModal: 'discrete_access' }))}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <Eye className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium">Discrete Access</span>
                <span className="text-xs text-muted-foreground">
                  Privacy protection
                </span>
              </Button>
            )}

            {uiState.emergencyExitAvailable && (
              <Button
                onClick={() => setState(prev => ({ ...prev, activeModal: 'quick_exit' }))}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <ExternalLink className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium">Quick Exit</span>
                <span className="text-xs text-muted-foreground">
                  Emergency exit
                </span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Intervention Plan Summary */}
      {interventionPlan.immediateActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recommended Action Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="immediate">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="immediate">Immediate Actions</TabsTrigger>
                <TabsTrigger value="follow-up">Follow-up Plan</TabsTrigger>
              </TabsList>

              <TabsContent value="immediate" className="space-y-3">
                {interventionPlan.immediateActions.map((action, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{action.action}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Timeframe: {action.timeframe.replace('_', ' ')}
                      </div>
                      {action.resources.length > 0 && (
                        <div className="text-xs text-blue-600 mt-1">
                          Resources: {action.resources.map(r => r.name).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="follow-up" className="space-y-3">
                {integration.followUpSchedule.checkIns.slice(0, 3).map((checkIn, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Clock className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        Check-in in {checkIn.timeframe}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Method: {checkIn.method.replace('_', ' ')} • Priority: {checkIn.priority}
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Legal Information */}
      <LegalSafetyFramework 
        context={integration.legalContext}
        variant="compact"
      />

      {/* Modals */}
      <ComprehensiveResourceDirectory
        open={state.activeModal === 'resources'}
        onClose={() => setState(prev => ({ ...prev, activeModal: 'none' }))}
        emergencyAccess={crisisResult.severity === 'critical'}
        legalContext={integration.legalContext}
      />

      <SafetyPlanBuilder
        open={state.activeModal === 'safety_plan'}
        onClose={() => setState(prev => ({ ...prev, activeModal: 'none' }))}
        emergencyMode={crisisResult.severity === 'critical'}
      />

      <QuickExitProtocol
        open={state.activeModal === 'quick_exit'}
        onClose={() => setState(prev => ({ ...prev, activeModal: 'none' }))}
        emergencyMode={crisisResult.severity === 'critical'}
      />

      <DiscreteAccessModes
        open={state.activeModal === 'discrete_access'}
        onClose={() => setState(prev => ({ ...prev, activeModal: 'none' }))}
      />
    </div>
  )
}

// Hook for using the integrated crisis response system
export function useIntegratedCrisisResponse(
  userId: string,
  userLocation: UserLocation,
  coupleId?: string
) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResponse, setLastResponse] = useState<any>(null)

  const processCrisisInput = async (
    input: string,
    additionalContext?: Record<string, any>
  ) => {
    setIsProcessing(true)
    try {
      const response = await CrisisResponseCoordinator.handleCrisisDetection(
        input,
        userId,
        userLocation,
        coupleId,
        additionalContext
      )
      setLastResponse(response)
      return response
    } catch (error) {
      console.error('Crisis processing failed:', error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    processCrisisInput,
    isProcessing,
    lastResponse
  }
}

// Demo component showing the complete integrated system
export function CrisisResponseDemo() {
  const [demoInput, setDemoInput] = useState('')
  const [showResponse, setShowResponse] = useState(false)

  const userLocation: UserLocation = {
    country: 'United States',
    countryCode: 'US',
    state: 'California',
    city: 'San Francisco'
  }

  const demoInputs = [
    "I've been feeling really hopeless lately and can't see a way out",
    "My partner has been threatening me and I'm scared",
    "I can't stop drinking and it's ruining my relationship",
    "Everything feels overwhelming and I don't know what to do"
  ]

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrated Crisis Response System Demo</CardTitle>
          <div className="text-sm text-muted-foreground">
            Test the complete crisis detection and resource integration system
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Demo Crisis Scenarios:</label>
            <div className="grid gap-2 mt-2">
              {demoInputs.map((input, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => {
                    setDemoInput(input)
                    setShowResponse(true)
                  }}
                  className="justify-start text-left h-auto p-3"
                >
                  <span className="text-sm">{input}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {showResponse && demoInput && (
        <IntegratedCrisisResponse
          userId="demo-user"
          userLocation={userLocation}
          input={demoInput}
          onResponse={(response) => {
            console.log('Crisis response:', response)
          }}
        />
      )}
    </div>
  )
}