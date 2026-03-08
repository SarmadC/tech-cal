import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/adminAuth';
import { createClient } from '@/utils/supabase/server';

type DebugRouteAccess =
    | {
          response: NextResponse;
          supabase?: never;
      }
    | {
          response?: never;
          supabase: Awaited<ReturnType<typeof createClient>>;
      };

export async function requireDebugRouteAccess(): Promise<DebugRouteAccess> {
    if (process.env.NODE_ENV === 'production') {
        return {
            response: NextResponse.json({ error: 'Not found' }, { status: 404 }),
        };
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return {
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) {
        return {
            response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
        };
    }

    return { supabase };
}
