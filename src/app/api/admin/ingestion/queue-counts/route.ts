/**
 * Admin Queue Counts API
 * 
 * Returns pending item counts for all admin queues in a single request.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';

export interface QueueCountsResponse {
    updateQueue: number;
    moderation: number;
    enrichment: number;
    fieldProtection: number;
}

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Use service client to bypass RLS for admin operations
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase service credentials');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

        // Fetch counts in parallel - use type assertions for tables not in generated types
        const tableClient = serviceClient as any;
        
        const [
            updateQueueResult,
            moderationResult,
            enrichmentResult,
            fieldProtectionResult,
        ] = await Promise.all([
            // Pending update queue items
            tableClient
                .from('event_update_queue')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending'),
            
            // Pending moderation items
            serviceClient
                .from('event_moderation_queue')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending'),
            
            // Events needing enrichment (pending status)
            serviceClient
                .from('events')
                .select('id', { count: 'exact', head: true })
                .eq('enrichment_status', 'pending')
                .gt('start_time', new Date().toISOString()),
            
            // Fields with review_required protection mode
            tableClient
                .from('event_field_protection_config')
                .select('id', { count: 'exact', head: true })
                .eq('protection_mode', 'review_required'),
        ]);

        const counts: QueueCountsResponse = {
            updateQueue: updateQueueResult.count ?? 0,
            moderation: moderationResult.count ?? 0,
            enrichment: enrichmentResult.count ?? 0,
            fieldProtection: fieldProtectionResult.count ?? 0,
        };

        return NextResponse.json(counts);
    } catch (error) {
        console.error('[queue-counts] Error fetching counts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch queue counts' },
            { status: 500 }
        );
    }
}
