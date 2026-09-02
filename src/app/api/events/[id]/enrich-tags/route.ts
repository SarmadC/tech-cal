import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedJson, rateLimitedJson, errorJson, catchErrorJson } from '@/lib/api/apiResponse';
import { EventTagEnrichmentService } from '@/services/eventTagEnrichmentService';
import { EventService } from '@/services/eventServices';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { createClient } from '@/utils/supabase/server';

// Rate limiter for tag enrichment
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute per user
  analytics: true,
  prefix: 'event-tag-enrichment',
});

/**
 * POST /api/events/[id]/enrich-tags
 * Enrich an event with tags extracted from its content (for backfilling legacy events)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: eventId } = await params;
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return unauthorizedJson();

    const { success: rateLimitSuccess } = await ratelimit.limit(user.id);
    if (!rateLimitSuccess) return rateLimitedJson();

    // Check if enrichment is needed
    const shouldEnrich = await EventTagEnrichmentService.shouldEnrich(eventId, supabase);
    if (!shouldEnrich) {
      return NextResponse.json({
        success: true,
        message: 'Event already has tags',
        tagsAssigned: 0
      });
    }

    // Fetch event data
    const event = await EventService.getEventById(eventId, supabase);
    
    // Fetch agenda items if available
    const { data: agendaItems } = await supabase
      .from('event_agenda')
      .select('id, title, description, topics')
      .eq('event_id', eventId);
    
    const agenda = (agendaItems || []).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || undefined,
      topics: item.topics || undefined,
      startTime: '',
      endTime: '',
      type: ''
    }));

    // Enrich event with tags
    const result = await EventTagEnrichmentService.enrichEventTags(
      eventId,
      {
        title: event.title,
        description: event.description || null,
        agenda: agenda.length > 0 ? agenda : undefined
      },
      supabase
    );

    if (!result.success) {
      return errorJson(result.error || 'Failed to enrich event tags', 500);
    }

    return NextResponse.json({
      success: true,
      tagsAssigned: result.tagsAssigned,
      tagsSkipped: result.tagsSkipped,
      message: `Successfully assigned ${result.tagsAssigned} tag(s)`
    });

  } catch (error) {
    console.error('Error enriching event tags:', error);
    return catchErrorJson(error, 'Internal server error');
  }
}
