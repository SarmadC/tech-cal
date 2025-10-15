/**
 * Advanced Scorer
 *
 * This is the advanced scoring algorithm (version 2.0.0) that incorporates behavioral and contextual signals.
 * It uses rule-based logic with weighted components, layered on top of the base scorer.
 *
 * Components:
 * - Skill Relevance (30%): Event type, skill matching, content depth, learning format
 * - Career Stage Match (25%): Seniority, career goals, learning style
 * - Networking Value (20%): Speaker quality, networking opportunities, industry alignment
 * - Industry Relevance (15%): Industry alignment, sector trends, market relevance
 * - Timing Bonus (10%): Career timing, seasonal timing, schedule alignment
 *
 * Used for advanced reranking via behavioralReranker.
 */

import { Event, CareerImpactScore } from '@/types';
import { CareerProfile } from '@/types/career';
import {
  CareerImpactCalculationInput,
  CareerImpactCalculationOptions,
  ComponentScore,
  ScoringAlgorithmConfig
} from '@/types/careerImpact';
import { BaseScoringStrategy } from '../ScoringStrategy';
import { CareerImpactCache } from '@/services/cache/careerImpactCache';
import { TagBasedMatchingService } from '@/services/tagBasedMatchingService';
import { BehavioralBoostService } from '@/services/behavioralBoostService';
import { calculateTypePreferenceScore, normalizeEventType } from '@/utils/eventTypeUtils';
import { hasSeniorSpeaker } from '@/utils/speakerUtils';
import * as Sentry from '@sentry/nextjs';
import { AnalyticsService } from '@/services/analyticsService';

export class AdvancedScorer extends BaseScoringStrategy {
  readonly version = 'v2.0.0';
  readonly name = 'Advanced Scorer';

  private readonly config: ScoringAlgorithmConfig = {
    version: 'v2.0.0',
    weights: {
      skillRelevance: 0.30,      // Enhanced: Most important for career growth
      careerStageMatch: 0.25,    // Enhanced: Critical for relevance
      networkingValue: 0.20,     // Balanced: Important for advancement
      industryRelevance: 0.15,   // Moderate: Sector alignment
      timingBonus: 0.10,         // Reduced: Timing is less critical
    },
    thresholds: {
      highImpact: 85,            // Raised: More selective for high impact
      moderateImpact: 65,        // Raised: Better distinction
      lowImpact: 45,             // Raised: Improved categorization
    },
    confidenceFactors: {
      dataCompleteness: 0.35,    // Enhanced: More data = higher confidence
      profileCompleteness: 0.40, // Enhanced: Profile quality matters
      eventDetailLevel: 0.25,    // Balanced: Event details important
    },
  };

  private readonly SCORE_THRESHOLDS = {
    HIGH: 80,
    MODERATE: 60,
    LOW: 40
  } as const;

  private readonly CONFIDENCE_BOOSTS = {
    HIGH: 0.2,
    MODERATE: 0.15,
    LOW: 0.1
  } as const;

  // Shared beginner keyword list (DRY across methods)
  private static readonly BEGINNER_KEYWORDS = [
    'beginner', 'intro', 'introduction', '101', 'fundamentals', 'basics', 'getting started', 'learn'
  ];

  /**
   * Get the algorithm configuration
   */
  getConfig(): ScoringAlgorithmConfig {
    return { ...this.config };
  }

  /**
   * Calculate career impact score for an event
   */
  async calculate(
    input: CareerImpactCalculationInput,
    options?: CareerImpactCalculationOptions
  ): Promise<CareerImpactScore> {
    const { event, careerProfile } = input;
    const scoringTriggers: string[] = [];
    const appliedAdjustments: {
      typePreferenceGate?: number;
      beginnerBoost?: number;
      workshopKeywordBoost?: boolean;
      webinarPenalty?: boolean;
      behavioralBoost?: number;
    } = {};

    // Calculate component scores
    const componentScores = {
      skillRelevance: this.calculateSkillRelevanceScore(event, careerProfile, scoringTriggers, appliedAdjustments),
      careerStageMatch: this.calculateCareerStageMatchScore(event, careerProfile),
      networkingValue: this.calculateNetworkingValueScore(event, careerProfile),
      industryRelevance: this.calculateIndustryRelevanceScore(event, careerProfile),
      timingBonus: this.calculateTimingBonusScore(event, careerProfile),
    };

    // Extract raw scores for overall calculation
    const rawComponents = {
      skillRelevance: componentScores.skillRelevance.score,
      careerStageMatch: componentScores.careerStageMatch.score,
      networkingValue: componentScores.networkingValue.score,
      industryRelevance: componentScores.industryRelevance.score,
      timingBonus: componentScores.timingBonus.score,
    };

    // Calculate weighted overall score
    let overallScore = Object.entries(rawComponents).reduce(
      (total, [key, score]) => total + (score * this.config.weights[key as keyof typeof this.config.weights]),
      0
    );

    // Apply behavioral boost if enabled and data available
    let behavioralBoost = 0;
    if (options?.supabaseClient && options?.userId && options?.interactedEvents) {
      try {
        const boostResult = await BehavioralBoostService.calculateBehavioralBoost(
          options.userId,
          event,
          options.interactedEvents,
          options.supabaseClient
        );

        behavioralBoost = boostResult.boost;
        if (behavioralBoost > 0) {
          overallScore += behavioralBoost;
          scoringTriggers.push('behavioral_boost');
          appliedAdjustments.behavioralBoost = behavioralBoost;

          // Note: boost application logging would be implemented here
          // For now, we'll skip this since the application property doesn't exist
        }
      } catch (error) {
        // Don't fail scoring if behavioral boost fails
        console.warn('Behavioral boost calculation failed:', error);
      }
    }

    // Calculate confidence based on component confidences and data completeness
    const confidence = this.calculateOverallConfidence(
      event,
      careerProfile,
      componentScores
    );

    // Generate explanation
    const explanation = this.generateExplanation(componentScores, careerProfile);

    // Determine impact category
    const category = this.determineImpactCategory(overallScore);

    // Minimal instrumentation for version visibility and component logging
    try {
      Sentry.addBreadcrumb({
        category: 'scoring',
        level: 'info',
        message: `Scored with ${this.version}`,
        data: { eventId: event.id }
      });
      if (process.env.NODE_ENV !== 'production') {
        // Keep lightweight to avoid console noise in production
        console.debug('ScoringStrategy', { version: this.version, eventId: event.id });

        if (process.env.NEXT_PUBLIC_LOG_SCORING === 'true') {
          const primaryReason = Array.isArray(explanation.reasons) && explanation.reasons.length > 0
            ? explanation.reasons[0]
            : null;
          console.debug('ScoringComponents', {
            version: this.version,
            eventId: event.id,
            components: rawComponents,
            primaryReason
          });

          // Centralized analytics logging for triggers
          AnalyticsService.logScoringDebug({
            eventId: event.id,
            version: this.version,
            triggers: scoringTriggers,
            components: rawComponents
          });
        }
      }
    } catch {
      // no-op
    }

    return {
      overall: this.roundDecimal(Math.min(overallScore, 100)), // Cap at 100 with behavioral boost
      confidence: this.roundDecimal(confidence),
      components: rawComponents,
      explanation: {
        reasons: explanation.reasons,
        matchedSkills: explanation.matchedSkills,
        speakerHighlights: explanation.speakerHighlights,
        careerImpactCategory: category,
        confidenceFactors: explanation.confidenceFactors,
      },
      metadata: {
        calculatedAt: new Date().toISOString(),
        algorithmVersion: this.version,
        careerProfileHash: CareerImpactCache.generateProfileHash(careerProfile),
        eventDataHash: this.generateEventHash(event),
        scoringTriggers, // Include triggers for UI/logs/API consistency
        appliedAdjustments: Object.keys(appliedAdjustments).length > 0 ? appliedAdjustments : undefined,
      },
    };
  }

