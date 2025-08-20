'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Globe, 
  MapPin, 
  Shield, 
  Info, 
  CheckCircle,
  AlertTriangle,
  Loader2,
  Lock
} from 'lucide-react'
import { JurisdictionDetection, type DetectionResult, type JurisdictionInfo } from '@/lib/auth/jurisdiction-detection'
import { motion, AnimatePresence } from 'framer-motion'

interface JurisdictionSelectorProps {
  userId?: string
  onJurisdictionSelected: (jurisdiction: JurisdictionInfo, confidence: number) => void
  onError?: (error: string) => void
  autoDetect?: boolean
}

export const JurisdictionSelector: React.FC<JurisdictionSelectorProps> = ({
  userId,
  onJurisdictionSelected,
  onError,
  autoDetect = true
}) => {
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(autoDetect)
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null)
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('')
  const [manualSelection, setManualSelection] = useState(false)
  const [error, setError] = useState('')

  const jurisdictionDetection = new JurisdictionDetection()
  const supportedJurisdictions = jurisdictionDetection.getSupportedJurisdictions()

  useEffect(() => {
    if (autoDetect) {
      performAutoDetection()
    }
  }, [autoDetect])

  const performAutoDetection = async () => {
    setDetecting(true)
    setError('')

    try {
      const result = await jurisdictionDetection.detectJurisdiction()
      setDetectionResult(result)
      setSelectedJurisdiction(result.jurisdiction.code)

      // If confidence is high enough, auto-select
      if (result.confidence >= 0.8) {
        setTimeout(() => {
          handleConfirmJurisdiction(result.jurisdiction, result.confidence)
        }, 1500)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect jurisdiction'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setDetecting(false)
    }
  }

  const handleManualSelection = async (jurisdictionCode: string) => {
    if (!jurisdictionCode) return

    setLoading(true)
    setError('')

    try {
      const jurisdiction = await jurisdictionDetection.getJurisdictionInfo(jurisdictionCode)
      setSelectedJurisdiction(jurisdictionCode)
      
      // Create manual detection result
      const result: DetectionResult = {
        jurisdiction,
        confidence: 1.0,
        detectionMethod: 'user_input',
        timestamp: new Date().toISOString()
      }
      
      setDetectionResult(result)
    } catch (err) {
      setError('Failed to load jurisdiction information')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmJurisdiction = async (jurisdiction: JurisdictionInfo, confidence: number) => {
    setLoading(true)

    try {
      // Save to user profile if userId provided
      if (userId) {
        await jurisdictionDetection.saveUserJurisdiction(userId, jurisdiction.code)
      }
      
      onJurisdictionSelected(jurisdiction, confidence)
    } catch (err) {
      setError('Failed to save jurisdiction preference')
    } finally {
      setLoading(false)
    }
  }

  const getPrivacyBadge = (jurisdiction: JurisdictionInfo) => {
    switch (jurisdiction.privacyLaw) {
      case 'GDPR':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">GDPR Protected</Badge>
      case 'PIPEDA':
        return <Badge className="bg-green-100 text-green-800 border-green-200">PIPEDA Protected</Badge>
      case 'CCPA':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">CCPA Protected</Badge>
      default:
        return <Badge variant="outline">Standard Privacy</Badge>
    }
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge className="bg-green-100 text-green-800">High Confidence</Badge>
    } else if (confidence >= 0.5) {
      return <Badge className="bg-yellow-100 text-yellow-800">Medium Confidence</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">Low Confidence</Badge>
    }
  }

  const getDetectionMethodLabel = (method: string) => {
    switch (method) {
      case 'ip':
        return 'IP Address'
      case 'browser':
        return 'Browser Settings'
      case 'user_input':
        return 'Manual Selection'
      default:
        return 'Default Fallback'
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Globe className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Location & Privacy Settings</h1>
        <p className="text-gray-600">
          We need to know your location to provide appropriate crisis resources and comply with local privacy laws.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AnimatePresence mode="wait">
        {detecting && (
          <motion.div
            key="detecting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Detecting Your Location</h3>
                <p className="text-gray-600">
                  We're using your browser settings to determine your jurisdiction...
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!detecting && detectionResult && !manualSelection && (
          <motion.div
            key="detected"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Detected
                </CardTitle>
                <CardDescription>
                  We've detected your location. Please confirm or select a different jurisdiction.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Detection Result */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-lg">{detectionResult.jurisdiction.name}</h4>
                    <div className="flex gap-2">
                      {getPrivacyBadge(detectionResult.jurisdiction)}
                      {getConfidenceBadge(detectionResult.confidence)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Detection Method:</p>
                      <p className="font-medium">{getDetectionMethodLabel(detectionResult.detectionMethod)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Emergency Number:</p>
                      <p className="font-medium">{detectionResult.jurisdiction.emergencyNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Privacy Information */}
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>
                        <strong>Privacy Protection:</strong> Your data will be processed according to{' '}
                        <span className="font-semibold">
                          {detectionResult.jurisdiction.privacyLaw === 'GDPR' && 'European GDPR regulations'}
                          {detectionResult.jurisdiction.privacyLaw === 'PIPEDA' && 'Canadian PIPEDA regulations'}
                          {detectionResult.jurisdiction.privacyLaw === 'CCPA' && 'California CCPA regulations'}
                          {detectionResult.jurisdiction.privacyLaw === 'OTHER' && 'applicable privacy laws'}
                        </span>
                      </p>
                      
                      <div className="text-xs text-gray-600">
                        <p>• Right to be forgotten: {detectionResult.jurisdiction.legalRequirements.rightToBeforgotten ? 'Yes' : 'No'}</p>
                        <p>• Data portability: {detectionResult.jurisdiction.legalRequirements.dataPortability ? 'Yes' : 'No'}</p>
                        <p>• Data retention: {detectionResult.jurisdiction.dataRetentionRequirements.generalData} days (general), {detectionResult.jurisdiction.dataRetentionRequirements.safetyData} days (safety records)</p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Crisis Resources Preview */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-600" />
                    Available Crisis Resources
                  </h4>
                  <div className="space-y-2">
                    {detectionResult.jurisdiction.crisisResources.slice(0, 2).map((resource, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-red-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-red-900">{resource.name}</p>
                            <p className="text-red-700 font-mono">{resource.contact}</p>
                          </div>
                          <Badge variant="destructive">24/7</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleConfirmJurisdiction(detectionResult.jurisdiction, detectionResult.confidence)}
                    disabled={loading}
                    className="flex-1 bg-connection-500 hover:bg-connection-600"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Confirm Location
                  </Button>
                  
                  <Button
                    onClick={() => setManualSelection(true)}
                    variant="outline"
                    disabled={loading}
                  >
                    Choose Different Location
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!detecting && manualSelection && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Select Your Jurisdiction</CardTitle>
                <CardDescription>
                  Choose your current location for appropriate resources and privacy compliance.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div>
                  <label htmlFor="jurisdiction-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Country/Region
                  </label>
                  <Select
                    value={selectedJurisdiction}
                    onValueChange={handleManualSelection}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your jurisdiction" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedJurisdictions.map((jurisdiction) => (
                        <SelectItem key={jurisdiction.code} value={jurisdiction.code}>
                          <div className="flex items-center justify-between w-full">
                            <span>{jurisdiction.name}</span>
                            <span className="text-xs text-gray-500 ml-2">{jurisdiction.region}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedJurisdiction && detectionResult && (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{detectionResult.jurisdiction.name}</h4>
                        {getPrivacyBadge(detectionResult.jurisdiction)}
                      </div>
                      <p className="text-sm text-gray-600">
                        Emergency services: <strong>{detectionResult.jurisdiction.emergencyNumber}</strong>
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleConfirmJurisdiction(detectionResult.jurisdiction, 1.0)}
                        disabled={loading}
                        className="flex-1 bg-connection-500 hover:bg-connection-600"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Confirm Selection
                      </Button>
                      
                      <Button
                        onClick={() => setManualSelection(false)}
                        variant="outline"
                        disabled={loading}
                      >
                        Back
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!detecting && !detectionResult && !manualSelection && (
          <motion.div
            key="initial"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="p-8 text-center">
                <Globe className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select Your Location</h3>
                <p className="text-gray-600 mb-6">
                  Choose how you'd like to set your jurisdiction for appropriate resources and privacy compliance.
                </p>
                
                <div className="space-y-3">
                  <Button
                    onClick={performAutoDetection}
                    className="w-full bg-connection-500 hover:bg-connection-600"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Auto-Detect My Location
                  </Button>
                  
                  <Button
                    onClick={() => setManualSelection(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Choose Manually
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Important Notes */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p>
              <strong>Why we need this:</strong> Your location helps us provide appropriate crisis resources 
              and ensures we comply with local privacy laws.
            </p>
            <p className="text-sm">
              <Lock className="h-3 w-3 inline mr-1" />
              This information is used solely for resource matching and legal compliance.
              You can update your jurisdiction anytime in your privacy settings.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}