import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import type { EnrichmentMetadata } from '@/types/enrichment';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ReviewQueueRow {
    id: string;
    event_id: string | null;
    status: string;
    created_at: string;
}

interface ReviewQueueReference {
    id: string;
    status: string;
}

interface EnrichmentEventRow {
    id: string;
    title: string | null;
    start_time: string | null;
    source_url: string | null;
    ingestion_source_id: string | null;
    enrichment_status: string | null;
    enrichment_metadata: unknown;
    updated_at: string | null;
}

interface EnrichmentMetrics {
    futurePending: number;
    pastPending: number;
    unscheduledPending: number;
    reviewPending: number;
    duplicateReviewEntries: number;
    latestEnrichedAt: string | null;
    oldestPendingCreatedAt: string | null;
    oldestPendingAgeDays: number | null;
}

type DashboardStatusFilter = 'all' | 'pending' | 'processing' | 'enriched' | 'failed';

interface FilterableQuery<T> {
    eq(column: string, value: string): T;
    or(filters: string): T;
}

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 100;
const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
} as const;
const DASHBOARD_STATUS_FILTERS: DashboardStatusFilter[] = [
    'all',
    'pending',
    'processing',
    'enriched',
    'failed',
];

const jsonNoStore = (body: unknown, init: ResponseInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set('Cache-Control', NO_STORE_HEADERS['Cache-Control']);

    return NextResponse.json(body, {
        ...init,
        headers,
    });
};

const getReviewQueueMap = (queueRows: ReviewQueueRow[]) => {
    const reviewQueueByEvent = new Map<string, ReviewQueueReference>();

    for (const row of queueRows) {
        if (!row.event_id || reviewQueueByEvent.has(row.event_id)) {
            continue;
        }
        reviewQueueByEvent.set(row.event_id, {
            id: row.id,
            status: row.status,
        });
    }

    return reviewQueueByEvent;
};

const sanitizeSearchValue = (value: string | null): string => {
    if (!value) {
        return '';
    }

    return value
        .trim()
        .replace(/[%]/g, '')
        .replace(/,/g, ' ')
        .replace(/\s+/g, ' ');
};

const parseStatusFilter = (value: string | null): DashboardStatusFilter => {
    if (value && DASHBOARD_STATUS_FILTERS.includes(value as DashboardStatusFilter)) {
        return value as DashboardStatusFilter;
    }

    return 'pending';
};

