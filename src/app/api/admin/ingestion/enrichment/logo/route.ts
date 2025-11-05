/**
 * API Route: Organizer Logo Upload
 * 
 * POST: Upload organizer logo to Supabase storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
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
        const organizerId = formData.get('organizerId') as string;
        const file = formData.get('file') as File;

        if (!organizerId || !file) {
            return NextResponse.json(
                { error: 'Missing required fields: organizerId, file' },
                { status: 400 }
            );
        }

        const result = await EventEnrichmentService.uploadOrganizerLogo(
            organizerId,
            file,
            supabase
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to upload logo' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            logoUrl: result.logoUrl,
        });
    } catch (error) {
        console.error('Error in logo upload API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

