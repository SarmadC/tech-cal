import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { requireDebugRouteAccess } from '@/lib/debugRouteAccess';

export const dynamic = 'force-dynamic';

interface TagEventRelationRow {
  event_id: string;
}

/**
 * Debug endpoint to check dates of events tagged with "data"
 * GET /api/debug/tag-events-dates
 */
export async function GET(_request: NextRequest) {
  try {
    const access = await requireDebugRouteAccess();
    if (access.response) {
      return access.response;
    }

    const { supabase } = access;

    // Get events with "data" tags
    const { data: relations, error } = await supabase
      .from('event_tag_relations')
      .select(`
        event_id,
        event_tags!inner (
          event_tag
        )
      `)
      .ilike('event_tags.event_tag', '%data%');

    if (error) {
      Sentry.captureException(error, {
        extra: { function: 'debug_tag_events_dates_relations' },
      });
      return NextResponse.json({ error: 'Failed to load tagged events' }, { status: 500 });
    }

    const eventIds = [...new Set((relations as TagEventRelationRow[] | null)?.map((relation) => relation.event_id) || [])];

    // Get full event details including dates
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, start_time, end_time, status')
      .in('id', eventIds)
      .order('start_time', { ascending: false });

    if (eventsError) {
      Sentry.captureException(eventsError, {
        extra: { function: 'debug_tag_events_dates_events' },
      });
      return NextResponse.json({ error: 'Failed to load event details' }, { status: 500 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const categorized = {
      future: events?.filter(e => new Date(e.start_time) >= today) || [],
      past: events?.filter(e => new Date(e.start_time) < today) || []
    };

    return NextResponse.json({
      success: true,
      today: today.toISOString(),
      totalEvents: events?.length || 0,
      futureEvents: categorized.future.length,
      pastEvents: categorized.past.length,
      events: events?.map(e => ({
        id: e.id,
        title: e.title,
        start_time: e.start_time,
        isPast: new Date(e.start_time) < today,
        status: e.status
      }))
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    Sentry.captureException(error, {
      extra: { function: 'debug_tag_events_dates' },
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
