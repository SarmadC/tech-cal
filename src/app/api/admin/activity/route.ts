/**
 * API Route: Admin Activity Log
 * 
 * GET: Fetch extraction job logs with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
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

        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '30', 10);
        const status = url.searchParams.get('status'); // 'succeeded' | 'failed' | 'pending'
        const search = url.searchParams.get('search');

        let query = supabase
            .from('extraction_job_log')
            .select(`
                id,
                event_id,
                source_url,
                normalized_url,
                source_domain,
                adapter,
                decision,
                status,
                duration_ms,
                started_at,
                completed_at,
                cache_hit,
                metadata,
                events:events(id,title)
            `)
            .order('started_at', { ascending: false })
            .limit(Math.min(limit, 100));

        // Apply status filter
        if (status) {
            if (status === 'succeeded') {
                query = query.in('status', ['succeeded', 'success', 'completed']);
            } else if (status === 'failed') {
                query = query.in('status', ['failed', 'error', 'timeout']);
            } else if (status === 'pending') {
                query = query.in('status', ['pending', 'queued', 'running', 'in_progress']);
            }
        }

        // Apply search filter if provided
        if (search) {
            // For text search, we'll filter by source_url, source_domain, or adapter
            query = query.or(`source_url.ilike.%${search}%,source_domain.ilike.%${search}%,adapter.ilike.%${search}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching activity logs:', error);
            throw new Error(error.message);
        }

        return NextResponse.json({ items: data || [] });

    } catch (error) {
        console.error('Error in activity API:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
