import type { CommunityReportInput } from '@kurecal/domain';
import type { SupabaseClientType } from '@/types';

type SubjectType = CommunityReportInput['subjectType'];
type Resolution = 'removed' | 'warned' | 'no-action' | 'other';

interface PostSubjectRow {
  id: string;
  author_id: string;
  content: string;
  moderation_status: 'active' | 'removed';
}

interface CommentSubjectRow {
  id: string;
  author_id: string;
  content: string;
  moderation_status: 'active' | 'removed';
}

interface ProfileSubjectRow {
  id: string;
  full_name: string | null;
  username: string | null;
  community_moderation_status: 'active' | 'restricted' | 'removed';
}

export const COMMUNITY_ACCESS_RESTRICTED_ERROR =
  'Your community access is currently limited.';
export const REMOVED_POST_PLACEHOLDER = 'This post was removed by moderators.';
export const REMOVED_COMMENT_PLACEHOLDER = 'This reply was removed by moderators.';
export const REMOVED_MEMBER_NAME = 'Removed member';

export class CommunityModerationService {
  static async assertUserCanParticipate(
    userId: string,
    supabase: SupabaseClientType
  ): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .select('community_moderation_status')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message ?? 'Unable to verify community access.');
    }

    if (!data || data.community_moderation_status !== 'active') {
      throw new Error(COMMUNITY_ACCESS_RESTRICTED_ERROR);
    }
  }

  static async assertReportableSubject(
    reporterId: string,
    payload: CommunityReportInput,
    supabase: SupabaseClientType
  ): Promise<void> {
    if (payload.subjectType === 'profile' && payload.subjectId === reporterId) {
      throw new Error('You cannot report your own profile.');
    }

    const subject = await this.getSubject(payload.subjectType, payload.subjectId, supabase);

    if (!subject) {
      throw new Error('The content or profile you tried to report is no longer available.');
    }

    if (
      (payload.subjectType === 'post' || payload.subjectType === 'comment') &&
      'moderation_status' in subject &&
      subject.moderation_status === 'removed'
    ) {
      throw new Error('This content is already unavailable in community.');
    }

    if (
      payload.subjectType === 'profile' &&
      'community_moderation_status' in subject &&
      subject.community_moderation_status === 'removed'
    ) {
      throw new Error('This member is already unavailable in community.');
    }
  }

  static async assertPostAllowsReplies(
    postId: string,
    supabase: SupabaseClientType
  ): Promise<void> {
    const { data, error } = await supabase
      .from('circle_posts')
      .select('id, moderation_status')
      .eq('id', postId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message ?? 'Unable to load this post.');
    }

    if (!data || data.moderation_status !== 'active') {
      throw new Error('You cannot reply to a removed discussion.');
    }
  }

  static async assertVoteTargetIsActive(
    entityType: 'post' | 'comment',
    entityId: string,
    supabase: SupabaseClientType
  ): Promise<void> {
    const table = entityType === 'post' ? 'circle_posts' : 'circle_comments';
    const { data, error } = await (supabase as any)
      .from(table)
      .select('id, moderation_status')
      .eq('id', entityId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message ?? 'Unable to verify this vote target.');
    }

    if (!data || data.moderation_status !== 'active') {
      throw new Error('You cannot vote on removed community content.');
    }
  }

  static async applyResolutionToSubject(
    params: {
      subjectType: SubjectType;
      subjectId: string;
      reviewerId: string;
      resolution: Resolution;
      resolutionNotes?: string;
    },
    supabase: SupabaseClientType
  ): Promise<void> {
    if (params.resolution !== 'removed') {
      return;
    }

    if (params.subjectType === 'post') {
      await this.removePost(params.subjectId, params.reviewerId, params.resolutionNotes, supabase);
      return;
    }

    if (params.subjectType === 'comment') {
      await this.removeComment(
        params.subjectId,
        params.reviewerId,
        params.resolutionNotes,
        supabase
      );
      return;
    }

    await this.removeProfile(
      params.subjectId,
      params.reviewerId,
      params.resolutionNotes,
      supabase
    );
  }

  private static async removePost(
    postId: string,
    reviewerId: string,
    notes: string | undefined,
    supabase: SupabaseClientType
  ): Promise<void> {
    const { error } = await supabase
      .from('circle_posts')
      .update(this.buildRemovalUpdate(reviewerId, notes))
      .eq('id', postId);

    if (error) {
      throw new Error(error.message ?? 'Failed to remove the reported post.');
    }
  }

  private static async removeComment(
    commentId: string,
    reviewerId: string,
    notes: string | undefined,
    supabase: SupabaseClientType
  ): Promise<void> {
    const { error } = await supabase
      .from('circle_comments')
      .update(this.buildRemovalUpdate(reviewerId, notes))
      .eq('id', commentId);

    if (error) {
      throw new Error(error.message ?? 'Failed to remove the reported comment.');
    }
  }

  private static async removeProfile(
    profileId: string,
    reviewerId: string,
    notes: string | undefined,
    supabase: SupabaseClientType
  ): Promise<void> {
    const now = new Date().toISOString();
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        community_moderation_status: 'removed',
        community_moderation_reason: 'community-report',
        community_moderation_notes: notes ?? null,
        community_moderated_at: now,
        community_moderated_by: reviewerId,
      })
      .eq('id', profileId);

    if (profileError) {
      throw new Error(profileError.message ?? 'Failed to remove the reported member.');
    }

    const contentRemovalUpdate = this.buildRemovalUpdate(reviewerId, notes);
    const [postsResult, commentsResult] = await Promise.all([
      supabase
        .from('circle_posts')
        .update(contentRemovalUpdate)
        .eq('author_id', profileId)
        .eq('moderation_status', 'active'),
      supabase
        .from('circle_comments')
        .update(contentRemovalUpdate)
        .eq('author_id', profileId)
        .eq('moderation_status', 'active'),
    ]);

    if (postsResult.error) {
      throw new Error(postsResult.error.message ?? 'Failed to remove member posts.');
    }

    if (commentsResult.error) {
      throw new Error(commentsResult.error.message ?? 'Failed to remove member replies.');
    }
  }

  private static async getSubject(
    subjectType: SubjectType,
    subjectId: string,
    supabase: SupabaseClientType
  ): Promise<PostSubjectRow | CommentSubjectRow | ProfileSubjectRow | null> {
    if (subjectType === 'post') {
      const { data, error } = await supabase
        .from('circle_posts')
        .select('id, author_id, content, moderation_status')
        .eq('id', subjectId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message ?? 'Unable to load the reported post.');
      }

      return (data as PostSubjectRow | null) ?? null;
    }

    if (subjectType === 'comment') {
      const { data, error } = await supabase
        .from('circle_comments')
        .select('id, author_id, content, moderation_status')
        .eq('id', subjectId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message ?? 'Unable to load the reported comment.');
      }

      return (data as CommentSubjectRow | null) ?? null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, community_moderation_status')
      .eq('id', subjectId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message ?? 'Unable to load the reported profile.');
    }

    return (data as ProfileSubjectRow | null) ?? null;
  }

  private static buildRemovalUpdate(reviewerId: string, notes: string | undefined) {
    return {
      moderation_status: 'removed' as const,
      moderation_reason: 'community-report',
      moderation_notes: notes ?? null,
      moderated_at: new Date().toISOString(),
      moderated_by: reviewerId,
    };
  }
}
