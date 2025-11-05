/**
 * API Route: Venue Management
 * 
 * POST: Create new venue
 * PUT: Update existing venue
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';
import { EventEnrichmentService, type VenueInput } from '@/services/ingestion/EventEnrichmentService';

export async function POST(request: NextRequest) {
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
        const venueData = body as VenueInput;

        if (!venueData.name) {
            return NextResponse.json(
                { error: 'Missing required field: name' },
                { status: 400 }
            );
        }

        const result = await EventEnrichmentService.createOrSelectVenue(
            venueData,
            null,
            supabase
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to create venue' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            venueId: result.venueId,
        });
    } catch (error) {
        console.error('Error in venue creation API:', error);
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
        const { venueId, venueData } = body as {
            venueId: string;
            venueData: VenueInput;
        };

        if (!venueId || !venueData.name) {
            return NextResponse.json(
                { error: 'Missing required fields: venueId, venueData.name' },
                { status: 400 }
            );
        }

        const result = await EventEnrichmentService.createOrSelectVenue(
            venueData,
            venueId,
            supabase
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to update venue' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            venueId: result.venueId,
        });
    } catch (error) {
        console.error('Error in venue update API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

