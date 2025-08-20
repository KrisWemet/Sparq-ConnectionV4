'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, MessageCircle, Users, Shield } from 'lucide-react'
import type { RegistrationData } from './RegistrationFlow'

interface ArchetypeSelectionStepProps {
  data: RegistrationData
  onComplete: (data: Partial<RegistrationData>) => void
}

export const ArchetypeSelectionStep: React.FC<ArchetypeSelectionStepProps> = ({
  data,
  onComplete
}) => {
  const [archetype, setArchetype] = useState(data.archetype)

  const handleComplete = () => {
    onComplete({ archetype })
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-harmony-100 rounded-full">
            <Heart className="h-8 w-8 text-harmony-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">
          Your Relationship Style
        </CardTitle>
        <CardDescription>
          Help us understand your communication and relationship preferences to provide personalized guidance.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick assessment - simplified for demo */}
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-3">Communication Style</h3>
            <div className="grid grid-cols-2 gap-2">
              {['Direct', 'Thoughtful', 'Expressive', 'Analytical'].map((style) => (
                <button
                  key={style}
                  onClick={() => setArchetype({...archetype, communicationStyle: style.toLowerCase()})}
                  className={`p-2 text-sm border rounded ${
                    archetype.communicationStyle === style.toLowerCase()
                      ? 'bg-connection-100 border-connection-300 text-connection-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-medium mb-3">Love Language</h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                'Words of Affirmation',
                'Acts of Service', 
                'Receiving Gifts',
                'Quality Time',
                'Physical Touch'
              ].map((language) => (
                <button
                  key={language}
                  onClick={() => setArchetype({...archetype, lovLanguagePrimary: language.toLowerCase().replace(/\s/g, '_')})}
                  className={`p-2 text-sm border rounded text-left ${
                    archetype.lovLanguagePrimary === language.toLowerCase().replace(/\s/g, '_')
                      ? 'bg-connection-100 border-connection-300 text-connection-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button 
          onClick={handleComplete}
          disabled={!archetype.communicationStyle || !archetype.lovLanguagePrimary}
          className="w-full bg-connection-500 hover:bg-connection-600"
          size="lg"
        >
          Continue to Privacy Settings
        </Button>
      </CardContent>
    </Card>
  )
}