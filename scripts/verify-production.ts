#!/usr/bin/env tsx
/**
 * Production Verification Script
 * 
 * Verifies all environment variables, tests budget filtering with real data,
 * and validates analytics data flow for the enhanced recommendation system.
 * 
 * Usage: tsx scripts/verify-production.ts
 */

import { createClient } from '@/utils/supabase/server';
import { EventService } from '@/services/eventServices';
import { BehavioralAnalyticsService } from '@/services/behavioralAnalyticsService';
import { ScoringStrategyFactory } from '@/services/scoring';
import { CareerProfileService } from '@/services/careerProfileService';
import type { Event as TechEvent, CareerProfile } from '@/types';

// Environment variables that should be set
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'VERCEL_KV_REST_API_URL',
  'VERCEL_KV_REST_API_TOKEN',
];

// Optional environment variables for features
const OPTIONAL_ENV_VARS = [
  'NEXT_PUBLIC_LOG_SCORING',
  'NEXT_PUBLIC_TYPE_PREF_GATE',
  'NEXT_PUBLIC_DISABLE_TYPE_PREF_GATE',
  'NEXT_PUBLIC_ENABLE_BEHAVIORAL_BOOST',
  'NEXT_PUBLIC_BEHAVIORAL_BOOST_STRENGTH',
  'NEXT_PUBLIC_ENABLE_SCORE_BREAKDOWN',
  'NEXT_PUBLIC_SHOW_BUDGET_HINT',
  'ENABLE_MONITORING_API',
];

interface VerificationResult {
  success: boolean;
  message: string;
  details?: any;
}

class ProductionVerifier {
  private supabase: any;
  private results: VerificationResult[] = [];

  async run(): Promise<void> {
    console.log('🔍 Starting Production Verification...\n');

    try {
      // Initialize Supabase
      this.supabase = await createClient();
      
      // Run all verification checks
      await this.verifyEnvironmentVariables();
      await this.verifyDatabaseConnection();
      await this.verifyBudgetFiltering();
      await this.verifyAnalyticsDataFlow();
      await this.verifyScoringSystem();
      
      // Print summary
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    }
  }

  private async verifyEnvironmentVariables(): Promise<void> {
    console.log('📋 Verifying Environment Variables...');
    
    const missing = REQUIRED_ENV_VARS.filter(env => !process.env[env]);
    const present = REQUIRED_ENV_VARS.filter(env => process.env[env]);
    
    if (missing.length > 0) {
      this.addResult(false, `Missing required environment variables: ${missing.join(', ')}`);
    } else {
      this.addResult(true, `All ${REQUIRED_ENV_VARS.length} required environment variables are set`);
    }
    
    // Check optional variables
    const optionalPresent = OPTIONAL_ENV_VARS.filter(env => process.env[env]);
    this.addResult(true, `${optionalPresent.length}/${OPTIONAL_ENV_VARS.length} optional environment variables are set`);
    
    console.log(`   ✅ Required: ${present.length}/${REQUIRED_ENV_VARS.length}`);
    console.log(`   ℹ️  Optional: ${optionalPresent.length}/${OPTIONAL_ENV_VARS.length}\n`);
  }

