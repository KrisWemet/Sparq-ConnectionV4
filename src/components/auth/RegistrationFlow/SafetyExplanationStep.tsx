'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Shield, Eye, AlertTriangle, Phone, Users, Brain, CheckCircle2, Info } from 'lucide-react'
import { motion } from 'framer-motion'

interface SafetyExplanationStepProps {
  onComplete: () => void
}

export const SafetyExplanationStep: React.FC<SafetyExplanationStepProps> = ({ onComplete }) => {
  const [selectedTab, setSelectedTab] = useState<'monitoring' | 'crisis' | 'professional' | 'privacy'>('monitoring')

  const monitoringExamples = [
    {
      message: "I've been feeling really overwhelmed lately...",
      analysis: "Emotional distress indicator detected",
      action: "Provides stress management resources and coping strategies",
      level: "Low"
    },
    {
      message: "Sometimes I think everyone would be better without me",
      analysis: "Potential self-harm concern identified",
      action: "Immediate crisis resources provided, professional referral offered",
      level: "High"
    },
    {
      message: "We had a great date night yesterday!",
      analysis: "Positive relationship indicator",
      action: "Reinforces healthy patterns, suggests similar activities",
      level: "Positive"
    }
  ]

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'High':
        return 'bg-crisis-100 text-crisis-800 border-crisis-200'
      case 'Low':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'Positive':
        return 'bg-growth-100 text-growth-800 border-growth-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'monitoring':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">How Safety Monitoring Works</h3>
            <p className="text-sm text-gray-600">
              Our AI analyzes communication patterns to identify potential safety concerns and provide 
              appropriate support. Here are examples of how this works:
            </p>
            
            <div className="space-y-3">
              {monitoringExamples.map((example, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium text-gray-900">Example Message:</p>
                    <Badge variant="outline" className={getLevelColor(example.level)}>
                      {example.level} Priority
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 italic mb-3">"{example.message}"</p>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-gray-600">AI Analysis:</span>
                      <p className="text-xs text-gray-600">{example.analysis}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-600">System Response:</span>
                      <p className="text-xs text-gray-600">{example.action}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )

      case 'crisis':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Crisis Response Protocol</h3>
            <p className="text-sm text-gray-600">
              When serious safety concerns are detected, we have structured response protocols:
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <div className="p-2 bg-amber-100 rounded-full">
                  <Info className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-medium text-amber-900">Level 1: Concern Detected</h4>
                  <p className="text-sm text-amber-700">Self-help resources, coping strategies, optional check-ins</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <div className="p-2 bg-orange-100 rounded-full">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-medium text-orange-900">Level 2: Elevated Risk</h4>
                  <p className="text-sm text-orange-700">Crisis hotlines provided, professional referral offered</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <div className="p-2 bg-crisis-100 rounded-full">
                  <Phone className="h-4 w-4 text-crisis-600" />
                </div>
                <div>
                  <h4 className="font-medium text-crisis-900">Level 3: Crisis Intervention</h4>
                  <p className="text-sm text-crisis-700">Immediate professional contact, emergency resources, ongoing monitoring</p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'professional':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Professional Network</h3>
            <p className="text-sm text-gray-600">
              We maintain a network of licensed professionals who can provide appropriate support:
            </p>
            
            <div className="grid gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Licensed Therapists</h4>
                <p className="text-sm text-gray-600">
                  Couples counselors and individual therapists specializing in relationship issues
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Crisis Counselors</h4>
                <p className="text-sm text-gray-600">
                  Trained crisis intervention specialists available for immediate support
                </p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Support Coordinators</h4>
                <p className="text-sm text-gray-600">
                  Staff members who help coordinate care and follow up on referrals
                </p>
              </div>
            </div>
          </div>
        )

      case 'privacy':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Privacy Protections</h3>
            <p className="text-sm text-gray-600">
              Your privacy is protected through multiple layers of security and consent:
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-growth-500" />
                <span className="text-sm text-gray-700">End-to-end encryption for all personal communications</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-growth-500" />
                <span className="text-sm text-gray-700">Granular consent - you choose what gets analyzed</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-growth-500" />
                <span className="text-sm text-gray-700">No sharing with partners without explicit consent</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-growth-500" />
                <span className="text-sm text-gray-700">Right to withdraw consent and delete data anytime</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-growth-500" />
                <span className="text-sm text-gray-700">GDPR/PIPEDA compliant data handling</span>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-trust-100 rounded-full">
            <Shield className="h-8 w-8 text-trust-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">
          Understanding Our Safety-First Approach
        </CardTitle>
        <CardDescription>
          Transparency is key to trust. Here's exactly how we keep you safe while protecting your privacy.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key principle */}
        <Alert className="border-trust-200 bg-trust-50">
          <Shield className="h-4 w-4 text-trust-600" />
          <AlertDescription className="text-trust-800">
            <strong>Our core principle:</strong> We only analyze content to provide safety resources and 
            personalized support. We never judge, shame, or share information without your consent.
          </AlertDescription>
        </Alert>

        {/* Navigation tabs */}
        <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg">
          {[
            { id: 'monitoring', label: 'How It Works', icon: Eye },
            { id: 'crisis', label: 'Crisis Response', icon: AlertTriangle },
            { id: 'professional', label: 'Professional Network', icon: Users },
            { id: 'privacy', label: 'Privacy Protection', icon: Shield }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                selectedTab === tab.id
                  ? 'bg-white text-connection-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="min-h-64"
        >
          {renderTabContent()}
        </motion.div>

        {/* Important notice */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 text-sm mb-2">
            Your Control, Always
          </h4>
          <p className="text-xs text-gray-600 mb-3">
            You can adjust these settings anytime in your privacy dashboard. You'll see exactly 
            what's being analyzed and can opt out of non-essential monitoring.
          </p>
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <Brain className="h-3 w-3" />
            <span>AI analysis only for safety and personalization - never for judgment</span>
          </div>
        </div>

        <Button 
          onClick={onComplete}
          className="w-full bg-connection-500 hover:bg-connection-600"
          size="lg"
        >
          I understand how safety monitoring works
        </Button>
      </CardContent>
    </Card>
  )
}