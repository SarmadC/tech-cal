/**
 * Event Tag Enrichment Service
 * 
 * Automatically extracts and assigns tags to events based on title, description, and agenda content.
 * Used during ingestion (primary) and for backfilling legacy events (secondary).
 */

import type { SupabaseClientType } from '@/types';
import type { AgendaItem } from '@/types';

interface TagMatch {
  tagId: string;
  tagName: string;
  category: string;
  confidence: number;
  matchType: 'exact' | 'synonym' | 'category' | 'partial';
}

interface EnrichmentResult {
  success: boolean;
  tagsAssigned: number;
  tagsSkipped: number;
  error?: string;
}

// Noise filtering blacklist - common non-technical terms
const BLACKLIST_TERMS = new Set([
  'lunch', 'welcome', 'break', 'networking', 'registration', 'coffee', 
  'dinner', 'reception', 'opening', 'closing', 'keynote', 'intro', 
  'introduction', 'welcome', 'closing', 'wrap-up', 'wrap up'
]);

// Technical categories that should be included
const TECHNICAL_CATEGORIES = new Set([
  'Programming', 'Framework', 'Tech', 'Development', 'Methodology', 'Platform'
]);

// Minimum term length
const MIN_TERM_LENGTH = 3;

// Confidence threshold
const CONFIDENCE_THRESHOLD = 0.7;

export class EventTagEnrichmentService {
  /**
   * Extract candidate tags from event content
   */
  private static extractCandidateTags(event: {
    title: string;
    description?: string | null;
    agenda?: AgendaItem[];
  }): string[] {
    const candidates = new Set<string>();
    
    // Extract from title
    const titleTerms = this.extractTerms(event.title);
    titleTerms.forEach(term => candidates.add(term));
    
    // Extract from description
    if (event.description) {
      const descTerms = this.extractTerms(event.description);
      descTerms.forEach(term => candidates.add(term));
    }
    
    // Extract from agenda
    if (event.agenda && Array.isArray(event.agenda)) {
      event.agenda.forEach(item => {
        if (item.title) {
          const titleTerms = this.extractTerms(item.title);
          titleTerms.forEach(term => candidates.add(term));
        }
        if (item.description) {
          const descTerms = this.extractTerms(item.description);
          descTerms.forEach(term => candidates.add(term));
        }
      });
    }
    
    return Array.from(candidates);
  }

  /**
   * Extract terms from text using simple word boundary detection
   */
  private static extractTerms(text: string): string[] {
    if (!text || text.trim().length === 0) return [];
    
    // Split on word boundaries and filter
    const words = text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length >= MIN_TERM_LENGTH)
      .filter(word => !BLACKLIST_TERMS.has(word));
    
