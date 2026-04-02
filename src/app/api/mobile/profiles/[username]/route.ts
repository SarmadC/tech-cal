import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiAuthContext } from '@/lib/apiAuth';
import { createServiceClient } from '@/utils/supabase/service';
import { toMobilePublicProfile } from '@/app/api/mobile/communitySerializers';
import { PublicProfileService } from '@/services/publicProfileService';
import { FollowService } from '@/services/followService';

const ParamsSchema = z.object({
  username: z.string().min(1),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { supabase, user } = await getApiAuthContext(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid username' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Profile service is not configured.' },
        { status: 500 }
      );
    }

    const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
    const profile = await PublicProfileService.getPublicProfileByUsername(
      parsedParams.data.username,
      user.id,
      readSupabase
    );

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    const relationship =
      profile.isViewerOwner
        ? null
        : await FollowService.getFollowStatus(user.id, profile.id, supabase);

    return NextResponse.json({
      success: true,
      data: toMobilePublicProfile(profile, relationship),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load mobile profile',
      },
      { status: 500 }
    );
  }
}
