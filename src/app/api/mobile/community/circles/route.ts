import { NextResponse } from 'next/server';
import { communityCircleSummarySchema } from '@kurecal/domain';
import { getApiAuthContext } from '@/lib/apiAuth';

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data, error } = await (supabase as any)
      .from('circle_members')
      .select('circle_id, circles:circle_id ( id, slug, name )')
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    const circles = communityCircleSummarySchema.array().parse(
      (data ?? [])
        .map((row: { circles?: unknown }) => row.circles)
        .filter(Boolean)
    );

    return NextResponse.json({
      success: true,
      data: circles,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load joined circles',
      },
      { status: 500 }
    );
  }
}
