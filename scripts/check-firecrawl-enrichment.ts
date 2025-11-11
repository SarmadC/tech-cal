#!/usr/bin/env tsx
/**
 * Check Firecrawl Enrichment Status
 * 
 * Diagnostic script to check if events are being enqueued for enrichment
 */

import { createServiceClient } from '@/utils/supabase/service';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

async function checkFirecrawlEnrichment() {
    console.log('🔍 Checking Firecrawl Enrichment Status...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Check environment config
    console.log('📋 Configuration:');
    console.log(`   FIRECRAWL_API_KEY: ${process.env.FIRECRAWL_API_KEY ? 'SET (' + process.env.FIRECRAWL_API_KEY.substring(0, 10) + '...)' : 'NOT SET'}`);
    console.log(`   FIRECRAWL_ENABLED: ${process.env.FIRECRAWL_ENABLED || 'not set (defaults to true)'}`);
    console.log(`   FIRECRAWL_CONCURRENCY: ${process.env.FIRECRAWL_CONCURRENCY || '2 (default)'}`);
    console.log(`   FIRECRAWL_ENABLE_WEB_SEARCH: ${process.env.FIRECRAWL_ENABLE_WEB_SEARCH || 'false (default)'}`);
    console.log(`   FIRECRAWL_USE_AGENT: ${process.env.FIRECRAWL_USE_AGENT || 'false (default)'}`);
    console.log(`   FIRECRAWL_AGENT_MODEL: ${process.env.FIRECRAWL_AGENT_MODEL || 'not set (uses FIRE-1 if agent enabled)'}`);
    console.log(`   FIRECRAWL_USE_WILDCARDS: ${process.env.FIRECRAWL_USE_WILDCARDS || 'false (default)'}`);
    console.log('');

    // Check database columns exist
    console.log('🗄️  Database Schema:');
    const { data: columns, error: columnsError } = await supabase
        .from('events')
        .select('firecrawl_enrichment_status, firecrawl_enrichment_metadata')
        .limit(1);

    if (columnsError && columnsError.code === '42703') {
        console.error('   ❌ Columns do not exist! Run migration first:');
        console.error('   supabase migration up');
        process.exit(1);
    } else if (columnsError) {
        console.error(`   ❌ Error checking columns: ${columnsError.message}`);
        process.exit(1);
    } else {
        console.log('   ✅ Columns exist');
    }
    console.log('');

    // Check recent events
    console.log('📊 Recent Events (last 24 hours):');
    const { data: recentEvents, error: recentError } = await supabase
        .from('events')
        .select('id, title, created_at, firecrawl_enrichment_status, source_url')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

    if (recentError) {
        console.error(`   ❌ Error fetching events: ${recentError.message}`);
    } else if (recentEvents && Array.isArray(recentEvents)) {
        console.log(`   Found ${recentEvents.length} events in last 24 hours`);
        if (recentEvents.length > 0) {
            console.log('\n   Recent events:');
            recentEvents.forEach((event, idx) => {
                const eventData = event as unknown as {
                    id: string;
                    title: string | null;
                    created_at: string;
                    firecrawl_enrichment_status: string | null;
                    source_url: string | null;
                };
                console.log(`   ${idx + 1}. ${eventData.title || 'Untitled'}`);
                console.log(`      ID: ${eventData.id}`);
                console.log(`      Status: ${eventData.firecrawl_enrichment_status || 'NULL'}`);
                console.log(`      Source URL: ${(eventData.source_url || '').substring(0, 50) || 'N/A'}...`);
            });
        }
    }
    console.log('');

    // Check enrichment status breakdown
    console.log('📈 Enrichment Status Breakdown:');
    const { data: statusBreakdown, error: statusError } = await supabase
        .from('events')
        .select('firecrawl_enrichment_status')
        .not('firecrawl_enrichment_status', 'is', null);

    if (statusError) {
        console.error(`   ❌ Error: ${statusError.message}`);
    } else if (statusBreakdown && Array.isArray(statusBreakdown)) {
        const counts = (statusBreakdown || []).reduce((acc, event) => {
            const eventData = event as unknown as { firecrawl_enrichment_status: string | null };
            const status = eventData.firecrawl_enrichment_status as string;
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        if (Object.keys(counts).length === 0) {
            console.log('   ⚠️  No events with enrichment status (all are NULL)');
            console.log('   This means enrichment has not been enqueued yet.');
        } else {
            Object.entries(counts).forEach(([status, count]) => {
                console.log(`   ${status}: ${count}`);
            });
        }
    }
    console.log('');

    // Check pending enrichments
    console.log('⏳ Pending Enrichments:');
    const { data: pending, error: pendingError } = await supabase
        .from('events')
        .select('id, title, created_at, source_url')
        .eq('firecrawl_enrichment_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

    if (pendingError) {
        console.error(`   ❌ Error: ${pendingError.message}`);
    } else if (pending && Array.isArray(pending)) {
        console.log(`   Found ${pending.length} pending enrichments`);
        if (pending.length > 0) {
            console.log('\n   Ready to process:');
            pending.forEach((event, idx) => {
                const eventData = event as unknown as { id: string; title: string | null; created_at: string; source_url: string | null };
                console.log(`   ${idx + 1}. ${eventData.title || 'Untitled'} (${eventData.id})`);
            });
        }
    }
    console.log('');

    // Check for processing status (should be polled)
    console.log('🔄 Processing Status Check:');
    const { data: processing, error: processingError } = await supabase
        .from('events')
        .select('id, title, firecrawl_enrichment_metadata')
        .eq('firecrawl_enrichment_status', 'in_progress')
        .limit(5);

    if (processingError) {
        console.error(`   ❌ Error: ${processingError.message}`);
    } else if (processing && Array.isArray(processing)) {
        if (processing.length > 0) {
            console.log(`   ⚠️  Found ${processing.length} events stuck in 'in_progress' status`);
            console.log('   These should be polled by the worker. Check worker logs.');
            processing.forEach((event, idx) => {
                const eventData = event as unknown as {
                    id: string;
                    title: string | null;
                    firecrawl_enrichment_metadata: unknown;
                };
                const metadata = eventData.firecrawl_enrichment_metadata as { retry_count?: number; error_message?: string } | null;
                console.log(`   ${idx + 1}. ${eventData.title || 'Untitled'} (${eventData.id})`);
                if (metadata?.retry_count) {
                    console.log(`      Retry count: ${metadata.retry_count}`);
                }
            });
        } else {
            console.log('   ✅ No events stuck in processing status');
        }
    }
    console.log('');

    // Check completed enrichments for job metadata
    console.log('✅ Completed Enrichments (sample):');
    const { data: completed, error: completedError } = await supabase
        .from('events')
        .select('id, title, firecrawl_enrichment_metadata')
        .eq('firecrawl_enrichment_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

    if (completedError) {
        console.error(`   ❌ Error: ${completedError.message}`);
    } else if (completed && Array.isArray(completed)) {
        if (completed.length > 0) {
            console.log(`   Found ${completed.length} recently completed enrichments`);
            completed.forEach((event, idx) => {
                const eventData = event as unknown as {
                    id: string;
                    title: string | null;
                    firecrawl_enrichment_metadata: unknown;
                };
                const metadata = eventData.firecrawl_enrichment_metadata as {
                    enrichment_strategy?: string;
                    site_complexity?: string;
                    pages_crawled?: number;
                    credits_used?: number;
                    extraction_quality_score?: number;
                } | null;
                console.log(`   ${idx + 1}. ${eventData.title || 'Untitled'}`);
                if (metadata) {
                    console.log(`      Strategy: ${metadata.enrichment_strategy || 'N/A'}`);
                    console.log(`      Complexity: ${metadata.site_complexity || 'N/A'}`);
                    console.log(`      Pages: ${metadata.pages_crawled || 'N/A'}`);
                    console.log(`      Credits: ${metadata.credits_used || 'N/A'}`);
                    console.log(`      Quality: ${metadata.extraction_quality_score ? (metadata.extraction_quality_score * 100).toFixed(1) + '%' : 'N/A'}`);
                }
            });
        } else {
            console.log('   No completed enrichments found');
        }
    }
    console.log('');

    console.log('✅ Check complete!\n');
    console.log('💡 Next steps:');
    console.log('   1. If no recent events exist, run: npm run ingest');
    console.log('   2. If events exist but status is NULL, check ingestion logs for errors');
    console.log('   3. If pending enrichments exist, run: npm run firecrawl-worker:once');
}

checkFirecrawlEnrichment().catch(console.error);



