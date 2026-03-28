import { NextResponse } from 'next/server';
import { communityReportSchema } from '@kurecal/domain';
import { getApiAuthContext } from '@/lib/apiAuth';
import { CommunityReportService } from '@/services/communityReportService';

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = communityReportSchema.parse(await request.json());
    const report = await CommunityReportService.createReport(user.id, payload, supabase);
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
