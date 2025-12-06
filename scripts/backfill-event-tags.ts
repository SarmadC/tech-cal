/**
 * Backfill Event Tags Migration Script
 * 
 * Enriches existing untagged events with tags extracted from their content.
 * Identifies events with no tags and runs enrichment service on them.
 * 
 * Usage: npx tsx scripts/backfill-event-tags.ts
 */

import { createClient } from '@supabase/supabase-js';
import { LLMEnrichmentService } from '../src/services/ingestion/LLMEnrichmentService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_EVENTS = parseInt(process.env.BACKFILL_MAX_EVENTS || '0', 10); // 0 = no cap
const DRY_RUN = process.env.BACKFILL_DRY_RUN === '1';
const BATCH_SIZE = parseInt(process.env.BACKFILL_BATCH_SIZE || '5', 10);
const BATCH_DELAY_MS = parseInt(process.env.BACKFILL_BATCH_DELAY_MS || '1000', 10);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfillEventTags() {
  console.log('Starting event tag backfill...\n');

  try {
    // Find events without tags (left join)
    const { data: untagged, error: untaggedError } = await supabase
      .from('events')
      .select('id, title, source_url, event_tag_relations (event_id)')
      .is('event_tag_relations.event_id', null);

    if (untaggedError) {
      console.error('Error querying untagged events:', untaggedError);
      process.exit(1);
    }

    let untaggedEvents = (untagged || []).filter(e => !!e.source_url);
    if (MAX_EVENTS > 0) {
      untaggedEvents = untaggedEvents.slice(0, MAX_EVENTS);
    }

    if (untaggedEvents.length === 0) {
      console.log('No untagged events found (with source_url). All events already have tags.');
      return;
    }

    console.log(`Found ${untaggedEvents.length} untagged events with source_url\n`);

    const llmService = new LLMEnrichmentService(supabase as unknown as any);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < untaggedEvents.length; i += BATCH_SIZE) {
      const batch = untaggedEvents.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} events)...`);

      for (const event of batch) {
        try {
          if (DRY_RUN) {
            console.log(`  [DRY RUN] Would enrich ${event.title.substring(0, 60)}`);
            successCount++;
          } else {
            const result = await llmService.processEvent(event.id);
            if (result.status === 'enriched') {
              successCount++;
              console.log(`  ✓ ${event.title.substring(0, 60)}: enriched`);
            } else {
              errorCount++;
              console.error(`  ✗ ${event.title.substring(0, 60)}: ${result.error || 'Failed'}`);
            }
          }
        } catch (error) {
          errorCount++;
          console.error(`  ✗ ${event.title.substring(0, 60)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (i + BATCH_SIZE < untaggedEvents.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log('\n=== Backfill Summary ===');
    console.log(`Total events processed: ${untaggedEvents.length}`);
    console.log(`Successfully enriched: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('\nBackfill complete!');

  } catch (error) {
    console.error('Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillEventTags()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });

