# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sparq Connection V4 is a safety-first, wellness/education platform that helps couples strengthen their relationships through evidence-based guidance, crisis detection, and educational tools. **This is not a therapy platform or medical device** - it provides wellness and educational support only.

## Core Development Principles

### 1. Safety-First Development
- **Crisis Detection Priority**: All user interactions must pass through crisis detection screening
- **Human Oversight**: Critical decisions require professional review and cannot be fully automated
- **Fail-Safe Design**: When in doubt, escalate to human professionals rather than provide automated guidance
- **Emergency Protocols**: Immediate crisis indicators trigger professional intervention

### 2. Privacy-by-Design Approach
- **No PHI Processing**: This platform does not process Protected Health Information
- **GDPR/PIPEDA Alignment**: Compliance with privacy regulations without medical claims
- **Informed Consent**: Server-side safety monitoring with clear user consent
- **Data Minimization**: Collect only necessary data for wellness/education purposes

### 3. Wellness/Education Focus
- **Educational Support Only**: Provide information and guidance, not therapy or medical advice
- **Professional Referrals**: Direct users to licensed professionals for therapeutic needs
- **Evidence-Based Content**: Ground all guidance in peer-reviewed research
- **Scope Limitations**: Clear boundaries on what the platform does and doesn't provide

### 4. Crisis Safety Protocols
- **No Automated Partner Notifications**: Especially critical for domestic violence scenarios
- **User Safety Priority**: Protect user safety over relationship preservation
- **Professional Escalation**: Immediate escalation for crisis situations
- **Informed Consent**: Clear disclosure of safety monitoring capabilities

## Technology Stack

### Core Framework
- **Next.js 15** with App Router and TypeScript (strict mode)
- **React 18** with Server/Client Components
- **TailwindCSS** with relationship-focused design system
- **Supabase** for auth, database, and real-time features

### AI & Safety Systems
- **Claude Flow**: Multi-agent coordination system (`src/lib/ai-services/claude-flow.ts`)
- **Crisis Detection**: Real-time safety monitoring (`src/lib/crisis-detection/detector.ts`)
- **Professional Network**: Licensed professional referral system

### Testing & Quality Assurance
- **Vitest**: Unit and integration testing
- **Crisis Testing**: Dedicated testing for crisis detection algorithms
- **Privacy Validation**: Automated checks for privacy-by-design compliance

## Essential Commands

### Development Workflow
```bash
npm run dev              # Start development server
npm run build            # Production build
npm run typecheck        # TypeScript validation
npm run lint:fix         # Code quality enforcement
```

### Safety & Compliance
```bash
npm run crisis:test         # Test crisis detection systems
npm run compliance:check    # Privacy and safety validation
npm run ai:validate         # Validate AI service responses
```

### Database Management
```bash
npm run db:types        # Generate TypeScript types from Supabase
npm run db:migrate      # Apply database migrations
npm run db:reset        # Reset database (development only)
```

## Directory Structure & Architecture

### Core Application Structure
```
src/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication flows
│   ├── dashboard/         # User dashboard & couple interface
│   ├── assessment/        # Relationship assessments
│   ├── crisis/            # Crisis intervention interface
│   ├── admin/             # Professional oversight dashboard
│   └── api/               # API routes with safety validation
├── components/
│   ├── ui/                # Base UI components (Radix-based)
│   ├── relationship-tools/ # Assessment & guidance components
│   ├── crisis-detection/  # Crisis intervention UI
│   ├── user-auth/         # Authentication components
│   └── admin-dashboard/   # Professional oversight interface
├── lib/
│   ├── ai-services/       # Claude Flow & AI coordination
│   ├── relationship-tools/ # Evidence-based assessment tools
│   ├── crisis-detection/  # Safety monitoring & intervention
│   ├── user-auth/         # Authentication & couple linking
│   ├── admin-dashboard/   # Professional oversight tools
│   └── supabase/          # Database client configuration
├── types/                 # TypeScript definitions
├── hooks/                 # React hooks for relationship data
└── middleware.ts          # Auth & safety request filtering
```

## Safety & Crisis Protocols

### Crisis Detection Levels
1. **Critical**: Immediate professional intervention (suicidal ideation, domestic violence)
2. **High**: Professional referral required within 24 hours
3. **Medium**: Monitoring and supportive resources
4. **Low**: Standard platform guidance with check-ins

### Emergency Response Workflow
1. **Automatic Detection**: AI screens all user input for crisis indicators
2. **Immediate Escalation**: Critical cases bypass normal processing
3. **Resource Provision**: Crisis hotlines and emergency contacts provided
4. **Professional Contact**: Licensed professionals notified for high/critical cases
5. **Safety Planning**: Structured safety plans generated and shared
6. **Follow-Up Protocol**: Mandatory follow-up for all crisis interventions
7. **No Partner Notifications**: Especially for DV scenarios to protect user safety

### Crisis Resources Integration
```typescript
const CRISIS_RESOURCES = {
  'National Suicide Prevention Lifeline': '988',
  'Crisis Text Line': 'Text HOME to 741741',
  'National Domestic Violence Hotline': '1-800-799-7233',
  'SAMHSA National Helpline': '1-800-662-4357'
}
```

## Database Schema & Privacy

### Core Tables
- **profiles**: Individual user data with privacy controls
- **couples**: Relationship data linking two profiles with shared settings
- **assessments**: Wellness assessments with educational insights
- **crisis_logs**: Crisis detection and intervention tracking
- **ai_interactions**: All AI exchanges with safety flags and professional review

### Privacy & Security Features
- **Data Minimization**: Only collect data necessary for wellness/education
- **User Control**: Granular privacy controls and data portability
- **Audit Logging**: All access to relationship data logged
- **Retention Policies**: Configurable data retention for different data types
- **Partner Permissions**: User-controlled data sharing between partners

## Evidence-Based Frameworks

### Educational Content Sources
- **Gottman Method**: Educational content on relationship patterns
- **Emotionally Focused Therapy (EFT)**: Attachment patterns education
- **Attachment Theory**: Relationship style education
- **Communication Research**: Evidence-based communication skills

### Assessment Tools (Educational Only)
- **Relationship Satisfaction Surveys**: Self-assessment for educational purposes
- **Communication Pattern Questionnaires**: Educational communication insights
- **Attachment Style Education**: Learning about attachment patterns

## Privacy & Compliance

### Privacy-by-Design Principles
1. **Data Minimization**: Collect only necessary data for wellness/education
2. **User Control**: Granular privacy controls and consent management
3. **Transparency**: Clear disclosure of all data usage and safety monitoring
4. **Purpose Limitation**: Data used only for stated wellness/education purposes
5. **Retention Limits**: Automatic data deletion based on user preferences

### Regulatory Alignment
- **GDPR Compliance**: European privacy rights and protections
- **PIPEDA Alignment**: Canadian privacy law compliance
- **No PHI Claims**: This platform does not process Protected Health Information
- **Educational Scope**: Clear boundaries on wellness/education vs. medical scope

## Development Guidelines

### Code Quality Standards
- **Type Safety**: Strict TypeScript with no implicit any types
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Testing Coverage**: Minimum 80% test coverage for crisis detection systems
- **Privacy Reviews**: All data handling requires privacy impact assessment

### Component Development Patterns
- **Safety-First**: All user-facing components include crisis detection integration
- **Accessibility**: WCAG 2.1 AA compliance for all wellness tools
- **Progressive Enhancement**: Core functionality works without JavaScript
- **User Consent**: Explicit consent flows for all data collection and monitoring

### API Development Standards
```typescript
// All API routes must include safety validation
export async function POST(request: Request) {
  const input = await request.json()
  
  // Step 1: Always validate for crisis indicators
  const crisisCheck = await CrisisDetector.detectCrisis(input.message, input.userId)
  
  if (crisisCheck.requiresImmediateIntervention) {
    return handleCrisisIntervention(crisisCheck)
  }
  
  // Step 2: Process normal request with safety context
  return processWithSafety(input, crisisCheck)
}
```

## Environment Configuration

### Required Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
ANTHROPIC_API_KEY=

# Crisis Management
CRISIS_HOTLINE_WEBHOOK=
THERAPIST_REFERRAL_API=
LICENSED_PROFESSIONAL_API_KEY=

# Privacy & Compliance
PRIVACY_AUDIT_WEBHOOK=
```

## Scope and Limitations

### What This Platform IS
- Educational wellness platform for relationship improvement
- Crisis detection and professional referral system
- Evidence-based relationship education resource
- Safe space for couples to learn and grow

### What This Platform IS NOT
- Medical device or therapeutic intervention
- Replacement for professional therapy or counseling
- Medical diagnosis or treatment provider
- Emergency crisis intervention service (we refer to professionals)

## Continuous Improvement

### Performance Monitoring
- **Crisis Detection Accuracy**: Track detection rates and false positives
- **User Safety Outcomes**: Monitor user wellbeing and satisfaction
- **Privacy Compliance**: Regular privacy impact assessments
- **Professional Network**: Quality assurance for referral effectiveness

### Quality Assurance
- **Monthly Privacy Audits**: Review data handling and user consent
- **Quarterly Research Updates**: Integration of latest relationship research
- **Professional Training**: Ongoing education for development team
- **User Feedback Integration**: Structured feedback collection and implementation

## Legal and Ethical Considerations

### Platform Positioning
- **Wellness/Education Only**: Not therapy, medical device, or healthcare
- **Professional Referrals**: Direct users to appropriate licensed professionals
- **Crisis Support**: Detection and referral, not direct intervention
- **Educational Content**: Evidence-based information, not personalized advice

### User Safety Protocols
- **Informed Consent**: Clear disclosure of all safety monitoring
- **Privacy Protection**: Especially critical for domestic violence scenarios
- **Professional Oversight**: Licensed professional review of crisis situations
- **Transparency**: Open about platform capabilities and limitations