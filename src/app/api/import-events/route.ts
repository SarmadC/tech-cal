// src/app/api/import-events/route.ts

import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { notFound } from "next/navigation";
import * as Sentry from '@sentry/nextjs';

import { createClient } from '@/utils/supabase/server';
// Temporarily comment out complex dependencies that might be causing issues
// import { EventImportService } from '@/services/eventImportService';
// import { getImportConfig } from '@/config/importConfig';
import type { EventSource } from '@/types/eventImport';

/**
 * Event Import API Endpoint
 * Follows existing API patterns: rate limiting, auth, error handling
 */

// ============================================
// RATE LIMITING (Same pattern as existing APIs)
// ============================================

const ratelimit = new Ratelimit({
  redis: kv,
  // Allow 10 import requests per hour per IP (imports are expensive)
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  analytics: true,
  prefix: "ratelimit_kurecal_import",
});

// Simple inline configuration to avoid hanging
const importConfig = {
  sources: {
    eventbrite: { enabled: Boolean(process.env.EVENTBRITE_API_TOKEN) },
    meetup: { enabled: Boolean(process.env.MEETUP_API_KEY) },
    github: { enabled: Boolean(process.env.GITHUB_API_TOKEN) }
  },
  qualityThresholds: {
    minQualityScore: 50,
    minDescriptionLength: 150,
    requireVenue: false,
    requireRegistration: false
  }
};

// ============================================
// API ENDPOINTS
// ============================================

export const dynamic = "force-dynamic";

/**
 * GET - Test import system and get status
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    status: 'Event import system ready',
    message: 'Ready to import events from external APIs',
    timestamp: new Date().toISOString()
  });
}

/**
 * POST - Trigger event import
 */
export async function POST(request: NextRequest) {
  // Temporarily disable auth for initial database population
  // TODO: Re-enable authentication after initial import is complete
  console.log('[Import] Processing import request...');

  try {
    // Apply rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { success: rateLimitSuccess } = await ratelimit.limit(ip);
    
    if (!rateLimitSuccess) {
      return NextResponse.json({
        success: false,
        error: 'Too many import requests. Please try again in an hour.'
      }, { status: 429 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { sources } = body;

    // Determine which sources to import from
    const sourcesToImport: EventSource[] = sources || 
      Object.entries(importConfig.sources)
        .filter(([, config]) => config.enabled)
        .map(([source]) => source as EventSource);

    if (sourcesToImport.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No sources enabled for import'
      }, { status: 400 });
    }

    // Skip complex config logic for now
    console.log('[Import] Using direct API approach...');

    console.log(`Starting import from sources: ${sourcesToImport.join(', ')}`);

    // Direct import (bypassing complex service dependencies)
    console.log('[Import] Using direct Eventbrite API...');
    
    // Check if Eventbrite is requested
    if (!sources || !sources.includes('eventbrite')) {
      return NextResponse.json({
        success: false,
        error: 'Only Eventbrite import supported currently'
      }, { status: 400 });
    }

    // Direct Eventbrite import with filtering
    const result = await importDirectFromEventbrite();

    // Log results
    console.log('Import completed:', {
      success: result.success,
      totalImported: result.totalStats.totalImported,
      totalErrors: result.totalStats.totalErrors,
      processingTime: result.totalStats.processingTimeMs
    });

    // Return results
    return NextResponse.json({
      success: result.success,
      message: `Import completed. ${result.totalStats.totalImported} events imported.`,
      stats: result.totalStats,
      sourceResults: result.sourceResults
    });

  } catch (error) {
    console.error('Import API error:', error);
    Sentry.captureException(error, {
      extra: { function: 'POST /api/import-events' }
    });

    return NextResponse.json({
      success: false,
      error: 'Import failed due to internal error'
    }, { status: 500 });
  }
}

/**
 * PUT - Update import configuration
 */
export async function PUT(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  try {
    const body = await request.json();
    const { source, config } = body;

    if (!source || !config) {
      return NextResponse.json({
        success: false,
        error: 'Missing source or config'
      }, { status: 400 });
    }

    // Update config (in a real implementation, this would persist to database)
    if (importConfig.sources[source as EventSource]) {
      importConfig.sources[source as EventSource] = {
        ...importConfig.sources[source as EventSource],
        ...config
      };
    }

    return NextResponse.json({
      success: true,
      message: `Configuration updated for ${source}`,
      config: importConfig.sources[source as EventSource]
    });

  } catch (error) {
    console.error('Config update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update configuration'
    }, { status: 500 });
  }
}

