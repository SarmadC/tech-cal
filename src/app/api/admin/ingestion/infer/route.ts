import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import { LLMEnrichmentService } from '@/services/ingestion/LLMEnrichmentService';

export const runtime = 'nodejs';

/**
 * POST /api/admin/ingestion/infer
 * 
 * Trigger LLM inference mode for events (no web scraping required)
 * Generates descriptions and infers tags from event title and metadata
 * 
 * Body:
 * - eventIds?: string[] - Specific event IDs to process (if omitted, processes batch)
 * - limit?: number - Max events to process in batch mode (default: 20)
 */
export async function POST(request: NextRequest) {
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

        const { eventIds, limit = 20 } = (await request.json()) as {
            eventIds?: string[];
            limit?: number;
        };

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Service role credentials not configured' },
                { status: 500 }
            );
        }

        const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);
        const enrichmentService = new LLMEnrichmentService(serviceClient);

        // If specific eventIds provided, process them individually
        if (eventIds && Array.isArray(eventIds) && eventIds.length > 0) {
            const results = [];
            for (const eventId of eventIds) {
                // eslint-disable-next-line no-await-in-loop
                const result = await enrichmentService.processEventInference(eventId);
                results.push(result);
            }

            const succeeded = results.filter((r) => r.status === 'enriched').length;
            const failed = results.length - succeeded;

            return NextResponse.json({
                success: true,
                mode: 'inference',
                processed: results.length,
                results,
                summary: { succeeded, failed },
            });
        }

        // Otherwise, process a batch of events needing inference
        const batchResult = await enrichmentService.processInferenceBatch(limit);

        return NextResponse.json({
            success: true,
            mode: 'inference',
            ...batchResult,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Admin inference trigger failed:', message);
        Sentry.captureException(error, { extra: { route: 'admin/ingestion/infer' } });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * GET /api/admin/ingestion/infer
 * 
 * Get stats on events that need inference
 */
export async function GET() {
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

        // Count events that could benefit from inference
        const { count: missingDescriptionCount } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'confirmed')
            .or('description.is.null,description.eq.')
            .not('title', 'is', null);

        // Count events with tags
        const { data: eventsWithTags } = await supabase
            .from('event_tag_relations')
            .select('event_id')
            .limit(10000);

        const uniqueEventsWithTags = new Set((eventsWithTags ?? []).map(r => r.event_id)).size;

        // Total confirmed events
        const { count: totalEvents } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'confirmed');

        return NextResponse.json({
            success: true,
            stats: {
                totalEvents: totalEvents ?? 0,
                eventsWithTags: uniqueEventsWithTags,
                eventsWithoutTags: (totalEvents ?? 0) - uniqueEventsWithTags,
                eventsMissingDescription: missingDescriptionCount ?? 0,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Admin inference stats failed:', message);
        Sentry.captureException(error, { extra: { route: 'admin/ingestion/infer GET' } });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

