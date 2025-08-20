'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Phone, 
  MessageSquare, 
  ExternalLink, 
  Search, 
  MapPin, 
  Clock, 
  Shield, 
  Heart,
  AlertTriangle,
  Info,
  Star,
  Globe,
  Eye,
  Users,
  BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  CrisisResource, 
  globalResourceRegistry 
} from '@/lib/safety-resources/global-resource-registry'
import { 
  locationBasedResourceMatcher,
  UserLocation,
  ResourceMatchResult
} from '@/lib/safety-resources/location-matcher'
import { EmergencyContactCard, QuickExitButton } from './AlwaysAccessibleSafetyButton'

interface ComprehensiveResourceDirectoryProps {
  open: boolean
  onClose: () => void
  emergencyAccess?: boolean
  initialResourceType?: CrisisResource['resourceType']
  legalContext: {
    disclaimer: string
    userControl: string
    emergencyNote: string
    noAutomation: string
  }
}

export function ComprehensiveResourceDirectory({
  open,
  onClose,
  emergencyAccess = false,
  initialResourceType,
  legalContext
}: ComprehensiveResourceDirectoryProps) {
  const [resourceMatches, setResourceMatches] = useState<ResourceMatchResult[]>([])
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedResourceType, setSelectedResourceType] = useState<string>(
    initialResourceType || 'all'
  )
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false)

  useEffect(() => {
    if (open) {
      loadInitialResources()
    }
  }, [open, selectedResourceType])

  const loadInitialResources = async () => {
    setLoading(true)
    try {
      // Try to detect user location (privacy-respecting)
      const locationResult = await locationBasedResourceMatcher.detectUserLocation(locationPermissionGranted)
      setUserLocation(locationResult.location)

      // Get relevant resources
      let matches: ResourceMatchResult[]
      
      if (emergencyAccess) {
        matches = await locationBasedResourceMatcher.getEmergencyResources(locationResult.location)
      } else {
        const resourceTypes = selectedResourceType === 'all' 
          ? undefined 
          : [selectedResourceType as CrisisResource['resourceType']]
        
        matches = await locationBasedResourceMatcher.findRelevantResources(
          locationResult.location,
          resourceTypes,
          { maxResults: 20 }
        )
      }

      setResourceMatches(matches)
    } catch (error) {
      console.error('Failed to load resources:', error)
      // Load fallback national resources
      const fallbackResources = globalResourceRegistry.getEmergencyResources()
      setResourceMatches(fallbackResources.map(resource => ({
        resource,
        relevanceScore: 50,
        matchReasons: ['National resource']
      })))
    } finally {
      setLoading(false)
    }
  }

  const requestLocationPermission = async () => {
    try {
      await navigator.geolocation.getCurrentPosition(() => {
        setLocationPermissionGranted(true)
        loadInitialResources()
      })
    } catch (error) {
      console.log('Location permission denied - using fallback location detection')
      loadInitialResources()
    }
  }

  const filteredResources = resourceMatches.filter(match => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    const resource = match.resource
    
    return (
      resource.name.toLowerCase().includes(query) ||
      resource.description.toLowerCase().includes(query) ||
      resource.services.some(service => service.toLowerCase().includes(query)) ||
      resource.resourceType.toLowerCase().includes(query)
    )
  })

  const handleResourceContact = (resource: CrisisResource, contactMethod: CrisisResource['contactMethods'][0]) => {
    // Log access for transparency (non-personal)
    console.log(`Resource accessed: ${resource.name} via ${contactMethod.type}`)
    
    // Handle different contact methods
    switch (contactMethod.type) {
      case 'phone':
        window.location.href = `tel:${contactMethod.value}`
        break
      case 'text':
        if (contactMethod.value.includes('to')) {
          // Format like "TEXT HOME to 741741"
          alert(`Send a text message: ${contactMethod.label}`)
        } else {
          window.location.href = `sms:${contactMethod.value}`
        }
        break
      case 'website':
        window.open(contactMethod.value, '_blank', 'noopener,noreferrer')
        break
      case 'email':
        window.location.href = `mailto:${contactMethod.value}`
        break
      default:
        console.log('Unsupported contact method:', contactMethod.type)
    }
  }

  const getResourceTypeIcon = (type: CrisisResource['resourceType']) => {
    switch (type) {
      case 'crisis_hotline': return <Phone className="h-4 w-4 text-red-600" />
      case 'domestic_violence': return <Shield className="h-4 w-4 text-purple-600" />
      case 'mental_health': return <Heart className="h-4 w-4 text-green-600" />
      case 'relationship_counseling': return <Users className="h-4 w-4 text-blue-600" />
      case 'emergency_services': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  const getContactMethodIcon = (type: string) => {
    switch (type) {
      case 'phone': return <Phone className="h-4 w-4" />
      case 'text': return <MessageSquare className="h-4 w-4" />
      case 'website': case 'chat': return <ExternalLink className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Crisis Support Resources
            </DialogTitle>
            <QuickExitButton className="ml-4" />
          </div>
          <div className="text-sm text-muted-foreground">
            Comprehensive directory of support resources - you choose when and how to reach out
          </div>
        </DialogHeader>

        {/* Legal Disclaimer */}
        <div className="px-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm space-y-1">
              <div className="font-medium text-blue-800">Important: Resource Directory Only</div>
              <div className="text-blue-700">
                • {legalContext.disclaimer}
              </div>
              <div className="text-blue-700">
                • {legalContext.userControl}
              </div>
              <div className="text-blue-700">
                • {legalContext.emergencyNote}
              </div>
              <div className="text-blue-700">
                • {legalContext.noAutomation}
              </div>
            </AlertDescription>
          </Alert>
        </div>

        {emergencyAccess && (
          <div className="px-6">
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-800 text-base">
                  Emergency Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmergencyContactCard />
              </CardContent>
            </Card>
            <Separator className="my-4" />
          </div>
        )}

        <Tabs defaultValue="directory" className="flex-1">
          <TabsList className="grid w-full grid-cols-3 mx-6">
            <TabsTrigger value="directory">Resource Directory</TabsTrigger>
            <TabsTrigger value="location">Local Resources</TabsTrigger>
            <TabsTrigger value="education">Safety Information</TabsTrigger>
          </TabsList>

          {/* Resource Directory Tab */}
          <TabsContent value="directory" className="p-6 pt-4">
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resources (e.g., 'crisis', 'domestic violence', 'counseling')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <select
                  value={selectedResourceType}
                  onChange={(e) => setSelectedResourceType(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="all">All Resources</option>
                  <option value="crisis_hotline">Crisis Hotlines</option>
                  <option value="domestic_violence">Domestic Violence</option>
                  <option value="mental_health">Mental Health</option>
                  <option value="relationship_counseling">Relationship Counseling</option>
                  <option value="emergency_services">Emergency Services</option>
                </select>
              </div>

              {/* Location Detection */}
              {!locationPermissionGranted && (
                <Alert>
                  <MapPin className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Enable location to find resources near you (optional)</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={requestLocationPermission}
                    >
                      Find Local Resources
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Resource List */}
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                      Loading resources...
                    </div>
                  ) : filteredResources.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <div>No resources found matching your criteria</div>
                      <div className="text-sm">Try adjusting your search or resource type</div>
                    </div>
                  ) : (
                    filteredResources.map((match) => (
                      <ResourceCard
                        key={match.resource.id}
                        match={match}
                        onContact={handleResourceContact}
                        userLocation={userLocation}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Local Resources Tab */}
          <TabsContent value="location" className="p-6 pt-4">
            <LocalResourcesView 
              userLocation={userLocation}
              onContact={handleResourceContact}
            />
          </TabsContent>

          {/* Safety Education Tab */}
          <TabsContent value="education" className="p-6 pt-4">
            <SafetyEducationContent />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="px-6 pb-6">
          <Separator className="mb-4" />
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              All resource access is logged for transparency and service improvement
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              This directory provides information only - you maintain full control over all contact
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              Remember: Seeking help is a sign of strength, not weakness
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Individual Resource Card Component
function ResourceCard({ 
  match, 
  onContact, 
  userLocation 
}: { 
  match: ResourceMatchResult
  onContact: (resource: CrisisResource, contactMethod: CrisisResource['contactMethods'][0]) => void
  userLocation: UserLocation | null
}) {
  const { resource } = match
  const primaryContact = resource.contactMethods.find(c => c.primary) || resource.contactMethods[0]

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      resource.crisisSpecific && "border-l-4 border-l-red-500",
      resource.discreteAccess && "border-l-4 border-l-blue-500"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg">
              {getResourceTypeIcon(resource.resourceType)}
            </div>
            
            <div className="flex-1">
              <CardTitle className="text-base font-semibold">
                {resource.name}
              </CardTitle>
              <div className="text-sm text-muted-foreground mt-1">
                {resource.organizationName}
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={resource.cost === 'free' ? 'secondary' : 'outline'} className="text-xs">
                  {resource.cost}
                </Badge>
                
                {resource.availability.schedule === '24/7' && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                    <Clock className="h-3 w-3 mr-1" />
                    24/7
                  </Badge>
                )}
                
                {resource.discreteAccess && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                    <Eye className="h-3 w-3 mr-1" />
                    Discrete
                  </Badge>
                )}
                
                {resource.verificationStatus === 'verified' && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {resource.qualityRating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium">{resource.qualityRating}</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {resource.description}
        </p>
        
        {/* Services */}
        {resource.services.length > 0 && (
          <div>
            <div className="text-xs font-medium mb-1">Services:</div>
            <div className="flex flex-wrap gap-1">
              {resource.services.map((service, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {service}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Match Reasons */}
        {match.matchReasons.length > 0 && (
          <div>
            <div className="text-xs font-medium mb-1">Why this resource:</div>
            <div className="text-xs text-muted-foreground">
              {match.matchReasons.join(', ')}
            </div>
          </div>
        )}
        
        {/* Contact Methods */}
        <div className="space-y-2">
          <div className="text-xs font-medium">Contact Options:</div>
          <div className="grid gap-2">
            {resource.contactMethods.map((contact, index) => (
              <Button
                key={index}
                onClick={() => onContact(resource, contact)}
                variant="outline"
                className={cn(
                  "justify-start h-auto p-3",
                  contact.primary && "ring-2 ring-primary ring-offset-2"
                )}
              >
                <div className="flex items-center w-full">
                  {getContactMethodIcon(contact.type)}
                  <div className="ml-3 text-left flex-1">
                    <div className="font-medium text-sm">{contact.label}</div>
                    {contact.instructions && (
                      <div className="text-xs text-muted-foreground">
                        {contact.instructions}
                      </div>
                    )}
                  </div>
                  {contact.primary && (
                    <Badge variant="secondary" className="text-xs">
                      Primary
                    </Badge>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </div>
        
        {/* Availability Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Available: {resource.availability.schedule}
          </div>
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            Languages: {resource.availability.languages.join(', ')}
          </div>
          {resource.coverage.type && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Coverage: {resource.coverage.type}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Placeholder components - would be implemented separately
function LocalResourcesView({ userLocation, onContact }: any) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <div>Local resources view would be implemented here</div>
      <div className="text-sm">Showing resources based on your location</div>
    </div>
  )
}

function SafetyEducationContent() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <div>Safety education content would be implemented here</div>
      <div className="text-sm">Information about recognizing crisis situations and staying safe</div>
    </div>
  )
}

function getResourceTypeIcon(type: CrisisResource['resourceType']) {
  switch (type) {
    case 'crisis_hotline': return <Phone className="h-4 w-4 text-red-600" />
    case 'domestic_violence': return <Shield className="h-4 w-4 text-purple-600" />
    case 'mental_health': return <Heart className="h-4 w-4 text-green-600" />
    case 'relationship_counseling': return <Users className="h-4 w-4 text-blue-600" />
    case 'emergency_services': return <AlertTriangle className="h-4 w-4 text-red-600" />
    default: return <Info className="h-4 w-4 text-gray-600" />
  }
}

function getContactMethodIcon(type: string) {
  switch (type) {
    case 'phone': return <Phone className="h-4 w-4" />
    case 'text': return <MessageSquare className="h-4 w-4" />
    case 'website': case 'chat': return <ExternalLink className="h-4 w-4" />
    default: return <Info className="h-4 w-4" />
  }
}