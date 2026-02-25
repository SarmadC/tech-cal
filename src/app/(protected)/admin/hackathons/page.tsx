/**
 * Hackathons List Page
 *
 * Admin-only route for viewing and managing all hackathons in a table format.
 */

export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import { redirect } from 'next/navigation';
import HackathonsListClient from './HackathonsListClient';

export interface HackathonListItem {
    id: string;
    title: string;
    status: string | null;
    start_date: string;
    end_date: string;
    location: string | null;
    is_virtual: boolean | null;
    organizer_id: string | null;
    created_at: string | null;
    updated_at: string | null;
    organizer: { id: string; name: string; logo_url: string | null } | null;
}

export default async function HackathonsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) redirect('/dashboard');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase service credentials are required for hackathons list');
    }

    const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

    const pageSize = 20;
    const { data, count } = await serviceClient
        .from('hackathons')
        .select(
            `
            id,
            title,
            status,
            start_date,
            end_date,
            location,
            is_virtual,
            organizer_id,
            created_at,
            updated_at,
            organizer:organizers(id, name, logo_url)
        `,
            { count: 'exact' }
        )
        .order('start_date', { ascending: false })
        .range(0, pageSize - 1);

    const hackathons: HackathonListItem[] =
        data?.map((h) => ({
            id: h.id,
            title: h.title ?? 'Untitled',
            status: h.status,
            start_date: h.start_date,
            end_date: h.end_date,
            location: h.location,
            is_virtual: h.is_virtual,
            organizer_id: h.organizer_id,
            created_at: h.created_at,
            updated_at: h.updated_at,
            organizer: h.organizer as HackathonListItem['organizer'],
        })) || [];

    return (
        <HackathonsListClient
            initialHackathons={hackathons}
            initialTotal={count || 0}
            initialPageSize={pageSize}
        />
    );
}
