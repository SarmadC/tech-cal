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

async function getAdminServiceClient(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
    const isAdmin = await isAdminUser(userId, supabase);
    if (!isAdmin) return null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) return null;

    return createServiceClient(supabaseUrl, supabaseServiceKey);
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
            registration_url,
            organizer_name,
            tags,
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

    // Fetch the submission
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

    let eventId: string | null = null;

    if (action === 'approve') {
        // Create a minimal event record in the events table
        const eventFormat = submission.is_virtual ? 'Online' : 'In-person';

        const { data: newEvent, error: insertError } = await tableClient
            .from('events')
            .insert({
                title: submission.title,
                description: submission.description,
                start_time: submission.start_date,
                end_time: submission.end_date,
                location: submission.location,
                event_format: eventFormat,
                source_url: null,
                registration_url: submission.registration_url,
                status: 'active',
                ingestion_provenance: 'user_submitted',
                enrichment_status: 'pending',
            })
            .select('id')
            .single();

        if (insertError || !newEvent) {
            console.error('[admin/submissions] Event insert error:', insertError);
            return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
        }
        eventId = newEvent.id;
    }

    // Update the submission status
    const { data: updatedSubmission, error: updateError } = await tableClient
        .from('user_submitted_events')
        .update({
            status: action === 'approve' ? 'approved' : 'declined',
            admin_notes: typeof admin_notes === 'string' ? admin_notes.trim() || null : null,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            ...(eventId ? { event_id: eventId } : {}),
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

    return NextResponse.json({ success: true, event_id: eventId });
}
