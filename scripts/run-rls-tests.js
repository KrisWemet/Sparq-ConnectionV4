#!/usr/bin/env node

/**
 * Automated RLS Test Runner
 * Comprehensive test runner for Row Level Security policies
 * Designed for pre-deployment validation and CI/CD integration
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const CONFIG = {
  testDir: path.join(__dirname, '../tests/rls'),
  reportDir: path.join(__dirname, '../test-reports'),
  timeout: 300000, // 5 minutes total timeout
  retries: 2,
  parallel: false, // RLS tests should run sequentially to avoid context conflicts
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  failFast: process.argv.includes('--fail-fast'),
  onlyPerformance: process.argv.includes('--performance-only'),
  skipPerformance: process.argv.includes('--skip-performance'),
  generateReport: !process.argv.includes('--no-report')
}

// Test suites in order of execution
const TEST_SUITES = [
  {
    name: 'Setup Validation',
    file: 'setup.test.js',
    description: 'Validates test environment setup',
    critical: true
  },
  {
    name: 'Multi-Couple Isolation',
    file: 'couple-isolation.test.js', 
    description: 'Tests data isolation between different couples',
    critical: true
  },
  {
    name: 'Privacy Controls',
    file: 'privacy-controls.test.js',
    description: 'Tests individual privacy preference enforcement',
    critical: true
  },
  {
    name: 'Edge Cases',
    file: 'edge-cases.test.js',
    description: 'Tests unusual scenarios and edge cases',
    critical: false
  },
  {
    name: 'Performance Tests',
    file: 'performance.test.js',
    description: 'Tests RLS performance under load',
    critical: false,
    performanceTest: true
  }
]

class RLSTestRunner {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      suiteResults: [],
      criticalFailures: [],
      performanceIssues: [],
      securityIssues: []
    }
    
    this.hasSecurityFailures = false
  }

  async run() {
    console.log('🛡️  Starting RLS Security Test Suite')
    console.log('=====================================\n')
    
    // Ensure report directory exists
    if (CONFIG.generateReport) {
      await this.ensureReportDirectory()
    }
    
    // Validate environment
    await this.validateEnvironment()
    
    // Filter test suites based on command line options
    const suitesToRun = this.filterTestSuites()
    
    console.log(`📋 Running ${suitesToRun.length} test suite(s):\n`)
    
    // Run test suites
    for (const suite of suitesToRun) {
      await this.runTestSuite(suite)
      
      if (CONFIG.failFast && this.hasSecurityFailures) {
        console.log('\n🚨 FAIL FAST: Critical security test failed, stopping execution')
        break
      }
    }
    
    // Generate final report
    this.results.endTime = new Date()
    await this.generateFinalReport()
    
    // Exit with appropriate code
    process.exit(this.hasSecurityFailures ? 1 : 0)
  }

  filterTestSuites() {
    let suites = [...TEST_SUITES]
    
    if (CONFIG.onlyPerformance) {
      suites = suites.filter(suite => suite.performanceTest)
    } else if (CONFIG.skipPerformance) {
      suites = suites.filter(suite => !suite.performanceTest)
    }
    
    return suites
  }

  async validateEnvironment() {
    console.log('🔍 Validating test environment...')
    
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:')
      missingVars.forEach(varName => console.error(`   - ${varName}`))
      process.exit(1)
    }
    
    // Check if test files exist
    const missingFiles = TEST_SUITES
      .map(suite => suite.file)
      .filter(file => !fs.existsSync(path.join(CONFIG.testDir, file)))
    
    if (missingFiles.length > 0) {
      console.error('❌ Missing test files:')
      missingFiles.forEach(file => console.error(`   - ${file}`))
      process.exit(1)
    }
    
    console.log('✅ Environment validation passed\n')
  }

  async runTestSuite(suite) {
    console.log(`🧪 Running: ${suite.name}`)
    console.log(`   ${suite.description}`)
    
    const startTime = Date.now()
    
    try {
      const result = await this.executeVitest(suite.file)
      const duration = Date.now() - startTime
      
      const suiteResult = {
        name: suite.name,
        file: suite.file,
        critical: suite.critical,
        duration,
        success: result.success,
        output: result.output,
        error: result.error,
        testResults: this.parseTestResults(result.output)
      }
      
      this.results.suiteResults.push(suiteResult)
      this.updateCounters(suiteResult)
      
      if (result.success) {
        console.log(`   ✅ PASSED (${duration}ms)`)
      } else {
        console.log(`   ❌ FAILED (${duration}ms)`)
        if (suite.critical) {
          this.hasSecurityFailures = true
          this.results.criticalFailures.push(suite.name)
        }
        
        if (CONFIG.verbose) {
          console.log(`   Error: ${result.error}`)
        }
      }
      
    } catch (error) {
      console.log(`   💥 ERROR: ${error.message}`)
      
      const suiteResult = {
        name: suite.name,
        file: suite.file,
        critical: suite.critical,
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
        testResults: { passed: 0, failed: 1, total: 1 }
      }
      
      this.results.suiteResults.push(suiteResult)
      this.updateCounters(suiteResult)
      
      if (suite.critical) {
        this.hasSecurityFailures = true
        this.results.criticalFailures.push(suite.name)
      }
    }
    
    console.log() // Empty line for readability
  }

  async executeVitest(testFile) {
    return new Promise((resolve) => {
      const vitestPath = path.join(__dirname, '../node_modules/.bin/vitest')
      const testFilePath = path.join(CONFIG.testDir, testFile)
      
      const args = [
        'run',
        testFilePath,
        '--reporter=verbose',
        '--no-coverage',
        '--no-watch'
      ]
      
      if (CONFIG.verbose) {
        console.log(`   Executing: ${vitestPath} ${args.join(' ')}`)
      }
      
      const vitest = spawn('npx', ['vitest', ...args], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
      })
      
      let output = ''
      let error = ''
      
      vitest.stdout.on('data', (data) => {
        const text = data.toString()
        output += text
        if (CONFIG.verbose) {
          process.stdout.write(text)
        }
      })
      
      vitest.stderr.on('data', (data) => {
        const text = data.toString()
        error += text
        if (CONFIG.verbose) {
          process.stderr.write(text)
        }
      })
      
      const timeout = setTimeout(() => {
        vitest.kill('SIGKILL')
        resolve({
          success: false,
          output,
          error: 'Test timeout exceeded'
        })
      }, CONFIG.timeout)
      
      vitest.on('close', (code) => {
        clearTimeout(timeout)
        resolve({
          success: code === 0,
          output,
          error: code !== 0 ? error || `Process exited with code ${code}` : null
        })
      })
    })
  }

  parseTestResults(output) {
    // Parse Vitest output to extract test counts
    const passedMatch = output.match(/(\d+) passed/)
    const failedMatch = output.match(/(\d+) failed/)
    const totalMatch = output.match(/Tests\s+(\d+)/)
    
    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      total: totalMatch ? parseInt(totalMatch[1]) : 0
    }
  }

  updateCounters(suiteResult) {
    const { testResults } = suiteResult
    this.results.totalTests += testResults.total
    this.results.passedTests += testResults.passed
    this.results.failedTests += testResults.failed
  }

  async generateFinalReport() {
    const duration = this.results.endTime - this.results.startTime
    const durationSeconds = Math.round(duration / 1000)
    
    console.log('\n🔒 RLS Security Test Results')
    console.log('=============================')
    console.log(`⏱️  Total Duration: ${durationSeconds}s`)
    console.log(`📊 Test Summary:`)
    console.log(`   • Total Tests: ${this.results.totalTests}`)
    console.log(`   • Passed: ${this.results.passedTests}`)
    console.log(`   • Failed: ${this.results.failedTests}`)
    console.log(`   • Success Rate: ${this.getSuccessRate()}%`)
    
    // Critical failures
    if (this.results.criticalFailures.length > 0) {
      console.log('\n🚨 CRITICAL SECURITY FAILURES:')
      this.results.criticalFailures.forEach(failure => {
        console.log(`   ❌ ${failure}`)
      })
    }
    
    // Suite breakdown
    console.log('\n📋 Suite Breakdown:')
    this.results.suiteResults.forEach(suite => {
      const status = suite.success ? '✅' : '❌'
      const critical = suite.critical ? ' (CRITICAL)' : ''
      console.log(`   ${status} ${suite.name}${critical} - ${suite.duration}ms`)
    })
    
    // Security status
    console.log('\n🛡️  Security Status:')
    if (this.hasSecurityFailures) {
      console.log('   🚨 SECURITY BREACH DETECTED')
      console.log('   ⚠️  DO NOT DEPLOY TO PRODUCTION')
      console.log('   🔧 Fix all critical security issues before deployment')
    } else {
      console.log('   ✅ ALL SECURITY TESTS PASSED')
      console.log('   🚀 Safe for production deployment')
    }
    
    // Generate JSON report
    if (CONFIG.generateReport) {
      await this.generateJSONReport()
    }
  }

  getSuccessRate() {
    if (this.results.totalTests === 0) return 0
    return Math.round((this.results.passedTests / this.results.totalTests) * 100)
  }

  async ensureReportDirectory() {
    if (!fs.existsSync(CONFIG.reportDir)) {
      fs.mkdirSync(CONFIG.reportDir, { recursive: true })
    }
  }

  async generateJSONReport() {
    const reportPath = path.join(CONFIG.reportDir, `rls-test-report-${Date.now()}.json`)
    
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
        testType: 'RLS Security Tests',
        environment: process.env.NODE_ENV || 'test'
      },
      summary: {
        totalDuration: this.results.endTime - this.results.startTime,
        totalTests: this.results.totalTests,
        passedTests: this.results.passedTests,
        failedTests: this.results.failedTests,
        successRate: this.getSuccessRate(),
        securityStatus: this.hasSecurityFailures ? 'FAILED' : 'PASSED',
        deploymentRecommendation: this.hasSecurityFailures ? 'DO_NOT_DEPLOY' : 'SAFE_TO_DEPLOY'
      },
      results: this.results.suiteResults.map(suite => ({
        suiteName: suite.name,
        file: suite.file,
        critical: suite.critical,
        success: suite.success,
        duration: suite.duration,
        testResults: suite.testResults,
        error: suite.error || null
      })),
      issues: {
        criticalFailures: this.results.criticalFailures,
        performanceIssues: this.results.performanceIssues,
        securityIssues: this.results.securityIssues
      },
      recommendations: this.generateRecommendations()
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Report saved: ${reportPath}`)
  }

  generateRecommendations() {
    const recommendations = []
    
    if (this.hasSecurityFailures) {
      recommendations.push({
        type: 'CRITICAL',
        message: 'Fix all critical security test failures before deployment',
        action: 'Review failed test suites and fix RLS policy issues'
      })
    }
    
    if (this.results.failedTests > 0) {
      recommendations.push({
        type: 'HIGH',
        message: 'Address all test failures to ensure system reliability',
        action: 'Review test logs and fix failing tests'
      })
    }
    
    if (this.getSuccessRate() < 95) {
      recommendations.push({
        type: 'MEDIUM',
        message: 'Low test success rate indicates potential issues',
        action: 'Investigate and improve test reliability'
      })
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'INFO',
        message: 'All RLS security tests passed successfully',
        action: 'Continue monitoring RLS performance and security'
      })
    }
    
    return recommendations
  }
}

// Command line help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
RLS Test Runner - Automated Row Level Security Testing

Usage: node run-rls-tests.js [options]

Options:
  --help, -h              Show this help message
  --verbose, -v           Show verbose output
  --fail-fast             Stop on first critical failure
  --performance-only      Run only performance tests
  --skip-performance      Skip performance tests
  --no-report             Don't generate JSON report

Examples:
  node run-rls-tests.js                    # Run all tests
  node run-rls-tests.js --verbose          # Run with verbose output  
  node run-rls-tests.js --fail-fast        # Stop on first critical failure
  node run-rls-tests.js --performance-only # Only run performance tests
`)
  process.exit(0)
}

// Create and run the test runner
const runner = new RLSTestRunner()
runner.run().catch(error => {
  console.error('\n💥 Test runner error:', error)
  process.exit(1)
})