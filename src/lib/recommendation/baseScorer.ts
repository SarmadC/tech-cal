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
import { getRoleKeywords } from '@/utils/roleTaxonomy';

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
  role: 10,               // Role alignment weight
} as const;

/**
 * Keywords for matching career goals to event content
 */
export const GOAL_KEYWORDS: Record<string, string[]> = {
  'skill-development': ['workshop', 'training', 'bootcamp', 'course', 'tutorial', 'hands-on', 'upskill', 'skill'],
  'role-transition': [
    'career transition',
    'career change',
    'career pivot',
    'new role',
    'role change',
    'switch careers',
    'job search',
    'interview',
    'resume',
    'cv'
  ],
  'leadership-growth': [
    'leadership',
    'manager',
    'management',
    'people leader',
    'executive',
    'influence',
    'stakeholder',
    'coaching',
    'mentoring'
  ],
  'networking': [
    'networking',
    'meetup',
    'mixer',
    'community',
    'connect',
    'connections',
    'roundtable',
    'happy hour',
    'social'
  ]
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
  'peer-learning': ['community', 'peer', 'group', 'collaborative']
} as const;

function getGoalReason(goal: string): string {
  const goalMap: Record<string, string> = {
    'skill-development': 'Build in-demand skills',
    'role-transition': 'Support your role transition',
    'leadership-growth': 'Grow leadership capabilities',
    'networking': 'Build industry relationships'
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
    'peer-learning': 'Collaborative peer-learning format'
  };

  return styleMap[style] ?? `Fits ${style.replace('-', ' ')} learning`;
}

/**
 * Alignment reason (without UI-specific properties)
 */
export interface AlignmentReason {
  type: 'skill' | 'goal' | 'interest' | 'learning-style' | 'networking' | 'role';
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
 * Calculate cold start score based on event quality metrics
 * Used when user has no career profile to provide baseline recommendations
 */
function calculateColdStartScore(event: Event): BaseScorerResult {
  let score = 0;
  const alignmentReasons: AlignmentReason[] = [];
  
  // 1. Popularity score (0-15 points)
  const attendeeCount = event.attendeeCount || 0;
  if (attendeeCount > 1000) {
    score += 15;
    alignmentReasons.push({
      type: 'networking',
      reason: 'Highly popular event with 1000+ attendees',
      contribution: 15
    });
  } else if (attendeeCount > 500) {
    score += 12;
    alignmentReasons.push({
      type: 'networking',
      reason: 'Popular event with 500+ attendees',
      contribution: 12
    });
  } else if (attendeeCount > 100) {
    score += 8;
    alignmentReasons.push({
      type: 'networking',
      reason: 'Well-attended event',
      contribution: 8
    });
  } else if (attendeeCount > 50) {
    score += 5;
  }
  
  // 2. Recency/Timing score (0-10 points)
  const eventDate = new Date(event.startTime);
  const now = new Date();
  const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysUntilEvent > 0 && daysUntilEvent <= 14) {
    score += 10;
    alignmentReasons.push({
      type: 'interest',
      reason: 'Happening soon - great timing',
      contribution: 10
    });
  } else if (daysUntilEvent > 0 && daysUntilEvent <= 30) {
    score += 7;
  } else if (daysUntilEvent > 0 && daysUntilEvent <= 60) {
    score += 4;
  }
  
  // 3. Organizer reputation (0-8 points)
  const orgName = (event.organization?.name || event.organizer || '').toLowerCase();
  const majorOrgs = ['google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix', 'uber', 'airbnb', 'stripe', 'github'];
  if (majorOrgs.some(org => orgName.includes(org))) {
    score += 8;
    alignmentReasons.push({
      type: 'interest',
      reason: 'Hosted by a leading tech organization',
      contribution: 8
    });
  } else if (orgName && orgName.length > 0) {
    score += 3; // Any organizer is better than none
  }
  
  // 4. Event quality signals (0-7 points)
  const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
  
  // High-quality event types
  const qualityKeywords = ['conference', 'summit', 'workshop', 'bootcamp', 'masterclass'];
  if (qualityKeywords.some(keyword => eventText.includes(keyword))) {
    score += 5;
    alignmentReasons.push({
      type: 'interest',
      reason: 'High-quality professional development event',
      contribution: 5
    });
  }
  
  // Has registration URL (indicates active event)
  if (event.registrationUrl) {
    score += 2;
  }
  
  // Has detailed description (indicates quality)
  if (event.description && event.description.length > 200) {
    score += 2;
  }
  
  // 5. Virtual events get bonus (accessibility)
  if (event.location?.toLowerCase().includes('virtual') || 
      event.location?.toLowerCase().includes('online') ||
      event.livestreamUrl) {
    score += 3;
    alignmentReasons.push({
      type: 'interest',
      reason: 'Virtual event - join from anywhere',
      contribution: 3
    });
  }
  
  // Normalize to 20-40% range for cold start
  // This ensures events are visible but clearly differentiated from personalized scores
  const normalizedScore = Math.min(40, Math.max(20, score));
  
  return {
    overall: normalizedScore,
    components: {
      skillRelevance: 0,
      careerStageMatch: normalizedScore * 0.4,
      networkingValue: normalizedScore * 0.3,
      industryRelevance: normalizedScore * 0.2,
      timingBonus: normalizedScore * 0.1
    },
    alignmentReasons: alignmentReasons.length > 0 
      ? alignmentReasons 
      : [{
          type: 'interest',
          reason: 'Popular event worth exploring',
          contribution: normalizedScore
        }],
    matchedSkills: [],
    matchedGoals: []
  };
}

/**
 * Calculate base career score for an event
 * 
 * This is the foundational scoring algorithm used throughout the application.
 * It analyzes event content against user career profile and returns a detailed breakdown.
 * For users without profiles (cold start), it provides baseline scores based on event quality.
 * 
 * @param event - The event to score
 * @param careerProfile - User's career profile (or null for unauthenticated users)
 * @returns Base scorer result with score, breakdown, and reasons
 */
export function calculateBaseScore(
  event: Event,
  careerProfile: CareerProfile | null
): BaseScorerResult {
  // Cold start: provide baseline scores when no profile exists
  if (!careerProfile) {
    return calculateColdStartScore(event);
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

  (event.agenda ?? []).forEach(item => {
    addStructuredValue(item.title);
    addStructuredValue(item.description, { splitTokens: false });
    collectSkillIds(item.title);
    collectSkillIds(item.description ?? undefined);
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
    ...(event.speakerLineup ?? []).map(s => `${s.name ?? ''} ${s.title ?? ''}`),
    ...(event.agenda ?? []).map(item => `${item.title} ${item.description ?? ''}`)
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

  // 4. Current Role Alignment
  if (careerProfile.currentRole) {
    const roleKeywords = getRoleKeywords(careerProfile.currentRole);
    const hasMatch = roleKeywords.some(matchesKeyword);
    if (hasMatch) {
      const contribution = ALIGNMENT_WEIGHTS.role;
      alignmentScore += contribution;
      careerStageMatch += contribution;
      alignmentReasons.push({
        type: 'role',
        reason: `Aligns with your ${careerProfile.currentRole} role`,
        contribution
      });
    }
  }

  // 5. Interests
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

  // 6. Learning Style
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

  // 7. Networking
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
