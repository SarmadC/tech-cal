import { Event, EventTag, SupabaseEventWithDetails, CareerGoal, LearningStyle, NetworkingGoal, SupabaseClientType } from '@/types';
import { CareerProfile } from '@/types/career';
import { eventTransformer } from '@/utils/transformers';
import { getRoleKeywords } from '@/utils/roleTaxonomy';

export interface TagMatchResult {
  score: number;
  matchedTags: string[];
  matchedCategories: string[];
  explanation: string;
}

export interface TagSimilarityMap {
  [key: string]: string[];
}

export interface TagRecommendationResult {
  event: SupabaseEventWithDetails;
  match: TagMatchResult;
  impactScore: number;
  profileBoost: number;
  recencyBoost: number;
  popularityBoost: number;
  totalScore: number;
  reasons: string[];
}

/**
 * Service for tag-based event matching and career impact scoring
 * Replaces keyword-based matching with more accurate tag-based approach
 */
export class TagBasedMatchingService {
  // Tag similarity mappings for better matching
  private static readonly TAG_SIMILARITIES: TagSimilarityMap = {
    // Programming Languages
    'javascript': ['js', 'node.js', 'nodejs', 'typescript', 'ts'],
    'python': ['django', 'flask', 'fastapi', 'pandas', 'numpy'],
    'react': ['jsx', 'next.js', 'nextjs', 'frontend', 'javascript'],
    'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning'],
    'machine learning': ['ai', 'artificial intelligence', 'data science', 'ml'],
    'data science': ['machine learning', 'ai', 'analytics', 'data analysis'],
    
    // Event Types
    'workshop': ['training', 'bootcamp', 'masterclass', 'hands-on'],
    'conference': ['summit', 'convention', 'symposium'],
    'meetup': ['networking', 'social', 'community'],
    'webinar': ['online', 'virtual', 'livestream'],
    
    // Difficulty Levels
    'beginner': ['intro', '101', 'fundamentals', 'basics'],
    'intermediate': ['advanced', 'experienced', 'professional'],
    'advanced': ['expert', 'senior', 'master', 'specialist'],
    
    // Industry Context
    'fintech': ['financial technology', 'banking', 'payments'],
    'healthcare': ['health tech', 'medical', 'biotech'],
    'ecommerce': ['online retail', 'marketplace', 'shopping'],
    'startup': ['entrepreneurship', 'founder', 'venture'],
    
