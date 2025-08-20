# Sparq Connection: MVP Product Requirements Document

## Executive Summary

**Product Vision**: AI-powered relationship wellness platform that helps committed couples improve communication and strengthen their connection through daily, personalized guidance.

**MVP Goal**: Prove core relationship value with 30%+ D30 retention while maintaining safety-first approach and privacy compliance.

**Timeline**: 6 weeks to shippable MVP
**Budget**: <$500/month AI costs for first 1000 couples

---

## 1. Product Positioning & Compliance

### What We Are
- **Relationship wellness and education platform**
- **AI-powered daily guidance system**
- **Privacy-focused communication tools**
- **Safety resource provider**

### What We Are NOT
- ❌ Medical device or therapy service
- ❌ Crisis intervention service (we provide resources)
- ❌ Couples therapy replacement
- ❌ HIPAA-covered entity (wellness/education focus)

### Legal Positioning
- **Privacy-by-design, GDPR/PIPEDA aligned**
- **Wellness education, not medical/therapeutic claims**
- **User-initiated crisis support (no automated emergency contact)**
- **Clear disclaimers and consent flows**

---

## 2. Target Users & Use Cases

### Primary Persona: "Proactive Optimizers"
- **Demographics**: Ages 25-40, committed relationships 1-7 years
- **Psychographics**: Growth-minded, tech-comfortable, seeking preventive relationship work
- **Pain Points**: Generic relationship advice, scheduling couples therapy, maintaining consistency
- **Goals**: Improve communication, prevent major conflicts, strengthen connection

### Core Use Cases

**Daily Relationship Work**
- Receive personalized AI prompts based on relationship stage/archetype
- Complete exercises individually or together
- Track progress and celebrate relationship growth
- Build consistent habits around connection

**Safe Communication**
- Message partner with relationship-focused features
- Access mood indicators and conversation starters
- Receive gentle guidance during heated moments
- Get safety resources when needed

**Crisis Support Access**
- Quick access to local crisis hotlines and resources
- Discrete safety planning tools
- Educational content about healthy relationships
- No judgment, always available support

---

## 3. MVP Feature Specifications

### 3.1 Authentication & Onboarding
**User Story**: As a person in a relationship, I want to securely join with my partner so we can work on our relationship together.

**Acceptance Criteria**:
- [ ] User can create account with email/password or social login
- [ ] System collects basic demographics (age range, relationship length, location for resources)
- [ ] User selects relationship archetype: Calm Anchor, Responsive Partner, Growth Seeker, Steady Support
- [ ] User explicitly consents to safety monitoring with clear explanation
- [ ] User can invite partner via secure link/code with expiration
- [ ] Both partners must consent before couple account is active
- [ ] Privacy settings are configured during onboarding (individual vs shared responses)

**Safety Requirements**:
- [ ] Jurisdiction detection for appropriate crisis resources
- [ ] Clear explanation of what data is processed and why
- [ ] Consent versioning and tracking
- [ ] Ability to revoke consent and delete data

### 3.2 Daily Relationship Prompts
**User Story**: As a couple, we want personalized daily relationship exercises that help us connect and grow together.

**Acceptance Criteria**:
- [ ] System generates 1 daily prompt per couple based on archetype and progress
- [ ] Prompts include teaching moment (1-2 min read) + guided activity
- [ ] Content is personalized with names and relationship context
- [ ] Both partners can respond individually or together
- [ ] Progress tracking shows completion streaks and couple sync status
- [ ] Offline access to prompts when internet unavailable
- [ ] Clear AI disclaimers on all generated content

**Content Requirements**:
- [ ] Based on evidence-based approaches (Gottman Method, Attachment Theory)
- [ ] Progressive difficulty from surface-level to deeper emotional work
- [ ] Cultural sensitivity and inclusive language
- [ ] No therapeutic claims or diagnostic language
- [ ] Maximum 10-15 minutes per exercise