    // Also extract multi-word phrases (2-3 words) that might be technical terms
    const phrases: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      const twoWord = `${words[i]} ${words[i + 1]}`;
      if (twoWord.length >= MIN_TERM_LENGTH && !BLACKLIST_TERMS.has(twoWord)) {
        phrases.push(twoWord);
      }
      if (i < words.length - 2) {
        const threeWord = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        if (threeWord.length >= MIN_TERM_LENGTH && !BLACKLIST_TERMS.has(threeWord)) {
          phrases.push(threeWord);
        }
      }
    }
    
    return [...words, ...phrases];
  }

  /**
   * Map candidate terms to canonical tags in event_tags table
   */
  private static async mapToCanonicalTags(
    candidates: string[],
    supabaseClient: SupabaseClientType
  ): Promise<TagMatch[]> {
    if (candidates.length === 0) return [];
    
    // Get all canonical tags from database
    const { data: allTags, error } = await supabaseClient
      .from('event_tags')
      .select('id, event_tag, category');
    
    if (error || !allTags) {
      console.error('Error fetching canonical tags:', error);
      return [];
    }
    
    // Create lookup maps - store full tag info including event_tag name
    const tagMap = new Map<string, { id: string; event_tag: string; category: string }>();
    allTags.forEach(tag => {
      const normalized = tag.event_tag.toLowerCase();
      tagMap.set(normalized, { 
        id: tag.id, 
        event_tag: tag.event_tag,
        category: tag.category || 'general' 
      });
    });
    
    // Initialize similarity map from TagBasedMatchingService
    // We'll use a static method to get similarities if available
    const matches: TagMatch[] = [];
    const matchedTagIds = new Set<string>(); // Prevent duplicates by tag ID
    
    // Get similarity map (we'll need to access it)
    const similarityMap = this.getSimilarityMap();
    
    for (const candidate of candidates) {
      const normalizedCandidate = candidate.toLowerCase();
      
      // 1. Exact match (confidence = 1.0)
      if (tagMap.has(normalizedCandidate)) {
        const tag = tagMap.get(normalizedCandidate)!;
        if (this.shouldIncludeTag(tag.category)) {
          // Check if we've already added this tag ID
          if (!matchedTagIds.has(tag.id)) {
            matches.push({
              tagId: tag.id,
              tagName: tag.event_tag,
              category: tag.category,
              confidence: 1.0,
              matchType: 'exact'
            });
            matchedTagIds.add(tag.id);
          }
          continue;
        }
      }
      
      // 2. Synonym match (confidence = 0.8)
      const synonymMatch = this.findSynonymMatch(normalizedCandidate, tagMap, similarityMap);
      if (synonymMatch && synonymMatch.confidence >= CONFIDENCE_THRESHOLD) {
        if (!matchedTagIds.has(synonymMatch.tagId)) {
          matches.push(synonymMatch);
          matchedTagIds.add(synonymMatch.tagId);
        }
        continue;
      }
      
      // 3. Category match (confidence = 0.6) - skip, below threshold
      // 4. Partial match (confidence = 0.5) - skip, below threshold
    }
    
    // Filter by confidence threshold
    return matches.filter(m => m.confidence > CONFIDENCE_THRESHOLD);
  }

  /**
   * Find synonym match using TAG_SIMILARITIES
   */
  private static findSynonymMatch(
    candidate: string,
    tagMap: Map<string, { id: string; event_tag: string; category: string }>,
    similarityMap: Map<string, Set<string>>
  ): TagMatch | null {
    // Check if candidate is a synonym of any canonical tag
    for (const [canonicalTag, synonyms] of similarityMap.entries()) {
      if (synonyms.has(candidate)) {
        // Candidate is a synonym of canonicalTag
        const normalizedCanonical = canonicalTag.toLowerCase();
        if (tagMap.has(normalizedCanonical)) {
          const tag = tagMap.get(normalizedCanonical)!;
          if (this.shouldIncludeTag(tag.category)) {
            return {
              tagId: tag.id,
              tagName: tag.event_tag,
              category: tag.category,
              confidence: 0.8,
              matchType: 'synonym'
            };
          }
        }
      }
    }
    
    // Check if any canonical tag is a synonym of candidate
    const candidateSynonyms = similarityMap.get(candidate);
    if (candidateSynonyms) {
      for (const synonym of candidateSynonyms) {
        const normalizedSynonym = synonym.toLowerCase();
        if (tagMap.has(normalizedSynonym)) {
          const tag = tagMap.get(normalizedSynonym)!;
          if (this.shouldIncludeTag(tag.category)) {
            return {
              tagId: tag.id,
              tagName: tag.event_tag,
              category: tag.category,
              confidence: 0.8,
              matchType: 'synonym'
            };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Get similarity map from TagBasedMatchingService
   * We'll use the same RAW_TAG_SIMILARITIES data and initialize it the same way
   */
  private static getSimilarityMap(): Map<string, Set<string>> {
    // Use the same similarity data as TagBasedMatchingService
    const RAW_SIMILARITIES: Record<string, string[]> = {
      'javascript': ['js', 'node.js', 'nodejs', 'typescript', 'ts'],
      'python': ['django', 'flask', 'fastapi', 'pandas', 'numpy'],
      'react': ['jsx', 'next.js', 'nextjs', 'frontend', 'javascript'],
      'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning'],
      'machine learning': ['ai', 'artificial intelligence', 'data science', 'ml'],
      'data science': ['machine learning', 'ai', 'analytics', 'data analysis'],
      'workshop': ['training', 'bootcamp', 'masterclass', 'hands-on'],
      'conference': ['summit', 'convention', 'symposium'],
      'meetup': ['networking', 'social', 'community'],
      'webinar': ['online', 'virtual', 'livestream'],
      'beginner': ['intro', '101', 'fundamentals', 'basics'],
      'intermediate': ['advanced', 'experienced', 'professional'],
      'advanced': ['expert', 'senior', 'master', 'specialist'],
      'fintech': ['financial technology', 'banking', 'payments'],
      'healthcare': ['health tech', 'medical', 'biotech'],
      'ecommerce': ['online retail', 'marketplace', 'shopping'],
      'startup': ['entrepreneurship', 'founder', 'venture'],
      'leadership': ['management', 'team lead', 'director'],
      'communication': ['presentation', 'public speaking', 'writing'],
      'project management': ['agile', 'scrum', 'planning']
    };
    
    const similarityMap = new Map<string, Set<string>>();
    
    Object.entries(RAW_SIMILARITIES).forEach(([key, values]) => {
      const normalizedKey = key.toLowerCase();
      if (!similarityMap.has(normalizedKey)) {
        similarityMap.set(normalizedKey, new Set());
      }
      
      values.forEach(val => {
        const normalizedVal = val.toLowerCase();
        similarityMap.get(normalizedKey)!.add(normalizedVal);
        
        if (!similarityMap.has(normalizedVal)) {
          similarityMap.set(normalizedVal, new Set());
        }
        similarityMap.get(normalizedVal)!.add(normalizedKey);
      });
    });
    
    return similarityMap;
  }

  /**
   * Check if tag category should be included
   */
  private static shouldIncludeTag(category: string): boolean {
    return TECHNICAL_CATEGORIES.has(category);
  }

  /**
   * Check if event should be enriched (has no tags or needs refresh)
   */
  static async shouldEnrich(
    eventId: string,
    supabaseClient: SupabaseClientType
  ): Promise<boolean> {
    // Check if event already has tags
    const { data: existingTags, error } = await supabaseClient
      .from('event_tag_relations')
      .select('tag_id')
      .eq('event_id', eventId)
      .limit(1);
    
    if (error) {
      console.error('Error checking existing tags:', error);
      return true; // Enrich on error to be safe
    }
    
    // Enrich if no tags exist
    return !existingTags || existingTags.length === 0;
  }

  /**
   * Enrich event with tags extracted from content
   */
  static async enrichEventTags(
    eventId: string,
    event: {
      title: string;
      description?: string | null;
      agenda?: AgendaItem[];
    },
    supabaseClient: SupabaseClientType
  ): Promise<EnrichmentResult> {
    try {
      // Check if enrichment is needed
      const needsEnrichment = await this.shouldEnrich(eventId, supabaseClient);
      if (!needsEnrichment) {
        return {
          success: true,
          tagsAssigned: 0,
          tagsSkipped: 0
        };
      }
      
      // Extract candidate tags
      const candidates = this.extractCandidateTags(event);
      
      if (candidates.length === 0) {
        return {
          success: true,
          tagsAssigned: 0,
          tagsSkipped: 0
        };
      }
      
      // Map to canonical tags
      const tagMatches = await this.mapToCanonicalTags(candidates, supabaseClient);
      
      if (tagMatches.length === 0) {
        return {
          success: true,
          tagsAssigned: 0,
          tagsSkipped: candidates.length
        };
      }
      
      // Check existing tags to prevent duplicates (idempotent)
      const { data: existingRelations } = await supabaseClient
        .from('event_tag_relations')
        .select('tag_id')
        .eq('event_id', eventId);
      
      const existingTagIds = new Set(
        (existingRelations || []).map(r => r.tag_id)
      );
      
      // Filter out tags that already exist
      const newTags = tagMatches.filter(m => !existingTagIds.has(m.tagId));
      
      if (newTags.length === 0) {
        return {
          success: true,
          tagsAssigned: 0,
          tagsSkipped: tagMatches.length
        };
      }
      
      // Insert new tag relations
      const relations = newTags.map(match => ({
        event_id: eventId,
        tag_id: match.tagId
      }));
      
      const { error: insertError } = await supabaseClient
        .from('event_tag_relations')
        .insert(relations);
      
      if (insertError) {
        console.error('Error inserting tag relations:', insertError);
        return {
          success: false,
          tagsAssigned: 0,
          tagsSkipped: newTags.length,
          error: insertError.message
        };
      }
      
      return {
        success: true,
        tagsAssigned: newTags.length,
        tagsSkipped: tagMatches.length - newTags.length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error enriching event tags:', error);
      return {
        success: false,
        tagsAssigned: 0,
        tagsSkipped: 0,
        error: errorMessage
      };
    }
  }
}

