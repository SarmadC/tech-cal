import type { SupabaseClientType } from '@/types';
import { BlockService } from '@/services/blockService';
import { SocialProfileService } from '@/services/socialProfileService';

interface DirectoryProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  headline: string | null;
  created_at: string | null;
}

interface DirectoryCareerRow {
  user_id: string;
  current_role: string | null;
  company_name: string | null;
}

interface DirectoryStatsRow {
  user_id: string;
  follower_count: number;
  following_count: number;
}

interface DirectoryCursor {
  createdAt: string;
  id: string;
}

export interface CommunityDirectoryProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  username: string;
  headline: string | null;
  joinedAt: string | null;
  followerCount: number;
  followingCount: number;
  currentRole: string | null;
  companyName: string | null;
}

export interface CommunityDirectoryResult {
  profiles: CommunityDirectoryProfile[];
  nextCursor: string | null;
  totalCount: number;
  search: string;
}

export interface CommunityDirectoryOptions {
  search?: string;
  cursor?: string | null;
  limit?: number;
}

const DEFAULT_LIMIT = 18;
const MAX_LIMIT = 24;
const CHUNK_SIZE = 40;

export class CommunityDirectoryService {
  static async getPublicProfileCount(
    readClient: SupabaseClientType,
    search = ''
  ): Promise<number> {
    return this.getCount(readClient, search.trim());
  }

  static encodeCursor(cursor: DirectoryCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  static decodeCursor(cursor: string): DirectoryCursor {
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as Partial<DirectoryCursor>;
      const createdAt = parsed.createdAt?.trim();
      const id = parsed.id?.trim();

      if (!createdAt || !id || Number.isNaN(new Date(createdAt).getTime())) {
        throw new Error('Invalid pagination cursor.');
      }

      return { createdAt, id };
    } catch {
      throw new Error('Invalid pagination cursor.');
    }
  }

  static normalizeLimit(limit?: number): number {
    if (!limit || Number.isNaN(limit)) {
      return DEFAULT_LIMIT;
    }

    return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
  }

