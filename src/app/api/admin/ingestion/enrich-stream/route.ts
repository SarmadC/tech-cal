import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import pLimit from 'p-limit';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import { LLMEnrichmentService } from '@/services/ingestion/LLMEnrichmentService';

export const runtime = 'nodejs';

// Limit concurrent LLM API calls to avoid rate limiting
const CONCURRENT_LIMIT = 5;

interface StreamProgress {
    type: 'progress' | 'complete' | 'error';
    completed: number;
    total: number;
    currentEventId?: string;
    currentEventTitle?: string;
    result?: {
        eventId: string;
        status: 'enriched' | 'failed';
        error?: string;
    };
    summary?: {
        succeeded: number;
        failed: number;
    };
    error?: string;
}

/**
 * POST /api/admin/ingestion/enrich-stream
 *
 * SSE streaming endpoint for bulk enrichment (with web scraping) with real-time progress updates.
 * Processes events in parallel with concurrency limit and streams progress.
 *
 * Body:
 * - eventIds: string[] - Event IDs to process
 *
 * Response: Server-Sent Events stream with progress updates
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { eventIds, provider, model } = (await request.json()) as {
            eventIds: string[];
            provider?: string;
            model?: string;
        };

        if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
            return new Response(JSON.stringify({ error: 'eventIds array is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return new Response(JSON.stringify({ error: 'Service role credentials not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);
        const enrichmentService = new LLMEnrichmentService(serviceClient, {
            provider,
            model,
        });

        // Fetch event titles for better progress display
        const { data: events } = await serviceClient
            .from('events')
            .select('id, title')
            .in('id', eventIds);

        const eventTitleMap = new Map((events ?? []).map(e => [e.id, e.title ?? 'Untitled']));

        const encoder = new TextEncoder();
        let completed = 0;
        let succeeded = 0;
        let failed = 0;

        const stream = new ReadableStream({
            async start(controller) {
                const sendProgress = (data: StreamProgress) => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                };

                try {
                    const concurrencyLimiter = pLimit(CONCURRENT_LIMIT);

                    await Promise.all(
                        eventIds.map((eventId) =>
                            concurrencyLimiter(async () => {
                                const title = eventTitleMap.get(eventId) ?? 'Unknown';

                                // Send in-progress update
                                sendProgress({
                                    type: 'progress',
                                    completed,
                                    total: eventIds.length,
                                    currentEventId: eventId,
                                    currentEventTitle: title,
                                });

                                const result = await enrichmentService.processEvent(eventId);

                                completed++;
                                if (result.status === 'enriched') {
                                    succeeded++;
                                } else {
                                    failed++;
                                }

                                // Send completion update for this event
                                sendProgress({
                                    type: 'progress',
                                    completed,
                                    total: eventIds.length,
                                    currentEventId: eventId,
                                    currentEventTitle: title,
                                    result: {
                                        eventId,
                                        status: result.status,
                                        error: result.error,
                                    },
                                });
                            })
                        )
                    );

                    // Send final completion message
                    sendProgress({
                        type: 'complete',
                        completed: eventIds.length,
                        total: eventIds.length,
                        summary: { succeeded, failed },
                    });

                    controller.close();
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    Sentry.captureException(error, { extra: { route: 'admin/ingestion/enrich-stream' } });

                    sendProgress({
                        type: 'error',
                        completed,
                        total: eventIds.length,
                        error: message,
                    });

                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Admin enrichment stream failed:', message);
        Sentry.captureException(error, { extra: { route: 'admin/ingestion/enrich-stream' } });
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
