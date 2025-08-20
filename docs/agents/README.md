# Agent System Documentation

This document outlines the multi-agent system for Sparq Connection V4, including roles, responsibilities, and manual implementation guidelines.

## Overview

The Sparq Connection platform uses a coordinated multi-agent system to ensure safety, psychological validity, technical excellence, and regulatory compliance. The system is designed to work with or without Claude Flow, with fallback to standard Node.js implementations.

## Agent Architecture

### Core Principles
1. **Safety First**: Safety agent always runs first and has veto power
2. **Evidence-Based**: Psychology agent validates against research
3. **Privacy-by-Design**: Compliance agent ensures privacy principles
4. **Technical Excellence**: Technical agent optimizes performance and security

### Agent Coordination Flow
```
User Input → Safety Agent → [Other Agents in Parallel/Sequential] → Synthesis → Response
                ↓
           Crisis Detected? → Immediate Intervention
```

## Agent Specifications

### 1. Safety Validator Agent

**Type**: `safety`  
**Priority**: 10 (Highest)  
**Purpose**: Crisis detection and emergency intervention

#### Core Responsibilities
- Screen all user input for crisis indicators
- Detect suicidal ideation, domestic violence, substance abuse
- Assess emotional distress levels
- Trigger immediate professional intervention when needed
- Generate safety plans for at-risk users

#### Input Processing
```typescript
interface SafetyInput {
  userId: string
  message: string
  context: 'assessment' | 'guidance' | 'crisis' | 'general'
  userHistory?: any[]
  coupleId?: string
}
```

#### Output Format
```typescript
interface SafetyResult {
  safetyLevel: 'safe' | 'caution' | 'concern' | 'crisis' | 'critical'
  crisisIndicators: CrisisIndicator[]
  requiresImmediateIntervention: boolean
  requiresReview: boolean
  reasoning: string
  confidence: number
}
```

#### Crisis Detection Algorithms
1. **Keyword-Based Detection**
   - Critical: "want to die", "kill myself", "suicide", "end it all"
   - Violence: "afraid of partner", "threatens me", "hits me"
   - Substance: "drinking too much", "using drugs", "can't stop"

2. **Pattern Recognition**
   - Escalation patterns in language
   - Emotional withdrawal indicators
   - Frequency of negative expressions

3. **Behavioral Analysis**
   - Assessment score changes
   - Interaction pattern shifts
   - Help-seeking behavior changes

#### Manual Implementation Guidelines
```javascript
// Basic safety screening implementation
function screenForCrisis(message) {
  const criticalKeywords = ['want to die', 'kill myself', 'suicide']
  const hasKeywords = criticalKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  )
  
  return {
    safetyLevel: hasKeywords ? 'critical' : 'safe',
    requiresIntervention: hasKeywords,
    confidence: hasKeywords ? 0.95 : 0.8
  }
}
```

---

### 2. Psychology Expert Agent

**Type**: `psychology`  
**Priority**: 8  
**Purpose**: Evidence-based relationship psychology validation

#### Core Responsibilities
- Validate content against established psychological frameworks
- Ensure clinical accuracy and appropriateness
- Check cultural sensitivity and ethical compliance
- Provide evidence-based recommendations

#### Supported Frameworks
1. **Gottman Method**
   - Four Horsemen detection and antidotes
   - Love Maps and emotional banking
   - Repair attempts and positive sentiment

2. **Emotionally Focused Therapy (EFT)**
   - Attachment patterns and cycles
   - Emotional accessibility and responsiveness
   - Bonding experiences

3. **Attachment Theory**
   - Secure, anxious, avoidant, disorganized styles
   - Earned security and relationship patterns

4. **Communication Research**
   - Active listening techniques
   - Nonviolent communication
   - Conflict resolution strategies

#### Validation Process
```typescript
interface PsychologyValidation {
  isValid: boolean
  framework: 'gottman' | 'eft' | 'attachment' | 'communication' | 'general'
  evidenceBase: string[]
  recommendations: string[]
  culturalSensitivity: string
  ethicsCompliance: string
  confidence: number
}
```

#### Manual Implementation Guidelines
```javascript
// Basic framework detection
function detectFramework(content) {
  const gottmanKeywords = ['love map', 'four horsemen', 'fondness']
  const eftKeywords = ['attachment', 'emotional cycle', 'bonding']
  
  if (gottmanKeywords.some(k => content.includes(k))) return 'gottman'
  if (eftKeywords.some(k => content.includes(k))) return 'eft'
  return 'general'
}

// Evidence base validation
function validateEvidenceBase(content, framework) {
  const harmfulPatterns = ['just get over it', 'all men/women are']
  const isHarmful = harmfulPatterns.some(p => content.includes(p))
  
  return {
    isValid: !isHarmful,
    sources: framework === 'gottman' ? ['Gottman Research'] : []
  }
}
```

---

### 3. Compliance Officer Agent

**Type**: `compliance`  
**Priority**: 6  
**Purpose**: Privacy-by-design and regulatory compliance

#### Core Responsibilities
- Validate educational scope (not medical/therapy)
- Ensure privacy-by-design principles
- Check GDPR/PIPEDA alignment
- Prevent automated partner notifications for DV safety

#### Compliance Areas
1. **Educational Scope Validation**
   - Prevent medical/therapy claims
   - Ensure wellness/education positioning
   - Validate professional referral language

2. **Privacy Compliance**
   - No PHI processing claims
   - Data minimization principles
   - User consent and control
   - Informed consent for safety monitoring

3. **Safety Protocol Compliance**
   - No automated partner notifications
   - DV scenario safety protocols
   - Crisis intervention transparency

