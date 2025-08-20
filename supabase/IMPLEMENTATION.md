# Sparq Connection V4: Privacy-First Database Implementation Guide

## Overview

This document provides comprehensive guidance for implementing and maintaining the privacy-first database architecture for Sparq Connection, a wellness/education-focused relationship platform.

## 🏗️ Architecture Summary

The database implementation follows privacy-by-design principles with:
- **Row Level Security (RLS)** enforcing data isolation
- **GDPR/PIPEDA compliance** with automated data lifecycle management  
- **Crisis intervention workflows** with professional referral automation
- **Comprehensive audit trails** for regulatory compliance
- **Performance optimization** for production scale

## 📁 Migration Files Overview

### Core Schema Migrations

| Migration | Purpose | Key Components |
|-----------|---------|----------------|
| `004_audit_compliance.sql` | Audit infrastructure, assessment tracking, professional network | `audit_log`, `assessment_responses`, `professional_contacts` |
| `008_complete_rls_policies.sql` | Comprehensive RLS policies for all tables | Security functions, privacy enforcement triggers |
| `009_data_lifecycle_automation.sql` | GDPR compliance, automated data retention | GDPR erasure, data portability, retention automation |
| `010_crisis_workflow_automation.sql` | Crisis detection and response workflows | Professional matching, workflow state management |
| `011_performance_indexes.sql` | Production-ready performance optimization | 80+ indexes for optimal query performance |

### Supporting Files

- `src/types/database-complete.types.ts` - Complete TypeScript definitions
- `supabase/tests/rls_policy_tests.sql` - RLS testing framework  
- `supabase/seeds/01_initial_data.sql` - Development data seeding

## 🔐 Security Architecture

### Row Level Security (RLS) Policies

The database enforces strict data isolation using PostgreSQL RLS:

```sql
-- Example: Users can only access their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth_id = auth.user_id());

-- Example: Couple members can access shared data
CREATE POLICY "couples_members" ON couples
  FOR ALL USING (
    partner_1_id IN (SELECT id FROM users WHERE auth_id = auth.user_id()) OR
    partner_2_id IN (SELECT id FROM users WHERE auth_id = auth.user_id())
  );
```

### Key Security Features

1. **Deny-by-Default**: All tables require explicit RLS policies
2. **User Isolation**: Users can only access their own data
3. **Couple Data Sharing**: Partners can access shared relationship data (with consent)
4. **Professional Access**: Licensed professionals can only access their assigned cases
5. **Support Role Access**: Support staff have audit-logged access for crisis intervention

## 🔧 Installation & Setup

### Prerequisites

- PostgreSQL 14+ with extensions:
  - `uuid-ossp` (UUID generation)
  - `pgcrypto` (encryption functions)
  - `pg_trgm` (text search optimization)

### Migration Execution Order

Run migrations in sequence:

```bash
# Apply migrations in order
supabase db reset
supabase migration up

# Or individually:
psql -f supabase/migrations/004_audit_compliance.sql
psql -f supabase/migrations/008_complete_rls_policies.sql  
psql -f supabase/migrations/009_data_lifecycle_automation.sql
psql -f supabase/migrations/010_crisis_workflow_automation.sql
psql -f supabase/migrations/011_performance_indexes.sql
```

### Development Data Seeding

```bash
# Load development data
psql -f supabase/seeds/01_initial_data.sql

# Verify seeding
SELECT * FROM jurisdictions LIMIT 5;
SELECT * FROM subscription_tiers;
```

### Environment Configuration

Set required environment variables:

```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...

# Crisis Management  
CRISIS_HOTLINE_WEBHOOK=...
LICENSED_PROFESSIONAL_API_KEY=...

# Privacy & Compliance
PRIVACY_AUDIT_WEBHOOK=...
app.environment=development  # Prevents production seeding
```

## 🧪 Testing Framework

### RLS Policy Testing

The implementation includes comprehensive RLS testing:

```sql
-- Run all RLS tests
SELECT * FROM run_comprehensive_rls_tests();

-- Automated test execution with JSON results
SELECT automated_rls_test_runner();

-- Individual test suites
SELECT * FROM test_rls_policy_isolation();
SELECT * FROM test_complex_couple_isolation();
SELECT * FROM test_rls_performance();
```

### Test Coverage Areas

- ✅ User profile access isolation
- ✅ Couple data sharing permissions
- ✅ Communication history access control
- ✅ Assessment data privacy
- ✅ Crisis information protection
- ✅ Professional referral access
- ✅ Performance under load

## 📊 Data Model Deep Dive

### Core Entities

#### Users & Couples
```sql
-- Individual users with encrypted PII
users (id, auth_id, email_encrypted, display_name, ...)

-- Couple relationships linking two users
couples (id, partner_1_id, partner_2_id, relationship_type, ...)
```

