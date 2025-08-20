'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  Heart, 
  Phone, 
  HelpCircle, 
  Eye, 
  EyeOff, 
  Zap,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComprehensiveResourceDirectory } from './ComprehensiveResourceDirectory'

interface AlwaysAccessibleSafetyButtonProps {
  className?: string
  variant?: 'prominent' | 'discrete' | 'disguised'
  position?: 'fixed' | 'static'
}

export function AlwaysAccessibleSafetyButton({ 
  className,
  variant = 'prominent',
  position = 'fixed'
}: AlwaysAccessibleSafetyButtonProps) {
  const [showResources, setShowResources] = useState(false)
  const [isDiscreteMode, setIsDiscreteMode] = useState(false)
  const [buttonVariant, setButtonVariant] = useState(variant)

  // Check for stored preference for discrete mode
  useEffect(() => {
    const storedMode = localStorage.getItem('safety-button-discrete')
    if (storedMode === 'true') {
      setIsDiscreteMode(true)
      setButtonVariant('discrete')
    }
  }, [])

  const toggleDiscreteMode = () => {
    const newMode = !isDiscreteMode
    setIsDiscreteMode(newMode)
    setButtonVariant(newMode ? 'discrete' : 'prominent')
    localStorage.setItem('safety-button-discrete', newMode.toString())
  }

  const handleSafetyButtonClick = () => {
    // Log the access for transparency (non-identifiable)
    console.log('Safety resources accessed at:', new Date().toISOString())
    setShowResources(true)
  }

  const getButtonContent = () => {
    switch (buttonVariant) {
      case 'disguised':
        return {
          icon: <HelpCircle className="h-4 w-4" />,
          text: 'Help',
          className: 'bg-muted hover:bg-muted/80 text-muted-foreground'
        }
      case 'discrete':
        return {
          icon: <Heart className="h-4 w-4" />,
          text: 'Support',
          className: 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200'
        }
      case 'prominent':
      default:
        return {
          icon: <Shield className="h-4 w-4" />,
          text: 'Crisis Support',
          className: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 shadow-lg'
        }
    }
  }

  const buttonContent = getButtonContent()

  return (
    <>
      {/* Main Safety Button */}
      <div className={cn(
        position === 'fixed' && 'fixed bottom-4 right-4 z-50',
        'flex flex-col items-end gap-2',
        className
      )}>
        {/* Discrete Mode Toggle */}
        {position === 'fixed' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDiscreteMode}
            className="h-8 w-8 p-0 bg-white/80 hover:bg-white border shadow-sm"
            title={isDiscreteMode ? 'Switch to prominent mode' : 'Switch to discrete mode'}
          >
            {isDiscreteMode ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
        )}

        {/* Main Safety Button */}
        <Button
          onClick={handleSafetyButtonClick}
          className={cn(
            'font-medium shadow-lg transition-all duration-200',
            'hover:scale-105 active:scale-95',
            buttonContent.className
          )}
          size="lg"
        >
          {buttonContent.icon}
          <span className="ml-2">{buttonContent.text}</span>
        </Button>

        {/* Emergency Quick Access */}
        {buttonVariant === 'prominent' && (
          <div className="flex flex-col gap-1 text-xs text-right">
            <div className="bg-white/90 rounded px-2 py-1 shadow text-red-600 font-medium">
              Emergency: Call 911
            </div>
            <div className="bg-white/90 rounded px-2 py-1 shadow text-blue-600">
              Crisis: Call 988
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Resource Directory Modal */}
      <ComprehensiveResourceDirectory
        open={showResources}
        onClose={() => setShowResources(false)}
        emergencyAccess={true}
        legalContext={{
          disclaimer: 'This platform provides resource information only. We do not provide direct crisis intervention services.',
          userControl: 'You maintain full control over which resources to contact and when.',
          emergencyNote: 'For immediate emergencies, call 911 or go to your nearest emergency room.',
          noAutomation: 'We will never automatically contact emergency services or other people on your behalf.'
        }}
      />
    </>
  )
}

