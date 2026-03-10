/**
 * API Route: Update Queue Item Detail
 * 
 * GET: Get single update queue item with all field-level diffs
 * POST /approve: Approve all pending fields
 * POST /reject: Reject all pending fields
 * POST /approve-selective: Approve only specific fields
 * POST /reject-selective: Reject only specific pending fields
 * POST /update-field: Update a pending field's proposed value
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import type { AgendaItemInput } from '@/services/ingestion/EventEnrichmentService';
import {
    collectFieldUpdates,
    type AgendaApprovalItem,
    type ApprovalPlan,
} from '@/services/ingestion/utils/updateQueueApproval';
import { EventRepository } from '@/services/ingestion/repositories/EventRepository';

interface QueueItemForAction {
    event_id: string | null;
    status: string;
}

interface QueueFieldRecord {
    id: string;
    field_name: string;
    field_status: string;
    new_value: unknown;
}

interface QueueActionResponse {
    success: boolean;
    approvedFields?: string[];
    rejectedFields?: string[];
    status?: 'approved' | 'rejected' | 'partially_approved' | 'pending';
    warnings?: string[];
}

const fetchPendingFields = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tableClient: any,
    queueId: string,
    fieldNames?: string[],
): Promise<QueueFieldRecord[]> => {
    let query = tableClient
        .from('event_update_queue_fields')
        .select('*')
        .eq('queue_id', queueId)
        .eq('field_status', 'pending');

    if (fieldNames && fieldNames.length > 0) {
        query = query.in('field_name', fieldNames);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Failed to fetch pending fields: ${error.message}`);
    }

    return (data ?? []) as QueueFieldRecord[];
};

const updateQueueStatusForSelectiveAction = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tableClient: any,
    queueId: string,
    reviewedBy: string,
) => {
    const [{ data: remainingPending, error: pendingError }, { data: approvedFields, error: approvedError }] = await Promise.all([
        tableClient
            .from('event_update_queue_fields')
            .select('id')
            .eq('queue_id', queueId)
            .eq('field_status', 'pending')
            .limit(1),
        tableClient
            .from('event_update_queue_fields')
            .select('id')
            .eq('queue_id', queueId)
            .eq('field_status', 'approved')
            .limit(1),
    ]);

    if (pendingError) {
        throw new Error(`Failed to determine remaining pending fields: ${pendingError.message}`);
    }

    if (approvedError) {
        throw new Error(`Failed to determine approved fields: ${approvedError.message}`);
    }

    const hasPending = Boolean(remainingPending && remainingPending.length > 0);
    const hasApproved = Boolean(approvedFields && approvedFields.length > 0);
    const nextStatus = hasPending ? (hasApproved ? 'partially_approved' : 'pending') : (hasApproved ? 'approved' : 'rejected');

    const { error: queueUpdateError } = await tableClient
        .from('event_update_queue')
        .update({
            status: nextStatus,
            reviewed_by: reviewedBy,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', queueId);

    if (queueUpdateError) {
        throw new Error(`Failed to update queue status: ${queueUpdateError.message}`);
    }

    return nextStatus;
};

const buildSpeakerLookupKey = (name: string) => name.trim().toLowerCase();

const addSpeakerMappings = (
    lookup: Map<string, string>,
    speakers: Array<{ name: string; linkedinUrl?: string }>,
    speakerIds: string[],
) => {
    speakers.forEach((speaker, index) => {
        const speakerId = speakerIds[index];
        if (!speakerId) {
            return;
        }

        if (speaker.linkedinUrl) {
            lookup.set(`linkedin:${speaker.linkedinUrl.toLowerCase()}`, speakerId);
        }
        lookup.set(`name:${buildSpeakerLookupKey(speaker.name)}`, speakerId);
    });
};

const resolveAgendaSpeakerIds = async (
    agendaUpdates: AgendaApprovalItem[],
    approvedSpeakerLookup: Map<string, string>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serviceClient: any,
): Promise<AgendaItemInput[]> => {
    const speakerLookup = new Map(approvedSpeakerLookup);
    const unresolvedNames = Array.from(
        new Set(
            agendaUpdates
                .flatMap((item) => item.speakerNames ?? [])
                .map((name) => name.trim())
                .filter(Boolean)
                .filter((name) => !speakerLookup.has(`name:${buildSpeakerLookupKey(name)}`))
        )
    );

    if (unresolvedNames.length > 0) {
        const { data: existingSpeakers, error: existingSpeakersError } = await serviceClient
            .from('speakers')
            .select('id, name, linkedin_url')
            .in('name', unresolvedNames);

        if (existingSpeakersError) {
            throw new Error(`Failed to resolve existing speakers by name: ${existingSpeakersError.message}`);
        }

        if (existingSpeakers) {
            existingSpeakers.forEach((speaker: { id: string; name: string; linkedin_url: string | null }) => {
                if (speaker.linkedin_url) {
                    speakerLookup.set(`linkedin:${speaker.linkedin_url.toLowerCase()}`, speaker.id);
                }
                speakerLookup.set(`name:${buildSpeakerLookupKey(speaker.name)}`, speaker.id);
            });
        }
    }

    const namesToCreate = unresolvedNames.filter((name) => !speakerLookup.has(`name:${buildSpeakerLookupKey(name)}`));
    if (namesToCreate.length > 0) {
        const speakerIds = await EventRepository.upsertSpeakers(
            serviceClient,
            namesToCreate.map((name) => ({ name }))
        );
        addSpeakerMappings(
            speakerLookup,
            namesToCreate.map((name) => ({ name })),
            speakerIds
        );
    }

    return agendaUpdates.map((item) => {
        const resolvedSpeakerIds = Array.from(
            new Set([
                ...(item.speakerIds ?? []),
                ...((item.speakerNames ?? []).flatMap((speakerName) => {
                    const resolved = speakerLookup.get(`name:${buildSpeakerLookupKey(speakerName)}`);
                    return resolved ? [resolved] : [];
                })),
            ])
        );

        const { speakerNames: _speakerNames, ...agendaItem } = item;
        return {
            ...agendaItem,
            speakerIds: resolvedSpeakerIds.length > 0 ? resolvedSpeakerIds : undefined,
        };
    });
};

const applyApprovedFieldUpdates = async (
    queueItem: QueueItemForAction,
    plan: ApprovalPlan<QueueFieldRecord>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serviceClient: any,
    editedBy: string,
) => {
    if (!queueItem.event_id) {
        throw new Error('Queue item is missing event_id');
    }

    const { EventEnrichmentService } = await import('@/services/ingestion/EventEnrichmentService');
    const { scalarUpdateData, relationshipUpdates, speakerUpdates, agendaUpdates } = plan;

    if (Object.keys(scalarUpdateData).length > 0) {
        const { error: updateError } = await serviceClient
            .from('events')
            .update(scalarUpdateData)
            .eq('id', queueItem.event_id);

        if (updateError) {
            throw new Error(`Failed to apply scalar updates: ${updateError.message}`);
        }
    }

    if (Object.keys(relationshipUpdates).length > 0) {
        const relResult = await EventEnrichmentService.manageEventRelationships(
            queueItem.event_id,
            relationshipUpdates,
            serviceClient,
            editedBy
        );

        if (!relResult.success) {
            throw new Error(`Failed to update relationships: ${relResult.error}`);
        }
    }

    const approvedSpeakerLookup = new Map<string, string>();
    if (speakerUpdates.length > 0) {
        const speakerResult = await EventEnrichmentService.createOrUpdateSpeakers(
            queueItem.event_id,
            speakerUpdates,
            serviceClient,
            editedBy
        );

        if (!speakerResult.success) {
            throw new Error(`Failed to update speakers: ${speakerResult.error}`);
        }

        addSpeakerMappings(approvedSpeakerLookup, speakerUpdates, speakerResult.speakerIds);
    }

    if (agendaUpdates.length > 0) {
        const resolvedAgendaUpdates = await resolveAgendaSpeakerIds(
            agendaUpdates,
            approvedSpeakerLookup,
            serviceClient
        );
        const agendaResult = await EventEnrichmentService.createOrUpdateAgendaItems(
            queueItem.event_id,
            resolvedAgendaUpdates,
            serviceClient,
            editedBy
        );

        if (!agendaResult.success) {
            throw new Error(`Failed to update agenda items: ${agendaResult.error}`);
        }
    }

    return {
        warnings: plan.warnings,
    };
};

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableClient = serviceClient as any;

        const { id: queueId } = await context.params;

        // Fetch queue item directly first to avoid join-related false 404s.
        const { data: queueItem, error: queueError } = await tableClient
            .from('event_update_queue')
            .select('*')
            .eq('id', queueId)
            .single();

        if (queueError || !queueItem) {
            return NextResponse.json(
                { error: 'Queue item not found' },
                { status: 404 }
            );
        }

        let event: {
            id: string;
            title: string | null;
            start_time: string;
            description?: string | null;
            organizer?: { id: string; name: string } | null;
        } | null = null;

        if (queueItem.event_id) {
            const { data: eventRow } = await serviceClient
                .from('events')
                .select('id, title, start_time, description, organizer_id')
                .eq('id', queueItem.event_id)
                .maybeSingle();

            if (eventRow) {
                let organizer: { id: string; name: string } | null = null;

                if (eventRow.organizer_id) {
                    const { data: organizerRow } = await serviceClient
                        .from('organizers')
                        .select('id, name')
                        .eq('id', eventRow.organizer_id)
                        .maybeSingle();

                    if (organizerRow) {
                        organizer = organizerRow;
                    }
                }

                event = {
                    id: eventRow.id,
                    title: eventRow.title,
                    start_time: eventRow.start_time,
                    description: eventRow.description,
                    organizer,
                };
            }
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
            queue: {
                ...queueItem,
                event,
            },
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableClient = serviceClient as any;

        const { id: queueId } = await context.params;
        const url = new URL(request.url);
        const action = url.searchParams.get('action'); // approve, reject, approve-selective, delete-event, update-field, reset

        if (!action || !['approve', 'reject', 'approve-selective', 'reject-selective', 'delete-event', 'update-field', 'reset'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Must be approve, reject, approve-selective, reject-selective, delete-event, update-field, or reset' },
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

        if (action === 'update-field') {
            const body = await request.json();
            const { fieldName, newValue } = body as { fieldName?: string; newValue?: unknown };

            if (!fieldName) {
                return NextResponse.json(
                    { error: 'Missing fieldName' },
                    { status: 400 }
                );
            }

            const { data: fieldRecord, error: fieldError } = await tableClient
                .from('event_update_queue_fields')
                .select('id, field_status')
                .eq('queue_id', queueId)
                .eq('field_name', fieldName)
                .single();

            if (fieldError || !fieldRecord) {
                return NextResponse.json(
                    { error: 'Field not found' },
                    { status: 404 }
                );
            }

            if (fieldRecord.field_status !== 'pending') {
                return NextResponse.json(
                    { error: 'Only pending fields can be edited' },
                    { status: 400 }
                );
            }

            const { error: updateError } = await tableClient
                .from('event_update_queue_fields')
                .update({ new_value: newValue })
                .eq('id', fieldRecord.id);

            if (updateError) {
                throw new Error(`Failed to update field value: ${updateError.message}`);
            }

            return NextResponse.json({ success: true, fieldName, newValue });
        } else if (action === 'approve-selective') {
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
            const pendingFields = await fetchPendingFields(tableClient, queueId, fieldNames);
            if (pendingFields.length === 0) {
                return NextResponse.json(
                    { error: 'No matching pending fields to approve' },
                    { status: 400 }
                );
            }
            const approvalPlan = collectFieldUpdates(pendingFields);
            const applyResult = await applyApprovedFieldUpdates(
                queueItem as QueueItemForAction,
                approvalPlan,
                serviceClient,
                user.id
            );

            await Promise.all(
                approvalPlan.sanitizedFieldUpdates.map((update) =>
                    tableClient
                        .from('event_update_queue_fields')
                        .update({ new_value: update.newValue })
                        .eq('id', update.id)
                )
            );

            // Mark selected fields as approved, others as rejected
            if (approvalPlan.fieldsToApprove.length > 0) {
                const { error: approveError } = await tableClient
                    .from('event_update_queue_fields')
                    .update({
                        field_status: 'approved',
                        reviewed_by: user.id,
                        reviewed_at: new Date().toISOString(),
                    })
                    .in('id', approvalPlan.fieldsToApprove.map((field) => field.id))
                    .eq('field_status', 'pending');

                if (approveError) {
                    throw new Error(`Failed to approve fields: ${approveError.message}`);
                }
            }

            if (approvalPlan.fieldsToReject.length > 0) {
                const { error: rejectInvalidError } = await tableClient
                    .from('event_update_queue_fields')
                    .update({
                        field_status: 'rejected',
                        reviewed_by: user.id,
                        reviewed_at: new Date().toISOString(),
                    })
                    .in('id', approvalPlan.fieldsToReject.map((field) => field.id))
                    .eq('field_status', 'pending');

                if (rejectInvalidError) {
                    throw new Error(`Failed to reject invalid fields: ${rejectInvalidError.message}`);
                }
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

            const nextStatus = await updateQueueStatusForSelectiveAction(tableClient, queueId, user.id);

            return NextResponse.json<QueueActionResponse>({
                success: true,
                approvedFields: approvalPlan.fieldsToApprove.map((field) => field.field_name),
                rejectedFields: approvalPlan.fieldsToReject.map((field) => field.field_name),
                status: nextStatus,
                warnings: applyResult.warnings,
            });
        } else if (action === 'reject-selective') {
            const body = await request.json();
            const { fieldNames } = body as { fieldNames: string[] };

            if (!fieldNames || !Array.isArray(fieldNames) || fieldNames.length === 0) {
                return NextResponse.json(
                    { error: 'Missing or invalid fieldNames array' },
                    { status: 400 }
                );
            }

            const { error: rejectError } = await tableClient
                .from('event_update_queue_fields')
                .update({
                    field_status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('queue_id', queueId)
                .in('field_name', fieldNames)
                .eq('field_status', 'pending');

            if (rejectError) {
                throw new Error(`Failed to reject fields: ${rejectError.message}`);
            }

            const nextStatus = await updateQueueStatusForSelectiveAction(tableClient, queueId, user.id);

            return NextResponse.json({ success: true, rejectedFields: fieldNames, status: nextStatus });
        } else if (action === 'reset') {
            // Reset queue item and fields back to pending for re-review
            const { error: resetFieldsError } = await tableClient
                .from('event_update_queue_fields')
                .update({
                    field_status: 'pending',
                    reviewed_by: null,
                    reviewed_at: null,
                })
                .eq('queue_id', queueId);

            if (resetFieldsError) {
                throw new Error(`Failed to reset fields: ${resetFieldsError.message}`);
            }

            const { error: resetQueueError } = await tableClient
                .from('event_update_queue')
                .update({
                    status: 'pending',
                    reviewed_by: null,
                    reviewed_at: null,
                })
                .eq('id', queueId);

            if (resetQueueError) {
                throw new Error(`Failed to reset queue item: ${resetQueueError.message}`);
            }

            return NextResponse.json({ success: true, status: 'pending' });
        } else if (action === 'approve') {
            // Approve all pending fields
            const pendingFields = await fetchPendingFields(tableClient, queueId);
            if (pendingFields.length === 0) {
                return NextResponse.json(
                    { error: 'No pending fields to approve' },
                    { status: 400 }
                );
            }
            const approvalPlan = collectFieldUpdates(pendingFields);
            const applyResult = await applyApprovedFieldUpdates(
                queueItem as QueueItemForAction,
                approvalPlan,
                serviceClient,
                user.id
            );

            await Promise.all(
                approvalPlan.sanitizedFieldUpdates.map((update) =>
                    tableClient
                        .from('event_update_queue_fields')
                        .update({ new_value: update.newValue })
                        .eq('id', update.id)
                )
            );

            // Mark all pending fields as approved
            if (approvalPlan.fieldsToApprove.length > 0) {
                const { error: approveError } = await tableClient
                    .from('event_update_queue_fields')
                    .update({
                        field_status: 'approved',
                        reviewed_by: user.id,
                        reviewed_at: new Date().toISOString(),
                    })
                    .in('id', approvalPlan.fieldsToApprove.map((field) => field.id))
                    .eq('field_status', 'pending');

                if (approveError) {
                    throw new Error(`Failed to approve fields: ${approveError.message}`);
                }
            }

            if (approvalPlan.fieldsToReject.length > 0) {
                const { error: rejectInvalidError } = await tableClient
                    .from('event_update_queue_fields')
                    .update({
                        field_status: 'rejected',
                        reviewed_by: user.id,
                        reviewed_at: new Date().toISOString(),
                    })
                    .in('id', approvalPlan.fieldsToReject.map((field) => field.id))
                    .eq('field_status', 'pending');

                if (rejectInvalidError) {
                    throw new Error(`Failed to reject invalid fields: ${rejectInvalidError.message}`);
                }
            }

            // Update queue status
            const nextStatus = approvalPlan.fieldsToApprove.length > 0
                ? (approvalPlan.fieldsToReject.length > 0 ? 'partially_approved' : 'approved')
                : 'rejected';
            const { error: queueUpdateError } = await tableClient
                .from('event_update_queue')
                .update({
                    status: nextStatus,
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', queueId);

            if (queueUpdateError) {
                throw new Error(`Failed to update queue status: ${queueUpdateError.message}`);
            }

            return NextResponse.json<QueueActionResponse>({
                success: true,
                approvedFields: approvalPlan.fieldsToApprove.map((field) => field.field_name),
                rejectedFields: approvalPlan.fieldsToReject.map((field) => field.field_name),
                status: nextStatus,
                warnings: applyResult.warnings,
            });
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
