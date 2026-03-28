import { NextResponse } from 'next/server';
import { communityPostDraftSchema } from '@kurecal/domain';
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

    const payload = communityPostDraftSchema.parse(await request.json());
    const post = await CommunityMutationsService.createPost(user.id, payload, supabase);
    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create post' },
      { status: 400 }
    );
  }
}
