/**
 * All Events List Page
 *
 * Admin-only route for viewing and managing all events in a table format.
 * Clicking a row navigates to the Enrichment Editor for that event.
 */

export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import { redirect } from 'next/navigation';
import AllEventsListClient from './AllEventsListClient';

export interface EventListItem {
    id: string;
    title: string;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    status: string | null;
    source_url: string | null;
    event_format: string | null;
    created_at: string | null;
    updated_at: string | null;
    organizer: { id: string; name: string; logo_url: string | null } | null;
    event_type: { id: string; name: string; color: string | null } | null;
    venue: { id: string; name: string; city: string | null } | null;
}

export default async function AllEventsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Check admin access
    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) {
        redirect('/dashboard');
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase service credentials are required for events list');
    }

    const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Fetch initial page of events
    const pageSize = 20;
    const { data, count } = await serviceClient
        .from('events')
        .select(
            `
            id,
            title,
            start_time,
            end_time,
            location,
            status,
            source_url,
            event_format,
            created_at,
            updated_at,
            organizer:organizers(id, name, logo_url),
            event_type:event_type(id, name, color),
            venue:venues(id, name, city)
        `,
            { count: 'exact' }
        )
        .order('start_time', { ascending: false })
        .range(0, pageSize - 1);

    const events: EventListItem[] =
        data?.map((event) => ({
            id: event.id,
            title: event.title ?? 'Untitled',
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
            status: event.status,
            source_url: event.source_url,
            event_format: event.event_format,
            created_at: event.created_at,
            updated_at: event.updated_at,
            organizer: event.organizer as EventListItem['organizer'],
            event_type: event.event_type as EventListItem['event_type'],
            venue: event.venue as EventListItem['venue'],
        })) || [];

    return (
        <AllEventsListClient
            initialEvents={events}
            initialTotal={count || 0}
            initialPageSize={pageSize}
        />
    );
}


