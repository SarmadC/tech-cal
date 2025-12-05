/**
 * API Route: Update Queue Item Detail
 * 
 * GET: Get single update queue item with all field-level diffs
 * POST /approve: Approve all pending fields
 * POST /reject: Reject all pending fields
 * POST /approve-selective: Approve only specific fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';
import type { AgendaItemInput } from '@/services/ingestion/EventEnrichmentService';

const coerceAgendaItems = (value: unknown): AgendaItemInput[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => {
            const typed = item as Record<string, unknown>;
            const title = typeof typed.title === 'string' ? typed.title : '';
            if (!title) return null;

            const speakerIds =
                Array.isArray(typed.speakers) && typed.speakers.every((s) => typeof s === 'string')
                    ? (typed.speakers as string[])
                    : Array.isArray(typed.speakerIds) && typed.speakerIds.every((s) => typeof s === 'string')
                        ? (typed.speakerIds as string[])
                        : undefined;

            return {
                title,
                startTime: typeof typed.start_time === 'string' ? typed.start_time : typeof typed.startTime === 'string' ? typed.startTime : '',
                endTime: typeof typed.end_time === 'string' ? typed.end_time : typeof typed.endTime === 'string' ? typed.endTime : '',
                description: typeof typed.description === 'string' ? typed.description : undefined,
                location: typeof typed.location === 'string' ? typed.location : undefined,
                speakerIds,
            };
        })
        .filter(Boolean) as AgendaItemInput[];
};

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
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

        const { id: queueId } = await context.params;

        // Fetch queue item with event details
        const { data: queueItem, error: queueError } = await tableClient
            .from('event_update_queue')
            .select(`
                *,
                event:events(id, title, start_time, description, organizer:organizers(id, name)),
                source_event:source_events(id, source_id, ingestion_sources(name))
            `)
            .eq('id', queueId)
            .single();

        if (queueError || !queueItem) {
            return NextResponse.json(
                { error: 'Queue item not found' },
                { status: 404 }
            );
        }

        // Fetch all field-level diffs
        const { data: fieldDiffs, error: fieldsError } = await tableClient
            .from('event_update_queue_fields')
            .select('*')
            .eq('queue_id', queueId)
            .order('field_name', { ascending: true });

        if (fieldsError) {
            throw new Error(`Failed to fetch field diffs: ${fieldsError.message}`);
        }

        return NextResponse.json({
            queue: queueItem,
            fields: fieldDiffs || [],
        });
    } catch (error) {
        console.error('Error fetching queue item detail:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableClient = supabase as any;
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin access
        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id: queueId } = await context.params;
        const url = new URL(request.url);
        const action = url.searchParams.get('action'); // approve, reject, approve-selective, delete-event

        if (!action || !['approve', 'reject', 'approve-selective', 'delete-event'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Must be approve, reject, approve-selective, or delete-event' },
                { status: 400 }
            );
        }

        // Fetch queue item to get event_id
        const { data: queueItem, error: queueFetchError } = await tableClient
            .from('event_update_queue')
            .select('event_id, status')
            .eq('id', queueId)
            .single();

        if (queueFetchError || !queueItem) {
            return NextResponse.json(
                { error: 'Queue item not found' },
                { status: 404 }
            );
        }

        if (action === 'approve-selective') {
            // Approve only specific fields
            const body = await request.json();
            const { fieldNames } = body as { fieldNames: string[] };

            if (!fieldNames || !Array.isArray(fieldNames) || fieldNames.length === 0) {
                return NextResponse.json(
                    { error: 'Missing or invalid fieldNames array' },
                    { status: 400 }
                );
            }

            // Update selected fields to approved and apply updates
        const { data: fieldsToApprove, error: fieldsError } = await tableClient
                .from('event_update_queue_fields')
                .select('*')
                .eq('queue_id', queueId)
                .eq('field_status', 'pending')
                .in('field_name', fieldNames);

            if (fieldsError) {
                throw new Error(`Failed to fetch fields: ${fieldsError.message}`);
            }

            // Import EventEnrichmentService for relationship updates
            const { EventEnrichmentService } = await import('@/services/ingestion/EventEnrichmentService');

            // Separate scalar and relationship fields
            const relationshipFields = ['tags', 'audiences', 'prerequisites'];
            const scalarUpdateData: Record<string, unknown> = {};
            const relationshipUpdates: { tagIds?: string[]; audienceIds?: string[]; prerequisiteIds?: string[] } = {};
            const agendaUpdates: ReturnType<typeof coerceAgendaItems> = [];

            for (const field of fieldsToApprove || []) {
                if (field.field_name === 'agenda') {
                    const agendaItems = coerceAgendaItems(field.new_value);
                    if (agendaItems.length > 0) {
                        agendaUpdates.push(...agendaItems);
                    }
                    continue;
                }

                if (relationshipFields.includes(field.field_name)) {
                    // Handle relationship fields
                    const newValue = field.new_value;
                    if (Array.isArray(newValue)) {
                        if (field.field_name === 'tags') {
                            relationshipUpdates.tagIds = newValue as string[];
                        } else if (field.field_name === 'audiences') {
                            relationshipUpdates.audienceIds = newValue as string[];
                        } else if (field.field_name === 'prerequisites') {
                            relationshipUpdates.prerequisiteIds = newValue as string[];
                        }
                    }
                } else {
                    // Scalar fields
                    scalarUpdateData[field.field_name] = field.new_value;
                }
            }

            // Update scalar fields
            if (Object.keys(scalarUpdateData).length > 0) {
                const { error: updateError } = await supabase
                    .from('events')
                    .update(scalarUpdateData)
                    .eq('id', queueItem.event_id);

                if (updateError) {
                    throw new Error(`Failed to apply scalar updates: ${updateError.message}`);
                }
            }

            // Update relationship fields
            if (Object.keys(relationshipUpdates).length > 0) {
                const relResult = await EventEnrichmentService.manageEventRelationships(
                    queueItem.event_id,
                    relationshipUpdates,
                    supabase,
                    user.id
                );

                if (!relResult.success) {
                    throw new Error(`Failed to update relationships: ${relResult.error}`);
                }
            }

            // Update agenda items
            if (agendaUpdates.length > 0) {
                const agendaResult = await EventEnrichmentService.createOrUpdateAgendaItems(
                    queueItem.event_id,
                    agendaUpdates,
                    supabase,
                    user.id
                );

                if (!agendaResult.success) {
                    throw new Error(`Failed to update agenda items: ${agendaResult.error}`);
                }
            }

            // Mark selected fields as approved, others as rejected
            const { error: approveError } = await tableClient
                .from('event_update_queue_fields')
                .update({
                    field_status: 'approved',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('queue_id', queueId)
                .in('field_name', fieldNames)
                .eq('field_status', 'pending');

            if (approveError) {
                throw new Error(`Failed to approve fields: ${approveError.message}`);
            }

            // Reject remaining pending fields
            const { error: rejectError } = await tableClient
                .from('event_update_queue_fields')
                .update({
                    field_status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('queue_id', queueId)
                .eq('field_status', 'pending');

            if (rejectError) {
                console.warn('Failed to reject remaining fields:', rejectError);
            }

            // Check if any fields are still pending
            const { data: remainingPending } = await tableClient
                .from('event_update_queue_fields')
                .select('id')
                .eq('queue_id', queueId)
                .eq('field_status', 'pending')
                .limit(1);

            // Update queue status
            const newStatus = remainingPending && remainingPending.length > 0 ? 'partially_approved' : 'approved';
            await tableClient
                .from('event_update_queue')
                .update({
                    status: newStatus,
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', queueId);

            return NextResponse.json({ success: true, approvedFields: fieldNames });
        } else if (action === 'approve') {
            // Approve all pending fields
            const { data: pendingFields, error: fieldsError } = await tableClient
                .from('event_update_queue_fields')
                .select('*')
                .eq('queue_id', queueId)
                .eq('field_status', 'pending');

            if (fieldsError) {
                throw new Error(`Failed to fetch pending fields: ${fieldsError.message}`);
            }

            // Import EventEnrichmentService for relationship updates
            const { EventEnrichmentService } = await import('@/services/ingestion/EventEnrichmentService');

            // Separate scalar and relationship fields
            const relationshipFields = ['tags', 'audiences', 'prerequisites'];
            const scalarUpdateData: Record<string, unknown> = {};
            const relationshipUpdates: { tagIds?: string[]; audienceIds?: string[]; prerequisiteIds?: string[] } = {};
            const agendaUpdates: ReturnType<typeof coerceAgendaItems> = [];

            for (const field of pendingFields || []) {
                if (field.field_name === 'agenda') {
                    const agendaItems = coerceAgendaItems(field.new_value);
                    if (agendaItems.length > 0) {
                        agendaUpdates.push(...agendaItems);
                    }
                    continue;
                }

                if (relationshipFields.includes(field.field_name)) {
                    // Handle relationship fields
                    const newValue = field.new_value;
                    if (Array.isArray(newValue)) {
                        if (field.field_name === 'tags') {
                            relationshipUpdates.tagIds = newValue as string[];
                        } else if (field.field_name === 'audiences') {
                            relationshipUpdates.audienceIds = newValue as string[];
                        } else if (field.field_name === 'prerequisites') {
                            relationshipUpdates.prerequisiteIds = newValue as string[];
                        }
                    }
                } else {
                    // Scalar fields
                    scalarUpdateData[field.field_name] = field.new_value;
                }
            }

            // Update scalar fields
            if (Object.keys(scalarUpdateData).length > 0) {
                const { error: updateError } = await tableClient
                    .from('events')
                    .update(scalarUpdateData)
                    .eq('id', queueItem.event_id);

                if (updateError) {
                    throw new Error(`Failed to apply scalar updates: ${updateError.message}`);
                }
            }

            // Update relationship fields
            if (Object.keys(relationshipUpdates).length > 0) {
                const relResult = await EventEnrichmentService.manageEventRelationships(
                    queueItem.event_id,
                    relationshipUpdates,
                    supabase,
                    user.id
                );

                if (!relResult.success) {
                    throw new Error(`Failed to update relationships: ${relResult.error}`);
                }
            }

            // Update agenda items
            if (agendaUpdates.length > 0) {
                const agendaResult = await EventEnrichmentService.createOrUpdateAgendaItems(
                    queueItem.event_id,
                    agendaUpdates,
                    supabase,
                    user.id
                );

                if (!agendaResult.success) {
                    throw new Error(`Failed to update agenda items: ${agendaResult.error}`);
                }
            }

            // Mark all pending fields as approved
            const { error: approveError } = await tableClient
                .from('event_update_queue_fields')
                .update({
                    field_status: 'approved',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('queue_id', queueId)
                .eq('field_status', 'pending');

            if (approveError) {
                throw new Error(`Failed to approve fields: ${approveError.message}`);
            }

            // Update queue status
            await tableClient
                .from('event_update_queue')
                .update({
                    status: 'approved',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', queueId);

            return NextResponse.json({ success: true });
        } else if (action === 'reject') {
            // Reject all pending fields
            const { error: rejectError } = await tableClient
                .from('event_update_queue_fields')
                .update({
                    field_status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('queue_id', queueId)
                .eq('field_status', 'pending');

            if (rejectError) {
                throw new Error(`Failed to reject fields: ${rejectError.message}`);
            }

            // Update queue status
            await tableClient
                .from('event_update_queue')
                .update({
                    status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', queueId);

            return NextResponse.json({ success: true });
        } else if (action === 'delete-event') {
            // Delete the event and mark queue item as resolved
            const { data: queueItemForDelete, error: queueFetchError } = await tableClient
                .from('event_update_queue')
                .select('event_id')
                .eq('id', queueId)
                .single();

            if (queueFetchError || !queueItemForDelete || !queueItemForDelete.event_id) {
                return NextResponse.json(
                    { error: 'Queue item or event not found' },
                    { status: 404 }
                );
            }

            const eventId = queueItemForDelete.event_id;

            // Delete the event (CASCADE will handle related records)
            const { error: deleteError } = await tableClient
                .from('events')
                .delete()
                .eq('id', eventId);

            if (deleteError) {
                throw new Error(`Failed to delete event: ${deleteError.message}`);
            }

            // Mark queue item as resolved (rejected, since event was deleted)
            await tableClient
                .from('event_update_queue')
                .update({
                    status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', queueId);

            return NextResponse.json({ success: true, deletedEventId: eventId });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error processing queue action:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

