/**
 * API Route: Organizer Enrichment
 *
 * POST: Create a new organizer
 * PUT: Update organizer fields (name, description, website_url, social_media)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import { EventEnrichmentService } from '@/services/ingestion/EventEnrichmentService';

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
            name?: string;
            description?: string;
            website_url?: string;
        };

        if (!name || !name.trim()) {
            return NextResponse.json(
                { error: 'Missing required field: name' },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

        // Derive domain from website_url if provided
        let domain: string | null = null;
        if (website_url) {
            try {
                domain = new URL(website_url).hostname.replace(/^www\./, '');
            } catch {
                // Invalid URL, skip domain extraction
            }
        }

        const { data, error } = await serviceClient
            .from('organizers')
            .insert({
                name: name.trim(),
                description: description?.trim() || null,
                website_url: website_url?.trim() || null,
                domain,
                auto_discovered: false,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Failed to create organizer:', error);
            return NextResponse.json(
                { error: error.message || 'Failed to create organizer' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            organizerId: data.id,
        });
    } catch (error) {
        console.error('Error creating organizer:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin access
        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { organizerId, data } = body as {
            organizerId: string;
            data: {
                name?: string | null;
                description?: string | null;
                website_url?: string | null;
                social_media?: Record<string, unknown> | null;
            };
        };

        if (!organizerId) {
            return NextResponse.json(
                { error: 'Missing required field: organizerId' },
                { status: 400 }
            );
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

        const result = await EventEnrichmentService.enrichOrganizer(
            organizerId,
            data,
            serviceClient
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to update organizer' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Organizer updated successfully',
        });
    } catch (error) {
        console.error('Error in organizer enrichment API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

