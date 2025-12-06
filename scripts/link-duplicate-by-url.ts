#!/usr/bin/env tsx
/**
 * Link Duplicate Events by Canonical URL
 * 
 * Finds events with duplicate source_url (case-insensitive, normalized) and links them
 * by updating source_events.normalized_event_id to point to the "best" event.
 * 
 * Priority for "best" event:
 * 1. Manual entry (no provenance.source_id from ingestion sources)
 * 2. Highest quality score
 * 3. Oldest event (created_at)
 */

import { createServiceClient } from '@/utils/supabase/service';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

/**
 * Normalize canonical URL for comparison
 * - Case-insensitive hostname
 * - Strip trailing slashes
 * - Collapse default ports (:80, :443)
 * - Drop query parameters for Techmeme URLs
 */
function normalizeCanonicalUrl(url: string | null | undefined): string | null {
    if (!url || !url.trim()) {
        return null;
    }

    try {
        const urlObj = new URL(url.trim());
        
        // Normalize hostname (case-insensitive)
        let hostname = urlObj.hostname.toLowerCase();
        
        // Collapse default ports
        if (urlObj.port === '80' && urlObj.protocol === 'http:') {
            urlObj.port = '';
        } else if (urlObj.port === '443' && urlObj.protocol === 'https:') {
            urlObj.port = '';
        }
        
        // For Techmeme redirect URLs, drop query parameters
        if (hostname.includes('techmeme.com')) {
            urlObj.search = '';
        }
        
        // Strip trailing slash from pathname
        let pathname = urlObj.pathname;
        if (pathname.endsWith('/')) {
            pathname = pathname.slice(0, -1);
        }
        
        // Reconstruct normalized URL
        const normalized = `${urlObj.protocol}//${hostname}${urlObj.port ? `:${urlObj.port}` : ''}${pathname}${urlObj.search}`;
        
        return normalized;
        } catch (_error) {
            // Invalid URL - return null
            return null;
        }
}

