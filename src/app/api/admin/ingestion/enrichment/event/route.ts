/**
 * API Route: Event Core Fields & Relationships Enrichment
 * 
 * PUT: Update core event fields and relationships in one transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import { EventEnrichmentService, type EventCoreFieldsInput, type EventRelationshipsInput } from '@/services/ingestion/EventEnrichmentService';

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
        const { eventId, coreFields, relationships, organizerData } = body as {
            eventId: string;
            coreFields?: EventCoreFieldsInput;
            relationships?: EventRelationshipsInput;
            organizerData?: {
                organizerId: string;
                name?: string;
                description?: string;
                website_url?: string;
                social_media?: Record<string, unknown> | null;
            };
        };

        if (!eventId) {
            return NextResponse.json(
                { error: 'Missing required field: eventId' },
                { status: 400 }
            );
        }

        // Use service client to bypass RLS for all database operations
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

        // Update core fields if provided
        if (coreFields) {
            const coreResult = await EventEnrichmentService.updateEventCoreFields(
                eventId,
                coreFields,
                serviceClient,
                user.id
            );

            if (!coreResult.success) {
                console.error('Failed to update core fields:', coreResult.error);
                return NextResponse.json(
                    { error: coreResult.error || 'Failed to update core fields' },
                    { status: 500 }
                );
            }
        }

        // Update relationships if provided
        if (relationships) {
            const relResult = await EventEnrichmentService.manageEventRelationships(
                eventId,
                relationships,
                serviceClient,
                user.id
            );

            if (!relResult.success) {
                console.error('Failed to update relationships:', relResult.error);
                return NextResponse.json(
                    { error: relResult.error || 'Failed to update relationships' },
                    { status: 500 }
                );
            }
        }

        // Update organizer data if provided
        if (organizerData && organizerData.organizerId) {
            const orgResult = await EventEnrichmentService.enrichOrganizer(
                organizerData.organizerId,
                {
                    name: organizerData.name,
                    description: organizerData.description,
                    website_url: organizerData.website_url,
                    social_media: organizerData.social_media,
                },
                serviceClient
            );

            if (!orgResult.success) {
                console.error('Failed to update organizer:', orgResult.error);
                return NextResponse.json(
                    { error: orgResult.error || 'Failed to update organizer' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Event updated successfully',
        });
    } catch (error) {
        console.error('Error in event enrichment API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}


export async function DELETE(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json(
                { error: 'Missing required field: eventId' },
                { status: 400 }
            );
        }

        // Use service client to bypass RLS for all database operations
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

        const { error } = await serviceClient
            .from('events')
            .delete()
            .eq('id', eventId);

        if (error) {
            console.error('Failed to delete event:', error);
            return NextResponse.json(
                { error: error.message || 'Failed to delete event' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Event deleted successfully',
        });
    } catch (error) {
        console.error('Error in event deletion API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
