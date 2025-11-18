#!/usr/bin/env tsx
/**
 * Reset Failed Firecrawl Enrichments
 * 
 * Resets events that were marked as "completed" but have no fields_updated
 * (likely failed due to client initialization issues) back to pending
 */

import { createServiceClient } from '@/utils/supabase/service';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

async function resetFailedEnrichments() {
    console.log('🔄 Resetting failed Firecrawl enrichments...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Find events that are "completed" but have empty fields_updated
    const { data: completedEvents, error: fetchError } = await supabase
        .from('events')
        .select('id, title, firecrawl_enrichment_status, firecrawl_enrichment_metadata')
        .eq('firecrawl_enrichment_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);

    if (fetchError) {
        console.error(`❌ Error fetching events: ${fetchError.message}`);
        process.exit(1);
    }

    if (!completedEvents || completedEvents.length === 0) {
        console.log('✅ No completed events found');
        return;
    }

    // Filter events with empty fields_updated
    const failedEvents = completedEvents.filter(event => {
        const metadata = (event.firecrawl_enrichment_metadata as any) || {};
        const fieldsUpdated = metadata.fields_updated || [];
        return fieldsUpdated.length === 0;
    });

    console.log(`📊 Found ${completedEvents.length} completed events`);
    console.log(`   ${failedEvents.length} have no fields_updated (likely failed)\n`);

    if (failedEvents.length === 0) {
        console.log('✅ No failed enrichments to reset');
        return;
    }

    // Reset to pending
    const eventIds = failedEvents.map(e => e.id);
    const { error: updateError } = await supabase
        .from('events')
        .update({
            firecrawl_enrichment_status: 'pending',
            firecrawl_enrichment_metadata: {},
        })
        .in('id', eventIds);

    if (updateError) {
        console.error(`❌ Error resetting events: ${updateError.message}`);
        process.exit(1);
    }

    console.log(`✅ Reset ${failedEvents.length} events to pending status\n`);
    console.log('📋 Reset events:');
    failedEvents.slice(0, 10).forEach((event, idx) => {
        console.log(`   ${idx + 1}. ${event.title} (${event.id})`);
    });
    if (failedEvents.length > 10) {
        console.log(`   ... and ${failedEvents.length - 10} more`);
    }
    console.log('\n💡 Next step: Run `npm run firecrawl-worker:once` to process them');
}

resetFailedEnrichments().catch(console.error);



