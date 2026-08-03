import { isReservedUsername, isValidUsernameFormat, normalizeUsername } from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdmin } from '@/lib/adminAuth';
import { validateSameOriginRequest } from '@/lib/requestSecurity';
import { createServiceClient } from '@/utils/supabase/service';
import { createClient } from '@/utils/supabase/server';

const overrideSchema = z.object({
  profileId: z.string().uuid(),
  username: z.string().trim().min(3).max(30),
  reason: z.string().trim().min(1).max(1500),
});

export async function PATCH(request: Request) {
  try {
    const sameOriginError = validateSameOriginRequest(request as never);
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    await requireAdmin(user.id, supabase);

    const payload = overrideSchema.parse(await request.json());
    const username = normalizeUsername(payload.username);
    if (!isValidUsernameFormat(username)) {
      return NextResponse.json({ success: false, error: 'Invalid username format.' }, { status: 400 });
    }
    if (isReservedUsername(username)) {
      return NextResponse.json({ success: false, error: 'That username is reserved.' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) throw new Error('Support override is not configured.');

    const serviceClient = createServiceClient(url, serviceRoleKey);
    const { error } = await (serviceClient.rpc as any)('support_override_username', {
      p_actor_id: user.id,
      p_next_username: username,
      p_profile_id: payload.profileId,
      p_reason: payload.reason,
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to override username.' },
      { status: 400 }
    );
  }
}
