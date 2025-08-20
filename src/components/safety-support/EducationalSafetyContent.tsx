'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  BookOpen, 
  Heart, 
  AlertTriangle, 
  Shield, 
  CheckCircle, 
  XCircle,
  Lightbulb,
  Users,
  MessageSquare,
  Phone,
  Info,
  Star,
  ArrowRight,
  Play,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EducationalContent {
  id: string
  title: string
  category: 'healthy_relationships' | 'red_flags' | 'crisis_recognition' | 'de_escalation' | 'professional_help' | 'supporting_others'
  contentType: 'article' | 'checklist' | 'guide' | 'interactive' | 'video' | 'assessment'
  difficulty: 'basic' | 'intermediate' | 'advanced'
  estimatedTime: string
  description: string
  content: {
    introduction: string
    sections: Array<{
      title: string
      content: string
      examples?: string[]
      tips?: string[]
      warnings?: string[]
    }>
    keyTakeaways: string[]
    resources?: Array<{
      title: string
      description: string
      link?: string
      type: 'article' | 'book' | 'website' | 'hotline'
    }>
  }
  lastUpdated: Date
  evidenceBased: boolean
  sources?: string[]
}

// Educational content library
const EDUCATIONAL_CONTENT: EducationalContent[] = [
  {
    id: 'healthy-relationship-basics',
    title: 'Healthy Relationship Fundamentals',
    category: 'healthy_relationships',
    contentType: 'guide',
    difficulty: 'basic',
    estimatedTime: '10 minutes',
    description: 'Learn the core characteristics of healthy, supportive relationships',
    content: {
      introduction: 'Healthy relationships are built on mutual respect, trust, and support. Understanding these fundamentals helps you recognize what to look for and cultivate in your own relationships.',
      sections: [
        {
          title: 'Communication',
          content: 'Healthy relationships feature open, honest communication where both partners feel heard and respected.',
          examples: [
            'Both partners can express their feelings without fear',
            'Disagreements are discussed calmly and respectfully',
            'Partners listen to understand, not just to respond',
            'Neither partner uses silent treatment as punishment'
          ],
          tips: [
            'Use "I" statements to express feelings',
            'Practice active listening',
            'Take breaks during heated discussions',
            'Focus on the issue, not personal attacks'
          ]
        },
        {
          title: 'Trust and Respect',
          content: 'Partners trust each other and respect each other\'s boundaries, opinions, and individuality.',
          examples: [
            'Partners keep their word and follow through on commitments',
            'Both feel secure in the relationship',
            'Personal boundaries are acknowledged and respected',
            'Partners support each other\'s goals and dreams'
          ]
        },
        {
          title: 'Independence and Togetherness',
          content: 'Healthy relationships balance time together with maintaining individual identities and friendships.',
          examples: [
            'Both partners maintain friendships outside the relationship',
            'Each person has their own interests and hobbies',
            'Partners support each other\'s personal growth',
            'Neither partner feels they need to give up their identity'
          ]
        },
        {
          title: 'Conflict Resolution',
          content: 'Disagreements are handled constructively, with both partners working toward solutions.',
          examples: [
            'Conflicts are addressed directly, not avoided',
            'Both partners take responsibility for their part',
            'Solutions are sought that work for both people',
            'Apologies are genuine when mistakes are made'
          ]
        }
      ],
      keyTakeaways: [
        'Healthy relationships require effort from both partners',
        'Respect and trust are non-negotiable foundations',
        'Communication skills can be learned and improved',
        'Individual identity should be maintained within the relationship',
        'Conflicts are normal and can strengthen relationships when handled well'
      ],
      resources: [
        {
          title: 'Love is Respect',
          description: 'Educational resources about healthy relationships',
          link: 'https://www.loveisrespect.org/',
          type: 'website'
        }
      ]
    },
    lastUpdated: new Date(),
    evidenceBased: true,
    sources: ['Gottman Institute Research', 'National Domestic Violence Hotline Educational Materials']
  },
  
  {
    id: 'relationship-red-flags',
    title: 'Recognizing Relationship Red Flags',
    category: 'red_flags',
    contentType: 'checklist',
    difficulty: 'basic',
    estimatedTime: '15 minutes',
    description: 'Learn to identify warning signs of unhealthy relationship patterns',
    content: {
      introduction: 'Red flags are warning signs that indicate potential problems in a relationship. Recognizing these early can help you make informed decisions about your safety and wellbeing.',
      sections: [
        {
          title: 'Early Warning Signs',
          content: 'These behaviors may seem minor at first but often escalate over time.',
          examples: [
            'Excessive jealousy or possessiveness',
            'Trying to control what you wear, who you see, or where you go',
            'Checking your phone, email, or social media without permission',
            'Isolating you from friends and family',
            'Making all the decisions in the relationship',
            'Extreme mood swings or unpredictable anger'
          ],
          warnings: [
            'These behaviors often get worse over time',
            'Control often starts small and gradually increases',
            'Trust your instincts if something feels wrong'
          ]
        },
        {
          title: 'Serious Red Flags',
          content: 'These behaviors indicate serious problems that require immediate attention.',
          examples: [
            'Any form of physical violence or threats',
            'Verbal abuse, name-calling, or constant criticism',
            'Threatening to hurt you, themselves, or others',
            'Destroying your belongings or threatening to',
            'Controlling finances or preventing you from working',
            'Sexual coercion or assault',
            'Stalking or following you'
          ],
          warnings: [
            'These behaviors are never acceptable',
            'Violence and abuse typically escalate',
            'You deserve to feel safe in your relationship'
          ]
        },
        {
          title: 'Digital Red Flags',
          content: 'Unhealthy behaviors extend to digital spaces and technology.',
          examples: [
            'Demanding passwords to your accounts',
            'Monitoring your online activity',
            'Posting embarrassing content about you',
            'Using technology to track your location',
            'Sending excessive texts or calls',
            'Creating fake accounts to monitor you'
          ]
        }
      ],
      keyTakeaways: [
        'Red flags are warning signs, not character flaws to fix',
        'Healthy relationships don\'t include control or abuse',
        'Trust your instincts about concerning behaviors',
        'Early intervention is easier than later intervention',
        'You deserve a relationship built on respect and safety'
      ],
      resources: [
        {
          title: 'National Domestic Violence Hotline',
          description: '24/7 support and safety planning',
          link: 'tel:1-800-799-7233',
          type: 'hotline'
        }
      ]
    },
    lastUpdated: new Date(),
    evidenceBased: true,
    sources: ['National Domestic Violence Hotline', 'Break the Cycle Research']
  },

  {
    id: 'de-escalation-techniques',
    title: 'De-escalation and Communication Skills',
    category: 'de_escalation',
    contentType: 'guide',
    difficulty: 'intermediate',
    estimatedTime: '20 minutes',
    description: 'Learn practical techniques for managing conflict and tense situations',
    content: {
      introduction: 'De-escalation skills help manage tense situations and prevent conflicts from spiraling out of control. These techniques can be used in relationships, family situations, and other interpersonal conflicts.',
      sections: [
        {
          title: 'Understanding Escalation',
          content: 'Recognizing how conflicts escalate helps you intervene before they become destructive.',
          examples: [
            'Tone of voice becomes louder or more aggressive',
            'Body language becomes more closed or threatening',
            'Focus shifts from the issue to personal attacks',
            'Emotions override logical thinking',
            'Past grievances get brought into current discussions'
          ],
          tips: [
            'Notice your own escalation triggers',
            'Pay attention to your partner\'s warning signs',
            'Learn to recognize when a break is needed',
            'Understand that escalation is normal but manageable'
          ]
        },
        {
          title: 'De-escalation Techniques',
          content: 'Practical strategies to calm heated situations and return to productive communication.',
          examples: [
            'Lower your voice and speak more slowly',
            'Take deep breaths and encourage your partner to do the same',
            'Use "I" statements instead of "you" accusations',
            'Acknowledge your partner\'s feelings, even if you disagree',
            'Suggest taking a break if emotions are too high',
            'Focus on the specific issue, not character attacks'
          ],
          tips: [
            'Stay calm even if your partner is escalated',
            'Avoid defensive responses that escalate further',
            'Use neutral, non-judgmental language',
            'Show that you\'re listening through body language'
          ]
        },
        {
          title: 'When to Take a Break',
          content: 'Sometimes the best de-escalation technique is temporarily stepping away.',
          examples: [
            'When voices are raised and emotions are very high',
            'When the conversation is going in circles',
            'When personal attacks have started',
            'When you or your partner feel overwhelmed',
            'When you notice physical signs of stress'
          ],
          tips: [
            'Agree on break signals beforehand',
            'Set a specific time to return to the conversation',
            'Use the break to calm down, not to stew in anger',
            'Return with a commitment to productive discussion'
          ]
        },
        {
          title: 'Safety Considerations',
          content: 'Important safety considerations when using de-escalation techniques.',
          warnings: [
            'These techniques work best in relationships with mutual respect',
            'Don\'t use these techniques if you fear for your safety',
            'If your partner becomes violent, prioritize your safety',
            'Some situations require professional intervention',
            'Trust your instincts about when to disengage'
          ]
        }
      ],
      keyTakeaways: [
        'De-escalation starts with managing your own emotions',
        'Timing is crucial - know when to engage and when to step back',
        'Focus on understanding, not winning arguments',
        'These skills improve with practice',
        'Safety always comes first'
      ],
      resources: [
        {
          title: 'Crisis Text Line',
          description: 'Text support for managing difficult emotions',
          link: 'text:741741',
          type: 'hotline'
        }
      ]
    },
    lastUpdated: new Date(),
    evidenceBased: true,
    sources: ['Conflict Resolution Research', 'Gottman Institute Methods']
  },

  {
    id: 'crisis-recognition',
    title: 'Recognizing Crisis Situations',
    category: 'crisis_recognition',
    contentType: 'guide',
    difficulty: 'intermediate',
    estimatedTime: '15 minutes',
    description: 'Learn to identify when situations require immediate professional help',
    content: {
      introduction: 'Crisis situations require immediate attention and often professional intervention. Learning to recognize these situations helps you respond appropriately and get help quickly.',
      sections: [
        {
          title: 'Mental Health Crisis Signs',
          content: 'Warning signs that someone may be experiencing a mental health crisis.',
          examples: [
            'Talking about wanting to die or kill themselves',
            'Feeling hopeless or having no reason to live',
            'Talking about being a burden to others',
            'Increasing alcohol or drug use',
            'Withdrawing from activities and family/friends',
            'Dramatic mood changes',
            'Giving away prized possessions'
          ],
          warnings: [
            'Take all talk of suicide seriously',
            'Don\'t promise to keep suicidal thoughts secret',
            'Crisis situations require immediate professional help',
            'When in doubt, call 988 or emergency services'
          ]
        },
        {
          title: 'Relationship Crisis Signs',
          content: 'Indicators that a relationship situation has become dangerous or requires intervention.',
          examples: [
            'Physical violence of any kind',
            'Threats of violence to you, children, or pets',
            'Weapons being displayed or mentioned as threats',
            'Extreme controlling behavior that escalates quickly',
            'Threats of suicide if you leave the relationship',
            'Stalking or following behavior',
            'Sexual assault or coercion'
          ],
          warnings: [
            'Domestic violence often escalates',
            'The most dangerous time is often when leaving',
            'Trust your instincts about danger',
            'Professional safety planning is important'
          ]
        },
        {
          title: 'Immediate Response Steps',
          content: 'What to do when you recognize a crisis situation.',
          examples: [
            'Call 911 if there is immediate physical danger',
            'Call 988 for suicide prevention and mental health crisis',
            'Call 1-800-799-7233 for domestic violence support',
            'Don\'t leave someone alone who is experiencing suicidal thoughts',
            'Remove access to weapons or means of harm if safely possible',
            'Stay calm and listen without judgment'
          ],
          tips: [
            'Your safety comes first',
            'Don\'t try to handle crisis situations alone',
            'Professional help is available 24/7',
            'Follow up after the immediate crisis passes'
          ]
        }
      ],
      keyTakeaways: [
        'Crisis situations require immediate professional help',
        'Trust your instincts about danger or concerning behavior',
        'You cannot solve crisis situations alone',
        'Help is available 24/7 through hotlines and emergency services',
        'Follow-up support is important after crisis intervention'
      ],
      resources: [
        {
          title: '988 Suicide & Crisis Lifeline',
          description: '24/7 crisis support',
          link: 'tel:988',
          type: 'hotline'
        },
        {
          title: 'National Domestic Violence Hotline',
          description: '24/7 domestic violence support',
          link: 'tel:1-800-799-7233',
          type: 'hotline'
        }
      ]
    },
    lastUpdated: new Date(),
    evidenceBased: true,
    sources: ['National Suicide Prevention Lifeline', 'Substance Abuse and Mental Health Services Administration']
  },

  {
    id: 'seeking-professional-help',
    title: 'When and How to Seek Professional Help',
    category: 'professional_help',
    contentType: 'guide',
    difficulty: 'basic',
    estimatedTime: '12 minutes',
    description: 'Guidance on finding and working with mental health and relationship professionals',
    content: {
      introduction: 'Seeking professional help is a sign of strength and self-care. Understanding when and how to find appropriate support can make the process less overwhelming.',
      sections: [
        {
          title: 'When to Seek Help',
          content: 'Signs that professional support would be beneficial.',
          examples: [
            'Persistent feelings of sadness, anxiety, or hopelessness',
            'Relationship problems that keep recurring despite efforts',
            'Feeling overwhelmed by life circumstances',
            'Thoughts of self-harm or suicide',
            'Substance use problems',
            'Trauma recovery needs',
            'Major life transitions or losses'
          ],
          tips: [
            'You don\'t need to wait until things are "bad enough"',
            'Preventive mental health care is valuable',
            'Earlier intervention often means faster improvement',
            'Many people benefit from professional support'
          ]
        },
        {
          title: 'Types of Professional Help',
          content: 'Different types of professionals and what they offer.',
          examples: [
            'Licensed therapists/counselors: Individual, couples, or family therapy',
            'Psychologists: Therapy and psychological testing',
            'Psychiatrists: Medication management and therapy',
            'Social workers: Therapy and community resource connections',
            'Peer support specialists: Support from people with lived experience',
            'Domestic violence advocates: Safety planning and legal advocacy'
          ]
        },
        {
          title: 'Finding the Right Professional',
          content: 'How to find and choose appropriate professional support.',
          tips: [
            'Ask for referrals from your doctor or trusted sources',
            'Check with your insurance for covered providers',
            'Look for professionals with relevant specializations',
            'Consider logistics like location and appointment times',
            'Many providers offer brief consultations to assess fit',
            'It\'s okay to change providers if it\'s not a good match'
          ]
        },
        {
          title: 'What to Expect',
          content: 'Understanding the process of working with mental health professionals.',
          examples: [
            'Initial sessions focus on understanding your concerns',
            'Treatment goals are developed collaboratively',
            'Progress may be gradual and non-linear',
            'Homework or exercises may be assigned between sessions',
            'Regular check-ins about progress and satisfaction',
            'Confidentiality protections (with some exceptions for safety)'
          ]
        }
      ],
      keyTakeaways: [
        'Seeking help is a positive step toward wellbeing',
        'Many different types of professional support are available',
        'Finding the right fit may take time',
        'Professional help can be effective for many concerns',
        'You remain in control of your treatment decisions'
      ],
      resources: [
        {
          title: 'Psychology Today Therapist Directory',
          description: 'Find therapists by location and specialty',
          link: 'https://www.psychologytoday.com/',
          type: 'website'
        },
        {
          title: 'SAMHSA Treatment Locator',
          description: 'Find mental health and substance abuse treatment',
          link: 'https://findtreatment.samhsa.gov/',
          type: 'website'
        }
      ]
    },
    lastUpdated: new Date(),
    evidenceBased: true,
    sources: ['American Psychological Association', 'National Alliance on Mental Illness']
  }
]

