import type { SupabaseClientType } from '@/types';

export interface TrustLevelMetrics {
  accountAgeDays: number;
  hasCompletedOnboarding: boolean;
  bookmarkedEventsCount: number;
}

export interface TrustLevelEvaluationResult extends TrustLevelMetrics {
  level: number;
}

export class TrustLevelService {
  static calculateTrustLevel(metrics: TrustLevelMetrics): number {
    if (
      metrics.hasCompletedOnboarding &&
      metrics.accountAgeDays >= 30 &&
      metrics.bookmarkedEventsCount >= 3
    ) {
      return 2;
    }

    if (metrics.hasCompletedOnboarding && metrics.accountAgeDays >= 7) {
      return 1;
    }

    return 0;
  }

  static async evaluateAndPersistTrustLevel(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<TrustLevelEvaluationResult> {
    const [{ data: profile, error: profileError }, { count: bookmarkedCount, error: bookmarksError }] = await Promise.all([
      supabaseClient
        .from('profiles')
        .select('created_at, preferences')
        .eq('id', userId)
        .single(),
      supabaseClient
        .from('user_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_bookmarked', true),
    ]);

    if (profileError || !profile) {
      throw new Error('Failed to evaluate trust level.');
    }

    if (bookmarksError) {
      throw new Error('Failed to evaluate trust level.');
    }

    const createdAt = profile.created_at ? new Date(profile.created_at) : new Date();
    const accountAgeMs = Date.now() - createdAt.getTime();
    const accountAgeDays = Math.max(0, Math.floor(accountAgeMs / (1000 * 60 * 60 * 24)));

    const preferences = (profile.preferences as Record<string, unknown> | null) || null;
    const hasCompletedOnboarding = Boolean(preferences?.careerOnboardingCompleted);
    const bookmarkedEventsCount = bookmarkedCount ?? 0;

    const level = this.calculateTrustLevel({
      accountAgeDays,
      hasCompletedOnboarding,
      bookmarkedEventsCount,
    });

    const { error: upsertError } = await supabaseClient
      .from('trust_levels')
      .upsert(
        {
          user_id: userId,
          level,
          last_evaluated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

    if (upsertError) {
      throw new Error('Failed to persist trust level.');
    }

    return {
      level,
      accountAgeDays,
      hasCompletedOnboarding,
      bookmarkedEventsCount,
    };
  }
}
