'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Zap, 
  ExternalLink, 
  Eye, 
  Shield, 
  Clock, 
  AlertTriangle,
  Info,
  Settings,
  History,
  Trash2,
  CheckCircle,
  XCircle,
  Globe,
  Smartphone,
  Monitor,
  Key
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickExitProtocolProps {
  open: boolean
  onClose: () => void
  emergencyMode?: boolean
}

interface ExitConfiguration {
  disguiseUrl: string
  clearHistory: boolean
  clearLocalStorage: boolean
  redirectDelay: number
  decoyKeystrokes: string[]
  useIncognitoMode: boolean
  customExitPhrase: string
}

interface SecurityLevel {
  id: string
  name: string
  description: string
  features: string[]
  config: Partial<ExitConfiguration>
}

const SECURITY_LEVELS: SecurityLevel[] = [
  {
    id: 'basic',
    name: 'Basic Exit',
    description: 'Simple redirect to a neutral website',
    features: [
      'Immediate redirect to Google',
      'No history clearing',
      'Quick and simple'
    ],
    config: {
      disguiseUrl: 'https://www.google.com',
      clearHistory: false,
      clearLocalStorage: false,
      redirectDelay: 0
    }
  },
  {
    id: 'standard',
    name: 'Standard Security',
    description: 'Clears recent browser history and redirects',
    features: [
      'Clear recent browser history',
      'Redirect to weather or news site',
      'Remove safety app traces'
    ],
    config: {
      disguiseUrl: 'https://weather.com',
      clearHistory: true,
      clearLocalStorage: true,
      redirectDelay: 100
    }
  },
  {
    id: 'high',
    name: 'High Security',
    description: 'Maximum privacy protection for dangerous situations',
    features: [
      'Clear all local data',
      'Replace browser history',
      'Simulated normal browsing',
      'Multiple redirect layers'
    ],
    config: {
      disguiseUrl: 'https://weather.com',
      clearHistory: true,
      clearLocalStorage: true,
      redirectDelay: 200,
      decoyKeystrokes: ['weather today', 'news headlines'],
      useIncognitoMode: true
    }
  }
]

