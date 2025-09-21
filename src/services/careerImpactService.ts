import { Event, CareerImpactScore } from '@/types';
import { CareerProfile } from '@/types/career';
import {
  CareerImpactCalculationInput,
  CareerImpactCalculationOptions,
  ComponentScore,
  ScoringAlgorithmConfig,
  BatchCareerImpactInput,
  BatchCareerImpactResult,
  CareerImpactScoreLite
} from '@/types/careerImpact';
import { CareerImpactCache } from '@/services/cache/careerImpactCache';

export class CareerImpactService {
  static readonly EMPTY_COMPONENTS = {
    skillRelevance: 0,
    careerStageMatch: 0,
    networkingValue: 0,
    industryRelevance: 0,
    timingBonus: 0
  };

  /**
   * Create cached score explanation
   */
  private static createCachedExplanation(category: string) {
    return {
      careerImpactCategory: category as 'transformative' | 'high' | 'moderate' | 'low',
      reasons: [`Cached result for ${category} impact event`],
      matchedSkills: [],
      speakerHighlights: [],
      confidenceFactors: [`${Math.round(0.9 * 100)}% confidence`]
    };
  }

  private static readonly DEFAULT_CONFIG: ScoringAlgorithmConfig = {
    version: '2.0.0',
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

  // Consolidated scoring patterns to reduce duplication
  private static readonly SCORE_THRESHOLDS = {
    HIGH: 80,
    MODERATE: 60,
    LOW: 40
  } as const;

  private static readonly CONFIDENCE_BOOSTS = {
    HIGH: 0.2,
    MODERATE: 0.15,
    LOW: 0.1
  } as const;

  private static readonly EXPLANATION_PATTERNS = {
    HIGH: 'Excellent',
    MODERATE: 'Good', 
    LOW: 'Limited'
  } as const;

  /**
   * Consolidated helper for scoring pattern with confidence and explanation
   */
  private static applyScoreComponent(
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

  /**
   * Consolidated rounding helper for consistent score formatting
   */
  private static roundScore(score: number): number {
    return Math.round(score);
  }

  private static roundDecimal(score: number, decimals: number = 2): number {
    return Math.round(score * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Calculate career impact score with caching (async version)
   */
  static async calculateCareerImpactScoreAsync(
    input: CareerImpactCalculationInput,
    options: CareerImpactCalculationOptions = {}
  ): Promise<CareerImpactScore> {
    const { event, careerProfile } = input;

    try {
      // Generate cache key
      const profileHash = CareerImpactCache.generateProfileHash(careerProfile);

      // Try cache first
      const cached = await CareerImpactCache.get(event.id, profileHash);
      if (cached) {
        // Convert lite score to full score for compatibility
        return {
          overall: cached.overall,
          confidence: cached.confidence,
          components: this.EMPTY_COMPONENTS,
          explanation: this.createCachedExplanation(cached.category),
          metadata: {
            algorithmVersion: this.DEFAULT_CONFIG.version,
            calculatedAt: new Date().toISOString(),
            careerProfileHash: profileHash,
            eventDataHash: CareerImpactCache.generateEventHash(event)
          }
        };
      }
    } catch (error) {
      console.warn('Cache lookup failed, falling back to calculation:', error);
    }

    // Calculate and cache result
    const result = this.calculateCareerImpactScore(input, options);

    // Cache the lite version asynchronously
    const profileHash = CareerImpactCache.generateProfileHash(careerProfile);
    const lite: CareerImpactScoreLite = {
      overall: result.overall,
      confidence: result.confidence,
      category: result.explanation.careerImpactCategory
    };

    CareerImpactCache.set(event.id, profileHash, lite).catch(error => {
      console.warn('Cache set failed:', error);
    });

    return result;
  }

  /**
   * Get lightweight career impact score with caching (async version)
   */
  static async getCareerImpactScoreLiteAsync(
    input: CareerImpactCalculationInput,
    options: CareerImpactCalculationOptions = {}
  ): Promise<CareerImpactScoreLite> {
    const { event, careerProfile } = input;

    try {
      // Generate cache key
      const profileHash = CareerImpactCache.generateProfileHash(careerProfile);

      // Try cache first
      const cached = await CareerImpactCache.get(event.id, profileHash);
      if (cached) {
        return cached;
      }
    } catch (error) {
      console.warn('Cache lookup failed, falling back to calculation:', error);
    }

    // Calculate and cache result
    const result = this.getCareerImpactScoreLite(input, options);

    // Cache result asynchronously
    const profileHash = CareerImpactCache.generateProfileHash(careerProfile);
    CareerImpactCache.set(event.id, profileHash, result).catch(error => {
      console.warn('Cache set failed:', error);
    });

    return result;
  }

  /**
   * Calculate batch career impact scores for multiple events
   */
  static async calculateBatchCareerImpact(
    input: BatchCareerImpactInput,
    options: CareerImpactCalculationOptions = {}
  ): Promise<BatchCareerImpactResult> {
    // Use direct calculation for now (cache optimization will be added later)
    return this.calculateBatchCareerImpactDirect(input, options);
  }

  /**
   * Direct batch calculation without caching (fallback method)
   */
  private static calculateBatchCareerImpactDirect(
    input: BatchCareerImpactInput,
    options: CareerImpactCalculationOptions = {}
  ): BatchCareerImpactResult {
    const startTime = Date.now();
    const results = new Map<string, CareerImpactScore>();
    const errors: Array<{ eventId: string; error: string }> = [];

    for (const event of input.events) {
      try {
        const score = this.calculateCareerImpactScore(
          { event, careerProfile: input.careerProfile },
          options
        );
        results.set(event.id, score);
      } catch (error) {
        errors.push({
          eventId: event.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const endTime = Date.now();

    return {
      scores: results,
      errors,
      stats: {
        totalEvents: input.events.length,
        successfulCalculations: results.size,
        cachedScores: 0,
        newCalculations: results.size,
        processingTimeMs: endTime - startTime
      }
    };
  }

  /**
   * Cache invalidation methods for when data changes
   */
  static async invalidateProfileCache(careerProfile: CareerProfile): Promise<number> {
    try {
      const profileHash = CareerImpactCache.generateProfileHash(careerProfile);
      return await CareerImpactCache.invalidateProfile(profileHash);
    } catch (error) {
      console.warn('Profile cache invalidation failed:', error);
      return 0;
    }
  }

  static async invalidateEventCache(eventId: string): Promise<number> {
    try {
      return await CareerImpactCache.invalidateEvent(eventId);
    } catch (error) {
      console.warn('Event cache invalidation failed:', error);
      return 0;
    }
  }

  static async invalidateAllCache(): Promise<number> {
    try {
      return await CareerImpactCache.invalidateAll();
    } catch (error) {
      console.warn('Full cache invalidation failed:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  static async getCacheStats() {
    try {
      return await CareerImpactCache.getStats();
    } catch (error) {
      console.warn('Cache stats retrieval failed:', error);
      return { hits: 0, misses: 0, totalRequests: 0, hitRate: 0, lastReset: new Date().toISOString() };
    }
  }

  /**
   * Get lightweight career impact score (essential data only)
   */
  static getCareerImpactScoreLite(
    input: CareerImpactCalculationInput,
    options: CareerImpactCalculationOptions = {}
  ): CareerImpactScoreLite {
    const fullScore = CareerImpactService.calculateCareerImpactScore(input, options);
    
    return {
      overall: fullScore.overall,
      confidence: fullScore.confidence,
      category: fullScore.explanation.careerImpactCategory
    };
  }

  /**
   * Calculate career impact score for an event
   */
  static calculateCareerImpactScore(
    input: CareerImpactCalculationInput,
    options: CareerImpactCalculationOptions = {}
  ): CareerImpactScore {
    const { event, careerProfile } = input;
    const config = options.algorithmVersion 
      ? { ...CareerImpactService.DEFAULT_CONFIG, version: options.algorithmVersion }
      : CareerImpactService.DEFAULT_CONFIG;

    // Calculate component scores
    const componentScores = {
      skillRelevance: CareerImpactService.calculateSkillRelevanceScore(event, careerProfile, config),
      careerStageMatch: CareerImpactService.calculateCareerStageMatchScore(event, careerProfile, config),
      networkingValue: CareerImpactService.calculateNetworkingValueScore(event, careerProfile, config),
      industryRelevance: CareerImpactService.calculateIndustryRelevanceScore(event, careerProfile, config),
      timingBonus: CareerImpactService.calculateTimingBonusScore(event, careerProfile, config),
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
    const overallScore = Object.entries(rawComponents).reduce(
      (total, [key, score]) => total + (score * config.weights[key as keyof typeof config.weights]),
      0
    );

    // Calculate confidence based on component confidences and data completeness
    const confidence = CareerImpactService.calculateOverallConfidence(
      event,
      careerProfile,
      componentScores,
      config
    );

    // Generate explanation
    const explanation = CareerImpactService.generateExplanation(componentScores, config, careerProfile);

    // Determine impact category
    const category = CareerImpactService.determineImpactCategory(overallScore, config);

    return {
      overall: this.roundDecimal(overallScore),
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
        algorithmVersion: config.version,
        careerProfileHash: CareerImpactCache.generateProfileHash(careerProfile),
        eventDataHash: CareerImpactService.generateEventHash(event),
      },
    };
  }

  /**
   * Calculate skill relevance component score with advanced matching
   */
  private static calculateSkillRelevanceScore(
    event: Event, 
    careerProfile: CareerProfile, 
    _config: ScoringAlgorithmConfig
  ): ComponentScore {
    let score = 0;
    let explanation = '';
    let confidence = 0.3;
    const details: Record<string, unknown> = {};

    // 1. Event Type & Format Analysis (40% of score)
    const eventTypeScores: Record<string, number> = {
      'workshop': 95,      // Hands-on learning
      'training': 90,      // Structured skill building
      'course': 85,        // Comprehensive learning
      'conference': 75,    // Knowledge sharing
      'webinar': 70,       // Focused learning
      'meetup': 60,        // Community learning
      'networking': 35,    // Limited skill focus
      'social': 15,        // Minimal skill development
    };

    const eventTypeName = event.category?.name?.toLowerCase() || 'unknown';
    const eventTypeScore = eventTypeScores[eventTypeName] || 30;
    
    const eventTypeResult = this.applyScoreComponent(
      eventTypeScore,
      0.4,
      details,
      'eventTypeScore',
      explanation,
      confidence,
      `High skill development potential (${eventTypeName})`,
      `Moderate skill development (${eventTypeName})`,
      `Limited skill development (${eventTypeName})`
    );
    
    score += eventTypeResult.weightedScore;
    explanation = eventTypeResult.updatedExplanation;
    confidence = eventTypeResult.updatedConfidence;

    // 2. Skill Matching Analysis (35% of score)
    const skillMatchScore = this.calculateSkillMatchingScore(event, careerProfile);
    
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
    
    score += skillMatchResult.weightedScore;
    explanation = skillMatchResult.updatedExplanation;
    confidence = skillMatchResult.updatedConfidence;

    // 3. Content Depth Analysis (15% of score)
    const contentScore = this.analyzeContentDepth(event);
    
    const contentResult = this.applyScoreComponent(
      contentScore,
      0.15,
      details,
      'contentScore',
      explanation,
      confidence,
      '. Deep, comprehensive content',
      '. Moderate content depth',
      '. Basic content level'
    );
    
    score += contentResult.weightedScore;
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
    
    score += formatResult.weightedScore;
    explanation = formatResult.updatedExplanation;
    confidence = formatResult.updatedConfidence;

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

  /**
   * Calculate skill matching score between event and career profile
   */
  private static calculateSkillMatchingScore(event: Event, careerProfile: CareerProfile): number {
    const primarySkills = careerProfile.primarySkills || [];
    const skillsToLearn = careerProfile.skillsToLearn || [];
    const allRelevantSkills = [...primarySkills, ...skillsToLearn];

    if (allRelevantSkills.length === 0) return 50; // Neutral if no skills defined

    const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
    let matchCount = 0;
    let totalWeight = 0;

    // Check primary skills (weight: 1.0)
    for (const skill of primarySkills) {
      const weight = 1.0;
      totalWeight += weight;
      if (eventText.includes(skill.toLowerCase())) {
        matchCount += weight;
      }
    }

    // Check skills to learn (weight: 1.5 - higher priority)
    for (const skill of skillsToLearn) {
      const weight = 1.5;
      totalWeight += weight;
      if (eventText.includes(skill.toLowerCase())) {
        matchCount += weight;
      }
    }

    // Check for related technologies and frameworks
    const techKeywords = this.getTechnologyKeywords();
    for (const keyword of techKeywords) {
      if (eventText.includes(keyword)) {
        matchCount += 0.5; // Bonus for tech relevance
        totalWeight += 0.5;
      }
    }

    return totalWeight > 0 ? Math.min((matchCount / totalWeight) * 100, 100) : 50;
  }

  /**
   * Analyze content depth and quality
   */
  private static analyzeContentDepth(event: Event): number {
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

  /**
   * Analyze learning format effectiveness
   */
  private static analyzeLearningFormat(event: Event): number {
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
   * Get technology keywords for skill matching
   */
  private static getTechnologyKeywords(): string[] {
    return [
      'javascript', 'typescript', 'python', 'java', 'react', 'vue', 'angular',
      'node.js', 'express', 'django', 'flask', 'spring', 'docker', 'kubernetes',
      'aws', 'azure', 'gcp', 'sql', 'nosql', 'mongodb', 'postgresql',
      'git', 'ci/cd', 'devops', 'microservices', 'api', 'rest', 'graphql',
      'machine learning', 'ai', 'data science', 'analytics', 'blockchain'
    ];
  }

  /**
   * Calculate career stage match component score with seniority analysis
   */
  private static calculateCareerStageMatchScore(
    event: Event,
    careerProfile: CareerProfile,
    _config: ScoringAlgorithmConfig
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

  /**
   * Calculate seniority level matching
   */
  private static calculateSeniorityMatch(event: Event, careerProfile: CareerProfile): number {
    const seniority = careerProfile.seniority || 'mid-level';
    const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
    
    // Seniority-specific keywords and event types
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
    
    // Check for seniority-specific keywords
    const keywordMatches = match.keywords.filter(keyword => eventText.includes(keyword));
    if (keywordMatches.length > 0) {
      score += Math.min(keywordMatches.length * 5, 20);
    }

    // Check event type alignment
    const eventType = event.category?.name?.toLowerCase() || '';
    if (match.eventTypes.includes(eventType)) {
      score += 10;
    }

    // Adjust for mismatched seniority indicators
    const otherSeniorities = Object.keys(seniorityMatches).filter(s => s !== seniority);
    for (const otherSeniority of otherSeniorities) {
      const otherMatch = seniorityMatches[otherSeniority];
      const otherKeywordMatches = otherMatch.keywords.filter(keyword => eventText.includes(keyword));
      if (otherKeywordMatches.length > keywordMatches.length) {
        score -= 15; // Penalty for better match with different seniority
      }
    }

    return Math.min(Math.max(score, 20), 100);
  }

  /**
   * Calculate career goals alignment
   */
  private static calculateCareerGoalsMatch(event: Event, careerProfile: CareerProfile): number {
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

  /**
   * Calculate learning style match
   */
  private static calculateLearningStyleMatch(event: Event, careerProfile: CareerProfile): number {
    const learningStyles = careerProfile.learningStyle || [];
    if (learningStyles.length === 0) return 60;

    const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
    let score = 0;

    // Interactive/hands-on style
    if (learningStyles.includes('hands-on')) {
      const handsOnKeywords = ['hands-on', 'practical', 'workshop', 'lab', 'exercise', 'coding'];
      const hasHandsOn = handsOnKeywords.some(keyword => eventText.includes(keyword));
      score += hasHandsOn ? 40 : 20;
    }

    // Theoretical style (includes visual elements)
    if (learningStyles.includes('theoretical')) {
      const theoreticalKeywords = ['presentation', 'demo', 'visual', 'chart', 'diagram', 'showcase', 'lecture'];
      const hasTheoretical = theoreticalKeywords.some(keyword => eventText.includes(keyword));
      score += hasTheoretical ? 40 : 20;
    }

    // Interactive style
    if (learningStyles.includes('interactive')) {
      const interactiveKeywords = ['interactive', 'discussion', 'q&a', 'panel', 'workshop'];
      const hasInteractive = interactiveKeywords.some(keyword => eventText.includes(keyword));
      score += hasInteractive ? 40 : 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate networking value component score with speaker analysis
   */
  private static calculateNetworkingValueScore(
    event: Event,
    careerProfile: CareerProfile,
    _config: ScoringAlgorithmConfig
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

  /**
   * Analyze speaker quality and relevance
   */
  private static analyzeSpeakerQuality(event: Event, careerProfile: CareerProfile): number {
    const speakers = event.speakerLineup || [];
    if (speakers.length === 0) return 30; // Low score for no speakers

    let score = 0;
    const industry = careerProfile.industry?.toLowerCase() || '';
    const seniority = careerProfile.seniority || 'mid-level';

    for (const speaker of speakers) {
      let speakerScore = 50; // Base score

      // Title/Position analysis
      const title = speaker.title?.toLowerCase() || '';
      const company = speaker.company?.toLowerCase() || '';
      
      // Executive/C-level speakers
      if (title.includes('ceo') || title.includes('cto') || title.includes('vp') || 
          title.includes('director') || title.includes('head')) {
        speakerScore += 25;
      }
      // Senior technical roles
      else if (title.includes('senior') || title.includes('principal') || 
               title.includes('architect') || title.includes('lead')) {
        speakerScore += 20;
      }
      // Mid-level roles
      else if (title.includes('engineer') || title.includes('developer') || 
               title.includes('manager') || title.includes('analyst')) {
        speakerScore += 15;
      }

      // Company prestige (simplified)
      const prestigiousCompanies = ['google', 'microsoft', 'amazon', 'apple', 'meta', 'netflix', 'uber', 'airbnb'];
      if (prestigiousCompanies.some(prestigious => company.includes(prestigious))) {
        speakerScore += 20;
      }

      // Industry alignment
      if (industry && (title.includes(industry) || company.includes(industry))) {
        speakerScore += 15;
      }

      // Seniority alignment
      if ((seniority === 'senior' && title.includes('senior')) ||
          (seniority === 'junior' && !title.includes('senior') && !title.includes('lead'))) {
        speakerScore += 10;
      }

      score += Math.min(speakerScore, 100);
    }

    return Math.min(score / speakers.length, 100);
  }

  /**
   * Analyze networking opportunities
   */
  private static analyzeNetworkingOpportunities(event: Event): number {
    let score = 40; // Base score

    // Event type networking potential
    const eventType = event.category?.name?.toLowerCase() || '';
    const networkingTypes: Record<string, number> = {
      'conference': 90,    // High networking potential
      'meetup': 85,        // Very high networking
      'networking': 95,    // Dedicated networking
      'workshop': 60,      // Moderate networking
      'training': 50,      // Limited networking
      'course': 40,        // Minimal networking
      'webinar': 20,       // Very limited networking
      'social': 80         // Good social networking
    };

    score = Math.max(score, networkingTypes[eventType] || 40);

    // Attendee count analysis (optimal networking size)
    const attendeeCount = event.attendeeCount || 0;
    if (attendeeCount >= 50 && attendeeCount <= 200) {
      score += 15; // Optimal networking size
    } else if (attendeeCount >= 20 && attendeeCount < 50) {
      score += 10; // Good intimate networking
    } else if (attendeeCount > 200 && attendeeCount <= 500) {
      score += 5;  // Large but manageable
    } else if (attendeeCount > 500) {
      score -= 10; // Too large for meaningful networking
    }

    // Networking-specific features
    if (event.title?.toLowerCase().includes('network') || 
        event.description?.toLowerCase().includes('network')) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Analyze industry networking alignment
   */
  private static analyzeIndustryNetworking(event: Event, careerProfile: CareerProfile): number {
    const industry = careerProfile.industry?.toLowerCase() || '';
    if (!industry) return 60; // Neutral if no industry specified

    const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
    
    // Industry-specific keywords
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

    // Check speaker companies for industry alignment
    const speakers = event.speakerLineup || [];
    for (const speaker of speakers) {
      const company = speaker.company?.toLowerCase() || '';
      if (company.includes(industry)) {
        score += 15;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Analyze event scale and prestige
   */
  private static analyzeEventScale(event: Event): number {
    let score = 50;

    // Attendee count prestige
    const attendeeCount = event.attendeeCount || 0;
    if (attendeeCount >= 1000) {
      score += 30; // Major industry event
    } else if (attendeeCount >= 500) {
      score += 20; // Large regional event
    } else if (attendeeCount >= 100) {
      score += 10; // Mid-size event
    }

    // Organizer reputation (simplified)
    const organizer = event.organizer?.toLowerCase() || '';
    const prestigiousOrganizers = ['google', 'microsoft', 'aws', 'oracle', 'salesforce', 'adobe'];
    if (prestigiousOrganizers.some(prestigious => organizer.includes(prestigious))) {
      score += 20;
    }

    // Event duration (longer events often more prestigious)
    if (event.startTime && event.endTime) {
      const duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
      const days = duration / (1000 * 60 * 60 * 24);
      if (days >= 2) {
        score += 15; // Multi-day events
      } else if (days >= 1) {
        score += 10; // Full-day events
      }
    }

    return Math.min(score, 100);
  }



  /**
   * Calculate industry relevance component score with sector matching
   */
  private static calculateIndustryRelevanceScore(
    event: Event,
    careerProfile: CareerProfile,
    _config: ScoringAlgorithmConfig
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

  /**
   * Calculate industry alignment score
   */
  private static calculateIndustryAlignment(event: Event, careerProfile: CareerProfile): number {
    const industry = careerProfile.industry?.toLowerCase() || "";
    if (!industry) return 50; // Neutral if no industry specified

    const eventText = `${event.title || ""} ${event.description || ""}`.toLowerCase();
    
    // Industry-specific keywords and scoring
    const industryMappings: Record<string, { keywords: string[], score: number }> = {
      "technology": {
        keywords: ["tech", "software", "digital", "innovation", "startup", "ai", "ml", "cloud", "devops"],
        score: 85
      },
      "finance": {
        keywords: ["finance", "fintech", "banking", "investment", "trading", "crypto", "blockchain", "fintech"],
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

    // Check for industry-specific keywords
    for (const keyword of mapping.keywords) {
      if (eventText.includes(keyword)) {
        matchCount++;
        score += 5; // Bonus for each keyword match
      }
    }

    // Check speaker companies for industry alignment
    const speakers = event.speakerLineup || [];
    for (const speaker of speakers) {
      const company = speaker.company?.toLowerCase() || "";
      if (company.includes(industry)) {
        score += 10;
        matchCount++;
      }
    }

    // Bonus for multiple matches
    if (matchCount >= 3) score += 15;
    else if (matchCount >= 2) score += 10;
    else if (matchCount >= 1) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Analyze sector trends and innovation focus
   */
  private static analyzeSectorTrends(event: Event): number {
    const eventText = `${event.title || ""} ${event.description || ""}`.toLowerCase();
    let score = 50;

    // Innovation and trend keywords
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

  /**
   * Analyze market relevance
   */
  private static analyzeMarketRelevance(event: Event, careerProfile: CareerProfile): number {
    let score = 60; // Base score

    // Company size alignment
    const companySize = careerProfile.companySize;
    const attendeeCount = event.attendeeCount || 0;

    if (companySize === "startup" && attendeeCount < 100) {
      score += 15; // Small events good for startups
    } else if (companySize === "large" && attendeeCount > 500) {
      score += 15; // Large events good for large companies
    } else if (companySize === "medium" && attendeeCount >= 100 && attendeeCount <= 500) {
      score += 15; // Mid-size events for medium companies
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate timing bonus component score with career progression
   */
  private static calculateTimingBonusScore(
    event: Event,
    careerProfile: CareerProfile,
    _config: ScoringAlgorithmConfig
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

  /**
   * Analyze career timing relevance
   */
  private static analyzeCareerTiming(event: Event, careerProfile: CareerProfile): number {
    const seniority = careerProfile.seniority || "mid-level";
    const timeframe = careerProfile.timeframe || "medium-term";
    const goals = careerProfile.careerGoals || [];
    
    let score = 60; // Base score

    // Seniority-based timing
    if (seniority === "junior") {
      // Juniors benefit from skill-building events
      const skillKeywords = ["learn", "training", "workshop", "course", "fundamentals"];
      const hasSkillContent = skillKeywords.some(keyword => 
        (event.title + event.description).toLowerCase().includes(keyword)
      );
      if (hasSkillContent) score += 25;
    } else if (seniority === "senior") {
      // Seniors benefit from leadership and strategy events
      const leadershipKeywords = ["leadership", "strategy", "management", "executive"];
      const hasLeadershipContent = leadershipKeywords.some(keyword => 
        (event.title + event.description).toLowerCase().includes(keyword)
      );
      if (hasLeadershipContent) score += 25;
    }

    // Timeframe alignment
    if (timeframe === "short-term" && goals.includes("skill-development")) {
      // Short-term skill development
      const skillKeywords = ["bootcamp", "intensive", "accelerated", "quick"];
      const hasQuickSkillContent = skillKeywords.some(keyword => 
        (event.title + event.description).toLowerCase().includes(keyword)
      );
      if (hasQuickSkillContent) score += 15;
    }

    return Math.min(score, 100);
  }

  /**
   * Analyze seasonal timing
   */
  private static analyzeSeasonalTiming(event: Event): number {
    if (!event.startTime) return 50;

    const eventDate = new Date(event.startTime);
    const month = eventDate.getMonth(); // 0-11
    let score = 60;

    // Q1 (Jan-Mar): High activity, new year resolutions
    if (month >= 0 && month <= 2) {
      score += 15;
    }
    // Q4 (Oct-Dec): Year-end planning, budget allocation
    else if (month >= 9 && month <= 11) {
      score += 10;
    }
    // Summer (Jun-Aug): Lower activity but good for intensive learning
    else if (month >= 5 && month <= 7) {
      score += 5;
    }

    // Avoid holiday periods
    if (month === 11 || month === 0) { // December or January
      score -= 5; // Holiday period
    }

    return Math.min(score, 100);
  }

  /**
   * Analyze schedule alignment
   */
  private static analyzeScheduleAlignment(event: Event, careerProfile: CareerProfile): number {
    const availableTime = careerProfile.availableTime || "moderate";
    let score = 60;

    // Duration analysis
    if (event.startTime && event.endTime) {
      const duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
      const hours = duration / (1000 * 60 * 60);

      if (availableTime === "limited") {
        if (hours <= 2) score += 20;
        else if (hours <= 4) score += 10;
        else score -= 10; // Too long for limited time
      } else if (availableTime === "flexible") {
        if (hours >= 4) score += 15; // Can handle longer events
        else score += 5; // Shorter events also fine
      } else { // moderate
        if (hours >= 2 && hours <= 6) score += 15; // Optimal range
        else if (hours <= 2) score += 5; // Too short
        else score -= 5; // Too long
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate overall confidence score
   */
  private static calculateOverallConfidence(
    event: Event,
    careerProfile: CareerProfile,
    componentScores: Record<string, ComponentScore>,
    config: ScoringAlgorithmConfig
  ): number {
    let confidence = 0.3; // Base confidence

    // Data completeness factor
    let dataCompleteness = 0;
    if (event.title && event.description) dataCompleteness += 0.3;
    if (event.speakerLineup && event.speakerLineup.length > 0) dataCompleteness += 0.2;
    if (event.startTime && event.endTime) dataCompleteness += 0.2;
    if (event.priceRange) dataCompleteness += 0.1;
    if (event.attendeeCount) dataCompleteness += 0.1;
    if (event.prerequisites) dataCompleteness += 0.1;

    // Profile completeness factor
    let profileCompleteness = 0;
    if (careerProfile.primarySkills && careerProfile.primarySkills.length > 0) profileCompleteness += 0.2;
    if (careerProfile.skillsToLearn && careerProfile.skillsToLearn.length > 0) profileCompleteness += 0.2;
    if (careerProfile.careerGoals && careerProfile.careerGoals.length > 0) profileCompleteness += 0.2;
    if (careerProfile.industry) profileCompleteness += 0.2;
    if (careerProfile.seniority) profileCompleteness += 0.1;
    if (careerProfile.timeframe) profileCompleteness += 0.1;

    // Event detail level factor
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

    // Calculate weighted confidence
    confidence += dataCompleteness * config.confidenceFactors.dataCompleteness;
    confidence += profileCompleteness * config.confidenceFactors.profileCompleteness;
    confidence += eventDetailLevel * config.confidenceFactors.eventDetailLevel;

    return Math.min(confidence, 1.0);
  }

  /**
   * Determine impact category based on overall score
   */
  private static determineImpactCategory(overallScore: number, config: ScoringAlgorithmConfig): 'transformative' | 'high' | 'moderate' | 'low' {
    if (overallScore >= config.thresholds.highImpact) return 'high';
    if (overallScore >= config.thresholds.moderateImpact) return 'moderate';
    if (overallScore >= config.thresholds.lowImpact) return 'low';
    return 'low';
  }

  /**
   * Generate detailed explanation for the career impact score
   */
  private static generateExplanation(
    componentScores: Record<string, ComponentScore>,
    config: ScoringAlgorithmConfig,
    careerProfile: CareerProfile
  ): CareerImpactScore['explanation'] {
    const reasons: string[] = [];
    const matchedSkills: string[] = [];
    const speakerHighlights: string[] = [];
    const confidenceFactors: string[] = [];

    // Analyze component scores for reasons
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

    // Extract matched skills from skill relevance details
    const skillMatchScore = componentScores.skillRelevance?.details?.skillMatchScore as number;
    if (skillMatchScore && skillMatchScore >= 80) {
      const primarySkills = careerProfile.primarySkills || [];
      const skillsToLearn = careerProfile.skillsToLearn || [];
      matchedSkills.push(...primarySkills.slice(0, 3), ...skillsToLearn.slice(0, 2));
    }

    // Extract speaker highlights from networking value
    const speakerScore = componentScores.networkingValue?.details?.speakerScore as number;
    if (speakerScore && speakerScore >= 80) {
      speakerHighlights.push('Industry experts and thought leaders');
    }

    // Confidence factors
    if (careerProfile.primarySkills && careerProfile.primarySkills.length >= 3) {
      confidenceFactors.push('Comprehensive skill profile available');
    }
    if (careerProfile.careerGoals && careerProfile.careerGoals.length >= 2) {
      confidenceFactors.push('Clear career objectives defined');
    }

    return {
      reasons: reasons.length > 0 ? reasons : ['Standard career development opportunity'],
      matchedSkills: matchedSkills.slice(0, 5), // Limit to 5 skills
      speakerHighlights: speakerHighlights.length > 0 ? speakerHighlights : ['Quality speakers expected'],
      careerImpactCategory: this.determineImpactCategory(
        Object.values(componentScores).reduce((sum, score) => sum + score.score, 0) / Object.keys(componentScores).length,
        config
      ),
      confidenceFactors: confidenceFactors.length > 0 ? confidenceFactors : ['Standard confidence level']
    };
  }


  /**
   * Generate hash for event data
   */
  private static generateEventHash(event: Event): string {
    const eventData = {
      title: event.title,
      category: event.category?.name,
      speakers: event.speakerLineup?.length || 0,
      attendees: event.attendeeCount || 0
    };
    return btoa(JSON.stringify(eventData)).substring(0, 16);
  }
}
