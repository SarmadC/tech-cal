/**
 * Tag Similarity Maps and Category Weights
 *
 * Extracted from TagBasedMatchingService for better maintainability.
 * Contains all similarity mappings for transitive tag matching.
 *
 * Used by: TagBasedMatchingService
 */

/**
 * Tag similarity map type
 */
export interface TagSimilarityMap {
  [key: string]: string[];
}

/**
 * Raw tag similarity mappings for better matching
 * We normalize this to be bidirectional at runtime
 */
export const RAW_TAG_SIMILARITIES: TagSimilarityMap = {
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
  'project management': ['agile', 'scrum', 'planning'],
};

/**
 * Category weights for different types of matches
 */
export const CATEGORY_WEIGHTS: Record<string, number> = {
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
  'Agenda': 0.7,           // Good weight for agenda-derived matches
};

// Normalized bidirectional similarity map - cached after initialization
let TAG_SIMILARITIES: Map<string, Set<string>> | null = null;

/**
 * Initialize the bidirectional similarity map
 */
export function initializeSimilarities(): void {
  if (TAG_SIMILARITIES) return;

  TAG_SIMILARITIES = new Map<string, Set<string>>();

  Object.entries(RAW_TAG_SIMILARITIES).forEach(([key, values]) => {
    const normalizedKey = key.toLowerCase();
    if (!TAG_SIMILARITIES!.has(normalizedKey)) {
      TAG_SIMILARITIES!.set(normalizedKey, new Set());
    }

    values.forEach(val => {
      const normalizedVal = val.toLowerCase();
      // A -> B
      TAG_SIMILARITIES!.get(normalizedKey)!.add(normalizedVal);

      // B -> A (ensure entry exists first)
      if (!TAG_SIMILARITIES!.has(normalizedVal)) {
        TAG_SIMILARITIES!.set(normalizedVal, new Set());
      }
      TAG_SIMILARITIES!.get(normalizedVal)!.add(normalizedKey);
    });
  });
}

/**
 * Get the normalized bidirectional similarity map
 */
export function getTagSimilarities(): Map<string, Set<string>> {
  initializeSimilarities();
  return TAG_SIMILARITIES!;
}

/**
 * Get category weight for a tag category
 */
export function getCategoryWeight(category: string): number {
  return CATEGORY_WEIGHTS[category] ?? 0.5;
}

/**
 * Expand a search term using TAG_SIMILARITIES mappings
 * Returns the original term plus all similar terms for broader search coverage
 *
 * Example: "js" -> ["js", "javascript", "node.js", "nodejs", "typescript", "ts"]
 */
export function expandSearchTerm(searchTerm: string): string[] {
  initializeSimilarities();

  if (!searchTerm || !searchTerm.trim()) return [];

  const normalized = searchTerm.toLowerCase().trim();
  const expansions = new Set<string>();

  // Always include the original term
  expansions.add(normalized);

  // Add similar terms from TAG_SIMILARITIES map
  const similarities = TAG_SIMILARITIES?.get(normalized);
  if (similarities) {
    similarities.forEach(term => expansions.add(term));
  }

  return Array.from(expansions);
}

/**
 * Expand multiple search terms with synonyms from TAG_SIMILARITIES
 */
export function expandSearchTermsWithSynonyms(terms: string[]): string[] {
  initializeSimilarities();

  const expanded = new Set<string>();

  for (const term of terms) {
    if (!term.trim()) continue;
    const normalizedTerm = term.toLowerCase().trim();
    expanded.add(normalizedTerm);

    const similarities = TAG_SIMILARITIES?.get(normalizedTerm);
    if (similarities) {
      similarities.forEach(t => expanded.add(t));
    }
  }

  return Array.from(expanded);
}