interface EducationalSafetyContentProps {
  initialCategory?: EducationalContent['category']
  onResourceAccess?: (resource: any) => void
}

export function EducationalSafetyContent({
  initialCategory,
  onResourceAccess
}: EducationalSafetyContentProps) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'healthy_relationships')
  const [selectedContent, setSelectedContent] = useState<EducationalContent | null>(null)
  const [completedContent, setCompletedContent] = useState<Set<string>>(new Set())

  const categories = [
    { id: 'healthy_relationships', label: 'Healthy Relationships', icon: Heart },
    { id: 'red_flags', label: 'Red Flags', icon: AlertTriangle },
    { id: 'crisis_recognition', label: 'Crisis Recognition', icon: Shield },
    { id: 'de_escalation', label: 'De-escalation', icon: MessageSquare },
    { id: 'professional_help', label: 'Professional Help', icon: Users },
    { id: 'supporting_others', label: 'Supporting Others', icon: Lightbulb }
  ]

  const filteredContent = EDUCATIONAL_CONTENT.filter(
    content => content.category === selectedCategory
  )

  const markContentComplete = (contentId: string) => {
    setCompletedContent(prev => new Set([...prev, contentId]))
    // In a real implementation, this would be persisted to local storage or user preferences
    localStorage.setItem('completed-safety-content', JSON.stringify([...completedContent, contentId]))
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'basic': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return <BookOpen className="h-4 w-4" />
      case 'checklist': return <CheckCircle className="h-4 w-4" />
      case 'guide': return <Lightbulb className="h-4 w-4" />
      case 'video': return <Play className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  if (selectedContent) {
    return (
      <ContentViewer
        content={selectedContent}
        onBack={() => setSelectedContent(null)}
        onComplete={() => markContentComplete(selectedContent.id)}
        isCompleted={completedContent.has(selectedContent.id)}
        onResourceAccess={onResourceAccess}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Legal Disclaimer */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm">
          <div className="font-medium text-blue-800 mb-1">Educational Content Only</div>
          <div className="text-blue-700 space-y-1">
            <div>• This content is for educational purposes and general information only</div>
            <div>• It does not constitute professional advice, therapy, or crisis intervention</div>
            <div>• For personalized guidance, consult with licensed professionals</div>
            <div>• In crisis situations, contact 988, 911, or your local emergency services</div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Category Selection */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {categories.map((category) => {
          const Icon = category.icon
          const isSelected = selectedCategory === category.id
          
          return (
            <Button
              key={category.id}
              variant={isSelected ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id as any)}
              className={cn(
                "h-auto p-4 flex flex-col items-center gap-2",
                isSelected && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{category.label}</span>
            </Button>
          )
        })}
      </div>

      {/* Content List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {categories.find(c => c.id === selectedCategory)?.label} Resources
          </h3>
          <Badge variant="outline" className="text-xs">
            {filteredContent.length} resources
          </Badge>
        </div>

        {filteredContent.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-muted-foreground">
                No content available in this category yet.
              </div>
              <div className="text-sm text-muted-foreground">
                Check back soon for new educational resources.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredContent.map((content) => (
              <Card
                key={content.id}
                className={cn(
                  "transition-all hover:shadow-md cursor-pointer",
                  completedContent.has(content.id) && "ring-2 ring-green-200"
                )}
                onClick={() => setSelectedContent(content)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-muted rounded-lg">
                        {getContentTypeIcon(content.contentType)}
                      </div>
                      
                      <div className="flex-1">
                        <CardTitle className="text-base font-semibold">
                          {content.title}
                          {completedContent.has(content.id) && (
                            <CheckCircle className="inline-block ml-2 h-4 w-4 text-green-600" />
                          )}
                        </CardTitle>
                        <div className="text-sm text-muted-foreground mt-1">
                          {content.description}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={cn("text-xs", getDifficultyColor(content.difficulty))}>
                            {content.difficulty}
                          </Badge>
                          
                          <Badge variant="outline" className="text-xs">
                            {content.estimatedTime}
                          </Badge>
                          
                          {content.evidenceBased && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Evidence-based
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Content Viewer Component
function ContentViewer({
  content,
  onBack,
  onComplete,
  isCompleted,
  onResourceAccess
}: {
  content: EducationalContent
  onBack: () => void
  onComplete: () => void
  isCompleted: boolean
  onResourceAccess?: (resource: any) => void
}) {
  const [currentSection, setCurrentSection] = useState(0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Back to Resources
        </Button>
        
        {!isCompleted && (
          <Button onClick={onComplete} variant="outline">
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Complete
          </Button>
        )}
      </div>

      {/* Content Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">
                {content.title}
                {isCompleted && (
                  <CheckCircle className="inline-block ml-2 h-5 w-5 text-green-600" />
                )}
              </CardTitle>
              <div className="text-muted-foreground mt-1">
                {content.description}
              </div>
              
              <div className="flex items-center gap-3 mt-3">
                <Badge variant="outline" className="text-xs">
                  {content.difficulty}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {content.estimatedTime}
                </Badge>
                {content.evidenceBased && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    Evidence-based
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <p className="text-muted-foreground">
            {content.content.introduction}
          </p>
        </CardContent>
      </Card>

      {/* Content Sections */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={currentSection.toString()} onValueChange={(value) => setCurrentSection(Number(value))}>
            <TabsList className="w-full p-1 h-auto">
              {content.content.sections.map((section, index) => (
                <TabsTrigger
                  key={index}
                  value={index.toString()}
                  className="flex-1 text-xs py-2"
                >
                  {section.title}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {content.content.sections.map((section, index) => (
              <TabsContent key={index} value={index.toString()} className="p-6 pt-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {section.content}
                  </p>
                  
                  {section.examples && section.examples.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Examples:</h4>
                      <ul className="space-y-1">
                        {section.examples.map((example, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {section.tips && section.tips.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Tips:</h4>
                      <ul className="space-y-1">
                        {section.tips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {section.warnings && section.warnings.length > 0 && (
                    <Alert className="border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription>
                        <div className="font-medium text-orange-800 mb-1">Important Considerations:</div>
                        <ul className="text-orange-700 space-y-1">
                          {section.warnings.map((warning, idx) => (
                            <li key={idx} className="text-sm">• {warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                {/* Navigation */}
                <div className="flex justify-between mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                    disabled={currentSection === 0}
                  >
                    Previous
                  </Button>
                  
                  <Button
                    onClick={() => setCurrentSection(Math.min(content.content.sections.length - 1, currentSection + 1))}
                    disabled={currentSection === content.content.sections.length - 1}
                  >
                    Next
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Key Takeaways */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key Takeaways</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {content.content.keyTakeaways.map((takeaway, index) => (
              <li key={index} className="flex items-start gap-2">
                <Star className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{takeaway}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Additional Resources */}
      {content.content.resources && content.content.resources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {content.content.resources.map((resource, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{resource.title}</div>
                    <div className="text-xs text-muted-foreground">{resource.description}</div>
                  </div>
                  
                  {resource.link && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (resource.type === 'hotline') {
                          window.location.href = resource.link!
                        } else {
                          window.open(resource.link, '_blank', 'noopener,noreferrer')
                        }
                        onResourceAccess?.(resource)
                      }}
                    >
                      {resource.type === 'hotline' ? (
                        <Phone className="h-3 w-3 mr-1" />
                      ) : (
                        <ExternalLink className="h-3 w-3 mr-1" />
                      )}
                      {resource.type === 'hotline' ? 'Call' : 'Visit'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sources */}
      {content.sources && content.sources.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <div className="font-medium mb-1">Sources:</div>
          <div>{content.sources.join(', ')}</div>
        </div>
      )}
    </div>
  )
}