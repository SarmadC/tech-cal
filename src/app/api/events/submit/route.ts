import { NextRequest, NextResponse } from 'next/server';
import {
    normalizeEventSubmissionRequest,
    toUserSubmittedEventInsert,
} from '@/lib/eventSubmission';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function POST(request: NextRequest) {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const { data, error } = await authContext.supabase
        .from('user_submitted_events')
        .insert(toUserSubmittedEventInsert(authContext.user.id, normalized.data))
        .select('id')
        .single();

    if (error) {
        console.error('[submit-event] Insert error:', error);
        return NextResponse.json({ error: 'Failed to submit event' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
}