#### Validation Output
```typescript
interface ComplianceCheck {
  compliant: boolean
  regulations: ('GDPR' | 'PIPEDA' | 'privacy' | 'educational')[]
  issues: string[]
  recommendations: string[]
  riskLevel: 'low' | 'medium' | 'high'
  auditTrail: string
}
```

#### Manual Implementation Guidelines
```javascript
// Scope compliance check
function validateEducationalScope(content) {
  const medicalClaims = ['diagnose', 'treat', 'cure', 'therapy']
  const hasMedicalClaims = medicalClaims.some(claim => 
    content.toLowerCase().includes(claim)
  )
  
  return {
    compliant: !hasMedicalClaims,
    issues: hasMedicalClaims ? ['Contains medical claims'] : [],
    recommendations: hasMedicalClaims ? ['Use educational language'] : []
  }
}

// Privacy compliance check
function validatePrivacyCompliance(content) {
  const phiClaims = ['hipaa compliant', 'protected health information']
  const hasPhiClaims = phiClaims.some(claim => content.includes(claim))
  
  return {
    compliant: !hasPhiClaims,
    issues: hasPhiClaims ? ['Contains PHI claims'] : []
  }
}
```

---

### 4. Technical Architect Agent

**Type**: `technical`  
**Priority**: 4  
**Purpose**: Technical architecture and performance validation

#### Core Responsibilities
- Assess performance impact of features
- Identify security considerations
- Provide scalability recommendations
- Calculate resource requirements

#### Technical Areas
1. **Performance Analysis**
   - Response time requirements
   - Concurrent user capacity
   - Resource utilization

2. **Security Assessment**
   - Data encryption requirements
   - Access control needs
   - Audit logging specifications

3. **Scalability Planning**
   - Horizontal scaling patterns
   - Database optimization
   - Caching strategies

#### Validation Output
```typescript
interface TechnicalValidation {
  performanceImpact: 'low' | 'medium' | 'high'
  securityConsiderations: string[]
  scalabilityAssessment: string
  architecturalRecommendations: string[]
  resourceRequirements: Record<string, any>
}
```

#### Manual Implementation Guidelines
```javascript
// Performance impact assessment
function analyzePerformanceImpact(content, context) {
  if (context === 'crisis') return 'high'
  
  const heavyOperations = ['real-time', 'ai processing', 'video']
  const hasHeavyOps = heavyOperations.some(op => content.includes(op))
  
  return hasHeavyOps ? 'medium' : 'low'
}

// Security considerations
function identifySecurityNeeds(content) {
  const considerations = []
  
  if (content.includes('personal') || content.includes('relationship')) {
    considerations.push('Data encryption required')
    considerations.push('Access control needed')
  }
  
  return considerations
}
```

## Agent Coordination Patterns

### Sequential Processing (Default)
```
Safety → Psychology → Compliance → Technical → Synthesis
```
- Safer approach with dependency handling
- Stops on critical issues
- Lower resource usage

### Parallel Processing (High Performance)
```
Safety → [Psychology, Compliance, Technical] → Synthesis
```
- Faster processing
- Higher resource usage
- Requires worker pool

### Crisis Override
```
Safety → Crisis Detected → Immediate Intervention (bypass other agents)
```
- Emergency response path
- Immediate professional escalation
- Safety resources provision

## Implementation Modes

### 1. Claude Flow Mode
- Uses Claude Flow orchestration when available
- Full AI-powered agent coordination
- Advanced multi-agent features

### 2. Standard Mode
- Uses built-in Node.js implementations
- Rule-based agent processing
- Reliable fallback option

### 3. Hybrid Mode (Recommended)
- Attempts Claude Flow first
- Falls back to standard on failure
- Best of both approaches

## Configuration

### Agent Configuration
```typescript
interface AgentConfig {
  enabled: boolean
  priority: number
  timeout: number
  retryAttempts: number
  fallbackEnabled: boolean
  workerPool?: {
    minWorkers: number
    maxWorkers: number
    idleTimeout: number
  }
}
```

### Orchestration Configuration
```typescript
interface OrchestrationConfig {
  mode: 'claude-flow' | 'standard' | 'hybrid'
  parallel: boolean
  safetyFirst: boolean
  timeout: number
  fallbackOnError: boolean
}
```

## Monitoring and Metrics

### Health Checks
- Agent connectivity status
- Response time monitoring
- Error rate tracking
- Safety intervention rates

### Performance Metrics
- Processing time per agent
- Parallel execution efficiency
- Worker pool utilization
- Crisis detection accuracy

### Safety Metrics
- Crisis detection rate
- False positive/negative rates
- Professional intervention success
- User safety outcomes

## Manual Override Procedures

### When Agents Fail
1. **Safety Agent Failure**: Assume crisis level, escalate immediately
2. **Psychology Agent Failure**: Require professional review
3. **Compliance Agent Failure**: Block content pending review
4. **Technical Agent Failure**: Proceed with caution warnings

### Emergency Procedures
1. **System-wide Failure**: Switch to manual professional review
2. **Crisis Detection Failure**: Default to human crisis counselors
3. **Database Failure**: Activate emergency contact protocols

## Testing Guidelines

### Unit Testing
- Test each agent independently
- Validate input/output formats
- Check error handling

### Integration Testing
- Test agent coordination
- Validate sequential/parallel processing
- Check fallback mechanisms

### Safety Testing
- Crisis detection accuracy
- Emergency response speed
- Professional escalation reliability

### Performance Testing
- Load testing with concurrent users
- Stress testing worker pool
- Memory usage optimization