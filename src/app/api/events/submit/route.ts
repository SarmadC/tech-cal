import { createHash } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import {
    normalizeEventSubmissionRequest,
    toUserSubmittedEventInsert,
} from '@/lib/eventSubmission';
import { getClientIdentifier, validateSameOriginRequest } from '@/lib/requestSecurity';
import { validateUrlForServerFetch } from '@/lib/ssrfProtection';
import { createRateLimiter, checkRateLimit } from '@/utils/rateLimit';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const submitUserRateLimiter = createRateLimiter(
    'submit-event:user',
    'ULTRA_LOW_FREQUENCY'
);
const submitIpRateLimiter = createRateLimiter(
    'submit-event:ip',
    'LOW_FREQUENCY'
);

function buildEventSubmissionFingerprint(input: {
    is_virtual: boolean;
    organizer_name: string | null;
    registration_url: string | null;
    start_date: string;
    title: string;
}) {
    return createHash('md5')
        .update(
            [
                input.title.trim().toLowerCase(),
                input.start_date,
                (input.organizer_name ?? '').trim().toLowerCase(),
                input.registration_url ?? '',
                input.is_virtual ? 'online' : 'in-person',
            ].join('|')
        )
        .digest('hex');
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
    input: { registrationUrl: string | null; startDate: string; title: string }
) {
    const matchingEventIds = new Set<string>();

    const collect = async (
        query: PromiseLike<{
            data?: Array<{ id: string }>;
            error?: { message?: string } | null;
        }>
    ) => {
        const { data, error } = await query;
        if (error) {
            console.warn('[submit-event] Duplicate event lookup failed:', error);
            return;
        }

        for (const item of data ?? []) {
            matchingEventIds.add(item.id);
        }
    };

    if (input.registrationUrl) {
        await collect(
            tableClient
                .from('events')
                .select('id')
                .eq('registration_url', input.registrationUrl)
                .limit(3)
        );
    }

    await collect(
        tableClient
            .from('events')
            .select('id')
            .eq('title', input.title)
            .eq('start_time', input.startDate)
            .limit(3)
    );

    return matchingEventIds.size;
}

export async function POST(request: NextRequest) {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authContext.authMethod === 'cookie') {
        const sameOriginError = validateSameOriginRequest(request);
        if (sameOriginError) {
            return NextResponse.json({ error: sameOriginError }, { status: 403 });
        }
    }

    const userRateLimitResult = await checkRateLimit(
        submitUserRateLimiter,
        authContext.user.id
    );
    if (!userRateLimitResult.success) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
        );
    }

    const clientIdentifier = getClientIdentifier(request);
    if (clientIdentifier) {
        const ipRateLimitResult = await checkRateLimit(
            submitIpRateLimiter,
            clientIdentifier
        );
        if (!ipRateLimitResult.success) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const normalized = normalizeEventSubmissionRequest(body as Record<string, unknown>);
    if (normalized.error || !normalized.data) {
        return NextResponse.json({ error: normalized.error || 'Invalid submission' }, { status: 400 });
    }

    if (normalized.data.registration_url) {
        const registrationUrlValidation = await validateUrlForServerFetch(
            normalized.data.registration_url,
            { allowUnresolvedHostnames: true }
        );
        if (!registrationUrlValidation.valid) {
            return NextResponse.json(
                { error: 'Registration URL must be publicly reachable' },
                { status: 400 }
            );
        }
    }

    const submissionFingerprint = buildEventSubmissionFingerprint(
        normalized.data
    );

    const [repeatedSubmissionCount, duplicateEventCount] = await Promise.all([
        countRepeatedSubmissions(authContext.supabase, submissionFingerprint),
        countPossibleDuplicateEvents(authContext.supabase, {
            registrationUrl: normalized.data.registration_url,
            startDate: normalized.data.start_date,
            title: normalized.data.title,
        }),
    ]);

    const { data, error } = await authContext.supabase
        .from('user_submitted_events')
        .insert(
            toUserSubmittedEventInsert(authContext.user.id, normalized.data, {
                duplicateEventCount,
                repeatedSubmissionCount,
                submissionFingerprint,
            })
        )
        .select('id')
        .single();

    if (error) {
        console.error('[submit-event] Insert error:', error);
        return NextResponse.json({ error: 'Failed to submit event' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
}
