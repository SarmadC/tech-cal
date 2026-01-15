/**
 * POST /api/admin/dlq/retry
 *
 * Admin-only endpoint to retry processing events from the Dead Letter Queue (DLQ).
 * Fetches events from subscription_events_dlq and attempts to process them using
 * the standard PaddleWebhookService logic.
 *
 * If processing succeeds, the event is removed from the DLQ.
 * If it fails again, it remains in the DLQ (or could be updated with new error).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import { processPaddleEvent, type PaddleWebhookEvent } from '@/services/paddleWebhookService';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin permission
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

        // Fetch events from DLQ (limit 50 per run)
        const { data: dlqEvents, error: fetchError } = await serviceClient
            .from('subscription_events_dlq')
            .select('*')
            .limit(50)
            .order('failed_at', { ascending: true });

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!dlqEvents || dlqEvents.length === 0) {
            return NextResponse.json({ 
                success: true, 
                message: 'No events in DLQ to process',
                processed: 0 
            });
        }

        let successCount = 0;
        let failCount = 0;
        const results = [];

        for (const dlqEvent of dlqEvents) {
            const eventId = dlqEvent.paddle_event_id;
            const eventPayload = dlqEvent.payload as unknown as PaddleWebhookEvent;

            logger.info(`Retrying DLQ event: ${eventId}`);

            try {
                // Check if already processed in main table (idempotency)
                const { data: existingEvent } = await serviceClient
                    .from('subscription_events')
                    .select('id')
                    .eq('paddle_event_id', eventId)
                    .single();

                if (existingEvent) {
                    logger.info(`Event ${eventId} already processed. removing from DLQ.`);
                    successCount++;
                    results.push({ id: eventId, status: 'success', note: 'already_processed' });
                    
                    await serviceClient
                        .from('subscription_events_dlq')
                        .delete()
                        .eq('id', dlqEvent.id);
                    
                    continue; // Skip processing
                }

                // Try processing
                const result = await processPaddleEvent(eventPayload);

                if (result.error) {
                    failCount++;
                    results.push({ id: eventId, status: 'failed', error: result.error });
                    logger.error(`Retry failed for event ${eventId}: ${result.error}`);
                    
                    // Update DLQ with new error (optional)
                    await serviceClient
                        .from('subscription_events_dlq')
                        .update({ 
                            error_message: result.error,
                            retry_count: (dlqEvent.retry_count || 0) + 1,
                            last_retry_at: new Date().toISOString()
                        })
                        .eq('id', dlqEvent.id);

                } else {
                    // successCount++; // Moved to after successful insert
                    // results.push({ id: eventId, status: 'success' }); // Moved
                    
                    // On success:
                    // 1. Record in subscription_events (if not covered by processPaddleEvent? No, processPaddleEvent logic doesn't insert to events table usually, route.ts did that).
                    // We should replicate route.ts behavior: recordEvent.
                    // But processPaddleEvent returns subscriptionId.
                    
                    
                    const { error: insertError } = await serviceClient.from('subscription_events').insert({
                        paddle_event_id: eventId,
                        event_type: eventPayload.event_type,
                        payload: dlqEvent.payload,
                        subscription_id: result.subscriptionId,
                    });

                    if (insertError) {
                        failCount++;
                        results.push({ id: eventId, status: 'error', error: `Insert failed: ${insertError.message}` });
                        logger.error(`Retry success but insert failed for event ${eventId}: ${insertError.message}`);
                        // Do NOT remove from DLQ
                    } else {
                        // 2. Remove from DLQ only if insert succeeded
                        await serviceClient
                            .from('subscription_events_dlq')
                            .delete()
                            .eq('id', dlqEvent.id);
                            
                        logger.info(`Retry success for event ${eventId}. Removed from DLQ.`);
                        successCount++;
                        results.push({ id: eventId, status: 'success' });
                    }
                }

            } catch (err: unknown) {
                failCount++;
                const errMsg = err instanceof Error ? err.message : 'Unknown error';
                results.push({ id: eventId, status: 'error', error: errMsg });
                logger.error(`Exception retrying event ${eventId}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${dlqEvents.length} events`,
            stats: {
                total: dlqEvents.length,
                success: successCount,
                failed: failCount
            },
            details: results
        });

    } catch (error: unknown) {
        console.error('Error in DLQ retry:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
