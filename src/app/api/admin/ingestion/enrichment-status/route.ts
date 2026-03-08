import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import type { EnrichmentMetadata } from '@/types/enrichment';

interface ReviewQueueRow {
    event_id: string | null;
    status: string;
    created_at: string;
}

interface PendingEventMetricRow {
    id: string;
    start_time: string | null;
    created_at: string;
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

const getReviewStatusMap = (queueRows: ReviewQueueRow[]) => {
    const reviewStatusByEvent = new Map<string, string>();

    for (const row of queueRows) {
        if (!row.event_id || reviewStatusByEvent.has(row.event_id)) {
            continue;
        }
        reviewStatusByEvent.set(row.event_id, row.status);
    }

    return reviewStatusByEvent;
};

const buildPendingMetrics = (rows: PendingEventMetricRow[], now: Date): Pick<EnrichmentMetrics, 'futurePending' | 'pastPending' | 'unscheduledPending' | 'oldestPendingCreatedAt' | 'oldestPendingAgeDays'> => {
    let futurePending = 0;
    let pastPending = 0;
    let unscheduledPending = 0;
    let oldestPendingCreatedAt: string | null = null;

    for (const row of rows) {
        if (!oldestPendingCreatedAt || row.created_at < oldestPendingCreatedAt) {
            oldestPendingCreatedAt = row.created_at;
        }

        if (!row.start_time) {
            unscheduledPending++;
            continue;
        }

        const startTime = new Date(row.start_time);
        if (Number.isNaN(startTime.getTime()) || startTime.getTime() >= now.getTime()) {
            futurePending++;
        } else {
            pastPending++;
        }
    }

    const oldestPendingAgeDays = oldestPendingCreatedAt
        ? Math.max(
            0,
            Math.floor((now.getTime() - new Date(oldestPendingCreatedAt).getTime()) / (1000 * 60 * 60 * 24))
        )
        : null;

    return {
        futurePending,
        pastPending,
        unscheduledPending,
        oldestPendingCreatedAt,
        oldestPendingAgeDays,
    };
};

export async function GET(request: NextRequest) {
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json(
            { error: 'Service role credentials not configured' },
            { status: 500 }
        );
    }

    const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);
    const statusParam = request.nextUrl.searchParams.get('status') || 'pending';
    const limitParam = Number.parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(limitParam) ? limitParam : 50;

    let eventsQuery = serviceClient
        .from('events')
        .select(
            'id, title, start_time, source_url, ingestion_source_id, enrichment_status, enrichment_metadata, updated_at, created_at',
            { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .limit(limit);

    if (statusParam !== 'all') {
        eventsQuery = eventsQuery.eq('enrichment_status', statusParam);
    }

    const now = new Date();
    const [eventsResult, pendingResult, latestEnrichedResult, llmQueueResult] = await Promise.all([
        eventsQuery,
        serviceClient
            .from('events')
            .select('id, start_time, created_at')
            .eq('enrichment_status', 'pending')
            .limit(5000),
        serviceClient
            .from('events')
            .select('updated_at')
            .eq('enrichment_status', 'enriched')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        serviceClient
            .from('event_update_queue')
            .select('event_id, status, created_at')
            .eq('requires_review_reason', 'llm_enrichment')
            .order('created_at', { ascending: false })
            .limit(5000),
    ]);

    if (eventsResult.error) {
        return NextResponse.json({ error: eventsResult.error.message }, { status: 500 });
    }

    if (pendingResult.error) {
        return NextResponse.json({ error: pendingResult.error.message }, { status: 500 });
    }

    if (latestEnrichedResult.error) {
        return NextResponse.json({ error: latestEnrichedResult.error.message }, { status: 500 });
    }

    if (llmQueueResult.error) {
        return NextResponse.json({ error: llmQueueResult.error.message }, { status: 500 });
    }

    const events = eventsResult.data || [];
    const queueRows = (llmQueueResult.data || []) as ReviewQueueRow[];
    const reviewStatusByEvent = getReviewStatusMap(queueRows);
    const pendingRows = (pendingResult.data || []) as PendingEventMetricRow[];
    const pendingMetrics = buildPendingMetrics(pendingRows, now);

    const distinctQueuedEvents = new Set(
        queueRows
            .map((row) => row.event_id)
            .filter((eventId): eventId is string => Boolean(eventId))
    );
    const reviewPending = new Set(
        queueRows
            .filter((row) => ['pending', 'partially_approved'].includes(row.status))
            .map((row) => row.event_id)
            .filter((eventId): eventId is string => Boolean(eventId))
    ).size;

    const responseEvents = events.map((event) => ({
        ...event,
        review_status: reviewStatusByEvent.get(event.id) ?? null,
        enrichment_metadata: (event.enrichment_metadata as EnrichmentMetadata | null) ?? null,
    }));

    const metrics: EnrichmentMetrics = {
        ...pendingMetrics,
        reviewPending,
        duplicateReviewEntries: queueRows.length - distinctQueuedEvents.size,
        latestEnrichedAt: latestEnrichedResult.data?.updated_at ?? null,
        oldestPendingCreatedAt: pendingMetrics.oldestPendingCreatedAt,
        oldestPendingAgeDays: pendingMetrics.oldestPendingAgeDays,
    };

    return NextResponse.json({
        events: responseEvents,
        total: eventsResult.count ?? responseEvents.length,
        metrics,
    });
}