    // Soft Skills
    'leadership': ['management', 'team lead', 'director'],
    'communication': ['presentation', 'public speaking', 'writing'],
    'project management': ['agile', 'scrum', 'planning']
  };

  // Category weights for different types of matches
  private static readonly CATEGORY_WEIGHTS = {
    'Programming': 1.0,      // Highest weight for technical skills
    'Framework': 0.9,        // High weight for frameworks
    'Tech': 0.8,             // High weight for tech concepts
    'Development': 0.8,      // High weight for development skills
    'Methodology': 0.7,      // Medium-high weight for methodologies
    'Platform': 0.7,         // Medium-high weight for platforms
    'Business': 0.6,         // Medium weight for business skills
    'Industry': 0.5,         // Medium weight for industry context
    'Event-Type': 0.4,       // Lower weight for event types
    'Difficulty': 0.3,       // Lower weight for difficulty levels
    'Soft-Skills': 0.6,      // Medium weight for soft skills
    'Career-Stage': 0.5,     // Medium weight for career stages
    'Community': 0.4         // Lower weight for community aspects
  };

  /**
   * Calculate tag-based similarity between user profile and event
   *
   * For beginners: Applies 60/40 split between primary skills and skills to learn
   * For intermediate/advanced: Focuses primarily on existing skills
   */
  static calculateTagSimilarity(
    event: Event,
    careerProfile: CareerProfile
  ): TagMatchResult {
    const eventTags = event.tags || [];
    const userSkills = careerProfile.primarySkills || [];
    const userInterests = careerProfile.interests || [];
    const userGoals = careerProfile.careerGoals || [];
    const skillsToLearn = careerProfile.skillsToLearn || [];
    const learningStyle = careerProfile.learningStyle || [];

    // Determine if user is a beginner (for weighted skill matching)
    const isBeginner = learningStyle.includes('hands-on') || userSkills.length < 3;

    let totalScore = 0;
    const matchedTags: string[] = [];
    const matchedCategories: string[] = [];
    const explanations: string[] = [];

    // Match on primary skills, interests, and goals (always 100% weight)
    const primaryTerms = [...userSkills, ...userInterests, ...userGoals];

    const directMatches = this.findDirectMatches(eventTags, primaryTerms);
    totalScore += directMatches.score;
    matchedTags.push(...directMatches.tags);
    matchedCategories.push(...directMatches.categories);
    explanations.push(...directMatches.explanations);

    const similarityMatches = this.findSimilarityMatches(eventTags, primaryTerms);
    totalScore += similarityMatches.score;
    matchedTags.push(...similarityMatches.tags);
    matchedCategories.push(...similarityMatches.categories);
    explanations.push(...similarityMatches.explanations);

    const categoryMatches = this.findCategoryMatches(eventTags, primaryTerms);
    totalScore += categoryMatches.score;
    matchedTags.push(...categoryMatches.tags);
    matchedCategories.push(...categoryMatches.categories);
    explanations.push(...categoryMatches.explanations);

    // Match on skillsToLearn (weighted based on experience level)
    if (skillsToLearn.length > 0) {
      const learnWeight = isBeginner ? 0.67 : 0.4; // 40% for beginners (60/40 split), 40% for others

      const learnDirectMatches = this.findDirectMatches(eventTags, skillsToLearn);
      totalScore += learnDirectMatches.score * learnWeight;
      matchedTags.push(...learnDirectMatches.tags);
      matchedCategories.push(...learnDirectMatches.categories);
      if (learnDirectMatches.explanations.length > 0) {
        explanations.push(`Learning: ${learnDirectMatches.explanations[0]}`);
      }

      const learnSimilarityMatches = this.findSimilarityMatches(eventTags, skillsToLearn);
      totalScore += learnSimilarityMatches.score * learnWeight;
      matchedTags.push(...learnSimilarityMatches.tags);
      matchedCategories.push(...learnSimilarityMatches.categories);
      if (learnSimilarityMatches.explanations.length > 0) {
        explanations.push(`Learning: ${learnSimilarityMatches.explanations[0]}`);
      }
    }

    // Role alignment check
    if (careerProfile.currentRole) {
      const roleKeywords = getRoleKeywords(careerProfile.currentRole);
      const roleMatches = this.findDirectMatches(eventTags, roleKeywords);
      if (roleMatches.score > 0) {
        totalScore += roleMatches.score * 0.5; // Modest boost
        matchedTags.push(...roleMatches.tags);
        matchedCategories.push(...roleMatches.categories);
        explanations.push(`Aligns with your ${careerProfile.currentRole} role`);
      }
    }

    // Cap score at 100
    const finalScore = Math.min(totalScore, 100);

    return {
      score: finalScore,
      matchedTags: [...new Set(matchedTags)],
      matchedCategories: [...new Set(matchedCategories)],
      explanation: explanations.length > 0 ? explanations[0] : 'No specific matches found'
    };
  }

  /**
   * Find direct tag matches
   */
  private static findDirectMatches(
    eventTags: EventTag[],
    userTerms: string[]
  ): { score: number; tags: string[]; categories: string[]; explanations: string[] } {
    let score = 0;
    const tags: string[] = [];
    const categories: string[] = [];
    const explanations: string[] = [];

    for (const eventTag of eventTags) {
      const tagName = eventTag.name.toLowerCase();
      const category = eventTag.category;
      const categoryWeight = (this.CATEGORY_WEIGHTS as Record<string, number>)[category] || 0.5;

      for (const userTerm of userTerms) {
        const term = userTerm.toLowerCase();
        
        if (tagName === term) {
          score += 30 * categoryWeight; // High score for exact matches
          tags.push(eventTag.name);
          categories.push(category);
          explanations.push(`Exact match: ${eventTag.name}`);
        }
      }
    }

    return { score, tags, categories, explanations };
  }

  /**
   * Find similarity-based matches using tag mappings
   */
  private static findSimilarityMatches(
    eventTags: EventTag[],
    userTerms: string[]
  ): { score: number; tags: string[]; categories: string[]; explanations: string[] } {
    let score = 0;
    const tags: string[] = [];
    const categories: string[] = [];
    const explanations: string[] = [];

    for (const eventTag of eventTags) {
      const tagName = eventTag.name.toLowerCase();
      const category = eventTag.category;
      const categoryWeight = (this.CATEGORY_WEIGHTS as Record<string, number>)[category] || 0.5;

      for (const userTerm of userTerms) {
        const term = userTerm.toLowerCase();
        const similarities = this.TAG_SIMILARITIES[term] || [];
        
        if (similarities.includes(tagName)) {
          score += 20 * categoryWeight; // Medium score for similarity matches
          tags.push(eventTag.name);
          categories.push(category);
          explanations.push(`${eventTag.name} related to ${userTerm}`);
        }
      }
    }

    return { score, tags, categories, explanations };
  }

  /**
   * Find category-based matches
   */
  private static findCategoryMatches(
    eventTags: EventTag[],
    userTerms: string[]
  ): { score: number; tags: string[]; categories: string[]; explanations: string[] } {
    let score = 0;
    const tags: string[] = [];
    const categories: string[] = [];
    const explanations: string[] = [];

    // Group event tags by category
    const categoryGroups = eventTags.reduce((acc, tag) => {
      if (!acc[tag.category]) acc[tag.category] = [];
      acc[tag.category].push(tag);
      return acc;
    }, {} as Record<string, EventTag[]>);

    // Check if user has skills in the same categories
    for (const [category, categoryTags] of Object.entries(categoryGroups)) {
      const categoryWeight = (this.CATEGORY_WEIGHTS as Record<string, number>)[category] || 0.5;
      
      // Simple category matching - if user has any skill in this category
      const hasCategoryMatch = userTerms.some(term => 
        categoryTags.some(tag => 
          tag.name.toLowerCase().includes(term.toLowerCase()) ||
          term.toLowerCase().includes(tag.name.toLowerCase())
        )
      );

      if (hasCategoryMatch) {
        score += 10 * categoryWeight; // Lower score for category matches
        categoryTags.forEach(tag => {
          tags.push(tag.name);
          categories.push(category);
        });
        explanations.push(`Category match: ${category}`);
      }
    }

    return { score, tags, categories, explanations };
  }

  /**
   * Get recommended events based on tag matching
   */
  static async getRecommendedEventsByTags(
    _userId: string,
    careerProfile: CareerProfile,
    supabaseClient: SupabaseClientType,
    limit: number = 10
  ): Promise<TagRecommendationResult[]> {
    const candidateTerms = this.buildCandidateTerms(careerProfile);
    if (candidateTerms.length === 0) {
      return [];
    }

    const fetchLimit = Math.min(limit * 5, 100);
    const queryTerms = candidateTerms.slice(0, 100);

    // Get events with matching tags
    let query = supabaseClient
      .from('events')
      .select(`
        *,
        event_type:event_type_id (*),
        organizer:organizers (*),
        tags:event_tag_relations (
          event_tags (event_tag, category, color)
        )
      `)
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(fetchLimit);

    // Apply flexible tag filtering (case-insensitive approximations)
    if (queryTerms.length > 0) {
      query = query.in('tags.event_tags.event_tag', queryTerms);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching recommended events:', error);
      return [];
    }

    const normalizedEvents = (events || []).map((event: Record<string, unknown>) => {
      const relations = Array.isArray(event.tags)
        ? (event.tags as Array<{ event_tags?: { id: string; event_tag: string; color?: string | null; category?: string | null } | null }>)
        : [];

      const normalizedTags: EventTag[] = relations.flatMap((relation) => {
        if (!relation?.event_tags) return [];
        const tag = relation.event_tags;
        return [{
          id: tag.id,
          name: tag.event_tag,
          color: tag.color || '#6b7280',
          category: tag.category || 'General'
        }];
      });

      return {
        ...event,
        tags: normalizedTags
      };
    }) as unknown as SupabaseEventWithDetails[];

    let candidateEvents: SupabaseEventWithDetails[] = normalizedEvents;

    if (candidateEvents.length === 0 && (careerProfile.preferredEventTypes?.length ?? 0) > 0) {
      // Use case-insensitive SQL filtering to avoid loading thousands of events into memory
      // Build multiple queries for each preferred type, then combine and deduplicate results
      const fallbackPromises = careerProfile.preferredEventTypes.map(type => 
        supabaseClient
          .from('events')
          .select(`
            *,
            event_type:event_type_id (*),
            organizer:organizers (*),
            tags:event_tag_relations (
              event_tags (event_tag, category, color)
            )
          `)
          .eq('status', 'confirmed')
          .gte('start_time', new Date().toISOString())
          .ilike('event_type.name', type) // Exact match (case-insensitive)
          .order('start_time', { ascending: true })
          .limit(fetchLimit)
      );
      
      const fallbackResults = await Promise.all(fallbackPromises);
      
      // Check for errors in any query result
      const hasErrors = fallbackResults.some(result => result.error);
      if (hasErrors) {
        console.warn('[TagBasedMatching] Some fallback queries failed:', 
          fallbackResults.filter(r => r.error).map(r => r.error));
      }
      
      // Collect unique events by ID to avoid duplicates
      const eventMap = new Map<string, Record<string, unknown>>();
      fallbackResults.forEach(result => {
        if (result.data) {
          result.data.forEach((event: Record<string, unknown>) => {
            const eventId = String(event.id);
            if (!eventMap.has(eventId)) {
              eventMap.set(eventId, event);
            }
          });
        }
      });
      
      const allFallbackEvents = Array.from(eventMap.values());

      if (allFallbackEvents.length > 0) {
        candidateEvents = allFallbackEvents.map((event: Record<string, unknown>) => {
          const relations = Array.isArray(event.tags)
            ? (event.tags as Array<{ event_tags?: { id: string; event_tag: string; color?: string | null; category?: string | null } | null }>)
            : [];

          const normalizedTags: EventTag[] = relations.flatMap((relation) => {
            if (!relation?.event_tags) return [];
            const tag = relation.event_tags;
            return [{
              id: tag.id,
              name: tag.event_tag,
              color: tag.color || '#6b7280',
              category: tag.category || 'General'
            }];
          });

          return {
            ...event,
            tags: normalizedTags
          };
        }) as unknown as SupabaseEventWithDetails[];
      }
    }

    if (candidateEvents.length === 0) {
      return [];
    }

    const scored = candidateEvents.map((eventRecord) => {
      const appEvent = eventTransformer.toApp(eventRecord);
      const match = this.calculateTagSimilarity(appEvent, careerProfile);
      const impactScore = this.calculateTagBasedCareerImpact(appEvent, careerProfile);
      const { boost: profileBoost, reasons: profileReasons } = this.calculateProfileBoost(appEvent, careerProfile, match);
      const recencyBoost = this.calculateRecencyBoost(appEvent);
      const popularityBoost = this.calculatePopularityBoost(appEvent);

      const totalScore =
        match.score * 0.6 +
        impactScore * 0.25 +
        profileBoost +
        recencyBoost +
        popularityBoost;

      const reasons = [
        match.explanation,
        ...profileReasons.filter(Boolean)
      ].filter(Boolean);

      return {
        event: eventRecord,
        match,
        impactScore,
        profileBoost,
        recencyBoost,
        popularityBoost,
        totalScore,
        reasons
      } as TagRecommendationResult;
    });

    const sorted = scored
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        const matchDelta = b.match.matchedTags.length - a.match.matchedTags.length;
        if (matchDelta !== 0) return matchDelta;
        const getAttendeeCount = (eventRecord: SupabaseEventWithDetails): number => {
          const recordWithAttendees = eventRecord as SupabaseEventWithDetails & { attendee_count?: number | null; attendeeCount?: number | null };
          return recordWithAttendees.attendee_count ?? recordWithAttendees.attendeeCount ?? 0;
        };

        const popDelta = getAttendeeCount(b.event) - getAttendeeCount(a.event);
        if (popDelta !== 0) return popDelta;
        const aStart = new Date(a.event.start_time as string).getTime();
        const bStart = new Date(b.event.start_time as string).getTime();
        return aStart - bStart;
      })
      .slice(0, limit);

    return sorted;
  }

  /**
   * Calculate tag-based career impact score
   */
  static calculateTagBasedCareerImpact(
    event: Event,
    careerProfile: CareerProfile
  ): number {
    const matchResult = this.calculateTagSimilarity(event, careerProfile);
    
    // Convert similarity score to career impact score (0-100)
    // Higher similarity = higher career impact potential
    const baseScore = matchResult.score;
    
    // Boost score based on matched categories
    const categoryBoost = matchResult.matchedCategories.reduce((boost, category) => {
      const weight = (this.CATEGORY_WEIGHTS as Record<string, number>)[category] || 0.5;
      return boost + (weight * 5); // Small boost per category
    }, 0);

    // Boost score based on number of matches
    const matchCountBoost = Math.min(matchResult.matchedTags.length * 2, 10);

    const finalScore = Math.min(baseScore + categoryBoost + matchCountBoost, 100);
    
    return Math.round(finalScore);
  }

  private static buildCandidateTerms(careerProfile: CareerProfile): string[] {
    const terms = new Set<string>();

    const addTerm = (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      const lower = trimmed.toLowerCase();
      terms.add(trimmed);
      terms.add(lower);
      terms.add(this.toTitleCase(lower));

      const similar = this.TAG_SIMILARITIES[lower];
      if (similar) {
        similar.forEach(addTerm);
      }
    };

    const seedTerms = [
      ...(careerProfile.primarySkills || []),
      ...(careerProfile.skillsToLearn || []),
      ...(careerProfile.interests || [])
    ];

    seedTerms.forEach(addTerm);

    (careerProfile.preferredEventTypes || []).forEach(addTerm);
    (careerProfile.careerGoals || []).forEach(goal => addTerm(goal.replace(/[-_]/g, ' ')));
    (careerProfile.learningStyle || []).forEach(style => addTerm(style.replace(/[-_]/g, ' ')));
    (careerProfile.networkingGoals || []).forEach(goal => addTerm(goal.replace(/[-_]/g, ' ')));

    // Add role keywords for matching
    if (careerProfile.currentRole) {
      getRoleKeywords(careerProfile.currentRole).forEach(addTerm);
    }

    return Array.from(terms);
  }

  public static calculateProfileBoost(
    event: Event,
    careerProfile: CareerProfile,
    match: TagMatchResult
  ): { boost: number; reasons: string[] } {
    let boost = 0;
    const reasons: string[] = [];
    const tagNames = new Set((event.tags || []).map(tag => tag.name.toLowerCase()));
    const text = `${event.title} ${event.description || ''}`.toLowerCase();

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

    const goalBoost = this.calculateGoalBoost(careerProfile.careerGoals || [], tagNames, text);
    boost += goalBoost.amount;
    reasons.push(...goalBoost.reasons);

    const learningBoost = this.calculateLearningStyleBoost(careerProfile.learningStyle || [], tagNames, text);
    boost += learningBoost.amount;
    reasons.push(...learningBoost.reasons);

    const networkingBoost = this.calculateNetworkingBoost(careerProfile.networkingGoals || [], tagNames, text);
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

  private static calculateGoalBoost(
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

  private static calculateLearningStyleBoost(
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

  private static calculateNetworkingBoost(
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

  private static calculateRecencyBoost(event: Event): number {
    const start = new Date(event.startTime);
    const now = new Date();
    const diffDays = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (Number.isNaN(diffDays)) return 0;
    if (diffDays <= 7 && diffDays >= 0) return 6;
    if (diffDays <= 14 && diffDays >= 0) return 4;
    if (diffDays <= 30 && diffDays >= 0) return 2;
    return 0;
  }

  private static calculatePopularityBoost(event: Event): number {
    const attendees = event.attendeeCount ?? 0;
    if (attendees > 1000) return 6;
    if (attendees > 500) return 4;
    if (attendees > 100) return 2;
    return attendees > 0 ? 1 : 0;
  }

  private static toTitleCase(value: string): string {
    return value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1));
  }
}
