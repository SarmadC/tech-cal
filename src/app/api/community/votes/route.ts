import { NextResponse, type NextRequest } from 'next/server';
import { communityVoteSchema } from '@/lib/communitySchemas';
import { CommunityMutationsService } from '@/services/communityMutationsService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = communityVoteSchema.parse(await request.json());
    await CommunityMutationsService.submitVote(
      authContext.user.id,
      payload,
      authContext.supabase
    );
    return NextResponse.json({ success: true, data: { success: true } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit vote' },
      { status: 400 }
    );
  }
}
