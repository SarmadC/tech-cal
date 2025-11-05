/**
 * API Route: Update Review Queue
 * 
 * GET: List pending updates with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';
import type { Database } from '@/types/supabase';

type EventRow = Database['public']['Tables']['events']['Row'];
type OrganizerRow = Database['public']['Tables']['organizers']['Row'];

interface EventUpdateQueueRow {
    id: string;
    event_id: string | null;
    source_event_id: string | null;
    status: string;
    created_at: string;
    updated_at?: string | null;
    auto_applied_fields?: Record<string, unknown> | null;
    proposed_changes?: Record<string, unknown> | null;
    protection_summary?: Record<string, unknown> | null;
    field_summary?: Record<string, unknown> | null;
    review_notes?: string | null;
    [key: string]: unknown;
}

interface EventUpdateQueueFieldRow {
    id: string;
    queue_id: string;
    field_name: string;
    field_status: string;
    old_value?: unknown;
    new_value?: unknown;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}

interface EventSummary {
    id: string;
    title: string | null;
    start_time: string;
    organizer_id: string | null;
    organizer: Pick<OrganizerRow, 'id' | 'name'> | null;
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableClient = supabase as any;

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin access
        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Parse query parameters
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status') || 'pending';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
        const offset = (page - 1) * pageSize;

        // Fetch queue items with event details
        // Use simpler query first to avoid join issues
        let query = tableClient
            .from('event_update_queue')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: queueItems, error: queueError } = await query;

        if (queueError) {
            throw new Error(`Failed to fetch queue items: ${queueError.message}`);
        }

        const typedQueueItems = (queueItems || []) as EventUpdateQueueRow[];

        // Fetch event details separately to avoid join issues
        const eventIds = typedQueueItems
            .map((item) => item.event_id)
            .filter((id): id is string => Boolean(id));
        const eventsMap: Record<string, EventSummary> = {};

        if (eventIds.length > 0) {
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('id, title, start_time, organizer_id')
                .in('id', eventIds);

            if (!eventsError && events) {
                // Fetch organizers separately
                const organizerIds = events.map(e => e.organizer_id).filter((id): id is string => Boolean(id));
                const organizersMap: Record<string, Pick<OrganizerRow, 'id' | 'name'>> = {};

                if (organizerIds.length > 0) {
                    const { data: organizers } = await supabase
                        .from('organizers')
                        .select('id, name')
                        .in('id', organizerIds);

                    if (organizers) {
                        organizers.forEach(org => {
                            organizersMap[org.id] = org;
                        });
                    }
                }

                const typedEvents = events as Array<Pick<EventRow, 'id' | 'title' | 'start_time' | 'organizer_id'>>;
                typedEvents.forEach(event => {
                    eventsMap[event.id] = {
                        id: event.id,
                        title: event.title,
                        start_time: event.start_time,
                        organizer_id: event.organizer_id,
                        organizer: event.organizer_id ? organizersMap[event.organizer_id] || null : null,
                    };
                });
            }
        }

        // Fetch field counts for each queue item
        const queueIds = typedQueueItems.map(item => item.id);
        const fieldCounts: Record<string, { total: number; pending: number; approved: number; rejected: number }> = {};

        if (queueIds.length > 0) {
            const { data: fieldStats, error: fieldError } = await tableClient
                .from('event_update_queue_fields')
                .select('queue_id, field_status')
                .in('queue_id', queueIds);

            if (!fieldError && fieldStats) {
                const typedStats = fieldStats as Array<Pick<EventUpdateQueueFieldRow, 'queue_id' | 'field_status'>>;
                for (const stat of typedStats) {
                    if (!fieldCounts[stat.queue_id]) {
                        fieldCounts[stat.queue_id] = { total: 0, pending: 0, approved: 0, rejected: 0 };
                    }
                    fieldCounts[stat.queue_id].total++;
                    if (stat.field_status === 'pending') fieldCounts[stat.queue_id].pending++;
                    if (stat.field_status === 'approved') fieldCounts[stat.queue_id].approved++;
                    if (stat.field_status === 'rejected') fieldCounts[stat.queue_id].rejected++;
                }
            }
        }

        // Get total count for pagination
        let countQuery = tableClient
            .from('event_update_queue')
            .select('id', { count: 'exact', head: true });

        if (status !== 'all') {
            countQuery = countQuery.eq('status', status);
        }

        const { count, error: countError } = await countQuery;

        if (countError) {
            throw new Error(`Failed to count queue items: ${countError.message}`);
        }

        // Enrich queue items with event details and field counts
        const enrichedItems = typedQueueItems.map(item => ({
            ...item,
            event: item.event_id ? eventsMap[item.event_id] || null : null,
            fieldCounts: fieldCounts[item.id] || { total: 0, pending: 0, approved: 0, rejected: 0 },
        }));

        return NextResponse.json({
            items: enrichedItems,
            pagination: {
                page,
                pageSize,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / pageSize),
            },
        });
    } catch (error) {
        console.error('Error fetching update queue:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

