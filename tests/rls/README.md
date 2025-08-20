# RLS Security Testing Suite

A comprehensive Row Level Security (RLS) testing system for Sparq Connection V4, ensuring data isolation, privacy controls, and security compliance.

## 🛡️ Overview

This testing suite validates that our PostgreSQL Row Level Security policies correctly isolate user data, prevent unauthorized access, and maintain privacy controls across the application.

## 🚀 Quick Start

### Run All Tests
```bash
npm run rls:test
```

### Run Critical Security Tests Only
```bash
npm run rls:test:critical
```

### Run Performance Tests Only
```bash
npm run rls:test:performance
```

### Run with Verbose Output
```bash
npm run rls:test:verbose
```

## 📋 Test Suites

### 1. Setup Validation (`setup.test.js`)
- **Purpose**: Validates test environment configuration
- **Critical**: Yes
- **Tests**:
  - Environment variables are configured
  - Database connectivity works
  - Required tables exist
  - RLS functions are available
  - Basic RLS enforcement works

### 2. Multi-Couple Isolation (`couple-isolation.test.js`)
- **Purpose**: Tests data isolation between different couples
- **Critical**: Yes
- **Tests**:
  - User profile isolation
  - Couple data access control
  - Communication history isolation
  - Assessment response isolation
  - Cross-couple access prevention

### 3. Privacy Controls (`privacy-controls.test.js`)
- **Purpose**: Tests individual privacy preference enforcement
- **Critical**: Yes
- **Tests**:
  - Privacy preference enforcement
  - Assessment sharing consent
  - Safety profile privacy
  - Communication privacy
  - Consent-based access control

### 4. Edge Cases (`edge-cases.test.js`)
- **Purpose**: Tests unusual scenarios and edge cases
- **Critical**: No
- **Tests**:
  - Deleted user scenarios
  - Inactive couple scenarios
  - Invalid auth tokens
  - Concurrent access
  - Data corruption scenarios

### 5. Performance Tests (`performance.test.js`)
- **Purpose**: Tests RLS performance under load
- **Critical**: No
- **Tests**:
  - Single user access performance
  - Couple access performance
  - Bulk access performance
  - Stress testing
  - Memory usage validation

## 🏗️ Test Infrastructure

### Setup (`setup.js`)
- Database client configuration
- Test user creation utilities
- Authentication context management
- Test data cleanup
- RLS test validators

### Fixtures (`fixtures.js`)
- Pre-configured test data scenarios
- Multi-couple relationship setup
- Privacy preference variations
- Edge case data generation
- Test data validation

## 🔧 Configuration

### Environment Variables
```bash
# Required for all tests
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional for enhanced testing
NODE_ENV=test
```

### Test Configuration (`setup.js`)
```javascript
export const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  testPrefix: 'rls_test_',
  timeout: 30000
}
```

## 🤖 Automated Testing

### GitHub Actions Integration

The RLS tests run automatically on:
- **Push to main/develop**: Critical security validation
- **Pull requests**: Full security review
- **Daily schedule**: Continuous security monitoring
- **Manual trigger**: On-demand testing

### CI/CD Pipeline

1. **Setup**: Environment validation
2. **Critical Tests**: Must pass for deployment
3. **Performance Tests**: Benchmarking and optimization
4. **Compliance Check**: Security analysis and reporting
5. **Deployment Gate**: Blocks deployment on security failures

### Test Reports

Reports are generated in JSON format containing:
- Test execution summary
- Security status
- Performance metrics
- Deployment recommendations
- Issue categorization

## 📊 Test Results

### Success Criteria

**Critical Tests (Must Pass for Deployment)**
- ✅ All user data isolation tests
- ✅ All couple access control tests
- ✅ All privacy enforcement tests
- ✅ Basic functionality validation

**Performance Tests (Benchmarking)**
- 🎯 User profile access < 100ms
- 🎯 Couple data access < 100ms
- 🎯 Complex queries < 200ms
- 🎯 95%+ test success rate

### Failure Handling

