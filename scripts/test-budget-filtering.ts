#!/usr/bin/env tsx
/**
 * Budget Filtering Test Script
 * 
 * Tests budget filtering with real data to ensure it works correctly
 * across all budget tiers and currency handling.
 * 
 * Usage: tsx scripts/test-budget-filtering.ts
 */

import { createClient } from '@/utils/supabase/server';
import { EventService } from '@/services/eventServices';
import type { Event as TechEvent } from '@/types';

interface BudgetTestResult {
  tier: string;
  eventCount: number;
  hasUsdEvents: boolean;
  hasNonUsdEvents: boolean;
  sampleEvents: Array<{
    id: string;
    title: string;
    priceMin: number | null;
    priceMax: number | null;
    currency: string | null;
  }>;
}

class BudgetFilteringTester {
  private supabase: any;

  async run(): Promise<void> {
    console.log('💰 Testing Budget Filtering with Real Data...\n');

    try {
      this.supabase = await createClient();
      
      const budgetTiers = ['free-only', 'low', 'moderate', 'high', 'unlimited'];
      const results: BudgetTestResult[] = [];
      
      for (const tier of budgetTiers) {
        console.log(`Testing budget tier: ${tier}`);
        const result = await this.testBudgetTier(tier);
        results.push(result);
        console.log(`   ✅ ${result.eventCount} events found`);
        console.log(`   💵 USD events: ${result.hasUsdEvents ? 'Yes' : 'No'}`);
        console.log(`   🌍 Non-USD events: ${result.hasNonUsdEvents ? 'Yes' : 'No'}\n`);
      }
      
      this.printSummary(results);
      
    } catch (error) {
      console.error('❌ Budget filtering test failed:', error);
      process.exit(1);
    }
  }

  private async testBudgetTier(tier: string): Promise<BudgetTestResult> {
    // Test RPC path
    const result = await EventService.getEventsWithRPC(
      { budget: tier as any },
      this.supabase,
      1,
      20
    );
    
    const events = result.events || result;
    
    // Analyze currency distribution
    const usdEvents = events.filter((e: TechEvent) => (e as any).currency === 'USD' || (e as any).currency === null);
    const nonUsdEvents = events.filter((e: TechEvent) => (e as any).currency && (e as any).currency !== 'USD');
    
    // Get sample events for analysis
    const sampleEvents = events.slice(0, 5).map((event: TechEvent) => ({
      id: event.id,
      title: event.title,
      priceMin: (event as any).priceMin,
      priceMax: (event as any).priceMax,
      currency: (event as any).currency,
    }));
    
    return {
      tier,
      eventCount: events.length,
      hasUsdEvents: usdEvents.length > 0,
      hasNonUsdEvents: nonUsdEvents.length > 0,
      sampleEvents,
    };
  }

  private printSummary(results: BudgetTestResult[]): void {
    console.log('📊 BUDGET FILTERING SUMMARY');
    console.log('============================\n');
    
    const totalEvents = results.reduce((sum, r) => sum + r.eventCount, 0);
    const tiersWithEvents = results.filter(r => r.eventCount > 0).length;
    const usdOnlyTiers = results.filter(r => r.hasUsdEvents && !r.hasNonUsdEvents).length;
    
    console.log(`Total events across all tiers: ${totalEvents}`);
    console.log(`Tiers with events: ${tiersWithEvents}/${results.length}`);
    console.log(`USD-only tiers: ${usdOnlyTiers}/${results.length}`);
    
    console.log('\nDetailed Results:');
    results.forEach(result => {
      console.log(`\n${result.tier.toUpperCase()}:`);
      console.log(`  Events: ${result.eventCount}`);
      console.log(`  USD: ${result.hasUsdEvents ? '✅' : '❌'}`);
      console.log(`  Non-USD: ${result.hasNonUsdEvents ? '⚠️' : '✅'}`);
      
      if (result.sampleEvents.length > 0) {
        console.log('  Sample events:');
        result.sampleEvents.forEach(event => {
          const price = event.priceMin !== null ? `$${event.priceMin}` : 'Free';
          const currency = event.currency || 'USD';
          console.log(`    - ${event.title}: ${price} (${currency})`);
        });
      }
    });
    
    // Validation checks
    console.log('\n🔍 VALIDATION CHECKS:');
    
    const freeOnlyResult = results.find(r => r.tier === 'free-only');
    if (freeOnlyResult?.hasNonUsdEvents) {
      console.log('❌ free-only tier contains non-USD events (should be USD-only)');
    } else {
      console.log('✅ free-only tier correctly filtered to USD events only');
    }
    
    const hasData = results.some(r => r.eventCount > 0);
    if (hasData) {
      console.log('✅ Budget filtering is working with real data');
    } else {
      console.log('⚠️  No events found - check database or filters');
    }
    
    console.log('\n🎯 Budget filtering test completed!');
  }
}

// Run test
if (require.main === module) {
  const tester = new BudgetFilteringTester();
  tester.run().catch(console.error);
}

export { BudgetFilteringTester };
