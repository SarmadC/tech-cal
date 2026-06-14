import { NextResponse } from 'next/server';

import { buildMobileDashboardSummaryForUser } from '@/services/dashboard/dashboardSummaryService';
import { createServiceClient } from '@/utils/supabase/service';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as never);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const readClient =
      supabaseUrl && serviceRoleKey
        ? createServiceClient(supabaseUrl, serviceRoleKey)
        : authContext.supabase;

    const { summary, legacyMobileFields } =
      await buildMobileDashboardSummaryForUser({
        userId: authContext.user.id,
        supabase: authContext.supabase,
        readClient,
      });

    return NextResponse.json({
      success: true,
      data: {
        ...summary,
        // Keep the legacy Phase 2 fields temporarily so stale dev-client bundles
        // can keep loading while the restored dashboard UI rolls out.
        ...legacyMobileFields,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load dashboard summary',
      },
      { status: 500 }
    );
  }
}
