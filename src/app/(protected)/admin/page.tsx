/**
 * Admin landing page
 */

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { isAdminUser } from '@/lib/adminAuth';
import AdminLandingClient, { type AdminSummaryMetrics } from './AdminLandingClient';

export const dynamic = 'force-dynamic';

export default async function AdminLandingPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) {
        redirect('/');
    }

    // Fetch real queue counts from the API
    let metrics: AdminSummaryMetrics = {
        updateQueuePending: null,
        moderationFlags: null,
        enrichmentBacklog: null,
        protectedFields: null,
    };

    try {
        // Get the host from headers to construct absolute URL
        const headersList = await headers();
        const host = headersList.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';

        const response = await fetch(`${protocol}://${host}/api/admin/ingestion/queue-counts`, {
            headers: {
                cookie: headersList.get('cookie') || '',
            },
            cache: 'no-store',
        });

        if (response.ok) {
            const data = await response.json();
            metrics = {
                updateQueuePending: data.updateQueue ?? null,
                moderationFlags: data.moderation ?? null,
                enrichmentBacklog: data.enrichment ?? null,
                protectedFields: data.fieldProtection ?? null,
            };
        }
    } catch (error) {
        console.error('[AdminLandingPage] Error fetching queue counts:', error);
        // Fall back to null metrics on error
    }

    return (
        <div className="space-y-6">
            <AdminLandingClient metrics={metrics} />
        </div>
    );
}