**Critical Failures**
- 🚨 Block deployment immediately
- 🚨 Create security issue
- 🚨 Notify development team
- 🚨 Require manual review

**Performance Issues**
- ⚠️ Generate performance report
- ⚠️ Log optimization opportunities
- ⚠️ Allow deployment with warnings

## 🛠️ Development Workflow

### Before Making RLS Changes
```bash
# Run current tests to establish baseline
npm run rls:test:critical
```

### After Modifying RLS Policies
```bash
# Run full test suite
npm run rls:test:verbose

# If tests pass, run pre-deployment validation
npm run pre-deploy
```

### Debugging Test Failures
```bash
# Run with maximum verbosity
npm run rls:test:verbose

# Run specific test file
npx vitest tests/rls/couple-isolation.test.js --reporter=verbose

# Check test reports
cat test-reports/rls-test-report-*.json | jq .
```

## 🔍 Security Scenarios Tested

### Data Isolation
- ✅ User A cannot access User B's profile
- ✅ Couple AB cannot access Couple CD's data
- ✅ Single users cannot access couple data
- ✅ Inactive users/couples handled correctly

### Privacy Controls
- ✅ Assessment sharing consent enforced
- ✅ Communication privacy maintained
- ✅ Safety profile access restricted
- ✅ Privacy preferences respected

### Edge Cases
- ✅ Deleted users cannot access data
- ✅ Invalid auth tokens denied
- ✅ Concurrent access maintained
- ✅ Large datasets perform well

### Performance
- ✅ RLS policies don't degrade performance
- ✅ Complex queries remain efficient
- ✅ Memory usage stays reasonable
- ✅ Concurrent access scales

## 🚨 Security Alert Levels

### 🔴 Critical (Blocks Deployment)
- User data accessible by unauthorized users
- Cross-couple data leakage
- Privacy preference bypass
- Authentication bypass

### 🟠 High (Requires Investigation)
- Performance degradation >50%
- Edge case failures
- Incomplete test coverage
- Memory leaks detected

### 🟡 Medium (Monitor)
- Minor performance issues
- Non-critical edge cases
- Test environment issues
- Documentation gaps

### 🟢 Low (Informational)
- All tests passing
- Performance within limits
- Good test coverage
- No security issues

## 📚 Best Practices

### Writing RLS Tests
1. **Always test both positive and negative cases**
2. **Use realistic test data scenarios**
3. **Test cross-user access attempts**
4. **Validate performance impact**
5. **Clean up test data properly**

### RLS Policy Development
1. **Test policies before deployment**
2. **Use least-privilege principle**
3. **Document policy intent**
4. **Consider performance impact**
5. **Test edge cases thoroughly**

### Debugging RLS Issues
1. **Check auth context is set correctly**
2. **Verify policy conditions**
3. **Test with different user roles**
4. **Use verbose logging**
5. **Validate database indexes**

## 📞 Support

### When Tests Fail
1. **Review test output carefully**
2. **Check recent RLS policy changes**
3. **Verify database migrations applied**
4. **Test manually with SQL queries**
5. **Consult security team if needed**

### Performance Issues
1. **Check database query plans**
2. **Verify RLS indexes exist**
3. **Review complex policy logic**
4. **Test with realistic data volumes**
5. **Consider policy optimization**

### Getting Help
- **Security Issues**: Contact security team immediately
- **Performance Issues**: Review with database team
- **Test Failures**: Check CI/CD logs and reports
- **Infrastructure**: Contact DevOps team

## 🔮 Future Enhancements

### Planned Features
- [ ] Automated policy generation testing
- [ ] Real-world data simulation
- [ ] Advanced performance profiling
- [ ] Multi-tenant testing scenarios
- [ ] Automated security report generation

### Performance Optimizations
- [ ] Parallel test execution (where safe)
- [ ] Test data caching
- [ ] Incremental test runs
- [ ] Performance regression detection
- [ ] Automated optimization suggestions

---

**Remember**: RLS security is critical for user privacy and regulatory compliance. Never skip security tests in production deployments.