// src/services/scoring/strategies/__tests__/DeterministicV2Strategy.skillsToLearn.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeterministicV2Strategy } from '../DeterministicV2Strategy';
import type { Event } from '@/types';
import type { CareerProfile } from '@/types/career';

// Mock TagBasedMatchingService
import { TagBasedMatchingService } from '@/services/tagBasedMatchingService';

vi.mock('@/services/tagBasedMatchingService', () => ({
  TagBasedMatchingService: {
    calculateTagSimilarity: vi.fn(() => ({ score: 50, matchedTags: [], matchedCategories: [], explanation: 'Test match' })),
  },
}));

describe('DeterministicV2Strategy - Skills to Learn', () => {
  let strategy: DeterministicV2Strategy;

  beforeEach(() => {
    strategy = new DeterministicV2Strategy();
    vi.clearAllMocks();
  });

  describe('60/40 Split Integration', () => {
    it('should use TagBasedMatchingService which handles 60/40 split for beginners', () => {
      const event: Event = {
        id: '1',
        title: 'TypeScript Workshop',
        description: 'Learn TypeScript fundamentals',
        startTime: '2024-01-01T10:00:00Z',
        tags: [
          { id: '1', name: 'TypeScript', category: 'Programming', color: '#blue' },
          { id: '2', name: 'JavaScript', category: 'Programming', color: '#yellow' },
        ],
      } as Event;

      const careerProfile: CareerProfile = {
        primarySkills: ['React'], // <3 skills = beginner
        skillsToLearn: ['TypeScript', 'Node.js'],
        learningStyle: ['hands-on'],
      } as CareerProfile;

      const score = strategy['calculateSkillMatchingScore'](event, careerProfile);

      // TagBasedMatchingService should be called (mocked to return 50)
      expect(score).toBeGreaterThanOrEqual(50);
    });

    it('should work for non-beginners with skills to learn', () => {
      const event: Event = {
        id: '1',
        title: 'Advanced TypeScript',
        description: 'Deep dive into TypeScript',
        startTime: '2024-01-01T10:00:00Z',
        tags: [
          { id: '1', name: 'TypeScript', category: 'Programming', color: '#blue' },
        ],
      } as Event;

      const careerProfile: Partial<CareerProfile> = {
        primarySkills: ['React', 'JavaScript', 'Node.js', 'Python'], // 4 skills = not beginner
        skillsToLearn: ['TypeScript'],
        learningStyle: ['self-paced'],
      };

      const score = strategy['calculateSkillMatchingScore'](event, careerProfile);

      expect(score).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Keyword Fallback for Sparse Tags', () => {
    it('should apply keyword fallback when event has <5 tags', () => {
      const event: Event = {
        id: '1',
        title: 'TypeScript and Node.js Workshop',
        description: 'Learn TypeScript and Node.js from scratch',
        startTime: '2024-01-01T10:00:00Z',
        tags: [
          { id: '1', name: 'Workshop', category: 'Event-Type', color: '#green' },
          { id: '2', name: 'Programming', category: 'Tech', color: '#blue' },
        ], // Only 2 tags = sparse
      } as Event;

      const careerProfile: CareerProfile = {
        primarySkills: ['React'],
        skillsToLearn: ['TypeScript', 'Node.js'],
        learningStyle: ['hands-on'],
      } as CareerProfile;

      const score = strategy['calculateSkillMatchingScore'](event, careerProfile);

      // Base tag score (50) + keyword fallback contribution
      // Keyword matches: 2 skills * 20 points = 40 * 0.25 = 10 (capped at 20)
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should NOT apply keyword fallback when event has >=5 tags', () => {
      const event: Event = {
        id: '1',
        title: 'TypeScript Workshop',
        description: 'Learn TypeScript',
        startTime: '2024-01-01T10:00:00Z',
        tags: [
          { id: '1', name: 'TypeScript', category: 'Programming', color: '#blue' },
          { id: '2', name: 'JavaScript', category: 'Programming', color: '#yellow' },
          { id: '3', name: 'Workshop', category: 'Event-Type', color: '#green' },
          { id: '4', name: 'Advanced', category: 'Difficulty', color: '#orange' },
          { id: '5', name: 'Hands-on', category: 'Format', color: '#purple' },
        ], // 5 tags = rich
      } as Event;

      const careerProfile: CareerProfile = {
        primarySkills: ['React', 'JavaScript', 'Node.js', 'Python'], // Not beginner (4 skills)
        skillsToLearn: ['TypeScript'],
        learningStyle: ['self-paced'], // Not hands-on
      } as CareerProfile;

      const score = strategy['calculateSkillMatchingScore'](event, careerProfile);

      // Should only use tag-based score (50 from mock), no keyword fallback, no beginner boost
      expect(score).toBe(50);
    });

    it('should cap keyword contribution at 20 points', () => {
      const event: Event = {
        id: '1',
        title: 'TypeScript Node.js React Python Java C++ Rust Go',
        description: 'Learn all programming languages',
        startTime: '2024-01-01T10:00:00Z',
        tags: [], // No tags = sparse
      } as Event;

      const careerProfile: CareerProfile = {
        primarySkills: ['HTML', 'CSS', 'Git', 'Docker'], // Not beginner (4 skills)
        skillsToLearn: ['TypeScript', 'Node.js', 'React', 'Python', 'Java', 'C++', 'Rust', 'Go'],
        learningStyle: ['self-paced'], // Not hands-on
      } as CareerProfile;

      const score = strategy['calculateSkillMatchingScore'](event, careerProfile);

      // 8 matches * 20 = 160 * 0.25 = 40, but capped at 20
      // Base: 50 + cap: 20 = 70 (no beginner boost)
      expect(score).toBeLessThanOrEqual(70);
    });

    it('should skip keyword fallback if no skillsToLearn', () => {
      const event: Event = {
        id: '1',
        title: 'TypeScript Workshop',
        description: 'Learn TypeScript',
        startTime: '2024-01-01T10:00:00Z',
        tags: [{ id: '1', name: 'Workshop', category: 'Event-Type', color: '#green' }], // 1 tag = sparse
      } as Event;

      const careerProfile: CareerProfile = {
        primarySkills: ['React'],
        skillsToLearn: [], // No skills to learn
        learningStyle: [],
      } as CareerProfile;

      const score = strategy['calculateSkillMatchingScore'](event, careerProfile);

      // Only tag-based score (50), no keyword fallback applied
      expect(score).toBe(50);
    });
  });

  describe('Beginner Heuristics', () => {
    it('should apply beginner boost for hands-on learners', () => {
      const event: Event = {
        id: '1',
        title: 'TypeScript 101: Beginner Workshop',
        description: 'Introduction to TypeScript for beginners. No experience required.',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T14:00:00Z', // 4 hours
        prerequisites: 'No experience required',
        tags: [
          { id: '1', name: 'TypeScript', category: 'Programming', color: '#blue' },
          { id: '2', name: 'Workshop', category: 'Event-Type', color: '#green' },
          { id: '3', name: 'Beginner', category: 'Difficulty', color: '#orange' },
        ],
        category: { id: '1', name: 'Workshop', color: '#green' },
      } as Event;

      const careerProfile: CareerProfile = {
        primarySkills: ['React'],
        skillsToLearn: ['TypeScript'],
        learningStyle: ['hands-on'], // Beginner
      } as CareerProfile;

      const score = strategy['calculateSkillMatchingScore'](event, careerProfile);

      // Base (50) + beginner boost (up to 15)
      expect(score).toBeGreaterThan(50);
    });

    it('should NOT apply beginner boost for non-beginners', () => {
      const event: Event = {
        id: '1',
        title: 'TypeScript 101',
        description: 'Beginner friendly',
        startTime: '2024-01-01T10:00:00Z',
        tags: [
          { id: '1', name: 'TypeScript', category: 'Programming', color: '#blue' },
          { id: '2', name: 'JavaScript', category: 'Programming', color: '#yellow' },
          { id: '3', name: 'Programming', category: 'Tech', color: '#green' },
          { id: '4', name: 'Development', category: 'Tech', color: '#purple' },
          { id: '5', name: 'Web', category: 'Tech', color: '#orange' },
        ], // 5 tags = rich (no keyword fallback)
      } as Event;

      const careerProfile: CareerProfile = {
        primarySkills: ['React', 'JavaScript', 'Node.js', 'Python'], // Not beginner (4 skills)
        skillsToLearn: ['TypeScript'],
        learningStyle: ['self-paced'], // Not hands-on
      } as CareerProfile;

      const score = strategy['calculateSkillMatchingScore'](event, careerProfile);

      // Only tag score (50), no beginner boost, no keyword fallback
      expect(score).toBe(50);
    });

    it('should NOT apply beginner boost if no skillsToLearn', () => {
      const event: Event = {
        id: '1',
        title: 'Beginner Workshop',
        description: 'No experience required',
        startTime: '2024-01-01T10:00:00Z',
        tags: [],
      } as Event;

      const careerProfile: CareerProfile = {
        primarySkills: ['React'],
        skillsToLearn: [], // No learning goals
        learningStyle: ['hands-on'],
      } as CareerProfile;

      const score = strategy['calculateSkillMatchingScore'](event, careerProfile);

      // Only tag score (50), no beginner boost
      expect(score).toBe(50);
    });
  });

  describe('calculateBeginnerBoost()', () => {
    it('should award 8 points for beginner keywords', () => {
      const event: Event = {
        id: '1',
        title: 'Beginner TypeScript Workshop',
        description: 'Introduction to TypeScript fundamentals',
        startTime: '2024-01-01T10:00:00Z',
      } as Event;

      const boost = strategy['calculateBeginnerBoost'](event);

      expect(boost).toBeGreaterThanOrEqual(8);
    });

    it('should award 5 points for no prerequisites', () => {
      const event: Event = {
        id: '1',
        title: 'TypeScript Workshop',
        description: 'Learn TypeScript',
        startTime: '2024-01-01T10:00:00Z',
        prerequisites: undefined,
      } as Event;

      const boost = strategy['calculateBeginnerBoost'](event);

      expect(boost).toBeGreaterThanOrEqual(5);
    });

    it('should award 5 points for "no experience required"', () => {
      const event: Event = {
        id: '1',
        title: 'TypeScript Workshop',
        description: 'Learn TypeScript',
        startTime: '2024-01-01T10:00:00Z',
        prerequisites: 'No experience required',
      } as Event;

      const boost = strategy['calculateBeginnerBoost'](event);

      expect(boost).toBeGreaterThanOrEqual(5);
    });

    it('should award 4 points for workshop/training/bootcamp type', () => {
      const event: Event = {
        id: '1',
        title: 'TypeScript Course',
        description: 'Learn TypeScript',
        startTime: '2024-01-01T10:00:00Z',
        category: { id: '1', name: 'Workshop', color: '#green' },
      } as Event;

      const boost = strategy['calculateBeginnerBoost'](event);

      expect(boost).toBeGreaterThanOrEqual(4);
    });

    it('should award 3 points for ideal duration (2-6 hours)', () => {
      const event: Event = {
        id: '1',
        title: 'TypeScript Workshop',
        description: 'Learn TypeScript',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T14:00:00Z', // 4 hours
      } as Event;

      const boost = strategy['calculateBeginnerBoost'](event);

      expect(boost).toBeGreaterThanOrEqual(3);
    });

    it('should cap total boost at 15 points', () => {
      const event: Event = {
        id: '1',
        title: 'Beginner TypeScript 101 Workshop',
        description: 'Introduction to TypeScript fundamentals for beginners. Getting started guide.',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T14:00:00Z', // 4 hours
        prerequisites: 'No experience required',
        category: { id: '1', name: 'Workshop', color: '#green' },
      } as Event;

      const boost = strategy['calculateBeginnerBoost'](event);

      // All criteria met: 8 + 5 + 4 + 3 = 20, but capped at 15
      expect(boost).toBe(15);
    });

    it('should return 0 for non-beginner-friendly events', () => {
      const event: Event = {
        id: '1',
        title: 'Advanced Architecture',
        description: 'Expert-level system design',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T18:00:00Z', // 8 hours (too long)
        prerequisites: '5+ years experience required',
        category: { id: '1', name: 'Conference', color: '#blue' },
      } as Event;

      const boost = strategy['calculateBeginnerBoost'](event);

      expect(boost).toBe(0);
    });
  });

  describe('Integration: Full Score Calculation', () => {
    it('should combine tag-based + keyword fallback + beginner boost correctly', () => {
      const event: Event = {
        id: '1',
        title: 'TypeScript 101: Beginner Workshop',
        description: 'Learn TypeScript and Node.js from scratch. No experience required.',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T14:00:00Z',
        prerequisites: 'No experience required',
        tags: [
          { id: '1', name: 'Workshop', category: 'Event-Type', color: '#green' },
        ], // Sparse tags (1 tag)
        category: { id: '1', name: 'Workshop', color: '#green' },
      } as Event;

      const careerProfile: CareerProfile = {
        primarySkills: ['React'],
        skillsToLearn: ['TypeScript', 'Node.js'],
        learningStyle: ['hands-on'],
      } as CareerProfile;

      const score = strategy['calculateSkillMatchingScore'](event, careerProfile);

      // Components:
      // 1. Tag-based: 50 (mocked)
      // 2. Keyword fallback: 2 skills matched * 20 * 0.25 = 10
      // 3. Beginner boost: up to 15
      // Total should be 50 + 10 + 15 = 75 (or close)
      expect(score).toBeGreaterThan(60);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should cap final score at 100', () => {
      vi.mocked(TagBasedMatchingService.calculateTagSimilarity)
        .mockReturnValueOnce({ score: 90, matchedTags: [], matchedCategories: [], explanation: 'High match' });

      const event: Event = {
        id: '1',
        title: 'TypeScript Node.js React Python Java Beginner 101 Workshop',
        description: 'Learn everything. No experience required. Introduction to fundamentals.',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T14:00:00Z',
        prerequisites: 'No experience required',
        tags: [], // Sparse
        category: { id: '1', name: 'Workshop', color: '#green' },
      } as Event;

      const careerProfile: CareerProfile = {
        primarySkills: ['HTML'],
        skillsToLearn: ['TypeScript', 'Node.js', 'React', 'Python', 'Java'],
        learningStyle: ['hands-on'],
      } as CareerProfile;

      const score = strategy['calculateSkillMatchingScore'](event, careerProfile);

      // Should be capped at 100 even if components sum higher
      expect(score).toBe(100);
    });
  });
});
