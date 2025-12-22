/**
 * Matching Utilities - Barrel Export
 *
 * Re-exports all matching utility functions for convenient imports.
 */

// Tag similarity maps and utilities
export {
  RAW_TAG_SIMILARITIES,
  CATEGORY_WEIGHTS,
  initializeSimilarities,
  getTagSimilarities,
  getCategoryWeight,
  expandSearchTerm,
  expandSearchTermsWithSynonyms,
} from './tagSimilarityMaps';

export type { TagSimilarityMap } from './tagSimilarityMaps';

// Text search utilities
export {
  sanitizeTextSearchTerm,
  buildTextSearchFilters,
  normalizeQueryTerms,
  buildCandidateTerms,
  extractHighValueTerms,
} from './textSearchUtils';

// Profile boost utilities
export {
  calculateGoalBoost,
  calculateLearningStyleBoost,
  calculateNetworkingBoost,
  calculateRecencyBoost,
  calculatePopularityBoost,
  calculateProfileBoost,
  toTitleCase,
} from './profileBoostUtils';

export type { TagMatchResult, ProfileBoostResult } from './profileBoostUtils';
