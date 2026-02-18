import type { SupabaseClientType } from '@/types';

export interface BlockedUserSummary {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  username: string | null;
  headline: string | null;
  blockedAt: string;
}

export class BlockService {
  static async blockUser(
    blockerId: string,
    blockedId: string,
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    if (blockerId === blockedId) {
      throw new Error('You cannot block yourself.');
    }

    const { error } = await supabaseClient
      .from('blocks')
      .upsert(
        {
          blocker_id: blockerId,
          blocked_id: blockedId,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'blocker_id,blocked_id',
          ignoreDuplicates: true,
        }
      );

    if (error) {
      throw new Error('Failed to block user.');
    }
  }

  static async unblockUser(
    blockerId: string,
    blockedId: string,
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    const { error } = await supabaseClient
      .from('blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) {
      throw new Error('Failed to unblock user.');
    }
  }

  static async getBlockedUserIdsForViewer(
    viewerId: string,
    candidateUserIds: string[],
    supabaseClient: SupabaseClientType
  ): Promise<Set<string>> {
    if (candidateUserIds.length === 0) {
      return new Set<string>();
    }

    const [outgoing, incoming] = await Promise.all([
      supabaseClient
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', viewerId)
        .in('blocked_id', candidateUserIds),
      supabaseClient
        .from('blocks')
        .select('blocker_id')
        .eq('blocked_id', viewerId)
        .in('blocker_id', candidateUserIds),
    ]);

    if (outgoing.error) {
      throw new Error('Failed to fetch block relationships.');
    }

    if (incoming.error) {
      throw new Error('Failed to fetch block relationships.');
    }

    const blocked = new Set<string>();

    for (const row of outgoing.data || []) {
      blocked.add(row.blocked_id);
    }

    for (const row of incoming.data || []) {
      blocked.add(row.blocker_id);
    }

    return blocked;
  }

  static async getBlockedUsersForUser(
    userId: string,
    supabaseClient: SupabaseClientType,
    limit: number = 100
  ): Promise<BlockedUserSummary[]> {
    const { data: blockRows, error: blocksError } = await supabaseClient
      .from('blocks')
      .select('blocked_id, created_at')
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (blocksError) {
      throw new Error('Failed to fetch blocked users.');
    }

    const blockedIds = (blockRows || []).map(row => row.blocked_id);
    if (blockedIds.length === 0) {
      return [];
    }

    const { data: profileRows, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, avatar_url, username, headline')
      .in('id', blockedIds);

    if (profilesError) {
      throw new Error('Failed to fetch blocked user profiles.');
    }

    const profilesById = new Map(
      (profileRows || []).map(row => [
        row.id,
        {
          id: row.id,
          fullName: row.full_name,
          avatarUrl: row.avatar_url,
          username: row.username,
          headline: row.headline,
        },
      ])
    );

    return (blockRows || [])
      .map(row => {
        const profile = profilesById.get(row.blocked_id);
        if (!profile) {
          return null;
        }

        return {
          ...profile,
          blockedAt: row.created_at,
        };
      })
      .filter((row): row is BlockedUserSummary => row !== null);
  }
}
