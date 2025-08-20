#!/usr/bin/env tsx

import { runAutomatedCrisisTests } from '../src/lib/testing/crisis-detection-tests'

async function main() {
  try {
    console.log('🧪 Crisis Detection Testing Suite')
    console.log('=================================\n')

    const results = await runAutomatedCrisisTests()

    // Check if we meet our accuracy thresholds
    const { detectorSummary, integrationSummary } = results

    console.log('\n📊 Final Assessment:')
    console.log('====================')

    // Detector assessment
    if (detectorSummary.overallAccuracy >= 0.9) {
      console.log('✅ Crisis Detector: EXCELLENT accuracy (≥90%)')
    } else if (detectorSummary.overallAccuracy >= 0.8) {
      console.log('⚠️ Crisis Detector: GOOD accuracy (≥80%)')
    } else {
      console.log('❌ Crisis Detector: NEEDS IMPROVEMENT (<80%)')
    }

    // Integration assessment
    if (integrationSummary.claudeFlowAccuracy >= 0.9) {
      console.log('✅ Claude Flow Integration: EXCELLENT consistency (≥90%)')
    } else if (integrationSummary.claudeFlowAccuracy >= 0.8) {
      console.log('⚠️ Claude Flow Integration: GOOD consistency (≥80%)')
    } else {
      console.log('❌ Claude Flow Integration: NEEDS IMPROVEMENT (<80%)')
    }

    // Critical safety check
    if (detectorSummary.criticalFailures.length === 0) {
      console.log('✅ Safety: NO critical failures detected')
    } else {
      console.log(`🚨 Safety: ${detectorSummary.criticalFailures.length} CRITICAL failures need immediate attention`)
      process.exit(1) // Fail CI if critical failures
    }

    // Performance check
    const avgAccuracy = (detectorSummary.overallAccuracy + integrationSummary.claudeFlowAccuracy) / 2
    if (avgAccuracy >= 0.95) {
      console.log(`🎉 Overall System Performance: EXCEPTIONAL (${(avgAccuracy * 100).toFixed(1)}%)`)
    } else if (avgAccuracy >= 0.85) {
      console.log(`🌟 Overall System Performance: EXCELLENT (${(avgAccuracy * 100).toFixed(1)}%)`)
    } else if (avgAccuracy >= 0.75) {
      console.log(`👍 Overall System Performance: GOOD (${(avgAccuracy * 100).toFixed(1)}%)`)
    } else {
      console.log(`📈 Overall System Performance: NEEDS WORK (${(avgAccuracy * 100).toFixed(1)}%)`)
      process.exit(1) // Fail CI if below threshold
    }

    console.log('\n✅ Crisis detection testing completed successfully!')

  } catch (error) {
    console.error('💥 Crisis detection testing failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}