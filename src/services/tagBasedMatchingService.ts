import { Event, EventTag } from '@/types';
import { CareerProfile } from '@/types/career';

export interface TagMatchResult {
  score: number;
  matchedTags: string[];
  matchedCategories: string[];
  explanation: string;
}

export interface TagSimilarityMap {
  [key: string]: string[];
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
   */
  static calculateTagSimilarity(
    event: Event,
    careerProfile: CareerProfile
  ): TagMatchResult {
    const eventTags = event.tags || [];
    const userSkills = careerProfile.primarySkills || [];
    const userInterests = careerProfile.interests || [];
    const userGoals = careerProfile.careerGoals || [];
    
    const allUserTerms = [...userSkills, ...userInterests, ...userGoals];
    
    let totalScore = 0;
    const matchedTags: string[] = [];
    const matchedCategories: string[] = [];
    const explanations: string[] = [];

    // Direct tag matches (highest priority)
    const directMatches = this.findDirectMatches(eventTags, allUserTerms);
    totalScore += directMatches.score;
    matchedTags.push(...directMatches.tags);
    matchedCategories.push(...directMatches.categories);
    explanations.push(...directMatches.explanations);

    // Similarity-based matches (medium priority)
    const similarityMatches = this.findSimilarityMatches(eventTags, allUserTerms);
    totalScore += similarityMatches.score;
    matchedTags.push(...similarityMatches.tags);
    matchedCategories.push(...similarityMatches.categories);
    explanations.push(...similarityMatches.explanations);

    // Category-based matches (lower priority)
    const categoryMatches = this.findCategoryMatches(eventTags, allUserTerms);
    totalScore += categoryMatches.score;
    matchedTags.push(...categoryMatches.tags);
    matchedCategories.push(...categoryMatches.categories);
    explanations.push(...categoryMatches.explanations);

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
    userId: string,
    careerProfile: CareerProfile,
    supabaseClient: unknown,
    limit: number = 10
  ): Promise<Event[]> {
    const userSkills = careerProfile.primarySkills || [];
    const userInterests = careerProfile.interests || [];
    const allUserTerms = [...userSkills, ...userInterests];

    if (allUserTerms.length === 0) {
      return [];
    }

    // Get events with matching tags
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: events, error } = await (supabaseClient as any)
      .from('events')
      .select(`
        *,
        event_type:event_type_id (*),
        organizer:organizers (*),
        tags:event_tag_relations (
          event_tags (event_tag, category, color)
        )
      `)
      .in('tags.event_tags.event_tag', allUserTerms)
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching recommended events:', error);
      return [];
    }

    return events || [];
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
}
