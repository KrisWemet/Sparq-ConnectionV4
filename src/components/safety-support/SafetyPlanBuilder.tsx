'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  Upload,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Phone,
  MapPin,
  User,
  Heart,
  Clock,
  Info,
  BookOpen,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Client-side encryption for safety plans
class SafetyPlanEncryption {
  private static async generateKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    )
  }

  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }

  static async encrypt(data: string, password: string): Promise<string> {
    const encoder = new TextEncoder()
    const salt = window.crypto.getRandomValues(new Uint8Array(16))
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    
    const key = await this.deriveKey(password, salt)
    const encoded = encoder.encode(data)
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoded
    )

    // Combine salt, iv, and encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encrypted), salt.length + iv.length)

    return btoa(String.fromCharCode(...combined))
  }

  static async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)))
      
      const salt = combined.slice(0, 16)
      const iv = combined.slice(16, 28)
      const encrypted = combined.slice(28)

      const key = await this.deriveKey(password, salt)
      
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      )

      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
    } catch (error) {
      throw new Error('Failed to decrypt safety plan - incorrect password or corrupted data')
    }
  }
}

interface SafetyPlan {
  id: string
  title: string
  createdAt: Date
  lastUpdated: Date
  
  // Warning Signs
  personalWarnings: string[]
  relationshipWarnings: string[]
  environmentalWarnings: string[]
  
  // Coping Strategies
  immediateCoping: Array<{
    strategy: string
    effectiveness: number // 1-5 scale
    notes?: string
  }>
  
  // Support Network
  emergencyContacts: Array<{
    name: string
    relationship: string
    phone: string
    email?: string
    isEmergencyContact: boolean
    trustLevel: 'high' | 'medium' | 'low'
    notes?: string
  }>
  
  // Safe Places
  safePlaces: Array<{
    name: string
    address: string
    type: 'family' | 'friend' | 'shelter' | 'public' | 'professional'
    available24h: boolean
    transportation?: string
    notes?: string
  }>
  
  // Safety Resources
  professionalSupport: Array<{
    name: string
    type: 'therapist' | 'counselor' | 'doctor' | 'social_worker' | 'lawyer' | 'advocate'
    phone: string
    address?: string
    nextAppointment?: Date
    notes?: string
  }>
  
  // Crisis Resources
  crisisResources: Array<{
    name: string
    phone: string
    description: string
    type: 'crisis_hotline' | 'domestic_violence' | 'mental_health' | 'emergency'
  }>
  
  // Safety Measures
  safetyMeasures: Array<{
    category: 'digital' | 'physical' | 'financial' | 'legal' | 'communication'
    measure: string
    implemented: boolean
    priority: 'high' | 'medium' | 'low'
    notes?: string
  }>
  
  // Emergency Plan
  emergencyPlan: {
    escapeRoutes: string[]
    importantDocuments: string[]
    emergencyKit: string[]
    quickExitPlan: string
    digitalSafety: string[]
  }
  
  // Plan Metadata
  isEncrypted: boolean
  accessCount: number
  lastAccessed: Date
}

interface SafetyPlanBuilderProps {
  open: boolean
  onClose: () => void
  existingPlan?: SafetyPlan
  emergencyMode?: boolean
}

