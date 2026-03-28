import { NextResponse } from 'next/server';
import { communityVoteSchema } from '@kurecal/domain';
import { getApiAuthContext } from '@/lib/apiAuth';
import { CommunityMutationsService } from '@/services/communityMutationsService';

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = communityVoteSchema.parse(await request.json());
    await CommunityMutationsService.submitVote(user.id, payload, supabase);
    return NextResponse.json({ success: true, data: { success: true } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit vote' },
      { status: 400 }
    );
  }
}