  static async searchProfiles({
    viewerId,
    viewerScopedClient,
    readClient,
    options = {},
  }: {
    viewerId: string | null;
    viewerScopedClient: SupabaseClientType | null;
    readClient: SupabaseClientType;
    options?: CommunityDirectoryOptions;
  }): Promise<CommunityDirectoryResult> {
    const limit = this.normalizeLimit(options.limit);
    const search = options.search?.trim() || '';
    const cursor = options.cursor ? this.decodeCursor(options.cursor) : null;
    const totalCount = await this.getCount(readClient, search);

    const visibleRows: DirectoryProfileRow[] = [];
    let rawCursor = cursor;
    let nextCursor: string | null = null;

    while (visibleRows.length < limit + 1) {
      const chunkRows = await this.fetchChunk({
        readClient,
        search,
        cursor: rawCursor,
        limit: CHUNK_SIZE,
      });

      if (chunkRows.length === 0) {
        break;
      }

      const candidateRows = chunkRows.filter((row) => row.id !== viewerId);
      const candidateIds = candidateRows.map((row) => row.id);
      const blockedIds =
        viewerId && viewerScopedClient && candidateIds.length > 0
          ? await BlockService.getBlockedUserIdsForViewer(viewerId, candidateIds, viewerScopedClient)
          : new Set<string>();

      for (const row of chunkRows) {
        rawCursor = {
          createdAt: row.created_at || new Date(0).toISOString(),
          id: row.id,
        };

        if (!row.username || row.id === viewerId || blockedIds.has(row.id)) {
          continue;
        }

        visibleRows.push(row);

        if (visibleRows.length === limit + 1) {
          nextCursor = this.encodeCursor(rawCursor);
          break;
        }
      }

      if (nextCursor || chunkRows.length < CHUNK_SIZE) {
        break;
      }
    }

    const pageRows = visibleRows.slice(0, limit);
    const userIds = pageRows.map((row) => row.id);

    const [statsResult, careerResult] = await Promise.all([
      userIds.length > 0
        ? readClient
            .from('user_social_stats')
            .select('user_id, follower_count, following_count')
            .in('user_id', userIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length > 0
        ? readClient
            .from('career_profiles')
            .select('user_id, current_role, company_name')
            .in('user_id', userIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (statsResult.error) {
      throw new Error('Failed to fetch directory profile stats.');
    }

    if (careerResult.error) {
      throw new Error('Failed to fetch directory career context.');
    }

    const statsByUserId = new Map(
      ((statsResult.data || []) as DirectoryStatsRow[]).map((row) => [
        row.user_id,
        row,
      ])
    );

    const careerByUserId = new Map(
      ((careerResult.data || []) as DirectoryCareerRow[]).map((row) => [
        row.user_id,
        row,
      ])
    );

    return {
      profiles: pageRows.map((row) => {
        const stats = statsByUserId.get(row.id);
        const career = careerByUserId.get(row.id);

        return {
          id: row.id,
          fullName: row.full_name,
          avatarUrl: row.avatar_url,
          username: row.username || '',
          headline: row.headline,
          joinedAt: row.created_at,
          followerCount: stats?.follower_count ?? 0,
          followingCount: stats?.following_count ?? 0,
          currentRole: career?.current_role ?? null,
          companyName: career?.company_name ?? null,
        };
      }),
      nextCursor,
      totalCount,
      search,
    };
  }

  private static applySearchFilter<TQuery extends { or: (filter: string) => TQuery }>(
    query: TQuery,
    search: string
  ): TQuery {
    if (!search) {
      return query;
    }

    const escaped = SocialProfileService.escapeLikePattern(search);
    return query.or(
      `username.ilike.%${escaped}%,full_name.ilike.%${escaped}%,headline.ilike.%${escaped}%`
    );
  }

  private static buildBaseQuery(
    readClient: SupabaseClientType,
    search: string
  ) {
    return this.applySearchFilter(
      readClient
        .from('profiles')
        .select('id, full_name, avatar_url, username, headline, created_at')
        .eq('profile_visibility', 'public')
        .not('username', 'is', null)
        .not('created_at', 'is', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }),
      search
    );
  }

  private static async getCount(
    readClient: SupabaseClientType,
    search: string
  ): Promise<number> {
    const query = this.applySearchFilter(
      readClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('profile_visibility', 'public')
        .not('username', 'is', null)
        .not('created_at', 'is', null),
      search
    );

    const { count, error } = await query;

    if (error) {
      throw new Error('Failed to count directory profiles.');
    }

    return count ?? 0;
  }

  private static async fetchChunk({
    readClient,
    search,
    cursor,
    limit,
  }: {
    readClient: SupabaseClientType;
    search: string;
    cursor: DirectoryCursor | null;
    limit: number;
  }): Promise<DirectoryProfileRow[]> {
    if (!cursor) {
      const { data, error } = await this.buildBaseQuery(readClient, search).limit(limit);

      if (error) {
        throw new Error('Failed to fetch directory profiles.');
      }

      return (data || []) as DirectoryProfileRow[];
    }

    const [sameTimestampResult, olderResult] = await Promise.all([
      this.buildBaseQuery(readClient, search)
        .eq('created_at', cursor.createdAt)
        .lt('id', cursor.id)
        .limit(limit),
      this.buildBaseQuery(readClient, search)
        .lt('created_at', cursor.createdAt)
        .limit(limit),
    ]);

    if (sameTimestampResult.error || olderResult.error) {
      throw new Error('Failed to fetch directory profiles.');
    }

    return [
      ...((sameTimestampResult.data || []) as DirectoryProfileRow[]),
      ...((olderResult.data || []) as DirectoryProfileRow[]),
    ]
      .sort((a, b) => {
        const createdAtDiff =
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();

        if (createdAtDiff !== 0) {
          return createdAtDiff;
        }

        return b.id.localeCompare(a.id);
      })
      .slice(0, limit);
  }
}
