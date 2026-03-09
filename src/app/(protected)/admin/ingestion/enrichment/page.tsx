/**
 * Event Enrichment Dashboard
 * 
 * Admin-only route for viewing events that need manual enrichment
 * (agenda items, speakers, organizer logos).
 */

export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';
import { redirect } from 'next/navigation';
import EnrichmentDashboardClient from './EnrichmentDashboardClient';

export default async function EnrichmentPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Check admin access
    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) {
        redirect('/dashboard');
    }

    return (
        <div className="container mx-auto py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">LLM Enrichment Dashboard</h1>
                <p className="text-muted-foreground">
                    Trigger LLM-based enrichment, monitor status, and push enriched data to the review queue.
                </p>
            </div>

            <EnrichmentDashboardClient />
        </div>
    );
}
