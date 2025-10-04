#!/usr/bin/env tsx
/**
 * Recommendation Data Analysis Script
 *
 * Simple CLI tool that uses RecommendationMonitoringService
 * for comprehensive recommendation system analysis.
 *
 * Usage: npm run analyze-recommendations [days]
 */

import { createClient } from '@/utils/supabase/server';
import { RecommendationMonitoringService, type MonitoringSummary } from '@/services/recommendationMonitoringService';
import { MONITORING_CONFIG } from '@/config/monitoringConstants';
import 'dotenv/config';

// =============================================
// CLI FORMATTING UTILITIES
// =============================================

function formatTable(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((header, i) =>
    Math.max(header.length, ...rows.map(row => (row[i] || '').length))
  );

  // Print header
  console.log(headers.map((h, i) => h.padEnd(colWidths[i])).join(' | '));
  console.log(colWidths.map(w => '-'.repeat(w)).join('-|-'));

  // Print rows
  rows.forEach(row => {
    console.log(row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join(' | '));
  });
}

function printSummary(summary: MonitoringSummary): void {
  console.log(`🔍 Recommendation Analysis (${summary.dateRange.from} to ${summary.dateRange.to})\n`);

  // Overview
  console.log(`📊 OVERVIEW`);
  console.log(`Total Events: ${summary.totalEvents}`);
  console.log(`Total Interactions: ${summary.totalInteractions}`);
  console.log(`Overall CTR: ${summary.overallCTR.toFixed(3)}\n`);

  // Score ranges
  console.log(`📋 SCORE RANGE ANALYSIS\n`);
  formatTable(
    ['Range', 'Events', 'Clicks', 'Saves', 'CTR', 'Save Rate', 'Avg Score'],
    summary.scoreRanges.map(range => [
      range.range,
      range.totalEvents.toString(),
      range.totalClicks.toString(),
      range.totalSaves.toString(),
      range.clickThroughRate.toFixed(3),
      range.saveRate.toFixed(3),
      range.avgScore.toFixed(1)
    ])
  );

  // Top triggers
  console.log(`\n🎯 TOP TRIGGERS\n`);
  if (summary.topTriggers.length === 0) {
    console.log('No triggers found');
  } else {
    formatTable(
      ['Trigger', 'Events', 'Clicks', 'CTR', 'Avg Score'],
      summary.topTriggers.slice(0, 8).map(trigger => [
        trigger.trigger,
        trigger.eventCount.toString(),
        trigger.totalClicks.toString(),
        trigger.clickThroughRate.toFixed(3),
        trigger.avgScore.toFixed(1)
      ])
    );
  }

  // Outliers
  console.log(`\n⚠️  OUTLIERS\n`);
  const highPerformers = summary.outliers.filter(o => o.isOutlier === 'high_performance').slice(0, 5);
  const lowPerformers = summary.outliers.filter(o => o.isOutlier === 'low_performance').slice(0, 5);

  if (highPerformers.length > 0) {
    console.log('HIGH PERFORMERS (High engagement, low score):');
    highPerformers.forEach(event => {
      console.log(`  Event ${event.eventId}: Score ${event.score}, ${event.clicks} clicks`);
      console.log(`    Triggers: ${event.triggers.join(', ') || 'none'}`);
    });
  }

  if (lowPerformers.length > 0) {
    console.log(highPerformers.length > 0 ? '\nLOW PERFORMERS (High score, no engagement):' : 'LOW PERFORMERS (High score, no engagement):');
    lowPerformers.forEach(event => {
      console.log(`  Event ${event.eventId}: Score ${event.score}, ${event.clicks} clicks`);
      console.log(`    Triggers: ${event.triggers.join(', ') || 'none'}`);
    });
  }

  if (highPerformers.length === 0 && lowPerformers.length === 0) {
    console.log('No significant outliers found');
  }

  // Behavioral boost analysis (Phase 3)
  if (summary.behavioralBoostStats) {
    console.log(`\n🎯 BEHAVIORAL BOOST ANALYSIS (Phase 3)\n`);
    const stats = summary.behavioralBoostStats;
    console.log(`Total Boosts Applied: ${stats.totalBoosts}`);
    console.log(`Average Boost Amount: ${stats.avgBoostAmount.toFixed(1)} points`);
    console.log(`CTR Delta vs Control: ${stats.ctrDelta > 0 ? '+' : ''}${stats.ctrDelta.toFixed(1)}%`);

    console.log(`\nA/B Group CTR:`);
    Object.entries(stats.abGroupCTR).forEach(([group, ctr]) => {
      console.log(`  ${group}: ${ctr.toFixed(3)}`);
    });
  }

  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS\n`);
  summary.recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });

  console.log(`\n✨ Analysis complete!`);
}

// =============================================
// MAIN ANALYSIS FUNCTION
// =============================================

async function runAnalysis(): Promise<void> {
  try {
    // Parse command line arguments
    const days = process.argv[2] ? parseInt(process.argv[2], 10) : MONITORING_CONFIG.DEFAULT_DAYS;

    // Validate days
    if (days < MONITORING_CONFIG.MIN_DAYS || days > MONITORING_CONFIG.MAX_DAYS) {
      console.error(`❌ Days must be between ${MONITORING_CONFIG.MIN_DAYS} and ${MONITORING_CONFIG.MAX_DAYS}`);
      process.exit(1);
    }

    console.log(`🔍 Analyzing recommendation data for last ${days} days...\n`);

    // Create Supabase client
    const supabase = await createClient();

    // Get monitoring summary
    const summary = await RecommendationMonitoringService.getMonitoringSummary(supabase, days);

    if (!summary) {
      console.log('❌ No analytics data found for the specified period.');
      console.log('Make sure events are being tracked and scoringTriggers are being logged.');
      return;
    }

    // Print formatted results
    printSummary(summary);

  } catch (error) {
    console.error('❌ Error analyzing data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAnalysis().catch(console.error);
}

export { runAnalysis };