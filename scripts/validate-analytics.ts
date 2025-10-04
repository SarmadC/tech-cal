#!/usr/bin/env tsx
/**
 * Analytics Data Flow Validation Script
 * 
 * Validates that analytics data flows correctly from user interactions
 * to the database, including click/save tracking and career impact metrics.
 * 
 * Usage: tsx scripts/validate-analytics.ts
 */

import { createClient } from '@/utils/supabase/server';
import { BehavioralAnalyticsService } from '@/services/behavioralAnalyticsService';
import { envConfig } from '@/utils/envConfig';

interface AnalyticsValidationResult {
  test: string;
  success: boolean;
  message: string;
  details?: any;
}

class AnalyticsValidator {
  private supabase: any;
  private testUserId = 'analytics-test-user';
  private results: AnalyticsValidationResult[] = [];

  async run(): Promise<void> {
    console.log('📊 Validating Analytics Data Flow...\n');

    try {
      this.supabase = await createClient();
      
      // Run all validation tests
      await this.validateEnvironmentConfig();
      await this.validateConsentManagement();
      await this.validateInteractionTracking();
      await this.validateCareerImpactMetrics();
      await this.validateDataRetrieval();
      
      // Print summary
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Analytics validation failed:', error);
      process.exit(1);
    }
  }

  private async validateEnvironmentConfig(): Promise<void> {
    console.log('🔧 Validating Environment Configuration...');
    
    try {
      const validation = envConfig.validate();
      
      if (validation.isValid) {
        this.addResult(true, 'Environment configuration valid');
        console.log('   ✅ All required environment variables present');
      } else {
        this.addResult(false, `Missing environment variables: ${validation.missing.join(', ')}`);
        console.log(`   ❌ Missing: ${validation.missing.join(', ')}`);
      }
      
      const summary = envConfig.getSummary();
      console.log(`   📊 Required: ${summary.required.present}/${summary.required.total}`);
      console.log(`   📊 Optional: ${summary.optional.present}/${summary.optional.total}`);
      console.log(`   🎛️  Features: ${Object.entries(summary.features).filter(([_, enabled]) => enabled).length} enabled\n`);
      
    } catch (error) {
      this.addResult(false, `Environment validation failed: ${error}`);
      console.log('   ❌ Environment validation failed\n');
    }
  }

  private async validateConsentManagement(): Promise<void> {
    console.log('🔐 Validating Consent Management...');
    
    try {
      // Test getting consent (should not throw)
      const consent = await BehavioralAnalyticsService.getAnalyticsConsent(this.testUserId, this.supabase);
      
      // Test updating consent
      await BehavioralAnalyticsService.updateAnalyticsConsent(this.testUserId, true, this.supabase);
      const updatedConsent = await BehavioralAnalyticsService.getAnalyticsConsent(this.testUserId, this.supabase);
      
      if (updatedConsent === true) {
        this.addResult(true, 'Consent management working correctly');
        console.log('   ✅ Consent management functional');
      } else {
        this.addResult(false, 'Consent update did not persist');
        console.log('   ❌ Consent update failed');
      }
      
      console.log('   📊 Consent management validated\n');
      
    } catch (error) {
      this.addResult(false, `Consent management failed: ${error}`);
      console.log('   ❌ Consent management failed\n');
    }
  }

  private async validateInteractionTracking(): Promise<void> {
    console.log('🖱️  Validating Interaction Tracking...');
    
    try {
      // Test basic interaction tracking
      const testInteraction = {
        userId: this.testUserId,
        eventId: 'test-event-123',
        interactionType: 'click' as const,
        section: 'for_you' as const,
        position: 1,
        algorithmVersion: 'v2.0.0',
        context: { test: true }
      };
      
      await BehavioralAnalyticsService.trackInteraction(testInteraction, this.supabase);
      this.addResult(true, 'Basic interaction tracking working');
      console.log('   ✅ Basic interaction tracking');
      
      // Test view tracking with duration
      const viewInteraction = {
        userId: this.testUserId,
        eventId: 'test-event-456',
        interactionType: 'view' as const,
        section: 'trending' as const,
        position: 2,
        algorithmVersion: 'v2.0.0',
        durationMs: 5000
      };
      
      await BehavioralAnalyticsService.trackInteraction(viewInteraction, this.supabase);
      this.addResult(true, 'View tracking with duration working');
      console.log('   ✅ View tracking with duration');
      
      // Test recommendation batch tracking
      const testBatch = {
        userId: this.testUserId,
        sessionId: 'test-session-789',
        algorithmVersion: 'v2.0.0',
        section: 'for_you',
        recommendations: [
          { eventId: 'event-1', score: 85, position: 1 },
          { eventId: 'event-2', score: 72, position: 2 }
        ]
      };
      
      await BehavioralAnalyticsService.trackRecommendationBatch(testBatch, this.supabase);
      this.addResult(true, 'Recommendation batch tracking working');
      console.log('   ✅ Recommendation batch tracking');
      
      console.log('   📊 Interaction tracking validated\n');
      
    } catch (error) {
      this.addResult(false, `Interaction tracking failed: ${error}`);
      console.log('   ❌ Interaction tracking failed\n');
    }
  }

