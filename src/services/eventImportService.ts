// src/services/eventImportService.ts

import * as Sentry from '@sentry/nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  EventSource,
  ImportConfig,
  ImportResult,
  BatchImportResult,
  RawEvent
} from '@/types/eventImport';
import { EventImportError, RateLimitError } from '@/types/eventImport';
import type { Event } from '@/types/events';

import { AdapterFactory } from './adapters/eventSourceAdapters';
import { filterEventsByQuality } from '@/utils/eventQualityFilter';

/**
 * Event Import Service
 * Main orchestrator for event imports - follows existing service patterns
 * Uses existing EventService, error handling, and transformation patterns
 */
export class EventImportService {
  
  // ============================================
  // MAIN IMPORT METHODS (Public API)
  // ============================================

  /**
   * Import events from a single source
   * Follows existing service pattern: try/catch with Sentry
   */
  static async importFromSource(
    source: EventSource,
    config: ImportConfig,
    supabaseClient: SupabaseClient
  ): Promise<ImportResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Starting import from ${source}...`);
      
      // 1. Get adapter for source
      const adapter = AdapterFactory.getAdapter(source);
      const sourceConfig = config.sources[source];
      
      if (!sourceConfig.enabled) {
        return this.createImportResult(source, true, { processingTimeMs: Date.now() - startTime });
      }

      // 2. Fetch raw events from API
      const rawEvents = await adapter.fetchEvents(sourceConfig);
      console.log(`Fetched ${rawEvents.length} events from ${source}`);

      // 3. Apply quality filters (shared across all sources)
      const qualityFiltered = filterEventsByQuality(rawEvents, config);
      console.log(`${qualityFiltered.length} events passed quality filter`);

      // 4. Transform to our Event format (consolidated)
      const { transformedEvents, errors } = this.transformEvents(qualityFiltered.map(f => f.event));

      // 5. Check for duplicates (prevent re-importing same events)
      const newEvents = await this.filterDuplicates(transformedEvents, supabaseClient);
      console.log(`${newEvents.length} new events after duplicate check`);

      // 6. Store in database using existing EventService
      const importedEventIds = await this.storeEvents(newEvents, supabaseClient);

      // 7. Return results
      const processingTime = Date.now() - startTime;
      return {
        success: true,
        stats: {
          source,
          fetched: rawEvents.length,
          qualified: qualityFiltered.length,
          imported: importedEventIds.length,
          duplicates: transformedEvents.length - newEvents.length,
          errors: errors.length,
          processingTimeMs: processingTime
        },
        errors,
        importedEventIds
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Handle rate limiting gracefully (existing pattern)
      if (error instanceof RateLimitError) {
        console.warn(`Rate limit hit for ${source}, will retry later`);
        return this.createImportResult(source, false, 
          { errors: 1, processingTimeMs: processingTime },
          [{ eventId: 'rate_limit', error: `Rate limit exceeded. Resets at ${error.resetTime.toISOString()}` }]
        );
      }

      // Log error with Sentry (existing pattern)
      console.error(`Import failed for ${source}:`, error);
      Sentry.captureException(error, {
        extra: { function: 'importFromSource', source, config }
      });

      return this.createImportResult(source, false,
        { errors: 1, processingTimeMs: processingTime },
        [{ eventId: 'unknown', error: error instanceof Error ? error.message : String(error) }]
      );
    }
  }

  /**
   * Import from multiple sources with controlled concurrency
   * Follows existing batch processing patterns
   */
  static async importFromMultipleSources(
    sources: EventSource[],
    config: ImportConfig,
    supabaseClient: SupabaseClient
  ): Promise<BatchImportResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Starting batch import from sources: ${sources.join(', ')}`);

      // Process sources with limited concurrency (like BatchCareerImpactService)
      const results: ImportResult[] = [];
      
      // Process 2 sources at a time to avoid overwhelming APIs
      for (let i = 0; i < sources.length; i += 2) {
        const currentBatch = sources.slice(i, i + 2);
        
        const batchPromises = currentBatch.map(source => 
          this.importFromSource(source, config, supabaseClient)
            .catch(error => this.createImportResult(source, false, 
              { errors: 1 }, 
              [{ eventId: 'unknown', error: error.message }]
            ))
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      // Calculate totals
      const totalStats = results.reduce((acc, result) => ({
        totalFetched: acc.totalFetched + result.stats.fetched,
        totalImported: acc.totalImported + result.stats.imported,
        totalErrors: acc.totalErrors + result.stats.errors,
        totalDuplicates: acc.totalDuplicates + result.stats.duplicates,
        processingTimeMs: Math.max(acc.processingTimeMs, result.stats.processingTimeMs)
      }), {
        totalFetched: 0,
        totalImported: 0,
        totalErrors: 0,
        totalDuplicates: 0,
        processingTimeMs: 0
      });

      const processingTime = Date.now() - startTime;
      totalStats.processingTimeMs = processingTime;

      return {
        success: results.some(r => r.success),
        results,
        totalStats,
        errors: results.flatMap(r => r.errors.map(e => e.error))
      };

    } catch (error) {
      console.error('Batch import failed:', error);
      Sentry.captureException(error, {
        extra: { function: 'importFromMultipleSources', sources, config }
      });

      return {
        success: false,
        results: [],
        totalStats: {
          totalFetched: 0,
          totalImported: 0,
          totalErrors: 1,
          totalDuplicates: 0,
          processingTimeMs: Date.now() - startTime
        },
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  // ============================================
  // HELPER METHODS (Private)
  // ============================================

  /**
   * Transform multiple raw events (consolidated for DRY)
   */
  private static transformEvents(rawEvents: RawEvent[]): {
    transformedEvents: Event[];
    errors: Array<{ eventId: string; error: string }>;
  } {
    const transformedEvents: Event[] = [];
    const errors: Array<{ eventId: string; error: string }> = [];

    rawEvents.forEach(rawEvent => {
      try {
        const appEvent: Event = {
          id: '', // Will be generated by database
          createdAt: new Date().toISOString(),
          updatedAt: null,
          title: rawEvent.title.trim(),
          description: rawEvent.description?.trim() || '',
          startTime: rawEvent.startTime,
          endTime: rawEvent.endTime || null,
          timezone: rawEvent.timezone || 'UTC',
          organizer: rawEvent.organizer.name,
          location: rawEvent.location?.name || rawEvent.location?.address || 'Online',
          status: 'active',
          sourceUrl: rawEvent.sourceUrl,
          livestreamUrl: rawEvent.livestreamUrl || null,
          registrationUrl: rawEvent.registrationUrl || null,
          eventTypeId: '', // Will be set during storage
          organization: {
            id: '',
            name: rawEvent.organizer.name,
            logo: rawEvent.organizer.logo
          }
        };
        transformedEvents.push(appEvent);
      } catch (error) {
        errors.push({
          eventId: rawEvent.externalId,
          error: error instanceof Error ? error.message : 'Transform failed'
        });
      }
    });

    return { transformedEvents, errors };
  }

  /**
   * Filter out duplicate events (by source URL)
   * Uses existing EventService patterns
   */
  private static async filterDuplicates(
    events: Event[],
    supabaseClient: SupabaseClient
  ): Promise<Event[]> {
    try {
      const sourceUrls = events.map(e => e.sourceUrl);
      
      // Check existing events by source URL
      const { data: existingEvents } = await supabaseClient
        .from('events')
        .select('source_url')
        .in('source_url', sourceUrls);

      const existingUrls = new Set(
        existingEvents?.map(e => e.source_url) || []
      );

      return events.filter(event => !existingUrls.has(event.sourceUrl));

    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // If duplicate check fails, return all events (better to have duplicates than miss events)
      return events;
    }
  }

  /**
   * Store events in database with proper schema handling
   * Creates organizers and handles event types
   */
  private static async storeEvents(
    events: Event[],
    supabaseClient: SupabaseClient
  ): Promise<string[]> {
    if (events.length === 0) return [];

    try {
      const importedIds: string[] = [];

      // Get default event type ID
      const { data: defaultEventType } = await supabaseClient
        .from('event_type')
        .select('id')
        .eq('name', 'Conference')
        .single();
      
      const defaultEventTypeId = defaultEventType?.id || await this.createDefaultEventType(supabaseClient);

      // Process events in smaller batches to avoid timeouts
      const batchSize = 10;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        
        // Create organizers first
        const organizerMap = await this.createOrganizers(batch, supabaseClient);
        
        // Prepare database events with all required fields
        const dbEvents = batch.map(event => ({
          title: event.title,
          description: event.description,
          start_time: event.startTime,
          end_time: event.endTime,
          location: event.location,
          status: event.status || 'active',
          source_url: event.sourceUrl,
          livestream_url: event.livestreamUrl,
          registration_url: event.registrationUrl,
          event_type_id: defaultEventTypeId,
          organizer_id: organizerMap.get(event.organization?.name || event.organizer),
          timezone: event.timezone || 'UTC',
          'Remote/In-person': event.location === 'Online' ? 'Online' : 'In-person',
          language: 'English',
          created_at: new Date().toISOString()
        }));

        // Insert events
        const { data, error } = await supabaseClient
          .from('events')
          .insert(dbEvents)
          .select('id');

        if (error) {
          console.error('Batch insert error:', error);
          continue; // Skip this batch but continue with others
        }

        if (data) {
          importedIds.push(...data.map(e => e.id));
        }
      }

      return importedIds;

    } catch (error) {
      console.error('Error storing events:', error);
      throw new EventImportError(
        'Failed to store events in database',
        'eventbrite', // Use a valid EventSource instead of 'database'
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Create organizers and return name->id mapping
   */
  private static async createOrganizers(
    events: Event[],
    supabaseClient: SupabaseClient
  ): Promise<Map<string, string>> {
    const organizerMap = new Map<string, string>();
    const uniqueOrganizers = new Map<string, { name: string; website?: string; logo?: string }>();

    // Collect unique organizers
    events.forEach(event => {
      const name = event.organization?.name || event.organizer;
      if (!uniqueOrganizers.has(name)) {
        uniqueOrganizers.set(name, {
          name,
          website: event.organization?.id, // Sometimes contains website
          logo: event.organization?.logo
        });
      }
    });

    // Check existing organizers
    const organizerNames = Array.from(uniqueOrganizers.keys());
    const { data: existing } = await supabaseClient
      .from('organizers')
      .select('id, name')
      .in('name', organizerNames);

    // Map existing organizers
    existing?.forEach(org => {
      organizerMap.set(org.name, org.id);
    });

    // Create new organizers
    const newOrganizers = Array.from(uniqueOrganizers.entries())
      .filter(([name]) => !organizerMap.has(name))
      .map(([, org]) => ({
        name: org.name,
        website_url: org.website,
        logo_url: org.logo
      }));

    if (newOrganizers.length > 0) {
      const { data: created } = await supabaseClient
        .from('organizers')
        .insert(newOrganizers)
        .select('id, name');

      created?.forEach(org => {
        organizerMap.set(org.name, org.id);
      });
    }

    return organizerMap;
  }

  /**
   * Create default event type if none exists
   */
  private static async createDefaultEventType(supabaseClient: SupabaseClient): Promise<string> {
    const { data, error } = await supabaseClient
      .from('event_type')
      .insert({
        name: 'Conference',
        color: '#3B82F6',
        description: 'Technology conferences and events',
        is_active: true,
        sort_order: 0
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Failed to create default event type');
    }

    return data.id;
  }

  // ============================================
  // RESULT HELPERS (DRY)
  // ============================================

  private static createImportResult(
    source: EventSource,
    success: boolean,
    stats: Partial<ImportResult['stats']>,
    errors: ImportResult['errors'] = [],
    importedEventIds: string[] = []
  ): ImportResult {
    return {
      success,
      stats: {
        source,
        fetched: 0,
        qualified: 0,
        imported: 0,
        duplicates: 0,
        errors: 0,
        processingTimeMs: 0,
        ...stats
      },
      errors,
      importedEventIds
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Test all configured sources
   */
  static async testAllSources(): Promise<Record<EventSource, boolean>> {
    return await AdapterFactory.testAllConnections();
  }

  /**
   * Get import statistics for monitoring
   */
  static async getImportStats(
    supabaseClient: SupabaseClient,
    days: number = 7
  ): Promise<Record<string, number>> {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const { data, error } = await supabaseClient
        .from('events')
        .select('created_at, source_url')
        .gte('created_at', sinceDate.toISOString());

      if (error) throw error;

      const stats = {
        totalEvents: data?.length || 0,
        eventbriteEvents: data?.filter(e => e.source_url?.includes('eventbrite')).length || 0,
        meetupEvents: data?.filter(e => e.source_url?.includes('meetup')).length || 0,
        githubEvents: data?.filter(e => e.source_url?.includes('github')).length || 0,
      };

      return stats;

    } catch (error) {
      console.error('Error getting import stats:', error);
      return { totalEvents: 0, eventbriteEvents: 0, meetupEvents: 0, githubEvents: 0 };
    }
  }
}
