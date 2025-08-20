'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  Eye, 
  Database, 
  Clock, 
  Download, 
  Trash2, 
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ExternalLink,
  Lock,
  Unlock
} from 'lucide-react'
import { ConsentManager } from '@/lib/auth/consent-management'
import { motion } from 'framer-motion'

interface PrivacyDashboardProps {
  userId: string
}

interface DataProcessingActivity {
  id: string
  type: 'message_analysis' | 'crisis_detection' | 'relationship_insights' | 'ai_interaction'
  description: string
  timestamp: string
  legalBasis: string
  dataRetention: string
  canDelete: boolean
  partnerVisible: boolean
}

interface ConsentStatus {
  type: string
  granted: boolean
  timestamp: string
  version: string
  canRevoke: boolean
  description: string
  consequences: string[]
}

export const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true)
  const [consentStatuses, setConsentStatuses] = useState<ConsentStatus[]>([])
  const [dataActivities, setDataActivities] = useState<DataProcessingActivity[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'consents' | 'data' | 'controls'>('overview')
  const [error, setError] = useState('')
  const [dataStats, setDataStats] = useState({
    totalInteractions: 0,
    crisisDetections: 0,
    dataSize: '0 MB',
    oldestData: null as string | null,
    retentionDays: 365
  })

  const consentManager = new ConsentManager()

  useEffect(() => {
    loadDashboardData()
  }, [userId])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Load current consent statuses
      const consents = await consentManager.getUserConsentStatus(userId)
      setConsentStatuses(consents)

      // Simulate loading data processing activities (would come from database)
      const activities: DataProcessingActivity[] = [
        {
          id: '1',
          type: 'message_analysis',
          description: 'AI analysis of conversation for relationship insights',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          legalBasis: 'Consent',
          dataRetention: '365 days',
          canDelete: true,
          partnerVisible: false
        },
        {
          id: '2',
          type: 'crisis_detection',
          description: 'Safety monitoring detected potential crisis indicators',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          legalBasis: 'Vital interests (safety)',
          dataRetention: '7 years (safety records)',
          canDelete: false,
          partnerVisible: false
        },
        {
          id: '3',
          type: 'relationship_insights',
          description: 'Generated personalized relationship guidance',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          legalBasis: 'Consent',
          dataRetention: '365 days',
          canDelete: true,
          partnerVisible: true
        }
      ]
      setDataActivities(activities)

      // Set stats (would come from database)
      setDataStats({
        totalInteractions: 47,
        crisisDetections: 1,
        dataSize: '2.3 MB',
        oldestData: '2024-01-15',
        retentionDays: 365
      })
    } catch (err) {
      setError('Failed to load privacy dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const revokeConsent = async (consentType: string) => {
    try {
      await consentManager.revokeConsent(userId, consentType)
      await loadDashboardData()
    } catch (err) {
      setError('Failed to revoke consent')
    }
  }

  const downloadData = async () => {
    try {
      // Implement data export
      const data = {
        consents: consentStatuses,
        activities: dataActivities,
        exportDate: new Date().toISOString()
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sparq-connection-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to download data')
    }
  }

  const deleteData = async (activityId: string) => {
    try {
      // Implement data deletion
      setDataActivities(prev => prev.filter(a => a.id !== activityId))
    } catch (err) {
      setError('Failed to delete data')
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'consents', label: 'Consent Management', icon: Shield },
    { id: 'data', label: 'Data Processing', icon: Database },
    { id: 'controls', label: 'Privacy Controls', icon: Settings }
  ]

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Dashboard</h1>
        <p className="text-gray-600">
          Complete transparency into how your data is processed, stored, and protected
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-connection-500 text-connection-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Database className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Data Size</p>
                      <p className="text-2xl font-bold text-gray-900">{dataStats.dataSize}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Eye className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Interactions</p>
                      <p className="text-2xl font-bold text-gray-900">{dataStats.totalInteractions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Shield className="h-8 w-8 text-amber-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Safety Checks</p>
                      <p className="text-2xl font-bold text-gray-900">{dataStats.crisisDetections}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Retention</p>
                      <p className="text-2xl font-bold text-gray-900">{dataStats.retentionDays}d</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Data Processing Activity</CardTitle>
                <CardDescription>
                  The latest data processing activities on your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dataActivities.slice(0, 3).map((activity) => (
                    <div key={activity.id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{activity.type.replace('_', ' ')}</Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 mb-1">{activity.description}</p>
                        <p className="text-xs text-gray-600">Legal basis: {activity.legalBasis}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {activity.partnerVisible ? (
                          <Eye className="h-4 w-4 text-blue-500" title="Visible to partner" />
                        ) : (
                          <Lock className="h-4 w-4 text-gray-400" title="Private" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'consents' && (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You can revoke any consent at any time. Some features may become unavailable, 
                but your safety monitoring will continue based on vital interests.
              </AlertDescription>
            </Alert>

            <div className="grid gap-6">
              {consentStatuses.map((consent) => (
                <Card key={consent.type}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          {consent.granted ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <h3 className="text-lg font-medium">{consent.description}</h3>
                          <Badge variant={consent.granted ? "default" : "secondary"}>
                            {consent.granted ? 'Granted' : 'Revoked'}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          Granted on {new Date(consent.timestamp).toLocaleDateString()} 
                          (Version {consent.version})
                        </p>

                        {consent.consequences.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              If revoked, this will affect:
                            </p>
                            <ul className="text-sm text-gray-600 list-disc list-inside">
                              {consent.consequences.map((consequence, index) => (
                                <li key={index}>{consequence}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        {consent.canRevoke && consent.granted && (
                          <Button
                            onClick={() => revokeConsent(consent.type)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Revoke Consent
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Data Processing Log</h2>
                <p className="text-gray-600">Complete record of all data processing activities</p>
              </div>
              <Button onClick={downloadData} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>

            <div className="space-y-4">
              {dataActivities.map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline">{activity.type.replace('_', ' ')}</Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                          {activity.partnerVisible ? (
                            <Badge variant="secondary">
                              <Eye className="h-3 w-3 mr-1" />
                              Partner Visible
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Lock className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-gray-900 mb-2">{activity.description}</p>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Legal Basis:</strong> {activity.legalBasis}</p>
                          <p><strong>Data Retention:</strong> {activity.dataRetention}</p>
                        </div>
                      </div>

                      <div className="ml-4">
                        {activity.canDelete && (
                          <Button
                            onClick={() => deleteData(activity.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'controls' && (
          <div className="space-y-6">
            <div className="grid gap-6">
              {/* Data Portability */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Data Portability
                  </CardTitle>
                  <CardDescription>
                    Export all your data in a machine-readable format
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={downloadData}>
                    <Download className="h-4 w-4 mr-2" />
                    Download All Data
                  </Button>
                </CardContent>
              </Card>

              {/* Data Deletion */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-red-600" />
                    Data Deletion
                  </CardTitle>
                  <CardDescription>
                    Request deletion of your personal data (Right to be Forgotten)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Important:</strong> Safety records and crisis intervention data 
                      cannot be deleted due to legal obligations and your vital interests.
                    </AlertDescription>
                  </Alert>
                  <Button variant="outline" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Request Data Deletion
                  </Button>
                </CardContent>
              </Card>

              {/* Privacy Resources */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Privacy Resources
                  </CardTitle>
                  <CardDescription>
                    Learn more about your privacy rights and data protection
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Privacy Policy
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Data Processing Agreement
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Your Rights Under GDPR/PIPEDA
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Contact Data Protection Officer
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}