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
  // We will normalize this to be bidirectional at runtime
  private static readonly RAW_TAG_SIMILARITIES: TagSimilarityMap = {
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

  // Normalized bidirectional similarity map
  private static TAG_SIMILARITIES: Map<string, Set<string>> | null = null;

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
    'Community': 0.4,        // Lower weight for community aspects
    'Agenda': 0.7            // Good weight for agenda-derived matches
  };

  /**
   * Initialize the bidirectional similarity map
   */
  private static initializeSimilarities() {
    if (this.TAG_SIMILARITIES) return;

    this.TAG_SIMILARITIES = new Map<string, Set<string>>();

    Object.entries(this.RAW_TAG_SIMILARITIES).forEach(([key, values]) => {
      const normalizedKey = key.toLowerCase();
      if (!this.TAG_SIMILARITIES!.has(normalizedKey)) {
        this.TAG_SIMILARITIES!.set(normalizedKey, new Set());
      }

      values.forEach(val => {
        const normalizedVal = val.toLowerCase();
        // A -> B
        this.TAG_SIMILARITIES!.get(normalizedKey)!.add(normalizedVal);

        // B -> A (ensure entry exists first)
        if (!this.TAG_SIMILARITIES!.has(normalizedVal)) {
          this.TAG_SIMILARITIES!.set(normalizedVal, new Set());
        }
        this.TAG_SIMILARITIES!.get(normalizedVal)!.add(normalizedKey);
      });
    });
  }

  /**
   * Expand a search term using TAG_SIMILARITIES mappings
   * Returns the original term plus all similar terms for broader search coverage
   *
   * Example: "js" -> ["js", "javascript", "node.js", "nodejs", "typescript", "ts"]
   */
  static expandSearchTerm(searchTerm: string): string[] {
    this.initializeSimilarities();

    if (!searchTerm || !searchTerm.trim()) return [];

    const normalized = searchTerm.toLowerCase().trim();
    const expansions = new Set<string>();

    // Always include the original term
    expansions.add(normalized);

    // Add similar terms from TAG_SIMILARITIES map
    const similarities = this.TAG_SIMILARITIES?.get(normalized);
    if (similarities) {
      similarities.forEach(term => expansions.add(term));
    }

    return Array.from(expansions);
  }

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
    this.initializeSimilarities();

    const userSkills = careerProfile.primarySkills || [];
    const userInterests = careerProfile.interests || [];
    const userGoals = careerProfile.careerGoals || [];
    const skillsToLearn = careerProfile.skillsToLearn || [];
    const learningStyle = careerProfile.learningStyle || [];

    // Determine if user is a beginner (for weighted skill matching)
    const isBeginner = learningStyle.includes('hands-on') || userSkills.length < 3;

    // Derive tags from agenda and merge with existing tags
    const candidateTerms = this.buildCandidateTerms(careerProfile);
    const derivedTags = this.deriveTagsFromAgenda(event, candidateTerms);
    
    // Create a merged list of tags, preferring existing tags over derived ones if duplicates exist
    const existingTagNames = new Set((event.tags || []).map(t => t.name.toLowerCase()));
    const mergedTags = [...(event.tags || [])];
    
    derivedTags.forEach(tag => {
      if (!existingTagNames.has(tag.name.toLowerCase())) {
        mergedTags.push(tag);
      }
    });

    let totalScore = 0;
    const matchedTags: string[] = [];
    const matchedCategories: string[] = [];
    const explanations: string[] = [];

    // Define weights based on experience level
    // Beginner: 60% Learning, 40% Primary
    // Standard: 20% Learning, 80% Primary
    const primaryWeight = isBeginner ? 0.6 : 1.0;
    const learnWeight = isBeginner ? 1.0 : 0.4;

    // Match on primary skills, interests, and goals
    const primaryTerms = [...userSkills, ...userInterests, ...userGoals];

    const directMatches = this.findDirectMatches(mergedTags, primaryTerms);
    totalScore += directMatches.score * primaryWeight;
    matchedTags.push(...directMatches.tags);
    matchedCategories.push(...directMatches.categories);
    explanations.push(...directMatches.explanations);

    const similarityMatches = this.findSimilarityMatches(mergedTags, primaryTerms);
    totalScore += similarityMatches.score * primaryWeight;
    matchedTags.push(...similarityMatches.tags);
    matchedCategories.push(...similarityMatches.categories);
    explanations.push(...similarityMatches.explanations);

    const categoryMatches = this.findCategoryMatches(mergedTags, primaryTerms);
    totalScore += categoryMatches.score * primaryWeight;
    matchedTags.push(...categoryMatches.tags);
    matchedCategories.push(...categoryMatches.categories);
    explanations.push(...categoryMatches.explanations);

    // Match on skillsToLearn
    if (skillsToLearn.length > 0) {
      const learnDirectMatches = this.findDirectMatches(mergedTags, skillsToLearn);
      totalScore += learnDirectMatches.score * learnWeight;
      matchedTags.push(...learnDirectMatches.tags);
      matchedCategories.push(...learnDirectMatches.categories);
      if (learnDirectMatches.explanations.length > 0) {
        explanations.push(`Learning: ${learnDirectMatches.explanations[0]}`);
      }

      const learnSimilarityMatches = this.findSimilarityMatches(mergedTags, skillsToLearn);
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
      const roleMatches = this.findDirectMatches(mergedTags, roleKeywords);
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
   * Derive synthetic tags from event agenda and description
   */
  private static deriveTagsFromAgenda(event: Event, candidateTerms: string[]): EventTag[] {
    const derivedTags: EventTag[] = [];
    
    // Combine all text content
    const agendaText = (event.agenda || [])
      .map(item => `${item.title} ${item.description || ''}`)
      .join(' ');
    const fullText = `${event.title} ${event.description || ''} ${agendaText}`;
    
    // Use a Set to avoid duplicates within the same event
    const foundTerms = new Set<string>();

    candidateTerms.forEach(term => {
      if (!term) return;
      
      // Validate term to prevent ReDoS
      if (term.length > 100 || /(.)\1{10,}/.test(term)) {
        return; // Skip terms that could cause ReDoS
      }

      // Escape special characters for regex (e.g., C++, Node.js)
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Smart word boundary detection
      // Only apply \b if the term starts/ends with a word character
      const startBoundary = /^\w/.test(term) ? '\\b' : '';
      const endBoundary = /\w$/.test(term) ? '\\b' : '';
      
      // Flag 'i' for case-insensitive
      const regex = new RegExp(`${startBoundary}${escapedTerm}${endBoundary}`, 'i');
      
      if (regex.test(fullText)) {
        // Store normalized lowercase version for deduplication
        const lowerTerm = term.toLowerCase();
        if (!foundTerms.has(lowerTerm)) {
          foundTerms.add(lowerTerm);
          derivedTags.push({
            id: `synthetic-${lowerTerm}-${Date.now()}`, // Temporary ID
            name: term, // Keep original casing from candidate term
            color: '#a855f7', // Distinct color for derived tags
            category: 'Agenda'
          });
        }
      }
    });

    return derivedTags;
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
    this.initializeSimilarities();
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
        const similarities = this.TAG_SIMILARITIES!.get(term);
        
        if (similarities && similarities.has(tagName)) {
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
    this.initializeSimilarities();
    const candidateTerms = this.buildCandidateTerms(careerProfile);
    const queryTerms = this.normalizeQueryTerms(candidateTerms);
    const textSearchTerms = this.extractHighValueTerms(careerProfile);

    // Log profile validation for debugging
    const hasCurrentRole = !!careerProfile.currentRole;
    const hasPrimarySkills = (careerProfile.primarySkills || []).length > 0;
    const hasSkillsToLearn = (careerProfile.skillsToLearn || []).length > 0;
    const hasInterests = (careerProfile.interests || []).length > 0;
    
    console.info('[TagBasedMatching] Profile validation', {
      hasCurrentRole,
      hasPrimarySkills,
      primarySkillsCount: (careerProfile.primarySkills || []).length,
      hasSkillsToLearn,
      skillsToLearnCount: (careerProfile.skillsToLearn || []).length,
      hasInterests,
      interestsCount: (careerProfile.interests || []).length,
      queryTermsCount: queryTerms.length,
      textSearchTermsCount: textSearchTerms.length,
      textSearchTerms: textSearchTerms.slice(0, 5) // Log first 5 for debugging
    });

    if (queryTerms.length === 0 && textSearchTerms.length === 0) {
      console.warn('[TagBasedMatching] No candidate terms available, falling back to discovery-only mode', {
        hasCurrentRole,
        hasPrimarySkills,
        hasSkillsToLearn,
        hasInterests
      });
      return this.getDiscoveryEventsOnly(careerProfile, supabaseClient, limit);
    }
    
    // 1. Primary Query: Tag-based matches
    const tagFetchLimit = 40;
    const limitedQueryTerms = queryTerms.slice(0, 100);
    const hasTagTerms = limitedQueryTerms.length > 0;
    
    const tagQueryPromise = hasTagTerms
      ? supabaseClient
          .from('events')
          .select(`
            *,
            event_type:event_type_id!inner(*),
            organizer:organizers (*),
            tags:event_tag_relations (
              event_tags (event_tag, category, color)
            ),
            event_agenda (
              id, title, description, start_time, end_time, agenda_type
            )
          `)
          .eq('status', 'confirmed')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(tagFetchLimit)
          .in('tags.event_tags.event_tag', limitedQueryTerms)
      : Promise.resolve({ data: [], error: null });

    // 2. Text Search Query: High-value term matches
    const textFetchLimit = 30;
    const textQueryPromise = this.getTextSearchCandidates(
      careerProfile,
      supabaseClient,
      textSearchTerms,
      textFetchLimit
    );

    // 3. Discovery Query: Fallback/Broad retrieval
    const discoveryFetchLimit = 30;
    let discoveryQuery = supabaseClient
      .from('events')
      .select(`
        *,
        event_type:event_type_id!inner(*),
        organizer:organizers (*),
        tags:event_tag_relations (
          event_tags (event_tag, category, color)
        ),
        event_agenda (
          id, title, description, start_time, end_time, agenda_type
        )
      `)
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(discoveryFetchLimit);

    // Apply preferred event type guardrail
    discoveryQuery = this.applyPreferredEventTypeGuard(discoveryQuery, careerProfile.preferredEventTypes);

    // Execute all queries in parallel
    const [tagResults, textResults, discoveryResults] = await Promise.all([
      tagQueryPromise,
      textQueryPromise,
      discoveryQuery
    ]);

    if (tagResults.error) console.error('Error fetching tag candidates:', tagResults.error);
    // Text query error handled inside helper
    if (discoveryResults.error) console.error('Error fetching discovery candidates:', discoveryResults.error);

    const rawTagEvents = hasTagTerms ? (tagResults.data || []) : [];
    const rawTextEvents = textResults || [];
    const rawDiscoveryEvents = discoveryResults.data || [];

    // Debug logging: Log candidate counts from each source
    console.info('[TagBasedMatching] Candidate sources', {
      tag: rawTagEvents.length,
      text: rawTextEvents.length,
      discovery: rawDiscoveryEvents.length,
      totalCandidates: rawTagEvents.length + rawTextEvents.length + rawDiscoveryEvents.length,
      hasTagTerms,
      queryTermsCount: limitedQueryTerms.length,
      textSearchTermsCount: textSearchTerms.length
    });

    // Merge and deduplicate by ID with priority: Tag -> Text -> Discovery
    // Enforce hard cap of 100
    const eventMap = new Map<string, Record<string, unknown>>();
    const MAX_CANDIDATES = 100;

    const addEvents = (events: Record<string, unknown>[]) => {
      for (const event of events) {
        if (eventMap.size >= MAX_CANDIDATES) return;
        const id = String(event.id);
        if (!eventMap.has(id)) {
          eventMap.set(id, event);
        }
      }
    };

    addEvents(rawTagEvents);
    addEvents(rawTextEvents);
    addEvents(rawDiscoveryEvents);

    const allCandidateEvents = Array.from(eventMap.values());

    if (allCandidateEvents.length === 0) {
      return [];
    }

    // Normalize events
    const normalizedEvents = allCandidateEvents.map(event => this.normalizeSupabaseEvent(event));

    // Sort deterministically before scoring to prevent flickering
    normalizedEvents.sort((a, b) => {
      const timeA = new Date(a.start_time as string).getTime();
      const timeB = new Date(b.start_time as string).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return String(a.id).localeCompare(String(b.id));
    });

    // Cache for match results to avoid re-calculation
    const matchCache = new Map<string, TagMatchResult>();

    const scored = normalizedEvents.map((eventRecord) => {
      const appEvent = eventTransformer.toApp(eventRecord);

      // Attach agenda for scoring if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agendaData = (eventRecord as any).event_agenda;
      if (Array.isArray(agendaData)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        appEvent.agenda = agendaData.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          startTime: item.start_time,
          endTime: item.end_time,
          type: item.agenda_type
        }));
      }

      // Calculate match and cache it
      const match = this.calculateTagSimilarity(appEvent, careerProfile);
      matchCache.set(appEvent.id, match);

      // Pass cached match to impact calculator
      const impactScore = this.calculateTagBasedCareerImpact(appEvent, careerProfile, match);
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

    // Debug logging: Log final sorted results
    console.info('[TagBasedMatching] Final recommendations', {
      totalCandidates: scored.length,
      returnedCount: sorted.length,
      topScores: sorted.slice(0, 5).map(r => ({
        eventId: r.event.id,
        totalScore: Math.round(r.totalScore),
        matchScore: Math.round(r.match.score),
        matchedTags: r.match.matchedTags.slice(0, 3),
        hasTextMatch: r.reasons.some(reason => reason.toLowerCase().includes('agenda') || reason.toLowerCase().includes('text'))
      }))
    });

    return sorted;
  }

  /**
   * Optimized discovery query when no tags are present
   */
  private static async getDiscoveryEventsOnly(
    careerProfile: CareerProfile,
    supabaseClient: SupabaseClientType,
    limit: number
  ): Promise<TagRecommendationResult[]> {
    const fetchLimit = Math.min(limit * 3, 100);
    const textTerms = this.extractHighValueTerms(careerProfile);
    
    let query = supabaseClient
      .from('events')
      .select(`
        *,
        event_type:event_type_id!inner(*),
        organizer:organizers (*),
        tags:event_tag_relations (
          event_tags (event_tag, category, color)
        ),
        event_agenda (
          id, title, description, start_time, end_time, agenda_type
        )
      `)
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(fetchLimit);

    // Apply preferred event type guardrail
    query = this.applyPreferredEventTypeGuard(query, careerProfile.preferredEventTypes);

    const [discoveryResult, textResults] = await Promise.all([
      query,
      this.getTextSearchCandidates(careerProfile, supabaseClient, textTerms, 30)
    ]);
    
    if (discoveryResult.error) {
      console.error('Error fetching discovery events:', discoveryResult.error);
      return [];
    }

    const rawDiscoveryEvents = discoveryResult.data || [];
    const rawTextEvents = textResults || [];
    
    // Debug logging: Log candidate counts from discovery-only path
    console.info('[TagBasedMatching] Discovery-only candidate sources', {
      text: rawTextEvents.length,
      discovery: rawDiscoveryEvents.length,
      totalCandidates: rawTextEvents.length + rawDiscoveryEvents.length,
      textSearchTermsCount: textTerms.length
    });
    
    const candidateMap = new Map<string, Record<string, unknown>>();
    const HARD_CAP = 100;

    const addEvents = (events: Record<string, unknown>[]) => {
      for (const event of events) {
        const id = String(event.id);
        if (!candidateMap.has(id)) {
          candidateMap.set(id, event);
          if (candidateMap.size >= HARD_CAP) return true;
        }
      }
      return false;
    };

    if (rawTextEvents.length > 0) {
      addEvents(rawTextEvents);
    }
    if (candidateMap.size < HARD_CAP) {
      addEvents(rawDiscoveryEvents);
    }

    const normalizedEvents = Array.from(candidateMap.values()).map(event => this.normalizeSupabaseEvent(event));

    const scored = normalizedEvents.map((eventRecord) => {
        const appEvent = eventTransformer.toApp(eventRecord);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const agendaData = (eventRecord as any).event_agenda;
        if (Array.isArray(agendaData)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          appEvent.agenda = agendaData.map((item: any) => ({
            id: item.id, title: item.title, description: item.description,
            startTime: item.start_time, endTime: item.end_time, type: item.agenda_type
          }));
        }
  
        const match = this.calculateTagSimilarity(appEvent, careerProfile);
        const impactScore = this.calculateTagBasedCareerImpact(appEvent, careerProfile, match);
        const { boost: profileBoost, reasons: profileReasons } = this.calculateProfileBoost(appEvent, careerProfile, match);
        const recencyBoost = this.calculateRecencyBoost(appEvent);
        const popularityBoost = this.calculatePopularityBoost(appEvent);
  
        const totalScore = match.score * 0.6 + impactScore * 0.25 + profileBoost + recencyBoost + popularityBoost;
        const reasons = [match.explanation, ...profileReasons.filter(Boolean)].filter(Boolean);
  
        return {
          event: eventRecord, match, impactScore, profileBoost, recencyBoost, popularityBoost, totalScore, reasons
        } as TagRecommendationResult;
      });

      const sorted = scored
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, limit);
      
      // Debug logging: Log final discovery-only results
      console.info('[TagBasedMatching] Discovery-only final recommendations', {
        totalCandidates: scored.length,
        returnedCount: sorted.length,
        topScores: sorted.slice(0, 5).map(r => ({
          eventId: r.event.id,
          totalScore: Math.round(r.totalScore),
          matchScore: Math.round(r.match.score)
        }))
      });
      
      return sorted;
  }

  /**
   * Calculate tag-based career impact score
   */
  static calculateTagBasedCareerImpact(
    event: Event,
    careerProfile: CareerProfile,
    preCalculatedMatch?: TagMatchResult
  ): number {
    const matchResult = preCalculatedMatch || this.calculateTagSimilarity(event, careerProfile);
    
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
    this.initializeSimilarities();
    const terms = new Set<string>();
    const processedTerms = new Set<string>(); // To prevent infinite recursion

    // Queue for BFS traversal of similarity graph
    const queue: string[] = [];

    const addToQueue = (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      const lower = trimmed.toLowerCase();
      
      if (!processedTerms.has(lower)) {
        processedTerms.add(lower);
        queue.push(lower);
        
        // Add variations to the final terms set
        terms.add(trimmed);
        terms.add(lower);
        terms.add(this.toTitleCase(lower));
      }
    };

    // 1. Seed the queue with user profile terms
    [
      ...(careerProfile.primarySkills || []),
      ...(careerProfile.skillsToLearn || []),
      ...(careerProfile.interests || [])
    ].forEach(addToQueue);

    (careerProfile.preferredEventTypes || []).forEach(addToQueue);
    (careerProfile.careerGoals || []).forEach(goal => addToQueue(goal.replace(/[-_]/g, ' ')));
    (careerProfile.learningStyle || []).forEach(style => addToQueue(style.replace(/[-_]/g, ' ')));
    (careerProfile.networkingGoals || []).forEach(goal => addToQueue(goal.replace(/[-_]/g, ' ')));

    if (careerProfile.currentRole) {
      getRoleKeywords(careerProfile.currentRole).forEach(addToQueue);
    }

    // 2. Process queue to find transitive similarities
    // Limit depth/iterations to prevent performance issues if graph is huge (though it's small now)
    let iterations = 0;
    const MAX_ITERATIONS = 1000; 

    while (queue.length > 0 && iterations < MAX_ITERATIONS) {
      const currentTerm = queue.shift()!;
      iterations++;

      const similarSet = this.TAG_SIMILARITIES!.get(currentTerm);
      if (similarSet) {
        similarSet.forEach(sim => {
          // If we haven't processed this similar term yet, add it to queue
          if (!processedTerms.has(sim)) {
             addToQueue(sim);
          }
        });
      }
    }

    return Array.from(terms);
  }

  /**
   * Extract high-value terms for text search query
   * Selection: Role + Top 2 Primary Skills + fallback to SkillsToLearn
   * Limit: 5 terms, min 3 chars
   */
  private static extractHighValueTerms(careerProfile: CareerProfile): string[] {
    const MAX_TERMS = 5;
    const terms: string[] = [];
    const seen = new Set<string>();

    const addIfValid = (term?: string) => {
      if (!term || terms.length >= MAX_TERMS) return;
      const trimmed = term.trim();
      if (trimmed.length < 3) return;
      const lower = trimmed.toLowerCase();
      if (seen.has(lower)) return;
      seen.add(lower);
      terms.push(trimmed);
    };

    addIfValid(careerProfile.currentRole);
    (careerProfile.primarySkills || []).slice(0, 2).forEach(addIfValid);

    if (terms.length < MAX_TERMS) {
      (careerProfile.skillsToLearn || []).forEach(skill => addIfValid(skill));
    }

    return terms.slice(0, MAX_TERMS);
  }

  /**
   * Execute text-based search query
   */
  private static async getTextSearchCandidates(
    careerProfile: CareerProfile,
    supabaseClient: SupabaseClientType,
    terms: string[],
    limit: number
  ): Promise<Record<string, unknown>[]> {
    if (terms.length === 0) return [];

    // Expand terms with synonyms before building filters
    const expandedTerms = this.expandSearchTermsWithSynonyms(terms);

    const filters = this.buildTextSearchFilters(expandedTerms);

    if (filters.length === 0) {
      console.warn('[TagBasedMatching] No valid text search terms after sanitization', { userId: careerProfile.userId });
      return [];
    }

    const orClauses = filters.join(',');

    // Fetch events matching title/description
    const { data, error } = await supabaseClient
      .from('events')
      .select(`
        *,
        event_type:event_type_id!inner(*),
        organizer:organizers (*),
        tags:event_tag_relations (
          event_tags (event_tag, category, color)
        ),
        event_agenda (
          id, title, description, start_time, end_time, agenda_type
        )
      `)
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString())
      .or(orClauses)
      .order('start_time', { ascending: true })
      .limit(limit * 2); // Fetch more to account for agenda filtering

    if (error) {
      console.error('Error fetching text search candidates:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Also search for events with matching agenda content
    // Note: Supabase doesn't support direct filtering on joined tables in .or(),
    // so we filter in memory after fetching agenda items
    const agendaMatches = await this.findAgendaMatches(expandedTerms, supabaseClient, limit);

    // Combine results, prioritizing agenda matches
    const eventMap = new Map<string, Record<string, unknown> & { _matchLocation?: 'agenda' | 'description' | 'title' }>();
    
    // Add agenda matches first (higher priority)
    agendaMatches.forEach(event => {
      const id = String(event.id);
      if (!eventMap.has(id)) {
        eventMap.set(id, { ...event, _matchLocation: 'agenda' });
      }
    });

    // Add title/description matches
    (data || []).forEach(event => {
      const id = String(event.id);
      if (!eventMap.has(id)) {
        // Determine match location
        const title = String(event.title || '').toLowerCase();
        const description = String(event.description || '').toLowerCase();
        const matchedTerm = expandedTerms.find(term => 
          title.includes(term.toLowerCase()) || description.includes(term.toLowerCase())
        );
        const matchLocation = title.includes(matchedTerm?.toLowerCase() || '') ? 'title' : 'description';
        eventMap.set(id, { ...event, _matchLocation: matchLocation });
      }
    });

    // Sort: agenda matches first, then description, then title-only
    const sorted = Array.from(eventMap.values()).sort((a, b) => {
      const priority = { agenda: 3, description: 2, title: 1 };
      const aPriority = priority[a._matchLocation || 'title'] || 0;
      const bPriority = priority[b._matchLocation || 'title'] || 0;
      return bPriority - aPriority;
    });

    return sorted.slice(0, limit);
  }

  /**
   * Expand search terms with synonyms from TAG_SIMILARITIES
   */
  private static expandSearchTermsWithSynonyms(terms: string[]): string[] {
    this.initializeSimilarities();
    if (!this.TAG_SIMILARITIES) return terms;

    const expanded = new Set<string>();
    
    terms.forEach(term => {
      const normalized = term.toLowerCase();
      expanded.add(term); // Add original term
      
      // Add synonyms
      const synonyms = this.TAG_SIMILARITIES!.get(normalized);
      if (synonyms) {
        synonyms.forEach(syn => expanded.add(syn));
      }
      
      // Check if term is a synonym of another canonical term
      for (const [canonical, synSet] of this.TAG_SIMILARITIES!.entries()) {
        if (synSet.has(normalized)) {
          expanded.add(canonical);
        }
      }
    });

    return Array.from(expanded);
  }

  /**
   * Find events with matching agenda content
   */
  private static async findAgendaMatches(
    terms: string[],
    supabaseClient: SupabaseClientType,
    limit: number
  ): Promise<Record<string, unknown>[]> {
    if (terms.length === 0) return [];

    // Build filters for agenda search
    const agendaFilters: string[] = [];
    terms.forEach(term => {
      const sanitized = this.sanitizeTextSearchTerm(term);
      if (!sanitized) return;
      const pattern = `%${sanitized}%`;
      agendaFilters.push(`title.ilike.${pattern}`, `description.ilike.${pattern}`);
    });

    if (agendaFilters.length === 0) return [];

    // Query agenda items that match
    const { data: matchingAgenda, error: agendaError } = await supabaseClient
      .from('event_agenda')
      .select('event_id')
      .or(agendaFilters.join(','))
      .limit(limit * 2);

    if (agendaError || !matchingAgenda || matchingAgenda.length === 0) {
      return [];
    }

    // Get unique event IDs
    const eventIds = [...new Set(matchingAgenda.map(item => item.event_id))].slice(0, limit);

    // Fetch full event data for matching events
    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select(`
        *,
        event_type:event_type_id!inner(*),
        organizer:organizers (*),
        tags:event_tag_relations (
          event_tags (event_tag, category, color)
        ),
        event_agenda (
          id, title, description, start_time, end_time, agenda_type
        )
      `)
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString())
      .in('id', eventIds)
      .order('start_time', { ascending: true })
      .limit(limit);

    if (eventsError) {
      console.error('Error fetching agenda-matched events:', eventsError);
      return [];
    }

    return events || [];
  }

  private static buildTextSearchFilters(terms: string[]): string[] {
    const clauses: string[] = [];
    terms.forEach(term => {
      const sanitized = this.sanitizeTextSearchTerm(term);
      if (!sanitized) return;
      const pattern = `%${sanitized}%`;
      clauses.push(`title.ilike.${pattern}`, `description.ilike.${pattern}`);
    });
    return clauses;
  }

  private static sanitizeTextSearchTerm(term: string): string | null {
    const cleaned = term
      .trim()
      .toLowerCase()
      .replace(/[,"]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length < 3) {
      return null;
    }

    return cleaned.replace(/[%_]/g, match => `\\${match}`);
  }

  private static normalizeQueryTerms(terms: string[]): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];
    terms.forEach(term => {
      const normalizedTerm = term.trim().toLowerCase();
      if (!normalizedTerm || seen.has(normalizedTerm)) {
        return;
      }
      seen.add(normalizedTerm);
      normalized.push(normalizedTerm);
    });
    return normalized;
  }

  private static applyPreferredEventTypeGuard<T>(
    query: T,
    preferredTypes?: string[]
  ): T {
    if (!preferredTypes || preferredTypes.length === 0) {
      return query;
    }

    const filters = preferredTypes
      .map(type => this.buildEventTypeFilter(type))
      .filter((filter): filter is string => Boolean(filter));

    if (filters.length === 0) {
      return query;
    }

    // Type-safe check for Supabase query builder
    const queryWithOr = query as { or?: (filter: string, options?: { foreignTable?: string }) => T };
    if (typeof queryWithOr.or === 'function') {
      return queryWithOr.or(filters.join(','), { foreignTable: 'event_type' });
    }

    return query;
  }

  private static buildEventTypeFilter(rawType: string | undefined | null): string | null {
    if (!rawType) return null;
    const cleaned = rawType
      .replace(/[,*"]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return null;

    const wildcard = cleaned
      .replace(/\*/g, '')
      .replace(/[%_]/g, match => `\\${match}`);
    return `name.ilike.*${wildcard}*`;
  }

  private static normalizeSupabaseEvent(event: Record<string, unknown>): SupabaseEventWithDetails {
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
    } as unknown as SupabaseEventWithDetails;
  }

  public static calculateProfileBoost(
    event: Event,
    careerProfile: CareerProfile,
    match: TagMatchResult
  ): { boost: number; reasons: string[] } {
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