#### Communication & Safety
```sql
-- Encrypted communication between partners
communication_history (id, couple_id, sender_user_id, content_encrypted, ...)

-- AI-driven safety risk detection
safety_risk_signals (id, user_id, risk_level, confidence_score, ...)

-- Crisis escalation workflows
crisis_escalations (id, user_id, severity_level, status, ...)
```

#### Assessment & Growth
```sql
-- Individual assessment responses
assessment_responses (id, user_id, measure_id, response_value, ...)

-- Assessment results and recommendations
assessment_results (id, user_id, interpretation_category, ...)

-- Progress tracking and goal management
progress_tracking (id, user_id, goal_description, progress_percentage, ...)
```

### Privacy & Compliance
```sql
-- User consent management
user_consents (id, user_id, consent_type, granted, regulatory_basis, ...)

-- GDPR data subject requests
data_subject_requests (id, user_id, request_type, status, ...)

-- Automated data retention policies
data_retention_policies (id, table_name, retention_period_days, ...)
```

## ⚙️ Operational Procedures

### Daily Maintenance

The system includes automated daily maintenance:

```sql
-- Run daily data lifecycle management
SELECT daily_data_maintenance();

-- Check retention policies due for execution  
SELECT * FROM generate_retention_cleanup_schedule();

-- Monitor consent expiration
SELECT * FROM monitor_consent_expiration() 
WHERE requires_renewal = true;
```

### Crisis Response Procedures

When crisis signals are detected:

1. **Automatic Detection**: AI analyzes user content for risk indicators
2. **Workflow Initialization**: Crisis workflow state machine activated
3. **Professional Matching**: AI matches users with appropriate licensed professionals
4. **Intervention Tracking**: All crisis communications logged and monitored
5. **Follow-up Management**: Automated follow-up scheduling and monitoring

```sql
-- Initialize crisis workflow
SELECT initialize_crisis_workflow(escalation_id, 'risk_detected');

-- Monitor active crisis workflows
SELECT * FROM crisis_workflow_states 
WHERE current_state != 'case_closed' 
ORDER BY deadline_at ASC;
```

### GDPR Compliance Operations

#### Data Subject Rights

```sql
-- Process "Right to be Forgotten" request
SELECT process_gdpr_erasure_request(
  user_id, 
  request_id, 
  'anonymize'  -- or 'hard_delete'
);

-- Generate data portability export  
SELECT export_user_data_for_portability(
  user_id,
  include_partner_data := true,
  format := 'json'
);
```

#### Data Retention Management

```sql
-- Apply specific retention policy
SELECT apply_data_retention_policy(policy_id, dry_run := false);

-- Run all active retention policies
SELECT run_all_retention_policies(dry_run := false);
```

## 🚀 Performance Optimization

### Index Strategy

The implementation includes 80+ optimized indexes:

- **RLS-aware indexes**: Optimized for Row Level Security policy evaluation
- **Compound indexes**: Multi-column indexes for complex queries  
- **Partial indexes**: Filtered indexes for specific use cases
- **GIN indexes**: For JSONB and array column searches
- **Expression indexes**: For computed query optimization

### Performance Monitoring

```sql
-- Check index usage and effectiveness
SELECT * FROM check_index_performance();

-- Monitor query performance
SELECT * FROM index_usage_stats 
WHERE usage_category = 'UNUSED';

-- Update table statistics
SELECT analyze_performance_tables();
```

### Query Optimization Tips

1. **Use RLS-aware queries**: Design queries that work efficiently with RLS policies
2. **Leverage indexes**: Ensure WHERE clauses match available indexes
3. **Monitor slow queries**: Use `pg_stat_statements` to identify optimization opportunities
4. **Batch operations**: Use bulk operations for data maintenance tasks

## 🔄 Crisis Workflow Management

### Workflow States

The crisis intervention system uses a state machine:

```
risk_detected → initial_assessment → resource_provision/professional_matching
    ↓                                           ↓
case_monitoring ← follow_up_scheduled ← intervention_active
    ↓
case_resolved → case_closed
```

### Professional Matching Algorithm

AI-driven professional matching considers:

- **Location & Jurisdiction**: Geographic proximity and licensing
- **Specialization Match**: Crisis type and professional expertise  
- **Availability**: Current capacity and response time
- **Success History**: Past referral outcomes and user feedback
- **User Preferences**: Language, telehealth, cultural considerations

### Workflow Monitoring

