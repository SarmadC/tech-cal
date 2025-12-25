/**
 * API Route: Event Image Upload
 * 
 * POST: Upload event image to Supabase storage
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

        // Check admin access
        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const formData = await request.formData();
        const eventId = formData.get('eventId') as string;
        const file = formData.get('file') as File;

        if (!eventId || !file) {
            return NextResponse.json(
                { error: 'Missing required fields: eventId, file' },
                { status: 400 }
            );
        }

        // Get service client for storage and database operations (bypasses RLS)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Missing Supabase service credentials' },
                { status: 500 }
            );
        }

        const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

        // Use service client for storage and database operations (bypasses RLS)
        const result = await EventEnrichmentService.uploadEventImage(
            eventId,
            file,
            serviceClient
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to upload image' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            imageUrl: result.imageUrl,
        });
    } catch (error) {
        console.error('Error in image upload API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

