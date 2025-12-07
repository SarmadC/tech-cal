#!/usr/bin/env tsx
/**
 * Run normalization only.
 * Usage:
 *   npm run normalize           # default limit 200
 *   npm run normalize 500       # custom limit
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createServiceClient } from '@/utils/supabase/service';
import { NormalizationProcessor } from '@/services/ingestion/NormalizationProcessor';

// Load env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

async function run() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const limit = parseInt(process.argv[2] || '200', 10);

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    console.log(`🔄 Running normalization-only (limit=${limit})...`);
    try {
        const result = await NormalizationProcessor.processPendingEvents(supabase, limit);
        console.log('📊 Normalization Results:');
        console.log(`   - Processed: ${result.processed}`);
        console.log(`   - Succeeded: ${result.succeeded}`);
        console.log(`   - Failed: ${result.failed}`);
        if (result.errors.length > 0) {
            console.log('   - Errors (first 5):');
            result.errors.slice(0, 5).forEach((err, idx) =>
                console.log(`     ${idx + 1}. ${err.sourceEventId}: ${err.error}`)
            );
        }
        console.log('✅ Done.');
    } catch (err) {
        console.error('❌ Normalization run failed:', err);
        process.exit(1);
    }
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});

