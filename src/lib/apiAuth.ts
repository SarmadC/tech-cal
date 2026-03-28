import type { User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import type { SupabaseClientType } from '@/types';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient, createUserScopedClient } from '@/utils/supabase/service';

export interface ApiAuthContext {
  authMode: 'cookie' | 'bearer';
  accessToken: string | null;
  supabase: SupabaseClientType;
  user: User | null;
}

function extractBearerToken(request: Request | NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function getApiAuthContext(
  request: Request | NextRequest
): Promise<ApiAuthContext> {
  const accessToken = extractBearerToken(request);

  if (accessToken) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error('Supabase environment is not configured for bearer-token API access.');
    }

    const supabase = createUserScopedClient(supabaseUrl, supabaseAnonKey, accessToken);
    const serviceClient = createServiceClient(supabaseUrl, serviceRoleKey);
    const {
      data: { user },
    } = await serviceClient.auth.getUser(accessToken);

    return {
      authMode: 'bearer',
      accessToken,
      supabase,
      user,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    authMode: 'cookie',
    accessToken: null,
    supabase,
    user,
  };
}
