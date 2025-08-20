'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Eye, 
  EyeOff, 
  Settings, 
  HelpCircle, 
  Info, 
  Calculator,
  Calendar,
  Clock,
  Heart,
  Shield,
  Newspaper,
  BookOpen,
  Search,
  Home,
  User,
  Mail,
  Phone,
  Zap,
  AlertTriangle,
  CheckCircle,
  Lock,
  Key
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComprehensiveResourceDirectory } from './ComprehensiveResourceDirectory'
import { SafetyPlanBuilder } from './SafetyPlanBuilder'
import { EducationalSafetyContent } from './EducationalSafetyContent'

interface DiscreteMode {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  disguiseLabel: string
  disguiseIcon: React.ComponentType<any>
  backgroundColor: string
  textColor: string
  accessMethod: 'click' | 'double_click' | 'long_press' | 'sequence'
  sequence?: string[]
}

const DISCRETE_MODES: DiscreteMode[] = [
  {
    id: 'help',
    name: 'Help Center',
    description: 'Disguised as general help or FAQ section',
    icon: HelpCircle,
    disguiseLabel: 'Help & Support',
    disguiseIcon: HelpCircle,
    backgroundColor: 'bg-gray-100 hover:bg-gray-200',
    textColor: 'text-gray-700',
    accessMethod: 'click'
  },
  {
    id: 'settings',
    name: 'Settings Panel',
    description: 'Appears as application settings',
    icon: Settings,
    disguiseLabel: 'Settings',
    disguiseIcon: Settings,
    backgroundColor: 'bg-blue-100 hover:bg-blue-200',
    textColor: 'text-blue-700',
    accessMethod: 'click'
  },
  {
    id: 'calculator',
    name: 'Calculator Tool',
    description: 'Hidden behind a working calculator',
    icon: Calculator,
    disguiseLabel: 'Calculator',
    disguiseIcon: Calculator,
    backgroundColor: 'bg-green-100 hover:bg-green-200',
    textColor: 'text-green-700',
    accessMethod: 'sequence',
    sequence: ['9', '8', '8']
  },
  {
    id: 'calendar',
    name: 'Calendar View',
    description: 'Accessed through calendar interface',
    icon: Calendar,
    disguiseLabel: 'Calendar',
    disguiseIcon: Calendar,
    backgroundColor: 'bg-purple-100 hover:bg-purple-200',
    textColor: 'text-purple-700',
    accessMethod: 'double_click'
  },
  {
    id: 'weather',
    name: 'Weather App',
    description: 'Hidden in weather information',
    icon: Info,
    disguiseLabel: 'Weather Info',
    disguiseIcon: Info,
    backgroundColor: 'bg-yellow-100 hover:bg-yellow-200',
    textColor: 'text-yellow-700',
    accessMethod: 'long_press'
  },
  {
    id: 'news',
    name: 'News Reader',
    description: 'Disguised as news or article reader',
    icon: Newspaper,
    disguiseLabel: 'Daily News',
    disguiseIcon: Newspaper,
    backgroundColor: 'bg-orange-100 hover:bg-orange-200',
    textColor: 'text-orange-700',
    accessMethod: 'click'
  }
]

interface DiscreteAccessModesProps {
  open: boolean
  onClose: () => void
}

interface ActiveDiscreteSession {
  mode: DiscreteMode
  startTime: Date
  accessCount: number
  lastActivity: Date
}

