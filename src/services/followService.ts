import type { SupabaseClientType } from '@/types';
import { BlockService } from '@/services/blockService';

export interface FollowStatus {
  isFollowing: boolean;
  isFollowedBy: boolean;
  isBlockedByUser: boolean;
  hasBlockedUser: boolean;
}

export interface FollowListOptions {
  limit?: number;
  cursor?: string | null;
}

export interface FollowListUser {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  username: string | null;
  headline: string | null;
  followerCount: number;
  followingCount: number;
  followedAt: string;
}

export interface FollowListResult {
  users: FollowListUser[];
  nextCursor: string | null;
}

interface FollowEdge {
  userId: string;
  followedAt: string;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export class FollowService {
  static normalizeLimit(limit?: number): number {
    if (!limit || Number.isNaN(limit)) {
      return DEFAULT_LIMIT;
    }

    return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
  }

  static async followUser(
    followerId: string,
    followingId: string,
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    if (followerId === followingId) {
      throw new Error('You cannot follow yourself.');
    }

    const { data: blockRows, error: blocksError } = await supabaseClient
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(
        `and(blocker_id.eq.${followerId},blocked_id.eq.${followingId}),and(blocker_id.eq.${followingId},blocked_id.eq.${followerId})`
      )
      .limit(1);

    if (blocksError) {
      throw new Error('Failed to check block status.');
    }

    const blockRow = blockRows?.[0];
    if (blockRow?.blocker_id === followingId) {
      throw new Error('You cannot follow a user who has blocked you.');
    }

    if (blockRow?.blocker_id === followerId) {
      throw new Error('Unblock this user before following.');
    }

    const { error } = await supabaseClient.from('follows').insert({
      follower_id: followerId,
      following_id: followingId,
    });

    if (error) {
      if (error.code === '23505') {
        return;
      }

      if (error.code === '23514') {
        throw new Error('You cannot follow yourself.');
      }

      throw new Error('Failed to follow user.');
    }
  }

  static async unfollowUser(
    followerId: string,
    followingId: string,
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    const { error } = await supabaseClient
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      throw new Error('Failed to unfollow user.');
    }
  }

  static async getFollowStatus(
    viewerId: string,
    targetUserId: string,
    supabaseClient: SupabaseClientType
  ): Promise<FollowStatus> {
    if (viewerId === targetUserId) {
      return {
        isFollowing: false,
        isFollowedBy: false,
        isBlockedByUser: false,
        hasBlockedUser: false,
      };
    }

    const [followingRes, followedByRes, blocksRes] = await Promise.all([
      supabaseClient
        .from('follows')
        .select('id')
        .eq('follower_id', viewerId)
        .eq('following_id', targetUserId)
        .limit(1),
      supabaseClient
        .from('follows')
        .select('id')
        .eq('follower_id', targetUserId)
        .eq('following_id', viewerId)
        .limit(1),
      supabaseClient
        .from('blocks')
        .select('blocker_id, blocked_id')
        .or(
          `and(blocker_id.eq.${viewerId},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${viewerId})`
        )
        .limit(1),
    ]);

    if (followingRes.error || followedByRes.error || blocksRes.error) {
      throw new Error('Failed to fetch follow status.');
    }

    const blockRow = blocksRes.data?.[0];

    return {
      isFollowing: (followingRes.data?.length ?? 0) > 0,
      isFollowedBy: (followedByRes.data?.length ?? 0) > 0,
      isBlockedByUser: blockRow?.blocker_id === targetUserId,
      hasBlockedUser: blockRow?.blocker_id === viewerId,
    };
  }

  static async getFollowers(
    userId: string,
    viewerId: string,
    viewerScopedClient: SupabaseClientType,
    readClient: SupabaseClientType,
    options: FollowListOptions = {}
  ): Promise<FollowListResult> {
    const { edges, nextCursor } = await this.getFollowEdges(
      userId,
      'following_id',
      'follower_id',
      viewerScopedClient,
      options
    );

    const users = await this.hydrateFollowUsers(edges, viewerId, viewerScopedClient, readClient);
    return { users, nextCursor };
  }

