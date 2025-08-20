'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import type { RegistrationData } from './RegistrationFlow'

interface ProfileSetupStepProps {
  data: RegistrationData
  onComplete: (data: Partial<RegistrationData>) => void
}

export const ProfileSetupStep: React.FC<ProfileSetupStepProps> = ({
  data,
  onComplete
}) => {
  const [formData, setFormData] = useState({
    email: data.email || '',
    password: data.password || '',
    displayName: data.displayName || '',
    relationshipStatus: data.relationshipStatus || 'single'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (!formData.displayName) {
      newErrors.displayName = 'Display name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onComplete({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName,
        relationshipStatus: formData.relationshipStatus as any
      })
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-connection-100 rounded-full">
            <User className="h-8 w-8 text-connection-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">
          Create Your Profile
        </CardTitle>
        <CardDescription>
          Tell us a bit about yourself to personalize your experience.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Email Address</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your.email@example.com"
              className={errors.email ? 'border-crisis-300' : ''}
            />
            {errors.email && (
              <p className="text-xs text-crisis-600">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>Password</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Choose a secure password"
                className={`pr-10 ${errors.password ? 'border-crisis-300' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-crisis-600">{errors.password}</p>
            )}
            <p className="text-xs text-gray-500">
              Must be at least 8 characters long
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Display Name</span>
            </Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="How you'd like to be called"
              className={errors.displayName ? 'border-crisis-300' : ''}
            />
            {errors.displayName && (
              <p className="text-xs text-crisis-600">{errors.displayName}</p>
            )}
            <p className="text-xs text-gray-500">
              This is how you'll appear to your partner and in the app
            </p>
          </div>

          {/* Relationship Status */}
          <div className="space-y-2">
            <Label>Current Relationship Status</Label>
            <Select
              value={formData.relationshipStatus}
              onValueChange={(value) => setFormData({ ...formData, relationshipStatus: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your current status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="dating">Dating</SelectItem>
                <SelectItem value="partnered">In a partnership</SelectItem>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="separated">Separated</SelectItem>
                <SelectItem value="complicated">It's complicated</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              This helps us provide appropriate guidance and resources
            </p>
          </div>
        </motion.div>

        <Button 
          onClick={handleSubmit}
          className="w-full bg-connection-500 hover:bg-connection-600"
          size="lg"
        >
          Continue to Relationship Assessment
        </Button>
      </CardContent>
    </Card>
  )
}