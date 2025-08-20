'use client'

import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  AlertTriangle, 
  Shield, 
  Phone, 
  MessageSquare, 
  ExternalLink,
  CheckCircle,
  X,
  Info,
  Heart,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SafetyResponse } from '@/lib/messaging/safety-responses'

interface RiskDetectionAlertProps {
  safetyResponse: SafetyResponse
  onDismiss: () => void
  onAccessCrisisResources: () => void
  className?: string
}

export function RiskDetectionAlert({
  safetyResponse,
  onDismiss,
  onAccessCrisisResources,
  className
}: RiskDetectionAlertProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [acknowledgedActions, setAcknowledgedActions] = useState<Set<string>>(new Set())

  const getSeverityColor = (severity: SafetyResponse['severity']) => {
    switch (severity) {
      case 'emergency': return 'destructive'
      case 'urgent': return 'destructive'
      case 'moderate': return 'default'
      case 'gentle': return 'secondary'
      default: return 'outline'
    }
  }

  const getSeverityIcon = (severity: SafetyResponse['severity']) => {
    switch (severity) {
      case 'emergency':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'moderate':
        return <Info className="h-4 w-4 text-blue-600" />
      case 'gentle':
        return <Heart className="h-4 w-4 text-green-600" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const handleActionComplete = (actionText: string) => {
    setAcknowledgedActions(prev => new Set([...prev, actionText]))
  }

  const getResourceIcon = (contactMethod: string) => {
    switch (contactMethod) {
      case 'phone': return <Phone className="h-4 w-4" />
      case 'text': return <MessageSquare className="h-4 w-4" />
      case 'chat': return <MessageSquare className="h-4 w-4" />
      case 'website': return <ExternalLink className="h-4 w-4" />
      default: return <ExternalLink className="h-4 w-4" />
    }
  }

  const handleResourceAccess = (resource: SafetyResponse['resources'][0]) => {
    // Track resource access
    if (resource.contactMethod === 'phone') {
      window.location.href = `tel:${resource.contact}`
    } else if (resource.contactMethod === 'website') {
      if (resource.contact.startsWith('http')) {
        window.open(resource.contact, '_blank', 'noopener,noreferrer')
      } else {
        // Internal resource
        onAccessCrisisResources()
      }
    } else if (resource.contactMethod === 'text') {
      // Open default SMS app
      window.location.href = `sms:${resource.contact}`
    }
  }

  return (
    <Card className={cn("border-l-4", className, {
      'border-l-red-600': safetyResponse.severity === 'emergency',
      'border-l-orange-600': safetyResponse.severity === 'urgent',
      'border-l-blue-600': safetyResponse.severity === 'moderate',
      'border-l-green-600': safetyResponse.severity === 'gentle'
    })}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {getSeverityIcon(safetyResponse.severity)}
            <div>
              <CardTitle className="text-base font-semibold">
                {safetyResponse.title}
              </CardTitle>
              
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getSeverityColor(safetyResponse.severity)} className="text-xs">
                  {safetyResponse.interventionType.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {safetyResponse.severity}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="h-8 w-8 p-0"
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            
            {safetyResponse.userCanDisable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Message */}
        <Alert>
          <AlertDescription className="text-sm leading-relaxed">
            {safetyResponse.message}
          </AlertDescription>
        </Alert>

        {/* Suggested Actions */}
        {safetyResponse.suggestedActions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Suggested Actions:</h4>
            <div className="space-y-2">
              {safetyResponse.suggestedActions.map((action, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    acknowledgedActions.has(action.action)
                      ? "bg-green-50 border-green-200"
                      : "bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "rounded-full p-1 mt-0.5",
                    action.priority === 'high' ? "bg-red-100" :
                    action.priority === 'medium' ? "bg-orange-100" : "bg-blue-100"
                  )}>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      action.priority === 'high' ? "bg-red-600" :
                      action.priority === 'medium' ? "bg-orange-600" : "bg-blue-600"
                    )} />
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{action.action}</span>
                      <Badge variant="outline" className="text-xs">
                        {action.type}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                    
                    {!acknowledgedActions.has(action.action) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleActionComplete(action.action)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resources */}
        {safetyResponse.resources.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Available Resources:</h4>
            <div className="grid gap-2">
              {safetyResponse.resources.map((resource, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border bg-card",
                    resource.discrete && "bg-blue-50 border-blue-200"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getResourceIcon(resource.contactMethod)}
                      <span className="font-medium text-sm">{resource.name}</span>
                      {resource.discrete && (
                        <Badge variant="outline" className="text-xs">
                          Private
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {resource.description}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {resource.availability}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResourceAccess(resource)}
                    className={cn(
                      resource.contactMethod === 'phone' && "text-green-600 hover:text-green-700"
                    )}
                  >
                    {resource.contactMethod === 'phone' && 'Call'}
                    {resource.contactMethod === 'text' && 'Text'}
                    {resource.contactMethod === 'chat' && 'Chat'}
                    {resource.contactMethod === 'website' && 'Visit'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Details Section */}
        {showDetails && (
          <>
            <Separator />
            <div className="space-y-3 pt-2">
              <h4 className="font-medium text-sm">Transparency Information:</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-medium text-muted-foreground min-w-20">Why:</span>
                  <span>{safetyResponse.explanation}</span>
                </div>
                
                {safetyResponse.triggeredBy.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-muted-foreground min-w-20">Detected:</span>
                    <div className="flex flex-wrap gap-1">
                      {safetyResponse.triggeredBy.map((trigger, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {trigger}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-2">
                  <span className="font-medium text-muted-foreground min-w-20">Privacy:</span>
                  <Badge 
                    variant={safetyResponse.privacyImpact === 'high' ? 'destructive' : 'outline'} 
                    className="text-xs"
                  >
                    {safetyResponse.privacyImpact} impact
                  </Badge>
                </div>
                
                {safetyResponse.userCanDisable && (
                  <div className="text-xs text-muted-foreground">
                    You can disable this type of intervention in your safety settings.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Follow-up Notice */}
        {safetyResponse.followUpNeeded && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {safetyResponse.reminderSchedule && (
                <>Follow-up check scheduled for {safetyResponse.reminderSchedule.replace(/_/g, ' ')}.</>
              )}
              {safetyResponse.escalationPath && (
                <> Escalation path: {safetyResponse.escalationPath}.</>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}