'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Shield, Users, Brain } from 'lucide-react'
import { motion } from 'framer-motion'

interface WelcomeStepProps {
  onComplete: () => void
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onComplete }) => {
  const features = [
    {
      icon: Shield,
      title: 'Safety First',
      description: 'Advanced safety monitoring with transparent consent and user control'
    },
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Personalized relationship guidance based on evidence-based psychology'
    },
    {
      icon: Users,
      title: 'Built for Couples',
      description: 'Designed specifically for partners to grow together safely and privately'
    },
    {
      icon: Heart,
      title: 'Wellness Focused',
      description: 'Educational support and growth tools, not therapy or medical treatment'
    }
  ]

  return (
    <Card className="safe-space">
      <CardHeader className="text-center pb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center mb-6"
        >
          <div className="p-4 bg-connection-100 rounded-full">
            <Heart className="h-12 w-12 text-connection-600 animate-heartbeat" />
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <CardTitle className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Sparq Connection
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 max-w-lg mx-auto">
            A safety-first platform designed to help couples strengthen their relationships 
            through evidence-based guidance and transparent AI support.
          </CardDescription>
        </motion.div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Key principles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-trust-50 rounded-lg p-6 border border-trust-200"
        >
          <h3 className="text-lg font-semibold text-trust-800 mb-3">
            Our Commitment to You
          </h3>
          <ul className="space-y-2 text-sm text-trust-700">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-trust-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span><strong>Complete Transparency:</strong> You'll always know what we monitor and why</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-trust-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span><strong>Your Control:</strong> Granular privacy settings you can adjust anytime</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-trust-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span><strong>Safety Priority:</strong> Crisis detection and professional resources when needed</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-trust-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span><strong>Evidence-Based:</strong> All guidance grounded in relationship psychology research</span>
            </li>
          </ul>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="grid md:grid-cols-2 gap-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.8 + (index * 0.1) }}
              className="p-4 border rounded-lg hover:border-connection-200 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-connection-100 rounded-lg">
                  <feature.icon className="h-4 w-4 text-connection-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">{feature.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Important notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
          className="bg-amber-50 border border-amber-200 rounded-lg p-4"
        >
          <h4 className="font-medium text-amber-800 text-sm mb-2">
            Important: This is a Wellness Platform
          </h4>
          <p className="text-xs text-amber-700">
            Sparq Connection provides educational support and wellness tools for relationships. 
            We are not a therapy service, medical device, or substitute for professional mental health care. 
            In crisis situations, we provide resources and connect you with licensed professionals.
          </p>
        </motion.div>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <Button 
            onClick={onComplete}
            className="w-full bg-connection-500 hover:bg-connection-600 text-white"
            size="lg"
          >
            I understand - Let's begin
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  )
}