export function SafetyPlanBuilder({
  open,
  onClose,
  existingPlan,
  emergencyMode = false
}: SafetyPlanBuilderProps) {
  const [safetyPlan, setSafetyPlan] = useState<SafetyPlan>(
    existingPlan || createEmptySafetyPlan()
  )
  const [activeTab, setActiveTab] = useState(emergencyMode ? 'emergency' : 'overview')
  const [isEncrypted, setIsEncrypted] = useState(false)
  const [encryptionPassword, setEncryptionPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // Auto-save functionality
  useEffect(() => {
    if (open && safetyPlan.id) {
      const saveTimer = setTimeout(() => {
        savePlanLocally()
      }, 5000) // Auto-save after 5 seconds of inactivity

      return () => clearTimeout(saveTimer)
    }
  }, [safetyPlan, open])

  const savePlanLocally = async () => {
    try {
      setSaving(true)
      
      const planToSave = {
        ...safetyPlan,
        lastUpdated: new Date(),
        lastAccessed: new Date(),
        accessCount: safetyPlan.accessCount + 1
      }

      let dataToStore: string
      
      if (isEncrypted && encryptionPassword) {
        dataToStore = await SafetyPlanEncryption.encrypt(
          JSON.stringify(planToSave),
          encryptionPassword
        )
        planToSave.isEncrypted = true
      } else {
        dataToStore = JSON.stringify(planToSave)
        planToSave.isEncrypted = false
      }

      localStorage.setItem(`safety-plan-${planToSave.id}`, dataToStore)
      setSafetyPlan(planToSave)
      setSaveStatus('saved')
      
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save safety plan:', error)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const loadEncryptedPlan = async (planId: string, password: string) => {
    try {
      const encryptedData = localStorage.getItem(`safety-plan-${planId}`)
      if (!encryptedData) throw new Error('Plan not found')

      const decryptedData = await SafetyPlanEncryption.decrypt(encryptedData, password)
      const plan = JSON.parse(decryptedData) as SafetyPlan
      
      setSafetyPlan({
        ...plan,
        lastAccessed: new Date(),
        accessCount: plan.accessCount + 1
      })
      setEncryptionPassword(password)
      setIsEncrypted(true)
    } catch (error) {
      throw new Error('Failed to decrypt safety plan - check your password')
    }
  }

  const exportPlan = () => {
    const planData = JSON.stringify(safetyPlan, null, 2)
    const blob = new Blob([planData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `safety-plan-${safetyPlan.title.replace(/[^a-z0-9]/gi, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const addEmergencyContact = () => {
    setSafetyPlan(prev => ({
      ...prev,
      emergencyContacts: [
        ...prev.emergencyContacts,
        {
          name: '',
          relationship: '',
          phone: '',
          isEmergencyContact: true,
          trustLevel: 'high'
        }
      ]
    }))
  }

  const updateEmergencyContact = (index: number, field: string, value: any) => {
    setSafetyPlan(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    }))
  }

  const removeEmergencyContact = (index: number) => {
    setSafetyPlan(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index)
    }))
  }

  const addSafePlace = () => {
    setSafetyPlan(prev => ({
      ...prev,
      safePlaces: [
        ...prev.safePlaces,
        {
          name: '',
          address: '',
          type: 'friend',
          available24h: false
        }
      ]
    }))
  }

  const addCopingStrategy = () => {
    setSafetyPlan(prev => ({
      ...prev,
      immediateCoping: [
        ...prev.immediateCoping,
        {
          strategy: '',
          effectiveness: 3
        }
      ]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Personal Safety Plan Builder
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              {saveStatus === 'saved' && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Saved
                </Badge>
              )}
              {saving && (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1 animate-spin" />
                  Saving...
                </Badge>
              )}
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Create a personalized safety plan that you control completely. All data is stored locally on your device.
          </div>
        </DialogHeader>

        {/* Encryption Notice */}
        <div className="px-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Lock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm">
              <div className="font-medium text-blue-800 mb-1">Privacy & Security</div>
              <div className="text-blue-700 space-y-1">
                <div>• Your safety plan is stored locally on your device only</div>
                <div>• Enable encryption to protect your plan with a password</div>
                <div>• No data is sent to servers or shared with anyone</div>
                <div>• You have complete control over access and sharing</div>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-5 mx-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="safety">Safety</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="p-6 pt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plan Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Plan Title</label>
                  <Input
                    value={safetyPlan.title}
                    onChange={(e) => setSafetyPlan(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="My Personal Safety Plan"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Created:</span> {safetyPlan.createdAt.toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span> {safetyPlan.lastUpdated.toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Warning Signs</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Recognize early warning signs that indicate you may need to use your safety plan
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Personal Warning Signs</label>
                  <Textarea
                    value={safetyPlan.personalWarnings.join('\n')}
                    onChange={(e) => setSafetyPlan(prev => ({
                      ...prev,
                      personalWarnings: e.target.value.split('\n').filter(line => line.trim())
                    }))}
                    placeholder="Enter one warning sign per line, e.g.:&#10;- Feeling increasingly anxious&#10;- Having trouble sleeping&#10;- Avoiding certain places or people"
                    rows={4}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Relationship Warning Signs</label>
                  <Textarea
                    value={safetyPlan.relationshipWarnings.join('\n')}
                    onChange={(e) => setSafetyPlan(prev => ({
                      ...prev,
                      relationshipWarnings: e.target.value.split('\n').filter(line => line.trim())
                    }))}
                    placeholder="Enter relationship warning signs, e.g.:&#10;- Increased arguments or tension&#10;- Partner becoming more controlling&#10;- Feeling isolated from friends/family"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Immediate Coping Strategies</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Healthy ways to cope when you notice warning signs
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {safetyPlan.immediateCoping.map((coping, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <Input
                        value={coping.strategy}
                        onChange={(e) => setSafetyPlan(prev => ({
                          ...prev,
                          immediateCoping: prev.immediateCoping.map((c, i) =>
                            i === index ? { ...c, strategy: e.target.value } : c
                          )
                        }))}
                        placeholder="Coping strategy (e.g., deep breathing, calling a friend)"
                        className="flex-1"
                      />
                      <select
                        value={coping.effectiveness}
                        onChange={(e) => setSafetyPlan(prev => ({
                          ...prev,
                          immediateCoping: prev.immediateCoping.map((c, i) =>
                            i === index ? { ...c, effectiveness: Number(e.target.value) } : c
                          )
                        }))}
                        className="px-3 py-2 border rounded-md bg-background"
                      >
                        <option value={1}>1 - Not effective</option>
                        <option value={2}>2 - Somewhat effective</option>
                        <option value={3}>3 - Moderately effective</option>
                        <option value={4}>4 - Very effective</option>
                        <option value={5}>5 - Extremely effective</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSafetyPlan(prev => ({
                          ...prev,
                          immediateCoping: prev.immediateCoping.filter((_, i) => i !== index)
                        }))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={addCopingStrategy}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Coping Strategy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="p-6 pt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emergency Contacts</CardTitle>
                <div className="text-sm text-muted-foreground">
                  People you can contact in an emergency or crisis situation
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {safetyPlan.emergencyContacts.map((contact, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Name</label>
                          <Input
                            value={contact.name}
                            onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                            placeholder="Contact name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Relationship</label>
                          <Input
                            value={contact.relationship}
                            onChange={(e) => updateEmergencyContact(index, 'relationship', e.target.value)}
                            placeholder="Friend, family member, etc."
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Phone</label>
                          <Input
                            value={contact.phone}
                            onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                            placeholder="Phone number"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Trust Level</label>
                          <select
                            value={contact.trustLevel}
                            onChange={(e) => updateEmergencyContact(index, 'trustLevel', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md bg-background"
                          >
                            <option value="high">High - Complete trust</option>
                            <option value="medium">Medium - Generally trustworthy</option>
                            <option value="low">Low - Limited trust</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={contact.isEmergencyContact}
                            onChange={(e) => updateEmergencyContact(index, 'isEmergencyContact', e.target.checked)}
                          />
                          <span className="text-sm">Emergency contact (call first in crisis)</span>
                        </label>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEmergencyContact(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={addEmergencyContact}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Emergency Contact
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Professional Support */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Professional Support</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Healthcare providers, therapists, and other professionals you work with
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div>Professional support contacts would be managed here</div>
                  <Button variant="outline" className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Professional Contact
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Safety Tab */}
          <TabsContent value="safety" className="p-6 pt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Safe Places</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Places where you can go to feel safe
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {safetyPlan.safePlaces.map((place, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Place Name</label>
                          <Input
                            value={place.name}
                            onChange={(e) => setSafetyPlan(prev => ({
                              ...prev,
                              safePlaces: prev.safePlaces.map((p, i) =>
                                i === index ? { ...p, name: e.target.value } : p
                              )
                            }))}
                            placeholder="Name or description"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Type</label>
                          <select
                            value={place.type}
                            onChange={(e) => setSafetyPlan(prev => ({
                              ...prev,
                              safePlaces: prev.safePlaces.map((p, i) =>
                                i === index ? { ...p, type: e.target.value as any } : p
                              )
                            }))}
                            className="w-full px-3 py-2 border rounded-md bg-background"
                          >
                            <option value="family">Family Member's Home</option>
                            <option value="friend">Friend's Home</option>
                            <option value="public">Public Place</option>
                            <option value="shelter">Shelter/Safe House</option>
                            <option value="professional">Professional Office</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Address</label>
                        <Input
                          value={place.address}
                          onChange={(e) => setSafetyPlan(prev => ({
                            ...prev,
                            safePlaces: prev.safePlaces.map((p, i) =>
                              i === index ? { ...p, address: e.target.value } : p
                            )
                          }))}
                          placeholder="Address or general location"
                        />
                      </div>

                      <div className="flex justify-between items-center">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={place.available24h}
                            onChange={(e) => setSafetyPlan(prev => ({
                              ...prev,
                              safePlaces: prev.safePlaces.map((p, i) =>
                                i === index ? { ...p, available24h: e.target.checked } : p
                              )
                            }))}
                          />
                          <span className="text-sm">Available 24/7</span>
                        </label>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSafetyPlan(prev => ({
                            ...prev,
                            safePlaces: prev.safePlaces.filter((_, i) => i !== index)
                          }))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={addSafePlace}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Safe Place
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Safety Measures */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Safety Measures</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Actions you can take to improve your safety
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div>Safety measures checklist would be implemented here</div>
                  <div className="text-sm">Digital safety, physical safety, legal protections, etc.</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emergency Tab */}
          <TabsContent value="emergency" className="p-6 pt-4 space-y-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="font-medium text-red-800 mb-1">Emergency Action Plan</div>
                <div className="text-red-700">
                  This section helps you prepare for emergency situations. Remember: In immediate danger, call 911.
                </div>
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Exit Plan</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Step-by-step plan for leaving quickly if needed
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={safetyPlan.emergencyPlan.quickExitPlan}
                  onChange={(e) => setSafetyPlan(prev => ({
                    ...prev,
                    emergencyPlan: {
                      ...prev.emergencyPlan,
                      quickExitPlan: e.target.value
                    }
                  }))}
                  placeholder="Describe your quick exit plan:&#10;1. Go to the nearest exit (avoid basement, bathrooms)&#10;2. Take your phone and keys&#10;3. Go to [safe place]&#10;4. Call [emergency contact]"
                  rows={6}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Important Documents</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Documents to keep accessible or prepare copies of
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={safetyPlan.emergencyPlan.importantDocuments.join('\n')}
                  onChange={(e) => setSafetyPlan(prev => ({
                    ...prev,
                    emergencyPlan: {
                      ...prev.emergencyPlan,
                      importantDocuments: e.target.value.split('\n').filter(line => line.trim())
                    }
                  }))}
                  placeholder="List important documents to have ready:&#10;- Driver's license or ID&#10;- Birth certificate&#10;- Social security card&#10;- Insurance cards&#10;- Bank account information&#10;- Medication list&#10;- Important photos or keepsakes"
                  rows={8}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emergency Kit</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Items to keep ready or pack quickly
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={safetyPlan.emergencyPlan.emergencyKit.join('\n')}
                  onChange={(e) => setSafetyPlan(prev => ({
                    ...prev,
                    emergencyPlan: {
                      ...prev.emergencyPlan,
                      emergencyKit: e.target.value.split('\n').filter(line => line.trim())
                    }
                  }))}
                  placeholder="List items for your emergency kit:&#10;- Change of clothes&#10;- Medications&#10;- Cash or prepaid cards&#10;- Phone charger&#10;- Comfort items&#10;- First aid supplies"
                  rows={6}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="p-6 pt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plan Security</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Protect your safety plan with encryption
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="encryption-toggle"
                    checked={isEncrypted}
                    onChange={(e) => setIsEncrypted(e.target.checked)}
                  />
                  <label htmlFor="encryption-toggle" className="text-sm font-medium">
                    Encrypt this safety plan with a password
                  </label>
                </div>

                {isEncrypted && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={encryptionPassword}
                        onChange={(e) => setEncryptionPassword(e.target.value)}
                        placeholder="Enter encryption password"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>• Choose a strong password you'll remember</div>
                      <div>• Your password is not stored anywhere - if you forget it, your plan cannot be recovered</div>
                      <div>• Encryption protects your plan even if someone accesses your device</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plan Management</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Save, export, or share your safety plan
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={savePlanLocally}
                  className="w-full"
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Plan'}
                </Button>

                <Button
                  variant="outline"
                  onClick={exportPlan}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Plan (JSON)
                </Button>

                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Plans are saved locally on your device</div>
                  <div>• Export creates a backup file you can save elsewhere</div>
                  <div>• No data is sent to external servers</div>
                  <div>• You control all sharing and access</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Legal Notice</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground space-y-2 p-3 bg-gray-50 rounded">
                  <div className="font-medium">Important Disclaimers:</div>
                  <div>• This safety planning tool is for educational purposes only</div>
                  <div>• It does not replace professional safety planning with a counselor or advocate</div>
                  <div>• In immediate danger, call 911 or your local emergency services</div>
                  <div>• Consider working with a domestic violence advocate for comprehensive safety planning</div>
                  <div>• Your safety plan is private and stored only on your device</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function createEmptySafetyPlan(): SafetyPlan {
  return {
    id: `safety-plan-${Date.now()}`,
    title: 'My Personal Safety Plan',
    createdAt: new Date(),
    lastUpdated: new Date(),
    personalWarnings: [],
    relationshipWarnings: [],
    environmentalWarnings: [],
    immediateCoping: [],
    emergencyContacts: [],
    safePlaces: [],
    professionalSupport: [],
    crisisResources: [
      {
        name: 'National Suicide Prevention Lifeline',
        phone: '988',
        description: '24/7 crisis support',
        type: 'crisis_hotline'
      },
      {
        name: 'National Domestic Violence Hotline',
        phone: '1-800-799-7233',
        description: '24/7 domestic violence support',
        type: 'domestic_violence'
      },
      {
        name: 'Emergency Services',
        phone: '911',
        description: 'Police, fire, medical emergency',
        type: 'emergency'
      }
    ],
    safetyMeasures: [],
    emergencyPlan: {
      escapeRoutes: [],
      importantDocuments: [],
      emergencyKit: [],
      quickExitPlan: '',
      digitalSafety: []
    },
    isEncrypted: false,
    accessCount: 0,
    lastAccessed: new Date()
  }
}