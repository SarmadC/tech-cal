import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteUserAccount } from '@/services/accountDeletionService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';
import { createServiceClient } from '@/utils/supabase/service';

const deletionSchema = z.object({ confirmation: z.literal('DELETE') });

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const parsed = deletionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Type DELETE to confirm account deletion.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Account deletion is not configured.' },
        { status: 500 }
      );
    }

    await deleteUserAccount(
      createServiceClient(supabaseUrl, serviceRoleKey),
      authContext.user.id
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    console.error('Account deletion failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to delete account',
      },
      { status: 500 }
    );
  }
}
