'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Heart, 
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwords, setPasswords] = useState({
    password: '',
    confirmPassword: ''
  })
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Handle the password reset token from URL
    const handlePasswordReset = async () => {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        setError('Invalid or expired password reset link. Please request a new one.')
        return
      }

      if (!data.session) {
        setError('Invalid or expired password reset link. Please request a new one.')
        return
      }

      // User has valid session from reset link, they can now set new password
    }

    handlePasswordReset()
  }, [])

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    if (!/(?=.*[!@#$%^&*])/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)')
    }
    
    return errors
  }

  const handleInputChange = (field: string, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }))
    if (error) setError('') // Clear error when user starts typing
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate passwords
    if (passwords.password !== passwords.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const passwordErrors = validatePassword(passwords.password)
    if (passwordErrors.length > 0) {
      setError(passwordErrors[0]) // Show first error
      setLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwords.password
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      
      // Redirect to login after success
      setTimeout(() => {
        router.push('/auth/login')
      }, 3000)

    } catch (err) {
      let errorMessage = 'Failed to reset password'
      
      if (err instanceof Error) {
        switch (err.message) {
          case 'New password should be different from the old password':
            errorMessage = 'Please choose a different password from your current one'
            break
          default:
            errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestNewLink = async () => {
    router.push('/auth/login')
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-harmony-50 via-connection-50 to-growth-50">
        <div className="max-w-md mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Card>
              <CardContent className="p-8">
                <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-6">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Password Reset Successful
                </h1>
                
                <p className="text-gray-600 mb-6">
                  Your password has been updated successfully. You can now sign in 
                  with your new password.
                </p>

                <div className="text-sm text-gray-500">
                  Redirecting to sign in...
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-harmony-50 via-connection-50 to-growth-50">
      <div className="max-w-md mx-auto px-6 py-12">
        {/* Back Button */}
        <div className="mb-8">
          <Button
            onClick={() => router.push('/auth/login')}
            variant="ghost"
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Button>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-white rounded-full shadow-lg">
              <Heart className="h-8 w-8 text-connection-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
          <p className="text-gray-600">
            Enter your new password below to regain access to your account
          </p>
        </motion.div>

        {/* Reset Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Create New Password</CardTitle>
              <CardDescription>
                Choose a strong password to keep your account secure
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* New Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={passwords.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter your new password"
                      required
                      disabled={loading}
                      className="w-full pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwords.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirm your new password"
                      required
                      disabled={loading}
                      className="w-full pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">Password requirements:</p>
                  <ul className="space-y-1 text-xs">
                    <li className={`flex items-center gap-2 ${passwords.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwords.password.length >= 8 ? 'bg-green-600' : 'bg-gray-300'}`} />
                      At least 8 characters long
                    </li>
                    <li className={`flex items-center gap-2 ${/(?=.*[a-z])/.test(passwords.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${/(?=.*[a-z])/.test(passwords.password) ? 'bg-green-600' : 'bg-gray-300'}`} />
                      One lowercase letter
                    </li>
                    <li className={`flex items-center gap-2 ${/(?=.*[A-Z])/.test(passwords.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${/(?=.*[A-Z])/.test(passwords.password) ? 'bg-green-600' : 'bg-gray-300'}`} />
                      One uppercase letter
                    </li>
                    <li className={`flex items-center gap-2 ${/(?=.*\d)/.test(passwords.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${/(?=.*\d)/.test(passwords.password) ? 'bg-green-600' : 'bg-gray-300'}`} />
                      One number
                    </li>
                    <li className={`flex items-center gap-2 ${/(?=.*[!@#$%^&*])/.test(passwords.password) ? 'text-green-600' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${/(?=.*[!@#$%^&*])/.test(passwords.password) ? 'bg-green-600' : 'bg-gray-300'}`} />
                      One special character
                    </li>
                  </ul>
                </div>

                {/* Error Display */}
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || !passwords.password || !passwords.confirmPassword}
                  className="w-full bg-connection-500 hover:bg-connection-600"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating Password...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>

              {/* Request New Link */}
              <div className="mt-6 text-center">
                <Button
                  onClick={handleRequestNewLink}
                  variant="link"
                  className="text-connection-600 hover:text-connection-700"
                  disabled={loading}
                >
                  Request a new reset link
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-8 text-sm text-gray-600"
        >
          <p>
            <a href="/privacy" className="text-connection-600 hover:underline">Privacy Policy</a>
            {' • '}
            <a href="/terms" className="text-connection-600 hover:underline">Terms of Service</a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}