import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/apiAuth';
import { createServiceClient } from '@/utils/supabase/service';
import { toMobileCommunityHome } from '@/app/api/mobile/communitySerializers';
import { CommunityNetworkingHomeService } from '@/services/communityNetworkingHomeService';

export async function GET(request: Request) {
  try {
    const { user } = await getApiAuthContext(request);
    if (!user) {
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
      viewerId: user.id,
      readClient: readSupabase,
    });

    return NextResponse.json({
      success: true,
      data: toMobileCommunityHome(data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load community home',
      },
      { status: 500 }
    );
  }
}