const parsePositiveInt = (value: string | null, fallback: number): number => {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isUuid = (value: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const applyEventFilters = <T extends FilterableQuery<T>>(
    query: T,
    status: DashboardStatusFilter,
    search: string,
) => {
    let nextQuery = query;

    if (status !== 'all') {
        nextQuery = nextQuery.eq('enrichment_status', status);
    }

    if (search) {
        const pattern = `%${search}%`;
        const filters = [
            `title.ilike.${pattern}`,
            `source_url.ilike.${pattern}`,
        ];

        if (isUuid(search)) {
            filters.push(`id.eq.${search}`, `ingestion_source_id.eq.${search}`);
        }

        nextQuery = nextQuery.or(filters.join(','));
    }

    return nextQuery;
};

const buildPendingAgeDays = (createdAt: string | null, now: Date): number | null => {
    if (!createdAt) {
        return null;
    }

    return Math.max(
        0,
        Math.floor((now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
    );
};

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return jsonNoStore({ error: 'Forbidden' }, { status: 403 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return jsonNoStore(
                { error: 'Service role credentials not configured' },
                { status: 500 }
            );
        }

        const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);
        const status = parseStatusFilter(request.nextUrl.searchParams.get('status'));
        const search = sanitizeSearchValue(request.nextUrl.searchParams.get('search'));
        const page = parsePositiveInt(request.nextUrl.searchParams.get('page'), 1);
        const requestedPageSize = parsePositiveInt(
            request.nextUrl.searchParams.get('pageSize') ?? request.nextUrl.searchParams.get('limit'),
            DEFAULT_PAGE_SIZE
        );
        const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
        const rangeStart = (page - 1) * pageSize;
        const rangeEnd = rangeStart + pageSize - 1;
        
        let sortColumn = request.nextUrl.searchParams.get('sort') || 'created_at';
        const sortDir = request.nextUrl.searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
        
        // whitelist sortable columns
        const allowedSortCols = ['created_at', 'updated_at', 'title', 'start_time', 'enrichment_status', 'source_url'];
        if (!allowedSortCols.includes(sortColumn)) {
            sortColumn = 'created_at';
        }

        const now = new Date();
        const nowIso = now.toISOString();

        const eventsQuery = applyEventFilters(
            serviceClient
                .from('events')
                .select(
                    'id, title, start_time, source_url, ingestion_source_id, enrichment_status, enrichment_metadata, updated_at',
                    { count: 'exact' }
                )
                .order(sortColumn, { ascending: sortDir === 'asc' })
                .range(rangeStart, rangeEnd),
            status,
            search
        );

        const buildStatusCountQuery = (filter: DashboardStatusFilter) =>
            applyEventFilters(
                serviceClient.from('events').select('id', { count: 'exact', head: true }),
                filter,
                search
            );

        const [
            eventsResult,
            futurePendingResult,
            pastPendingResult,
            unscheduledPendingResult,
            oldestPendingResult,
            latestEnrichedResult,
            queueMetricsResult,
            allCountResult,
            pendingCountResult,
            processingCountResult,
            enrichedCountResult,
            failedCountResult,
        ] = await Promise.all([
            eventsQuery,
            serviceClient
                .from('events')
                .select('id', { count: 'exact', head: true })
                .eq('enrichment_status', 'pending')
                .gte('start_time', nowIso),
            serviceClient
                .from('events')
                .select('id', { count: 'exact', head: true })
                .eq('enrichment_status', 'pending')
                .lt('start_time', nowIso),
            serviceClient
                .from('events')
                .select('id', { count: 'exact', head: true })
                .eq('enrichment_status', 'pending')
                .is('start_time', null),
            serviceClient
                .from('events')
                .select('created_at')
                .eq('enrichment_status', 'pending')
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle(),
            serviceClient
                .from('events')
                .select('updated_at')
                .eq('enrichment_status', 'enriched')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
            serviceClient
                .from('event_update_queue')
                .select('id, event_id, status, created_at')
                .eq('queue_type', 'llm_enrichment')
                .order('created_at', { ascending: false })
                .limit(10000),
            buildStatusCountQuery('all'),
            buildStatusCountQuery('pending'),
            buildStatusCountQuery('processing'),
            buildStatusCountQuery('enriched'),
            buildStatusCountQuery('failed'),
        ]);

        const resultsWithErrors = [
            eventsResult,
            futurePendingResult,
            pastPendingResult,
            unscheduledPendingResult,
            oldestPendingResult,
            latestEnrichedResult,
            queueMetricsResult,
            allCountResult,
            pendingCountResult,
            processingCountResult,
            enrichedCountResult,
            failedCountResult,
        ];

        const firstError = resultsWithErrors.find(
            (result) => 'error' in result && result.error
        ) as { error?: { message: string } } | undefined;

        if (firstError?.error) {
            return jsonNoStore({ error: firstError.error.message }, { status: 500 });
        }

        const events = (eventsResult.data ?? []) as EnrichmentEventRow[];
        const queueMetricRows = (queueMetricsResult.data ?? []) as ReviewQueueRow[];
        const pageEventIds = events.map((event) => event.id);

        const pageQueueResult = pageEventIds.length > 0
            ? await serviceClient
                .from('event_update_queue')
                .select('id, event_id, status, created_at')
                .eq('queue_type', 'llm_enrichment')
                .in('event_id', pageEventIds)
                .order('created_at', { ascending: false })
                .limit(1000)
            : { data: [] as ReviewQueueRow[], error: null };

        if (pageQueueResult.error) {
            return jsonNoStore({ error: pageQueueResult.error.message }, { status: 500 });
        }

        const reviewQueueByEvent = getReviewQueueMap((pageQueueResult.data ?? []) as ReviewQueueRow[]);

        const responseEvents = events.map((event) => ({
            id: event.id,
            title: event.title ?? 'Untitled',
            start_time: event.start_time,
            source_url: event.source_url ?? '',
            ingestion_source_id: event.ingestion_source_id,
            enrichment_status: event.enrichment_status ?? 'pending',
            enrichment_metadata: (event.enrichment_metadata as EnrichmentMetadata | null) ?? null,
            updated_at: event.updated_at,
            review_status: reviewQueueByEvent.get(event.id)?.status ?? null,
            review_queue_id: reviewQueueByEvent.get(event.id)?.id ?? null,
        }));

        const distinctQueuedEvents = new Set(
            queueMetricRows
                .map((row) => row.event_id)
                .filter((eventId): eventId is string => Boolean(eventId))
        );
        const reviewPending = new Set(
            queueMetricRows
                .filter((row) => ['pending', 'partially_approved'].includes(row.status))
                .map((row) => row.event_id)
                .filter((eventId): eventId is string => Boolean(eventId))
        ).size;

        const oldestPendingCreatedAt = oldestPendingResult.data?.created_at ?? null;

        const metrics: EnrichmentMetrics = {
            futurePending: futurePendingResult.count ?? 0,
            pastPending: pastPendingResult.count ?? 0,
            unscheduledPending: unscheduledPendingResult.count ?? 0,
            reviewPending,
            duplicateReviewEntries: queueMetricRows.length - distinctQueuedEvents.size,
            latestEnrichedAt: latestEnrichedResult.data?.updated_at ?? null,
            oldestPendingCreatedAt,
            oldestPendingAgeDays: buildPendingAgeDays(oldestPendingCreatedAt, now),
        };

        return jsonNoStore({
            events: responseEvents,
            total: eventsResult.count ?? responseEvents.length,
            page,
            pageSize,
            statusCounts: {
                all: allCountResult.count ?? 0,
                pending: pendingCountResult.count ?? 0,
                processing: processingCountResult.count ?? 0,
                enriched: enrichedCountResult.count ?? 0,
                failed: failedCountResult.count ?? 0,
            },
            metrics,
        });
    } catch (error) {
        console.error('[enrichment-status] Unexpected error', error);
        return jsonNoStore(
            {
                error: error instanceof Error ? error.message : 'Unexpected error fetching enrichment status',
            },
            { status: 500 }
        );
    }
}
