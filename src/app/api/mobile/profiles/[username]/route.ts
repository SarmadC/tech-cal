import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { toMobilePublicProfile } from '@/app/api/mobile/communitySerializers';
import { CommunityHubService } from '@/services/communityHubService';
import { FollowService } from '@/services/followService';
import { PublicProfileService } from '@/services/publicProfileService';
import { UserNetworkingContactService } from '@/services/userNetworkingContactService';
import { createServiceClient } from '@/utils/supabase/service';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const ParamsSchema = z.object({
  username: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid username' },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Profile service is not configured.' },
        { status: 500 },
      );
    }

    const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
    const profile =
      parsedParams.data.username === '__current__'
        ? await PublicProfileService.getPublicProfileById(
            authContext.user.id,
            authContext.user.id,
            readSupabase,
          )
        : await PublicProfileService.getPublicProfileByUsername(
            parsedParams.data.username,
            authContext.user.id,
            readSupabase,
          );

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 },
      );
    }

    const [relationship, networkingContact, communityPosts] = await Promise.all(
      [
        profile.isViewerOwner
          ? Promise.resolve(null)
          : FollowService.getFollowStatus(
              authContext.user.id,
              profile.id,
              authContext.supabase,
            ),
        profile.isViewerOwner
          ? Promise.resolve(null)
          : UserNetworkingContactService.getContactForTarget(
              {
                viewerUserId: authContext.user.id,
                targetKind: 'profile',
                targetId: profile.id,
              },
              authContext.supabase,
            ),
        CommunityHubService.getProfilePosts({
          profileUserId: profile.id,
          readClient: readSupabase,
        }).catch(() => []),
      ],
    );

    return NextResponse.json({
      success: true,
      data: toMobilePublicProfile(
        profile,
        relationship,
        UserNetworkingContactService.toNetworkingState(networkingContact),
        communityPosts,
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load mobile profile',
      },
      { status: 500 },
    );
  }
}