// Emergency contact component for critical situations
export function EmergencyContactCard() {
  const emergencyContacts = [
    {
      name: 'Emergency Services',
      number: '911',
      description: 'Police, Fire, Medical Emergency',
      icon: <Zap className="h-5 w-5 text-red-600" />,
      color: 'red'
    },
    {
      name: '988 Suicide & Crisis Lifeline',
      number: '988',
      description: '24/7 Crisis Support',
      icon: <Phone className="h-5 w-5 text-blue-600" />,
      color: 'blue'
    },
    {
      name: 'Crisis Text Line',
      number: '741741',
      description: 'Text HOME to 741741',
      icon: <Phone className="h-5 w-5 text-green-600" />,
      color: 'green'
    }
  ]

  const handleEmergencyCall = (number: string, name: string) => {
    // Log for transparency
    console.log(`Emergency contact accessed: ${name} at ${new Date().toISOString()}`)
    window.location.href = `tel:${number}`
  }

  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <div className="text-sm font-medium text-red-600 mb-1">
          ⚠️ Emergency Resources
        </div>
        <div className="text-xs text-muted-foreground">
          Click to call immediately. You choose when and how to reach out.
        </div>
      </div>

      {emergencyContacts.map((contact) => (
        <Button
          key={contact.number}
          onClick={() => handleEmergencyCall(contact.number, contact.name)}
          className={cn(
            'w-full justify-start h-auto p-4 border-2',
            contact.color === 'red' && 'border-red-200 bg-red-50 hover:bg-red-100 text-red-800',
            contact.color === 'blue' && 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800',
            contact.color === 'green' && 'border-green-200 bg-green-50 hover:bg-green-100 text-green-800'
          )}
          variant="outline"
        >
          <div className="flex items-center w-full">
            {contact.icon}
            <div className="ml-3 text-left flex-1">
              <div className="font-semibold text-sm">{contact.name}</div>
              <div className="text-xs opacity-80">{contact.description}</div>
            </div>
            <div className="text-lg font-mono font-bold">
              {contact.number}
            </div>
          </div>
        </Button>
      ))}

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="font-medium">Important Legal Notice:</div>
          <div>• We provide resource information only - not direct emergency services</div>
          <div>• You control all contact with emergency services</div>
          <div>• For immediate danger, call 911 directly</div>
          <div>• This platform does not replace professional emergency response</div>
        </div>
      </div>
    </div>
  )
}

// Quick exit functionality for dangerous situations
export function QuickExitButton({ 
  disguiseUrl = 'https://www.google.com',
  className 
}: { 
  disguiseUrl?: string
  className?: string 
}) {
  const handleQuickExit = () => {
    // Clear any sensitive browser history
    if ('history' in window && 'replaceState' in window.history) {
      window.history.replaceState(null, '', disguiseUrl)
    }

    // Redirect to disguise site
    window.location.href = disguiseUrl
  }

  return (
    <Button
      onClick={handleQuickExit}
      variant="outline"
      size="sm"
      className={cn(
        'bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100',
        className
      )}
    >
      <ExternalLink className="h-3 w-3 mr-1" />
      Quick Exit
    </Button>
  )
}

// Discrete safety access - disguised as other functionality
export function DiscreteResourceAccess({ 
  disguiseAs = 'help',
  onResourceAccess
}: {
  disguiseAs?: 'help' | 'settings' | 'info'
  onResourceAccess: () => void
}) {
  const getDisguiseContent = () => {
    switch (disguiseAs) {
      case 'settings':
        return { icon: <Settings className="h-4 w-4" />, text: 'Settings' }
      case 'info':
        return { icon: <Info className="h-4 w-4" />, text: 'Info' }
      case 'help':
      default:
        return { icon: <HelpCircle className="h-4 w-4" />, text: 'Help' }
    }
  }

  const content = getDisguiseContent()

  return (
    <Button
      onClick={onResourceAccess}
      variant="ghost"
      size="sm"
      className="h-8 text-muted-foreground hover:text-foreground"
    >
      {content.icon}
      <span className="ml-1 text-xs">{content.text}</span>
    </Button>
  )
}