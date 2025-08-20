'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  AlertTriangle, 
  Info, 
  FileText, 
  Eye,
  Scale,
  Lock,
  Heart,
  Phone,
  Users,
  CheckCircle,
  XCircle,
  Gavel,
  BookOpen,
  Clock,
  Globe,
  UserCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LegalContext {
  disclaimer: string
  userControl: string
  emergencyNote: string
  noAutomation: string
  privacyNotice: string
  limitationsOfService: string
  professionalReferral: string
  dataHandling: string
}

export const COMPREHENSIVE_LEGAL_CONTEXT: LegalContext = {
  disclaimer: 'This platform provides educational resource information only. We do not provide direct crisis intervention, therapy, or medical services.',
  userControl: 'You maintain complete control over which resources to contact, when to contact them, and what information to share.',
  emergencyNote: 'For immediate life-threatening emergencies, call 911, go to your nearest emergency room, or contact local emergency services directly.',
  noAutomation: 'We will never automatically contact emergency services, family members, or other people on your behalf without your explicit consent.',
  privacyNotice: 'Your safety plan and resource access history are stored locally on your device only. No personal data is transmitted to external servers.',
  limitationsOfService: 'This service is not a substitute for professional medical care, therapy, or crisis intervention by trained professionals.',
  professionalReferral: 'We strongly recommend working with licensed mental health professionals, crisis counselors, or domestic violence advocates for personalized support.',
  dataHandling: 'All data is processed locally on your device. No personal information is shared with third parties without your explicit consent.'
}

interface LegalSafetyFrameworkProps {
  context?: Partial<LegalContext>
  variant?: 'full' | 'compact' | 'inline'
  showDialog?: boolean
  onAcceptance?: () => void
}