```sql
-- View active crisis workflows
SELECT cws.*, ce.escalation_type, ce.severity_level
FROM crisis_workflow_states cws
JOIN crisis_escalations ce ON cws.crisis_escalation_id = ce.id
WHERE cws.current_state NOT IN ('case_resolved', 'case_closed')
ORDER BY cws.deadline_at ASC;

-- Monitor professional matching results
SELECT pmr.*, pc.professional_name, pc.current_capacity_level
FROM professional_match_results pmr
JOIN professional_contacts pc ON pmr.professional_id = pc.id
WHERE pmr.contact_attempted = false
ORDER BY pmr.rank_order ASC;
```

## 🔍 Monitoring & Alerting

### Key Metrics to Monitor

#### System Health
- Database connection pool status
- Query performance (average response time)
- Index usage efficiency
- Storage utilization

#### Privacy Compliance
- Data retention policy execution status
- GDPR request processing times
- Consent renewal requirements
- Audit log completeness

#### Crisis Response
- Crisis detection accuracy (false positive rate)
- Professional response times  
- User engagement with provided resources
- Escalation resolution rates

### Alert Thresholds

Set up alerts for:
- **Critical**: Crisis escalations requiring immediate attention (< 15 min response)
- **High**: Data retention policies overdue (> 7 days)
- **Medium**: High false positive rates in crisis detection (> 10%)
- **Low**: Unused indexes consuming significant storage (> 1GB)

## 🛠️ Troubleshooting Guide

### Common Issues

#### RLS Policy Problems
```sql
-- Debug RLS policy denials
SET row_security = off;  -- Temporarily disable RLS (support role only)
-- Run problematic query to see all data
SET row_security = on;   -- Re-enable RLS
```

#### Performance Issues
```sql
-- Identify slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Check for missing indexes
SELECT * FROM pg_stat_user_tables 
WHERE seq_scan > idx_scan AND seq_tup_read > 10000;
```

#### Crisis Workflow Stuck States
```sql
-- Find workflows stuck in processing
SELECT * FROM crisis_workflow_states 
WHERE overdue = true 
AND current_state NOT IN ('case_resolved', 'case_closed');

-- Manually advance workflow if needed
SELECT advance_crisis_workflow(workflow_id);
```

### Recovery Procedures

#### Database Recovery
1. **Backup Validation**: Ensure backups include all encrypted data
2. **Point-in-Time Recovery**: Use PostgreSQL PITR for data recovery
3. **Compliance Audit**: Document any data recovery for regulatory compliance

#### Crisis System Recovery
1. **Professional Contact Verification**: Ensure professional network availability
2. **Resource Link Validation**: Verify crisis hotlines and resources are active
3. **Escalation Testing**: Test crisis detection and escalation workflows

## 📋 Maintenance Checklist

### Daily
- [ ] Run automated data maintenance: `SELECT daily_data_maintenance();`
- [ ] Check crisis workflow status and overdue items
- [ ] Monitor system performance metrics
- [ ] Verify professional contact availability

### Weekly  
- [ ] Review data retention policy execution
- [ ] Analyze crisis detection accuracy and false positives
- [ ] Check consent renewal requirements
- [ ] Update professional network information

### Monthly
- [ ] Full RLS policy test execution
- [ ] Performance optimization review
- [ ] Professional network capacity assessment
- [ ] Compliance audit report generation

### Quarterly
- [ ] Database performance tuning
- [ ] Crisis response procedure review and training
- [ ] Privacy policy and consent form updates
- [ ] Professional network expansion evaluation

## 📚 Additional Resources

### Documentation Links
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [GDPR Compliance Guide](https://gdpr.eu/)
- [Supabase Auth & RLS](https://supabase.com/docs/guides/auth/row-level-security)

### Code Examples
- `supabase/tests/rls_policy_tests.sql` - Comprehensive RLS testing
- `src/types/database-complete.types.ts` - TypeScript integration
- Crisis workflow examples in migration files

### Support Contacts
- **Database Issues**: Technical team lead
- **Privacy Compliance**: Data protection officer  
- **Crisis Response**: Clinical supervisor
- **Professional Network**: Licensed professional coordinator

---

## 🎯 Implementation Checklist

Before going to production:

- [ ] All migrations applied successfully
- [ ] RLS tests passing 100%
- [ ] Performance benchmarks meet requirements
- [ ] Crisis workflow tested with sample scenarios
- [ ] Professional network contacts verified
- [ ] Backup and recovery procedures tested
- [ ] Monitoring and alerting configured
- [ ] Staff trained on crisis response procedures
- [ ] Privacy policy updated and user consent obtained
- [ ] Regulatory compliance audit completed

---

*This implementation provides a comprehensive, privacy-first database architecture that balances user safety monitoring with strict privacy protections. The system is designed to scale while maintaining regulatory compliance and supporting crisis intervention workflows.*