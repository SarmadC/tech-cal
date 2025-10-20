/**
 * Base Career Scorer
 * 
 * This module contains the foundational scoring logic for matching events to user career profiles.
 * It has NO UI dependencies (no React, no icons) and can be used by:
 * - Server-side scoring in API routes
 * - Client-side UI components (via uiScoringAdapter.ts wrapper)
 * - Testing and validation
 * 
 * Follows DRY principle: single source of truth for base scoring logic.
 */

import { Event, CareerProfile } from '@/types';
import { resolveSkillIds, matchSkillIdsInText } from '@/lib/skills/skillRegistry';

/**
 * Test if a keyword matches as a complete word in the text
 * Uses word boundaries to prevent partial matches (e.g., "Java" won't match "JavaScript")
 * 
 * @param text - The text to search in (should be lowercase)
 * @param keyword - The keyword to search for (should be lowercase)
 * @returns true if keyword is found as a complete word
 */
function matchesWholeWord(text: string, keyword: string): boolean {
  // Escape special regex characters in the keyword
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // For keywords with non-word characters (e.g., "C++", "Node.js", "C#"),
  // use lookahead/lookbehind to ensure word boundaries or string boundaries
  // This handles cases where \b doesn't work well with non-word chars
  const hasNonWordChars = /[^a-zA-Z0-9\s]/.test(keyword);
  
  if (hasNonWordChars) {
    // Use lookaround assertions for special characters
    // (?:^|\\s|\\b) - match start of string, whitespace, or word boundary
    // (?=\\s|\\b|$) - followed by whitespace, word boundary, or end of string
    const regex = new RegExp(`(?:^|\\s|\\b)${escapedKeyword}(?=\\s|\\b|$)`, 'i');
    return regex.test(text);
  }
  
  // Standard word boundary for regular keywords
  const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
  return regex.test(text);
}

/**
 * Scoring weights configuration
 * These control how much each factor contributes to the overall alignment score
 * 
 * Tuned to produce 50-80% scores for genuinely good matches:
 * - Event with 2-3 skill matches should score 50-60%
 * - Event with skills + goals + interests should score 70-80%
 * - Event with just 1 match should score 20-30%
 */
export const ALIGNMENT_WEIGHTS = {
  skillsToLearn: 25,      // Highest priority - learning new skills (was 20)
  primarySkills: 15,      // Maintaining/advancing existing skills (was 10)
  careerGoals: 18,        // Supporting career objectives (was 15)
  interests: 12,          // Personal interests alignment (was 8)
  learningStyle: 8,       // Preferred learning format (was 5)
  networking: 15,         // Networking opportunities (was 10)
} as const;

/**
 * Keywords for matching career goals to event content
 */
export const GOAL_KEYWORDS: Record<string, string[]> = {
  'skill-development': ['workshop', 'training', 'bootcamp', 'course', 'learn'],
  'career-advancement': ['leadership', 'management', 'promotion', 'senior'],
  'role-transition': ['career', 'transition', 'new role', 'switch'],
  'leadership-growth': ['leadership', 'management', 'team', 'executive'],
  'entrepreneurship': ['startup', 'founder', 'business', 'entrepreneurship'],
  'networking': ['networking', 'meetup', 'connections', 'community', 'github'],
  'specialization': ['expert', 'advanced', 'deep dive', 'mastery'],
  'generalization': ['full-stack', 'broad', 'overview', 'introduction']
} as const;

/**
 * Keywords for matching learning styles to event formats
 */
export const LEARNING_STYLE_KEYWORDS: Record<string, string[]> = {
  'hands-on': ['workshop', 'lab', 'hands-on', 'practical', 'coding'],
  'theoretical': ['lecture', 'presentation', 'keynote', 'talk'],
  'interactive': ['panel', 'discussion', 'q&a', 'interactive'],
  'networking': ['networking', 'meetup', 'mixer', 'social', 'github'],
  'case-studies': ['case study', 'real-world', 'example', 'demo'],
  'peer': ['community', 'peer', 'group', 'collaborative']
} as const;

function getGoalReason(goal: string): string {
  const goalMap: Record<string, string> = {
    'skill-development': 'Build in-demand skills',
    'career-advancement': 'Move toward your next role',
    'role-transition': 'Support your role transition',
    'leadership-growth': 'Grow leadership capabilities',
    'entrepreneurship': 'Fuel your entrepreneurial plans',
    'networking': 'Build industry relationships',
    'specialization': 'Deepen your specialization',
    'generalization': 'Broaden your expertise'
  };

  return goalMap[goal] ?? `Supports ${goal.replace('-', ' ')}`;
}

