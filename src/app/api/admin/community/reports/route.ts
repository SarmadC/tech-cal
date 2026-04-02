import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { requireAdmin } from '@/lib/adminAuth';
import { CommunityReportService } from '@/services/communityReportService';

const resolutionSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(['reviewing', 'resolved', 'dismissed']),
  resolution: z.enum(['removed', 'warned', 'no-action', 'other']).optional(),
  resolutionNotes: z.string().max(1_500).optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    await requireAdmin(user.id, supabase);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Community reporting admin API is not configured.');
    }

    const serviceClient = createServiceClient(supabaseUrl, serviceRoleKey);
    const status = new URL(request.url).searchParams.get('status') as
      | 'open'
      | 'reviewing'
      | 'resolved'
      | 'dismissed'
      | null;

    const reports = await CommunityReportService.listReports(serviceClient, status ?? undefined);
    return NextResponse.json({ success: true, data: reports });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load reports' },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    await requireAdmin(user.id, supabase);

    const payload = resolutionSchema.parse(await request.json());
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Community reporting admin API is not configured.');
    }

    const serviceClient = createServiceClient(supabaseUrl, serviceRoleKey);
    const report = await CommunityReportService.resolveReport(
      payload.reportId,
      user.id,
      {
        status: payload.status,
        resolution: payload.resolution,
        resolutionNotes: payload.resolutionNotes,
      },
      serviceClient
    );

    return NextResponse.json({
      success: true,
      data: report,
      message: 'Community report updated.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update report' },
      { status: 400 }
    );
  }
}
