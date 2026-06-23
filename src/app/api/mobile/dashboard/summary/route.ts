import { NextResponse } from 'next/server';

import { unauthorizedJson, catchErrorJson } from '@/lib/api/apiResponse';
import { getServiceSupabaseClient } from '@/lib/api/serviceClient';
import { buildMobileDashboardSummaryForUser } from '@/services/dashboard/dashboardSummaryService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as never);
    if (!authContext) return unauthorizedJson();

    const readClient = getServiceSupabaseClient() ?? authContext.supabase;

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
    return catchErrorJson(error, 'Failed to load dashboard summary');
  }
}
