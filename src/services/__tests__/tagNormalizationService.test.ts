import { describe, it, expect } from 'vitest';
import { TagNormalizationService } from '../tagNormalizationService';

describe('TagNormalizationService', () => {
  describe('normalizeTag', () => {
    it('excludes known noise tags (language codes, format indicators)', () => {
      const excluded = ['en', 'fr', 'de', 'online', 'free', 'virtual'];
      for (const tag of excluded) {
        const result = TagNormalizationService.normalizeTag(tag);
        expect(result.wasExcluded).toBe(true);
        expect(result.normalizedTag).toBe('');
      }
    });

    it('excludes tags shorter than minimum length unless valid short tags', () => {
      const result = TagNormalizationService.normalizeTag('ab');
      expect(result.wasExcluded).toBe(true);
      expect(result.excludeReason).toBe('too_short');
    });

    it('allows known short tags (AI, ML, UX, UI, etc.)', () => {
      const validShort = ['ai', 'ml', 'ux', 'ui'];
      for (const tag of validShort) {
        const result = TagNormalizationService.normalizeTag(tag);
        expect(result.wasExcluded).toBe(false);
        expect(result.normalizedTag.length).toBeGreaterThan(0);
      }
    });

    it('maps synonyms to canonical form', () => {
      const mappings: [string, string][] = [
        ['js', 'JavaScript'],
        ['typescript', 'TypeScript'],
        ['ts', 'TypeScript'],
        ['react.js', 'React'],
        ['reactjs', 'React'],
        ['node.js', 'Node.js'],
        ['nodejs', 'Node.js'],
        ['py', 'Python'],
        ['python', 'Python'],
        ['golang', 'Go'],
        ['k8s', 'Kubernetes'],
        ['aws', 'AWS'],
        ['gcp', 'GCP'],
        ['ml', 'Machine Learning'],
        ['ai', 'AI'],
        ['devops', 'DevOps'],
        ['devsecops', 'DevSecOps'],
      ];
      for (const [input, expected] of mappings) {
        const result = TagNormalizationService.normalizeTag(input);
        expect(result.normalizedTag).toBe(expected);
        expect(result.wasNormalized).toBe(true);
      }
    });

    it('preserves tags that are already canonical via title case', () => {
      const result = TagNormalizationService.normalizeTag('Kubernetes');
      expect(result.normalizedTag).toBe('Kubernetes');
    });

    it('applies title case to unknown tags', () => {
      const result = TagNormalizationService.normalizeTag('data engineering');
      expect(result.normalizedTag).toBe('Data Engineering');
    });

    it('detects and excludes malformed tags (JSON-like patterns)', () => {
      const malformed = ['{"type":"event"}'];
      for (const tag of malformed) {
        const result = TagNormalizationService.normalizeTag(tag);
        expect(result.wasExcluded).toBe(true);
        expect(result.excludeReason).toBe('malformed');
      }
    });

    it('trims whitespace', () => {
      const result = TagNormalizationService.normalizeTag('  react.js  ');
      expect(result.normalizedTag).toBe('React');
    });

    it('handles empty string', () => {
      const result = TagNormalizationService.normalizeTag('');
      expect(result.wasExcluded).toBe(true);
    });

    it('handles tags with only whitespace', () => {
      const result = TagNormalizationService.normalizeTag('   ');
      expect(result.wasExcluded).toBe(true);
    });
  });

  describe('normalizeTags', () => {
    it('returns unique normalized tags', () => {
      const result = TagNormalizationService.normalizeTags(['React', 'react.js', 'reactjs']);
      expect(result.normalized).toEqual(['React']);
      expect(result.deduped).toBe(2);
    });

    it('excludes noise and deduplicates in batch', () => {
      const result = TagNormalizationService.normalizeTags([
        'typescript',
        'ts',
        'online',
        'ai',
      ]);
      // typescript and ts both map to TypeScript -> deduplicated
      expect(result.normalized).toContain('TypeScript');
      // online is excluded
      expect(result.normalized).not.toContain('online');
      // ai maps to AI
      expect(result.normalized).toContain('AI');
      expect(result.deduped).toBe(1); // ts deduped with typescript
    });

    it('reports exclusion statistics', () => {
      const result = TagNormalizationService.normalizeTags(['en', 'fr', 'React']);
      expect(result.excluded.length).toBe(2);
      expect(result.normalized).toContain('React');
    });

    it('handles empty array', () => {
      const result = TagNormalizationService.normalizeTags([]);
      expect(result.normalized).toEqual([]);
      expect(result.excluded).toEqual([]);
      expect(result.deduped).toBe(0);
    });

    it('handles array with all excluded tags', () => {
      const result = TagNormalizationService.normalizeTags(['en', 'fr', 'de', 'free']);
      expect(result.normalized).toEqual([]);
      expect(result.excluded.length).toBe(4);
    });
  });

  describe('getCanonicalTag', () => {
    it('returns canonical form for known synonym', () => {
      expect(TagNormalizationService.getCanonicalTag('reactjs')).toBe('React');
    });

    it('returns original tag for unknown tag', () => {
      expect(TagNormalizationService.getCanonicalTag('some-random-tag-xyz')).toBe('some-random-tag-xyz');
    });

    it('is case insensitive', () => {
      expect(TagNormalizationService.getCanonicalTag('TYPESCRIPT')).toBe('TypeScript');
      expect(TagNormalizationService.getCanonicalTag('Js')).toBe('JavaScript');
    });
  });

  describe('areTagsEquivalent', () => {
    it('returns true for synonyms that map to the same canonical form', () => {
      expect(TagNormalizationService.areTagsEquivalent('js', 'javascript')).toBe(true);
      expect(TagNormalizationService.areTagsEquivalent('ts', 'typescript')).toBe(true);
      expect(TagNormalizationService.areTagsEquivalent('reactjs', 'react.js')).toBe(true);
    });

    it('returns true for case-insensitive same tag', () => {
      expect(TagNormalizationService.areTagsEquivalent('React', 'react')).toBe(true);
    });

    it('returns false for different tags', () => {
      expect(TagNormalizationService.areTagsEquivalent('React', 'Vue')).toBe(false);
    });

    it('returns false if either tag is excluded', () => {
      expect(TagNormalizationService.areTagsEquivalent('en', 'fr')).toBe(false);
    });
  });
});