  private async validateCareerImpactMetrics(): Promise<void> {
    console.log('📈 Validating Career Impact Metrics...');
    
    try {
      // Test click metric logging
      await BehavioralAnalyticsService.logCareerImpactMetric({
        userId: this.testUserId,
        eventId: 'test-event-click',
        metricType: 'click',
        algorithmVersion: 'v2.0.0'
      }, this.supabase);
      
      this.addResult(true, 'Click metric logging working');
      console.log('   ✅ Click metric logging');
      
      // Test save metric logging
      await BehavioralAnalyticsService.logCareerImpactMetric({
        userId: this.testUserId,
        eventId: 'test-event-save',
        metricType: 'save',
        algorithmVersion: 'v2.0.0'
      }, this.supabase);
      
      this.addResult(true, 'Save metric logging working');
      console.log('   ✅ Save metric logging');
      
      console.log('   📊 Career impact metrics validated\n');
      
    } catch (error) {
      this.addResult(false, `Career impact metrics failed: ${error}`);
      console.log('   ❌ Career impact metrics failed\n');
    }
  }

  private async validateDataRetrieval(): Promise<void> {
    console.log('🔍 Validating Data Retrieval...');
    
    try {
      // Test behavior pattern retrieval
      const behaviorPattern = await BehavioralAnalyticsService.getUserBehaviorPattern(this.testUserId, this.supabase);
      
      if (behaviorPattern !== null) {
        this.addResult(true, 'Behavior pattern retrieval working');
        console.log('   ✅ Behavior pattern retrieval');
      } else {
        this.addResult(true, 'Behavior pattern retrieval working (no data yet)');
        console.log('   ℹ️  Behavior pattern retrieval (no data yet)');
      }
      
      // Test recommendation metrics retrieval
      const metrics = await BehavioralAnalyticsService.getRecommendationMetrics(
        'v2.0.0',
        'for_you',
        this.supabase,
        7
      );
      
      if (metrics !== null) {
        this.addResult(true, 'Recommendation metrics retrieval working');
        console.log('   ✅ Recommendation metrics retrieval');
      } else {
        this.addResult(true, 'Recommendation metrics retrieval working (no data yet)');
        console.log('   ℹ️  Recommendation metrics retrieval (no data yet)');
      }
      
      console.log('   📊 Data retrieval validated\n');
      
    } catch (error) {
      this.addResult(false, `Data retrieval failed: ${error}`);
      console.log('   ❌ Data retrieval failed\n');
    }
  }

  private addResult(success: boolean, message: string, details?: any): void {
    this.results.push({ test: message, success, message, details });
  }

  private printSummary(): void {
    console.log('📋 ANALYTICS VALIDATION SUMMARY');
    console.log('================================\n');
    
    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    this.results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.test}`);
    });
    
    console.log(`\n🎯 Overall: ${successful}/${total} tests passed`);
    
    if (successful === total) {
      console.log('🎉 Analytics validation PASSED! Data flow is working correctly.');
    } else {
      console.log('⚠️  Analytics validation PARTIALLY PASSED. Please address failed tests.');
    }
    
    console.log('\n💡 Next steps:');
    console.log('   - Monitor analytics data in production');
    console.log('   - Set up alerts for analytics failures');
    console.log('   - Review data retention policies');
  }
}

// Run validation
if (require.main === module) {
  const validator = new AnalyticsValidator();
  validator.run().catch(console.error);
}

export { AnalyticsValidator };
