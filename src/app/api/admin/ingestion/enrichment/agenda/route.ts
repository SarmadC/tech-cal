/**
 * API Route: Event Agenda Enrichment
 * 
 * POST: Create or update agenda items for an event
 * DELETE: Remove agenda items for an event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
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

        // Use service client to bypass RLS for agenda operations
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase service credentials');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

        const result = await EventEnrichmentService.createOrUpdateAgendaItems(
            eventId,
            items,
            serviceClient,
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

        // Use service client to bypass RLS for agenda operations
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase service credentials');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

        // Get agenda IDs for this event
        const { data: agendaItems } = await serviceClient
            .from('event_agenda')
            .select('id')
            .eq('event_id', eventId);

        if (agendaItems && agendaItems.length > 0) {
            const agendaIds = agendaItems.map(a => a.id);

            // Delete agenda_speakers links
            await serviceClient
                .from('agenda_speakers')
                .delete()
                .in('agenda_id', agendaIds);

            // Delete agenda items
            await serviceClient
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