function getLearningStyleReason(style: string): string {
  const styleMap: Record<string, string> = {
    'hands-on': 'Hands-on workshop format',
    'theoretical': 'Expert-led session style',
    'interactive': 'Interactive discussion format',
    'networking': 'Collaborative peer exchange format',
    'case-studies': 'Case-study driven format',
    'peer': 'Collaborative peer-learning format'
  };

  return styleMap[style] ?? `Fits ${style.replace('-', ' ')} learning`;
}

/**
 * Alignment reason (without UI-specific properties)
 */
export interface AlignmentReason {
  type: 'skill' | 'goal' | 'interest' | 'learning-style' | 'networking';
  reason: string;
  contribution: number;
}

/**
 * Base scorer result (no UI dependencies)
 */
export interface BaseScorerResult {
  overall: number;
  components: {
    skillRelevance: number;
    careerStageMatch: number;
    networkingValue: number;
    industryRelevance: number;
    timingBonus: number;
  };
  alignmentReasons: AlignmentReason[];
  matchedSkills: string[];
  matchedGoals: string[];
}

// Backward compatibility aliases
export type AlignmentResult = BaseScorerResult;
export type CoreAlignmentResult = BaseScorerResult;

/**
 * Calculate base career score for an event
 * 
 * This is the foundational scoring algorithm used throughout the application.
 * It analyzes event content against user career profile and returns a detailed breakdown.
 * 
 * @param event - The event to score
 * @param careerProfile - User's career profile (or null for unauthenticated users)
 * @returns Base scorer result with score, breakdown, and reasons
 */
