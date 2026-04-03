import { NextResponse, type NextRequest } from 'next/server';

import type { SupabaseClientType } from '@/types/database';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

async function resolveCircle(
  circleId: string,
  supabase: SupabaseClientType
) {
  const { data, error } = await supabase
    .from('circles')
    .select('id')
    .eq('id', circleId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? 'Failed to load circle.');
  }

  return data;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: circleId } = await params;
    if (!circleId) {
      return NextResponse.json(
        { success: false, error: 'Missing circle ID' },
        { status: 400 }
      );
    }

    const circle = await resolveCircle(circleId, authContext.supabase);
    if (!circle) {
      return NextResponse.json(
        { success: false, error: 'Circle not found' },
        { status: 404 }
      );
    }

    const { error } = await authContext.supabase.from('circle_members').insert({
      circle_id: circleId,
      user_id: authContext.user.id,
    });

    if (error && error.code !== '23505') {
      return NextResponse.json(
        { success: false, error: error.message ?? 'Failed to join circle' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: error?.code === '23505' ? 'Already a member' : 'Joined circle',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to join circle',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: circleId } = await params;
    if (!circleId) {
      return NextResponse.json(
        { success: false, error: 'Missing circle ID' },
        { status: 400 }
      );
    }

    const circle = await resolveCircle(circleId, authContext.supabase);
    if (!circle) {
      return NextResponse.json(
        { success: false, error: 'Circle not found' },
        { status: 404 }
      );
    }

    const { error } = await authContext.supabase
      .from('circle_members')
      .delete()
      .match({
        circle_id: circleId,
        user_id: authContext.user.id,
      });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message ?? 'Failed to leave circle' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Left circle' });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to leave circle',
      },
      { status: 500 }
    );
  }
}
