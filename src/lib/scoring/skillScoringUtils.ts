/**
 * Skill Scoring Utilities
 *
 * Extracted from AdvancedScorer to improve maintainability.
 * Contains functions for skill matching, keyword analysis, and content evaluation.
 *
 * Used by: AdvancedScorer.calculateSkillRelevanceScore()
 */

import { Event } from '@/types';
import { CareerProfile } from '@/types/career';
import { TagBasedMatchingService } from '@/services/tagBasedMatchingService';
import { normalizeEventType } from '@/utils/eventTypeUtils';
import {
  BEGINNER_KEYWORDS,
  DEPTH_KEYWORDS,
} from '@/config/scoringConfig';

/**
 * Result of skill matching calculation
 */
export interface SkillMatchResult {
  score: number;
  triggeredBoosts: string[];
  appliedAdjustments: Record<string, unknown>;
}

/**
 * Calculate keyword-based matching for events with sparse tags
 * Returns raw score (will be weighted and capped by caller)
 */
export function calculateKeywordMatchScore(
  event: Event,
  skillsToLearn: string[],
  isBeginner: boolean
): number {
  const searchText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
  let matchCount = 0;

  for (const skill of skillsToLearn) {
    const skillLower = skill.toLowerCase();
    if (searchText.includes(skillLower)) {
      matchCount++;
    }
  }

  // Base: 20 points per match (will be weighted by caller)
  let score = matchCount * 20;

  // Bonus for beginners if event explicitly mentions learning/beginner
  if (isBeginner) {
    const hasBeginnerKeywords = BEGINNER_KEYWORDS.some(kw => searchText.includes(kw));
    if (hasBeginnerKeywords) {
      score += 10;
    }
  }

  return score;
}

/**
 * Calculate beginner-friendly boost based on event characteristics
 * Capped at 15 points total
 */
export function calculateBeginnerBoost(event: Event): number {
  let boost = 0;
  const title = (event.title || '').toLowerCase();
  const description = (event.description || '').toLowerCase();
  const searchText = title + ' ' + description;

  // 1. Explicit beginner keywords (+8 points)
  if (BEGINNER_KEYWORDS.some(kw => searchText.includes(kw))) {
    boost += 8;
  }

  // 2. Prerequisites: No prerequisites or "no experience required" (+5 points)
  if (!event.prerequisites || event.prerequisites.toLowerCase().includes('no experience')) {
    boost += 5;
  }

  // 3. Event type: Workshop/Training/Bootcamp (+4 points)
  const beginnerFriendlyTypes = ['workshop', 'training', 'bootcamp', 'tutorial'];
  const eventType = (event.category?.name || '').toLowerCase();
  if (beginnerFriendlyTypes.some(type => eventType.includes(type))) {
    boost += 4;
  }

  // 4. Duration: 2-6 hours is ideal for beginners (+3 points)
  if (event.startTime && event.endTime) {
    const duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
    const hours = duration / (1000 * 60 * 60);
    if (hours >= 2 && hours <= 6) {
      boost += 3;
    }
  }

  // Cap total boost at 15
  return Math.min(boost, 15);
}

/**
 * Analyze content depth based on description and keywords
 */