export function calculateBaseScore(
  event: Event,
  careerProfile: CareerProfile | null
): BaseScorerResult {
  // Early return for missing profile
  if (!careerProfile) {
    return {
      overall: 0,
      components: {
        skillRelevance: 0,
        careerStageMatch: 0,
        networkingValue: 0,
        industryRelevance: 0,
        timingBonus: 0
      },
      alignmentReasons: [],
      matchedSkills: [],
      matchedGoals: []
    };
  }

  const alignmentReasons: AlignmentReason[] = [];
  let alignmentScore = 0;
  const matchedSkills: string[] = [];
  const matchedGoals: string[] = [];

  // Build structured attribute index for matching
  const structuredTokens = new Set<string>();
  const eventSkillIds = new Set<string>();
  const collectSkillIds = (value?: string | null) => {
    if (!value) return;
    matchSkillIdsInText(value).forEach(id => eventSkillIds.add(id));
  };
  const addStructuredValue = (value?: string | null, options: { splitTokens?: boolean } = {}) => {
    if (!value) return;
    const { splitTokens = true } = options;
    const lower = value.toLowerCase();
    structuredTokens.add(lower);
    if (splitTokens) {
      lower.split(/[^a-z0-9#+]+/g).forEach(token => {
        if (token) {
          structuredTokens.add(token);
        }
      });
    }
  };

  addStructuredValue(event.title);
  collectSkillIds(event.title);
  addStructuredValue(event.description, { splitTokens: false });
  collectSkillIds(event.description ?? undefined);
  addStructuredValue(event.category?.name);
  collectSkillIds(event.category?.name);
  addStructuredValue(event.category?.description);
  collectSkillIds(event.category?.description ?? undefined);
  addStructuredValue(event.organization?.name);
  collectSkillIds(event.organization?.name);
  addStructuredValue(event.targetAudience);
  collectSkillIds(event.targetAudience);
  addStructuredValue(event.prerequisites);
  collectSkillIds(event.prerequisites);
  addStructuredValue(event.location);
  collectSkillIds(event.location);
  addStructuredValue(event.eventTypeId, { splitTokens: false });
  collectSkillIds(event.eventTypeId);

  (event.tags ?? []).forEach(tag => {
    addStructuredValue(tag.name);
    addStructuredValue(tag.category);
    collectSkillIds(tag.name);
    collectSkillIds(tag.category);
  });

  (event.speakerLineup ?? []).forEach(speaker => {
    addStructuredValue(speaker.name);
    if (speaker.title) addStructuredValue(speaker.title);
    if (speaker.company) addStructuredValue(speaker.company);
    collectSkillIds(speaker.name);
    if (speaker.title) collectSkillIds(speaker.title);
    if (speaker.company) collectSkillIds(speaker.company);
  });

  const eventText = [
    event.title,
    event.description,
    event.category?.name,
    ...(event.tags ?? []).map(tag => tag.name),
    event.organization?.name,
    event.targetAudience,
    event.prerequisites,
    event.location,
    ...(event.speakerLineup ?? []).map(s => `${s.name ?? ''} ${s.title ?? ''}`)
  ]
    .filter(Boolean)
    .join(' ');

  matchSkillIdsInText(eventText).forEach(id => eventSkillIds.add(id));

  const matchesKeyword = (keyword: string): boolean => {
    const normalized = keyword.toLowerCase();
    if (structuredTokens.has(normalized)) {
      return true;
    }
    return matchesWholeWord(eventText, keyword);
  };

  const skillMatches = (skill: string): boolean => {
    const resolvedIds = resolveSkillIds([skill]);
    if (resolvedIds.some(id => eventSkillIds.has(id))) {
      return true;
    }
    return matchesKeyword(skill);
  };

  // Component tracking for breakdown
  let skillRelevance = 0;
  let careerStageMatch = 0;
  let networkingValue = 0;
  let industryRelevance = 0;

  // 1. Skills to Learn (highest priority)
  careerProfile.skillsToLearn.forEach(skill => {
    if (skillMatches(skill)) {
      const contribution = ALIGNMENT_WEIGHTS.skillsToLearn;
      alignmentScore += contribution;
      skillRelevance += contribution;
      matchedSkills.push(skill);
      alignmentReasons.push({
        type: 'skill',
        reason: `Learn ${skill}`,
        contribution
      });
    }
  });

  // 2. Primary Skills (maintenance/advancement)
  careerProfile.primarySkills.slice(0, 5).forEach(skill => {
    if (skillMatches(skill)) {
      const contribution = ALIGNMENT_WEIGHTS.primarySkills;
      alignmentScore += contribution;
      skillRelevance += contribution;
      matchedSkills.push(skill);
      alignmentReasons.push({
        type: 'skill',
        reason: `Advance ${skill} skills`,
        contribution
      });
    }
  });

  // 3. Career Goals
  careerProfile.careerGoals.forEach(goal => {
    const keywords = GOAL_KEYWORDS[goal as keyof typeof GOAL_KEYWORDS] || [];
    const hasMatch = keywords.some(matchesKeyword);

    if (hasMatch) {
      const contribution = ALIGNMENT_WEIGHTS.careerGoals;
      alignmentScore += contribution;
      careerStageMatch += contribution;
      matchedGoals.push(goal);
      
      alignmentReasons.push({
        type: 'goal',
        reason: getGoalReason(goal),
        contribution
      });
    }
  });

  // 4. Interests
  careerProfile.interests.slice(0, 5).forEach(interest => {
    if (matchesKeyword(interest)) {
      const contribution = ALIGNMENT_WEIGHTS.interests;
      alignmentScore += contribution;
      industryRelevance += contribution;
      alignmentReasons.push({
        type: 'interest',
        reason: `Matches interest: ${interest}`,
        contribution
      });
    }
  });

  // 5. Learning Style
  careerProfile.learningStyle.forEach(style => {
    const keywords = LEARNING_STYLE_KEYWORDS[style] || [];
    const hasMatch = keywords.some(matchesKeyword);

    if (hasMatch) {
      const contribution = ALIGNMENT_WEIGHTS.learningStyle;
      alignmentScore += contribution;
      // Learning style contributes to career stage match (finding right format for growth)
      careerStageMatch += contribution;
      
      alignmentReasons.push({
        type: 'learning-style',
        reason: getLearningStyleReason(style),
        contribution
      });
    }
  });

  // 6. Networking
  if (careerProfile.networkingGoals.length > 0 &&
      GOAL_KEYWORDS.networking.some(matchesKeyword)) {
    const contribution = ALIGNMENT_WEIGHTS.networking;
    alignmentScore += contribution;
    networkingValue += contribution;
    alignmentReasons.push({
      type: 'networking',
      reason: 'High-value community access',
      contribution
    });
  }

  // Normalize score to 0-100
  const normalizedScore = Math.min(100, alignmentScore);

  return {
    overall: normalizedScore,
    components: {
      skillRelevance,
      careerStageMatch,
      networkingValue,
      industryRelevance,
      timingBonus: 0 // Reserved for future timing-based scoring
    },
    alignmentReasons,
    matchedSkills: [...new Set(matchedSkills)],
    matchedGoals: [...new Set(matchedGoals)]
  };
}

/**
 * Get alignment category from score
 */
// Backward compatibility alias
export const calculateAlignment = calculateBaseScore;

export function getAlignmentCategory(score: number): 'high' | 'moderate' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 50) return 'moderate';
  return 'low';
}

/**
 * Get match quality label from score
 */
export function getMatchQuality(score: number): string {
  if (score >= 80) return 'Perfect';
  if (score >= 50) return 'Strong';
  if (score >= 20) return 'Good';
  return 'Fair';
}
