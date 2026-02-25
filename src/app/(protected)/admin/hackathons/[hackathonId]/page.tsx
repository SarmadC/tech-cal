/**
 * Hackathon Editor Page
 *
 * Admin-only route for creating and editing hackathons.
 * Handles both edit (by ID) and create (/new) cases.
 */

export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import { redirect, notFound } from 'next/navigation';
import HackathonEditorClient from './HackathonEditorClient';

export interface HackathonWithOrganizer {
    id: string;
    title: string;
    description: string | null;
    status: string | null;
    start_date: string;
    end_date: string;
    event_id?: string | null;
    header_image_url?: string | null;
    registration_deadline: string | null;
    submission_deadline: string | null;
    location: string | null;
    is_virtual: boolean | null;
    max_team_size: number | null;
    organizer_id: string | null;
    platform_url: string | null;
    registration_url: string | null;
    website_url: string | null;
    source_url: string | null;
    prize_pool: string | null;
    prize_description: string | null;
    created_at: string | null;
    updated_at: string | null;
    organizer: {
        id: string;
        name: string;
        logo_url: string | null;
        website_url: string | null;
    } | null;
}

export default async function HackathonEditorPage({
    params,
}: {
    params: Promise<{ hackathonId: string }>;
}) {
    const { hackathonId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) redirect('/dashboard');

    // Handle "new" case — render empty editor
    if (hackathonId === 'new') {
        return (
            <HackathonEditorClient hackathon={null} isNew />
        );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase service credentials are required');
    }

    const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

    const { data: hackathon, error } = await serviceClient
        .from('hackathons')
        .select(`
            *,
            organizer:organizers(id, name, logo_url, website_url)
        `)
        .eq('id', hackathonId)
        .single();

    if (error || !hackathon) {
        notFound();
    }

    return (
        <HackathonEditorClient
            hackathon={hackathon as HackathonWithOrganizer}
            isNew={false}
        />
    );
}
