import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check dates of events tagged with "data"
 * GET /api/debug/tag-events-dates
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const eventIds = [...new Set(relations?.map((r: any) => r.event_id) || [])];

    // Get full event details including dates
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, start_time, end_time, status')
      .in('id', eventIds)
      .order('start_time', { ascending: false });

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 });
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