**Cost Optimization**:
- [ ] Template-based generation with slot-filling personalization
- [ ] Multi-level caching (Redis hot cache, PostgreSQL warm cache)
- [ ] Budget enforcement: $0.15/user/day maximum
- [ ] Graceful degradation to cached content when limits approached

### 3.3 Communication System
**User Story**: As partners, we want to communicate safely with features that support our relationship growth.

**Acceptance Criteria**:
- [ ] Real-time messaging between partners with encryption at rest
- [ ] Message history with search (7 days free, extended for premium)
- [ ] Mood indicators for message context
- [ ] Conversation threading around daily prompts
- [ ] Safety monitoring with user consent and transparency

**Safety Features**:
- [ ] Automated detection of toxicity, self-harm, or abuse indicators
- [ ] Graduated response system: suggestions → resources → crisis support
- [ ] No automated partner notifications for DV scenarios
- [ ] Transparency log showing when/why safety systems activated
- [ ] User can disable monitoring with clear warnings about reduced support

**Privacy Controls**:
- [ ] Granular controls over what content gets analyzed
- [ ] Message retention settings (individual and couple level)
- [ ] Secure deletion with audit trail
- [ ] Export capabilities for data portability

### 3.4 Safety Resources & Crisis Support
**User Story**: As someone who might face relationship or personal crisis, I want immediate access to appropriate help and resources.

**Acceptance Criteria**:
- [ ] Always-visible safety button in app navigation
- [ ] Location-based crisis resource directory (hotlines, domestic violence support, mental health services)
- [ ] Personal safety planning tools with secure storage
- [ ] Educational content about healthy relationships and red flags
- [ ] Quick exit functionality for dangerous situations

**Resource Requirements**:
- [ ] Country/region appropriate hotlines (988, 9-8-8, etc.)
- [ ] Local domestic violence shelters and resources
- [ ] Mental health crisis support
- [ ] LGBTQ+ specific resources where available
- [ ] Multi-language support based on user preference

**Legal Boundaries**:
- [ ] Clear disclaimers about app limitations
- [ ] Resources provided with instructions - user chooses whether to act
- [ ] No automated emergency service contact
- [ ] No diagnostic or clinical assessment features

### 3.5 Progress Tracking & Analytics
**User Story**: As a couple, we want to see our relationship progress and get insights about our growth.

**Acceptance Criteria**:
- [ ] Daily completion tracking with streak visualization
- [ ] Weekly relationship satisfaction check-ins (validated scales)
- [ ] Progress charts showing improvement over time
- [ ] Couple sync status and shared milestone celebrations
- [ ] Privacy controls over what gets shared between partners

**Privacy Requirements**:
- [ ] All analytics aggregated and anonymized
- [ ] Individual responses private by default
- [ ] Opt-in for research participation
- [ ] Data minimization - only store what's needed for features

### 3.6 Business Model Integration
**User Story**: As a user, I want clear value from free features and fair pricing for premium capabilities.

**Free Tier Features**:
- [ ] 3 personalized AI prompts per day
- [ ] 7 days message history
- [ ] Basic progress tracking
- [ ] Full access to safety resources (never paywalled)
- [ ] Core communication features

**Premium Couple Tier ($19.99/month)**:
- [ ] Unlimited personalized prompts
- [ ] Extended message history and search
- [ ] Advanced progress analytics
- [ ] Early access to new features
- [ ] Priority customer support

**Conversion Strategy**:
- [ ] Natural upgrade prompts at feature limits
- [ ] 7-day free trial of premium features
- [ ] Either partner can upgrade for both
- [ ] Clear value demonstration through usage analytics

---

## 4. Technical Architecture

### 4.1 Technology Stack
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Realtime, Edge Functions)
- **Database**: PostgreSQL with Row Level Security and pgvector
- **AI**: OpenAI GPT-4/3.5-turbo with OpenRouter for model flexibility
- **Payments**: Stripe with subscription management
- **Hosting**: Vercel with global edge deployment
- **Caching**: Redis Cloud for AI content and session management

