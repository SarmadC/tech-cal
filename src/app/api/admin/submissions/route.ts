/**
 * API Route: Admin Event Submissions
 *
 * GET:   List user-submitted events (filterable by status)
 * PATCH: Approve or decline a submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import {
    buildCuratedApprovedPayload,
    buildLegacySubmittedPayload,
    buildSubmissionContext,
    buildSubmissionFingerprint,
    parseOrganizerSubmission,
    validateOrganizerSubmissionUrls,
} from '@/lib/organizerSubmission';

async function getAdminServiceClient(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
    const isAdmin = await isAdminUser(userId, supabase);
    if (!isAdmin) return null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) return null;

    return createServiceClient(supabaseUrl, supabaseServiceKey);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getNormalizedSubmission(submission: Record<string, unknown>) {
    if (isPlainObject(submission.submitted_payload)) {
        try {
            return parseOrganizerSubmission(submission.submitted_payload);
        } catch {
            return buildLegacySubmittedPayload(submission);
        }
    }

    return buildLegacySubmittedPayload(submission);
}

async function findDuplicateEvents(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tableClient: any,
    approvedPayload: ReturnType<typeof buildCuratedApprovedPayload>
) {
    const matches = new Map<string, { id: string; title: string; start_time: string | null }>();

    const collect = async (
        query: PromiseLike<{
            data?: Array<{ id: string; title: string; start_time: string | null }>;
            error?: { message?: string } | null;
        }>
    ) => {
        const { data, error } = await query;
        if (error) {
            console.warn('[admin/submissions] Dedupe lookup failed:', error);
            return;
        }

        for (const item of data ?? []) {
            matches.set(item.id, item);
        }
    };

    if (approvedPayload.source_url) {
        await collect(
            tableClient
                .from('events')
                .select('id, title, start_time')
                .eq('source_url', approvedPayload.source_url)
                .limit(5)
        );
    }

    if (approvedPayload.registration_url) {
        await collect(
            tableClient
                .from('events')
                .select('id, title, start_time')
                .eq('registration_url', approvedPayload.registration_url)
                .limit(5)
        );
    }

    await collect(
        tableClient
            .from('events')
            .select('id, title, start_time')
            .eq('title', approvedPayload.title)
            .eq('start_time', approvedPayload.start_time)
            .limit(5)
    );

    return Array.from(matches.values());
}

function appendRiskFlag(existingFlags: unknown, nextFlag: string) {
    const flags = Array.isArray(existingFlags)
        ? existingFlags.filter((flag): flag is string => typeof flag === 'string')
        : [];

    return flags.includes(nextFlag) ? flags : [...flags, nextFlag];
}

function getValidationWarnings(validationSummary: unknown) {
    if (!isPlainObject(validationSummary) || !Array.isArray(validationSummary.warnings)) {
        return [];
    }

    return validationSummary.warnings.filter((warning): warning is string => typeof warning === 'string');
}

function mergeValidationSummary(
    validationSummary: unknown,
    warning: string,
    extraFields?: Record<string, unknown>
) {
    return {
        ...(isPlainObject(validationSummary) ? validationSummary : {}),
        ...(extraFields ?? {}),
        warnings: [...new Set([...getValidationWarnings(validationSummary), warning])],
    };
}

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = await getAdminServiceClient(supabase, user.id);
    if (!serviceClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const offset = (page - 1) * pageSize;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (serviceClient as any)
        .from('user_submitted_events')
        .select(
            `
            id,
            title,
            description,
            event_type,
            start_date,
            end_date,
            location,
            is_virtual,
            event_format,
            source_url,
            registration_url,
            registration_mode,
            organizer_name,
            tags,
            risk_flags,
            validation_summary,
            submitted_payload,
            approved_payload,
            status,
            admin_notes,
            reviewed_at,
            event_id,
            created_at,
            submitter:user_id(id, email, raw_user_meta_data)
            `,
            { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (status !== 'all') {
        query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
        console.error('[admin/submissions] GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ submissions: data ?? [], total: count ?? 0, page, pageSize });
}

export async function PATCH(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = await getAdminServiceClient(supabase, user.id);
    if (!serviceClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { id, action, admin_notes } = body as Record<string, unknown>;

    if (!id || typeof id !== 'string') {
        return NextResponse.json({ error: 'Submission id is required' }, { status: 400 });
    }
    if (action !== 'approve' && action !== 'decline') {
        return NextResponse.json({ error: 'action must be "approve" or "decline"' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableClient = serviceClient as any;

    const { data: submission, error: fetchError } = await tableClient
        .from('user_submitted_events')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !submission) {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'pending' || submission.reviewed_at || submission.event_id) {
        return NextResponse.json({ error: 'Submission has already been reviewed' }, { status: 409 });
    }

    const normalizedAdminNotes = typeof admin_notes === 'string' ? admin_notes.trim() || null : null;
    const normalizedSubmission = getNormalizedSubmission(submission);
    const submissionFingerprint =
        typeof submission.submission_fingerprint === 'string' && submission.submission_fingerprint
            ? submission.submission_fingerprint
            : buildSubmissionFingerprint(normalizedSubmission);

    let eventId: string | null = null;
    let approvedPayload: ReturnType<typeof buildCuratedApprovedPayload> | null = null;

    if (action === 'approve') {
        try {
            await validateOrganizerSubmissionUrls(normalizedSubmission);
        } catch (error) {
            const warning = 'Submission contains a URL that is not safe to fetch server-side.';
            await tableClient
                .from('user_submitted_events')
                .update({
                    risk_flags: appendRiskFlag(submission.risk_flags, 'unsafe_submitted_url'),
                    validation_summary: mergeValidationSummary(submission.validation_summary, warning, {
                        unsafe_url: true,
                    }),
                })
                .eq('id', id)
                .eq('status', 'pending')
                .is('reviewed_at', null)
                .is('event_id', null);

            return NextResponse.json(
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Submission contains a URL that is not safe to fetch server-side.',
                },
                { status: 400 }
            );
        }

        approvedPayload = buildCuratedApprovedPayload(normalizedSubmission);
        const duplicateCandidates = await findDuplicateEvents(tableClient, approvedPayload);

        if (duplicateCandidates.length > 0) {
            await tableClient
                .from('user_submitted_events')
                .update({
                    risk_flags: appendRiskFlag(submission.risk_flags, 'possible_duplicate_event'),
                    validation_summary: mergeValidationSummary(
                        submission.validation_summary,
                        'Possible duplicate event exists in the public events table.',
                        { duplicate_event_count: duplicateCandidates.length }
                    ),
                })
                .eq('id', id)
                .eq('status', 'pending')
                .is('reviewed_at', null)
                .is('event_id', null);

            return NextResponse.json(
                {
                    error: 'Possible duplicate event found. Review the submission warnings before approving.',
                    duplicate_candidates: duplicateCandidates,
                },
                { status: 409 }
            );
        }

        const { data: approvedEventId, error: approvalError } = await tableClient.rpc(
            'approve_user_submitted_event',
            {
                p_submission_id: id,
                p_reviewed_by: user.id,
                p_admin_notes: normalizedAdminNotes,
                p_submission_fingerprint: submissionFingerprint,
                p_approved_payload: approvedPayload,
                p_enrichment_metadata: buildSubmissionContext(normalizedSubmission),
            }
        );

        if (approvalError) {
            console.error('[admin/submissions] Approval RPC error:', approvalError);
            return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
        }

        if (!approvedEventId || typeof approvedEventId !== 'string') {
            return NextResponse.json({ error: 'Submission has already been reviewed' }, { status: 409 });
        }

        eventId = approvedEventId;
    } else {
        const { data: updatedSubmission, error: updateError } = await tableClient
            .from('user_submitted_events')
            .update({
                status: 'declined',
                admin_notes: normalizedAdminNotes,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                approved_payload: null,
                submission_fingerprint: submissionFingerprint,
            })
            .eq('id', id)
            .eq('status', 'pending')
            .is('reviewed_at', null)
            .is('event_id', null)
            .select('id')
            .single();

        if (!updatedSubmission) {
            return NextResponse.json({ error: 'Submission has already been reviewed' }, { status: 409 });
        }

        if (updateError) {
            console.error('[admin/submissions] Update error:', updateError);
            return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true, event_id: eventId, approved_payload: approvedPayload });
}
