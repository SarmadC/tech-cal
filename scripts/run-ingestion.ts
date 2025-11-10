#!/usr/bin/env tsx
/**
 * Run Ingestion Pipeline
 * 
 * Manually triggers the full ingestion pipeline:
 * 1. Collects events from all active sources (or a specific source)
 * 2. Processes normalization (including retry mechanism)
 */

import { createServiceClient } from '@/utils/supabase/service';
import { IngestionOrchestrator } from '@/services/ingestion/IngestionOrchestrator';
import { NormalizationProcessor } from '@/services/ingestion/NormalizationProcessor';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

async function runIngestion() {
    console.log('🚀 Running ingestion pipeline...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Parse command line arguments
    const sourceId = process.argv[2]; // Optional: specific source ID
    const limit = parseInt(process.argv[3] || '100', 10); // Optional: normalization limit

    try {
        // Step 1: Run ingestion for sources
        console.log('📥 Step 1: Collecting events from sources...');
        let ingestionResults;
        
        if (sourceId) {
            console.log(`   Running for specific source: ${sourceId}`);
            const result = await IngestionOrchestrator.runSourceIngestion(sourceId, supabase);
            ingestionResults = [result];
        } else {
            console.log('   Running for all active sources...');
            ingestionResults = await IngestionOrchestrator.runAllActiveSources(supabase, true);
        }

        console.log('\n📊 Ingestion Results:');
        ingestionResults.forEach((result, idx) => {
            console.log(`   ${idx + 1}. ${result.sourceName}:`);
            console.log(`      ✅ Success: ${result.success}`);
            console.log(`      📥 Events fetched: ${result.eventsFetched}`);
            console.log(`      🗂️  Records queued: ${result.recordsQueued}`);
            console.log(`      ❌ Errors: ${result.errors}`);
            if (result.errorMessage) {
                console.log(`      ⚠️  ${result.errorMessage}`);
            }
        });

        const totalFetched = ingestionResults.reduce((sum, r) => sum + r.eventsFetched, 0);
        const totalQueued = ingestionResults.reduce((sum, r) => sum + r.recordsQueued, 0);
        const totalErrors = ingestionResults.reduce((sum, r) => sum + r.errors, 0);

        console.log(`\n   📊 Total: ${totalFetched} fetched, ${totalQueued} queued, ${totalErrors} errors`);

        // Step 2: Process normalization (including retry mechanism)
        console.log('\n🔄 Step 2: Processing normalization (including retries)...');
        const normalizationResult = await NormalizationProcessor.processPendingEvents(supabase, limit);

        console.log('\n📊 Normalization Results:');
        console.log(`   - Processed: ${normalizationResult.processed}`);
        console.log(`   - Succeeded: ${normalizationResult.succeeded}`);
        console.log(`   - Failed: ${normalizationResult.failed}`);

        if (normalizationResult.errors.length > 0) {
            console.log('\n   ❌ Errors:');
            normalizationResult.errors.slice(0, 5).forEach((err, idx) => {
                console.log(`      ${idx + 1}. ${err.sourceEventId.substring(0, 8)}...: ${err.error.substring(0, 60)}...`);
            });
            if (normalizationResult.errors.length > 5) {
                console.log(`      ... and ${normalizationResult.errors.length - 5} more`);
            }
        }

        console.log('\n✅ Ingestion pipeline complete!\n');
    } catch (error) {
        console.error('\n❌ Error running ingestion pipeline:', error);
        process.exit(1);
    }
}

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: npm run ingest [sourceId] [normalizationLimit]

Arguments:
  sourceId            Optional. Specific source ID to process. If omitted, processes all active sources.
  normalizationLimit Optional. Max events to normalize (default: 100)

Examples:
  npm run ingest                          # Process all active sources, normalize up to 100 events
  npm run ingest <source-id>              # Process specific source, normalize up to 100 events
  npm run ingest <source-id> 200          # Process specific source, normalize up to 200 events
`);
    process.exit(0);
}

runIngestion().catch(console.error);




