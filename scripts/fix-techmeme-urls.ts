#!/usr/bin/env tsx
/**
 * Fix Techmeme URLs in Database
 * 
 * Resolves Techmeme redirect URLs in source_events and events tables,
 * replacing them with canonical URLs.
 */

import { resolveTechMemeRedirect } from '@/services/ingestion/utils/urlResolver';
import { createServiceClient } from '@/utils/supabase/service';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

/**
 * Resolve Techmeme redirect URL to canonical URL
 */
function resolveTechmemeUrl(techmemeUrl: string): string | null {
    if (!techmemeUrl || !techmemeUrl.includes('techmeme.com/r2/')) {
        return null;
    }

    const candidates = resolveTechMemeRedirect(techmemeUrl);
    return candidates[0] ?? null;
}

async function fixTechmemeUrls() {
    console.log('🔧 Fixing Techmeme redirect URLs in database...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Find source_events with Techmeme redirect URLs
    const { data: sourceEvents, error: sourceError } = await supabase
        .from('source_events')
        .select('id, raw_payload')
        .ilike('raw_payload->>sourceUrl', '%techmeme.com/r2/%')
        .limit(1000);

    if (sourceError) {
        console.error('❌ Error fetching source_events:', sourceError.message);
        process.exit(1);
    }

    console.log(`📊 Found ${sourceEvents?.length || 0} source_events with Techmeme URLs\n`);

    let fixedCount = 0;
    let failedCount = 0;

    if (sourceEvents && sourceEvents.length > 0) {
        for (const sourceEvent of sourceEvents) {
            try {
                const rawPayload = sourceEvent.raw_payload as { record?: { sourceUrl?: string } };
                const currentUrl = rawPayload?.record?.sourceUrl;

                if (!currentUrl || !currentUrl.includes('techmeme.com/r2/')) {
                    continue;
                }

                const resolvedUrl = resolveTechmemeUrl(currentUrl);
                if (!resolvedUrl) {
                    console.warn(`⚠️  Could not resolve: ${currentUrl}`);
                    failedCount++;
                    continue;
                }

                // Update raw_payload with resolved URL
                const updatedPayload = {
                    ...rawPayload,
                    record: {
                        ...rawPayload.record,
                        sourceUrl: resolvedUrl,
                    },
                };

                const { error: updateError } = await supabase
                    .from('source_events')
                    .update({ raw_payload: updatedPayload })
                    .eq('id', sourceEvent.id);

                if (updateError) {
                    console.error(`❌ Error updating source_event ${sourceEvent.id}:`, updateError.message);
                    failedCount++;
                } else {
                    console.log(`✅ Fixed: ${currentUrl.substring(0, 60)}... -> ${resolvedUrl}`);
                    fixedCount++;
                }
            } catch (error) {
                console.error(`❌ Error processing source_event ${sourceEvent.id}:`, error);
                failedCount++;
            }
        }
    }

    // Also fix events table (source_url field)
    console.log('\n📊 Fixing events table...');
    
    let eventsFixedCount = 0;
    let eventsFailedCount = 0;
    
    // Get events with Techmeme URLs in source_url field
    const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, source_url')
        .ilike('source_url', '%techmeme.com/r2/%')
        .limit(1000);

    if (eventsError) {
        console.warn('⚠️  Could not fetch events table:', eventsError.message);
    } else {
        console.log(`   Found ${events?.length || 0} events with Techmeme URLs\n`);

        if (events && events.length > 0) {
            for (const event of events) {
                try {
                    const currentUrl = event.source_url;
                    if (!currentUrl || !currentUrl.includes('techmeme.com/r2/')) {
                        continue;
                    }

                    const resolvedUrl = resolveTechmemeUrl(currentUrl);
                    if (!resolvedUrl) {
                        console.warn(`⚠️  Could not resolve event URL: ${currentUrl}`);
                        eventsFailedCount++;
                        continue;
                    }

                    const { error: updateError } = await supabase
                        .from('events')
                        .update({ source_url: resolvedUrl })
                        .eq('id', event.id);

                    if (updateError) {
                        console.error(`❌ Error updating event ${event.id}:`, updateError.message);
                        eventsFailedCount++;
                    } else {
                        console.log(`✅ Fixed event: ${currentUrl.substring(0, 60)}... -> ${resolvedUrl}`);
                        eventsFixedCount++;
                    }
                } catch (error) {
                    console.error(`❌ Error processing event ${event.id}:`, error);
                    eventsFailedCount++;
                }
            }

            console.log(`\n   Events fixed: ${eventsFixedCount}`);
            console.log(`   Events failed: ${eventsFailedCount}`);
        }
    }

    console.log('\n📊 Summary:');
    console.log(`   - Source events processed: ${sourceEvents?.length || 0}`);
    console.log(`   - Source events fixed: ${fixedCount}`);
    console.log(`   - Source events failed: ${failedCount}`);
    console.log(`   - Events table fixed: ${eventsFixedCount || 0}`);
    console.log(`   - Events table failed: ${eventsFailedCount || 0}`);
    console.log('\n✅ URL cleanup complete!');
    console.log('   New events from Techmeme will automatically use canonical URLs.\n');
}

fixTechmemeUrls().catch(console.error);

