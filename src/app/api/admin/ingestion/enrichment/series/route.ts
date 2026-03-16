/**
 * API Route: Create Event Series
 *
 * POST: Create a new series in the event_series table
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { name, description, website_url } = body as {
            name: string;
            description?: string;
            website_url?: string;
        };

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Series name is required' }, { status: 400 });
        }

        const trimmedName = name.trim();

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

        // Check for an existing series with the same name (case-insensitive)
        const { data: existing, error: searchError } = await serviceClient
            .from('event_series')
            .select('id, name')
            .ilike('name', trimmedName)
            .limit(1);

        if (searchError) {
            console.error('Error searching for series:', searchError);
            return NextResponse.json({ error: 'Database error checking for duplicates' }, { status: 500 });
        }

        if (existing && existing.length > 0) {
            return NextResponse.json({
                success: true,
                seriesId: existing[0].id,
                seriesName: existing[0].name,
                message: 'Series already exists',
            });
        }

        const { data: newSeries, error: insertError } = await serviceClient
            .from('event_series')
            .insert({
                name: trimmedName,
                description: description?.trim() || null,
                website_url: website_url?.trim() || null,
            })
            .select('id, name')
            .single();

        if (insertError || !newSeries) {
            console.error('Error creating series:', insertError);
            return NextResponse.json({ error: 'Failed to create series' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            seriesId: newSeries.id,
            seriesName: newSeries.name,
            message: 'Series created successfully',
        });

    } catch (error) {
        console.error('Error in create series API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
