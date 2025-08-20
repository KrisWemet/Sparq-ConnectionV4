# Sparq Connection V4

A safety-first, AI-powered relationship improvement platform that helps couples strengthen their relationships through evidence-based guidance, crisis detection, and professional-grade tools.

## 🔒 Safety First

This platform prioritizes user safety above all else, with:
- Real-time crisis detection and intervention
- Professional oversight and referral network
- Evidence-based relationship psychology
- Privacy-by-design; GDPR/PIPEDA alignment; no PHI processing
- Wellness/education focus, not therapy/medical device

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase and AI service credentials
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Run safety checks**
   ```bash
   npm run compliance:check
   ```

## 🏗️ Architecture

### Safety-First AI Pipeline
- **Crisis Detection**: Real-time screening for safety concerns
- **Multi-Agent Coordination**: Specialized AI agents for different relationship aspects
- **Professional Oversight**: Licensed therapist review for critical decisions
- **Emergency Protocols**: Immediate intervention for crisis situations

### Core Features
- **Relationship Assessments**: Evidence-based evaluation tools
- **AI-Powered Guidance**: Personalized relationship insights
- **Crisis Intervention**: 24/7 safety monitoring and support
- **Professional Network**: Integration with licensed therapists
- **Couple Dashboard**: Shared progress tracking and goal setting

## 🛡️ Safety & Compliance

### Crisis Detection System
The platform includes comprehensive crisis detection with:
- Keyword-based screening for suicidal ideation
- Pattern recognition for domestic violence indicators
- Behavioral analysis for relationship distress
- Server-side safety monitoring with informed consent
- No automated partner notifications for DV scenarios
- Automatic escalation to crisis professionals

### Professional Standards
- All AI guidance grounded in peer-reviewed research
- Licensed therapist oversight for educational recommendations
- Privacy-by-design; GDPR/PIPEDA alignment; no PHI processing
- Wellness/education focus, not therapy/medical device
- Regular safety audits and system validation

## 🧠 AI Technology

### Claude Flow Multi-Agent System
- **Safety Agent**: Screens all content for crisis indicators
- **Relationship Agent**: Provides evidence-based guidance
- **Crisis Agent**: Handles emergency intervention
- **Professional Agent**: Manages therapist referrals

### Evidence-Based Frameworks
- Gottman Method principles
- Emotionally Focused Therapy (EFT)
- Attachment Theory
- Communication research

## 📊 Development

### Essential Commands
```bash
npm run dev              # Start development
npm run build            # Production build
npm run typecheck        # TypeScript validation
npm run lint:fix         # Code quality
npm run crisis:test      # Test crisis detection
npm run compliance:check # Safety validation
```

### Testing
- Unit tests with Vitest
- Crisis detection validation
- AI safety testing
- Integration tests for professional networks

## 🔧 Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: TailwindCSS with relationship-focused design system
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **AI**: Claude Flow with Anthropic AI
- **Testing**: Vitest, Testing Library
- **Deployment**: Vercel (recommended)

## 🚨 Crisis Resources

If you or someone you know is in crisis:
- **National Suicide Prevention Lifeline**: 988
- **Crisis Text Line**: Text HOME to 741741
- **National Domestic Violence Hotline**: 1-800-799-7233
- **Emergency Services**: 911

## 📚 Documentation

- [CLAUDE.md](./CLAUDE.md) - Comprehensive development guide
- [Crisis Detection](./src/lib/crisis-detection/) - Safety system documentation
- [AI Services](./src/lib/ai-services/) - AI coordination system
- [Database Schema](./src/types/database.types.ts) - Data structure

## 🤝 Contributing

This project requires special attention to safety and ethical considerations:

1. All crisis detection changes require peer review
2. AI modifications need professional oversight
3. Database changes must maintain privacy-by-design principles
4. User safety is the top priority in all decisions
5. Wellness/education focus, not therapy/medical device

## 📄 License

This project contains safety-critical code for relationship crisis detection and intervention. Use responsibly and ensure proper professional oversight in any deployment.

---

**⚠️ Important**: This platform provides wellness/education support and includes crisis detection systems. This is not a medical device or therapy platform. Proper professional oversight and safety protocols must be maintained in any production deployment.