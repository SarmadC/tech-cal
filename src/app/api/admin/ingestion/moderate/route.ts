/**
 * Admin Moderation API Routes
 * 
 * Protected by admin authentication.
 * Handles event moderation: approve, reject, edit, merge, blacklist source.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser, requireAdmin } from '@/lib/adminAuth';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'nodejs';

/**
 * GET - List events in moderation queue
 */
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
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'pending';
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        // Fetch moderation queue
        const { data: queueItems, error } = await supabase
            .from('event_moderation_queue')
            .select(`
                *,
                source_events:source_event_id(
                    id,
                    raw_payload,
                    checksum,
                    created_at
                ),
                events:event_id(
                    id,
                    title,
                    description,
                    start_time,
                    location,
                    organizer:organizers(name),
                    ingestion_quality_score,
                    ingestion_provenance
                )
            `)
            .eq('status', status)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            data: queueItems || [],
            pagination: {
                limit,
                offset,
                total: queueItems?.length || 0,
            },
        });
    } catch (error) {
        console.error('Error fetching moderation queue:', error);
        Sentry.captureException(error, {
            extra: { function: 'GET_moderation_queue' },
        });

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch queue' },
            { status: 500 }
        );
    }
}

/**
 * POST - Approve/reject/edit events in moderation queue
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin access
        await requireAdmin(user.id, supabase);

        const body = await request.json();
        const { action, queueItemIds, eventId, feedback } = body;

        if (!action || !Array.isArray(queueItemIds) || queueItemIds.length === 0) {
            return NextResponse.json(
                { error: 'Invalid request: action and queueItemIds required' },
                { status: 400 }
            );
        }

        const results = [];

        for (const queueItemId of queueItemIds) {
            try {
                if (action === 'approve') {
                    // Get queue item
                    const { data: queueItem } = await supabase
                        .from('event_moderation_queue')
                        .select('event_id, source_event_id')
                        .eq('id', queueItemId)
                        .single();

                    if (!queueItem?.event_id) {
                        results.push({ queueItemId, success: false, error: 'Event not found' });
                        continue;
                    }

                    // Update event status to confirmed (already in events table)
                    await supabase
                        .from('events')
                        .update({ status: 'confirmed', status_enum: 'Confirmed' })
                        .eq('id', queueItem.event_id);

                    // Mark queue item as approved
                    await supabase
                        .from('event_moderation_queue')
                        .update({
                            status: 'approved',
                            reviewer_id: user.id,
                            reviewed_at: new Date().toISOString(),
                            feedback: feedback || null,
                        })
                        .eq('id', queueItemId);

                    results.push({ queueItemId, success: true });

                } else if (action === 'reject') {
                    // Mark queue item as rejected and optionally delete event
                    const { data: queueItem } = await supabase
                        .from('event_moderation_queue')
                        .select('event_id')
                        .eq('id', queueItemId)
                        .single();

                    if (queueItem?.event_id) {
                        // Optionally soft-delete or mark event as cancelled
                        await supabase
                            .from('events')
                            .update({ status: 'cancelled', status_enum: 'Cancelled' })
                            .eq('id', queueItem.event_id);
                    }

                    await supabase
                        .from('event_moderation_queue')
                        .update({
                            status: 'rejected',
                            reviewer_id: user.id,
                            reviewed_at: new Date().toISOString(),
                            feedback: feedback || null,
                        })
                        .eq('id', queueItemId);

                    results.push({ queueItemId, success: true });

                } else if (action === 'edit') {
                    // Update event with edited data
                    const { eventData } = body;
                    if (!eventData || !eventId) {
                        results.push({ queueItemId, success: false, error: 'Event data required' });
                        continue;
                    }

                    await supabase
                        .from('events')
                        .update(eventData)
                        .eq('id', eventId);

                    await supabase
                        .from('event_moderation_queue')
                        .update({
                            status: 'approved',
                            reviewer_id: user.id,
                            reviewed_at: new Date().toISOString(),
                            feedback: feedback || null,
                        })
                        .eq('id', queueItemId);

                    results.push({ queueItemId, success: true });

                } else if (action === 'merge') {
                    // Merge duplicate events
                    const { targetEventId } = body;
                    if (!targetEventId || !eventId) {
                        results.push({ queueItemId, success: false, error: 'Target event ID required' });
                        continue;
                    }

                    // Mark source event as duplicate and link to target
                    const { data: queueItem } = await supabase
                        .from('event_moderation_queue')
                        .select('source_event_id')
                        .eq('id', queueItemId)
                        .single();

                    if (queueItem?.source_event_id) {
                        await supabase
                            .from('source_events')
                            .update({
                                fetch_status: 'duplicate',
                                normalized_event_id: targetEventId,
                                error_message: `Merged with event ${targetEventId}`,
                            })
                            .eq('id', queueItem.source_event_id);
                    }

                    // Delete the duplicate event
                    await supabase
                        .from('events')
                        .delete()
                        .eq('id', eventId);

                    // Remove from queue
                    await supabase
                        .from('event_moderation_queue')
                        .delete()
                        .eq('id', queueItemId);

                    results.push({ queueItemId, success: true });

                } else {
                    results.push({ queueItemId, success: false, error: `Unknown action: ${action}` });
                }
            } catch (error) {
                results.push({
                    queueItemId,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return NextResponse.json({
            success: true,
            results,
        });
    } catch (error) {
        console.error('Error in moderation action:', error);
        Sentry.captureException(error, {
            extra: { function: 'POST_moderation_action' },
        });

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process action' },
            { status: 500 }
        );
    }
}


