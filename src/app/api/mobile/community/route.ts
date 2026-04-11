import { NextResponse, type NextRequest } from 'next/server';

import { buildMobileCommunityHome } from '@/app/api/mobile/communitySerializers';
import { CommunityNetworkingHomeService } from '@/services/communityNetworkingHomeService';
import { createServiceClient } from '@/utils/supabase/service';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Community service is not configured.' },
        { status: 500 }
      );
    }

    const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
    const data = await CommunityNetworkingHomeService.getHomeData({
      viewerId: authContext.user.id,
      readClient: readSupabase,
    });

    return NextResponse.json({
      success: true,
      data: buildMobileCommunityHome(data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load community home',
      },
      { status: 500 }
    );
  }
}
