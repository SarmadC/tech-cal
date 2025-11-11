#!/usr/bin/env tsx
/**
 * Check Retry Metadata
 * 
 * Verifies that retry metadata is being written correctly to source_events
 * and shows the current state of error events.
 */

import { createServiceClient } from '@/utils/supabase/service';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

async function checkRetryMetadata() {
    console.log('🔍 Checking retry metadata in source_events...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Check error events
    const { data: errorEvents, error } = await supabase
        .from('source_events')
        .select('id, fetch_status, error_message, created_at, updated_at')
        .eq('fetch_status', 'error')
        .order('updated_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('❌ Error fetching error events:', error.message);
        process.exit(1);
    }

    if (!errorEvents || errorEvents.length === 0) {
        console.log('✅ No error events found - all events are processing successfully!');
        console.log('\n📊 Summary:');
        console.log('   - Error events: 0');
        console.log('   - Retry metadata: N/A (no errors to retry)');
        return;
    }

    console.log(`📊 Found ${errorEvents.length} error event(s):\n`);

    let withMetadata = 0;
    let withoutMetadata = 0;
    let eligibleForRetry = 0;
    let maxRetriesReached = 0;

    errorEvents.forEach((event, idx) => {
        console.log(`${idx + 1}. Event ID: ${event.id.substring(0, 8)}...`);
        console.log(`   Status: ${event.fetch_status}`);
        console.log(`   Created: ${event.created_at}`);
        console.log(`   Updated: ${event.updated_at}`);

        // Try to parse retry metadata
        let metadata: { retry_count?: number; next_retry_at?: string; error?: string } | null = null;
        try {
            if (event.error_message) {
                const parsed = JSON.parse(event.error_message);
                if (parsed && typeof parsed === 'object' && 'retry_count' in parsed) {
                    metadata = parsed;
                    withMetadata++;
                } else {
                    withoutMetadata++;
                }
            } else {
                withoutMetadata++;
            }
        } catch {
            withoutMetadata++;
        }

        if (metadata) {
            console.log(`   ✅ Retry metadata found:`);
            console.log(`      - Retry count: ${metadata.retry_count}/5`);
            console.log(`      - Next retry: ${metadata.next_retry_at || 'N/A'}`);
            
            if (metadata.retry_count !== undefined && metadata.retry_count >= 5) {
                maxRetriesReached++;
                console.log(`      - Status: ⛔ Max retries reached`);
            } else if (metadata.next_retry_at) {
                const nextRetry = new Date(metadata.next_retry_at);
                const now = new Date();
                if (now >= nextRetry) {
                    eligibleForRetry++;
                    console.log(`      - Status: ✅ Eligible for retry (next_retry_at: ${metadata.next_retry_at})`);
                } else {
                    console.log(`      - Status: ⏳ Waiting (next_retry_at: ${metadata.next_retry_at})`);
                }
            }
        } else {
            console.log(`   ⚠️  No retry metadata (first failure - will be retried on next run)`);
        }

        if (event.error_message && !metadata) {
            console.log(`   Error message: ${event.error_message.substring(0, 100)}...`);
        }

        console.log('');
    });

    console.log('\n📊 Summary:');
    console.log(`   - Total error events: ${errorEvents.length}`);
    console.log(`   - With retry metadata: ${withMetadata}`);
    console.log(`   - Without metadata (first failure): ${withoutMetadata}`);
    console.log(`   - Eligible for retry now: ${eligibleForRetry}`);
    console.log(`   - Max retries reached: ${maxRetriesReached}`);
    console.log('\n✅ Retry metadata check complete!\n');

    // Check for Firecrawl-specific retry metadata
    console.log('🔍 Firecrawl Enrichment Retry Check:');
    const { data: firecrawlErrors, error: firecrawlError } = await supabase
        .from('events')
        .select('id, title, firecrawl_enrichment_status, firecrawl_enrichment_metadata')
        .eq('firecrawl_enrichment_status', 'failed')
        .order('created_at', { ascending: false })
        .limit(10);

    if (firecrawlError) {
        console.error(`   ❌ Error: ${firecrawlError.message}`);
    } else if (firecrawlErrors && Array.isArray(firecrawlErrors)) {
        if (firecrawlErrors.length > 0) {
            console.log(`   Found ${firecrawlErrors.length} failed Firecrawl enrichments`);
            firecrawlErrors.forEach((event, idx) => {
                const eventData = event as unknown as {
                    id: string;
                    title: string | null;
                    firecrawl_enrichment_status: string | null;
                    firecrawl_enrichment_metadata: unknown;
                };
                const metadata = eventData.firecrawl_enrichment_metadata as {
                    retry_count?: number;
                    next_retry_at?: string;
                    error_message?: string;
                    job_id?: string;
                } | null;
                console.log(`   ${idx + 1}. ${eventData.title || 'Untitled'} (${eventData.id})`);
                if (metadata) {
                    console.log(`      Retry count: ${metadata.retry_count || 0}/${5}`);
                    if (metadata.next_retry_at) {
                        const nextRetry = new Date(metadata.next_retry_at);
                        const now = new Date();
                        if (now >= nextRetry) {
                            console.log(`      Status: ✅ Eligible for retry`);
                        } else {
                            console.log(`      Status: ⏳ Waiting until ${metadata.next_retry_at}`);
                        }
                    }
                    if (metadata.job_id) {
                        console.log(`      Job ID: ${metadata.job_id} (check if polling completed)`);
                    }
                }
            });
        } else {
            console.log('   ✅ No failed Firecrawl enrichments found');
        }
    }
    console.log('');

    console.log('💡 Verification Notes:');
    console.log('   - Check worker logs for "scrapeOptions.formats" to verify JSON extraction format');
    console.log('   - Check logs for "enableWebSearch" and "useAgent" flags based on site complexity');
    console.log('   - Events with job_id in metadata should have completed polling');
    console.log('   - Processing status events should be polled until completion or failure\n');
}

checkRetryMetadata().catch(console.error);