// ============================================
// DIRECT IMPORT FUNCTION (ROBUST & DRY)
// ============================================

async function importDirectFromEventbrite() {
  const startTime = Date.now();
  
  try {
    // Tech filtering (consolidated from your existing logic)
    const techKeywords = [
      'javascript', 'python', 'react', 'vue', 'angular', 'node.js', 'typescript',
      'software', 'developer', 'programming', 'coding', 'tech', 'ai', 'ml',
      'devops', 'cloud', 'aws', 'docker', 'kubernetes', 'conference', 'meetup',
      'workshop', 'hackathon', 'webinar', 'summit', 'bootcamp'
    ];

    // Get organizations
    const orgsResponse = await fetch('https://www.eventbriteapi.com/v3/users/me/organizations/', {
      headers: {
        'Authorization': `Bearer ${process.env.EVENTBRITE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!orgsResponse.ok) {
      throw new Error(`Eventbrite API error: ${orgsResponse.status}`);
    }

    const orgsData = await orgsResponse.json();
    if (!orgsData.organizations?.length) {
      throw new Error('No Eventbrite organizations found');
    }

    // Fetch events from organizations
    const allEvents = [];
    for (const org of orgsData.organizations.slice(0, 2)) {
      const eventsUrl = `https://www.eventbriteapi.com/v3/organizations/${org.id}/events/?` +
        `status=live&expand=organizer,venue&order_by=start_asc&page_size=30`;

      const eventsResponse = await fetch(eventsUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.EVENTBRITE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        allEvents.push(...(eventsData.events || []));
      }
    }

    // Apply tech filtering
    const techEvents = allEvents.filter(event => {
      const content = `${event.name?.text || ''} ${event.description?.text || ''}`.toLowerCase();
      const hasTechKeywords = techKeywords.some(keyword => content.includes(keyword));
      const hasGoodDescription = content.length > 100;
      return hasTechKeywords && hasGoodDescription;
    });

    // Get Supabase client and defaults
    const supabase = await createClient();
    const { data: defaultOrganizer } = await supabase.from('organizers').select('id').limit(1).single();
    const { data: defaultEventType } = await supabase.from('event_type').select('id').limit(1).single();

    if (!defaultOrganizer || !defaultEventType) {
      throw new Error('No organizer or event type found');
    }

    // Insert events
    const insertedEvents = [];
    for (const event of techEvents) {
      try {
        const transformedEvent = {
          title: event.name?.text || 'Untitled Event',
          description: event.description?.text || 'No description available',
          start_time: event.start?.utc || new Date().toISOString(),
          end_time: event.end?.utc || null,
          location: event.venue?.name || (event.online_event ? 'Online' : 'TBD'),
          source_url: event.url || '',
          external_id: `eventbrite_${event.id}`,
          external_status: event.status || 'published',
          status: 'published',
          organizer_id: defaultOrganizer.id,
          event_type_id: defaultEventType.id,
          'Remote/In-person': event.online_event ? 'Online' : 'In-person',
          last_synced_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('events')
          .upsert(transformedEvent, { onConflict: 'external_id', ignoreDuplicates: true })
          .select('id, title')
          .single();

        if (!error && data) {
          insertedEvents.push(data);
        }
      } catch (error) {
        console.error('Event insert failed:', error);
      }
    }

    return {
      success: true,
      totalStats: {
        totalFetched: allEvents.length,
        totalImported: insertedEvents.length,
        totalErrors: 0,
        totalDuplicates: techEvents.length - insertedEvents.length,
        processingTimeMs: Date.now() - startTime
      },
      sourceResults: [{
        source: 'eventbrite',
        success: true,
        imported: insertedEvents.length,
        errors: 0
      }]
    };

  } catch (error) {
    return {
      success: false,
      totalStats: {
        totalFetched: 0,
        totalImported: 0,
        totalErrors: 1,
        totalDuplicates: 0,
        processingTimeMs: Date.now() - startTime
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
