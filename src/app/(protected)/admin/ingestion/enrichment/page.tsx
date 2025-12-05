/**
 * Event Enrichment Dashboard
 * 
 * Admin-only route for viewing events that need manual enrichment
 * (agenda items, speakers, organizer logos).
 */

export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import { redirect } from 'next/navigation';
import type { EnrichmentMetadata } from '@/types/enrichment';
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase service credentials are required for enrichment dashboard');
    }

    const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

    const { data } = await serviceClient
        .from('events')
        .select('id, title, start_time, source_url, ingestion_source_id, enrichment_status, enrichment_metadata, updated_at')
        .order('created_at', { ascending: false })
        .limit(100);

    const events =
        data?.map((event) => ({
            id: event.id,
            title: event.title ?? 'Untitled',
            start_time: event.start_time,
            source_url: event.source_url ?? '',
            ingestion_source_id: event.ingestion_source_id,
            enrichment_status: (event.enrichment_status as string | null) ?? 'pending',
            enrichment_metadata: (event.enrichment_metadata as EnrichmentMetadata | null) ?? null,
            updated_at: event.updated_at ?? null,
        })) || [];

    return (
        <div className="container mx-auto py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">LLM Enrichment Dashboard</h1>
                <p className="text-muted-foreground">
                    Trigger LLM-based enrichment, monitor status, and push enriched data to the review queue.
                </p>
            </div>

            <EnrichmentDashboardClient initialEvents={events} />
        </div>
    );
}

