import { CIRCLE_TAG_MAPPINGS } from '@/config/circleTagMappings';
import { BlockService } from '@/services/blockService';
import {
  REMOVED_COMMENT_PLACEHOLDER,
  REMOVED_MEMBER_NAME,
  REMOVED_POST_PLACEHOLDER,
} from '@/services/communityModerationService';
import { TagBasedMatchingService } from '@/services/tagBasedMatchingService';
import type { SupabaseClientType } from '@/types/database';
import type {
  CircleDiscussionAuthor,
  CircleDiscussionComment,
  CircleDiscussionEmbeddedEvent,
  CircleDiscussionLinkPreview,
  CircleDiscussionMedia,
  CircleDiscussionMention,
  CircleDiscussionCurrentUser,
  CircleDiscussionMember,
  CircleDiscussionPost,
  CircleDiscussionUpcomingEvent,
} from '@/types/circleDiscussions';
import { getLogoUrlFromInput } from '@/utils/logoUtils';
import { generateEventSlug } from '@/utils/slugUtils';

const CIRCLE_POST_LIMIT = 50;
const UPCOMING_EVENT_LIMIT = 4;
const UPCOMING_EVENT_FETCH_LIMIT = 20;
const UPCOMING_EVENT_SUPPLEMENTAL_FETCH_LIMIT = 120;
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
  moderation_status: 'active' | 'removed';
  author: CircleDiscussionAuthor | CircleDiscussionAuthor[] | null;
  votes: VoteRow[] | null;
}

interface RawPostRow {
  id: string;
  content: string;
  created_at: string;
  post_type:
    | 'update'
    | 'question'
    | 'intro'
    | 'showcase'
    | 'event_note'
    | 'announcement'
    | null;
  event_id: string | null;
  moderation_status: 'active' | 'removed';
  author: CircleDiscussionAuthor | CircleDiscussionAuthor[] | null;
  comments: RawCommentRow[] | null;
  votes: VoteRow[] | null;
  event: RawPostEventRow | RawPostEventRow[] | null;
}

interface MemberRow {
  user_id: string;
}

interface MatchingEventRow {
  id: string;
  title: string | null;
  start_time: string | null;
  organizer_name: string | null;
  organizer_logo_url: string | null;
  description: string | null;
  tags: string[] | null;
}

interface RawPostEventRow {
  id: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  event_image_url: string | null;
  tags: string[] | null;
}

interface PostAttachmentBundle {
  mentions: Map<string, CircleDiscussionMention[]>;
  media: Map<string, CircleDiscussionMedia[]>;
  linkPreviews: Map<string, CircleDiscussionLinkPreview[]>;
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
  membershipState: 'none' | 'following' | 'joined';
  isModerator: boolean;
  currentUserProfile: CircleDiscussionCurrentUser | null;
  members: CircleDiscussionMember[];
  upcomingEvents: CircleDiscussionUpcomingEvent[];
  posts: CircleDiscussionPost[];
}

export interface CirclePostPageData {
  circle: CircleSummary;
  isJoined: boolean;
  membershipState: 'none' | 'following' | 'joined';
  isModerator: boolean;
  currentUserProfile: CircleDiscussionCurrentUser | null;
  members: CircleDiscussionMember[];
  upcomingEvents: CircleDiscussionUpcomingEvent[];
  post: CircleDiscussionPost;
}

export interface CirclePostMetadataData {
  circleName: string;
  circleSlug: string;
  postContent: string;
}

function normalizeCircleEventTerm(term: string): string {
  return term.toLowerCase().trim().replace(/\s+/g, ' ');
}

function tokenizeCircleEventTerm(term: string): string[] {
  return normalizeCircleEventTerm(term)
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 2);
}

function dedupeNormalizedCircleTerms(terms: string[]): string[] {
  return Array.from(
    new Set(
      terms
        .map((term) => normalizeCircleEventTerm(term))
        .filter((term) => term.length >= 2)
    )
  );
}

function getCircleEventExactTerms(circle: Pick<CircleSummary, 'slug' | 'name'>): string[] {
  return dedupeNormalizedCircleTerms([
    circle.slug,
    circle.slug.replace(/-/g, ' '),
    circle.name,
  ]);
}

function matchesNormalizedTextTerm(
  term: string,
  normalizedText: string,
  tokenSet: Set<string>
): boolean {
  const comparableTerm = normalizeCircleEventTerm(term).replace(/-/g, ' ');

  if (!comparableTerm) {
    return false;
  }

  if (comparableTerm.includes(' ')) {
    return normalizedText.includes(comparableTerm);
  }

  return tokenSet.has(comparableTerm);
}

function matchesNormalizedTagTerm(
  term: string,
  eventTagSet: Set<string>,
  eventTagTokenSet: Set<string>
): boolean {
  const comparableTerm = normalizeCircleEventTerm(term);

  if (!comparableTerm) {
    return false;
  }

  if (comparableTerm.includes(' ')) {
    return eventTagSet.has(comparableTerm);
  }

  return eventTagSet.has(comparableTerm) || eventTagTokenSet.has(comparableTerm);
}

export function buildCircleEventFilterTags(
  circle: Pick<CircleSummary, 'slug' | 'name'>
): string[] {
  const exactTerms = getCircleEventExactTerms(circle);
  const componentTerms = dedupeNormalizedCircleTerms([
    ...tokenizeCircleEventTerm(circle.slug),
    ...tokenizeCircleEventTerm(circle.name),
  ]);
  const filterTags = new Set<string>(exactTerms);
  const candidateTerms = dedupeNormalizedCircleTerms([...exactTerms, ...componentTerms]);

  candidateTerms.forEach((term) => {
    const mappingKeys = new Set([
      term,
      term.replace(/\s+/g, '-'),
      term.replace(/-/g, ' '),
    ]);

    let hasMappedTags = false;

    mappingKeys.forEach((mappingKey) => {
      const mappedTags = CIRCLE_TAG_MAPPINGS[mappingKey];
      if (!mappedTags?.length) {
        return;
      }

      hasMappedTags = true;
      mappedTags.forEach((mappedTag) => {
        filterTags.add(normalizeCircleEventTerm(mappedTag));
      });
    });

    const expandedTerms = TagBasedMatchingService.expandSearchTerm(term)
      .map((expandedTerm) => normalizeCircleEventTerm(expandedTerm))
      .filter(Boolean);
    const hasMeaningfulExpansion = expandedTerms.some((expandedTerm) => expandedTerm !== term);

    if (exactTerms.includes(term) || hasMappedTags || hasMeaningfulExpansion) {
      expandedTerms.forEach((expandedTerm) => {
        filterTags.add(expandedTerm);
      });
    }
  });

  return Array.from(filterTags);
}

