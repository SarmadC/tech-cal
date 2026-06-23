import type { NextRequest } from 'next/server';
import { unauthorizedJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
import { communityVoteSchema } from '@/lib/communitySchemas';
import { CommunityMutationsService } from '@/services/communityMutationsService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function POST(request: Request) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) return unauthorizedJson();

    const payload = communityVoteSchema.parse(await request.json());
    await CommunityMutationsService.submitVote(
      authContext.user.id,
      payload,
      authContext.supabase
    );
    return successJson({ success: true });
  } catch (error) {
    return catchErrorJson(error, 'Failed to submit vote', 400);
  }
}
