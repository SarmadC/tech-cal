import { logger } from '@/utils/logger';
/**
 * API Route: Organizer Logo Upload
 * 
 * POST: Upload organizer logo to Supabase storage
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

        const formData = (await request.formData()) as unknown as globalThis.FormData;
        const organizerId = formData.get('organizerId') as string;
        const file = formData.get('file') as File;

        // Validate organizerId
        if (!organizerId || typeof organizerId !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid organizerId' },
                { status: 400 }
            );
        }

        // Validate file exists
        if (!file) {
            return NextResponse.json(
                { error: 'Missing file in request' },
                { status: 400 }
            );
        }

        // Validate file is actually a File instance
        if (!(file instanceof File)) {
            console.error('Invalid file type received:', typeof file, file);
            return NextResponse.json(
                { error: 'Invalid file type. Expected File instance.' },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size === 0) {
            console.error('File size is 0:', { name: file.name, type: file.type, size: file.size });
            return NextResponse.json(
                { error: 'File is empty (size is 0 bytes)' },
                { status: 400 }
            );
        }

        // Log file properties for debugging
        logger.debug('Uploading logo:', {
            organizerId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
        });

        // Get service client for storage operations (bypasses RLS on storage bucket)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Missing Supabase service credentials' },
                { status: 500 }
            );
        }

        const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

        // Use service client for storage operations (bypasses RLS)
        const result = await EventEnrichmentService.uploadOrganizerLogo(
            organizerId,
            file,
            serviceClient
        );

        // Update organizer record using service client (bypasses RLS)
        if (result.success && result.logoUrl) {
            // Use fileName from result if available, otherwise extract from URL
            const fileName = (result as { fileName?: string }).fileName || 
                result.logoUrl.split('/').pop()?.split('?')[0] || 
                `${organizerId}.${file.name.split('.').pop() || 'png'}`;
            
            // Update organizer record using service client (bypasses RLS)
            const { error: updateError } = await serviceClient
                .from('organizers')
                .update({ logo_url: fileName })
                .eq('id', organizerId);

            if (updateError) {
                console.error('Failed to update organizer logo_url with service client:', updateError);
                // Still return success since file was uploaded, but log the error
            } else {
                logger.debug('Successfully updated organizer logo_url:', fileName);
            }
        }

        if (!result.success) {
            console.error('Logo upload failed:', result.error);
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('Error in logo upload API:', {
            message: errorMessage,
            stack: errorStack,
            error,
        });
        return NextResponse.json(
            { error: `Internal server error: ${errorMessage}` },
            { status: 500 }
        );
    }
}
