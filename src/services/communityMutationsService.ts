import type {
  CommunityCommentDraft,
  CommunityPostDraft,
  CommunityVoteInput,
} from '@/lib/communitySchemas';
import type { SupabaseClientType } from '@/types';
import { CommunityModerationService } from '@/services/communityModerationService';

export class CommunityMutationsService {
  static async createPost(
    userId: string,
    payload: CommunityPostDraft,
    supabase: SupabaseClientType
  ): Promise<{ id: string }> {
    await CommunityModerationService.assertUserCanParticipate(userId, supabase);

    const { data, error } = await supabase
      .from('circle_posts')
      .insert({
        circle_id: payload.circleId,
        author_id: userId,
        content: payload.content.trim(),
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '42501') {
        throw new Error('You must join this circle to post.');
      }
      throw new Error(error.message ?? 'Failed to create post.');
    }

    return { id: data.id };
  }

  static async createComment(
    userId: string,
    payload: CommunityCommentDraft,
    supabase: SupabaseClientType
  ): Promise<{ id: string }> {
    await Promise.all([
      CommunityModerationService.assertUserCanParticipate(userId, supabase),
      CommunityModerationService.assertPostAllowsReplies(payload.postId, supabase),
      ...(payload.parentId
        ? [
            CommunityModerationService.assertReplyParentMatchesPost(
              payload.postId,
              payload.parentId,
              supabase
            ),
          ]
        : []),
    ]);

    const { data, error } = await supabase
      .from('circle_comments')
      .insert({
        post_id: payload.postId,
        author_id: userId,
        content: payload.content.trim(),
        parent_id: payload.parentId ?? null,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '42501') {
        throw new Error('You must join this circle to comment.');
      }
      throw new Error(error.message ?? 'Failed to create comment.');
    }

    return { id: data.id };
  }

  static async submitVote(
    userId: string,
    payload: CommunityVoteInput,
    supabase: SupabaseClientType
  ): Promise<void> {
    await Promise.all([
      CommunityModerationService.assertUserCanParticipate(userId, supabase),
      CommunityModerationService.assertVoteTargetIsActive(
        payload.entityType,
        payload.entityId,
        supabase
      ),
    ]);

    const table = payload.entityType === 'post' ? 'circle_post_votes' : 'circle_comment_votes';
    const subjectKey = payload.entityType === 'post' ? 'post_id' : 'comment_id';

    if (payload.voteType === 0) {
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq(subjectKey, payload.entityId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message ?? 'Failed to clear vote.');
      }

      return;
    }

    const { error } = await (supabase as any)
      .from(table)
      .upsert(
        {
          [subjectKey]: payload.entityId,
          user_id: userId,
          vote_type: payload.voteType,
        },
        { onConflict: `user_id,${subjectKey}` }
      );

    if (error) {
      if (error.code === '42501') {
        throw new Error('You must join this circle to vote.');
      }
      throw new Error(error.message ?? 'Failed to submit vote.');
    }
  }
}
