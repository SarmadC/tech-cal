import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mobileSpeakerDetailSchema } from '@kurecal/domain';
import { getApiAuthContext } from '@/lib/apiAuth';
import { createServiceClient } from '@/utils/supabase/service';
import { MobileSpeakerService } from '@/services/mobileSpeakerService';

const ParamsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getApiAuthContext(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid speaker id' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Speaker service is not configured.' },
        { status: 500 }
      );
    }

    const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
    const speaker = await MobileSpeakerService.getSpeakerDetail({
      speakerId: parsedParams.data.id,
      readClient: readSupabase,
    });

    if (!speaker) {
      return NextResponse.json(
        { success: false, error: 'Speaker not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mobileSpeakerDetailSchema.parse(speaker),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load mobile speaker',
      },
      { status: 500 }
    );
  }
}
