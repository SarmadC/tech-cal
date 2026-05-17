import { NextResponse, type NextRequest } from 'next/server';
import { communityReportSchema } from '@/lib/communitySchemas';
import { validateSameOriginRequest } from '@/lib/requestSecurity';
import { CommunityReportService } from '@/services/communityReportService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    if (authContext.authMethod === 'cookie') {
      const sameOriginError = validateSameOriginRequest(request as NextRequest);
      if (sameOriginError) {
        return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 });
      }
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
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit report' },
      { status: 400 }
    );
  }
}
