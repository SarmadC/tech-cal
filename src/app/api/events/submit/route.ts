/**
 * API Route: User Event Submission
 *
 * POST: Submit a tech event, hackathon, or meetup for admin review.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
    assessSubmissionRisk,
    buildSubmissionFingerprint,
    countExternalUrls,
    deriveRegistrationMode,
    parseOrganizerSubmission,
    validateOrganizerSubmissionUrls,
} from '@/lib/organizerSubmission';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';
import { getClientIdentifier, validateSameOriginRequest } from '@/lib/requestSecurity';

const submitUserRateLimiter = createRateLimiter('submit-event:user', 'ULTRA_LOW_FREQUENCY');
const submitIpRateLimiter = createRateLimiter('submit-event:ip', 'LOW_FREQUENCY');

function getRateLimitError(
    rateLimitResult: Awaited<ReturnType<typeof checkRateLimit>>
) {
    if (!rateLimitResult.success && rateLimitResult.error && typeof rateLimitResult.error === 'object') {
        const error = rateLimitResult.error as { message?: string; status?: number };
        return {
            message: error.message ?? 'Too many requests. Please try again later.',
            status: error.status ?? 429,
        };
    }

    return null;
}

async function countRepeatedSubmissions(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tableClient: any,
    submissionFingerprint: string
) {
    const { count, error } = await tableClient
        .from('user_submitted_events')
        .select('id', { count: 'exact', head: true })
        .eq('submission_fingerprint', submissionFingerprint);

    if (error) {
        console.warn('[submit-event] Failed to count repeated submissions:', error);
        return 0;
    }

    return count ?? 0;
}

async function countPossibleDuplicateEvents(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tableClient: any,
    input: { title: string; startDate: string; sourceUrl: string | null; registrationUrl: string | null }
) {
    let duplicateCount = 0;

    const countFromQuery = async (
        query: PromiseLike<{ data?: Array<{ id: string }>; error?: { message?: string } | null }>
    ) => {
        const { data, error } = await query;
        if (error) {
            console.warn('[submit-event] Duplicate event lookup failed:', error);
            return 0;
        }
        return data?.length ?? 0;
    };

    if (input.sourceUrl) {
        duplicateCount += await countFromQuery(
            tableClient.from('events').select('id').eq('source_url', input.sourceUrl).limit(3)
        );
    }

    if (input.registrationUrl) {
        duplicateCount += await countFromQuery(
            tableClient.from('events').select('id').eq('registration_url', input.registrationUrl).limit(3)
        );
    }

    duplicateCount += await countFromQuery(
        tableClient
            .from('events')
            .select('id')
            .eq('title', input.title)
            .eq('start_time', input.startDate)
            .limit(3)
    );

    return duplicateCount;
}

export async function POST(request: NextRequest) {
    const sameOriginError = validateSameOriginRequest(request);
    if (sameOriginError) {
        return NextResponse.json({ error: sameOriginError }, { status: 403 });
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientIdentifier = getClientIdentifier(request);
    const rateLimitChecks = await Promise.all([
        checkRateLimit(submitUserRateLimiter, `user:${user.id}`, { failOpen: false }),
        clientIdentifier
            ? checkRateLimit(submitIpRateLimiter, `ip:${clientIdentifier}`, { failOpen: false })
            : Promise.resolve({ success: true }),
    ]);

    for (const result of rateLimitChecks) {
        const error = getRateLimitError(result);
        if (error) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    let submission;
    try {
        submission = parseOrganizerSubmission(body);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Invalid submission' },
            { status: 400 }
        );
    }

    try {
        await validateOrganizerSubmissionUrls(submission);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Submitted URLs must be publicly reachable' },
            { status: 400 }
        );
    }

    const registrationMode = deriveRegistrationMode(submission);
    const submissionFingerprint = buildSubmissionFingerprint(submission);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableClient = supabase as any;

    const [repeatedSubmissionCount, duplicateEventCount] = await Promise.all([
        countRepeatedSubmissions(tableClient, submissionFingerprint),
        countPossibleDuplicateEvents(tableClient, {
            title: submission.title,
            startDate: submission.start_date,
            sourceUrl: submission.source_url ?? null,
            registrationUrl: submission.registration_url ?? null,
        }),
    ]);

    const risk = assessSubmissionRisk({
        submission,
        repeatedSubmissionCount,
        duplicateEventCount,
    });

    const { data, error } = await tableClient
        .from('user_submitted_events')
        .insert({
            user_id: user.id,
            title: submission.title,
            description: submission.description ?? null,
            event_type: submission.event_type,
            start_date: submission.start_date,
            end_date: submission.end_date ?? null,
            organizer_name: submission.organizer_name,
            event_format: submission.event_format,
            is_virtual: submission.event_format === 'Online',
            location: submission.location ?? null,
            source_url: submission.source_url ?? null,
            registration_url: submission.registration_url ?? null,
            registration_mode: registrationMode,
            tags: submission.tags,
            submitted_payload: submission,
            approved_payload: null,
            submission_fingerprint: submissionFingerprint,
            risk_flags: risk.flags,
            validation_summary: {
                ...risk.validationSummary,
                external_url_count: countExternalUrls(submission),
            },
        })
        .select('id')
        .single() as { data: { id: string } | null; error: { message: string } | null };

    if (error) {
        console.error('[submit-event] Insert error:', error);
        return NextResponse.json({ error: 'Failed to submit event' }, { status: 500 });
    }

    return NextResponse.json(
        {
            id: data!.id,
            registration_mode: registrationMode,
            warnings: risk.validationSummary.warnings,
        },
        { status: 201 }
    );
}
