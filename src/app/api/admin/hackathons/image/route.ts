/**
 * API Route: Hackathon Header Image Upload
 *
 * POST: Upload hackathon header/cover image to Supabase storage and update hackathons.header_image_url
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import { HackathonImageService } from '@/services/hackathonImageService';

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

        const formData = await request.formData();
        const hackathonId = formData.get('hackathonId') as string;
        const file = formData.get('file') as File;

        if (!hackathonId || !file) {
            return NextResponse.json(
                { error: 'Missing required fields: hackathonId, file' },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Missing Supabase service credentials' }, { status: 500 });
        }

        const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);
        const result = await HackathonImageService.uploadHackathonHeaderImage(hackathonId, file, serviceClient);

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Failed to upload image' }, { status: 500 });
        }

        return NextResponse.json({ success: true, imageUrl: result.imageUrl });
    } catch (error) {
        console.error('Error in hackathon image upload API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