async function linkDuplicateByUrl() {
    console.log('🔗 Linking duplicate events by canonical URL...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Fetch all events with source_url
    console.log('📊 Fetching events with source_url...');
    const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, source_url, created_at')
        .not('source_url', 'is', null)
        .order('created_at', { ascending: true });

    if (eventsError) {
        console.error('❌ Error fetching events:', eventsError.message);
        process.exit(1);
    }

    console.log('   Found', events?.length || 0, 'events with source_url\n');

    if (!events || events.length === 0) {
        console.log('✅ No events to process.');
        return;
    }

    // Group events by normalized canonical URL
    const urlGroups = new Map<string, Array<{
        id: string;
        source_url: string;
        created_at: string;
    }>>();

    for (const event of events) {
        if (!event.source_url) {
            continue;
        }

        const normalizedUrl = normalizeCanonicalUrl(event.source_url);
        if (!normalizedUrl) {
            continue;
        }

        if (!urlGroups.has(normalizedUrl)) {
            urlGroups.set(normalizedUrl, []);
        }

        urlGroups.get(normalizedUrl)!.push({
            id: event.id,
            source_url: event.source_url,
            created_at: event.created_at,
        });
    }

    // Find groups with multiple events (duplicates)
    const duplicateGroups: Array<{
        normalizedUrl: string;
        events: Array<{
            id: string;
            source_url: string;
            created_at: string;
        }>;
    }> = [];

    for (const [normalizedUrl, eventList] of urlGroups.entries()) {
        if (eventList.length > 1) {
            duplicateGroups.push({
                normalizedUrl,
                events: eventList,
            });
        }
    }

    console.log('📊 Found', duplicateGroups.length, 'groups of duplicate events\n');

    if (duplicateGroups.length === 0) {
        console.log('✅ No duplicate groups found.');
        return;
    }

    // For each duplicate group, find the "best" event and link others
    let linkedCount = 0;
    let skippedCount = 0;

    // Fetch source_events to check provenance and determine best event
    const allEventIds = new Set<string>();
    duplicateGroups.forEach(group => {
        group.events.forEach(event => allEventIds.add(event.id));
    });

    console.log('📊 Fetching source_events to determine best events...');
    const { data: sourceEvents, error: sourceEventsError } = await supabase
        .from('source_events')
        .select('id, normalized_event_id, raw_payload')
        .in('normalized_event_id', Array.from(allEventIds));

    if (sourceEventsError) {
        console.error('❌ Error fetching source_events:', sourceEventsError.message);
        process.exit(1);
    }

    // Build map of event_id -> source_events (to check if event is manual)
    const eventToSourceEvents = new Map<string, Array<{
        id: string;
        raw_payload: unknown;
    }>>();

    for (const sourceEvent of sourceEvents || []) {
        if (!sourceEvent.normalized_event_id) continue;

        if (!eventToSourceEvents.has(sourceEvent.normalized_event_id)) {
            eventToSourceEvents.set(sourceEvent.normalized_event_id, []);
        }

        eventToSourceEvents.get(sourceEvent.normalized_event_id)!.push({
            id: sourceEvent.id,
            raw_payload: sourceEvent.raw_payload,
        });
    }

    // Helper: Check if event is manual (no provenance.source_id from ingestion)
    function isManualEvent(eventId: string): boolean {
        const sourceEvents = eventToSourceEvents.get(eventId) || [];
        if (sourceEvents.length === 0) {
            // No source_events - likely manual entry
            return true;
        }

        // Check if any source_event has provenance.source_id from ingestion
        for (const se of sourceEvents) {
            const payload = se.raw_payload as { provenance?: { source_id?: string } };
            const sourceId = payload?.provenance?.source_id;
            if (sourceId) {
                // Has source_id from ingestion - not manual
                return false;
            }
        }

        // All source_events have no source_id - likely manual
        return true;
    }

    // Process each duplicate group
    for (const group of duplicateGroups) {
        // Determine best event (manual > oldest)
        group.events.sort((a, b) => {
            const aIsManual = isManualEvent(a.id);
            const bIsManual = isManualEvent(b.id);

            // Manual entries win
            if (aIsManual && !bIsManual) return -1;
            if (!aIsManual && bIsManual) return 1;

            // Compare creation dates (oldest wins)
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        const bestEvent = group.events[0];
        const duplicates = group.events.slice(1);

        console.log('\n🔗 Group:', group.normalizedUrl.substring(0, 60) + '...');
        console.log('   Best event:', bestEvent.id, '(' + (isManualEvent(bestEvent.id) ? 'manual' : 'ingested') + ')');
        console.log('   Duplicates:', duplicates.length);

        // Link duplicates to best event
        for (const duplicate of duplicates) {
            // Find source_events pointing to this duplicate
            const { data: duplicateSourceEvents, error: findError } = await supabase
                .from('source_events')
                .select('id')
                .eq('normalized_event_id', duplicate.id);

            if (findError) {
                console.error('   ❌ Error finding source_events for', duplicate.id + ':', findError.message);
                skippedCount++;
                continue;
            }

            if (!duplicateSourceEvents || duplicateSourceEvents.length === 0) {
                // No source_events to link - this is fine for manual entries
                console.log('   ⚠️  No source_events found for duplicate', duplicate.id, '(may be manual entry)');
                skippedCount++;
                continue;
            }

            // Update source_events to point to best event
            const { error: updateError } = await supabase
                .from('source_events')
                .update({
                    normalized_event_id: bestEvent.id,
                    fetch_status: 'duplicate',
                    error_message: `Linked to duplicate event ${bestEvent.id} (canonical URL match)`,
                })
                .eq('normalized_event_id', duplicate.id);

            if (updateError) {
                console.error('   ❌ Error linking source_events for', duplicate.id + ':', updateError.message);
                skippedCount++;
            } else {
                console.log('   ✅ Linked', duplicateSourceEvents.length, 'source_events from', duplicate.id, '->', bestEvent.id);
                linkedCount += duplicateSourceEvents.length;
            }
        }
    }

    console.log('\n📊 Summary:');
    console.log('   - Duplicate groups found:', duplicateGroups.length);
    console.log('   - Source events linked:', linkedCount);
    console.log('   - Source events skipped:', skippedCount);
    console.log('\n✅ Duplicate linking complete!');
    console.log('   Future duplicates will be caught by the canonical URL check.\n');
}

linkDuplicateByUrl().catch(console.error);

