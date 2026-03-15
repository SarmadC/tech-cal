import { CIRCLE_TAG_MAPPINGS } from '@/config/circleTagMappings';
import { TagBasedMatchingService } from '@/services/tagBasedMatchingService';
import type { SupabaseClientType } from '@/types/database';
import type {
  CircleDiscussionAuthor,
  CircleDiscussionComment,
  CircleDiscussionCurrentUser,
  CircleDiscussionMember,
  CircleDiscussionPost,
  CircleDiscussionUpcomingEvent,
} from '@/types/circleDiscussions';
import { generateEventSlug } from '@/utils/slugUtils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CIRCLE_POST_LIMIT = 50;
const UPCOMING_EVENT_LIMIT = 4;
const UPCOMING_EVENT_FETCH_LIMIT = 20;
const MEMBER_PREVIEW_LIMIT = 10;

interface CircleRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  member_count: number | null;
}

interface VoteRow {
  user_id: string;
  vote_type: number;
}

interface RawCommentRow {
  id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author: CircleDiscussionAuthor | CircleDiscussionAuthor[] | null;
  votes: VoteRow[] | null;
}

interface RawPostRow {
  id: string;
  content: string;
  created_at: string;
  author: CircleDiscussionAuthor | CircleDiscussionAuthor[] | null;
  comments: RawCommentRow[] | null;
  votes: VoteRow[] | null;
}

interface MemberRow {
  user_id: string;
}

interface MatchingEventRow {
  id: string;
  title: string | null;
  start_time: string | null;
  organizer_name: string | null;
  description: string | null;
  tags: string[] | null;
}

export interface CircleSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
}

export interface CircleDiscussionPageData {
  circle: CircleSummary;
  isJoined: boolean;
  currentUserProfile: CircleDiscussionCurrentUser | null;
  members: CircleDiscussionMember[];
  upcomingEvents: CircleDiscussionUpcomingEvent[];
  posts: CircleDiscussionPost[];
}

export interface CirclePostPageData {
  circle: CircleSummary;
  isJoined: boolean;
  currentUserProfile: CircleDiscussionCurrentUser | null;
  members: CircleDiscussionMember[];
  upcomingEvents: CircleDiscussionUpcomingEvent[];
  post: CircleDiscussionPost;
}

export interface CirclePostMetadataData {
  circleName: string;
  postContent: string;
}

export class CircleDiscussionService {
  static async getCirclePageData({
    slug,
    viewerId,
    readClient,
  }: {
    slug: string;
    viewerId: string | null;
    readClient: SupabaseClientType;
  }): Promise<CircleDiscussionPageData | null> {
    const circle = await this.getCircleBySlug({ slug, readClient });

    if (!circle) {
      return null;
    }

    const [viewerContext, posts, upcomingEvents] = await Promise.all([
      this.getViewerContext({ circleId: circle.id, viewerId, readClient }),
      this.getPosts({ circleId: circle.id, viewerId, readClient }),
      this.getUpcomingEvents({ circle, readClient }),
    ]);

    return {
      circle,
      isJoined: viewerContext.isJoined,
      currentUserProfile: viewerContext.currentUserProfile,
      members: viewerContext.members,
      upcomingEvents,
      posts,
    };
  }

  static async getCirclePostPageData({
    slug,
    postId,
    viewerId,
    readClient,
  }: {
    slug: string;
    postId: string;
    viewerId: string | null;
    readClient: SupabaseClientType;
  }): Promise<CirclePostPageData | null> {
    if (!this.isValidUuid(postId)) {
      return null;
    }

    const circle = await this.getCircleBySlug({ slug, readClient });

    if (!circle) {
      return null;
    }

    const [viewerContext, posts, upcomingEvents] = await Promise.all([
      this.getViewerContext({ circleId: circle.id, viewerId, readClient }),
      this.getPosts({ circleId: circle.id, viewerId, readClient, postId }),
      this.getUpcomingEvents({ circle, readClient }),
    ]);

    const post = posts[0];

    if (!post) {
      return null;
    }

    return {
      circle,
      isJoined: viewerContext.isJoined,
      currentUserProfile: viewerContext.currentUserProfile,
      members: viewerContext.members,
      upcomingEvents,
      post,
    };
  }