  /**
   * Consolidated helper for scoring pattern with confidence and explanation
   */
  private applyScoreComponent(
    score: number,
    weight: number,
    details: Record<string, unknown>,
    key: string,
    explanation: string,
    confidence: number,
    highMessage: string,
    moderateMessage: string,
    lowMessage: string
  ): { weightedScore: number; updatedExplanation: string; updatedConfidence: number } {
    const weightedScore = score * weight;
    details[key] = score;

    let updatedExplanation = explanation;
    let updatedConfidence = confidence;

    if (score >= this.SCORE_THRESHOLDS.HIGH) {
      updatedExplanation += highMessage;
      updatedConfidence += this.CONFIDENCE_BOOSTS.HIGH;
    } else if (score >= this.SCORE_THRESHOLDS.MODERATE) {
      updatedExplanation += moderateMessage;
      updatedConfidence += this.CONFIDENCE_BOOSTS.LOW;
    } else {
      updatedExplanation += lowMessage;
    }

    return { weightedScore, updatedExplanation, updatedConfidence };
  }

  // =================================================================
  // SKILL RELEVANCE COMPONENT
  // =================================================================

  private calculateSkillRelevanceScore(
    event: Event,
    careerProfile: CareerProfile,
    scoringTriggers: string[],
    appliedAdjustments: Record<string, unknown>
  ): ComponentScore {
    let score = 0;
    let explanation = '';
    let confidence = 0.3;
    const details: Record<string, unknown> = {};

    // Early type preference computation for gating (no double-counting):
    // If user has strong preferences and this event type does not match, we softly gate
    const preferredTypes = careerProfile.preferredEventTypes || [];
    const earlyTypePreferenceRawScore = calculateTypePreferenceScore(
      event.category?.name,
      preferredTypes
    );
    // Env-configurable gate strength (0<g<1), default 0.75
    let gateStrength = 0.75;
    try {
      const gateEnv = process.env.NEXT_PUBLIC_TYPE_PREF_GATE;
      if (gateEnv) {
        const parsed = Number(gateEnv);
        if (Number.isFinite(parsed) && parsed > 0 && parsed < 1) {
          gateStrength = parsed;
        }
      }
      if (process.env.NEXT_PUBLIC_DISABLE_TYPE_PREF_GATE === 'true') {
        gateStrength = 1.0;
      }
    } catch {
      // no-op
    }
    const typePreferenceGate = preferredTypes.length > 0 && earlyTypePreferenceRawScore <= 50 ? gateStrength : 1.0;
    if (typePreferenceGate < 1) {
      scoringTriggers.push('type_pref_gate');
      appliedAdjustments.typePreferenceGate = typePreferenceGate;
    }

    // 1. Event Type & Format Analysis (35% of score - reduced from 40% to accommodate event type preference)
    const eventTypeScores: Record<string, number> = {
      // Canonical types (normalized)
      'workshop': 95,      // Hands-on learning
      'conference': 75,    // Knowledge sharing
      'webinar': 70,       // Focused learning
      'meetup': 60,        // Community learning
      // Non-canonical fallbacks
      'training': 90,      // Structured skill building
      'course': 85,        // Comprehensive learning
      'networking': 35,    // Limited skill focus
      'social': 15,        // Minimal skill development
    };

    const rawEventType = (event.category?.name || '').toLowerCase();
    const canonicalEventType = normalizeEventType(rawEventType);
    const eventTypeKey = canonicalEventType || rawEventType || 'unknown';
    const eventTypeScore = eventTypeScores[eventTypeKey] || eventTypeScores[rawEventType] || 30;
    const eventTypeName = eventTypeKey;

    const eventTypeResult = this.applyScoreComponent(
      eventTypeScore,
      0.35,
      details,
      'eventTypeScore',
      explanation,
      confidence,
      `High skill development potential (${eventTypeName})`,
      `Moderate skill development (${eventTypeName})`,
      `Limited skill development (${eventTypeName})`
    );

    score += eventTypeResult.weightedScore * typePreferenceGate;
    explanation = eventTypeResult.updatedExplanation;
    confidence = eventTypeResult.updatedConfidence;

    // 2. Skill Matching Analysis (35% of score)
    const skillMatchScore = this.calculateSkillMatchingScore(event, careerProfile, scoringTriggers, appliedAdjustments);

    const skillMatchResult = this.applyScoreComponent(
      skillMatchScore,
      0.35,
      details,
      'skillMatchScore',
      explanation,
      confidence,
      '. Strong alignment with your skill profile',
      '. Good skill alignment',
      '. Limited skill alignment'
    );

    score += skillMatchResult.weightedScore * typePreferenceGate;
    explanation = skillMatchResult.updatedExplanation;
    confidence = skillMatchResult.updatedConfidence;

    // 3. Content Depth Analysis (10% of score - reduced from 15% to accommodate event type preference)
    const contentScore = this.analyzeContentDepth(event);

    const contentResult = this.applyScoreComponent(
      contentScore,
      0.10,
      details,
      'contentScore',
      explanation,
      confidence,
      '. Deep, comprehensive content',
      '. Moderate content depth',
      '. Basic content level'
    );

    score += contentResult.weightedScore * typePreferenceGate;
    explanation = contentResult.updatedExplanation;
    confidence = contentResult.updatedConfidence;

    // 4. Learning Format Analysis (10% of score)
    const formatScore = this.analyzeLearningFormat(event);

    const formatResult = this.applyScoreComponent(
      formatScore,
      0.10,
      details,
      'formatScore',
      explanation,
      confidence,
      '. Optimal learning format',
      '. Good learning format',
      '. Suboptimal format'
    );

    score += formatResult.weightedScore * typePreferenceGate;
    explanation = formatResult.updatedExplanation;
    confidence = formatResult.updatedConfidence;

    // 5. Event Type Preference (10% of score)
    // Use previously computed earlyTypePreferenceRawScore to avoid recompute
    const typePreferenceRawScore = earlyTypePreferenceRawScore;

    const typePreferenceResult = this.applyScoreComponent(
      typePreferenceRawScore,
      0.10,
      details,
      'eventTypePreference',
      explanation,
      confidence,
      '. Matches your preferred event format',
      '. Related to your event preferences',
      ''
    );

    score += typePreferenceResult.weightedScore;
    explanation = typePreferenceResult.updatedExplanation;
    confidence = typePreferenceResult.updatedConfidence;

    // Add explanatory note when we gated due to preference mismatch
    if (typePreferenceGate < 1) {
      explanation += '. De-prioritized due to format preference mismatch';
      details.typePreferenceGate = typePreferenceGate;
      try {
        Sentry.addBreadcrumb({
          category: 'scoring',
          level: 'info',
          message: 'Type preference gate applied',
          data: {
            eventId: event.id,
            gate: typePreferenceGate,
            prefScore: earlyTypePreferenceRawScore,
            preferredTypes: preferredTypes
          }
        });
      } catch {
        // no-op
      }
    }

    // Cap score at 100
    score = Math.min(score, 100);
    confidence = Math.min(confidence, 1.0);

    return {
      score: this.roundScore(score),
      maxScore: 100,
      explanation: explanation || 'Skill relevance analysis completed',
      confidence,
      details
    };
  }

