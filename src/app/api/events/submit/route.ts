/**
 * API Route: User Event Submission
 *
 * POST: Submit a tech event, hackathon, or meetup for admin review.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const ALLOWED_EVENT_TYPES = new Set([
    'tech_event',
    'hackathon',
    'meetup',
    'conference',
    'workshop',
    'other',
]);

function normalizeOptionalString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function normalizeDateTime(value: unknown, fieldName: string): { value: string | null; error: string | null } {
    const normalized = normalizeOptionalString(value);
    if (!normalized) {
        return { value: null, error: fieldName === 'start_date' ? 'Start date is required' : null };
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
        return { value: null, error: `${fieldName === 'start_date' ? 'Start date' : 'End date'} must be a valid datetime` };
    }

    return { value: parsed.toISOString(), error: null };
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
        title,
        description,
        event_type,
        start_date,
        end_date,
        location,
        is_virtual,
        registration_url,
        organizer_name,
        tags,
    } = body as Record<string, unknown>;

    const normalizedTitle = normalizeOptionalString(title);
    if (!normalizedTitle) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const normalizedEventType = typeof event_type === 'string' ? event_type.trim() : 'other';
    if (!ALLOWED_EVENT_TYPES.has(normalizedEventType)) {
        return NextResponse.json({ error: 'Event type is invalid' }, { status: 400 });
    }

    const normalizedStartDate = normalizeDateTime(start_date, 'start_date');
    if (normalizedStartDate.error) {
        return NextResponse.json({ error: normalizedStartDate.error }, { status: 400 });
    }

    const normalizedEndDate = normalizeDateTime(end_date, 'end_date');
    if (normalizedEndDate.error) {
        return NextResponse.json({ error: normalizedEndDate.error }, { status: 400 });
    }

    const normalizedTags = Array.isArray(tags)
        ? tags
            .filter((tag): tag is string => typeof tag === 'string')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableClient = supabase as any;
    const { data, error } = await tableClient.from('user_submitted_events').insert({
        user_id: user.id,
        title: normalizedTitle,
        description: normalizeOptionalString(description),
        event_type: normalizedEventType,
        start_date: normalizedStartDate.value,
        end_date: normalizedEndDate.value,
        location: normalizeOptionalString(location),
        is_virtual: is_virtual === true,
        registration_url: normalizeOptionalString(registration_url),
        organizer_name: normalizeOptionalString(organizer_name),
        tags: normalizedTags,
    }).select('id').single() as { data: { id: string } | null; error: { message: string } | null };

    if (error) {
        console.error('[submit-event] Insert error:', error);
        return NextResponse.json({ error: 'Failed to submit event' }, { status: 500 });
    }

    return NextResponse.json({ id: data!.id }, { status: 201 });
}
