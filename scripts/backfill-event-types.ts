/**
 * Backfill Event Types Migration Script
 * 
 * Maps events to event_type_id based on title/description content analysis.
 * Uses keyword matching to determine the most appropriate event type.
 * 
 * Usage: npx tsx scripts/backfill-event-types.ts
 * 
 * Environment Variables:
 * - BACKFILL_MAX_EVENTS: Max events to process (0 = no cap)
 * - BACKFILL_DRY_RUN: Set to '1' for dry run
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_EVENTS = parseInt(process.env.BACKFILL_MAX_EVENTS || '0', 10);
const DRY_RUN = process.env.BACKFILL_DRY_RUN === '1';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Event type keyword mappings (order matters - first match wins)
const EVENT_TYPE_KEYWORDS: Record<string, string[]> = {
  'Hackathon': [
    'hackathon', 'hack', 'coding challenge', 'code jam', 'buildathon',
    'codeathon', 'datathon', 'ideathon'
  ],
  'Training': [
    'training', 'workshop', 'bootcamp', 'course', 'tutorial', 'masterclass',
    'hands-on', 'lab', 'certification', 'learn', 'upskill'
  ],
  'Summit': [
    'summit', 'forum', 'symposium', 'congress', 'world', 'global'
  ],
  'Trade Show': [
    'trade show', 'expo', 'exhibition', 'showcase', 'fair'
  ],
  'Networking': [
    'networking', 'meetup', 'mixer', 'happy hour', 'social', 'community',
    'user group', 'drinks', 'breakfast', 'lunch'
  ],
  'Product': [
    'product launch', 'release', 'announcement', 'unveil', 'demo day',
    'product'
  ],
  'Conference': [
    'conference', 'conf', 'con', 'convention', 'tech week', 'days',
    'annual', 'keynote'
  ]
};

interface EventTypeInfo {
  id: string;
  name: string;
}

/**
 * Determine event type based on title and description
 */
function determineEventType(
  title: string,
  description: string | null,
  eventTypes: Map<string, EventTypeInfo>
): EventTypeInfo | null {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  // Check keywords in order of specificity
  for (const [typeName, keywords] of Object.entries(EVENT_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      // Word boundary match
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        const eventType = eventTypes.get(typeName);
        if (eventType) {
          return eventType;
        }
      }
    }
  }
  
  // Default to Conference if no specific match (most common type)
  return eventTypes.get('Conference') || null;
}

async function backfillEventTypes() {
  console.log('Starting event type backfill...\n');
  console.log(`Configuration:`);
  console.log(`  - Max events: ${MAX_EVENTS || 'unlimited'}`);
  console.log(`  - Dry run: ${DRY_RUN}\n`);

  try {
    // Fetch event types
    const { data: eventTypesData, error: typesError } = await supabase
      .from('event_type')
      .select('id, name');

    if (typesError || !eventTypesData) {
      console.error('Error fetching event types:', typesError);
      process.exit(1);
    }

    const eventTypes = new Map<string, EventTypeInfo>();
    eventTypesData.forEach(et => {
      eventTypes.set(et.name, { id: et.id, name: et.name });
    });

    console.log(`Found ${eventTypes.size} event types: ${[...eventTypes.keys()].join(', ')}\n`);

    // Fetch events without event_type_id
    let query = supabase
      .from('events')
      .select('id, title, description')
      .is('event_type_id', null)
      .eq('status', 'confirmed');

    if (MAX_EVENTS > 0) {
      query = query.limit(MAX_EVENTS);
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      process.exit(1);
    }

    if (!events || events.length === 0) {
      console.log('No events without event_type_id found.');
      return;
    }

    console.log(`Found ${events.length} events without event_type_id\n`);

    // Process events
    const typeDistribution: Record<string, number> = {};
    let successCount = 0;
    let errorCount = 0;

    for (const event of events) {
      const eventType = determineEventType(event.title, event.description, eventTypes);
      
      if (!eventType) {
        console.warn(`  ? Could not determine type for: "${event.title.substring(0, 50)}..."`);
        continue;
      }

      typeDistribution[eventType.name] = (typeDistribution[eventType.name] || 0) + 1;

      if (DRY_RUN) {
        console.log(`  [DRY RUN] "${event.title.substring(0, 40)}..." → ${eventType.name}`);
        successCount++;
      } else {
        const { error: updateError } = await supabase
          .from('events')
          .update({ event_type_id: eventType.id })
          .eq('id', event.id);

        if (updateError) {
          console.error(`  ✗ "${event.title.substring(0, 40)}...": ${updateError.message}`);
          errorCount++;
        } else {
          successCount++;
          if (process.env.BACKFILL_VERBOSE === '1') {
            console.log(`  ✓ "${event.title.substring(0, 40)}..." → ${eventType.name}`);
          }
        }
      }
    }

    console.log('\n=== Backfill Summary ===');
    console.log(`Total events processed: ${events.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('\nType distribution:');
    Object.entries(typeDistribution)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    console.log('\nBackfill complete!');

  } catch (error) {
    console.error('Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillEventTypes()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });








