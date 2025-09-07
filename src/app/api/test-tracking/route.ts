// routes.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { UserEventService } from '@/services/userEventService';

export async function GET(_request: NextRequest) {
    // --- FIX END ---
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }


        // Get all tracked event IDs
        const trackedEventIds = await UserEventService.getAllTrackedEventIds(user.id, supabase);

        // Get all events to see what we can track
        const { data: allEvents, error: eventsError } = await supabase
            .from('events')
            .select('id, title')
            .limit(5);

        if (eventsError) {
            console.error('[TEST-TRACKING] Error fetching events:', eventsError);
            return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
        }


        return NextResponse.json({
            user: { id: user.id, email: user.email },
            trackedEventIds,
            availableEvents: allEvents,
            message: 'Tracking test completed'
        });

    } catch (error) {
        console.error('[TEST-TRACKING] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const { action, eventId } = body;


        if (action === 'track') {
            await UserEventService.trackEvent(user.id, eventId, 'bookmarked', undefined, supabase);
        } else if (action === 'untrack') {
            await UserEventService.untrackEvent(user.id, eventId, supabase);
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // Get updated tracked event IDs
        const trackedEventIds = await UserEventService.getAllTrackedEventIds(user.id, supabase);

        return NextResponse.json({
            success: true,
            action,
            eventId,
            trackedEventIds,
            message: `Event ${action}ed successfully`
        });

    } catch (error) {
        console.error('[TEST-TRACKING] Error in POST:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: errorMessage || 'Internal server error' }, { status: 500 });
    }
}