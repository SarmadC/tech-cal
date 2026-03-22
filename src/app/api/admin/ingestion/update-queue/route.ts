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
    compareUpdateQueueItems,
    deriveUpdateQueueSignals,
    matchesSignalFilter,
    sortChangedFieldNames,
    type UpdateQueueSignalKey,
    type UpdateQueueSignals,
} from '@/lib/admin/updateQueueTriage';
import {
    matchesUpdateQueueSearch,
    normalizeUpdateQueueSearch,
} from './searchUtils';

type EventRow = Database['public']['Tables']['events']['Row'];
type OrganizerRow = Database['public']['Tables']['organizers']['Row'];

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
    start_time: string | null;
    organizer_id: string | null;
    organizer: Pick<OrganizerRow, 'id' | 'name'> | null;
}

interface EventUpdateQueueCandidateRow {
    id: string;
    event_id: string | null;
    source_event_id: string | null;
    status: string;
    created_at: string;
    requires_review_reason: string | null;
}

interface FieldCountSummary {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
}

interface QueueFieldMeta {
    counts: FieldCountSummary;
    changedFieldNames: string[];
}

interface EnrichedQueueItem extends EventUpdateQueueCandidateRow {
    event: EventSummary | null;
    fieldCounts: FieldCountSummary;
    changedFieldNames: string[];
    signals: UpdateQueueSignals;
}

const SEARCH_BATCH_SIZE = 1000;
// Keep PostgREST `.in(...)` filters well below URL-length limits.
const ID_LOOKUP_BATCH_SIZE = 100;
const EMPTY_FIELD_COUNTS: FieldCountSummary = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
};

const uniqueValues = (values: Array<string | null | undefined>): string[] =>
    Array.from(new Set(values.filter((value): value is string => Boolean(value))));

const chunk = <T,>(values: T[], size: number): T[][] => {
    const batches: T[][] = [];
    for (let i = 0; i < values.length; i += size) {
        batches.push(values.slice(i, i + size));
    }
    return batches;
};

