import { NextResponse, type NextRequest } from 'next/server';
import { communityCommentDraftSchema } from '@/lib/communitySchemas';
import { validateSameOriginRequest } from '@/lib/requestSecurity';
import { CommunityMutationsService } from '@/services/communityMutationsService';
import { sendPushToUser } from '@/services/pushNotificationService';
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
    if (authContext.authMethod === 'cookie') {
      const sameOriginError = validateSameOriginRequest(request as NextRequest);
      if (sameOriginError) {
        return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 });
      }
    }

    const payload = communityCommentDraftSchema.parse(await request.json());
    const comment = await CommunityMutationsService.createComment(
      authContext.user.id,
      payload,
      authContext.supabase
    );

    void (async () => {
      try {
        const { data: post } = await authContext.supabase
          .from('circle_posts')
          .select('author_id, circle_id')
          .eq('id', payload.postId)
          .maybeSingle();
        const postRow = post as
          | { author_id?: string; circle_id?: string }
          | null;
        const postAuthorId = postRow?.author_id;
        if (postAuthorId && postAuthorId !== authContext.user.id) {
          let slug: string | null = null;
          if (postRow?.circle_id) {
            const { data: circle } = await authContext.supabase
              .from('circles')
              .select('slug')
              .eq('id', postRow.circle_id)
              .maybeSingle();
            slug = (circle as { slug?: string } | null)?.slug ?? null;
          }
          await sendPushToUser(postAuthorId, {
            title: 'New reply',
            body: 'Someone replied to your post',
            data: {
              type: 'community_post_reply',
              postId: payload.postId,
              slug,
            },
          });
        }
      } catch (pushError) {
        console.warn('[push] community_post_reply notification failed', pushError);
      }
    })();

    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create comment',
      },
      { status: 400 }
    );
  }
}