  private calculateSkillMatchingScore(
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
      const keywordScore = this.calculateKeywordMatchScore(
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
      const beginnerFriendly = AdvancedScorer.BEGINNER_KEYWORDS.some(
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
      const beginnerBoost = this.calculateBeginnerBoost(event);
      if (beginnerBoost > 0) {
        score += beginnerBoost;
        scoringTriggers.push('beginner_boost');
        appliedAdjustments.beginnerBoost = beginnerBoost;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate keyword-based matching for events with sparse tags
   * Returns raw score (will be weighted and capped by caller)
   */
  private calculateKeywordMatchScore(
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
      const hasBeginnerKeywords = AdvancedScorer.BEGINNER_KEYWORDS.some(kw => searchText.includes(kw));
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
  private calculateBeginnerBoost(event: Event): number {
    let boost = 0;
    const title = (event.title || '').toLowerCase();
    const description = (event.description || '').toLowerCase();
    const searchText = title + ' ' + description;

    // 1. Explicit beginner keywords (+8 points)
    if (AdvancedScorer.BEGINNER_KEYWORDS.some(kw => searchText.includes(kw))) {
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

  private analyzeContentDepth(event: Event): number {
    let score = 50;
    const title = event.title || '';
    const description = event.description || '';

    // Length analysis
    if (description.length > 500) score += 15;
    else if (description.length > 200) score += 10;
    else if (description.length < 50) score -= 20;

    // Technical depth indicators
    const depthKeywords = [
      'advanced', 'deep dive', 'comprehensive', 'masterclass', 'bootcamp',
      'certification', 'hands-on', 'practical', 'real-world', 'case study'
    ];

    const hasDepthKeywords = depthKeywords.some(keyword =>
      (title + description).toLowerCase().includes(keyword)
    );

    if (hasDepthKeywords) score += 20;

    // Prerequisites analysis (indicates depth)
    if (event.prerequisites) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private analyzeLearningFormat(event: Event): number {
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

  // =================================================================
  // CAREER STAGE MATCH COMPONENT
  // =================================================================

  private calculateCareerStageMatchScore(
    event: Event,
    careerProfile: CareerProfile
  ): ComponentScore {
    let score = 0;
    let explanation = '';
    let confidence = 0.3;
    const details: Record<string, unknown> = {};

    // 1. Seniority Level Matching (50% of score)
    const seniorityScore = this.calculateSeniorityMatch(event, careerProfile);
    score += (seniorityScore * 0.5);
    details.seniorityScore = seniorityScore;

    if (seniorityScore >= 80) {
      explanation += 'Perfect match for your seniority level';
      confidence += 0.2;
    } else if (seniorityScore >= 60) {
      explanation += 'Good match for your career stage';
      confidence += 0.1;
    } else {
      explanation += 'Limited match for your seniority level';
    }

    // 2. Career Goals Alignment (30% of score)
    const goalsScore = this.calculateCareerGoalsMatch(event, careerProfile);
    score += (goalsScore * 0.3);
    details.goalsScore = goalsScore;

    if (goalsScore >= 80) {
      explanation += '. Strong alignment with your career goals';
      confidence += 0.15;
    } else if (goalsScore >= 60) {
      explanation += '. Good alignment with career objectives';
      confidence += 0.1;
    } else {
      explanation += '. Limited alignment with career goals';
    }

    // 3. Learning Style Match (20% of score)
    const learningScore = this.calculateLearningStyleMatch(event, careerProfile);
    score += (learningScore * 0.2);
    details.learningScore = learningScore;

    // Cap score at 100
    score = Math.min(score, 100);
    confidence = Math.min(confidence, 1.0);

    return {
      score: this.roundScore(score),
      maxScore: 100,
      explanation: explanation || 'Career stage analysis completed',
      confidence,
      details
    };
  }

  private calculateSeniorityMatch(event: Event, careerProfile: CareerProfile): number {
    const seniority = careerProfile.seniority || 'mid-level';
    const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();

    const seniorityMatches: Record<string, { keywords: string[], eventTypes: string[], score: number }> = {
      'junior': {
        keywords: ['beginner', 'introduction', 'fundamentals', 'basics', 'getting started', 'entry level'],
        eventTypes: ['workshop', 'training', 'course'],
        score: 85
      },
      'mid-level': {
        keywords: ['intermediate', 'advanced', 'professional', 'practical', 'real-world', 'hands-on'],
        eventTypes: ['workshop', 'conference', 'training'],
        score: 80
      },
      'senior': {
        keywords: ['advanced', 'expert', 'leadership', 'architecture', 'strategy', 'senior', 'principal'],
        eventTypes: ['conference', 'workshop', 'networking'],
        score: 75
      },
      'executive': {
        keywords: ['leadership', 'strategy', 'management', 'executive', 'c-level', 'vision', 'transformation'],
        eventTypes: ['conference', 'networking', 'social'],
        score: 70
      }
    };

    const match = seniorityMatches[seniority];
    if (!match) return 50;

    let score = match.score;

    const keywordMatches = match.keywords.filter(keyword => eventText.includes(keyword));
    if (keywordMatches.length > 0) {
      score += Math.min(keywordMatches.length * 5, 20);
    }

    const rawTypeSeniority = (event.category?.name || '').toLowerCase();
    const canonicalSeniority = normalizeEventType(rawTypeSeniority);
    if (match.eventTypes.includes(canonicalSeniority) || match.eventTypes.includes(rawTypeSeniority)) {
      score += 10;
    }

    // Adjust for mismatched seniority indicators
    const otherSeniorities = Object.keys(seniorityMatches).filter(s => s !== seniority);
    for (const otherSeniority of otherSeniorities) {
      const otherMatch = seniorityMatches[otherSeniority];
      const otherKeywordMatches = otherMatch.keywords.filter(keyword => eventText.includes(keyword));
      if (otherKeywordMatches.length > keywordMatches.length) {
        score -= 15;
      }
    }

    return Math.min(Math.max(score, 20), 100);
  }

  private calculateCareerGoalsMatch(event: Event, careerProfile: CareerProfile): number {
    const goals = careerProfile.careerGoals || [];
    if (goals.length === 0) return 50;

    const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
    let score = 0;
    let totalWeight = 0;

    const goalKeywords: Record<string, string[]> = {
      'skill-development': ['learn', 'skill', 'training', 'workshop', 'course', 'certification'],
      'career-advancement': ['career', 'advancement', 'promotion', 'leadership', 'management'],
      'networking': ['network', 'connect', 'meet', 'community', 'industry'],
      'industry-knowledge': ['industry', 'trends', 'market', 'sector', 'domain'],
      'leadership-growth': ['leadership', 'management', 'team', 'strategy', 'vision']
    };

    for (const goal of goals) {
      const keywords = goalKeywords[goal] || [];
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

  private calculateLearningStyleMatch(event: Event, careerProfile: CareerProfile): number {
    const learningStyles = careerProfile.learningStyle || [];
    if (learningStyles.length === 0) return 60;

    const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
    let score = 0;

    if (learningStyles.includes('hands-on')) {
      const handsOnKeywords = ['hands-on', 'practical', 'workshop', 'lab', 'exercise', 'coding'];
      const hasHandsOn = handsOnKeywords.some(keyword => eventText.includes(keyword));
      score += hasHandsOn ? 40 : 20;
    }

    if (learningStyles.includes('theoretical')) {
      const theoreticalKeywords = ['presentation', 'demo', 'visual', 'chart', 'diagram', 'showcase', 'lecture'];
      const hasTheoretical = theoreticalKeywords.some(keyword => eventText.includes(keyword));
      score += hasTheoretical ? 40 : 20;
    }

    if (learningStyles.includes('interactive')) {
      const interactiveKeywords = ['interactive', 'discussion', 'q&a', 'panel', 'workshop'];
      const hasInteractive = interactiveKeywords.some(keyword => eventText.includes(keyword));
      score += hasInteractive ? 40 : 20;
    }

    return Math.min(score, 100);
  }

  // =================================================================
  // NETWORKING VALUE COMPONENT
  // =================================================================

  private calculateNetworkingValueScore(
    event: Event,
    careerProfile: CareerProfile
  ): ComponentScore {
    let score = 0;
    let explanation = '';
    let confidence = 0.3;
    const details: Record<string, unknown> = {};

    // 1. Speaker Quality Analysis (40% of score)
    const speakerScore = this.analyzeSpeakerQuality(event, careerProfile);
    score += (speakerScore * 0.4);
    details.speakerScore = speakerScore;

    if (speakerScore >= 80) {
      explanation += 'High-quality speakers with industry expertise';
      confidence += 0.2;
    } else if (speakerScore >= 60) {
      explanation += 'Good speaker lineup';
      confidence += 0.1;
    } else {
      explanation += 'Limited speaker information available';
    }

    // 2. Networking Opportunities (30% of score)
    const networkingScore = this.analyzeNetworkingOpportunities(event);
    score += (networkingScore * 0.3);
    details.networkingScore = networkingScore;

    if (networkingScore >= 80) {
      explanation += '. Excellent networking opportunities';
      confidence += 0.15;
    } else if (networkingScore >= 60) {
      explanation += '. Good networking potential';
      confidence += 0.1;
    } else {
      explanation += '. Limited networking opportunities';
    }

    // 3. Industry Alignment (20% of score)
    const industryScore = this.analyzeIndustryNetworking(event, careerProfile);
    score += (industryScore * 0.2);
    details.industryScore = industryScore;

    // 4. Event Scale & Prestige (10% of score)
    const scaleScore = this.analyzeEventScale(event);
    score += (scaleScore * 0.1);
    details.scaleScore = scaleScore;

    // 5. Goal-specific boosts (bounded)
    const goalBoost = this.applyNetworkingGoalBoosts(event, careerProfile);
    score += goalBoost;

    // Cap score at 100
    score = Math.min(score, 100);
    confidence = Math.min(confidence, 1.0);

    return {
      score: this.roundScore(score),
      maxScore: 100,
      explanation: explanation || 'Networking value analysis completed',
      confidence,
      details
    };
  }

  private analyzeSpeakerQuality(event: Event, careerProfile: CareerProfile): number {
    const speakers = event.speakerLineup || [];
    if (speakers.length === 0) return 30;

    let score = 0;
    const industry = careerProfile.industry?.toLowerCase() || '';
    const seniority = careerProfile.seniority || 'mid-level';

    for (const speaker of speakers) {
      let speakerScore = 50;

      const title = speaker.title?.toLowerCase() || '';
      const company = speaker.company?.toLowerCase() || '';

      if (title.includes('ceo') || title.includes('cto') || title.includes('vp') ||
          title.includes('director') || title.includes('head')) {
        speakerScore += 25;
      }
      else if (title.includes('senior') || title.includes('principal') ||
               title.includes('architect') || title.includes('lead')) {
        speakerScore += 20;
      }
      else if (title.includes('engineer') || title.includes('developer') ||
               title.includes('manager') || title.includes('analyst')) {
        speakerScore += 15;
      }

      const prestigiousCompanies = ['google', 'microsoft', 'amazon', 'apple', 'meta', 'netflix', 'uber', 'airbnb'];
      if (prestigiousCompanies.some(prestigious => company.includes(prestigious))) {
        speakerScore += 20;
      }

      if (industry && (title.includes(industry) || company.includes(industry))) {
        speakerScore += 15;
      }

      if ((seniority === 'senior' && title.includes('senior')) ||
          (seniority === 'junior' && !title.includes('senior') && !title.includes('lead'))) {
        speakerScore += 10;
      }

      score += Math.min(speakerScore, 100);
    }

    const averaged = score / speakers.length;
    // Senior presence bonus (small, additive, bounded) applied after averaging
    const seniorBonus = hasSeniorSpeaker(speakers) ? 10 : 0;
    return Math.min(averaged + seniorBonus, 100);
  }

  private analyzeNetworkingOpportunities(event: Event): number {
    let score = 40;
    const rawType = (event.category?.name || '').toLowerCase();
    const canonical = normalizeEventType(rawType);
    const networkingBase: Record<string, number> = {
      conference: 90,
      meetup: 85,
      workshop: 60,
      webinar: 20,
    };
    if (canonical in networkingBase) {
      score = Math.max(score, networkingBase[canonical]);
    } else if (rawType.includes('social')) {
      score = Math.max(score, 80);
    } else if (rawType.includes('training') || rawType.includes('course')) {
      score = Math.max(score, 50);
    }

    const attendeeCount = event.attendeeCount || 0;
    if (attendeeCount >= 50 && attendeeCount <= 200) {
      score += 15;
    } else if (attendeeCount >= 20 && attendeeCount < 50) {
      score += 10;
    } else if (attendeeCount > 200 && attendeeCount <= 500) {
      score += 5;
    } else if (attendeeCount > 500) {
      score -= 10;
    }

    if (event.title?.toLowerCase().includes('network') ||
        event.description?.toLowerCase().includes('network')) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private applyNetworkingGoalBoosts(event: Event, careerProfile: CareerProfile): number {
    const goals = careerProfile.networkingGoals || [];
    if (!goals.length) return 0;

    const rawType = (event.category?.name || '').toLowerCase();
    const canonical = normalizeEventType(rawType);
    const speakers = event.speakerLineup || [];
    const attendees = event.attendeeCount || 0;
    const description = (event.description || '').toLowerCase();

    let boost = 0;

    for (const goal of goals) {
      switch (goal) {
        case 'find-mentors': {
          if (hasSeniorSpeaker(speakers)) boost += 12;
          if (['summit', 'executive', 'leadership'].some(t => rawType.includes(t))) boost += 8;
          break;
        }
        case 'find-peers': {
          if (canonical === 'meetup') boost += 12;
          if (attendees >= 50 && attendees <= 200) boost += 10;
          else if (attendees > 200 && attendees <= 500) boost += 6;
          // Small alignment nudge for meetups in a narrower sweet spot
          if (canonical === 'meetup') {
            if (attendees >= 30 && attendees <= 80) boost += 2; // intimate groups
            else if (attendees > 80 && attendees <= 150) boost += 1; // still conducive
          }
          break;
        }
        case 'find-collaborators': {
          if (canonical === 'workshop' || rawType.includes('project')) boost += 15; // hackathon/bootcamp alias → workshop
          if (description.includes('team') || description.includes('collaborate')) boost += 6;
          break;
        }
        case 'find-employers': {
          if (['career', 'fair', 'recruiting', 'hiring', 'job'].some(t => rawType.includes(t))) boost += 16;
          if (description.includes('hiring') || description.includes('recruiting')) boost += 8;
          break;
        }
        case 'industry-insights': {
          if (canonical === 'conference' || rawType.includes('summit') || rawType.includes('panel')) boost += 12;
          if (speakers.length >= 3) boost += 6;
          break;
        }
        case 'thought-leadership': {
          if (canonical === 'conference' || rawType.includes('summit')) boost += 12;
          if (description.includes('call for speakers') || description.includes('speaking opportunity')) boost += 10;
          break;
        }
        default:
          break;
      }
    }

    return boost;
  }

  private analyzeIndustryNetworking(event: Event, careerProfile: CareerProfile): number {
    const industry = careerProfile.industry?.toLowerCase() || '';
    if (!industry) return 60;

    const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();

    const industryKeywords: Record<string, string[]> = {
      'technology': ['tech', 'software', 'digital', 'innovation', 'startup', 'ai', 'ml'],
      'finance': ['finance', 'fintech', 'banking', 'investment', 'trading', 'crypto'],
      'healthcare': ['healthcare', 'medical', 'pharma', 'biotech', 'clinical'],
      'education': ['education', 'edtech', 'learning', 'training', 'academic'],
      'retail': ['retail', 'ecommerce', 'consumer', 'shopping', 'marketplace']
    };

    const keywords = industryKeywords[industry] || [];
    let score = 50;

    for (const keyword of keywords) {
      if (eventText.includes(keyword)) {
        score += 10;
      }
    }

    const speakers = event.speakerLineup || [];
    for (const speaker of speakers) {
      const company = speaker.company?.toLowerCase() || '';
      if (company.includes(industry)) {
        score += 15;
      }
    }

    return Math.min(score, 100);
  }

  private analyzeEventScale(event: Event): number {
    let score = 50;

    const attendeeCount = event.attendeeCount || 0;
    if (attendeeCount >= 1000) {
      score += 30;
    } else if (attendeeCount >= 500) {
      score += 20;
    } else if (attendeeCount >= 100) {
      score += 10;
    }

    const organizer = event.organizer?.toLowerCase() || '';
    const prestigiousOrganizers = ['google', 'microsoft', 'aws', 'oracle', 'salesforce', 'adobe'];
    if (prestigiousOrganizers.some(prestigious => organizer.includes(prestigious))) {
      score += 20;
    }

    if (event.startTime && event.endTime) {
      const duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
      const days = duration / (1000 * 60 * 60 * 24);
      if (days >= 2) {
        score += 15;
      } else if (days >= 1) {
        score += 10;
      }
    }

    return Math.min(score, 100);
  }

  // =================================================================
  // INDUSTRY RELEVANCE COMPONENT
  // =================================================================

  private calculateIndustryRelevanceScore(
    event: Event,
    careerProfile: CareerProfile
  ): ComponentScore {
    let score = 0;
    let explanation = "";
    let confidence = 0.3;
    const details: Record<string, unknown> = {};

    // 1. Industry Alignment (60% of score)
    const industryScore = this.calculateIndustryAlignment(event, careerProfile);
    score += (industryScore * 0.6);
    details.industryScore = industryScore;

    if (industryScore >= 80) {
      explanation += "Strong alignment with your industry";
      confidence += 0.2;
    } else if (industryScore >= 60) {
      explanation += "Good industry relevance";
      confidence += 0.1;
    } else {
      explanation += "Limited industry alignment";
    }

    // 2. Sector Trends & Innovation (25% of score)
    const trendsScore = this.analyzeSectorTrends(event);
    score += (trendsScore * 0.25);
    details.trendsScore = trendsScore;

    if (trendsScore >= 80) {
      explanation += ". Covers cutting-edge industry trends";
      confidence += 0.15;
    } else if (trendsScore >= 60) {
      explanation += ". Addresses current industry developments";
      confidence += 0.1;
    } else {
      explanation += ". Limited focus on industry trends";
    }

    // 3. Market Relevance (15% of score)
    const marketScore = this.analyzeMarketRelevance(event, careerProfile);
    score += (marketScore * 0.15);
    details.marketScore = marketScore;

    // Cap score at 100
    score = Math.min(score, 100);
    confidence = Math.min(confidence, 1.0);

    return {
      score: this.roundScore(score),
      maxScore: 100,
      explanation: explanation || "Industry relevance analysis completed",
      confidence,
      details
    };
  }

  private calculateIndustryAlignment(event: Event, careerProfile: CareerProfile): number {
    const industry = careerProfile.industry?.toLowerCase() || "";
    if (!industry) return 50;

    const eventText = `${event.title || ""} ${event.description || ""}`.toLowerCase();
    const rawType = (event.category?.name || '').toLowerCase();
    const canonicalType = normalizeEventType(rawType);

    const industryMappings: Record<string, { keywords: string[], score: number }> = {
      "technology": {
        keywords: ["tech", "software", "digital", "innovation", "startup", "ai", "ml", "cloud", "devops"],
        score: 85
      },
      "finance": {
        keywords: ["finance", "fintech", "banking", "investment", "trading", "crypto", "blockchain"],
        score: 80
      },
      "healthcare": {
        keywords: ["healthcare", "medical", "pharma", "biotech", "clinical", "health", "wellness"],
        score: 75
      },
      "education": {
        keywords: ["education", "edtech", "learning", "training", "academic", "pedagogy", "teaching"],
        score: 80
      },
      "retail": {
        keywords: ["retail", "ecommerce", "consumer", "shopping", "marketplace", "commerce"],
        score: 70
      }
    };

    const mapping = industryMappings[industry];
    if (!mapping) return 50;

    let score = mapping.score;
    let matchCount = 0;

    for (const keyword of mapping.keywords) {
      if (eventText.includes(keyword)) {
        matchCount++;
        score += 5;
      }
    }

    const speakers = event.speakerLineup || [];
    for (const speaker of speakers) {
      const company = speaker.company?.toLowerCase() || "";
      if (company.includes(industry)) {
        score += 10;
        matchCount++;
      }
    }

    // Modest, non-overlapping boost when industry keywords co-occur with
    // role-relevant canonical event types. Avoid double-counting by keeping
    // this small and bounded.
    if (matchCount >= 1) {
      if (canonicalType === 'workshop' || canonicalType === 'conference') {
        score += 5;
      } else if (canonicalType === 'meetup') {
        score += 3;
      }
    }

    if (matchCount >= 3) score += 15;
    else if (matchCount >= 2) score += 10;
    else if (matchCount >= 1) score += 5;

    return Math.min(score, 100);
  }

  private analyzeSectorTrends(event: Event): number {
    const eventText = `${event.title || ""} ${event.description || ""}`.toLowerCase();
    let score = 50;

    const trendKeywords = [
      "trend", "innovation", "future", "emerging", "disruption", "transformation",
      "digital", "automation", "ai", "machine learning", "blockchain", "iot",
      "sustainability", "green", "renewable", "remote", "hybrid", "virtual"
    ];

    let trendMatches = 0;
    for (const keyword of trendKeywords) {
      if (eventText.includes(keyword)) {
        trendMatches++;
      }
    }

    if (trendMatches >= 5) score += 30;
    else if (trendMatches >= 3) score += 20;
    else if (trendMatches >= 1) score += 10;

    return Math.min(score, 100);
  }

  private analyzeMarketRelevance(event: Event, careerProfile: CareerProfile): number {
    let score = 60;

    const companySize = careerProfile.companySize;
    const attendeeCount = event.attendeeCount || 0;

    if (companySize === "startup" && attendeeCount < 100) {
      score += 15;
    } else if (companySize === "large" && attendeeCount > 500) {
      score += 15;
    } else if (companySize === "medium" && attendeeCount >= 100 && attendeeCount <= 500) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  // =================================================================
  // TIMING BONUS COMPONENT
  // =================================================================

  private calculateTimingBonusScore(
    event: Event,
    careerProfile: CareerProfile
  ): ComponentScore {
    let score = 0;
    let explanation = "";
    let confidence = 0.3;
    const details: Record<string, unknown> = {};

    // 1. Career Timing Analysis (50% of score)
    const timingScore = this.analyzeCareerTiming(event, careerProfile);
    score += (timingScore * 0.5);
    details.timingScore = timingScore;

    if (timingScore >= 80) {
      explanation += "Perfect timing for your career stage";
      confidence += 0.2;
    } else if (timingScore >= 60) {
      explanation += "Good timing for career development";
      confidence += 0.1;
    } else {
      explanation += "Suboptimal timing for career advancement";
    }

    // 2. Seasonal & Market Timing (30% of score)
    const seasonalScore = this.analyzeSeasonalTiming(event);
    score += (seasonalScore * 0.3);
    details.seasonalScore = seasonalScore;

    if (seasonalScore >= 80) {
      explanation += ". Excellent seasonal timing";
      confidence += 0.15;
    } else if (seasonalScore >= 60) {
      explanation += ". Good seasonal alignment";
      confidence += 0.1;
    } else {
      explanation += ". Limited seasonal advantage";
    }

    // 3. Personal Schedule Alignment (20% of score)
    const scheduleScore = this.analyzeScheduleAlignment(event, careerProfile);
    score += (scheduleScore * 0.2);
    details.scheduleScore = scheduleScore;

    // Cap score at 100
    score = Math.min(score, 100);
    confidence = Math.min(confidence, 1.0);

    return {
      score: this.roundScore(score),
      maxScore: 100,
      explanation: explanation || "Timing analysis completed",
      confidence,
      details
    };
  }

  private analyzeCareerTiming(event: Event, careerProfile: CareerProfile): number {
    const seniority = careerProfile.seniority || "mid-level";
    const timeframe = careerProfile.timeframe || "medium-term";
    const goals = careerProfile.careerGoals || [];

    let score = 60;

    if (seniority === "junior") {
      const skillKeywords = ["learn", "training", "workshop", "course", "fundamentals"];
      const hasSkillContent = skillKeywords.some(keyword =>
        (event.title + event.description).toLowerCase().includes(keyword)
      );
      if (hasSkillContent) score += 25;
    } else if (seniority === "senior") {
      const leadershipKeywords = ["leadership", "strategy", "management", "executive"];
      const hasLeadershipContent = leadershipKeywords.some(keyword =>
        (event.title + event.description).toLowerCase().includes(keyword)
      );
      if (hasLeadershipContent) score += 25;
    }

    if (timeframe === "short-term" && goals.includes("skill-development")) {
      const skillKeywords = ["bootcamp", "intensive", "accelerated", "quick"];
      const hasQuickSkillContent = skillKeywords.some(keyword =>
        (event.title + event.description).toLowerCase().includes(keyword)
      );
      if (hasQuickSkillContent) score += 15;
    }

    return Math.min(score, 100);
  }

  private analyzeSeasonalTiming(event: Event): number {
    if (!event.startTime) return 50;

    const eventDate = new Date(event.startTime);
    const month = eventDate.getMonth();
    let score = 60;

    if (month >= 0 && month <= 2) {
      score += 15;
    }
    else if (month >= 9 && month <= 11) {
      score += 10;
    }
    else if (month >= 5 && month <= 7) {
      score += 5;
    }

    if (month === 11 || month === 0) {
      score -= 5;
    }

    return Math.min(score, 100);
  }

  private analyzeScheduleAlignment(event: Event, careerProfile: CareerProfile): number {
    const availableTime = careerProfile.availableTime || "moderate";
    let score = 60;

    const hours = this.estimateDurationHours(event);

    if (availableTime === "limited") {
      if (hours <= 2) score += 20;
      else if (hours <= 4) score += 10;
      else score -= 10;
    } else if (availableTime === "flexible") {
      if (hours >= 4) score += 15;
      else score += 5;
    } else {
      if (hours >= 2 && hours <= 6) score += 15;
      else if (hours <= 2) score += 5;
      else score -= 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Estimate event duration in hours using fallback order:
   * 1) endTime - startTime
   * 2) isMultiDay flag (assume 8h/day baseline)
   * 3) dailySchedule fields (dailyStart/dailyEnd or first schedule entry)
   * 4) default 2 hours
   */
  private estimateDurationHours(event: Event): number {
    try {
      if (event.startTime && event.endTime) {
        const durationMs = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
        if (Number.isFinite(durationMs) && durationMs > 0) {
          return durationMs / (1000 * 60 * 60);
        }
      }

      const anyEvent = event as unknown as {
        isMultiDay?: boolean;
        dailySchedule?: {
          dailyStart?: string;
          dailyEnd?: string;
          schedule?: Array<{ start: string; end: string; date?: string }>;
        };
      };

      if (anyEvent.isMultiDay === true) {
        return 8; // assume full-day baseline for multi-day events
      }

      const ds = anyEvent.dailySchedule;
      if (ds) {
        // Prefer explicit dailyStart/dailyEnd if present
        if (ds.dailyStart && ds.dailyEnd) {
          const hours = this.hoursBetween(ds.dailyStart, ds.dailyEnd, event.startTime);
          if (hours > 0) return hours;
        }
        // Otherwise use first scheduled block
        const first = Array.isArray(ds.schedule) && ds.schedule.length > 0 ? ds.schedule[0] : undefined;
        if (first?.start && first?.end) {
          const hours = this.hoursBetween(first.start, first.end, first.date || event.startTime);
          if (hours > 0) return hours;
        }
      }
    } catch {
      // ignore and fall through to default
    }

    return 2; // sensible default
  }

  /**
   * Calculate hours between two time strings. Accepts ISO or HH:mm.
   */
  private hoursBetween(start: string, end: string, base?: string): number {
    const startDate = this.parseTimeToDate(start, base);
    const endDate = this.parseTimeToDate(end, base);
    const diff = endDate.getTime() - startDate.getTime();
    return diff > 0 ? diff / (1000 * 60 * 60) : 0;
  }

  private parseTimeToDate(time: string, base?: string): Date {
    if (time.includes('T')) {
      return new Date(time);
    }
    // HH:mm case - attach to base date (or today)
    const baseDate = base ? new Date(base) : new Date();
    const [hh, mm] = time.split(':').map((s) => parseInt(s, 10));
    const d = new Date(baseDate);
    d.setHours(Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
    return d;
  }

  // =================================================================
  // CONFIDENCE AND EXPLANATION GENERATION
  // =================================================================

  private calculateOverallConfidence(
    event: Event,
    careerProfile: CareerProfile,
    _componentScores: Record<string, ComponentScore>
  ): number {
    let confidence = 0.3;

    let dataCompleteness = 0;
    if (event.title && event.description) dataCompleteness += 0.3;
    if (event.speakerLineup && event.speakerLineup.length > 0) dataCompleteness += 0.2;
    if (event.startTime && event.endTime) dataCompleteness += 0.2;
    if (event.priceRange) dataCompleteness += 0.1;
    if (event.attendeeCount) dataCompleteness += 0.1;
    if (event.prerequisites) dataCompleteness += 0.1;

    let profileCompleteness = 0;
    if (careerProfile.primarySkills && careerProfile.primarySkills.length > 0) profileCompleteness += 0.2;
    if (careerProfile.skillsToLearn && careerProfile.skillsToLearn.length > 0) profileCompleteness += 0.2;
    if (careerProfile.careerGoals && careerProfile.careerGoals.length > 0) profileCompleteness += 0.2;
    if (careerProfile.industry) profileCompleteness += 0.2;
    if (careerProfile.seniority) profileCompleteness += 0.1;
    if (careerProfile.timeframe) profileCompleteness += 0.1;

    let eventDetailLevel = 0;
    const descriptionLength = (event.description || '').length;
    if (descriptionLength > 500) eventDetailLevel += 0.3;
    else if (descriptionLength > 200) eventDetailLevel += 0.2;
    else if (descriptionLength > 50) eventDetailLevel += 0.1;

    if (event.agendaUrl) eventDetailLevel += 0.2;
    if (event.prerequisites) eventDetailLevel += 0.2;
    if (event.targetAudience) eventDetailLevel += 0.1;
    if (event.difficulty) eventDetailLevel += 0.1;
    if (event.speakerLineup && event.speakerLineup.length > 2) eventDetailLevel += 0.1;

    confidence += dataCompleteness * this.config.confidenceFactors.dataCompleteness;
    confidence += profileCompleteness * this.config.confidenceFactors.profileCompleteness;
    confidence += eventDetailLevel * this.config.confidenceFactors.eventDetailLevel;

    return Math.min(confidence, 1.0);
  }

  private determineImpactCategory(overallScore: number): 'transformative' | 'high' | 'moderate' | 'low' {
    if (overallScore >= this.config.thresholds.highImpact) return 'high';
    if (overallScore >= this.config.thresholds.moderateImpact) return 'moderate';
    if (overallScore >= this.config.thresholds.lowImpact) return 'low';
    return 'low';
  }

  private generateExplanation(
    componentScores: Record<string, ComponentScore>,
    careerProfile: CareerProfile
  ): CareerImpactScore['explanation'] {
    const reasons: string[] = [];
    const matchedSkills: string[] = [];
    const speakerHighlights: string[] = [];
    const confidenceFactors: string[] = [];

    for (const [component, score] of Object.entries(componentScores)) {
      if (score.score >= 80) {
        switch (component) {
          case 'skillRelevance':
            reasons.push('Excellent skill development opportunity');
            break;
          case 'careerStageMatch':
            reasons.push('Perfect match for your career stage');
            break;
          case 'networkingValue':
            reasons.push('High-value networking potential');
            break;
          case 'industryRelevance':
            reasons.push('Strong industry alignment');
            break;
          case 'timingBonus':
            reasons.push('Optimal timing for career growth');
            break;
        }
      }
    }

    const skillMatchScore = componentScores.skillRelevance?.details?.skillMatchScore as number;
    if (skillMatchScore && skillMatchScore >= 80) {
      const primarySkills = careerProfile.primarySkills || [];
      const skillsToLearn = careerProfile.skillsToLearn || [];
      matchedSkills.push(...primarySkills.slice(0, 3), ...skillsToLearn.slice(0, 2));
    }

    const speakerScore = componentScores.networkingValue?.details?.speakerScore as number;
    if (speakerScore && speakerScore >= 80) {
      speakerHighlights.push('Industry experts and thought leaders');
    }

    if (careerProfile.primarySkills && careerProfile.primarySkills.length >= 3) {
      confidenceFactors.push('Comprehensive skill profile available');
    }
    if (careerProfile.careerGoals && careerProfile.careerGoals.length >= 2) {
      confidenceFactors.push('Clear career objectives defined');
    }

    return {
      reasons: reasons.length > 0 ? reasons : ['Standard career development opportunity'],
      matchedSkills: matchedSkills.slice(0, 5),
      speakerHighlights: speakerHighlights.length > 0 ? speakerHighlights : ['Quality speakers expected'],
      careerImpactCategory: this.determineImpactCategory(
        Object.values(componentScores).reduce((sum, score) => sum + score.score, 0) / Object.keys(componentScores).length
      ),
      confidenceFactors: confidenceFactors.length > 0 ? confidenceFactors : ['Standard confidence level']
    };
  }

  private generateEventHash(event: Event): string {
    const eventData = {
      title: event.title,
      category: event.category?.name,
      speakers: event.speakerLineup?.length || 0,
      attendees: event.attendeeCount || 0
    };
    return btoa(JSON.stringify(eventData)).substring(0, 16);
  }
}
