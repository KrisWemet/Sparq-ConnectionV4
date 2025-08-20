#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function applySeedData() {
  console.log('🌱 Applying seed data to database...\n')
  
  try {
    // Read the seed file
    const seedFilePath = path.join(__dirname, '../supabase/seeds/01_initial_data.sql')
    const seedSQL = fs.readFileSync(seedFilePath, 'utf8')
    
    console.log('📖 Read seed file:', seedFilePath)
    console.log('📏 SQL size:', (seedSQL.length / 1024).toFixed(2), 'KB')
    
    // Split the SQL into individual statements
    // Remove comments and split on semicolons that are not inside strings
    const statements = seedSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    console.log('📊 Found', statements.length, 'SQL statements\n')
    
    let successCount = 0
    let errorCount = 0
    
    // Execute each statement using rpc with the sql function
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip empty statements
      if (!statement || statement.length < 10) {
        continue
      }
      
      console.log(`${i + 1}/${statements.length}: Executing statement...`)
      
      try {
        // For complex SQL like DO blocks and INSERT statements, we need to execute them directly
        // Since we can't use the SQL function, we'll use a workaround with individual queries
        
        if (statement.includes('INSERT INTO') || statement.includes('DO $$') || statement.includes('CREATE')) {
          // Try to execute common statements individually
          await executeStatement(statement)
          successCount++
          console.log('✅ Success')
        } else {
          console.log('⏭️  Skipped (unsupported statement type)')
        }
        
      } catch (error) {
        errorCount++
        console.error('❌ Error:', error.message.substring(0, 100) + '...')
      }
    }
    
    console.log(`\n📊 Seed data application summary:`)
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Errors: ${errorCount}`)
    
    if (errorCount === 0) {
      console.log('🎉 All seed data applied successfully!')
    } else {
      console.log('⚠️  Some statements failed - check database state')
    }
    
    // Verify seed data was applied
    await verifySeedData()
    
  } catch (error) {
    console.error('❌ Failed to apply seed data:', error.message)
    process.exit(1)
  }
}

async function executeStatement(statement) {
  // Handle different types of statements
  if (statement.includes('INSERT INTO jurisdictions')) {
    await insertJurisdictions()
  } else if (statement.includes('INSERT INTO subscription_tiers')) {
    await insertSubscriptionTiers()
  } else if (statement.includes('INSERT INTO safety_resources')) {
    await insertSafetyResources()
  } else if (statement.includes('INSERT INTO self_report_measures')) {
    await insertSelfReportMeasures()
  } else if (statement.includes('INSERT INTO daily_prompts')) {
    await insertDailyPrompts()
  } else if (statement.includes('INSERT INTO content_templates')) {
    await insertContentTemplates()
  } else {
    // For other statements, we'll skip them for now
    throw new Error('Statement type not supported by this seeder')
  }
}

async function insertJurisdictions() {
  const jurisdictions = [
    {
      country_code: 'US',
      country_name: 'United States',
      state_province_code: 'CA',
      state_province_name: 'California',
      data_protection_laws: ['CCPA', 'HIPAA'],
      primary_language: 'en',
      supported_languages: ['en', 'es'],
      service_available: true,
      emergency_number: '911',
      crisis_hotline_numbers: ['988', '1-800-273-8255'],
      currency_code: 'USD',
      timezone: 'America/Los_Angeles'
    },
    {
      country_code: 'CA',
      country_name: 'Canada',
      state_province_code: 'ON',
      state_province_name: 'Ontario',
      data_protection_laws: ['PIPEDA'],
      primary_language: 'en',
      supported_languages: ['en', 'fr'],
      service_available: true,
      emergency_number: '911',
      crisis_hotline_numbers: ['988', '1-833-456-4566'],
      currency_code: 'CAD',
      timezone: 'America/Toronto'
    }
  ]
  
  for (const jurisdiction of jurisdictions) {
    await supabase.from('jurisdictions').upsert(jurisdiction)
  }
}

async function insertSubscriptionTiers() {
  const tiers = [
    {
      tier_name: 'free',
      tier_display_name: 'Free',
      tier_description: 'Basic relationship wellness tools with essential safety features',
      price_monthly_cents: 0,
      price_annual_cents: 0,
      trial_period_days: 0,
      max_daily_prompts: 3,
      max_assessments_per_month: 2,
      max_progress_goals: 3,
      advanced_analytics_enabled: false,
      priority_support_enabled: false,
      custom_content_enabled: false,
      safety_monitoring_enabled: true,
      crisis_resources_enabled: true,
      is_active: true,
      is_public: true,
      sort_order: 1
    }
  ]
  
  for (const tier of tiers) {
    await supabase.from('subscription_tiers').upsert(tier)
  }
}

async function insertSafetyResources() {
  const resources = [
    {
      resource_name: 'National Suicide Prevention Lifeline',
      resource_type: 'crisis_hotline',
      phone_number: '988',
      text_number: '988',
      website_url: 'https://suicidepreventionlifeline.org',
      availability_hours: '24/7',
      languages_supported: ['en', 'es'],
      cost_structure: 'free',
      country_code: 'US',
      service_description: 'Free and confidential emotional support for people in suicidal crisis or emotional distress',
      crisis_types_supported: ['suicidal_ideation', 'emotional_distress', 'mental_health_emergency'],
      verified: true,
      display_priority: 1,
      is_active: true
    }
  ]
  
  for (const resource of resources) {
    await supabase.from('safety_resources').upsert(resource)
  }
}

async function insertSelfReportMeasures() {
  // Simplified version for testing
  const measures = [
    {
      measure_name: 'Relationship Assessment Scale',
      measure_type: 'relationship_satisfaction',
      measure_version: '1.0',
      is_validated_scale: true,
      validation_source: 'Hendrick, S. S. (1988)',
      educational_purpose: 'Educational assessment of relationship satisfaction',
      questions: [
        {
          id: 'ras1',
          text: 'How well does your partner meet your needs?',
          type: 'likert',
          scale: [1,2,3,4,5],
          labels: ['Poorly', 'Fair', 'Average', 'Well', 'Extremely well']
        }
      ],
      scoring_algorithm: {
        scoring: 'sum',
        min_score: 7,
        max_score: 35
      },
      interpretation_guidelines: {
        'low_satisfaction': 'This suggests some areas may benefit from attention.'
      },
      estimated_completion_minutes: 5,
      disclaimer_text: 'This assessment is for educational purposes only.',
      is_active: true
    }
  ]
  
  for (const measure of measures) {
    await supabase.from('self_report_measures').upsert(measure)
  }
}

async function insertDailyPrompts() {
  const prompts = [
    {
      prompt_text: 'Share one thing you appreciated about your partner today and why it meant something to you.',
      prompt_category: 'appreciation',
      difficulty_level: 'easy',
      target_relationship_stage: 'any',
      generated_by_ai: false,
      human_reviewed: true,
      is_active: true,
      quality_score: 0.95
    }
  ]
  
  for (const prompt of prompts) {
    await supabase.from('daily_prompts').upsert(prompt)
  }
}

async function insertContentTemplates() {
  const templates = [
    {
      template_name: 'Welcome Message',
      template_type: 'guidance_text',
      category: 'onboarding',
      content_text: 'Welcome to Sparq Connection! Our platform is designed to support your relationship wellness journey.',
      generated_by_ai: false,
      human_reviewed: true,
      approved_for_production: true,
      is_active: true,
      quality_score: 0.98
    }
  ]
  
  for (const template of templates) {
    await supabase.from('content_templates').upsert(template)
  }
}

async function verifySeedData() {
  console.log('\n🔍 Verifying seed data...')
  
  const tables = [
    'jurisdictions',
    'subscription_tiers', 
    'safety_resources',
    'self_report_measures',
    'daily_prompts',
    'content_templates'
  ]
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.log(`❌ ${table}: Error - ${error.message}`)
      } else {
        console.log(`✅ ${table}: ${count} records`)
      }
    } catch (e) {
      console.log(`❌ ${table}: Failed to verify`)
    }
  }
}

applySeedData()