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
import {
    collectFieldUpdates,
    type ApprovalPlan,
    normalizeApprovalPlanAgendaUpdates,
    sanitizeAgendaFieldValue,
    serializeAgendaApprovalItem,
    serializeSpeakerApprovalItem,
} from '@/services/ingestion/utils/updateQueueApproval';
import { isValidIanaTimezone, normalizeTimezone } from '@/utils/ingestion/ExtractNormalization';

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

interface EventApprovalContext {
    start_time: string | null;
    end_time: string | null;
    timezone: string | null;
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

const VALID_EVENT_FORMATS = new Set(['Online', 'In-person', 'Hybrid']);
const VALID_PRICING_TYPES = new Set(['Free', 'Paid', 'Varies']);

const normalizeCurrencyCode = (value: unknown): string | null | undefined => {
    if (value === null) {
        return null;
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const normalized = trimmed.toUpperCase();
    return /^[A-Z]{3}$/.test(normalized) ? normalized : undefined;
};

const normalizeTimezoneValue = (value: unknown): string | null | undefined => {
    if (value === null) {
        return null;
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    if (isValidIanaTimezone(trimmed)) {
        return trimmed;
    }

    const normalized = normalizeTimezone(trimmed);
    if (isValidIanaTimezone(normalized.timezone) && (normalized.source !== 'fallback' || normalized.confidence >= 0.3)) {
        return normalized.timezone;
    }

    return undefined;
};

const fetchEventApprovalContext = async (
    eventId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serviceClient: any,
): Promise<EventApprovalContext> => {
    const { data: existingEvent, error } = await serviceClient
        .from('events')
        .select('start_time, end_time, timezone')
        .eq('id', eventId)
        .single();

    if (error || !existingEvent) {
        throw new Error(`Failed to load existing event times: ${error?.message || 'Event not found'}`);
    }

    return existingEvent as EventApprovalContext;
};

const normalizeScalarApprovalUpdates = async (
    eventId: string,
    scalarUpdateData: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serviceClient: any,
    existingEvent?: EventApprovalContext,
): Promise<{ scalarUpdateData: Record<string, unknown>; warnings: string[]; eventContext: EventApprovalContext }> => {
    const nextScalarUpdateData = { ...scalarUpdateData };
    const warnings: string[] = [];
    let eventContext = existingEvent;

    if ('event_format' in nextScalarUpdateData) {
        const eventFormat = nextScalarUpdateData.event_format;
        if (eventFormat == null || VALID_EVENT_FORMATS.has(String(eventFormat))) {
            // keep as-is
        } else {
            delete nextScalarUpdateData.event_format;
            warnings.push(`Skipped invalid event_format: ${String(eventFormat)}`);
        }
    }

    if ('pricing_type' in nextScalarUpdateData) {
        const pricingType = nextScalarUpdateData.pricing_type;
        if (pricingType == null || VALID_PRICING_TYPES.has(String(pricingType))) {
            // keep as-is
        } else {
            delete nextScalarUpdateData.pricing_type;
            warnings.push(`Skipped invalid pricing_type: ${String(pricingType)}`);
        }
    }

    if ('currency' in nextScalarUpdateData) {
        const currency = nextScalarUpdateData.currency;
        const normalizedCurrency = normalizeCurrencyCode(currency);
        if (normalizedCurrency === undefined) {
            delete nextScalarUpdateData.currency;
            warnings.push(`Skipped invalid currency: ${String(currency)}`);
        } else {
            nextScalarUpdateData.currency = normalizedCurrency;
        }
    }

    if ('timezone' in nextScalarUpdateData) {
        const timezone = nextScalarUpdateData.timezone;
        const normalizedTimezoneValue = normalizeTimezoneValue(timezone);
        if (normalizedTimezoneValue === undefined) {
            delete nextScalarUpdateData.timezone;
            warnings.push(`Skipped invalid timezone: ${String(timezone)}`);
        } else {
            nextScalarUpdateData.timezone = normalizedTimezoneValue;
        }
    }

    if ('start_time' in nextScalarUpdateData || 'end_time' in nextScalarUpdateData) {
        if (!eventContext) {
            eventContext = await fetchEventApprovalContext(eventId, serviceClient);
        }

        const startCandidate = typeof nextScalarUpdateData.start_time === 'string'
            ? nextScalarUpdateData.start_time
            : eventContext.start_time;
        const endCandidate = typeof nextScalarUpdateData.end_time === 'string'
            ? nextScalarUpdateData.end_time
            : eventContext.end_time;

        if (startCandidate && endCandidate) {
            const start = new Date(startCandidate);
            const end = new Date(endCandidate);
            if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
                nextScalarUpdateData.end_time = new Date(start.getTime() + 60 * 60 * 1000).toISOString();
                warnings.push('Adjusted end_time to remain after start_time during approval');
            }
        }
    }

    return {
        scalarUpdateData: nextScalarUpdateData,
        warnings,
        eventContext: eventContext ?? await fetchEventApprovalContext(eventId, serviceClient),
    };
};

const applyApprovedFieldUpdates = async (
    queueId: string,
    queueItem: QueueItemForAction,
    plan: ApprovalPlan<QueueFieldRecord>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serviceClient: any,
    editedBy: string,
    options?: {
        rejectRemainingPending?: boolean;
    },
) => {
    if (!queueItem.event_id) {
        throw new Error('Queue item is missing event_id');
    }

    const shouldFetchEventContext =
        plan.agendaUpdates.length > 0 ||
        'start_time' in plan.scalarUpdateData ||
        'end_time' in plan.scalarUpdateData ||
        'timezone' in plan.scalarUpdateData;
    const existingEvent = shouldFetchEventContext
        ? await fetchEventApprovalContext(queueItem.event_id, serviceClient)
        : undefined;

    const { scalarUpdateData, warnings: scalarWarnings, eventContext } = await normalizeScalarApprovalUpdates(
        queueItem.event_id,
        plan.scalarUpdateData,
        serviceClient,
        existingEvent
    );
    const normalizedPlan = plan.agendaUpdates.length > 0
        ? normalizeApprovalPlanAgendaUpdates(plan, {
            eventStartTime:
                typeof scalarUpdateData.start_time === 'string'
                    ? scalarUpdateData.start_time
                    : eventContext.start_time,
            eventTimezone:
                Object.prototype.hasOwnProperty.call(scalarUpdateData, 'timezone')
                    ? (scalarUpdateData.timezone as string | null | undefined) ?? null
                    : eventContext.timezone,
        })
        : plan;

    const { data, error } = await serviceClient.rpc('apply_event_update_queue_approval', {
        p_queue_id: queueId,
        p_reviewed_by: editedBy,
        p_scalar_updates: scalarUpdateData,
        p_relationship_updates: normalizedPlan.relationshipUpdates,
        p_speaker_updates: normalizedPlan.speakerUpdates.map(serializeSpeakerApprovalItem),
        p_agenda_updates: normalizedPlan.agendaUpdates.map(serializeAgendaApprovalItem),
        p_approved_field_ids: normalizedPlan.fieldsToApprove.map((field) => field.id),
        p_rejected_field_ids: normalizedPlan.fieldsToReject.map((field) => field.id),
        p_sanitized_field_updates: normalizedPlan.sanitizedFieldUpdates.map((update) => ({
            id: update.id,
            newValue: update.newValue,
        })),
        p_reject_remaining_pending: options?.rejectRemainingPending ?? false,
    });

    if (error) {
        throw new Error(`Failed to apply queue approval: ${error.message}`);
    }

    const nextStatus =
        typeof data === 'object' && data !== null && 'status' in data && typeof data.status === 'string'
            ? data.status
            : undefined;

    return {
        plan: normalizedPlan,
        warnings: [...normalizedPlan.warnings, ...scalarWarnings],
        status: nextStatus as QueueActionResponse['status'] | undefined,
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

            let nextValue = newValue;
            if (fieldName === 'agenda') {
                if (!queueItem.event_id) {
                    return NextResponse.json(
                        { error: 'Queue item is missing event_id' },
                        { status: 400 }
                    );
                }

                try {
                    const eventContext = await fetchEventApprovalContext(queueItem.event_id, serviceClient);
                    nextValue = sanitizeAgendaFieldValue(newValue, {
                        eventStartTime: eventContext.start_time,
                        eventTimezone: eventContext.timezone,
                    }).sanitizedValue;
                } catch (error) {
                    return NextResponse.json(
                        { error: error instanceof Error ? error.message : 'Invalid agenda field value' },
                        { status: 400 }
                    );
                }
            }

            const { error: updateError } = await tableClient
                .from('event_update_queue_fields')
                .update({ new_value: nextValue })
                .eq('id', fieldRecord.id);

            if (updateError) {
                throw new Error(`Failed to update field value: ${updateError.message}`);
            }

            return NextResponse.json({ success: true, fieldName, newValue: nextValue });
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
                queueId,
                queueItem as QueueItemForAction,
                approvalPlan,
                serviceClient,
                user.id,
                { rejectRemainingPending: true }
            );
            const nextStatus = applyResult.status ?? await updateQueueStatusForSelectiveAction(tableClient, queueId, user.id);

            return NextResponse.json<QueueActionResponse>({
                success: true,
                approvedFields: applyResult.plan.fieldsToApprove.map((field) => field.field_name),
                rejectedFields: applyResult.plan.fieldsToReject.map((field) => field.field_name),
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
                queueId,
                queueItem as QueueItemForAction,
                approvalPlan,
                serviceClient,
                user.id
            );
            const nextStatus = applyResult.status
                ?? (applyResult.plan.fieldsToApprove.length > 0
                    ? (applyResult.plan.fieldsToReject.length > 0 ? 'partially_approved' : 'approved')
                    : 'rejected');

            return NextResponse.json<QueueActionResponse>({
                success: true,
                approvedFields: applyResult.plan.fieldsToApprove.map((field) => field.field_name),
                rejectedFields: applyResult.plan.fieldsToReject.map((field) => field.field_name),
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
