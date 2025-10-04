/**
 * Behavioral Boost Utilities
 *
 * Helper functions for Phase 3 behavioral layer implementation
 */

import type { Event } from '@/types';
import type { SupabaseClientType } from '@/types';
import { BehavioralBoostService } from '@/services/behavioralBoostService';

/**
 * Get events user has interacted with in the past
 */
export async function getUserInteractedEvents(
  userId: string,
  supabaseClient: SupabaseClientType,
  days: number = 30
): Promise<Event[]> {
  try {
    // Get user's interaction history
    const interactions = await BehavioralBoostService.getUserInteractions(
      userId,
      supabaseClient,
      days
    );

    if (interactions.length === 0) {
      return [];
    }

    // Get event details for interacted events
    const eventIds = [...new Set(interactions.map(i => i.event_id))];

    const { data: events, error } = await supabaseClient
      .from('events')
      .select(`
        id,
        title,
        description,
        category:categories(name),
        location
      `)
      .in('id', eventIds);

    if (error) throw error;

    return (events as any) || []; // eslint-disable-line @typescript-eslint/no-explicit-any

  } catch (error) {
    console.error('Error getting user interacted events:', error);
    return [];
  }
}

/**
 * Create behavioral boosts table if not exists (for migration)
 */
export const BEHAVIORAL_BOOSTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS behavioral_boosts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id),
    event_id TEXT NOT NULL,
    boost_amount INTEGER NOT NULL,
    similar_event_ids TEXT[] DEFAULT '{}',
    ab_group TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index for performance
  CREATE INDEX IF NOT EXISTS idx_behavioral_boosts_user_id
    ON behavioral_boosts(user_id);
  CREATE INDEX IF NOT EXISTS idx_behavioral_boosts_applied_at
    ON behavioral_boosts(applied_at);
  CREATE INDEX IF NOT EXISTS idx_behavioral_boosts_ab_group
    ON behavioral_boosts(ab_group);
`;

/**
 * Helper to check if behavioral boost is enabled for environment
 */
export function isBehavioralBoostEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_BEHAVIORAL_BOOST !== 'false';
}

/**
 * Get user's AB test group assignment (for display/debugging)
 */
export function getUserABGroup(userId: string): string {
  return BehavioralBoostService.getABTestGroup(userId);
}

/**
 * Calculate simple event similarity score (public utility)
 */
export function calculateEventSimilarity(eventA: Event, eventB: Event): number {
  return BehavioralBoostService.calculateSimilarity(eventA, eventB);
}