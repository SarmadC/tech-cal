import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

import { createServiceClient } from '@/utils/supabase/service';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

// `push_tokens` isn't in the generated Database types yet. Cast through
// `unknown` so callers can use the table without losing the rest of the typed
// client. Regenerate types after the migration ships to remove this.
type AnyTableClient = {
  from: (table: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    upsert: (values: Record<string, unknown>, options: { onConflict: string }) => Promise<{ error: any }>;
    delete: () => {
      eq: (col: string, val: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eq: (col: string, val: string) => Promise<{ error: any }>;
      };
    };
  };
};

function getServiceClient(): AnyTableClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service role credentials are not configured');
  }
  return createServiceClient(url, key) as unknown as AnyTableClient;
}

const registerSchema = z.object({
  expoPushToken: z.string().min(1),
  deviceId: z.string().min(1),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string().optional(),
});

const unregisterSchema = z.object({
  deviceId: z.string().min(1),
});

export async function POST(request: Request) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = registerSchema.parse(await request.json().catch(() => ({})));
    const supabase = getServiceClient();

    const now = new Date().toISOString();
    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: authContext.user.id,
        expo_push_token: body.expoPushToken,
        device_id: body.deviceId,
        platform: body.platform,
        app_version: body.appVersion ?? null,
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: 'expo_push_token' }
    );

    if (error) throw error;

    return NextResponse.json({ success: true, data: { ok: true } });
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to register push token',
      },
      { status }
    );
  }
}

export async function DELETE(request: Request) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = unregisterSchema.parse(await request.json().catch(() => ({})));
    const supabase = getServiceClient();

    // Best-effort: if this DELETE fails (offline sign-out, server error), the
    // row is reassigned to the next user when they sign in on this device
    // (upsert is keyed on expo_push_token). The gap window can still deliver
    // one stale push; acceptable trade-off vs. blocking sign-out.
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', authContext.user.id)
      .eq('device_id', body.deviceId);

    if (error) throw error;

    return NextResponse.json({ success: true, data: { ok: true } });
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to unregister push token',
      },
      { status }
    );
  }
}
