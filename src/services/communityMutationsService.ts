import type {
  CommunityCommentDraft,
  CommunityPostDraft,
  CommunityVoteInput,
} from '@/lib/communitySchemas';
import type { SupabaseClientType } from '@/types';
import { CommunityModerationService } from '@/services/communityModerationService';
import { NotificationService } from '@/services/notificationService';

export class CommunityMutationsService {
  static async createPost(
    userId: string,
    payload: CommunityPostDraft,
    supabase: SupabaseClientType
  ): Promise<{ id: string }> {
    await CommunityModerationService.assertUserCanParticipate(userId, supabase);

    const insertPayload: Record<string, unknown> = {
      circle_id: payload.circleId,
      author_id: userId,
      content: payload.content.trim(),
    };
    if (payload.postType) {
      insertPayload.post_type = payload.postType;
    }
    if (payload.eventId) {
      insertPayload.event_id = payload.eventId;
    }

    const { data, error } = await (supabase.from('circle_posts') as unknown as {
      insert: (row: Record<string, unknown>) => {
        select: (cols: string) => {
          single: () => Promise<{
            data: { id: string };
            error: { code?: string; message?: string } | null;
          }>;
        };
      };
    })
      .insert(insertPayload)
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
    // Profile-level participation check still runs in app code so the user
    // gets a friendlier error than the RPC's generic restrictions.
    await CommunityModerationService.assertUserCanParticipate(userId, supabase);

    const { data, error } = await (
      supabase as unknown as {
        rpc: (
          fn: string,
          args: Record<string, unknown>
        ) => Promise<{
          data: { comment_id: string; notification_id: string | null } | null;
          error: { code?: string; message?: string } | null;
        }>;
      }
    ).rpc('create_circle_comment_with_notification', {
      payload: {
        post_id: payload.postId,
        parent_id: payload.parentId ?? null,
        content: payload.content.trim(),
      },
    });

    if (error || !data) {
      const code = error?.code;
      const message = error?.message ?? '';
      if (code === '42501' || /not_a_member/.test(message)) {
        throw new Error('You must join this circle to comment.');
      }
      if (/post_not_replyable/.test(message)) {
        throw new Error('You cannot reply to a removed discussion.');
      }
      if (/parent_post_mismatch/.test(message)) {
        throw new Error('Replies must belong to the same discussion.');
      }
      if (/post_not_found/.test(message) || /parent_not_found/.test(message)) {
        throw new Error('The discussion you replied to is no longer available.');
      }
      throw new Error(error?.message ?? 'Failed to create comment.');
    }

    if (data.notification_id) {
      void NotificationService.dispatchPushForNotification(
        data.notification_id,
        supabase
      ).catch((err) => {
        console.warn('[notifications] push dispatch failed', err);
      });
    }

    return { id: data.comment_id };
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

  static async setPinnedPost(
    userId: string,
    circleId: string,
    postId: string | null,
    supabase: SupabaseClientType
  ): Promise<void> {
    if (postId === null) {
      const { error } = await supabase
        .from('circle_post_pins')
        .delete()
        .eq('circle_id', circleId);
      if (error) throw new Error(error.message ?? 'Failed to unpin post.');
      return;
    }

    const { error } = await supabase.from('circle_post_pins').upsert(
      {
        circle_id: circleId,
        post_id: postId,
        pinned_by: userId,
        pinned_at: new Date().toISOString(),
      },
      { onConflict: 'circle_id' }
    );
    if (error) {
      if (error.code === '42501') {
        throw new Error('Only owners and moderators can pin posts.');
      }
      throw new Error(error.message ?? 'Failed to pin post.');
    }
  }

  static async setMembershipState(
    userId: string,
    circleId: string,
    nextState: 'following' | 'joined' | 'none',
    supabase: SupabaseClientType
  ): Promise<void> {
    const client = supabase as unknown as {
      from: (table: string) => {
        delete: () => {
          eq: (
            col: string,
            val: string
          ) => {
            eq: (
              col: string,
              val: string
            ) => Promise<{ error: { message?: string } | null }>;
          };
        };
        upsert: (
          row: Record<string, unknown>,
          opts?: { onConflict?: string }
        ) => Promise<{ error: { message?: string } | null }>;
      };
    };

    if (nextState === 'none') {
      const { error } = await client
        .from('circle_members')
        .delete()
        .eq('circle_id', circleId)
        .eq('user_id', userId);
      if (error) throw new Error(error.message ?? 'Failed to leave circle.');
      return;
    }

    const { error } = await client.from('circle_members').upsert(
      {
        circle_id: circleId,
        user_id: userId,
        membership_state: nextState,
      },
      { onConflict: 'circle_id,user_id' }
    );
    if (error) throw new Error(error.message ?? 'Failed to update membership.');
  }
}