export function scoreCircleEventRelevance(
  circle: Pick<CircleSummary, 'slug' | 'name'>,
  event: Pick<MatchingEventRow, 'title' | 'description' | 'tags'>,
  filterTags: readonly string[]
): number {
  const exactTerms = getCircleEventExactTerms(circle);
  const normalizedFilterTags = dedupeNormalizedCircleTerms([...filterTags]);
  const signalTerms = normalizedFilterTags.filter((term) => !exactTerms.includes(term));
  const normalizedTitle = normalizeCircleEventTerm(event.title || '');
  const normalizedDescription = normalizeCircleEventTerm(event.description || '');
  const titleTokens = new Set(tokenizeCircleEventTerm(normalizedTitle));
  const descriptionTokens = new Set(tokenizeCircleEventTerm(normalizedDescription));
  const normalizedEventTags = dedupeNormalizedCircleTerms(event.tags || []);
  const eventTagSet = new Set(normalizedEventTags);
  const eventTagTokenSet = new Set(
    normalizedEventTags.flatMap((tag) => tokenizeCircleEventTerm(tag))
  );

  let relevanceScore = 0;

  const exactTitleMatches = exactTerms.filter((term) =>
    matchesNormalizedTextTerm(term, normalizedTitle, titleTokens)
  );
  const exactDescriptionMatches = exactTerms.filter((term) =>
    matchesNormalizedTextTerm(term, normalizedDescription, descriptionTokens)
  );
  const matchedEventTags = signalTerms.filter((term) =>
    matchesNormalizedTagTerm(term, eventTagSet, eventTagTokenSet)
  );
  const signalTitleMatches = signalTerms.filter((term) =>
    matchesNormalizedTextTerm(term, normalizedTitle, titleTokens)
  );
  const signalDescriptionMatches = signalTerms.filter((term) =>
    matchesNormalizedTextTerm(term, normalizedDescription, descriptionTokens)
  );

  relevanceScore += Math.min(exactTitleMatches.length * 90, 180);
  relevanceScore += Math.min(exactDescriptionMatches.length * 24, 48);
  relevanceScore += Math.min(matchedEventTags.length * 36, 144);
  relevanceScore += Math.min(signalTitleMatches.length * 18, 72);
  relevanceScore += Math.min(signalDescriptionMatches.length * 8, 32);

  return relevanceScore;
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

    const [viewerContext, rawPosts, upcomingEvents, pinResult, isModerator] =
      await Promise.all([
        this.getViewerContext({ circleId: circle.id, viewerId, readClient }),
        this.getPosts({ circleId: circle.id, viewerId, readClient }),
        this.getUpcomingEvents({ circle, readClient }),
        readClient
          .from('circle_post_pins')
          .select('post_id')
          .eq('circle_id', circle.id)
          .maybeSingle(),
        viewerId
          ? this.isViewerModerator({ circleId: circle.id, viewerId, readClient })
          : Promise.resolve(false),
      ]);

    const pinnedPostId = pinResult.data?.post_id ?? null;
    const posts = pinnedPostId
      ? [
          ...rawPosts
            .filter((p) => p.id === pinnedPostId)
            .map((p) => ({ ...p, isPinned: true })),
          ...rawPosts.filter((p) => p.id !== pinnedPostId),
        ]
      : rawPosts;

    if (viewerId && viewerContext.membershipState !== 'none') {
      void this.touchLastVisited({
        circleId: circle.id,
        viewerId,
        readClient,
      });
    }

    return {
      circle,
      isJoined: viewerContext.isJoined,
      membershipState: viewerContext.membershipState,
      isModerator,
      currentUserProfile: viewerContext.currentUserProfile,
      members: viewerContext.members,
      upcomingEvents,
      posts,
    };
  }

  private static async isViewerModerator({
    circleId,
    viewerId,
    readClient,
  }: {
    circleId: string;
    viewerId: string;
    readClient: SupabaseClientType;
  }): Promise<boolean> {
    const [ownerResult, modResult] = await Promise.all([
      readClient
        .from('circles')
        .select('owner_id')
        .eq('id', circleId)
        .maybeSingle(),
      readClient
        .from('circle_moderators')
        .select('user_id')
        .eq('circle_id', circleId)
        .eq('user_id', viewerId)
        .maybeSingle(),
    ]);
    if (ownerResult.data?.owner_id === viewerId) return true;
    return Boolean(modResult.data);
  }

  private static async touchLastVisited({
    circleId,
    viewerId,
    readClient,
  }: {
    circleId: string;
    viewerId: string;
    readClient: SupabaseClientType;
  }): Promise<void> {
    try {
      await (
        readClient as unknown as {
          from: (table: string) => {
            update: (row: Record<string, unknown>) => {
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
          };
        }
      )
        .from('circle_members')
        .update({ last_visited_at: new Date().toISOString() })
        .eq('circle_id', circleId)
        .eq('user_id', viewerId);
    } catch {
      // last_visited_at is a freshness signal, not load-bearing — swallow.
    }
  }

  static async getCirclePostPageData({
    postId,
    viewerId,
    readClient,
  }: {
    postId: string;
    viewerId: string | null;
    readClient: SupabaseClientType;
  }): Promise<CirclePostPageData | null> {
    const postLocator = await this.getPostLocatorById({ postId, readClient });

    if (!postLocator) {
      return null;
    }

    const { circle } = postLocator;

    const [viewerContext, posts, upcomingEvents, isModerator] = await Promise.all([
      this.getViewerContext({ circleId: circle.id, viewerId, readClient }),
      this.getPosts({ circleId: circle.id, viewerId, readClient, postId }),
      this.getUpcomingEvents({ circle, readClient }),
      viewerId
        ? this.isViewerModerator({ circleId: circle.id, viewerId, readClient })
        : Promise.resolve(false),
    ]);

    const post = posts[0];

    if (!post) {
      return null;
    }

    return {
      circle,
      isJoined: viewerContext.isJoined,
      membershipState: viewerContext.membershipState,
      isModerator,
      currentUserProfile: viewerContext.currentUserProfile,
      members: viewerContext.members,
      upcomingEvents,
      post,
    };
  }

  static async getPostMetadataData({
    postId,
    readClient,
  }: {
    postId: string;
    readClient: SupabaseClientType;
  }): Promise<CirclePostMetadataData | null> {
    const postLocator = await this.getPostLocatorById({ postId, readClient });

    if (!postLocator) {
      return null;
    }

    return {
      circleName: postLocator.circle.name,
      circleSlug: postLocator.circle.slug,
      postContent: postLocator.postContent,
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

  private static async getPostLocatorById({
    postId,
    readClient,
  }: {
    postId: string;
    readClient: SupabaseClientType;
  }): Promise<{
    circle: CircleSummary;
    postContent: string;
  } | null> {
    if (!postId?.trim()) {
      return null;
    }

    const { data: post, error: postError } = await readClient
      .from('circle_posts')
      .select('id, content, circle_id, moderation_status')
      .eq('id', postId)
      .maybeSingle();

    if (postError || !post?.circle_id) {
      return null;
    }

    const { data: circleData, error: circleError } = await readClient
      .from('circles')
      .select('id, slug, name, description, member_count')
      .eq('id', post.circle_id)
      .maybeSingle();

    if (circleError || !circleData) {
      return null;
    }

    const circle = circleData as CircleRow;

    return {
      circle: {
        id: circle.id,
        slug: circle.slug,
        name: circle.name,
        description: circle.description || '',
        memberCount: circle.member_count ?? 0,
      },
      postContent:
        post.moderation_status === 'removed'
          ? REMOVED_POST_PLACEHOLDER
          : post.content ?? '',
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
    membershipState: 'none' | 'following' | 'joined';
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
          .select('circle_id, membership_state')
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

    const membershipRow = membershipResult.data as
      | { membership_state?: string | null }
      | null;
    const membershipState: 'none' | 'following' | 'joined' = !membershipRow
      ? 'none'
      : membershipRow.membership_state === 'following'
        ? 'following'
        : 'joined';

    return {
      isJoined: membershipState === 'joined',
      membershipState,
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
        post_type,
        event_id,
        moderation_status,
        author:profiles!circle_posts_author_id_fkey(id, full_name, avatar_url),
        event:events!circle_posts_event_id_fkey(
          id,
          slug,
          title,
          description,
          location,
          start_time,
          end_time,
          event_image_url
        ),
        comments: circle_comments(
          id,
          parent_id,
          content,
          created_at,
          moderation_status,
          author:profiles!circle_comments_author_id_fkey(id, full_name, avatar_url),
          votes: circle_comment_votes(user_id, vote_type)
        ),
        votes: circle_post_votes(user_id, vote_type)
      `)
      .eq('circle_id', circleId);

    if (postId) {
      query = query.eq('id', postId);
    } else {
      query = query
        .eq('moderation_status', 'active')
        .order('created_at', { ascending: false })
        .limit(CIRCLE_POST_LIMIT);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    const rawPosts = data as RawPostRow[];
    const attachments = await this.getPostAttachments({
      postIds: rawPosts.map((post) => post.id),
      readClient,
    });
    const blockedUserIds =
      viewerId
        ? await BlockService.getBlockedUserIdsForViewer(
            viewerId,
            [
              ...new Set(
                rawPosts.flatMap((post) => {
                  const authorIds: string[] = [];
                  const resolvedPostAuthor = Array.isArray(post.author)
                    ? post.author[0]
                    : post.author;

                  if (resolvedPostAuthor?.id) {
                    authorIds.push(resolvedPostAuthor.id);
                  }

                  (post.comments || []).forEach((comment) => {
                    const resolvedCommentAuthor = Array.isArray(comment.author)
                      ? comment.author[0]
                      : comment.author;

                    if (resolvedCommentAuthor?.id) {
                      authorIds.push(resolvedCommentAuthor.id);
                    }
                  });

                  return authorIds;
                })
              ),
            ],
            readClient
          )
        : new Set<string>();

    return rawPosts
      .filter((post) => {
        const resolvedAuthor = Array.isArray(post.author) ? post.author[0] : post.author;
        return !resolvedAuthor?.id || !blockedUserIds.has(resolvedAuthor.id);
      })
      .map((post) => this.formatPost(post, viewerId, blockedUserIds, attachments));
  }

  private static async getPostAttachments({
    postIds,
    readClient,
  }: {
    postIds: string[];
    readClient: SupabaseClientType;
  }): Promise<PostAttachmentBundle> {
    if (postIds.length === 0) {
      return {
        mentions: new Map(),
        media: new Map(),
        linkPreviews: new Map(),
      };
    }

    const attachmentClient = readClient as any;
    const [mentionsResult, mediaResult, linksResult] = await Promise.all([
      attachmentClient
        .from('circle_post_mentions')
        .select('post_id, mentioned_profile_id, profile:profiles!circle_post_mentions_mentioned_profile_id_fkey(id, username, full_name, avatar_url)')
        .in('post_id', postIds),
      attachmentClient
        .from('circle_post_media')
        .select('id, post_id, storage_path, width, height, position')
        .in('post_id', postIds)
        .order('position', { ascending: true }),
      attachmentClient
        .from('circle_post_links')
        .select('id, post_id, url, title, description, image_url, site_name')
        .in('post_id', postIds)
        .order('created_at', { ascending: true }),
    ]);

    const attachmentError =
      mentionsResult.error ?? mediaResult.error ?? linksResult.error;
    if (attachmentError) {
      throw new Error(
        attachmentError.message ?? 'Failed to load post attachments.'
      );
    }

    const mentions = new Map<string, CircleDiscussionMention[]>();
    ((mentionsResult.data ?? []) as Array<{
      post_id: string;
      mentioned_profile_id: string;
      profile:
        | {
            id: string;
            username: string | null;
            full_name: string | null;
            avatar_url: string | null;
          }
        | Array<{
            id: string;
            username: string | null;
            full_name: string | null;
            avatar_url: string | null;
          }>
        | null;
    }>).forEach((row) => {
      const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      const postMentions = mentions.get(row.post_id) ?? [];
      postMentions.push({
        userId: row.mentioned_profile_id,
        username: profile?.username ?? null,
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      });
      mentions.set(row.post_id, postMentions);
    });

    const media = new Map<string, CircleDiscussionMedia[]>();
    ((mediaResult.data ?? []) as Array<{
      id: string;
      post_id: string;
      storage_path: string;
      width: number;
      height: number;
      position: number;
    }>).forEach((row) => {
      const publicUrl = readClient.storage
        .from('community-media')
        .getPublicUrl(row.storage_path).data.publicUrl;
      const postMedia = media.get(row.post_id) ?? [];
      postMedia.push({
        id: row.id,
        path: row.storage_path,
        url: publicUrl,
        width: row.width,
        height: row.height,
        position: row.position,
      });
      media.set(row.post_id, postMedia);
    });

    const linkPreviews = new Map<string, CircleDiscussionLinkPreview[]>();
    ((linksResult.data ?? []) as Array<{
      id: string;
      post_id: string;
      url: string;
      title: string | null;
      description: string | null;
      image_url: string | null;
      site_name: string | null;
    }>).forEach((row) => {
      const postLinks = linkPreviews.get(row.post_id) ?? [];
      postLinks.push({
        id: row.id,
        url: row.url,
        title: row.title,
        description: row.description,
        imageUrl: row.image_url,
        siteName: row.site_name,
      });
      linkPreviews.set(row.post_id, postLinks);
    });

    return { mentions, media, linkPreviews };
  }

  private static formatPost(
    post: RawPostRow,
    viewerId: string | null,
    blockedUserIds: Set<string>,
    attachments: PostAttachmentBundle
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
    const isRemoved = post.moderation_status === 'removed';
    const event = Array.isArray(post.event) ? post.event[0] : post.event;

    return {
      id: post.id,
      content: isRemoved ? REMOVED_POST_PLACEHOLDER : post.content,
      created_at: post.created_at,
      author: isRemoved
        ? {
            id: author.id,
            full_name: REMOVED_MEMBER_NAME,
            avatar_url: null,
          }
        : author,
      comments: isRemoved
        ? []
        : this.buildCommentTree(post.comments || [], viewerId, blockedUserIds),
      isRemoved,
      score: isRemoved ? 0 : score,
      userVote: isRemoved ? 0 : userVote,
      postType: post.post_type ?? 'update',
      eventId: post.event_id,
      event: isRemoved ? null : this.formatEmbeddedEvent(event),
      mentions: isRemoved ? [] : attachments.mentions.get(post.id) ?? [],
      media: isRemoved ? [] : attachments.media.get(post.id) ?? [],
      linkPreviews: isRemoved ? [] : attachments.linkPreviews.get(post.id) ?? [],
    };
  }

  private static formatEmbeddedEvent(
    event: RawPostEventRow | null | undefined
  ): CircleDiscussionEmbeddedEvent | null {
    if (!event?.id || !event.start_time) {
      return null;
    }

    return {
      id: event.id,
      title: event.title ?? 'Untitled Event',
      slug: event.slug ?? generateEventSlug(event.title ?? '', event.id),
      description: event.description,
      location: event.location,
      startTime: event.start_time,
      endTime: event.end_time,
      imageUrl: event.event_image_url,
      organizerName: null,
      tags: event.tags ?? [],
      timeLabel: null,
      formatLabel: null,
      priceLabel: null,
    };
  }

  private static buildCommentTree(
    comments: RawCommentRow[],
    viewerId: string | null,
    blockedUserIds: Set<string>
  ): CircleDiscussionComment[] {
    const normalizedComments = comments
      .filter((comment) => {
        const resolvedAuthor = Array.isArray(comment.author) ? comment.author[0] : comment.author;
        return !resolvedAuthor?.id || !blockedUserIds.has(resolvedAuthor.id);
      })
      .map((comment) => {
        const commentVotes = comment.votes || [];
        const score = commentVotes.reduce((sum, vote) => sum + vote.vote_type, 0);
        const userVote = viewerId
          ? commentVotes.find((vote) => vote.user_id === viewerId)?.vote_type || 0
          : 0;
        const resolvedAuthor = Array.isArray(comment.author) ? comment.author[0] : comment.author;
        const isRemoved = comment.moderation_status === 'removed';

        return {
          id: comment.id,
          parent_id: comment.parent_id,
          content: isRemoved ? REMOVED_COMMENT_PLACEHOLDER : comment.content,
          created_at: comment.created_at,
          author: isRemoved
            ? {
                id: resolvedAuthor?.id ?? '',
                full_name: REMOVED_MEMBER_NAME,
                avatar_url: null,
              }
            : resolvedAuthor ?? {
                id: '',
                full_name: null,
                avatar_url: null,
              },
          isRemoved,
          score: isRemoved ? 0 : score,
          userVote: isRemoved ? 0 : userVote,
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

        return;
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
    const allFilterTags = buildCircleEventFilterTags(circle);

    if (allFilterTags.length === 0) {
      return [];
    }

    const nowIso = new Date().toISOString();
    const candidateEventsById = new Map<string, MatchingEventRow>();

    const { data: tagMatchedEvents } = await readClient
      .from('events_detailed')
      .select('id, title, start_time, organizer_name, organizer_logo_url, description, tags')
      .overlaps('tags', allFilterTags)
      .gte('start_time', nowIso)
      .order('start_time', { ascending: true })
      .limit(UPCOMING_EVENT_FETCH_LIMIT);

    ((tagMatchedEvents || []) as MatchingEventRow[]).forEach((event) => {
      candidateEventsById.set(event.id, event);
    });

    if (candidateEventsById.size < UPCOMING_EVENT_LIMIT) {
      const { data: supplementalEvents } = await readClient
        .from('events_detailed')
        .select('id, title, start_time, organizer_name, organizer_logo_url, description, tags')
        .gte('start_time', nowIso)
        .order('start_time', { ascending: true })
        .limit(UPCOMING_EVENT_SUPPLEMENTAL_FETCH_LIMIT);

      ((supplementalEvents || []) as MatchingEventRow[]).forEach((event) => {
        if (!candidateEventsById.has(event.id)) {
          candidateEventsById.set(event.id, event);
        }
      });
    }

    return Array.from(candidateEventsById.values())
      .map((event) => {
        return {
          id: event.id,
          title: event.title,
          startTime: event.start_time,
          organizerName: event.organizer_name,
          organizerLogoUrl:
            getLogoUrlFromInput(event.organizer_logo_url, event.organizer_name || undefined) ??
            null,
          slug: generateEventSlug(event.title ?? '', event.id),
          relevanceScore: scoreCircleEventRelevance(circle, event, allFilterTags),
        };
      })
      .filter((event) => event.relevanceScore > 0)
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
}
