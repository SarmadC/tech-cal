import { usernameAvailabilityResultSchema } from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { SocialProfileService } from '@/services/socialProfileService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

const querySchema = z.object({
  q: z.string().trim().min(1).max(30),
});

export async function GET(request: Request) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const validation = querySchema.safeParse({ q: url.searchParams.get('q') });
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid query parameter', details: validation.error.issues },
      { status: 400 }
    );
  }

  try {
    const availability = await SocialProfileService.checkUsernameAvailability(
      validation.data.q,
      authContext.user.id,
      authContext.supabase
    );

    return NextResponse.json({
      success: true,
      data: usernameAvailabilityResultSchema.parse(availability),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check username availability',
      },
      { status: 500 }
    );
  }
}
