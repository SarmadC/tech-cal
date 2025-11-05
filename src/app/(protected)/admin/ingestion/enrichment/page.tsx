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
import { EventEnrichmentService } from '@/services/ingestion/EventEnrichmentService';
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

    // Fetch events needing enrichment
    const events = await EventEnrichmentService.getEventsNeedingEnrichment(supabase, 100);

    return (
        <div className="container mx-auto py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Event Enrichment Dashboard</h1>
                <p className="text-muted-foreground">
                    Manually enrich ingested events with agenda items, speakers, and organizer logos.
                </p>
            </div>

            <EnrichmentDashboardClient initialEvents={events} />
        </div>
    );
}

