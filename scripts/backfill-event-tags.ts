/**
 * Backfill Event Tags Migration Script
 * 
 * Enriches existing untagged events with tags extracted from their content.
 * Identifies events with no tags and runs enrichment service on them.
 * 
 * Usage: npx tsx scripts/backfill-event-tags.ts
 */

import { createClient } from '@supabase/supabase-js';
import { EventTagEnrichmentService } from '../src/services/eventTagEnrichmentService';
import { EventService } from '../src/services/eventServices';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    // Find events without tags
    // Query: events that don't have any entries in event_tag_relations
    const { data: allEvents, error: allEventsError } = await supabase
      .from('events')
      .select('id, title, description')
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString());

    if (allEventsError) {
      console.error('Error querying events:', allEventsError);
      process.exit(1);
    }

    // Get all event IDs that have tags
    const { data: taggedEventIds, error: taggedError } = await supabase
      .from('event_tag_relations')
      .select('event_id');

    if (taggedError) {
      console.error('Error querying tagged events:', taggedError);
      process.exit(1);
    }

    const taggedIds = new Set((taggedEventIds || []).map(r => r.event_id));
    const untaggedEvents = (allEvents || []).filter(e => !taggedIds.has(e.id));

    if (!untaggedEvents || untaggedEvents.length === 0) {
      console.log('No untagged events found. All events already have tags.');
      return;
    }

    console.log(`Found ${untaggedEvents.length} untagged events\n`);

    let successCount = 0;
    let errorCount = 0;
    let totalTagsAssigned = 0;

    // Process events in batches to avoid overwhelming the database
    const BATCH_SIZE = 10;
    for (let i = 0; i < untaggedEvents.length; i += BATCH_SIZE) {
      const batch = untaggedEvents.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} events)...`);

      for (const event of batch) {
        try {
          // Fetch full event data including agenda
          const fullEvent = await EventService.getEventById(event.id, supabase);
          
          // Fetch agenda items
          const { data: agendaItems } = await supabase
            .from('event_agenda')
            .select('id, title, description')
            .eq('event_id', event.id);
          
          const agenda = (agendaItems || []).map(item => ({
            id: item.id,
            title: item.title,
            description: item.description || undefined,
            startTime: '',
            endTime: '',
            type: ''
          }));

          // Enrich with tags
          const result = await EventTagEnrichmentService.enrichEventTags(
            event.id,
            {
              title: fullEvent.title,
              description: fullEvent.description || null,
              agenda: agenda.length > 0 ? agenda : undefined
            },
            supabase
          );

          if (result.success) {
            successCount++;
            totalTagsAssigned += result.tagsAssigned;
            if (result.tagsAssigned > 0) {
              console.log(`  ✓ ${event.title.substring(0, 50)}: ${result.tagsAssigned} tag(s) assigned`);
            } else {
              console.log(`  - ${event.title.substring(0, 50)}: No tags extracted`);
            }
          } else {
            errorCount++;
            console.error(`  ✗ ${event.title.substring(0, 50)}: ${result.error}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`  ✗ ${event.title.substring(0, 50)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < untaggedEvents.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n=== Backfill Summary ===');
    console.log(`Total events processed: ${untaggedEvents.length}`);
    console.log(`Successfully enriched: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Total tags assigned: ${totalTagsAssigned}`);
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

