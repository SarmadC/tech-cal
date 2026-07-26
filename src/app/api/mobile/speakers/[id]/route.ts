import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { mobileSpeakerDetailSchema } from '@kurecal/domain';

import { MobileSpeakerService } from '@/services/mobileSpeakerService';
import { UserNetworkingContactService } from '@/services/userNetworkingContactService';
import { createServiceClient } from '@/utils/supabase/service';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const ParamsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<unknown> }
) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) {
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

    const networkingContact = await UserNetworkingContactService.getContactForTarget(
      {
        viewerUserId: authContext.user.id,
        targetKind: 'speaker',
        targetId: speaker.id,
      },
      authContext.supabase
    );

    return NextResponse.json({
      success: true,
      data: mobileSpeakerDetailSchema.parse({
        ...speaker,
        networkingState: UserNetworkingContactService.toNetworkingState(
          networkingContact
        ),
      }),
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load mobile speaker',
      },
      { status: 500 }
    );
  }
}
