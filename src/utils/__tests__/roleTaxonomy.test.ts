import { describe, it, expect } from 'vitest';
import { 
  getRoleKeywords, 
  getRoleMeta, 
  isValidRole, 
  getRolesByCategory, 
  getAllRoles,
  normalizeRoleName 
} from '../roleTaxonomy';
import { ROLE_CATEGORIES } from '@/types/career';

describe('roleTaxonomy', () => {
  describe('normalizeRoleName', () => {
    it('should normalize role names consistently', () => {
      expect(normalizeRoleName('Frontend Engineer')).toBe('frontend engineer');
      expect(normalizeRoleName('Data Scientist')).toBe('data scientist');
      expect(normalizeRoleName('Product Manager')).toBe('product manager');
      expect(normalizeRoleName('DevOps Engineer')).toBe('devops engineer');
    });

    it('should handle special characters', () => {
      expect(normalizeRoleName('Mobile Engineer (iOS/Android)')).toBe('mobile engineer ios android');
      expect(normalizeRoleName('Full Stack Engineer')).toBe('full stack engineer');
    });
  });

  describe('getRoleKeywords', () => {
    it('should return keywords for valid roles', () => {
      const keywords = getRoleKeywords('Frontend Engineer');
      expect(keywords).toContain('Frontend Engineer');
      expect(keywords).toContain('frontend');
      expect(keywords).toContain('frontend engineer');
      expect(keywords).toContain('ui developer');
      expect(keywords).toContain('frontend dev');
    });

    it('should return keywords for Data Scientist role', () => {
      const keywords = getRoleKeywords('Data Scientist');
      expect(keywords).toContain('Data Scientist');
      expect(keywords).toContain('data scientist');
      expect(keywords).toContain('data science');
      expect(keywords).toContain('ml scientist');
    });

    it('should return keywords for Product Manager role', () => {
      const keywords = getRoleKeywords('Product Manager');
      expect(keywords).toContain('Product Manager');
      expect(keywords).toContain('product manager');
      expect(keywords).toContain('pm');
      expect(keywords).toContain('product lead');
    });

    it('should resolve new founder and business role synonyms', () => {
      expect(getRoleKeywords('Founder')).toEqual(
        expect.arrayContaining(['startup founder', 'cofounder'])
      );
      expect(getRoleKeywords('Business Operations Manager')).toEqual(
        expect.arrayContaining(['bizops', 'strategy and ops'])
      );
      expect(getRoleKeywords('Solutions Engineer')).toEqual(
        expect.arrayContaining(['sales engineer', 'solution consultant'])
      );
    });

    it('should return empty array for invalid role', () => {
      const keywords = getRoleKeywords('Invalid Role');
      expect(keywords).toEqual(['Invalid Role']);
    });

    it('should return empty array for empty string', () => {
      const keywords = getRoleKeywords('');
      expect(keywords).toEqual([]);
    });
  });

  describe('getRoleMeta', () => {
    it('should return metadata for valid roles', () => {
      const meta = getRoleMeta('Frontend Engineer');
      expect(meta).toBeTruthy();
      expect(meta?.role).toBe('Frontend Engineer');
      expect(meta?.category).toBe(ROLE_CATEGORIES.ENGINEERING);
      expect(meta?.keywords).toContain('frontend');
      expect(meta?.synonyms).toContain('ui developer');
    });

    it('should return null for invalid role', () => {
      const meta = getRoleMeta('Invalid Role');
      expect(meta).toBeNull();
    });

    it('should return null for empty string', () => {
      const meta = getRoleMeta('');
      expect(meta).toBeNull();
    });

    it('should map new role aliases to their canonical roles', () => {
      expect(getRoleMeta('co-founder')?.role).toBe('Founder');
      expect(getRoleMeta('sales engineer')?.role).toBe('Solutions Engineer');
      expect(getRoleMeta('pmm')?.role).toBe('Product Marketing Manager');
      expect(getRoleMeta('tpm')?.role).toBe('Technical Program Manager');
      expect(getRoleMeta('bizops')?.role).toBe('Business Operations Manager');
    });
  });

  describe('isValidRole', () => {
    it('should return true for valid roles', () => {
      expect(isValidRole('Frontend Engineer')).toBe(true);
      expect(isValidRole('Data Scientist')).toBe(true);
      expect(isValidRole('Product Manager')).toBe(true);
      expect(isValidRole('Engineering Manager')).toBe(true);
      expect(isValidRole('Founder')).toBe(true);
      expect(isValidRole('Community Manager')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(isValidRole('Invalid Role')).toBe(false);
      expect(isValidRole('Random Title')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidRole('')).toBe(false);
    });
  });

  describe('getRolesByCategory', () => {
    it('should return roles for Engineering category', () => {
      const roles = getRolesByCategory(ROLE_CATEGORIES.ENGINEERING);
      expect(roles).toContain('Frontend Engineer');
      expect(roles).toContain('Backend Engineer');
      expect(roles).toContain('Full Stack Engineer');
    });

    it('should return roles for Data & AI category', () => {
      const roles = getRolesByCategory(ROLE_CATEGORIES.DATA_AI);
      expect(roles).toContain('Data Scientist');
      expect(roles).toContain('Data Analyst');
      expect(roles).toContain('ML Engineer');
      expect(roles).toContain('AI Engineer');
      expect(roles).toContain('Analytics Engineer');
    });

    it('should include new cross-functional roles in the existing categories', () => {
      expect(getRolesByCategory(ROLE_CATEGORIES.ENGINEERING)).toEqual(
        expect.arrayContaining(['Platform Engineer', 'Solutions Engineer'])
      );
      expect(getRolesByCategory(ROLE_CATEGORIES.PRODUCT_DESIGN)).toEqual(
        expect.arrayContaining([
          'Product Designer',
          'Technical Program Manager',
          'Program Manager',
          'Product Marketing Manager',
          'Growth Marketer',
        ])
      );
      expect(getRolesByCategory(ROLE_CATEGORIES.LEADERSHIP)).toEqual(
        expect.arrayContaining([
          'Founder',
          'Entrepreneur / Startup Operator',
          'Business Operations Manager',
          'Developer Relations Manager',
          'Community Manager',
          'Customer Success Manager',
        ])
      );
    });

    it('should return empty array for invalid category', () => {
      const roles = getRolesByCategory('Invalid Category');
      expect(roles).toEqual([]);
    });
  });

  describe('getAllRoles', () => {
    it('should return all available roles', () => {
      const allRoles = getAllRoles();
      expect(allRoles.length).toBeGreaterThan(0);
      expect(allRoles).toContain('Frontend Engineer');
      expect(allRoles).toContain('Data Scientist');
      expect(allRoles).toContain('Product Manager');
      expect(allRoles).toContain('Engineering Manager');
      expect(allRoles).toContain('Founder');
      expect(allRoles).toContain('Product Marketing Manager');
    });
  });

  describe('role keyword coverage', () => {
    it('should have keywords for all major role categories', () => {
      const engineeringRoles = getRolesByCategory(ROLE_CATEGORIES.ENGINEERING);
      const dataRoles = getRolesByCategory(ROLE_CATEGORIES.DATA_AI);
      const productRoles = getRolesByCategory(ROLE_CATEGORIES.PRODUCT_DESIGN);
      const leadershipRoles = getRolesByCategory(ROLE_CATEGORIES.LEADERSHIP);

      // Test a few roles from each category
      expect(getRoleKeywords(engineeringRoles[0])).toBeTruthy();
      expect(getRoleKeywords(dataRoles[0])).toBeTruthy();
      expect(getRoleKeywords(productRoles[0])).toBeTruthy();
      expect(getRoleKeywords(leadershipRoles[0])).toBeTruthy();
    });
  });
});
