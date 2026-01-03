/**
 * Event Ingestion Moderation Dashboard
 * 
 * Admin-only route for reviewing and moderating ingested events.
 * Shows events in moderation queue with quality scores and bulk actions.
 */

export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';
import { redirect } from 'next/navigation';
import ModerationDashboardClient from './ModerationDashboardClient';

export default async function ModerationPage() {
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

    // Fetch moderation queue server-side
    const { data: queueItems, error } = await supabase
        .from('event_moderation_queue')
        .select(`
            *,
            source_events:source_event_id(
                id,
                raw_payload,
                checksum,
                created_at
            ),
            events:event_id(
                id,
                title,
                description,
                start_time,
                location,
                organizer:organizers(name),
                ingestion_quality_score,
                ingestion_provenance,
                enrichment_status
            )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(100);

    // Filter out events that have been enriched (enriched events should be reviewed in update queue)
    const filteredQueueItems = (queueItems ?? []).filter((item) => {
        const enrichmentStatus = item.events?.enrichment_status;
        return enrichmentStatus !== 'enriched';
    });

    const normalizedQueueItems = filteredQueueItems.map((item) => ({
        ...item,
        reason_codes: item.reason_codes ?? [],
        recommended_tags: item.recommended_tags ?? [],
    }));

    return (
        <ModerationDashboardClient
            initialQueueItems={normalizedQueueItems as unknown as Parameters<typeof ModerationDashboardClient>[0]['initialQueueItems']}
            error={error?.message}
        />
    );
}