export function LegalSafetyFramework({
  context = {},
  variant = 'compact',
  showDialog = false,
  onAcceptance
}: LegalSafetyFrameworkProps) {
  const [dialogOpen, setDialogOpen] = useState(showDialog)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const legalContext = { ...COMPREHENSIVE_LEGAL_CONTEXT, ...context }

  const handleAcceptance = () => {
    setAcceptedTerms(true)
    onAcceptance?.()
    setDialogOpen(false)
  }

  if (variant === 'inline') {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm">
          <div className="font-medium text-blue-800 mb-1">Important Notice</div>
          <div className="text-blue-700 space-y-1">
            <div>• {legalContext.disclaimer}</div>
            <div>• {legalContext.userControl}</div>
            <div>• {legalContext.emergencyNote}</div>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (variant === 'compact') {
    return (
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="h-4 w-4 text-gray-600" />
            Legal & Safety Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <Shield className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Resource Directory Only</div>
                <div className="text-muted-foreground">{legalContext.disclaimer}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <UserCheck className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Your Control</div>
                <div className="text-muted-foreground">{legalContext.userControl}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Phone className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Emergency Services</div>
                <div className="text-muted-foreground">{legalContext.emergencyNote}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Lock className="h-3 w-3 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Privacy</div>
                <div className="text-muted-foreground">{legalContext.privacyNotice}</div>
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="w-full"
          >
            <FileText className="h-3 w-3 mr-2" />
            View Complete Legal Information
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-blue-600" />
              Legal Framework & Safety Information
            </DialogTitle>
            <div className="text-sm text-muted-foreground">
              Important legal information and safety guidelines for using this crisis support platform
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="flex-1">
            <TabsList className="grid w-full grid-cols-4 mx-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="disclaimers">Disclaimers</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="emergency">Emergency</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="p-6 pt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        What This Platform Is
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium">Educational Resource Directory</div>
                          <div className="text-muted-foreground">Provides information about crisis support resources and safety planning tools</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium">Self-Directed Support Tool</div>
                          <div className="text-muted-foreground">Helps you find and connect with appropriate professional services</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium">Safety Planning Assistant</div>
                          <div className="text-muted-foreground">Provides templates and guidance for creating personal safety plans</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium">Educational Content</div>
                          <div className="text-muted-foreground">Evidence-based information about relationship health and crisis recognition</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        What This Platform Is Not
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium">Not a Crisis Intervention Service</div>
                          <div className="text-muted-foreground">We do not provide direct crisis intervention or emergency response</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium">Not Medical or Therapeutic Services</div>
                          <div className="text-muted-foreground">We do not provide therapy, counseling, or medical diagnosis/treatment</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium">Not Emergency Response</div>
                          <div className="text-muted-foreground">We do not replace 911, crisis hotlines, or emergency services</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-medium">Not Automated Intervention</div>
                          <div className="text-muted-foreground">We do not automatically contact anyone on your behalf</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Your Responsibilities
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>• You are responsible for your own safety and well-being</div>
                      <div>• You choose when and how to use the resources provided</div>
                      <div>• You decide whether to contact any resources or services</div>
                      <div>• You are responsible for seeking appropriate professional help when needed</div>
                      <div>• You should verify resource information before relying on it</div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Disclaimers Tab */}
            <TabsContent value="disclaimers" className="p-6 pt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription>
                      <div className="font-medium text-red-800 mb-2">Critical Safety Disclaimer</div>
                      <div className="text-red-700 space-y-2">
                        <div>{legalContext.disclaimer}</div>
                        <div>{legalContext.limitationsOfService}</div>
                        <div>{legalContext.emergencyNote}</div>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">No Professional Relationship</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-3">
                      <div>Use of this platform does not create any professional relationship between you and:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• The platform developers or operators</li>
                        <li>• Any healthcare or mental health professionals</li>
                        <li>• Crisis intervention services</li>
                        <li>• Resource providers listed in our directory</li>
                      </ul>
                      <div className="font-medium">{legalContext.professionalReferral}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Resource Information Accuracy</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-3">
                      <div>While we strive to provide accurate and up-to-date resource information:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• Resource availability and contact information may change</li>
                        <li>• Services may have eligibility requirements or limitations</li>
                        <li>• We cannot guarantee the quality of services provided by third parties</li>
                        <li>• You should verify information directly with resource providers</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Limitation of Liability</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-3">
                      <div>To the fullest extent permitted by law, this platform and its operators are not liable for:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• Actions taken or not taken based on information provided</li>
                        <li>• Services provided by third-party resources</li>
                        <li>• Technical failures or service interruptions</li>
                        <li>• Any outcomes resulting from use of this platform</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="p-6 pt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  <Alert className="border-green-200 bg-green-50">
                    <Lock className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <div className="font-medium text-green-800 mb-1">Privacy-First Design</div>
                      <div className="text-green-700">{legalContext.privacyNotice}</div>
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Data Storage and Processing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="font-medium">Local Storage Only:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• Safety plans are stored on your device only</li>
                        <li>• Resource access history remains local</li>
                        <li>• Personal configurations stay on your device</li>
                        <li>• No personal data is transmitted to our servers</li>
                      </ul>
                      
                      <div className="font-medium">Non-Personal Data:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• Anonymous usage statistics for service improvement</li>
                        <li>• Technical performance metrics</li>
                        <li>• No personally identifiable information collected</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">User Control Over Data</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>You have complete control over your data:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• Delete your data at any time through browser settings</li>
                        <li>• Export your safety plans and configurations</li>
                        <li>• Choose what information to store or share</li>
                        <li>• Clear browser data to remove all traces</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Third-Party Resources</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>When you contact resources through our platform:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• Your communication is directly with that resource</li>
                        <li>• Their privacy policies apply to your interaction</li>
                        <li>• We do not monitor or record these communications</li>
                        <li>• We cannot control how they handle your information</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Emergency Tab */}
            <TabsContent value="emergency" className="p-6 pt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  <Alert className="border-red-200 bg-red-50">
                    <Phone className="h-4 w-4 text-red-600" />
                    <AlertDescription>
                      <div className="font-medium text-red-800 mb-2">Emergency Situations</div>
                      <div className="text-red-700">{legalContext.emergencyNote}</div>
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">When to Call Emergency Services</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="font-medium text-red-600">Call 911 immediately if:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• Someone is in immediate physical danger</li>
                        <li>• There are threats of violence with weapons</li>
                        <li>• Someone is actively attempting suicide</li>
                        <li>• There is a medical emergency</li>
                        <li>• A crime is in progress</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Crisis Support Hotlines</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3">
                        <div className="p-3 border rounded-lg bg-red-50 border-red-200">
                          <div className="font-medium text-red-800">988 Suicide & Crisis Lifeline</div>
                          <div className="text-sm text-red-700">24/7 crisis support and suicide prevention</div>
                          <div className="font-mono text-red-600">Call or text 988</div>
                        </div>
                        
                        <div className="p-3 border rounded-lg bg-purple-50 border-purple-200">
                          <div className="font-medium text-purple-800">National Domestic Violence Hotline</div>
                          <div className="text-sm text-purple-700">24/7 domestic violence support and safety planning</div>
                          <div className="font-mono text-purple-600">1-800-799-7233</div>
                        </div>
                        
                        <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                          <div className="font-medium text-blue-800">Crisis Text Line</div>
                          <div className="text-sm text-blue-700">24/7 crisis support via text message</div>
                          <div className="font-mono text-blue-600">Text HOME to 741741</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Platform Emergency Limitations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="font-medium">This platform cannot:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• Detect if you are in immediate danger</li>
                        <li>• Automatically call emergency services</li>
                        <li>• Provide real-time crisis intervention</li>
                        <li>• Monitor your safety status</li>
                        <li>• Alert family or friends on your behalf</li>
                      </ul>
                      
                      <div className="font-medium mt-4">{legalContext.noAutomation}</div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="px-6 pb-6">
            <Separator className="mb-4" />
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last updated: {new Date().toLocaleDateString()}
              </div>
              
              <div className="flex gap-2">
                {onAcceptance && (
                  <Button
                    onClick={handleAcceptance}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    I Understand
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {variant === 'full' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" />
                Legal Framework & Safety Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setDialogOpen(true)} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                View Complete Legal Information
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

// Consent banner for first-time users
export function SafetyConsentBanner({ 
  onAccept, 
  onDecline 
}: { 
  onAccept: () => void
  onDecline: () => void 
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start gap-4">
          <Shield className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <div className="font-medium text-gray-900 mb-1">
              Important Safety Information
            </div>
            <div className="text-sm text-gray-700 mb-3">
              This platform provides educational resources and safety planning tools. It is not a crisis intervention service. 
              For emergencies, call 911. By using this platform, you acknowledge that you understand its limitations and 
              will seek appropriate professional help when needed.
            </div>
            <div className="flex gap-3">
              <Button onClick={onAccept} size="sm">
                I Understand & Continue
              </Button>
              <Button onClick={onDecline} variant="outline" size="sm">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Legal footer component
export function LegalFooter() {
  return (
    <footer className="border-t bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="font-medium mb-2">Platform Information</div>
            <div className="text-muted-foreground space-y-1">
              <div>Educational resource directory</div>
              <div>Safety planning tools</div>
              <div>Not a crisis intervention service</div>
            </div>
          </div>
          
          <div>
            <div className="font-medium mb-2">Emergency Resources</div>
            <div className="text-muted-foreground space-y-1">
              <div>Emergency: 911</div>
              <div>Crisis Support: 988</div>
              <div>Domestic Violence: 1-800-799-7233</div>
            </div>
          </div>
          
          <div>
            <div className="font-medium mb-2">Privacy & Safety</div>
            <div className="text-muted-foreground space-y-1">
              <div>Local data storage only</div>
              <div>User-controlled access</div>
              <div>No automated intervention</div>
            </div>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>© 2024 Crisis Support Platform. Educational resource directory only.</div>
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            Privacy-focused design
          </div>
        </div>
      </div>
    </footer>
  )
}