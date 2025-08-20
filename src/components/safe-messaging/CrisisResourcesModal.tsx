'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Phone, 
  MessageSquare, 
  ExternalLink, 
  Heart, 
  Shield, 
  MapPin,
  Clock,
  AlertTriangle,
  Info,
  UserCheck,
  Building,
  Search,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  graduatedSafetyResponseSystem,
  CrisisResourceSet 
} from '@/lib/messaging/safety-responses'
import { transparencyLoggingSystem } from '@/lib/messaging/transparency-logging'

interface CrisisResourcesModalProps {
  open: boolean
  onClose: () => void
  userId: string
}

export function CrisisResourcesModal({
  open,
  onClose,
  userId
}: CrisisResourcesModalProps) {
  const [crisisResources, setCrisisResources] = useState<CrisisResourceSet | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('immediate')

  useEffect(() => {
    if (open) {
      loadCrisisResources()
    }
  }, [open, userId])

  const loadCrisisResources = async () => {
    setLoading(true)
    try {
      const resources = await graduatedSafetyResponseSystem.getLocalizedCrisisResources(userId)
      setCrisisResources(resources)
    } catch (error) {
      console.error('Failed to load crisis resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResourceAccess = async (
    resourceName: string, 
    resourceType: string, 
    contact: string,
    contactMethod: 'phone' | 'text' | 'website' | 'chat'
  ) => {
    try {
      // Log resource access for transparency
      await transparencyLoggingSystem.logResourceAccess(
        userId, 
        resourceName, 
        resourceType, 
        'manual_search'
      )

      // Handle different contact methods
      switch (contactMethod) {
        case 'phone':
          window.location.href = `tel:${contact}`
          break
        case 'text':
          window.location.href = `sms:${contact}`
          break
        case 'website':
          if (contact.startsWith('http')) {
            window.open(contact, '_blank', 'noopener,noreferrer')
          } else {
            // Handle internal routes
            window.location.href = contact
          }
          break
        case 'chat':
          window.open(contact, '_blank', 'noopener,noreferrer')
          break
      }
    } catch (error) {
      console.error('Failed to access resource:', error)
    }
  }

  const getContactIcon = (contactMethod: string) => {
    switch (contactMethod) {
      case 'phone': return <Phone className="h-4 w-4" />
      case 'text': return <MessageSquare className="h-4 w-4" />
      case 'chat': return <MessageSquare className="h-4 w-4" />
      case 'website': return <ExternalLink className="h-4 w-4" />
      default: return <ExternalLink className="h-4 w-4" />
    }
  }

  const getContactLabel = (contactMethod: string) => {
    switch (contactMethod) {
      case 'phone': return 'Call Now'
      case 'text': return 'Send Text'
      case 'chat': return 'Start Chat'
      case 'website': return 'Visit Website'
      default: return 'Access'
    }
  }

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'crisis_hotline': return <Phone className="h-4 w-4 text-red-600" />
      case 'domestic_violence': return <Shield className="h-4 w-4 text-purple-600" />
      case 'mental_health': return <Heart className="h-4 w-4 text-green-600" />
      case 'self_help': return <Info className="h-4 w-4 text-blue-600" />
      case 'professional': return <UserCheck className="h-4 w-4 text-orange-600" />
      default: return <Info className="h-4 w-4" />
    }
  }

  if (loading || !crisisResources) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
            Loading crisis resources...
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-600" />
            Crisis Support Resources
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Professional help is available 24/7. You don't have to go through this alone.
          </div>
        </DialogHeader>

        {/* Emergency Notice */}
        <div className="px-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm">
              <strong>If you're in immediate danger:</strong> Call 911 or go to your nearest emergency room.
              <br />
              <strong>For suicide prevention:</strong> Call 988 (National Suicide Prevention Lifeline) immediately.
            </AlertDescription>
          </Alert>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3 mx-6">
            <TabsTrigger value="immediate">Immediate Help</TabsTrigger>
            <TabsTrigger value="local">Local Resources</TabsTrigger>
            <TabsTrigger value="professional">Professional Care</TabsTrigger>
          </TabsList>

          {/* Immediate Help Tab */}
          <TabsContent value="immediate" className="p-6 pt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  These resources are available 24/7 and provide immediate crisis support.
                </div>
                
                {crisisResources.immediate.map((resource, index) => (
                  <Card key={index} className="border-l-4 border-l-red-600">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Phone className="h-5 w-5 text-red-600" />
                        {resource.name}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {resource.description}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <Clock className="h-3 w-3" />
                        Available 24/7
                      </div>
                      
                      <Separator />
                      
                      <div className="grid gap-2">
                        {resource.phone && (
                          <Button
                            className="justify-start text-left h-auto p-3 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                            variant="outline"
                            onClick={() => handleResourceAccess(
                              resource.name, 
                              'crisis_hotline', 
                              resource.phone,
                              'phone'
                            )}
                          >
                            <Phone className="h-4 w-4 mr-3" />
                            <div>
                              <div className="font-semibold">Call {resource.phone}</div>
                              <div className="text-xs">Speak with a crisis counselor now</div>
                            </div>
                          </Button>
                        )}
                        
                        {resource.text && (
                          <Button
                            className="justify-start text-left h-auto p-3"
                            variant="outline"
                            onClick={() => handleResourceAccess(
                              resource.name, 
                              'crisis_hotline', 
                              resource.text,
                              'text'
                            )}
                          >
                            <MessageSquare className="h-4 w-4 mr-3" />
                            <div>
                              <div className="font-semibold">Text {resource.text}</div>
                              <div className="text-xs">Crisis support via text message</div>
                            </div>
                          </Button>
                        )}
                        
                        {resource.chat && (
                          <Button
                            className="justify-start text-left h-auto p-3"
                            variant="outline"
                            onClick={() => handleResourceAccess(
                              resource.name, 
                              'crisis_hotline', 
                              resource.chat,
                              'chat'
                            )}
                          >
                            <MessageSquare className="h-4 w-4 mr-3" />
                            <div>
                              <div className="font-semibold">Online Chat</div>
                              <div className="text-xs">Start a chat with a counselor</div>
                            </div>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Local Resources Tab */}
          <TabsContent value="local" className="p-6 pt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Local crisis support services and community resources in your area.
                </div>
                
                {crisisResources.local.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <div className="text-sm text-muted-foreground">
                        No local resources found. The immediate help resources above are available nationwide.
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  crisisResources.local.map((resource, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2 text-base">
                              <Building className="h-5 w-5" />
                              {resource.name}
                            </CardTitle>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {resource.type}
                            </Badge>
                          </div>
                          
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {resource.description}
                        </p>
                        
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleResourceAccess(
                            resource.name, 
                            resource.type, 
                            resource.contact,
                            resource.contact.includes('@') ? 'website' : 'phone'
                          )}
                        >
                          {getContactIcon(resource.contact.includes('@') ? 'website' : 'phone')}
                          <span className="ml-2">{resource.contact}</span>
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Professional Care Tab */}
          <TabsContent value="professional" className="p-6 pt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Find licensed mental health professionals for ongoing support and therapy.
                </div>
                
                {crisisResources.professional.map((resource, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <UserCheck className="h-5 w-5 text-blue-600" />
                        {resource.name}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs w-fit">
                        {resource.type}
                      </Badge>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {resource.description}
                      </p>
                      
                      {resource.specialization && resource.specialization.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium">Specializations:</div>
                          <div className="flex flex-wrap gap-1">
                            {resource.specialization.map((spec, specIndex) => (
                              <Badge key={specIndex} variant="outline" className="text-xs">
                                {spec.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleResourceAccess(
                          resource.name, 
                          resource.type, 
                          resource.contact,
                          'website'
                        )}
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Find Professionals
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer with additional info */}
        <div className="px-6 pb-6">
          <Separator className="mb-4" />
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              All resource access is logged for follow-up and safety purposes
            </div>
            <div className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              These resources are provided for educational and support purposes
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              Remember: seeking help is a sign of strength, not weakness
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}