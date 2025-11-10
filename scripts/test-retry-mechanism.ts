#!/usr/bin/env tsx
/**
 * Test Retry Mechanism
 * 
 * Tests the retry mechanism by running normalization processing,
 * which automatically checks for error events eligible for retry.
 */

import { createServiceClient } from '@/utils/supabase/service';
import { NormalizationProcessor } from '@/services/ingestion/NormalizationProcessor';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

async function testRetryMechanism() {
    console.log('🔄 Testing retry mechanism...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Check current error events
    const { data: errorEvents } = await supabase
        .from('source_events')
        .select('id, fetch_status, error_message, created_at')
        .eq('fetch_status', 'error')
        .limit(10);

    console.log(`📊 Found ${errorEvents?.length || 0} error event(s)`);
    
    if (errorEvents && errorEvents.length > 0) {
        console.log('\n📋 Error events:');
        errorEvents.forEach((event, idx) => {
            const errorMsg = event.error_message || 'No error message';
            // Try to parse retry metadata
            try {
                const metadata = JSON.parse(errorMsg);
                if (metadata.retry_count !== undefined) {
                    console.log(`   ${idx + 1}. ID: ${event.id.substring(0, 8)}...`);
                    console.log(`      Retry count: ${metadata.retry_count}/5`);
                    console.log(`      Next retry: ${metadata.next_retry_at || 'N/A'}`);
                    console.log(`      Error: ${metadata.error?.substring(0, 50) || 'N/A'}...`);
                } else {
                    console.log(`   ${idx + 1}. ID: ${event.id.substring(0, 8)}... (first failure, eligible for retry)`);
                }
            } catch {
                console.log(`   ${idx + 1}. ID: ${event.id.substring(0, 8)}... (first failure, eligible for retry)`);
            }
        });
    }

    // Run normalization processing (this will automatically retry eligible events)
    console.log('\n🔄 Running normalization processing...');
    const result = await NormalizationProcessor.processPendingEvents(supabase, 100);

    console.log('\n✅ Processing complete:');
    console.log(`   - Processed: ${result.processed}`);
    console.log(`   - Succeeded: ${result.succeeded}`);
    console.log(`   - Failed: ${result.failed}`);
    
    if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.slice(0, 5).forEach((err, idx) => {
            console.log(`   ${idx + 1}. ${err.sourceEventId.substring(0, 8)}...: ${err.error.substring(0, 60)}...`);
        });
        if (result.errors.length > 5) {
            console.log(`   ... and ${result.errors.length - 5} more`);
        }
    }

    // Check error events again to see if any were retried
    const { data: errorEventsAfter } = await supabase
        .from('source_events')
        .select('id, fetch_status')
        .eq('fetch_status', 'error')
        .limit(10);

    const retriedCount = (errorEvents?.length || 0) - (errorEventsAfter?.length || 0);
    if (retriedCount > 0) {
        console.log(`\n🔄 Retried ${retriedCount} event(s) (reset to pending, will be processed)`);
    }

    console.log('\n✅ Test complete!\n');
}

testRetryMechanism().catch(console.error);






