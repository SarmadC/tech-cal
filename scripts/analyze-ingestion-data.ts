#!/usr/bin/env tsx
/**
 * Ingestion Data Analysis Script
 *
 * CLI tool for comprehensive ingestion pipeline analysis.
 *
 * Usage: npm run analyze-ingestion [days]
 */

import { createServiceClient } from '@/utils/supabase/service';
import { IngestionMetricsService } from '@/services/ingestion/IngestionMetricsService';
import 'dotenv/config';

// Format table utility (same as analyze-recommendation-data.ts)
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

function printIngestionMetrics(metrics: Awaited<ReturnType<typeof IngestionMetricsService.getMetrics>>): void {
    if (!metrics) {
        console.log('❌ No ingestion metrics available');
        return;
    }

    console.log(`\n📊 INGESTION METRICS (${new Date(metrics.dateRange.from).toLocaleDateString()} to ${new Date(metrics.dateRange.to).toLocaleDateString()})\n`);

    // Overall stats
    console.log(`📈 OVERVIEW`);
    console.log(`Total Jobs: ${metrics.overall.totalJobs}`);
    console.log(`Success Rate: ${metrics.overall.successRate.toFixed(1)}%`);
    console.log(`Events Fetched: ${metrics.overall.totalEventsFetched}`);
    console.log(`Records Queued: ${metrics.overall.totalRecordsQueued}`);
    console.log(`Events Published: ${metrics.overall.totalEventsPublished}`);
    console.log(`Avg Quality Score: ${metrics.overall.averageQualityScore.toFixed(1)}%\n`);

    // Quality distribution
    console.log(`📋 QUALITY DISTRIBUTION\n`);
    console.log(`High (>=75%): ${metrics.qualityDistribution.high}`);
    console.log(`Medium (50-74%): ${metrics.qualityDistribution.medium}`);
    console.log(`Low (<50%): ${metrics.qualityDistribution.low}\n`);

    // Source metrics
    if (metrics.sourceMetrics.length > 0) {
        console.log(`📡 SOURCE METRICS\n`);
        formatTable(
            ['Source', 'Jobs', 'Success Rate', 'Fetched', 'Queued', 'Avg Quality'],
            metrics.sourceMetrics.map(source => [
                source.sourceName.substring(0, 30),
                source.jobsCount.toString(),
                `${source.successRate.toFixed(1)}%`,
                source.eventsFetched.toString(),
                source.recordsQueued.toString(),
                `${source.averageQualityScore.toFixed(1)}%`,
            ])
        );
    }

    // Moderation queue
    console.log(`\n👮 MODERATION QUEUE\n`);
    console.log(`Pending: ${metrics.moderationQueue.pending}`);
    console.log(`Approved: ${metrics.moderationQueue.approved}`);
    console.log(`Rejected: ${metrics.moderationQueue.rejected}`);
}

async function runIngestionAnalysis(): Promise<void> {
    try {
        const days = process.argv[2] ? parseInt(process.argv[2], 10) : 7;

        console.log(`🔍 Analyzing ingestion data for last ${days} days...\n`);

        // Use service client for CLI (doesn't require Next.js request context)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('❌ Missing Supabase credentials:');
            console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
            console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
            process.exit(1);
        }

        const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);
        const metrics = await IngestionMetricsService.getMetrics(supabase, days);

        if (!metrics) {
            console.log('❌ No ingestion metrics found for the specified period.');
            return;
        }

        printIngestionMetrics(metrics);

        // Check for alerts
        const alerts = await IngestionMetricsService.checkAlerts(supabase, metrics);
        if (alerts.length > 0) {
            console.log(`\n⚠️  ALERTS\n`);
            alerts.forEach(alert => {
                const icon = alert.severity === 'error' ? '🔴' : '🟡';
                console.log(`${icon} ${alert.message}`);
            });
        }

        console.log(`\n✨ Ingestion analysis complete!`);
    } catch (error) {
        console.error('❌ Error analyzing ingestion data:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runIngestionAnalysis().catch(console.error);
}

export { runIngestionAnalysis };

