/**
 * Profile Boost Utilities
 *
 * Extracted from TagBasedMatchingService for better maintainability.
 * Contains functions for calculating various profile-based boosts.
 *
 * Used by: TagBasedMatchingService
 */

import { Event, CareerGoal, LearningStyle, NetworkingGoal } from '@/types';
import { CareerProfile } from '@/types/career';
import { getRoleKeywords } from '@/utils/roleTaxonomy';

/**
 * Tag match result type (defined here to avoid circular imports)
 */
export interface TagMatchResult {
  score: number;
  matchedTags: string[];
  matchedCategories: string[];
  explanation: string;
}

/**
 * Calculate goal-based boost for event matching
 */
export function calculateGoalBoost(
  goals: CareerGoal[],
  tagNames: Set<string>,
  text: string
): { amount: number; reasons: string[] } {
  let amount = 0;
  const reasons: string[] = [];

  goals.forEach(goal => {
    switch (goal) {
      case 'networking':
        if (tagNames.has('networking') || text.includes('networking')) {
          amount += 6;
          reasons.push('Supports your networking goal');
        }
        break;
      case 'skill-development':
        if (tagNames.has('workshop') || text.includes('workshop')) {
          amount += 5;
          reasons.push('Hands-on skill development opportunity');
        }
        break;
      case 'leadership-growth':
      case 'career-advancement':
        if (text.includes('leadership') || tagNames.has('leadership')) {
          amount += 5;
          reasons.push('Targets your leadership growth goal');
        }
        break;
      case 'entrepreneurship':
        if (text.includes('startup') || tagNames.has('startup')) {
          amount += 4;
          reasons.push('Relevant to your entrepreneurship interests');
        }
        break;
    }
  });

  return { amount, reasons };
}

/**
 * Calculate learning style boost for event matching
 */
export function calculateLearningStyleBoost(
  learningStyles: LearningStyle[],
  tagNames: Set<string>,
  text: string
): { amount: number; reasons: string[] } {
  let amount = 0;
  const reasons: string[] = [];

  learningStyles.forEach(style => {
    switch (style) {
      case 'hands-on':
        if (tagNames.has('workshop') || text.includes('workshop')) {
          amount += 5;
          reasons.push('Hands-on workshop matches your learning style');
        }
        break;
      case 'interactive':
        if (text.includes('panel') || text.includes('discussion')) {
          amount += 3;
          reasons.push('Interactive format aligns with your preference');
        }
        break;
      case 'theoretical':
        if (text.includes('lecture') || text.includes('talk')) {
          amount += 2;
          reasons.push('Deep-dive session suits your learning style');
        }
        break;
    }
  });

  return { amount, reasons };
}

/**
 * Calculate networking goal boost for event matching
 */
export function calculateNetworkingBoost(
  networkingGoals: NetworkingGoal[],
  tagNames: Set<string>,
  text: string
): { amount: number; reasons: string[] } {
  let amount = 0;
  const reasons: string[] = [];

  networkingGoals.forEach(goal => {
    const normalized = String(goal).replace(/_/g, '-');
    if (normalized.includes('leadership') && text.includes('executive')) {
      amount += 4;
      reasons.push('High-level networking opportunity');
    } else if ((normalized.includes('peer') || normalized.includes('network')) &&
      (tagNames.has('networking') || text.includes('network'))) {
      amount += 3;
      reasons.push('Great fit for expanding your peer network');
    }
  });

  return { amount, reasons };
}

/**
 * Calculate recency boost based on event date proximity
 */
export function calculateRecencyBoost(event: Event): number {
  const start = new Date(event.startTime);
  const now = new Date();
  const diffDays = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (Number.isNaN(diffDays)) return 0;
  if (diffDays <= 7 && diffDays >= 0) return 6;
  if (diffDays <= 14 && diffDays >= 0) return 4;
  if (diffDays <= 30 && diffDays >= 0) return 2;
  return 0;
}

/**
 * Calculate popularity boost based on attendee count
 */
export function calculatePopularityBoost(event: Event): number {
  const attendees = event.attendeeCount ?? 0;
  if (attendees > 1000) return 6;
  if (attendees > 500) return 4;
  if (attendees > 100) return 2;
  return attendees > 0 ? 1 : 0;
}

/**
 * Result of calculateProfileBoost
 */
export interface ProfileBoostResult {
  boost: number;
  reasons: string[];
}

/**
 * Calculate comprehensive profile-based boost for event matching
 */
export function calculateProfileBoost(
  event: Event,
  careerProfile: CareerProfile,
  match: TagMatchResult
): ProfileBoostResult {
  let boost = 0;
  const reasons: string[] = [];
  const tagNames = new Set((event.tags || []).map(tag => tag.name.toLowerCase()));
  const agendaText = (event.agenda || [])
    .map(item => `${item.title} ${item.description || ''}`)
    .join(' ');
  const text = `${event.title} ${event.description || ''} ${agendaText}`.toLowerCase();

  // Check preferred event types using category name (case-insensitive)
  // Normalize both the preference list and event name for reliable comparison
  const preferredTypes = new Set(
    (careerProfile.preferredEventTypes ?? []).map(t => t.toLowerCase())
  );
  const eventTypeName = event.category?.name?.toLowerCase();
  
  // Match by normalized name (handles any casing in stored preferences or event names)
  if (eventTypeName && preferredTypes.has(eventTypeName)) {
    boost += 8;
    reasons.push('Matches your preferred event type');
  }

  const goalBoost = calculateGoalBoost(careerProfile.careerGoals || [], tagNames, text);
  boost += goalBoost.amount;
  reasons.push(...goalBoost.reasons);

  const learningBoost = calculateLearningStyleBoost(careerProfile.learningStyle || [], tagNames, text);
  boost += learningBoost.amount;
  reasons.push(...learningBoost.reasons);

  const networkingBoost = calculateNetworkingBoost(careerProfile.networkingGoals || [], tagNames, text);
  boost += networkingBoost.amount;
  reasons.push(...networkingBoost.reasons);

  // Role boost
  if (careerProfile.currentRole) {
    const roleKeywords = getRoleKeywords(careerProfile.currentRole);
    const hasRoleMatch = roleKeywords.some(keyword => 
      tagNames.has(keyword.toLowerCase()) || text.includes(keyword.toLowerCase())
    );
    if (hasRoleMatch) {
      boost += 5;
      reasons.push(`Matches your ${careerProfile.currentRole} role`);
    }
  }

  if (careerProfile.seniority && match.matchedCategories.includes('Career-Stage')) {
    boost += 4;
    reasons.push('Aligned with your seniority level');
  }

  return { boost, reasons };
}

/**
 * Convert string to title case
 */
export function toTitleCase(value: string): string {
  return value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1));
}
