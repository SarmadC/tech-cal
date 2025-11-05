/**
 * API Route: Event Speakers Enrichment
 * 
 * POST: Create or update speakers for an event
 * GET: List speakers for an event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';
import { EventEnrichmentService, type SpeakerInput } from '@/services/ingestion/EventEnrichmentService';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin access
        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { eventId, speakers } = body as { eventId: string; speakers: SpeakerInput[] };

        if (!eventId || !Array.isArray(speakers)) {
            return NextResponse.json(
                { error: 'Missing required fields: eventId, speakers' },
                { status: 400 }
            );
        }

        // Validate speakers
        for (const speaker of speakers) {
            if (!speaker.name) {
                return NextResponse.json(
                    { error: 'Each speaker must have a name' },
                    { status: 400 }
                );
            }
        }

        const result = await EventEnrichmentService.createOrUpdateSpeakers(
            eventId,
            speakers,
            supabase,
            user.id
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to create speakers' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            speakerIds: result.speakerIds,
        });
    } catch (error) {
        console.error('Error in speakers enrichment API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin access
        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json(
                { error: 'Missing eventId parameter' },
                { status: 400 }
            );
        }

        // Get event's speaker_lineup
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('speaker_lineup')
            .eq('id', eventId)
            .single();

        if (eventError || !event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            speakers: event.speaker_lineup || [],
        });
    } catch (error) {
        console.error('Error fetching speakers:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