export function analyzeContentDepth(event: Event): number {
  let score = 50;
  const title = event.title || '';
  const description = event.description || '';

  // Length analysis
  if (description.length > 500) score += 15;
  else if (description.length > 200) score += 10;
  else if (description.length < 50) score -= 20;

  // Technical depth indicators from config
  const hasDepthKeywords = DEPTH_KEYWORDS.some(keyword =>
    (title + description).toLowerCase().includes(keyword)
  );

  if (hasDepthKeywords) score += 20;

  // Prerequisites analysis (indicates depth)
  if (event.prerequisites) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * Analyze learning format based on event characteristics
 */
export function analyzeLearningFormat(event: Event): number {
  let score = 60; // Base score for any event

  // Interactive elements
  if (event.agendaUrl) score += 10;
  if (event.attendeeCount && event.attendeeCount < 50) score += 15; // Small groups
  else if (event.attendeeCount && event.attendeeCount > 200) score -= 10; // Large groups

  // Duration analysis (optimal learning sessions)
  if (event.startTime && event.endTime) {
    const duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
    const hours = duration / (1000 * 60 * 60);

    if (hours >= 4 && hours <= 8) score += 15; // Optimal full-day learning
    else if (hours >= 2 && hours < 4) score += 10; // Good half-day session
    else if (hours > 8) score += 5; // Extended learning
    else score -= 5; // Too short
  }

  return Math.min(score, 100);
}

/**
 * Calculate comprehensive skill matching score
 * Combines tag-based matching with keyword fallbacks and boosts
 */
export function calculateSkillMatchingScore(
  event: Event,
  careerProfile: CareerProfile,
  scoringTriggers: string[],
  appliedAdjustments: Record<string, unknown>
): number {
  const primarySkills = careerProfile.primarySkills || [];
  const skillsToLearn = careerProfile.skillsToLearn || [];
  const learningStyle = careerProfile.learningStyle || [];

  // Determine if user is a beginner
  const isBeginner = learningStyle.includes('hands-on') || primarySkills.length < 3;

  // 1. Tag-based matching (primary approach)
  const tagMatchResult = TagBasedMatchingService.calculateTagSimilarity(event, careerProfile);
  let score = tagMatchResult.score;

  // 2. Apply 60/40 split for skills to learn (already handled in TagBasedMatchingService)
  // The service applies 67% weight for beginners, 40% for others

  // 3. Keyword fallback for sparse tags (guard: only if <5 tags)
  const hasRichTags = (event.tags?.length || 0) >= 5;

  if (!hasRichTags && skillsToLearn.length > 0) {
    const keywordScore = calculateKeywordMatchScore(
      event,
      skillsToLearn,
      isBeginner
    );
    // Cap keyword contribution at 20 points, weight at 0.25x
    score += Math.min(keywordScore * 0.25, 20);

    // Small, bounded boost for canonical workshops when tags are sparse
    // and we had at least one keyword match (no double counting scaling)
    const canonicalTypeForSkills = normalizeEventType((event.category?.name || '').toLowerCase());
    if (keywordScore > 0 && !hasRichTags && canonicalTypeForSkills === 'workshop') {
      const workshopKeywordBoost = 3; // bounded, fixed
      score += workshopKeywordBoost;
      scoringTriggers.push('workshop_keyword_boost');
    }

    // Additional tiny boost for beginner-friendly workshops when user isn't marked beginner
    // to avoid overlap with calculateBeginnerBoost. Conditions: sparse tags, canonical workshop,
    // beginner keywords present, skillsToLearn non-empty.
    const beginnerFriendly = BEGINNER_KEYWORDS.some(
      kw => ((event.title || '') + ' ' + (event.description || '')).toLowerCase().includes(kw)
    );
    if (!isBeginner && beginnerFriendly && !hasRichTags && canonicalTypeForSkills === 'workshop' && skillsToLearn.length > 0) {
      const nonBeginnerWorkshopFriendlyBoost = 2; // tiny, bounded
      score += nonBeginnerWorkshopFriendlyBoost;
      scoringTriggers.push('workshop_beginner_friendly_nudge');
    }

    // Modest negative adjustment for canonical webinars when tags are sparse and no keyword match
    if (keywordScore === 0 && canonicalTypeForSkills === 'webinar') {
      const webinarNoKeywordPenalty = 3; // bounded, fixed
      score -= webinarNoKeywordPenalty;
      scoringTriggers.push('webinar_no_keyword_penalty');
    }
  }

  // 4. Beginner boost heuristics
  if (isBeginner && skillsToLearn.length > 0) {
    const beginnerBoost = calculateBeginnerBoost(event);
    if (beginnerBoost > 0) {
      score += beginnerBoost;
      scoringTriggers.push('beginner_boost');
      appliedAdjustments.beginnerBoost = beginnerBoost;
    }
  }

  return Math.min(score, 100);
}
