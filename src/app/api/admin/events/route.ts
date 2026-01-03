/**
 * API Route: Admin Events List
 *
 * GET: Fetch paginated events with search, sorting, and joins
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json(
            { error: 'Service role credentials not configured' },
            { status: 500 }
        );
    }

    const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const sortBy = searchParams.get('sortBy') || 'start_time';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? true : false;

    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Build the query with joins
    let query = serviceClient
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
        );

    // Apply search filter if provided
    if (search) {
        // Search across title, location, and organizer name
        query = query.or(
            `title.ilike.%${search}%,location.ilike.%${search}%`
        );
    }

    // Apply sorting
    const validSortColumns = ['title', 'start_time', 'created_at', 'updated_at', 'location'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'start_time';
    query = query.order(sortColumn, { ascending: sortOrder });

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
        console.error('Error fetching events:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        events: data || [],
        total: count || 0,
        page,
        pageSize,
    });
}

