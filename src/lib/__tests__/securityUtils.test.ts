// src/lib/__tests__/securityUtils.test.ts

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
      expect(sanitizeFtsQuery(null as unknown as string)).toBe('');
      expect(sanitizeFtsQuery(undefined as unknown as string)).toBe('');
    });

    it('should preserve safe characters', () => {
      expect(sanitizeFtsQuery('test-query_with.special+chars')).toBe('test-query_with.special+chars');
      expect(sanitizeFtsQuery('123 numbers')).toBe('123 & numbers');
      expect(sanitizeFtsQuery('UPPERCASE lowercase')).toBe('UPPERCASE & lowercase');
    });

    it('should handle complex XSS attempts', () => {
      const maliciousQuery = 'search<img src=x onerror=alert(1)>';
      expect(sanitizeFtsQuery(maliciousQuery)).toBe('searchimg & src=x & onerror=alert1');
    });
  });

  // TODO: Add tests for validateEmail, sanitizeInput, escapeHtml when they are implemented

  describe('integration tests', () => {
    it('should handle SQL injection attempts in FTS queries', () => {
      const sqlInjection = "'; DROP TABLE events; --";
      const sanitized = sanitizeFtsQuery(sqlInjection);
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('--');
    });

    // TODO: Add integration tests for validateEmail and sanitizeInput when implemented
  });
});