### 4.2 Database Schema Overview
```sql
-- Core user and relationship management
users (id, email, archetype, preferences, safety_consents)
couples (id, partner_1_id, partner_2_id, linked_at, privacy_settings)
consents (user_id, scope, granted_at, revoked_at)

-- Content and AI management
daily_prompts (id, couple_id, content, generated_at, ai_cost)
content_templates (id, template, variables, effectiveness_score)
ai_cache (cache_key, content, ttl, usage_count)

-- Communication and safety
messages (id, couple_id, sender_id, content_encrypted, risk_score)
safety_events (id, user_id, event_type, risk_level, resources_provided)
safety_resources (id, region, category, contact_info, language)

-- Progress and analytics
progress_tracking (id, couple_id, metric, value, recorded_at)
usage_analytics (anonymized behavioral data for service improvement)
```

### 4.3 Security & Privacy Architecture
- **Encryption**: TLS in transit, AES-256 at rest for sensitive data
- **Authentication**: Supabase Auth with MFA support
- **Authorization**: Row Level Security enforcing couple-level data isolation
- **Monitoring**: OpenTelemetry with privacy-friendly analytics
- **Compliance**: GDPR/PIPEDA alignment with data subject rights implementation

---

## 5. Success Metrics & KPIs

### 5.1 Primary Success Metrics
- **User Retention**: 30% D30 retention (relationship apps typically see 10-15%)
- **Couple Engagement**: Both partners active within 48 hours
- **Safety Effectiveness**: <0.1% false positive rate on crisis detection
- **Relationship Outcomes**: +0.5 improvement in weekly satisfaction scores

### 5.2 Business Metrics
- **Conversion**: 5% free-to-premium within first month
- **AI Cost Efficiency**: <$0.15 per daily active user
- **Customer Satisfaction**: >4.5 app store rating
- **Crisis Support**: 100% uptime for safety resources

### 5.3 Safety & Compliance Metrics
- **Crisis Response Time**: Safety resources provided within 3 seconds
- **Privacy Compliance**: 100% GDPR data subject request fulfillment
- **Content Safety**: 0 inappropriate therapeutic claims
- **Professional Boundaries**: Clear escalation to licensed professionals

---

## 6. Risk Management

### 6.1 Product Risks
- **Low Engagement**: Mitigation through immediate relationship value and streak gamification
- **Safety Incidents**: Comprehensive crisis detection with clear escalation paths
- **Scope Creep**: Strict MVP boundaries with post-launch feature roadmap

### 6.2 Technical Risks
- **AI Costs**: Aggressive caching and budget enforcement
- **Scale Issues**: Database optimization and CDN for global performance
- **Privacy Breaches**: Security-first architecture with regular audits

### 6.3 Legal & Compliance Risks
- **Regulatory Changes**: Regular legal review and compliance updates
- **Therapeutic Claims**: Clear positioning as wellness/education only
- **Crisis Liability**: User-initiated support model with professional boundaries

---

## 7. Launch Strategy

### 7.1 Beta Testing (Week 5-6)
- 50 couples recruited through relationship networks
- Professional review by licensed therapists
- Safety scenario testing with crisis counselors
- Technical load testing and security audit

### 7.2 MVP Launch (Week 7)
- Soft launch to limited audience
- Monitor safety systems and user feedback
- Rapid iteration on user experience issues
- Professional relationship network outreach

### 7.3 Success Criteria for Phase 2
- 100+ couples successfully onboarded
- Safety systems handling real scenarios effectively
- 30%+ retention after first month
- Clear evidence of relationship value (user testimonials, satisfaction scores)

---

## Appendix: Claude Code Integration Notes

### Development Workflow
- Each feature should be built with comprehensive error handling
- All AI interactions include safety validation and cost tracking
- Database migrations include RLS testing
- Crisis detection systems include comprehensive test scenarios

### Documentation Requirements
- API documentation for all safety-related endpoints
- Privacy policy reflecting actual data handling practices
- User help documentation for relationship guidance
- Crisis resource documentation with regular updates

This PRD provides Claude Code with the comprehensive context needed to build a focused, safe, and effective relationship platform while maintaining clear boundaries and compliance requirements.