export function DiscreteAccessModes({
  open,
  onClose
}: DiscreteAccessModesProps) {
  const [selectedModes, setSelectedModes] = useState<string[]>(['help', 'settings'])
  const [activeSession, setActiveSession] = useState<ActiveDiscreteSession | null>(null)
  const [showResourceDirectory, setShowResourceDirectory] = useState(false)
  const [showSafetyPlan, setShowSafetyPlan] = useState(false)
  const [showEducation, setShowEducation] = useState(false)
  
  useEffect(() => {
    const savedModes = localStorage.getItem('discrete-access-modes')
    if (savedModes) {
      try {
        setSelectedModes(JSON.parse(savedModes))
      } catch (error) {
        console.warn('Failed to load discrete modes:', error)
      }
    }
  }, [])

  const saveConfiguration = () => {
    localStorage.setItem('discrete-access-modes', JSON.stringify(selectedModes))
  }

  const toggleMode = (modeId: string) => {
    setSelectedModes(prev => 
      prev.includes(modeId) 
        ? prev.filter(id => id !== modeId)
        : [...prev, modeId]
    )
  }

  const startDiscreteSession = (mode: DiscreteMode) => {
    const session: ActiveDiscreteSession = {
      mode,
      startTime: new Date(),
      accessCount: 1,
      lastActivity: new Date()
    }
    setActiveSession(session)
    
    // Log discrete access for safety monitoring (non-identifiable)
    console.log(`Discrete access started: ${mode.name} at ${new Date().toISOString()}`)
  }

  const endDiscreteSession = () => {
    if (activeSession) {
      console.log(`Discrete access ended: ${activeSession.mode.name} duration: ${
        (new Date().getTime() - activeSession.startTime.getTime()) / 1000
      } seconds`)
    }
    setActiveSession(null)
    onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Discrete Access Configuration
            </DialogTitle>
            <div className="text-sm text-muted-foreground">
              Configure safe, disguised ways to access crisis support resources
            </div>
          </DialogHeader>

          {/* Safety Information */}
          <div className="px-6">
            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <div className="font-medium text-blue-800 mb-1">Discrete Access for Safety</div>
                <div className="text-blue-700 space-y-1">
                  <div>• These modes hide crisis support resources behind normal-looking interfaces</div>
                  <div>• Designed for situations where privacy is critical for your safety</div>
                  <div>• Test these modes to ensure they work for your situation</div>
                  <div>• Always have a backup plan for accessing help</div>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          <Tabs defaultValue="setup" className="flex-1">
            <TabsList className="grid w-full grid-cols-3 mx-6">
              <TabsTrigger value="setup">Mode Setup</TabsTrigger>
              <TabsTrigger value="testing">Test Modes</TabsTrigger>
              <TabsTrigger value="security">Security Tips</TabsTrigger>
            </TabsList>

            {/* Mode Setup Tab */}
            <TabsContent value="setup" className="p-6 pt-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Available Discrete Modes</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    Select which disguised access methods to enable
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {DISCRETE_MODES.map((mode) => (
                      <Card
                        key={mode.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          selectedModes.includes(mode.id) && "ring-2 ring-primary ring-offset-2"
                        )}
                        onClick={() => toggleMode(mode.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg", mode.backgroundColor)}>
                                <mode.disguiseIcon className={cn("h-4 w-4", mode.textColor)} />
                              </div>
                              <div>
                                <CardTitle className="text-sm font-semibold">
                                  {mode.name}
                                </CardTitle>
                                <div className="text-xs text-muted-foreground">
                                  "{mode.disguiseLabel}"
                                </div>
                              </div>
                            </div>
                            {selectedModes.includes(mode.id) && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-xs text-muted-foreground mb-2">
                            {mode.description}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {mode.accessMethod.replace('_', ' ')}
                            </Badge>
                            {mode.sequence && (
                              <Badge variant="secondary" className="text-xs">
                                Sequence: {mode.sequence.join('-')}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {selectedModes.length} discrete mode{selectedModes.length !== 1 ? 's' : ''} enabled
                </div>
                <Button onClick={saveConfiguration} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="p-6 pt-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Test Discrete Access</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    Try your configured discrete access methods
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {DISCRETE_MODES.filter(mode => selectedModes.includes(mode.id)).map((mode) => (
                      <DiscreteAccessDemo
                        key={mode.id}
                        mode={mode}
                        onActivate={() => startDiscreteSession(mode)}
                      />
                    ))}
                  </div>
                  
                  {selectedModes.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <div>No discrete modes enabled</div>
                      <div className="text-sm">Go to Mode Setup to configure discrete access</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {activeSession && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-base text-green-800">
                      Active Discrete Session
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{activeSession.mode.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Started: {activeSession.startTime.toLocaleTimeString()}
                        </div>
                      </div>
                      <Button
                        onClick={endDiscreteSession}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200"
                      >
                        End Session
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Security Tips Tab */}
            <TabsContent value="security" className="p-6 pt-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Security Best Practices
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Test your discrete modes regularly</div>
                        <div className="text-muted-foreground">Ensure they work when you need them</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Use different modes for different situations</div>
                        <div className="text-muted-foreground">Have backup options available</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Clear browser history if necessary</div>
                        <div className="text-muted-foreground">Use incognito mode for extra privacy</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Know your quick exit options</div>
                        <div className="text-muted-foreground">Always have a plan to leave quickly if needed</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    When Discrete Access is Critical
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div>• When someone might monitor your device or internet usage</div>
                    <div>• If accessing crisis resources could put you in danger</div>
                    <div>• When you need to seek help without others knowing</div>
                    <div>• In controlling or abusive relationship situations</div>
                    <div>• When privacy and safety are your primary concerns</div>
                  </div>
                </CardContent>
              </Card>

              <Alert className="border-orange-200 bg-orange-50">
                <Key className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-sm">
                  <div className="font-medium text-orange-800 mb-1">Remember:</div>
                  <div className="text-orange-700">
                    Discrete access is designed to help you stay safe while seeking support. 
                    No system is perfect - trust your instincts and prioritize your safety above all else.
                  </div>
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Resource Directory Modal */}
      <ComprehensiveResourceDirectory
        open={showResourceDirectory}
        onClose={() => setShowResourceDirectory(false)}
        legalContext={{
          disclaimer: 'This platform provides resource information only. We do not provide direct crisis intervention services.',
          userControl: 'You maintain full control over which resources to contact and when.',
          emergencyNote: 'For immediate emergencies, call 911 or go to your nearest emergency room.',
          noAutomation: 'We will never automatically contact emergency services or other people on your behalf.'
        }}
      />

      {/* Safety Plan Builder Modal */}
      <SafetyPlanBuilder
        open={showSafetyPlan}
        onClose={() => setShowSafetyPlan(false)}
      />

      {/* Educational Content Modal */}
      <EducationalSafetyContent
        initialCategory="healthy_relationships"
        onResourceAccess={(resource) => console.log('Educational resource accessed:', resource)}
      />
    </>
  )
}

// Demo component for testing discrete access
function DiscreteAccessDemo({ 
  mode, 
  onActivate 
}: { 
  mode: DiscreteMode
  onActivate: () => void 
}) {
  const [clickCount, setClickCount] = useState(0)
  const [sequence, setSequence] = useState<string[]>([])
  const [isLongPressing, setIsLongPressing] = useState(false)

  const handleInteraction = (e: React.MouseEvent) => {
    switch (mode.accessMethod) {
      case 'click':
        onActivate()
        break
      case 'double_click':
        setClickCount(prev => prev + 1)
        setTimeout(() => {
          if (clickCount === 1) {
            onActivate()
            setClickCount(0)
          }
        }, 300)
        break
      case 'long_press':
        // Long press would be handled by onMouseDown/onMouseUp
        break
      case 'sequence':
        // Would need input handling for sequence
        break
    }
  }

  const handleMouseDown = () => {
    if (mode.accessMethod === 'long_press') {
      setIsLongPressing(true)
      setTimeout(() => {
        if (isLongPressing) {
          onActivate()
        }
      }, 1000)
    }
  }

  const handleMouseUp = () => {
    setIsLongPressing(false)
  }

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        mode.backgroundColor.replace('hover:', '')
      )}
      onClick={handleInteraction}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <mode.disguiseIcon className={cn("h-5 w-5", mode.textColor)} />
          <div>
            <div className={cn("font-medium", mode.textColor)}>
              {mode.disguiseLabel}
            </div>
            <div className="text-xs text-muted-foreground">
              {mode.accessMethod.replace('_', ' ')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Discrete access widget for embedding in other interfaces
export function DiscreteAccessWidget({ 
  mode,
  onActivate,
  size = 'default'
}: {
  mode: DiscreteMode
  onActivate: () => void
  size?: 'sm' | 'default' | 'lg'
}) {
  const handleClick = () => {
    console.log(`Discrete access activated: ${mode.name}`)
    onActivate()
  }

  const sizeClasses = {
    sm: 'h-8 w-8 p-1',
    default: 'h-10 w-10 p-2',
    lg: 'h-12 w-12 p-3'
  }

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      className={cn(
        sizeClasses[size],
        mode.backgroundColor,
        mode.textColor,
        "rounded-lg"
      )}
      title={mode.disguiseLabel}
    >
      <mode.disguiseIcon className="h-4 w-4" />
    </Button>
  )
}