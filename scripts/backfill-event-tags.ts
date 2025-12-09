/**
 * Backfill Event Tags Migration Script
 * 
 * Enriches existing untagged events with tags extracted from their content.
 * Uses local NLP-based extraction (no LLM required).
 * 
 * Usage: npx tsx scripts/backfill-event-tags.ts
 * 
 * Environment Variables:
 * - BACKFILL_MAX_EVENTS: Max events to process (0 = no cap)
 * - BACKFILL_DRY_RUN: Set to '1' for dry run
 * - BACKFILL_BATCH_SIZE: Events per batch (default: 20)
 * - BACKFILL_INCLUDE_ALL: Set to '1' to include events without source_url
 */

import { createClient } from '@supabase/supabase-js';
import { EventTagEnrichmentService } from '../src/services/eventTagEnrichmentService';
import type { AgendaItem } from '../src/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_EVENTS = parseInt(process.env.BACKFILL_MAX_EVENTS || '0', 10); // 0 = no cap
const DRY_RUN = process.env.BACKFILL_DRY_RUN === '1';
const BATCH_SIZE = parseInt(process.env.BACKFILL_BATCH_SIZE || '20', 10);
const INCLUDE_ALL = process.env.BACKFILL_INCLUDE_ALL === '1';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EventWithAgenda {
  id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  event_tag_relations: { event_id: string }[];
  event_agenda: Array<{
    id: string;
    title: string;
    description: string | null;
    start_time: string | null;
    end_time: string | null;
    agenda_type: string | null;
    location: string | null;
    day_number: number | null;
    track: string | null;
  }>;
}

async function backfillEventTags() {
  console.log('Starting event tag backfill (local NLP mode)...\n');
  console.log(`Configuration:`);
  console.log(`  - Max events: ${MAX_EVENTS || 'unlimited'}`);
  console.log(`  - Dry run: ${DRY_RUN}`);
  console.log(`  - Batch size: ${BATCH_SIZE}`);
  console.log(`  - Include events without source_url: ${INCLUDE_ALL}\n`);

  try {
    // Find events without tags, including agenda for better extraction
    const { data: untagged, error: untaggedError } = await supabase
      .from('events')
      .select(`
        id, 
        title, 
        description,
        source_url,
        event_tag_relations (event_id),
        event_agenda (
          id,
          title,
          description,
          start_time,
          end_time,
          agenda_type,
          location,
          day_number,
          track
        )
      `)
      .eq('status', 'confirmed');

    if (untaggedError) {
      console.error('Error querying events:', untaggedError);
      process.exit(1);
    }

    // Filter to events without tags
    let untaggedEvents = (untagged || []).filter(
      (e: EventWithAgenda) => !e.event_tag_relations || e.event_tag_relations.length === 0
    );

    // Optionally filter to only events with source_url
    if (!INCLUDE_ALL) {
      untaggedEvents = untaggedEvents.filter((e: EventWithAgenda) => !!e.source_url);
    }

    if (MAX_EVENTS > 0) {
      untaggedEvents = untaggedEvents.slice(0, MAX_EVENTS);
    }

    if (untaggedEvents.length === 0) {
      console.log('No untagged events found. All events already have tags.');
      return;
    }

    console.log(`Found ${untaggedEvents.length} untagged events to process\n`);

    let successCount = 0;
    let tagsAssignedTotal = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < untaggedEvents.length; i += BATCH_SIZE) {
      const batch = untaggedEvents.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(untaggedEvents.length / BATCH_SIZE);
      console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} events)...`);

      for (const event of batch as EventWithAgenda[]) {
        try {
          // Convert agenda to the expected format
          const agenda: AgendaItem[] = (event.event_agenda || []).map(item => ({
            id: item.id,
            title: item.title,
            description: item.description || undefined,
            startTime: item.start_time || '',
            endTime: item.end_time || '',
            type: item.agenda_type || 'other',
            location: item.location || undefined,
            dayNumber: item.day_number ?? undefined,
            track: item.track || undefined
          }));

          if (DRY_RUN) {
            // In dry run, just show what would be processed
            const title = event.title.substring(0, 50);
            const hasAgenda = agenda.length > 0;
            console.log(`  [DRY RUN] Would enrich: "${title}..." (agenda items: ${agenda.length})`);
            successCount++;
          } else {
            const result = await EventTagEnrichmentService.enrichEventTags(
              event.id,
              {
                title: event.title,
                description: event.description,
                agenda
              },
              supabase as unknown as never
            );

            if (result.success) {
              if (result.tagsAssigned > 0) {
                successCount++;
                tagsAssignedTotal += result.tagsAssigned;
                console.log(`  ✓ "${event.title.substring(0, 40)}..." → ${result.tagsAssigned} tags`);
              } else {
                skippedCount++;
                // Only log if verbose
                if (process.env.BACKFILL_VERBOSE === '1') {
                  console.log(`  ○ "${event.title.substring(0, 40)}..." → no matching tags`);
                }
              }
            } else {
              errorCount++;
              console.error(`  ✗ "${event.title.substring(0, 40)}...": ${result.error || 'Failed'}`);
            }
          }
        } catch (error) {
          errorCount++;
          console.error(`  ✗ "${event.title.substring(0, 40)}...": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    console.log('\n=== Backfill Summary ===');
    console.log(`Total events processed: ${untaggedEvents.length}`);
    console.log(`Events enriched with tags: ${successCount}`);
    console.log(`Total tags assigned: ${tagsAssignedTotal}`);
    console.log(`Events with no matching tags: ${skippedCount}`);
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

