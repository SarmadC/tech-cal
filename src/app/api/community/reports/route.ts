import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { unauthorizedJson, errorJson, catchErrorJson } from '@/lib/api/apiResponse';
import { communityReportSchema } from '@/lib/communitySchemas';
import { validateSameOriginRequest } from '@/lib/requestSecurity';
import { CommunityReportService } from '@/services/communityReportService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) return unauthorizedJson();
    if (authContext.authMethod === 'cookie') {
      const sameOriginError = validateSameOriginRequest(request as NextRequest);
      if (sameOriginError) return errorJson(sameOriginError, 403);
    }

    const payload = communityReportSchema.parse(await request.json());
    const report = await CommunityReportService.createReport(
      authContext.user.id,
      payload,
      authContext.supabase
    );
    return NextResponse.json({
      success: true,
      data: report,
      message: 'Thanks. Your report has been submitted for review.',
    });
  } catch (error) {
    return catchErrorJson(error, 'Failed to submit report', 400);
  }
}
