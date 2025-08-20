'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  Eye, 
  Download, 
  Trash2, 
  Settings, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  FileText,
  BarChart3,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  transparencyLoggingSystem, 
  TransparencyLogEntry, 
  TransparencyReport,
  UserControlAction
} from '@/lib/messaging/transparency-logging'

interface SafetyTransparencyLogProps {
  open: boolean
  onClose: () => void
  userId: string
}

export function SafetyTransparencyLog({
  open,
  onClose,
  userId
}: SafetyTransparencyLogProps) {
  const [transparencyLog, setTransparencyLog] = useState<TransparencyLogEntry[]>([])
  const [transparencyReport, setTransparencyReport] = useState<TransparencyReport | null>(null)
  const [userControls, setUserControls] = useState<UserControlAction[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('log')

  useEffect(() => {
    if (open) {
      loadTransparencyData()
    }
  }, [open, userId])

  const loadTransparencyData = async () => {
    setLoading(true)
    try {
      // Load transparency log
      const log = await transparencyLoggingSystem.getUserTransparencyLog(userId, 50)
      setTransparencyLog(log)

      // Generate transparency report
      const report = await transparencyLoggingSystem.generateTransparencyReport(userId, 'monthly')
      setTransparencyReport(report)

      // Get available user controls
      const controls = await transparencyLoggingSystem.getUserControlActions(userId)
      setUserControls(controls)

    } catch (error) {
      console.error('Failed to load transparency data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledgeEntry = async (entryId: string, feedback?: 'helpful' | 'concerning' | 'unclear' | 'appropriate') => {
    try {
      await transparencyLoggingSystem.acknowledgeTransparencyEntry(entryId, feedback)
      await loadTransparencyData() // Refresh data
    } catch (error) {
      console.error('Failed to acknowledge entry:', error)
    }
  }

  const handleExecuteControl = async (action: UserControlAction) => {
    try {
      const result = await transparencyLoggingSystem.executeControlAction(userId, action, true)
      
      if (result.success) {
        // Show success message and refresh data
        await loadTransparencyData()
      } else if (result.requiresConfirmation) {
        // Show confirmation dialog
        const confirmed = confirm(`${result.message} Are you sure you want to proceed?`)
        if (confirmed) {
          await transparencyLoggingSystem.executeControlAction(userId, action, true)
          await loadTransparencyData()
        }
      }
    } catch (error) {
      console.error('Failed to execute control action:', error)
    }
  }

  const getEventIcon = (eventType: TransparencyLogEntry['eventType']) => {
    switch (eventType) {
      case 'safety_analysis': return <Shield className="h-4 w-4" />
      case 'intervention_triggered': return <AlertTriangle className="h-4 w-4" />
      case 'resource_accessed': return <FileText className="h-4 w-4" />
      case 'preference_changed': return <Settings className="h-4 w-4" />
      case 'data_processed': return <BarChart3 className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const getEventColor = (eventType: TransparencyLogEntry['eventType']) => {
    switch (eventType) {
      case 'safety_analysis': return 'bg-blue-100 text-blue-800'
      case 'intervention_triggered': return 'bg-orange-100 text-orange-800'
      case 'resource_accessed': return 'bg-green-100 text-green-800'
      case 'preference_changed': return 'bg-purple-100 text-purple-800'
      case 'data_processed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Safety & Privacy Transparency
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3 mx-6">
            <TabsTrigger value="log">Activity Log</TabsTrigger>
            <TabsTrigger value="report">Monthly Report</TabsTrigger>
            <TabsTrigger value="controls">Privacy Controls</TabsTrigger>
          </TabsList>

          {/* Activity Log Tab */}
          <TabsContent value="log" className="p-6 pt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                    Loading transparency data...
                  </div>
                ) : transparencyLog.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No safety activities recorded yet
                  </div>
                ) : (
                  transparencyLog.map((entry) => (
                    <Card key={entry.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={cn("p-2 rounded-lg", getEventColor(entry.eventType))}>
                              {getEventIcon(entry.eventType)}
                            </div>
                            
                            <div className="flex-1">
                              <div className="font-medium text-sm">{entry.description}</div>
                              
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDate(entry.timestamp)}
                                
                                {entry.riskLevel && entry.riskLevel !== 'safe' && (
                                  <Badge variant="outline" className="text-xs">
                                    {entry.riskLevel} risk
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {entry.userAcknowledged && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        {/* Explanation */}
                        <div className="text-sm text-muted-foreground">
                          {entry.explanation}
                        </div>

                        {/* Data Processing Details */}
                        {entry.dataAccessed.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium">Data Processed:</div>
                            <div className="flex flex-wrap gap-1">
                              {entry.dataAccessed.map((data, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {data.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Processing Purpose & Retention */}
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="font-medium">Purpose:</span>
                            <div className="text-muted-foreground">{entry.processingPurpose}</div>
                          </div>
                          <div>
                            <span className="font-medium">Retention:</span>
                            <div className="text-muted-foreground">{entry.retentionPeriod}</div>
                          </div>
                        </div>

                        {/* Resources Provided */}
                        {entry.resourcesProvided && entry.resourcesProvided.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium">Resources Provided:</div>
                            <div className="flex flex-wrap gap-1">
                              {entry.resourcesProvided.map((resource, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {resource}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* User Actions */}
                        {!entry.userAcknowledged && (
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAcknowledgeEntry(entry.id, 'helpful')}
                              >
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                Helpful
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAcknowledgeEntry(entry.id, 'concerning')}
                              >
                                <ThumbsDown className="h-3 w-3 mr-1" />
                                Concerning
                              </Button>
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcknowledgeEntry(entry.id)}
                            >
                              Acknowledge
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Monthly Report Tab */}
          <TabsContent value="report" className="p-6 pt-4">
            <ScrollArea className="h-[500px]">
              {transparencyReport ? (
                <div className="space-y-6">
                  {/* Report Header */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {transparencyReport.reportPeriod.type.charAt(0).toUpperCase() + transparencyReport.reportPeriod.type.slice(1)} Transparency Report
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(transparencyReport.reportPeriod.start)} - {formatDate(transparencyReport.reportPeriod.end)}
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Summary Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Activity Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">
                            {transparencyReport.summary.messagesAnalyzed}
                          </div>
                          <div className="text-sm text-muted-foreground">Messages Analyzed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {transparencyReport.summary.interventionsTriggered}
                          </div>
                          <div className="text-sm text-muted-foreground">Interventions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {transparencyReport.summary.crisisResourcesProvided}
                          </div>
                          <div className="text-sm text-muted-foreground">Crisis Resources</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {transparencyReport.summary.dataPointsProcessed}
                          </div>
                          <div className="text-sm text-muted-foreground">Data Points</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Safety Analysis Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Safety Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-sm font-medium mb-2">Risk Level Distribution</div>
                        <div className="space-y-2">
                          {Object.entries(transparencyReport.safetyAnalysis.riskLevelDistribution).map(([level, count]) => (
                            <div key={level} className="flex items-center justify-between">
                              <span className="text-sm capitalize">{level}</span>
                              <Badge variant="outline">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {transparencyReport.safetyAnalysis.userSatisfactionScore !== undefined && (
                        <div>
                          <div className="text-sm font-medium">User Satisfaction Score</div>
                          <div className="text-2xl font-bold text-green-600">
                            {Math.round(transparencyReport.safetyAnalysis.userSatisfactionScore)}%
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Data Processing */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Data Processing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {transparencyReport.dataProcessing.dataTypesAccessed.map((dataType, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{dataType.type}</span>
                            <Badge variant="outline">{dataType.count} times</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Purpose: {dataType.purpose}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Retention: {dataType.retention}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  {transparencyReport.recommendations.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {transparencyReport.recommendations.map((rec, index) => (
                          <Alert key={index}>
                            <Info className="h-4 w-4" />
                            <div>
                              <div className="font-medium text-sm">{rec.title}</div>
                              <AlertDescription className="text-xs">
                                {rec.description}
                              </AlertDescription>
                              {rec.action && (
                                <Button variant="outline" size="sm" className="mt-2">
                                  {rec.action}
                                </Button>
                              )}
                            </div>
                          </Alert>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Loading report data...
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Privacy Controls Tab */}
          <TabsContent value="controls" className="p-6 pt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {userControls.map((control, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base capitalize">
                          {control.action.replace(/_/g, ' ')}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {control.safetyImpact && (
                            <Badge variant={
                              control.safetyImpact === 'high' ? 'destructive' :
                              control.safetyImpact === 'medium' ? 'default' : 'secondary'
                            } className="text-xs">
                              {control.safetyImpact} safety impact
                            </Badge>
                          )}
                          {control.privacyBenefit && (
                            <Badge variant="outline" className="text-xs">
                              {control.privacyBenefit} privacy benefit
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {control.details.description && (
                        <div className="text-sm text-muted-foreground">
                          {control.details.description}
                        </div>
                      )}
                      
                      {control.details.currentStatus !== undefined && (
                        <div className="text-xs">
                          <span className="font-medium">Current Status: </span>
                          <Badge variant={control.details.currentStatus ? 'default' : 'secondary'}>
                            {control.details.currentStatus ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-xs text-muted-foreground">
                          {control.confirmationRequired && "Requires confirmation"}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExecuteControl(control)}
                        >
                          {control.action === 'download_data' && <Download className="h-3 w-3 mr-1" />}
                          {control.action === 'delete_data' && <Trash2 className="h-3 w-3 mr-1" />}
                          {control.action === 'modify_consent' && <Settings className="h-3 w-3 mr-1" />}
                          Execute
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}