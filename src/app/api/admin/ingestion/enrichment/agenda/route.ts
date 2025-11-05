/**
 * API Route: Event Agenda Enrichment
 * 
 * POST: Create or update agenda items for an event
 * DELETE: Remove agenda items for an event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';
import { EventEnrichmentService, type AgendaItemInput } from '@/services/ingestion/EventEnrichmentService';

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
        const { eventId, items } = body as { eventId: string; items: AgendaItemInput[] };

        if (!eventId || !Array.isArray(items)) {
            return NextResponse.json(
                { error: 'Missing required fields: eventId, items' },
                { status: 400 }
            );
        }

        // Validate agenda items
        for (const item of items) {
            if (!item.title || !item.startTime || !item.endTime) {
                return NextResponse.json(
                    { error: 'Each agenda item must have title, startTime, and endTime' },
                    { status: 400 }
                );
            }
        }

        const result = await EventEnrichmentService.createOrUpdateAgendaItems(
            eventId,
            items,
            supabase,
            user.id
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to create agenda items' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            agendaItemIds: result.agendaItemIds,
        });
    } catch (error) {
        console.error('Error in agenda enrichment API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
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

        // Get agenda IDs for this event
        const { data: agendaItems } = await supabase
            .from('event_agenda')
            .select('id')
            .eq('event_id', eventId);

        if (agendaItems && agendaItems.length > 0) {
            const agendaIds = agendaItems.map(a => a.id);

            // Delete agenda_speakers links
            await supabase
                .from('agenda_speakers')
                .delete()
                .in('agenda_id', agendaIds);

            // Delete agenda items
            await supabase
                .from('event_agenda')
                .delete()
                .eq('event_id', eventId);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting agenda items:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

