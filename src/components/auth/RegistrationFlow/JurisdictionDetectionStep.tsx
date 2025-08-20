'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Globe, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import type { RegistrationData } from './RegistrationFlow'

interface JurisdictionDetectionStepProps {
  data: RegistrationData
  onComplete: (data: Partial<RegistrationData>) => void
}

export const JurisdictionDetectionStep: React.FC<JurisdictionDetectionStepProps> = ({
  data,
  onComplete
}) => {
  const [detecting, setDetecting] = useState(true)
  const [detectedLocation, setDetectedLocation] = useState('')
  const [countryCode, setCountryCode] = useState('')

  useEffect(() => {
    // Simulate location detection
    setTimeout(() => {
      // In a real app, you'd use IP geolocation or browser geolocation API
      const mockLocation = {
        country: 'United States',
        countryCode: 'US',
        state: 'California',
        city: 'San Francisco'
      }
      
      setDetectedLocation(`${mockLocation.city}, ${mockLocation.state}, ${mockLocation.country}`)
      setCountryCode(mockLocation.countryCode)
      setDetecting(false)
    }, 2000)
  }, [])

  const handleConfirm = () => {
    onComplete({
      jurisdiction: {
        countryCode,
        detectedLocation,
        confirmedByUser: true
      }
    })
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-connection-100 rounded-full">
            <MapPin className="h-8 w-8 text-connection-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">
          Setting Up Your Location
        </CardTitle>
        <CardDescription>
          We need to know your location to provide appropriate crisis resources and comply with local privacy laws.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {detecting ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-connection-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Detecting your location...</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="flex items-center space-x-4 p-4 bg-growth-50 border border-growth-200 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-growth-600" />
              <div>
                <h3 className="font-medium text-growth-900">Location Detected</h3>
                <p className="text-growth-700">{detectedLocation}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Why we need this information:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-connection-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Provide local crisis hotlines and emergency resources</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-connection-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Connect you with licensed professionals in your area</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-connection-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Comply with local privacy and data protection laws</span>
                </li>
              </ul>
            </div>

            <Button 
              onClick={handleConfirm}
              className="w-full bg-connection-500 hover:bg-connection-600"
              size="lg"
            >
              Confirm Location
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}