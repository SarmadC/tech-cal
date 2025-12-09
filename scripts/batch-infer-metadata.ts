/**
 * Batch Infer Metadata Script
 * 
 * Uses LLM to generate descriptions and infer tags for events
 * that are missing this data. Does NOT require web scraping.
 * 
 * Usage: 
 *   npx tsx scripts/batch-infer-metadata.ts
 *   npx tsx scripts/batch-infer-metadata.ts --limit=50
 *   npx tsx scripts/batch-infer-metadata.ts --dry-run
 * 
 * Environment Variables:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - GOOGLE_GENERATIVE_AI_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { LLMEnrichmentService } from '../src/services/ingestion/LLMEnrichmentService';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string): string => {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    return arg ? arg.split('=')[1] : defaultValue;
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const LIMIT = parseInt(getArg('limit', '20'), 10);
const DRY_RUN = hasFlag('dry-run');
const BATCH_SIZE = parseInt(getArg('batch-size', '5'), 10);
const BATCH_DELAY_MS = parseInt(getArg('delay', '2000'), 10);

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL');
    console.error('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

if (!geminiApiKey) {
    console.error('Missing GOOGLE_GENERATIVE_AI_API_KEY for LLM inference');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EventForInference {
    id: string;
    title: string;
    description: string | null;
    event_type: { name: string } | null;
    organizer: { name: string } | null;
}

async function fetchEventsNeedingInference(limit: number): Promise<EventForInference[]> {
    // Get events that are missing description
    const { data: events, error } = await supabase
        .from('events')
        .select(`
            id,
            title,
            description,
            event_type:event_type_id (name),
            organizer:organizer_id (name)
        `)
        .eq('status', 'confirmed')
        .or('description.is.null,description.eq.')
        .not('title', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching events:', error);
        return [];
    }

    // Also check for events without tags
    const eventIds = (events || []).map(e => e.id);
    if (eventIds.length === 0) return events as unknown as EventForInference[];

    const { data: tagRelations } = await supabase
        .from('event_tag_relations')
        .select('event_id')
        .in('event_id', eventIds);

    const eventsWithTags = new Set((tagRelations || []).map(r => r.event_id));

    // Return events missing description OR tags
    return ((events || []) as unknown as EventForInference[]).filter(event => {
        const hasDescription = event.description && event.description.trim().length > 0;
        const hasTags = eventsWithTags.has(event.id);
        return !hasDescription || !hasTags;
    });
}

async function main() {
    console.log('=== Batch Infer Metadata ===\n');
    console.log(`Configuration:`);
    console.log(`  - Limit: ${LIMIT}`);
    console.log(`  - Batch size: ${BATCH_SIZE}`);
    console.log(`  - Batch delay: ${BATCH_DELAY_MS}ms`);
    console.log(`  - Dry run: ${DRY_RUN}\n`);

    // Fetch events needing inference
    const events = await fetchEventsNeedingInference(LIMIT);

    if (events.length === 0) {
        console.log('No events found that need inference.');
        console.log('All events either have descriptions and tags, or are missing titles.');
        return;
    }

    console.log(`Found ${events.length} events needing inference\n`);

    if (DRY_RUN) {
        console.log('DRY RUN - Events that would be processed:\n');
        events.forEach((event, index) => {
            const hasDesc = event.description && event.description.trim().length > 0;
            console.log(`${index + 1}. ${event.title.substring(0, 60)}${event.title.length > 60 ? '...' : ''}`);
            console.log(`   Type: ${event.event_type?.name || 'Unknown'} | Organizer: ${event.organizer?.name || 'Unknown'}`);
            console.log(`   Has description: ${hasDesc ? 'Yes' : 'No'}`);
            console.log('');
        });
        console.log('Run without --dry-run to process these events.');
        return;
    }

    // Process events using LLMEnrichmentService
    const enrichmentService = new LLMEnrichmentService(supabase as unknown as never);

    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ title: string; error: string }> = [];

    // Process in batches
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
        const batch = events.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(events.length / BATCH_SIZE);

        console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} events)...`);

        for (const event of batch) {
            try {
                const result = await enrichmentService.processEventInference(event.id);

                if (result.status === 'enriched') {
                    successCount++;
                    console.log(`  ✓ ${event.title.substring(0, 50)}...`);
                } else {
                    failCount++;
                    errors.push({ title: event.title, error: result.error || 'Unknown error' });
                    console.log(`  ✗ ${event.title.substring(0, 50)}... - ${result.error}`);
                }
            } catch (error) {
                failCount++;
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                errors.push({ title: event.title, error: errorMsg });
                console.log(`  ✗ ${event.title.substring(0, 50)}... - ${errorMsg}`);
            }
        }

        // Delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < events.length) {
            console.log(`  Waiting ${BATCH_DELAY_MS}ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Total processed: ${events.length}`);
    console.log(`Succeeded: ${successCount}`);
    console.log(`Failed: ${failCount}`);

    if (errors.length > 0 && errors.length <= 10) {
        console.log('\nErrors:');
        errors.forEach(({ title, error }) => {
            console.log(`  - ${title.substring(0, 40)}...: ${error}`);
        });
    } else if (errors.length > 10) {
        console.log(`\nFirst 10 errors (of ${errors.length}):`);
        errors.slice(0, 10).forEach(({ title, error }) => {
            console.log(`  - ${title.substring(0, 40)}...: ${error}`);
        });
    }

    console.log('\nDone!');
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });

