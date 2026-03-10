import { logger } from '@/utils/logger';
/**
 * API Route: Update Review Queue
 * 
 * GET: List pending updates with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient, type SupabaseClientType } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import type { Database } from '@/types/supabase';
import {
    matchesUpdateQueueSearch,
    normalizeUpdateQueueSearch,
} from './searchUtils';

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

interface EventUpdateQueueCandidateRow {
    id: string;
    event_id: string | null;
    source_event_id: string | null;
    status: string;
    created_at: string;
}

interface FieldCountSummary {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
}

const SEARCH_BATCH_SIZE = 1000;
const EMPTY_FIELD_COUNTS: FieldCountSummary = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
};

const uniqueValues = (values: Array<string | null | undefined>): string[] =>
    Array.from(new Set(values.filter((value): value is string => Boolean(value))));

const buildEventSummaries = async (
    serviceClient: SupabaseClientType,
    eventIds: Array<string | null | undefined>,
): Promise<Record<string, EventSummary>> => {
    const uniqueEventIds = uniqueValues(eventIds);
    if (uniqueEventIds.length === 0) {
        return {};
    }

    const { data: events, error: eventsError } = await serviceClient
        .from('events')
        .select('id, title, start_time, organizer_id')
        .in('id', uniqueEventIds);

    if (eventsError) {
        throw new Error(`Failed to fetch events for queue items: ${eventsError.message}`);
    }

    const organizerIds = uniqueValues((events ?? []).map((event) => event.organizer_id));
    const organizersMap: Record<string, Pick<OrganizerRow, 'id' | 'name'>> = {};

    if (organizerIds.length > 0) {
        const { data: organizers, error: organizersError } = await serviceClient
            .from('organizers')
            .select('id, name')
            .in('id', organizerIds);

        if (organizersError) {
            throw new Error(`Failed to fetch organizers for queue items: ${organizersError.message}`);
        }

        (organizers ?? []).forEach((organizer) => {
            organizersMap[organizer.id] = organizer;
        });
    }

    return ((events ?? []) as Array<Pick<EventRow, 'id' | 'title' | 'start_time' | 'organizer_id'>>)
        .reduce<Record<string, EventSummary>>((result, event) => {
            result[event.id] = {
                id: event.id,
                title: event.title,
                start_time: event.start_time,
                organizer_id: event.organizer_id,
                organizer: event.organizer_id ? organizersMap[event.organizer_id] || null : null,
            };
            return result;
        }, {});
};

const buildFieldCounts = async (
    serviceClient: SupabaseClientType,
    queueIds: Array<string | null | undefined>,
): Promise<Record<string, FieldCountSummary>> => {
    const uniqueQueueIds = uniqueValues(queueIds);
    if (uniqueQueueIds.length === 0) {
        return {};
    }

    const { data: fieldStats, error: fieldError } = await serviceClient
        .from('event_update_queue_fields')
        .select('queue_id, field_status')
        .in('queue_id', uniqueQueueIds);

    if (fieldError) {
        throw new Error(`Failed to fetch queue field stats: ${fieldError.message}`);
    }

    const fieldCounts: Record<string, FieldCountSummary> = {};
    ((fieldStats ?? []) as Array<Pick<EventUpdateQueueFieldRow, 'queue_id' | 'field_status'>>)
        .forEach((stat) => {
            if (!fieldCounts[stat.queue_id]) {
                fieldCounts[stat.queue_id] = { ...EMPTY_FIELD_COUNTS };
            }
            fieldCounts[stat.queue_id].total++;
            if (stat.field_status === 'pending') fieldCounts[stat.queue_id].pending++;
            if (stat.field_status === 'approved') fieldCounts[stat.queue_id].approved++;
            if (stat.field_status === 'rejected') fieldCounts[stat.queue_id].rejected++;
        });

    return fieldCounts;
};

const fetchSearchCandidates = async (
    serviceClient: SupabaseClientType,
    status: string,
): Promise<EventUpdateQueueCandidateRow[]> => {
    const candidates: EventUpdateQueueCandidateRow[] = [];
    let rangeStart = 0;

    while (true) {
        let query = serviceClient
            .from('event_update_queue')
            .select('id, event_id, source_event_id, status, created_at')
            .order('created_at', { ascending: false })
            .range(rangeStart, rangeStart + SEARCH_BATCH_SIZE - 1);

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) {
            throw new Error(`Failed to fetch searchable queue items: ${error.message}`);
        }

        const batch = (data ?? []) as EventUpdateQueueCandidateRow[];
        candidates.push(...batch);

        if (batch.length < SEARCH_BATCH_SIZE) {
            break;
        }

        rangeStart += SEARCH_BATCH_SIZE;
    }

    return candidates;
};

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

        // Use service client to bypass RLS for admin operations
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

        // Parse query parameters
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status') || 'pending';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
        const offset = (page - 1) * pageSize;
        const search = normalizeUpdateQueueSearch(searchParams.get('q'));

        let typedQueueItems: EventUpdateQueueRow[] = [];
        let totalCount = 0;
        let eventsMap: Record<string, EventSummary> = {};

        if (search) {
            const candidates = await fetchSearchCandidates(serviceClient, status);
            eventsMap = await buildEventSummaries(
                serviceClient,
                candidates.map((candidate) => candidate.event_id)
            );

            const filteredCandidates = candidates.filter((candidate) =>
                matchesUpdateQueueSearch(
                    {
                        eventId: candidate.event_id,
                        sourceEventId: candidate.source_event_id,
                        title: candidate.event_id ? eventsMap[candidate.event_id]?.title : null,
                        organizerName: candidate.event_id
                            ? eventsMap[candidate.event_id]?.organizer?.name
                            : null,
                    },
                    search
                )
            );

            totalCount = filteredCandidates.length;

            const pagedCandidateIds = filteredCandidates
                .slice(offset, offset + pageSize)
                .map((candidate) => candidate.id);

            if (pagedCandidateIds.length > 0) {
                const { data: queueItems, error: queueError } = await serviceClient
                    .from('event_update_queue')
                    .select('*')
                    .in('id', pagedCandidateIds);

                if (queueError) {
                    throw new Error(`Failed to fetch queue items: ${queueError.message}`);
                }

                const queueItemsById = new Map(
                    ((queueItems ?? []) as EventUpdateQueueRow[]).map((item) => [item.id, item])
                );
                typedQueueItems = pagedCandidateIds
                    .map((id) => queueItemsById.get(id))
                    .filter((item): item is EventUpdateQueueRow => Boolean(item));
            }
        } else {
            let query = serviceClient
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

            typedQueueItems = (queueItems ?? []) as EventUpdateQueueRow[];

            let countQuery = serviceClient
                .from('event_update_queue')
                .select('id', { count: 'exact', head: true });

            if (status !== 'all') {
                countQuery = countQuery.eq('status', status);
            }

            const { count, error: countError } = await countQuery;

            if (countError) {
                throw new Error(`Failed to count queue items: ${countError.message}`);
            }

            totalCount = count || 0;
            eventsMap = await buildEventSummaries(
                serviceClient,
                typedQueueItems.map((item) => item.event_id)
            );
        }

        const queueIds = typedQueueItems.map((item) => item.id);
        const fieldCounts = await buildFieldCounts(serviceClient, queueIds);

        // Enrich queue items with event details and field counts
        const enrichedItems = typedQueueItems.map(item => ({
            ...item,
            event: item.event_id ? eventsMap[item.event_id] || null : null,
            fieldCounts: fieldCounts[item.id] || EMPTY_FIELD_COUNTS,
        }));

        return NextResponse.json({
            items: enrichedItems,
            pagination: {
                page,
                pageSize,
                total: totalCount,
                totalPages: Math.ceil(totalCount / pageSize),
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

export async function DELETE(_request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Use service client to bypass RLS for admin operations
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableClient = serviceClient as any;

        const { data: pendingItems, error: fetchError } = await tableClient
            .from('event_update_queue')
            .select('id')
            .eq('status', 'pending');

        if (fetchError) {
            throw new Error(`Failed to fetch pending queue items: ${fetchError.message}`);
        }

        const pendingIds = (pendingItems || []).map((item: { id: string }) => item.id);

        if (pendingIds.length === 0) {
            return NextResponse.json({ cleared: 0 });
        }

        // Delete fields first (foreign key constraint)
        const { data: deletedFields, error: fieldsError } = await tableClient
            .from('event_update_queue_fields')
            .delete()
            .in('queue_id', pendingIds)
            .select('id');

        if (fieldsError) {
            console.error('Fields delete error:', fieldsError);
            throw new Error(`Failed to delete queue fields: ${fieldsError.message}`);
        }

        logger.debug(`Deleted ${deletedFields?.length ?? 0} field records`);

        // Delete queue items
        const { data: deletedItems, error: queueDeleteError } = await tableClient
            .from('event_update_queue')
            .delete()
            .in('id', pendingIds)
            .select('id');

        if (queueDeleteError) {
            console.error('Queue delete error:', queueDeleteError);
            throw new Error(`Failed to delete queue items: ${queueDeleteError.message}`);
        }

        const actuallyDeleted = deletedItems?.length ?? 0;
        logger.debug(`Deleted ${actuallyDeleted} of ${pendingIds.length} queue items`);

        if (actuallyDeleted === 0 && pendingIds.length > 0) {
            console.warn('No items were deleted - check RLS policies on event_update_queue table');
        }

        return NextResponse.json({
            cleared: actuallyDeleted,
        });
    } catch (error) {
        console.error('Error clearing pending queue items:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
