import {
    createClient as createSupabaseClient,
    type SupabaseClient,
    type User,
} from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

import type { Database } from '@/types/supabase';
import { createClient as createServerClient } from '@/utils/supabase/server';

export interface AuthenticatedRequestContext {
    authMethod: 'cookie' | 'bearer';
    supabase: SupabaseClient<Database>;
    user: User;
}

function getBearerToken(request: Pick<NextRequest, 'headers'>): string | null {
    const authorization = request.headers.get('authorization');
    if (!authorization) {
        return null;
    }

    const [scheme, token] = authorization.split(' ');
    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
        return null;
    }

    return token.trim() || null;
}

function createBearerClient(accessToken: string): SupabaseClient<Database> | null {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return null;
    }

    return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: false,
        },
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
}

export async function getAuthenticatedRequestContext(
    request: NextRequest
): Promise<AuthenticatedRequestContext | null> {
    const cookieSupabase = await createServerClient();
    const {
        data: { user: cookieUser },
    } = await cookieSupabase.auth.getUser();

    if (cookieUser) {
        return {
            authMethod: 'cookie',
            supabase: cookieSupabase,
            user: cookieUser,
        };
    }

    const bearerToken = getBearerToken(request);
    if (!bearerToken) {
        return null;
    }

    const bearerSupabase = createBearerClient(bearerToken);
    if (!bearerSupabase) {
        return null;
    }

    const {
        data: { user: bearerUser },
    } = await bearerSupabase.auth.getUser(bearerToken);

    if (!bearerUser) {
        return null;
    }

    return {
        authMethod: 'bearer',
        supabase: bearerSupabase,
        user: bearerUser,
    };
}
