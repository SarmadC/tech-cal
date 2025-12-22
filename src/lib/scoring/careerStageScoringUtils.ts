/**
 * Career Stage Scoring Utilities
 *
 * Extracted from AdvancedScorer to improve maintainability.
 * Contains functions for seniority matching, career goals, and learning style evaluation.
 *
 * Used by: AdvancedScorer.calculateCareerStageMatchScore()
 */

import { Event } from '@/types';
import { CareerProfile } from '@/types/career';
import { normalizeEventType } from '@/utils/eventTypeUtils';
import {
  SENIORITY_CONFIG,
  CAREER_GOAL_KEYWORDS,
} from '@/config/scoringConfig';

/**
 * Calculate seniority level match between event and career profile
 */
export function calculateSeniorityMatch(event: Event, careerProfile: CareerProfile): number {
  const seniority = careerProfile.seniority || 'mid-level';
  const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();

  // Seniority config is imported from @/config/scoringConfig
  const match = SENIORITY_CONFIG[seniority];
  if (!match) return 50;

  let score = match.score;

  const keywordMatches = match.keywords.filter((keyword: string) => eventText.includes(keyword));
  if (keywordMatches.length > 0) {
    score += Math.min(keywordMatches.length * 5, 20);
  }

  const rawTypeSeniority = (event.category?.name || '').toLowerCase();
  const canonicalSeniority = normalizeEventType(rawTypeSeniority);
  if (match.eventTypes.includes(canonicalSeniority) || match.eventTypes.includes(rawTypeSeniority)) {
    score += 10;
  }

  // Adjust for mismatched seniority indicators
  const otherSeniorities = Object.keys(SENIORITY_CONFIG).filter(s => s !== seniority);
  for (const otherSeniority of otherSeniorities) {
    const otherMatch = SENIORITY_CONFIG[otherSeniority];
    const otherKeywordMatches = otherMatch.keywords.filter((keyword: string) => eventText.includes(keyword));
    if (otherKeywordMatches.length > keywordMatches.length) {
      score -= 15;
    }
  }

  return Math.min(Math.max(score, 20), 100);
}

/**
 * Calculate career goals alignment between event and career profile
 */
export function calculateCareerGoalsMatch(event: Event, careerProfile: CareerProfile): number {
  const goals = careerProfile.careerGoals || [];
  if (goals.length === 0) return 50;

  const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
  let score = 0;
  let totalWeight = 0;

  // Goal keywords are imported from @/config/scoringConfig

  for (const goal of goals) {
    const keywords = CAREER_GOAL_KEYWORDS[goal] || [];
    const weight = 1.0;
    totalWeight += weight;

    let goalScore = 0;
    for (const keyword of keywords) {
      if (eventText.includes(keyword)) {
        goalScore += 20;
      }
    }

    score += Math.min(goalScore, 100) * weight;
  }

  return totalWeight > 0 ? Math.min(score / totalWeight, 100) : 50;
}

/**
 * Learning style keywords for matching
 */
const LEARNING_STYLE_MATCH_KEYWORDS = {
  'hands-on': ['hands-on', 'practical', 'workshop', 'lab', 'exercise', 'coding'],
  'theoretical': ['presentation', 'demo', 'visual', 'chart', 'diagram', 'showcase', 'lecture'],
  'interactive': ['interactive', 'discussion', 'q&a', 'panel', 'workshop'],
} as const;

/**
 * Calculate learning style alignment between event and career profile
 */
export function calculateLearningStyleMatch(event: Event, careerProfile: CareerProfile): number {
  const learningStyles = careerProfile.learningStyle || [];
  if (learningStyles.length === 0) return 60;

  const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
  let score = 0;

  if (learningStyles.includes('hands-on')) {
    const hasHandsOn = LEARNING_STYLE_MATCH_KEYWORDS['hands-on'].some(keyword => eventText.includes(keyword));
    score += hasHandsOn ? 40 : 20;
  }

  if (learningStyles.includes('theoretical')) {
    const hasTheoretical = LEARNING_STYLE_MATCH_KEYWORDS['theoretical'].some(keyword => eventText.includes(keyword));
    score += hasTheoretical ? 40 : 20;
  }

  if (learningStyles.includes('interactive')) {
    const hasInteractive = LEARNING_STYLE_MATCH_KEYWORDS['interactive'].some(keyword => eventText.includes(keyword));
    score += hasInteractive ? 40 : 20;
  }

  return Math.min(score, 100);
}
