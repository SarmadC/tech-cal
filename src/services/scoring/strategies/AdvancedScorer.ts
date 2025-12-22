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
} from '@/types/careerImpact';
import { BaseScoringStrategy } from '../ScoringStrategy';
import { CareerImpactCache } from '@/services/cache/careerImpactCache';
import { BehavioralBoostService } from '@/services/behavioralBoostService';
import { calculateTypePreferenceScore, normalizeEventType } from '@/utils/eventTypeUtils';
import * as Sentry from '@sentry/nextjs';
import { AnalyticsService } from '@/services/analyticsService';
import { toBase64 } from '@/utils/base64';
import {
  ADVANCED_SCORER_CONFIG,
  SCORE_THRESHOLDS,
  CONFIDENCE_BOOSTS,
  EVENT_TYPE_SCORES,
  DEFAULT_EVENT_TYPE_SCORE,
} from '@/config/scoringConfig';

// Import extracted scoring utilities
import {
  calculateSkillMatchingScore,
  analyzeContentDepth,
  analyzeLearningFormat,
} from '@/lib/scoring/skillScoringUtils';
import {
  calculateSeniorityMatch,
  calculateCareerGoalsMatch,
  calculateLearningStyleMatch,
} from '@/lib/scoring/careerStageScoringUtils';
import {
  analyzeSpeakerQuality,
  analyzeNetworkingOpportunities,
  applyNetworkingGoalBoosts,
  analyzeIndustryNetworking,
  analyzeEventScale,
} from '@/lib/scoring/networkingScoringUtils';

export class AdvancedScorer extends BaseScoringStrategy {
  readonly version = 'v2.0.0';
  readonly name = 'Advanced Scorer';

  // Use centralized config from scoringConfig.ts
  private readonly config = ADVANCED_SCORER_CONFIG;

  /**
   * Get the algorithm configuration
   */
  getConfig(): typeof ADVANCED_SCORER_CONFIG {
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

    if (score >= SCORE_THRESHOLDS.HIGH) {
      updatedExplanation += highMessage;
      updatedConfidence += CONFIDENCE_BOOSTS.HIGH;
    } else if (score >= SCORE_THRESHOLDS.MODERATE) {
      updatedExplanation += moderateMessage;
      updatedConfidence += CONFIDENCE_BOOSTS.LOW;
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
    // Event type scores are imported from @/config/scoringConfig

    const rawEventType = (event.category?.name || '').toLowerCase();
    const canonicalEventType = normalizeEventType(rawEventType);
    const eventTypeKey = canonicalEventType || rawEventType || 'unknown';
    const eventTypeScore = EVENT_TYPE_SCORES[eventTypeKey] || EVENT_TYPE_SCORES[rawEventType] || DEFAULT_EVENT_TYPE_SCORE;
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

    // 2. Skill Matching Analysis (35% of score) - Uses extracted utility
    const skillMatchScore = calculateSkillMatchingScore(event, careerProfile, scoringTriggers, appliedAdjustments);

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

    // 3. Content Depth Analysis (10% of score) - Uses extracted utility
    const contentScore = analyzeContentDepth(event);

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

    // 4. Learning Format Analysis (10% of score) - Uses extracted utility
    const formatScore = analyzeLearningFormat(event);

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

  // Skill scoring methods now use extracted utilities from @/lib/scoring/skillScoringUtils
  // Removed: calculateKeywordMatchScore, calculateBeginnerBoost, analyzeContentDepth, analyzeLearningFormat

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

    // 1. Seniority Level Matching (50% of score) - Uses extracted utility
    const seniorityScore = calculateSeniorityMatch(event, careerProfile);
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

    // 2. Career Goals Alignment (30% of score) - Uses extracted utility
    const goalsScore = calculateCareerGoalsMatch(event, careerProfile);
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

    // 3. Learning Style Match (20% of score) - Uses extracted utility
    const learningScore = calculateLearningStyleMatch(event, careerProfile);
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
  // Career stage scoring methods now use extracted utilities from @/lib/scoring/careerStageScoringUtils
  // Removed: calculateSeniorityMatch, calculateCareerGoalsMatch, calculateLearningStyleMatch

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

    // 1. Speaker Quality Analysis (40% of score) - Uses extracted utility
    const speakerScore = analyzeSpeakerQuality(event, careerProfile);
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

    // 2. Networking Opportunities (30% of score) - Uses extracted utility
    const networkingScore = analyzeNetworkingOpportunities(event);
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

    // 3. Industry Alignment (20% of score) - Uses extracted utility
    const industryScore = analyzeIndustryNetworking(event, careerProfile);
    score += (industryScore * 0.2);
    details.industryScore = industryScore;

    // 4. Event Scale & Prestige (10% of score) - Uses extracted utility
    const scaleScore = analyzeEventScale(event);
    score += (scaleScore * 0.1);
    details.scaleScore = scaleScore;

    // 5. Goal-specific boosts (bounded) - Uses extracted utility
    const goalBoost = applyNetworkingGoalBoosts(event, careerProfile);
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
  // Networking scoring methods now use extracted utilities from @/lib/scoring/networkingScoringUtils
  // Removed: analyzeSpeakerQuality, analyzeNetworkingOpportunities, applyNetworkingGoalBoosts, 
  //          analyzeIndustryNetworking, analyzeEventScale

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
    return toBase64(JSON.stringify(eventData)).substring(0, 16);
  }
}
