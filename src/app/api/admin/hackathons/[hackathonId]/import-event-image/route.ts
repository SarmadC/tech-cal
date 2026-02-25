/**
 * API Route: Import Linked Event Header Image
 *
 * POST: Copy events.event_image_url -> hackathons.header_image_url for the linked hackathon.event_id
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';

async function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) return null;
    return createServiceClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ hackathonId: string }> }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const serviceClient = await getServiceClient();
    if (!serviceClient) {
        return NextResponse.json({ error: 'Service role credentials not configured' }, { status: 500 });
    }

    const { hackathonId } = await params;

    const { data: hackathon, error: hackathonError } = await serviceClient
        .from('hackathons')
        .select('id, event_id')
        .eq('id', hackathonId)
        .single();

    if (hackathonError || !hackathon) {
        return NextResponse.json({ error: 'Hackathon not found' }, { status: 404 });
    }

    if (!hackathon.event_id) {
        return NextResponse.json({ error: 'Hackathon is not linked to an event (event_id is null)' }, { status: 400 });
    }

    const { data: event, error: eventError } = await serviceClient
        .from('events')
        .select('id, event_image_url')
        .eq('id', hackathon.event_id)
        .single();

    if (eventError || !event) {
        return NextResponse.json({ error: 'Linked event not found' }, { status: 404 });
    }

    if (!event.event_image_url) {
        return NextResponse.json({ error: 'Linked event has no event_image_url to import' }, { status: 400 });
    }

    const { error: updateError } = await serviceClient
        .from('hackathons')
        .update({ header_image_url: event.event_image_url, updated_at: new Date().toISOString() })
        .eq('id', hackathonId);

    if (updateError) {
        console.error('Error importing event image to hackathon:', updateError);
        return NextResponse.json({ error: 'Failed to import image' }, { status: 500 });
    }

    return NextResponse.json({ success: true, imageUrl: event.event_image_url });
}