  static async getPostMetadataData({
    slug,
    postId,
    readClient,
  }: {
    slug: string;
    postId: string;
    readClient: SupabaseClientType;
  }): Promise<CirclePostMetadataData | null> {
    if (!this.isValidUuid(postId)) {
      return null;
    }

    const circle = await this.getCircleBySlug({ slug, readClient });

    if (!circle) {
      return null;
    }

    const { data, error } = await readClient
      .from('circle_posts')
      .select('content')
      .eq('circle_id', circle.id)
      .eq('id', postId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      circleName: circle.name,
      postContent: data.content ?? '',
    };
  }

  private static async getCircleBySlug({
    slug,
    readClient,
  }: {
    slug: string;
    readClient: SupabaseClientType;
  }): Promise<CircleSummary | null> {
    const { data, error } = await readClient
      .from('circles')
      .select('id, slug, name, description, member_count')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const circle = data as CircleRow;

    return {
      id: circle.id,
      slug: circle.slug,
      name: circle.name,
      description: circle.description || '',
      memberCount: circle.member_count ?? 0,
    };
  }

  private static async getViewerContext({
    circleId,
    viewerId,
    readClient,
  }: {
    circleId: string;
    viewerId: string | null;
    readClient: SupabaseClientType;
  }): Promise<{
    isJoined: boolean;
    currentUserProfile: CircleDiscussionCurrentUser | null;
    members: CircleDiscussionMember[];
  }> {
    const membersPromise = readClient
      .from('circle_members')
      .select('user_id')
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false })
      .limit(MEMBER_PREVIEW_LIMIT);

    const membershipPromise = viewerId
      ? readClient
          .from('circle_members')
          .select('circle_id')
          .eq('circle_id', circleId)
          .eq('user_id', viewerId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const profilePromise = viewerId
      ? readClient
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .eq('id', viewerId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const [membershipResult, profileResult, membersResult] = await Promise.all([
      membershipPromise,
      profilePromise,
      membersPromise,
    ]);

    const currentUserProfile = profileResult.data
      ? {
          id: profileResult.data.id,
          fullName: profileResult.data.full_name,
          username: profileResult.data.username,
          avatarUrl: profileResult.data.avatar_url,
        }
      : null;

    const memberIds = ((membersResult.data || []) as MemberRow[]).map((member) => member.user_id);
    const members =
      memberIds.length > 0
        ? await this.getMemberProfiles({ memberIds, readClient })
        : [];

    return {
      isJoined: Boolean(membershipResult.data),
      currentUserProfile,
      members,
    };
  }

  private static async getMemberProfiles({
    memberIds,
    readClient,
  }: {
    memberIds: string[];
    readClient: SupabaseClientType;
  }): Promise<CircleDiscussionMember[]> {
    const { data } = await readClient
      .from('profiles')
      .select('id, full_name, username, avatar_url, headline')
      .in('id', memberIds);

    const memberMap = new Map(
      (data || []).map((profile) => [
        profile.id,
        {
          id: profile.id,
          fullName: profile.full_name,
          username: profile.username,
          avatarUrl: profile.avatar_url,
          headline: profile.headline,
        },
      ])
    );

    return memberIds
      .map((memberId) => memberMap.get(memberId) || null)
      .filter((member): member is CircleDiscussionMember => Boolean(member));
  }

  private static async getPosts({
    circleId,
    viewerId,
    readClient,
    postId,
  }: {
    circleId: string;
    viewerId: string | null;
    readClient: SupabaseClientType;
    postId?: string;
  }): Promise<CircleDiscussionPost[]> {
    let query = readClient
      .from('circle_posts')
      .select(`
        id,
        content,
        created_at,
        author: author_id(id, full_name, avatar_url),
        comments: circle_comments(
          id,
          parent_id,
          content,
          created_at,
          author: author_id(id, full_name, avatar_url),
          votes: circle_comment_votes(user_id, vote_type)
        ),
        votes: circle_post_votes(user_id, vote_type)
      `)
      .eq('circle_id', circleId);

    if (postId) {
      query = query.eq('id', postId);
    } else {
      query = query.order('created_at', { ascending: false }).limit(CIRCLE_POST_LIMIT);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return (data as RawPostRow[]).map((post) => this.formatPost(post, viewerId));
  }

  private static formatPost(
    post: RawPostRow,
    viewerId: string | null
  ): CircleDiscussionPost {
    const postVotes = post.votes || [];
    const score = postVotes.reduce((sum, vote) => sum + vote.vote_type, 0);
    const userVote = viewerId
      ? postVotes.find((vote) => vote.user_id === viewerId)?.vote_type || 0
      : 0;

    const resolvedAuthor = Array.isArray(post.author) ? post.author[0] : post.author;
    const author = resolvedAuthor ?? {
      id: '',
      full_name: null,
      avatar_url: null,
    };

    return {
      id: post.id,
      content: post.content,
      created_at: post.created_at,
      author,
      comments: this.buildCommentTree(post.comments || [], viewerId),
      score,
      userVote,
    };
  }

  private static buildCommentTree(
    comments: RawCommentRow[],
    viewerId: string | null
  ): CircleDiscussionComment[] {
    const normalizedComments = comments
      .map((comment) => {
        const commentVotes = comment.votes || [];
        const score = commentVotes.reduce((sum, vote) => sum + vote.vote_type, 0);
        const userVote = viewerId
          ? commentVotes.find((vote) => vote.user_id === viewerId)?.vote_type || 0
          : 0;
        const resolvedAuthor = Array.isArray(comment.author) ? comment.author[0] : comment.author;

        return {
          id: comment.id,
          parent_id: comment.parent_id,
          content: comment.content,
          created_at: comment.created_at,
          author: resolvedAuthor ?? {
            id: '',
            full_name: null,
            avatar_url: null,
          },
          score,
          userVote,
          replies: [],
        };
      })
      .sort(
        (left, right) =>
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
      );

    const commentMap = new Map<string, CircleDiscussionComment>();
    const rootComments: CircleDiscussionComment[] = [];

    normalizedComments.forEach((comment) => {
      commentMap.set(comment.id, comment);
    });

    normalizedComments.forEach((comment) => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);

        if (parent) {
          parent.replies.push(comment);
          return;
        }
      }

      rootComments.push(comment);
    });

    return rootComments;
  }

  private static async getUpcomingEvents({
    circle,
    readClient,
  }: {
    circle: CircleSummary;
    readClient: SupabaseClientType;
  }): Promise<CircleDiscussionUpcomingEvent[]> {
    const mappedTags = CIRCLE_TAG_MAPPINGS[circle.slug.toLowerCase()] ?? [];
    const expandedTags = TagBasedMatchingService.expandSearchTerm(circle.slug);
    const allFilterTags = Array.from(new Set([...mappedTags, ...expandedTags]));

    if (allFilterTags.length === 0) {
      return [];
    }

    const { data } = await readClient
      .from('events_detailed')
      .select('id, title, start_time, organizer_name, description, tags')
      .overlaps('tags', allFilterTags)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(UPCOMING_EVENT_FETCH_LIMIT);

    const circleNameLower = circle.name.toLowerCase();
    const circleSlugLower = circle.slug.toLowerCase();
    const circleKeywords = [circleSlugLower, ...circleNameLower.split(/\s+/)]
      .map((keyword) => keyword.replace(/[^a-z0-9]/g, ''))
      .filter((keyword) => keyword.length > 2);

    return ((data || []) as MatchingEventRow[])
      .map((event) => {
        let relevanceScore = 0;
        const titleLower = (event.title || '').toLowerCase();
        const descriptionLower = (event.description || '').toLowerCase();
        const eventTags = (event.tags || []).map((tag) => tag.toLowerCase());

        if (titleLower.includes(circleSlugLower) || titleLower.includes(circleNameLower)) {
          relevanceScore += 100;
        } else {
          circleKeywords.forEach((keyword) => {
            if (titleLower.includes(keyword)) {
              relevanceScore += 30;
            }
          });
        }

        if (eventTags.includes(circleSlugLower)) {
          relevanceScore += 50;
        }

        if (
          descriptionLower.includes(circleSlugLower) ||
          descriptionLower.includes(circleNameLower)
        ) {
          relevanceScore += 20;
        }

        return {
          id: event.id,
          title: event.title,
          startTime: event.start_time,
          organizerName: event.organizer_name,
          slug: generateEventSlug(event.title ?? '', event.id),
          relevanceScore,
        };
      })
      .sort((left, right) => {
        if (right.relevanceScore !== left.relevanceScore) {
          return right.relevanceScore - left.relevanceScore;
        }

        const leftTime = left.startTime ? new Date(left.startTime).getTime() : 0;
        const rightTime = right.startTime ? new Date(right.startTime).getTime() : 0;
        return leftTime - rightTime;
      })
      .slice(0, UPCOMING_EVENT_LIMIT)
      .map(({ relevanceScore: _relevanceScore, ...event }) => event);
  }

  private static isValidUuid(value: string): boolean {
    return UUID_REGEX.test(value);
  }
}
