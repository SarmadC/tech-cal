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

    const statusParam = request.nextUrl.searchParams.get('status') || 'pending';
    const limitParam = Number.parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(limitParam) ? limitParam : 50;

    let query = serviceClient
        .from('events')
        .select('id, title, start_time, source_url, enrichment_status, enrichment_metadata, updated_at, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (statusParam !== 'all') {
        query = query.eq('enrichment_status', statusParam);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: data || [] });
}

