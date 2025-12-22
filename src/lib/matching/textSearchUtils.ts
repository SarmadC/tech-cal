/**
 * Text Search Utilities
 *
 * Extracted from TagBasedMatchingService for better maintainability.
 * Contains functions for text-based event searching and filtering.
 *
 * Used by: TagBasedMatchingService
 */

import { CareerProfile } from '@/types/career';
import { getRoleKeywords } from '@/utils/roleTaxonomy';
import { expandSearchTermsWithSynonyms } from './tagSimilarityMaps';

/**
 * Sanitize a text search term for SQL LIKE queries
 * Returns null if term is too short (< 3 chars)
 */
export function sanitizeTextSearchTerm(term: string): string | null {
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

/**
 * Build text search filters for Supabase ILIKE queries
 */
export function buildTextSearchFilters(terms: string[]): string[] {
  const clauses: string[] = [];
  terms.forEach(term => {
    const sanitized = sanitizeTextSearchTerm(term);
    if (!sanitized) return;
    const pattern = `%${sanitized}%`;
    clauses.push(`title.ilike.${pattern}`, `description.ilike.${pattern}`);
  });
  return clauses;
}

/**
 * Normalize and deduplicate query terms
 */
export function normalizeQueryTerms(terms: string[]): string[] {
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

/**
 * Build candidate terms from career profile for matching
 */
export function buildCandidateTerms(careerProfile: CareerProfile): string[] {
  const terms = new Set<string>();
  const queue: string[] = [];

  const addToQueue = (term: string) => {
    if (!term || term.trim().length === 0) return;

    const normalized = term.trim().toLowerCase();

    // Skip obviously bad terms (less than 2 chars or single char repeats)
    if (normalized.length < 2 || /^(.)\1*$/.test(normalized)) return;

    // Skip numeric-only terms
    if (/^\d+$/.test(normalized)) return;

    if (!terms.has(normalized)) {
      terms.add(normalized);
      queue.push(normalized);
    }
  };

  // Add primary skills
  (careerProfile.primarySkills || []).forEach(addToQueue);

  // Add interests
  (careerProfile.interests || []).forEach(addToQueue);

  // Add career goals
  (careerProfile.careerGoals || []).forEach(addToQueue);

  // Add skills to learn
  (careerProfile.skillsToLearn || []).forEach(addToQueue);

  // Add role-based keywords
  if (careerProfile.currentRole) {
    const roleKeywords = getRoleKeywords(careerProfile.currentRole);
    roleKeywords.forEach(addToQueue);
  }

  // Expand terms using synonym mappings for broader search coverage
  const expandedQueue = expandSearchTermsWithSynonyms(queue);

  return expandedQueue;
}

/**
 * Extract high-value terms for text search query
 * Selection: Role + Top 2 Primary Skills + fallback to SkillsToLearn
 * Limit: 5 terms, min 3 chars
 */
export function extractHighValueTerms(careerProfile: CareerProfile): string[] {
  const terms: string[] = [];

  const addIfValid = (term?: string) => {
    if (!term || term.trim().length < 3) return;
    const normalized = term.trim().toLowerCase();
    if (!terms.includes(normalized)) {
      terms.push(normalized);
    }
  };

  // 1. Role keywords (highest priority)
  if (careerProfile.currentRole) {
    const roleKeywords = getRoleKeywords(careerProfile.currentRole);
    roleKeywords.slice(0, 2).forEach(addIfValid);
  }

  // 2. Top primary skills
  (careerProfile.primarySkills || []).slice(0, 2).forEach(addIfValid);

  // 3. Skills to learn (fallback)
  if (terms.length < 3) {
    (careerProfile.skillsToLearn || []).slice(0, 2).forEach(addIfValid);
  }

  // 4. Interests (final fallback)
  if (terms.length < 3) {
    (careerProfile.interests || []).slice(0, 2).forEach(addIfValid);
  }

  // Limit to 5 terms
  return terms.slice(0, 5);
}
