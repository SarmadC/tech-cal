/**
 * Admin landing page
 */

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
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

    // TODO: hydrate real metrics once telemetry endpoints are available
    const metrics: AdminSummaryMetrics = {
        updateQueuePending: null,
        moderationFlags: null,
        enrichmentBacklog: null,
        protectedFields: null,
    };

    return (
        <div className="space-y-6">
            <AdminLandingClient metrics={metrics} />
        </div>
    );
}




