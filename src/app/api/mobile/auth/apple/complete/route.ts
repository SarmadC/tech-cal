import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { retainAppleAuthorization } from '@/services/appleAuthorizationService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';
import { createServiceClient } from '@/utils/supabase/service';

const inputSchema = z.object({
  authorizationCode: z.string().trim().min(1).max(4096),
  clientId: z.string().trim().min(1).max(255),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid Apple authorization.' }, { status: 400 });
    }
    const identity = authContext.user.identities?.find((candidate) => candidate.provider === 'apple');
    const expectedSubject = identity?.identity_data?.sub;
    if (typeof expectedSubject !== 'string' || !expectedSubject) {
      return NextResponse.json({ success: false, error: 'Apple identity is missing.' }, { status: 409 });
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ success: false, error: 'Apple authorization is not configured.' }, { status: 500 });
    }

    await retainAppleAuthorization(
      createServiceClient(supabaseUrl, serviceRoleKey),
      {
        ...parsed.data,
        expectedSubject,
        userId: authContext.user.id,
      },
    );
    return NextResponse.json({ success: true, data: { retained: true } });
  } catch (error) {
    console.error('Apple authorization retention failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to retain Apple authorization.' },
      { status: 500 },
    );
  }
}
