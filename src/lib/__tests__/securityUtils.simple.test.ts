// src/lib/__tests__/securityUtils.simple.test.ts

import { describe, it, expect } from 'vitest';
import { sanitizeFtsQuery } from '../securityUtils';

describe('securityUtils', () => {
  describe('sanitizeFtsQuery', () => {
    it('should remove dangerous characters from FTS query', () => {
      expect(sanitizeFtsQuery('test<script>alert("xss")</script>')).toBe('testscriptalert"xss"/script');
      expect(sanitizeFtsQuery('query<with>dangerous<chars>')).toBe('querywithdangerouschars');
      expect(sanitizeFtsQuery('normal query')).toBe('normal & query');
      expect(sanitizeFtsQuery('')).toBe('');
    });

    it('should handle null and undefined inputs', () => {
      expect(() => sanitizeFtsQuery(null as unknown as string)).toThrow();
      expect(() => sanitizeFtsQuery(undefined as unknown as string)).toThrow();
    });

    it('should preserve safe characters', () => {
      expect(sanitizeFtsQuery('test-query_with.special+chars')).toBe('test-query_with.special+chars');
      expect(sanitizeFtsQuery('123 numbers')).toBe('123 & numbers');
      expect(sanitizeFtsQuery('UPPERCASE lowercase')).toBe('UPPERCASE & lowercase');
    });

    it('should handle empty query', () => {
      expect(sanitizeFtsQuery('   ')).toBe('');
      expect(sanitizeFtsQuery('')).toBe('');
    });

    it('should join multiple terms with joiner', () => {
      expect(sanitizeFtsQuery('react javascript typescript')).toBe('react & javascript & typescript');
      expect(sanitizeFtsQuery('react javascript typescript', ' | ')).toBe('react | javascript | typescript');
    });

    it('should remove special FTS operators', () => {
      expect(sanitizeFtsQuery('test & query | with ! special : chars')).toBe('test & query & with & special & chars');
      expect(sanitizeFtsQuery('test(query)with<special>chars')).toBe('testquerywithspecialchars');
    });
  });
});
