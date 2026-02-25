/**
 * API Route: Admin Single Hackathon
 *
 * GET: Fetch a single hackathon with organizer data
 * PUT: Update hackathon fields
 * DELETE: Delete hackathon
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';

async function getAuthenticatedAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized', status: 401 };

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) return { error: 'Forbidden', status: 403 };

    return { error: null, status: 200 };
}

function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createServiceClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ hackathonId: string }> }
) {
    const { error, status } = await getAuthenticatedAdmin();
    if (error) return NextResponse.json({ error }, { status });

    const serviceClient = getServiceClient();
    if (!serviceClient) {
        return NextResponse.json({ error: 'Service role credentials not configured' }, { status: 500 });
    }

    const { hackathonId } = await params;

    const { data, error: fetchError } = await serviceClient
        .from('hackathons')
        .select(`
            *,
            organizer:organizers(id, name, logo_url, website_url)
        `)
        .eq('id', hackathonId)
        .single();

    if (fetchError) {
        console.error('Error fetching hackathon:', fetchError);
        return NextResponse.json({ error: 'Hackathon not found' }, { status: 404 });
    }

    return NextResponse.json({ hackathon: data });
}

async function resolveOrganizerId(
    serviceClient: ReturnType<typeof createServiceClient>,
    organizerId: string | null | undefined,
    organizerName: string | null | undefined,
    organizerWebsiteUrl: string | null | undefined
): Promise<string | null> {
    if (organizerId) return organizerId;
    if (!organizerName?.trim()) return null;

    const { data: existing } = await serviceClient
        .from('organizers')
        .select('id')
        .ilike('name', organizerName.trim())
        .limit(1)
        .single();

    if (existing?.id) return existing.id;

    const { data: created } = await serviceClient
        .from('organizers')
        .insert({
            name: organizerName.trim(),
            website_url: organizerWebsiteUrl?.trim() || null,
        })
        .select('id')
        .single();

    return created?.id ?? null;
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ hackathonId: string }> }
) {
    const { error, status } = await getAuthenticatedAdmin();
    if (error) return NextResponse.json({ error }, { status });

    const serviceClient = getServiceClient();
    if (!serviceClient) {
        return NextResponse.json({ error: 'Service role credentials not configured' }, { status: 500 });
    }

    const { hackathonId } = await params;
    const body = await request.json();

    const {
        title,
        description,
        status: hackathonStatus,
        start_date,
        end_date,
        registration_deadline,
        submission_deadline,
        location,
        is_virtual,
        max_team_size,
        organizer_id,
        organizer_name,
        organizer_website_url,
        platform_url,
        registration_url,
        website_url,
        source_url,
        prize_pool,
        prize_description,
    } = body;

    const resolvedOrganizerId = await resolveOrganizerId(serviceClient, organizer_id, organizer_name, organizer_website_url);

    const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description || null;
    if (hackathonStatus !== undefined) updatePayload.status = hackathonStatus;
    if (start_date !== undefined) updatePayload.start_date = start_date;
    if (end_date !== undefined) updatePayload.end_date = end_date;
    if (registration_deadline !== undefined) updatePayload.registration_deadline = registration_deadline || null;
    if (submission_deadline !== undefined) updatePayload.submission_deadline = submission_deadline || null;
    if (location !== undefined) updatePayload.location = location || null;
    if (is_virtual !== undefined) updatePayload.is_virtual = is_virtual;
    if (max_team_size !== undefined) updatePayload.max_team_size = max_team_size || null;
    updatePayload.organizer_id = resolvedOrganizerId;
    if (platform_url !== undefined) updatePayload.platform_url = platform_url || null;
    if (registration_url !== undefined) updatePayload.registration_url = registration_url || null;
    if (website_url !== undefined) updatePayload.website_url = website_url || null;
    if (source_url !== undefined) updatePayload.source_url = source_url || null;
    if (prize_pool !== undefined) updatePayload.prize_pool = prize_pool || null;
    if (prize_description !== undefined) updatePayload.prize_description = prize_description || null;

    const { data, error: updateError } = await serviceClient
        .from('hackathons')
        .update(updatePayload)
        .eq('id', hackathonId)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating hackathon:', updateError);
        return NextResponse.json({ error: 'Failed to update hackathon' }, { status: 500 });
    }

    return NextResponse.json({ hackathon: data });
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ hackathonId: string }> }
) {
    const { error, status } = await getAuthenticatedAdmin();
    if (error) return NextResponse.json({ error }, { status });

    const serviceClient = getServiceClient();
    if (!serviceClient) {
        return NextResponse.json({ error: 'Service role credentials not configured' }, { status: 500 });
    }

    const { hackathonId } = await params;

    const { error: deleteError } = await serviceClient
        .from('hackathons')
        .delete()
        .eq('id', hackathonId);

    if (deleteError) {
        console.error('Error deleting hackathon:', deleteError);
        return NextResponse.json({ error: 'Failed to delete hackathon' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