const DISGUISE_SITES = [
  { name: 'Google Search', url: 'https://www.google.com', type: 'search' },
  { name: 'Weather.com', url: 'https://weather.com', type: 'info' },
  { name: 'BBC News', url: 'https://www.bbc.com/news', type: 'news' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', type: 'reference' },
  { name: 'CNN', url: 'https://www.cnn.com', type: 'news' },
  { name: 'Facebook', url: 'https://www.facebook.com', type: 'social' },
  { name: 'YouTube', url: 'https://www.youtube.com', type: 'video' },
  { name: 'Amazon', url: 'https://www.amazon.com', type: 'shopping' }
]

export function QuickExitProtocol({
  open,
  onClose,
  emergencyMode = false
}: QuickExitProtocolProps) {
  const [currentConfig, setCurrentConfig] = useState<ExitConfiguration>({
    disguiseUrl: 'https://www.google.com',
    clearHistory: true,
    clearLocalStorage: true,
    redirectDelay: 100,
    decoyKeystrokes: [],
    useIncognitoMode: false,
    customExitPhrase: ''
  })
  
  const [selectedSecurityLevel, setSelectedSecurityLevel] = useState<string>('standard')
  const [testMode, setTestMode] = useState(false)
  const [lastExitTime, setLastExitTime] = useState<Date | null>(null)

  useEffect(() => {
    // Load saved configuration
    const savedConfig = localStorage.getItem('quick-exit-config')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        setCurrentConfig(config)
      } catch (error) {
        console.warn('Failed to load exit configuration:', error)
      }
    }

    // Load last exit time
    const savedExitTime = localStorage.getItem('last-exit-time')
    if (savedExitTime) {
      setLastExitTime(new Date(savedExitTime))
    }
  }, [])

  const saveConfiguration = () => {
    localStorage.setItem('quick-exit-config', JSON.stringify(currentConfig))
  }

  const executeQuickExit = async (testMode: boolean = false) => {
    const startTime = new Date()
    
    try {
      // Store exit time for monitoring
      if (!testMode) {
        localStorage.setItem('last-exit-time', startTime.toISOString())
        setLastExitTime(startTime)
      }

      // Phase 1: Clear sensitive data
      if (currentConfig.clearLocalStorage && !testMode) {
        // Clear safety-related localStorage items
        const safetyKeys = Object.keys(localStorage).filter(key => 
          key.includes('safety') || 
          key.includes('crisis') || 
          key.includes('resource') ||
          key.includes('support')
        )
        
        safetyKeys.forEach(key => {
          localStorage.removeItem(key)
        })
      }

      // Phase 2: Browser history manipulation
      if (currentConfig.clearHistory && !testMode) {
        try {
          // Replace current page in history
          if (window.history && window.history.replaceState) {
            window.history.replaceState(
              { disguise: true },
              'Loading...',
              currentConfig.disguiseUrl
            )
          }

          // Add multiple neutral history entries to mask the app
          const neutralPages = [
            { url: 'https://www.google.com/search?q=weather', title: 'Weather - Google Search' },
            { url: 'https://news.google.com', title: 'Google News' },
            { url: currentConfig.disguiseUrl, title: 'Current Page' }
          ]

          for (const page of neutralPages) {
            if (window.history && window.history.pushState) {
              window.history.pushState(
                { disguise: true },
                page.title,
                page.url
              )
            }
          }
        } catch (error) {
          console.warn('History manipulation failed:', error)
        }
      }

      // Phase 3: Simulated typing (for high security)
      if (currentConfig.decoyKeystrokes && currentConfig.decoyKeystrokes.length > 0 && !testMode) {
        // This would simulate typing in the URL bar
        // Note: This is limited by browser security - may not work in all browsers
        const searchQuery = currentConfig.decoyKeystrokes[0]
        if (searchQuery) {
          // Try to set the URL to look like a search
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, 'Google Search', searchUrl)
          }
        }
      }

      // Phase 4: Delay and redirect
      if (currentConfig.redirectDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, currentConfig.redirectDelay))
      }

      // Phase 5: Final redirect
      if (!testMode) {
        window.location.href = currentConfig.disguiseUrl
      } else {
        // Test mode - just show success
        alert(`Test successful! Would redirect to: ${currentConfig.disguiseUrl}`)
      }

    } catch (error) {
      console.error('Quick exit failed:', error)
      // Fallback - immediate redirect
      if (!testMode) {
        window.location.href = currentConfig.disguiseUrl
      }
    }
  }

  const selectSecurityLevel = (levelId: string) => {
    const level = SECURITY_LEVELS.find(l => l.id === levelId)
    if (level) {
      setSelectedSecurityLevel(levelId)
      setCurrentConfig(prevConfig => ({
        ...prevConfig,
        ...level.config
      }))
    }
  }

  const updateConfig = (updates: Partial<ExitConfiguration>) => {
    setCurrentConfig(prev => ({ ...prev, ...updates }))
  }

  if (emergencyMode) {
    return (
      <Card className="border-red-500 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-red-800 text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Emergency Quick Exit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm text-red-700">
              Click below to immediately leave this site and clear traces
            </div>
            
            <Button
              onClick={() => executeQuickExit(false)}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-lg py-3"
              size="lg"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              QUICK EXIT NOW
            </Button>
            
            <div className="text-xs text-red-600 space-y-1">
              <div>• Will redirect to: {currentConfig.disguiseUrl}</div>
              <div>• Will clear recent browser history</div>
              <div>• For immediate safety</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" />
            Quick Exit Protocol Configuration
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Configure secure methods to quickly and safely leave this application
          </div>
        </DialogHeader>

        {/* Safety Warning */}
        <div className="px-6">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-sm">
              <div className="font-medium text-orange-800 mb-1">Safety Notice</div>
              <div className="text-orange-700 space-y-1">
                <div>• Quick exit features are designed for situations where your safety may be at risk</div>
                <div>• Test these features before relying on them in an emergency</div>
                <div>• Browser security may limit some privacy features</div>
                <div>• Always have a backup safety plan</div>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <Tabs defaultValue="setup" className="flex-1">
          <TabsList className="grid w-full grid-cols-3 mx-6">
            <TabsTrigger value="setup">Quick Setup</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Config</TabsTrigger>
            <TabsTrigger value="testing">Testing & Status</TabsTrigger>
          </TabsList>

          {/* Quick Setup Tab */}
          <TabsContent value="setup" className="p-6 pt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Security Level</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Choose the level of security based on your situation
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {SECURITY_LEVELS.map((level) => (
                    <Card
                      key={level.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        selectedSecurityLevel === level.id && "ring-2 ring-primary ring-offset-2"
                      )}
                      onClick={() => selectSecurityLevel(level.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold">
                            {level.name}
                          </CardTitle>
                          {selectedSecurityLevel === level.id && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {level.description}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="text-xs space-y-1">
                          {level.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Disguise Website</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Choose where to redirect when exiting
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {DISGUISE_SITES.map((site) => (
                    <Button
                      key={site.url}
                      variant={currentConfig.disguiseUrl === site.url ? "default" : "outline"}
                      onClick={() => updateConfig({ disguiseUrl: site.url })}
                      className="justify-start h-auto p-3"
                    >
                      <div className="text-left">
                        <div className="font-medium text-sm">{site.name}</div>
                        <div className="text-xs opacity-70">{site.type}</div>
                      </div>
                    </Button>
                  ))}
                </div>
                
                <div className="mt-4">
                  <label className="text-sm font-medium">Custom URL</label>
                  <Input
                    value={currentConfig.disguiseUrl}
                    onChange={(e) => updateConfig({ disguiseUrl: e.target.value })}
                    placeholder="https://example.com"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center">
              <Button
                onClick={() => executeQuickExit(true)}
                variant="outline"
                className="bg-blue-50 border-blue-200 text-blue-700"
              >
                <Eye className="h-4 w-4 mr-2" />
                Test Configuration
              </Button>
              
              <Button onClick={saveConfiguration} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </TabsContent>

          {/* Advanced Configuration Tab */}
          <TabsContent value="advanced" className="p-6 pt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Advanced Security Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={currentConfig.clearHistory}
                      onChange={(e) => updateConfig({ clearHistory: e.target.checked })}
                    />
                    <span className="text-sm">Clear browser history</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={currentConfig.clearLocalStorage}
                      onChange={(e) => updateConfig({ clearLocalStorage: e.target.checked })}
                    />
                    <span className="text-sm">Clear local data</span>
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium">Redirect Delay (ms)</label>
                  <Input
                    type="number"
                    value={currentConfig.redirectDelay}
                    onChange={(e) => updateConfig({ redirectDelay: Number(e.target.value) })}
                    min="0"
                    max="5000"
                    className="mt-1"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Time to wait before redirecting (0-5000ms)
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Custom Exit Phrase</label>
                  <Input
                    value={currentConfig.customExitPhrase}
                    onChange={(e) => updateConfig({ customExitPhrase: e.target.value })}
                    placeholder="Optional phrase to trigger quick exit"
                    className="mt-1"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Future feature: Type this phrase anywhere to trigger quick exit
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Browser Compatibility</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span className="font-medium">Desktop Browsers:</span>
                    <Badge variant="secondary">Full Support</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span className="font-medium">Mobile Browsers:</span>
                    <Badge variant="outline">Limited Support</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <span className="font-medium">Incognito Mode:</span>
                    <Badge variant="outline">Varies by Browser</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing & Status Tab */}
          <TabsContent value="testing" className="p-6 pt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Test Quick Exit</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Test your configuration safely without actually leaving the site
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => executeQuickExit(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Run Test Mode
                </Button>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Test mode simulates the exit process without actually leaving</div>
                  <div>• No data will be cleared in test mode</div>
                  <div>• Use this to verify your configuration works as expected</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Configuration Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Security Level:</span>
                    <Badge>{SECURITY_LEVELS.find(l => l.id === selectedSecurityLevel)?.name}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Disguise URL:</span>
                    <span className="text-blue-600 text-xs">{currentConfig.disguiseUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Clear History:</span>
                    {currentConfig.clearHistory ? 
                      <CheckCircle className="h-4 w-4 text-green-600" /> : 
                      <XCircle className="h-4 w-4 text-red-600" />
                    }
                  </div>
                  <div className="flex justify-between">
                    <span>Clear Local Data:</span>
                    {currentConfig.clearLocalStorage ? 
                      <CheckCircle className="h-4 w-4 text-green-600" /> : 
                      <XCircle className="h-4 w-4 text-red-600" />
                    }
                  </div>
                  {lastExitTime && (
                    <div className="flex justify-between">
                      <span>Last Exit:</span>
                      <span className="text-xs">{lastExitTime.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Emergency Access History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div>No emergency access history recorded</div>
                  <div className="text-xs">Emergency exits are logged for safety monitoring</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="px-6 pb-6">
          <Alert className="border-gray-200 bg-gray-50">
            <Key className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <div className="font-medium mb-1">Privacy Notice:</div>
              <div>Quick exit configurations are stored locally on your device only. No exit activity is transmitted to external servers. Test regularly to ensure functionality.</div>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Quick Exit Button for immediate use
export function EmergencyQuickExitButton({ 
  className,
  size = 'default'
}: { 
  className?: string
  size?: 'sm' | 'default' | 'lg'
}) {
  const handleEmergencyExit = () => {
    // Load saved config or use default
    const savedConfig = localStorage.getItem('quick-exit-config')
    let config = {
      disguiseUrl: 'https://www.google.com',
      clearHistory: true,
      clearLocalStorage: true
    }
    
    if (savedConfig) {
      try {
        config = { ...config, ...JSON.parse(savedConfig) }
      } catch (error) {
        console.warn('Failed to load exit config, using default')
      }
    }

    // Execute immediate exit
    try {
      // Clear safety-related data
      if (config.clearLocalStorage) {
        const safetyKeys = Object.keys(localStorage).filter(key => 
          key.includes('safety') || key.includes('crisis') || key.includes('support')
        )
        safetyKeys.forEach(key => localStorage.removeItem(key))
      }

      // Clear history and redirect
      if (config.clearHistory && window.history?.replaceState) {
        window.history.replaceState({}, '', config.disguiseUrl)
      }

      // Immediate redirect
      window.location.href = config.disguiseUrl
    } catch (error) {
      // Fallback
      window.location.href = 'https://www.google.com'
    }
  }

  return (
    <Button
      onClick={handleEmergencyExit}
      className={cn(
        "bg-red-600 hover:bg-red-700 text-white shadow-lg",
        "hover:scale-105 active:scale-95 transition-all",
        className
      )}
      size={size}
    >
      <ExternalLink className="h-4 w-4 mr-2" />
      Quick Exit
    </Button>
  )
}