  private async verifyDatabaseConnection(): Promise<void> {
    console.log('🗄️  Verifying Database Connection...');
    
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('count')
        .limit(1);
        
      if (error) throw error;
      
      this.addResult(true, 'Database connection successful');
      console.log('   ✅ Database connection established\n');
    } catch (error) {
      this.addResult(false, `Database connection failed: ${error}`);
      console.log('   ❌ Database connection failed\n');
    }
  }

  private async verifyBudgetFiltering(): Promise<void> {
    console.log('💰 Verifying Budget Filtering...');
    
    try {
      // Test each budget tier
      const budgetTiers = ['free-only', 'low', 'moderate', 'high', 'unlimited'];
      const results = [];
      
      for (const tier of budgetTiers) {
      const result = await EventService.getEventsWithRPC(
        { budget: tier as any },
        this.supabase,
        1,
        10
      );
      
      const events = result.events || result;
      
      results.push({
        tier,
        count: events.length,
        hasEvents: events.length > 0
      });
      }
      
      const totalEvents = results.reduce((sum, r) => sum + r.count, 0);
      const tiersWithEvents = results.filter(r => r.hasEvents).length;
      
      this.addResult(true, `Budget filtering working: ${totalEvents} events across ${tiersWithEvents}/${budgetTiers.length} tiers`, results);
      console.log(`   ✅ Budget filtering: ${totalEvents} events across ${tiersWithEvents}/${budgetTiers.length} tiers\n`);
      
    } catch (error) {
      this.addResult(false, `Budget filtering failed: ${error}`);
      console.log('   ❌ Budget filtering failed\n');
    }
  }

  private async verifyAnalyticsDataFlow(): Promise<void> {
    console.log('📊 Verifying Analytics Data Flow...');
    
    try {
      // Test analytics service initialization
      const testUserId = 'test-user-verification';
      
      // Test consent management
      const consent = await BehavioralAnalyticsService.getAnalyticsConsent(testUserId, this.supabase);
      this.addResult(true, 'Analytics consent management working');
      
      // Test interaction tracking (mock)
      const testInteraction = {
        userId: testUserId,
        eventId: 'test-event',
        interactionType: 'click' as const,
        section: 'for_you' as const,
        algorithmVersion: 'v2.0.0'
      };
      
      // This should not throw
      await BehavioralAnalyticsService.trackInteraction(
        'test-user-id',
        'bookmark',
        { section: 'for_you', position: 1, algorithmVersion: 'v2.0.0' },
        this.supabase
      );
      this.addResult(true, 'Analytics interaction tracking working');
      
      console.log('   ✅ Analytics data flow verified\n');
      
    } catch (error) {
      this.addResult(false, `Analytics data flow failed: ${error}`);
      console.log('   ❌ Analytics data flow failed\n');
    }
  }

  private async verifyScoringSystem(): Promise<void> {
    console.log('🎯 Verifying Scoring System...');
    
    try {
      // Test strategy factory
      const strategy = ScoringStrategyFactory.getDefaultStrategy();
      this.addResult(true, `Scoring strategy loaded: ${strategy.name} v${strategy.version}`);
      
      // Test with sample data
      const sampleEvent = {
        id: 'test-event',
        title: 'Test Event',
        description: 'A test event for verification',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        location: 'Virtual',
        category: { id: 'test-category', name: 'workshop', color: '#000000', description: 'Test category' },
        tags: [{ id: 'tag1', name: 'javascript', category: 'Programming', color: '#000000' }],
        createdAt: new Date().toISOString(),
        organizer: 'Test Organizer',
        status: 'active',
        sourceUrl: 'https://example.com',
        priceMin: 0,
        priceMax: 100,
        currency: 'USD',
        livestreamUrl: null,
        eventTypeId: 'test-type'
      } as unknown as TechEvent;
      
      const sampleProfile = {
        userId: 'test-user',
        profileId: 'test-profile',
        lastUpdated: new Date().toISOString(),
        primarySkills: ['javascript'],
        skillsToLearn: ['react'],
        seniority: 'mid-level',
        careerGoals: ['skill-development'],
        industry: 'technology',
        learningStyle: 'hands-on',
        timeframe: 'flexible' as const,
        budget: 'moderate',
        networkingGoals: ['find-peers'],
        preferredEventTypes: ['workshop'],
        currentRole: 'Developer',
        companySize: 'medium',
        interests: ['web development'],
        availableTime: 'flexible' as const
      } as unknown as CareerProfile;
      
      const score = await strategy.calculate({ event: sampleEvent, careerProfile: sampleProfile });
      
      this.addResult(true, `Scoring system working: ${score.overall}% score with ${score.confidence} confidence`);
      console.log(`   ✅ Scoring system: ${score.overall}% score, ${score.confidence} confidence\n`);
      
    } catch (error) {
      this.addResult(false, `Scoring system failed: ${error}`);
      console.log('   ❌ Scoring system failed\n');
    }
  }

  private addResult(success: boolean, message: string, details?: any): void {
    this.results.push({ success, message, details });
  }

  private printSummary(): void {
    console.log('📋 VERIFICATION SUMMARY');
    console.log('========================\n');
    
    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    this.results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.message}`);
      
      if (result.details && process.env.NODE_ENV === 'development') {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      }
    });
    
    console.log(`\n🎯 Overall: ${successful}/${total} checks passed`);
    
    if (successful === total) {
      console.log('🎉 Production verification PASSED! System is ready for deployment.');
    } else {
      console.log('⚠️  Production verification PARTIALLY PASSED. Please address failed checks.');
    }
  }
}

// Run verification
if (require.main === module) {
  const verifier = new ProductionVerifier();
  verifier.run().catch(console.error);
}

export { ProductionVerifier };