const buildEventSummaries = async (
    serviceClient: SupabaseClientType,
    eventIds: Array<string | null | undefined>,
): Promise<Record<string, EventSummary>> => {
    const uniqueEventIds = uniqueValues(eventIds);
    if (uniqueEventIds.length === 0) {
        return {};
    }

    const events: Array<Pick<EventRow, 'id' | 'title' | 'start_time' | 'organizer_id'>> = [];

    for (const eventIdBatch of chunk(uniqueEventIds, ID_LOOKUP_BATCH_SIZE)) {
        const { data: eventBatch, error: eventsError } = await serviceClient
            .from('events')
            .select('id, title, start_time, organizer_id')
            .in('id', eventIdBatch);

        if (eventsError) {
            throw new Error(`Failed to fetch events for queue items: ${eventsError.message}`);
        }

        events.push(...((eventBatch ?? []) as Array<Pick<EventRow, 'id' | 'title' | 'start_time' | 'organizer_id'>>));
    }

    const organizerIds = uniqueValues(events.map((event) => event.organizer_id));
    const organizersMap: Record<string, Pick<OrganizerRow, 'id' | 'name'>> = {};

    for (const organizerIdBatch of chunk(organizerIds, ID_LOOKUP_BATCH_SIZE)) {
        const { data: organizers, error: organizersError } = await serviceClient
            .from('organizers')
            .select('id, name')
            .in('id', organizerIdBatch);

        if (organizersError) {
            throw new Error(`Failed to fetch organizers for queue items: ${organizersError.message}`);
        }

        (organizers ?? []).forEach((organizer) => {
            organizersMap[organizer.id] = organizer;
        });
    }

    return events.reduce<Record<string, EventSummary>>((result, event) => {
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

const buildQueueFieldMeta = async (
    serviceClient: SupabaseClientType,
    queueIds: Array<string | null | undefined>,
): Promise<Record<string, QueueFieldMeta>> => {
    const uniqueQueueIds = uniqueValues(queueIds);
    if (uniqueQueueIds.length === 0) {
        return {};
    }

    const fieldMeta: Record<string, QueueFieldMeta> = {};

    for (const queueIdBatch of chunk(uniqueQueueIds, ID_LOOKUP_BATCH_SIZE)) {
        const { data: fieldStats, error: fieldError } = await serviceClient
            .from('event_update_queue_fields')
            .select('queue_id, field_status, field_name')
            .in('queue_id', queueIdBatch);

        if (fieldError) {
            throw new Error(`Failed to fetch queue field stats: ${fieldError.message}`);
        }

        ((fieldStats ?? []) as Array<Pick<EventUpdateQueueFieldRow, 'queue_id' | 'field_status' | 'field_name'>>)
            .forEach((stat) => {
                if (!fieldMeta[stat.queue_id]) {
                    fieldMeta[stat.queue_id] = {
                        counts: { ...EMPTY_FIELD_COUNTS },
                        changedFieldNames: [],
                    };
                }

                fieldMeta[stat.queue_id].counts.total++;
                if (stat.field_status === 'pending') fieldMeta[stat.queue_id].counts.pending++;
                if (stat.field_status === 'approved') fieldMeta[stat.queue_id].counts.approved++;
                if (stat.field_status === 'rejected') fieldMeta[stat.queue_id].counts.rejected++;
                fieldMeta[stat.queue_id].changedFieldNames.push(stat.field_name);
            });
    }

    Object.values(fieldMeta).forEach((meta) => {
        meta.changedFieldNames = sortChangedFieldNames(meta.changedFieldNames);
    });

    return fieldMeta;
};

const fetchQueueCandidates = async (
    serviceClient: SupabaseClientType,
    status: string,
): Promise<EventUpdateQueueCandidateRow[]> => {
    const candidates: EventUpdateQueueCandidateRow[] = [];
    let rangeStart = 0;

    while (true) {
        let query = serviceClient
            .from('event_update_queue')
            .select('id, event_id, source_event_id, status, created_at, requires_review_reason')
            .eq('queue_type', 'ingestion_update')
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
        const signal = searchParams.get('signal') as UpdateQueueSignalKey | null;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
        const offset = (page - 1) * pageSize;
        const search = normalizeUpdateQueueSearch(searchParams.get('q'));
        const sortParamRaw = searchParams.get('sort');
        const sort = (sortParamRaw === 'created_at'
            || sortParamRaw === 'event_start_time'
            || sortParamRaw === 'pending_fields'
            || sortParamRaw === 'status')
            ? sortParamRaw
            : 'event_start_time';
        const directionParam = searchParams.get('direction');
        const direction = directionParam === 'desc'
            ? 'desc'
            : directionParam === 'asc'
                ? 'asc'
                : sort === 'created_at'
                    ? 'desc'
                    : 'asc';

        const candidates = await fetchQueueCandidates(serviceClient, status);
        const eventsMap = await buildEventSummaries(
            serviceClient,
            candidates.map((candidate) => candidate.event_id)
        );
        const fieldMeta = await buildQueueFieldMeta(
            serviceClient,
            candidates.map((candidate) => candidate.id)
        );

        const enrichedItems: EnrichedQueueItem[] = candidates.map((item) => {
            const itemFieldMeta = fieldMeta[item.id];
            const changedFieldNames = itemFieldMeta?.changedFieldNames ?? [];
            const signals = deriveUpdateQueueSignals({
                requiresReviewReason: item.requires_review_reason,
                eventStartTime: item.event_id ? eventsMap[item.event_id]?.start_time : null,
                fieldNames: changedFieldNames,
            });

            return {
                ...item,
                event: item.event_id ? eventsMap[item.event_id] || null : null,
                fieldCounts: itemFieldMeta?.counts ?? { ...EMPTY_FIELD_COUNTS },
                changedFieldNames,
                signals,
            };
        });

        const filteredItems = enrichedItems
            .filter((candidate) => {
                if (!matchesSignalFilter(candidate.signals, signal)) {
                    return false;
                }

                if (!search) {
                    return true;
                }

                return matchesUpdateQueueSearch(
                    {
                        eventId: candidate.event_id,
                        sourceEventId: candidate.source_event_id,
                        title: candidate.event?.title ?? null,
                        organizerName: candidate.event?.organizer?.name ?? null,
                    },
                    search
                );
            })
            .sort((left, right) => compareUpdateQueueItems(left, right, sort, direction));

        const totalCount = filteredItems.length;
        const pagedItems = filteredItems.slice(offset, offset + pageSize);

        return NextResponse.json({
            items: pagedItems,
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
            .eq('queue_type', 'ingestion_update')
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
