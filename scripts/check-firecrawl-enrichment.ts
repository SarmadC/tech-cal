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
    } else {
        console.log(`   Found ${recentEvents?.length || 0} events in last 24 hours`);
        if (recentEvents && recentEvents.length > 0) {
            console.log('\n   Recent events:');
            recentEvents.forEach((event, idx) => {
                console.log(`   ${idx + 1}. ${eventData.title || 'Untitled'}`);
                console.log(`      ID: ${eventData.id}`);
                console.log(`      Status: ${eventData.firecrawl_enrichment_status || 'NULL'}`);
            });
                const eventData = event as unknown as {
                    id: string;
                    title: string | null;
                    created_at: string;
                    firecrawl_enrichment_status: string | null;
                    source_url: string | null;
                };
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
    } else {
        const counts = (statusBreakdown || []).reduce((acc, event) => {
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

            const eventData = event as unknown as { firecrawl_enrichment_status: string | null };
            const status = eventData.firecrawl_enrichment_status as string;
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
    } else {
        console.log(`   Found ${pending?.length || 0} pending enrichments`);
        if (pending && pending.length > 0) {
            console.log('\n   Ready to process:');
            pending.forEach((event, idx) => {
                console.log(`   ${idx + 1}. ${event.title || 'Untitled'} (${event.id})`);
            });
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