  static async getFollowing(
    userId: string,
    viewerId: string,
    viewerScopedClient: SupabaseClientType,
    readClient: SupabaseClientType,
    options: FollowListOptions = {}
  ): Promise<FollowListResult> {
    const { edges, nextCursor } = await this.getFollowEdges(
      userId,
      'follower_id',
      'following_id',
      viewerScopedClient,
      options
    );

    const users = await this.hydrateFollowUsers(edges, viewerId, viewerScopedClient, readClient);
    return { users, nextCursor };
  }

  private static async getFollowEdges(
    userId: string,
    filterColumn: 'follower_id' | 'following_id',
    selectedColumn: 'follower_id' | 'following_id',
    supabaseClient: SupabaseClientType,
    options: FollowListOptions
  ): Promise<{ edges: FollowEdge[]; nextCursor: string | null }> {
    const limit = this.normalizeLimit(options.limit);
    const cursor = options.cursor ?? null;

    let query = supabaseClient
      .from('follows')
      .select(`${selectedColumn}, created_at`)
      .eq(filterColumn, userId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error('Failed to fetch follows list.');
    }

    const rows = (data || []) as Array<{
      follower_id?: string;
      following_id?: string;
      created_at: string;
    }>;

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const edges = pageRows
      .map((row) => {
        const userIdValue = selectedColumn === 'follower_id' ? row.follower_id : row.following_id;
        if (!userIdValue) {
          return null;
        }

        return {
          userId: userIdValue,
          followedAt: row.created_at,
        };
      })
      .filter((row): row is FollowEdge => row !== null);

    const nextCursor = hasMore && edges.length > 0
      ? edges[edges.length - 1].followedAt
      : null;

    return { edges, nextCursor };
  }

  private static async hydrateFollowUsers(
    edges: FollowEdge[],
    viewerId: string,
    viewerScopedClient: SupabaseClientType,
    readClient: SupabaseClientType
  ): Promise<FollowListUser[]> {
    if (edges.length === 0) {
      return [];
    }

    const userIds = edges.map((edge) => edge.userId);
    const blockedIds = await BlockService.getBlockedUserIdsForViewer(
      viewerId,
      userIds,
      viewerScopedClient
    );

    const visibleEdges = edges.filter((edge) => !blockedIds.has(edge.userId));
    if (visibleEdges.length === 0) {
      return [];
    }

    const visibleUserIds = visibleEdges.map((edge) => edge.userId);
    const [profilesRes, statsRes] = await Promise.all([
      readClient
        .from('profiles')
        .select('id, full_name, avatar_url, username, headline')
        .in('id', visibleUserIds),
      readClient
        .from('user_social_stats')
        .select('user_id, follower_count, following_count')
        .in('user_id', visibleUserIds),
    ]);

    if (profilesRes.error || statsRes.error) {
      throw new Error('Failed to hydrate follows list.');
    }

    const profilesById = new Map(
      (profilesRes.data || []).map((row) => [
        row.id,
        {
          fullName: row.full_name,
          avatarUrl: row.avatar_url,
          username: row.username,
          headline: row.headline,
        },
      ])
    );

    const statsByUserId = new Map(
      (statsRes.data || []).map((row) => [
        row.user_id,
        {
          followerCount: row.follower_count,
          followingCount: row.following_count,
        },
      ])
    );

    return visibleEdges.map((edge) => {
      const profile = profilesById.get(edge.userId);
      const stats = statsByUserId.get(edge.userId);

      return {
        id: edge.userId,
        fullName: profile?.fullName ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        username: profile?.username ?? null,
        headline: profile?.headline ?? null,
        followerCount: stats?.followerCount ?? 0,
        followingCount: stats?.followingCount ?? 0,
        followedAt: edge.followedAt,
      };
    });
  }
}
