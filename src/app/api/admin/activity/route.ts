/**
 * API Route: Admin Activity Log
 * 
 * GET: Fetch extraction job logs with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import { commonSchemas, adminSchemas, sanitizeSearchQuery } from '@/lib/apiValidation';

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

        const url = new URL(request.url);
        
        // Validate and parse query parameters
        const limit = commonSchemas.limit.parse(url.searchParams.get('limit'));
        const status = adminSchemas.statusFilter.parse(url.searchParams.get('status'));
        const search = sanitizeSearchQuery(url.searchParams.get('search'));

        let query = serviceClient
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

        // Apply search filter if provided - search is already sanitized
        if (search) {
            const searchPattern = `%${search}%`;
            // Build filter string safely - Supabase PostgREST will handle the escaping
            // Format: "column.ilike.pattern,column2.ilike.pattern"
            query = query.or(`source_url.ilike.${searchPattern},source_domain.ilike.${searchPattern},adapter.ilike.${searchPattern}`);
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
